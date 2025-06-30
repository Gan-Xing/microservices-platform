/**
 * 权限守卫
 * 实现声明式权限检查逻辑
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, of, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { RbacServiceClient, PermissionCheckRequest } from '@platform/common';
import { CacheService } from '@platform/common';
import {
  PERMISSION_KEY,
  ROLE_KEY,
  TENANT_REQUIRED_KEY,
  PERMISSION_OPTIONS_KEY,
  PermissionOptions,
  RoleOptions,
  TenantOptions,
} from '../decorators/permission.decorator';
import { StandardJWTPayload } from '../interfaces/jwt-payload.interface';

// 扩展Request接口以包含用户信息
interface AuthenticatedRequest extends Request {
  user: StandardJWTPayload;
  tenantId: string;
}

// 权限检查结果缓存键
interface PermissionCacheKey {
  userId: string;
  tenantId: string;
  resource: string;
  action: string;
  resourceId?: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private rbacClient: RbacServiceClient,
    private cacheService: CacheService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    // 检查是否为公开端点
    if (this.isPublicEndpoint(context)) {
      return true;
    }

    // 检查是否为系统内部调用
    if (this.isSystemCall(context, request)) {
      return this.validateSystemCall(request);
    }

    // 检查用户是否已认证
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // 检查租户要求
    const tenantRequired = this.reflector.getAllAndOverride<boolean>(TENANT_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (tenantRequired && !request.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // 检查IP白名单
    if (!this.checkIPWhitelist(context, request)) {
      throw new ForbiddenException('IP address not allowed');
    }

    // 检查时间窗口
    if (!this.checkTimeWindow(context)) {
      throw new ForbiddenException('Access not allowed at this time');
    }

    // 检查限流
    return from(this.checkRateLimit(context, request)).pipe(
      switchMap((rateLimitPassed) => {
        if (!rateLimitPassed) {
          throw new ForbiddenException('Rate limit exceeded');
        }

        // 执行权限和角色检查
        return this.performPermissionChecks(context, request);
      }),
    );
  }

  /**
   * 检查是否为公开端点
   */
  private isPublicEndpoint(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  /**
   * 检查是否为系统调用
   */
  private isSystemCall(context: ExecutionContext, request: Request): boolean {
    return this.reflector.getAllAndOverride<boolean>('system_only', [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  /**
   * 验证系统调用
   */
  private validateSystemCall(request: Request): boolean {
    const serviceToken = request.headers['x-service-token'];
    const serviceName = request.headers['x-service-name'];
    
    if (!serviceToken || !serviceName) {
      throw new UnauthorizedException('Invalid system call credentials');
    }

    // 这里应该验证服务令牌的有效性
    // 简化实现，实际应该调用认证服务验证
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (serviceToken !== expectedToken) {
      throw new UnauthorizedException('Invalid service token');
    }

    return true;
  }

  /**
   * 检查IP白名单
   */
  private checkIPWhitelist(context: ExecutionContext, request: Request): boolean {
    const allowedIPs = this.reflector.getAllAndOverride<string[]>('ip_whitelist', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedIPs || allowedIPs.length === 0) {
      return true;
    }

    const clientIP = this.getClientIP(request);
    return allowedIPs.some(ip => this.isIPInRange(clientIP, ip));
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 检查IP是否在范围内
   */
  private isIPInRange(ip: string, range: string): boolean {
    // 简化实现，实际应该支持CIDR格式
    if (range.includes('/')) {
      // CIDR格式 (如 10.0.0.0/8)
      // 这里需要实现CIDR匹配逻辑
      return ip.startsWith(range.split('/')[0].split('.').slice(0, -1).join('.'));
    }
    return ip === range;
  }

  /**
   * 检查时间窗口
   */
  private checkTimeWindow(context: ExecutionContext): boolean {
    const timeWindow = this.reflector.getAllAndOverride<{
      startTime: string;
      endTime: string;
      timezone: string;
    }>('time_window', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!timeWindow) {
      return true;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: timeWindow.timezone 
    });

    return currentTime >= timeWindow.startTime && currentTime <= timeWindow.endTime;
  }

  /**
   * 检查限流
   */
  private async checkRateLimit(context: ExecutionContext, request: Request): Promise<boolean> {
    const rateLimit = this.reflector.getAllAndOverride<{
      limit: number;
      window: number;
      keyGenerator: (req: Request) => string;
    }>('rate_limit', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rateLimit) {
      return true;
    }

    const key = `rate_limit:${rateLimit.keyGenerator(request)}`;
    const current = await this.cacheService.increment(key, 1);
    
    if (current === 1) {
      // 设置过期时间
      await this.cacheService.expire(key, rateLimit.window);
    }

    return current <= rateLimit.limit;
  }

  /**
   * 执行权限和角色检查
   */
  private performPermissionChecks(
    context: ExecutionContext,
    request: AuthenticatedRequest,
  ): Observable<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const roles = this.reflector.getAllAndOverride<string[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const options = this.reflector.getAllAndOverride<PermissionOptions & RoleOptions>(
      PERMISSION_OPTIONS_KEY,
      [context.getHandler(), context.getClass()],
    ) || {};

    // 检查是否允许超级管理员绕过
    if (options.allowSuperAdmin && this.isSuperAdmin(request.user)) {
      this.logger.debug(`Super admin access granted for user ${request.user.sub}`);
      return of(true);
    }

    // 如果没有权限和角色要求，则允许访问
    if (!permissions && !roles) {
      return of(true);
    }

    // 执行权限检查
    const permissionChecks: Observable<boolean>[] = [];

    if (permissions && permissions.length > 0) {
      permissionChecks.push(this.checkPermissions(request, permissions, options));
    }

    if (roles && roles.length > 0) {
      permissionChecks.push(this.checkRoles(request, roles, options));
    }

    // 合并权限和角色检查结果
    if (permissionChecks.length === 1) {
      return permissionChecks[0];
    }

    // 同时有权限和角色要求时，都必须满足
    return from(permissionChecks).pipe(
      switchMap(checks => 
        Promise.all(checks.map(check => check.toPromise())).then(results =>
          results.every(result => result)
        )
      ),
    );
  }

  /**
   * 检查是否为超级管理员
   */
  private isSuperAdmin(user: StandardJWTPayload): boolean {
    return user.roles?.includes('super_admin') || user.userType === 'admin';
  }

  /**
   * 检查权限
   */
  private checkPermissions(
    request: AuthenticatedRequest,
    permissions: string[],
    options: PermissionOptions,
  ): Observable<boolean> {
    const cacheKey = this.buildPermissionCacheKey({
      userId: request.user.sub,
      tenantId: request.tenantId,
      resource: permissions.join(','),
      action: 'check',
    });

    // 检查缓存
    if (options.useCache) {
      return from(this.cacheService.get<boolean>(cacheKey)).pipe(
        switchMap(cached => {
          if (cached !== null) {
            this.logger.debug(`Permission cache hit for user ${request.user.sub}`);
            return of(cached);
          }
          return this.performPermissionCheck(request, permissions, options, cacheKey);
        }),
      );
    }

    return this.performPermissionCheck(request, permissions, options);
  }

  /**
   * 执行权限检查
   */
  private performPermissionCheck(
    request: AuthenticatedRequest,
    permissions: string[],
    options: PermissionOptions,
    cacheKey?: string,
  ): Observable<boolean> {
    const checks = permissions.map(permission => {
      const [resource, action] = permission.split(':');
      const checkRequest: PermissionCheckRequest = {
        userId: request.user.sub,
        tenantId: request.tenantId,
        resource,
        action,
        context: {
          ip: this.getClientIP(request),
          userAgent: request.headers['user-agent'],
          method: request.method,
          url: request.url,
        },
      };

      return this.rbacClient.checkPermission(checkRequest);
    });

    return from(Promise.all(checks.map(check => check.toPromise()))).pipe(
      map(results => {
        const allowed = options.mode === 'any' 
          ? results.some(result => result.allowed)
          : results.every(result => result.allowed);

        // 缓存结果
        if (cacheKey && options.useCache) {
          this.cacheService.set(cacheKey, allowed, options.cacheTTL || 300);
        }

        if (!allowed) {
          const failedPermissions = results
            .filter(result => !result.allowed)
            .map((result, index) => permissions[index]);
          
          throw new ForbiddenException(
            options.errorMessage || 
            `Insufficient permissions: ${failedPermissions.join(', ')}`
          );
        }

        return allowed;
      }),
      catchError(error => {
        this.logger.error('Permission check failed:', error);
        throw new ForbiddenException('Permission check failed');
      }),
    );
  }

  /**
   * 检查角色
   */
  private checkRoles(
    request: AuthenticatedRequest,
    roles: string[],
    options: RoleOptions,
  ): Observable<boolean> {
    return this.rbacClient.getUserRoles(request.user.sub, request.tenantId).pipe(
      map(userRoles => {
        const userRoleNames = userRoles.roles
          .filter(role => role.isActive)
          .map(role => role.name);

        let hasRole: boolean;
        if (options.mode === 'any') {
          hasRole = roles.some(role => userRoleNames.includes(role));
        } else {
          hasRole = roles.every(role => userRoleNames.includes(role));
        }

        // 检查角色层级
        if (hasRole && options.checkHierarchy && options.minLevel) {
          const userMaxLevel = Math.max(
            ...userRoles.roles
              .filter(role => roles.includes(role.name))
              .map(role => role.level)
          );
          hasRole = userMaxLevel >= options.minLevel;
        }

        if (!hasRole) {
          throw new ForbiddenException(
            options.errorMessage || 
            `Insufficient roles: required ${roles.join(' or ')}`
          );
        }

        return hasRole;
      }),
      catchError(error => {
        this.logger.error('Role check failed:', error);
        throw new ForbiddenException('Role check failed');
      }),
    );
  }

  /**
   * 构建权限缓存键
   */
  private buildPermissionCacheKey(key: PermissionCacheKey): string {
    return `permission:${key.userId}:${key.tenantId}:${key.resource}:${key.action}${
      key.resourceId ? `:${key.resourceId}` : ''
    }`;
  }
}