/**
 * 租户上下文拦截器
 * 实现RLS装饰器的逻辑，自动管理多租户数据隔离
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { RLSService } from '@platform/common';
import { RbacServiceClient, UserServiceClient } from '@platform/common';
import {
  RLS_CONTEXT_KEY,
  TENANT_ISOLATION_KEY,
  RLS_OPTIONS_KEY,
  RLSOptions,
  TenantIsolationOptions,
} from '../decorators/rls.decorator';
import { StandardJWTPayload } from '../interfaces/jwt-payload.interface';

// 扩展Request接口
interface AuthenticatedRequest extends Request {
  user?: StandardJWTPayload;
  tenantId?: string;
}

// RLS执行上下文
interface RLSExecutionContext {
  tenantId: string;
  userId?: string;
  userRoles?: string[];
  sessionId?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  shouldApplyRLS: boolean;
  originalContext?: any;
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly rlsService?: RLSService,
    @Optional() private readonly rbacClient?: RbacServiceClient,
    @Optional() private readonly userClient?: UserServiceClient,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否需要RLS处理
    const needsRLS = this.reflector.getAllAndOverride<boolean>(RLS_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipRLS = this.reflector.getAllAndOverride<boolean>('skip_rls', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!needsRLS || skipRLS || !this.rlsService) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rlsOptions = this.reflector.getAllAndOverride<RLSOptions>(
      RLS_OPTIONS_KEY,
      [context.getHandler(), context.getClass()],
    ) || {};

    // 构建RLS执行上下文
    return this.buildRLSContext(request, context, rlsOptions).then(rlsContext => {
      if (!rlsContext.shouldApplyRLS) {
        return next.handle();
      }

      // 设置RLS上下文
      return this.setupRLSContext(rlsContext, rlsOptions).then(() => {
        return next.handle().pipe(
          tap(() => {
            this.logger.debug(`RLS operation completed for tenant ${rlsContext.tenantId}`);
          }),
          catchError(error => {
            this.handleRLSError(error, rlsContext, rlsOptions);
            return throwError(() => error);
          }),
          finalize(() => {
            // 清理RLS上下文
            if (rlsOptions.clearAfter && this.rlsService) {
              this.rlsService.clearContext().catch(err => {
                this.logger.warn('Failed to clear RLS context:', err);
              });
            }
          }),
        );
      });
    });
  }

  /**
   * 构建RLS执行上下文
   */
  private async buildRLSContext(
    request: AuthenticatedRequest,
    context: ExecutionContext,
    options: RLSOptions,
  ): Promise<RLSExecutionContext> {
    // 提取租户ID
    const tenantId = this.extractTenantId(request, options);
    if (!tenantId) {
      if (options.errorMode === 'throw') {
        throw new BadRequestException('Tenant ID is required');
      } else if (options.errorMode === 'log') {
        this.logger.warn('Tenant ID not found, skipping RLS');
      }
      return {
        tenantId: '',
        shouldApplyRLS: false,
        isAdmin: false,
        isSuperAdmin: false,
      };
    }

    // 提取用户ID
    const userId = this.extractUserId(request, options);
    
    // 检查用户类型
    const isAdmin = this.checkAdminAccess(request, context);
    const isSuperAdmin = this.checkSuperAdminAccess(request);

    // 获取用户角色
    let userRoles: string[] = [];
    if (options.autoLoadRoles && userId && this.rbacClient) {
      try {
        const roleInfo = await this.rbacClient.getUserRoles(userId, tenantId).toPromise();
        userRoles = roleInfo.roles
          .filter(role => role.isActive)
          .map(role => role.name);
      } catch (error) {
        this.logger.warn('Failed to load user roles:', error);
      }
    }

    // 验证租户访问权限
    if (options.validateAccess && userId && this.rlsService) {
      const hasAccess = await this.rlsService.validateTenantAccess(tenantId, userId);
      if (!hasAccess && !isSuperAdmin) {
        throw new ForbiddenException('Access denied to tenant');
      }
    }

    // 检查是否应该应用RLS
    const shouldApplyRLS = this.shouldApplyRLS(
      { tenantId, userId, userRoles, isAdmin, isSuperAdmin },
      context,
      options,
    );

    return {
      tenantId,
      userId,
      userRoles,
      sessionId: request.user?.sessionId,
      isAdmin,
      isSuperAdmin,
      shouldApplyRLS,
    };
  }

  /**
   * 提取租户ID
   */
  private extractTenantId(request: AuthenticatedRequest, options: RLSOptions): string {
    if (options.tenantIdExtractor) {
      return options.tenantIdExtractor(request);
    }

    // 从多个位置尝试提取租户ID
    return (
      request.tenantId ||
      request.user?.tenantId ||
      request.headers['x-tenant-id'] as string ||
      request.query.tenantId as string ||
      request.params.tenantId ||
      request.body?.tenantId ||
      ''
    );
  }

  /**
   * 提取用户ID
   */
  private extractUserId(request: AuthenticatedRequest, options: RLSOptions): string | undefined {
    if (options.userIdExtractor) {
      return options.userIdExtractor(request);
    }

    return request.user?.sub;
  }

  /**
   * 检查管理员访问权限
   */
  private checkAdminAccess(request: AuthenticatedRequest, context: ExecutionContext): boolean {
    const adminAccess = this.reflector.getAllAndOverride<{ requiredRole: string }>('admin_access', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!adminAccess || !request.user) {
      return false;
    }

    return request.user.roles?.includes(adminAccess.requiredRole) || false;
  }

  /**
   * 检查超级管理员权限
   */
  private checkSuperAdminAccess(request: AuthenticatedRequest): boolean {
    return (
      request.user?.roles?.includes('super_admin') ||
      request.user?.userType === 'admin' ||
      false
    );
  }

  /**
   * 检查是否应该应用RLS
   */
  private shouldApplyRLS(
    context: Partial<RLSExecutionContext>,
    execContext: ExecutionContext,
    options: RLSOptions,
  ): boolean {
    // 检查系统访问
    const systemAccess = this.reflector.getAllAndOverride<boolean>('system_access', [
      execContext.getHandler(),
      execContext.getClass(),
    ]);
    if (systemAccess) {
      return false;
    }

    // 检查跨租户访问
    const crossTenantAccess = this.reflector.getAllAndOverride<{
      condition: (ctx: any) => boolean;
    }>('cross_tenant_access', [
      execContext.getHandler(),
      execContext.getClass(),
    ]);
    if (crossTenantAccess && crossTenantAccess.condition(context)) {
      return false;
    }

    // 检查条件RLS
    const conditionalRLS = this.reflector.getAllAndOverride<{
      condition: (ctx: any) => boolean;
    }>('conditional_rls', [
      execContext.getHandler(),
      execContext.getClass(),
    ]);
    if (conditionalRLS && !conditionalRLS.condition(context)) {
      return false;
    }

    // 检查超级管理员绕过设置
    const tenantIsolation = this.reflector.getAllAndOverride<TenantIsolationOptions>(
      TENANT_ISOLATION_KEY,
      [execContext.getHandler(), execContext.getClass()],
    );
    if (tenantIsolation?.allowSuperAdmin && context.isSuperAdmin) {
      return false;
    }

    return true;
  }

  /**
   * 设置RLS上下文
   */
  private async setupRLSContext(
    rlsContext: RLSExecutionContext,
    options: RLSOptions,
  ): Promise<void> {
    if (!this.rlsService || !options.autoSetContext) {
      return;
    }

    try {
      await this.rlsService.setContext({
        tenantId: rlsContext.tenantId,
        userId: rlsContext.userId,
        userRoles: rlsContext.userRoles,
        sessionId: rlsContext.sessionId,
        metadata: {
          ...options.metadata,
          isAdmin: rlsContext.isAdmin,
          isSuperAdmin: rlsContext.isSuperAdmin,
        },
      });

      this.logger.debug(`RLS context set for tenant ${rlsContext.tenantId}`);

    } catch (error) {
      this.logger.error('Failed to setup RLS context:', error);
      if (options.errorMode === 'throw') {
        throw new Error('Failed to setup RLS context');
      }
    }
  }

  /**
   * 处理RLS错误
   */
  private handleRLSError(
    error: any,
    rlsContext: RLSExecutionContext,
    options: RLSOptions,
  ): void {
    this.logger.error('RLS operation failed:', {
      error: error.message,
      tenantId: rlsContext.tenantId,
      userId: rlsContext.userId,
    });

    // 根据错误模式处理
    if (options.errorMode === 'ignore') {
      return;
    } else if (options.errorMode === 'log') {
      this.logger.warn(`RLS error (logged only): ${error.message}`);
      return;
    }

    // 默认抛出错误
    if (error.message?.includes('tenant') || error.message?.includes('RLS')) {
      throw new ForbiddenException('Data access denied by tenant isolation');
    }
  }

  /**
   * 验证批量RLS
   */
  private async validateBatchRLS(
    items: any[],
    context: ExecutionContext,
    rlsContext: RLSExecutionContext,
  ): Promise<void> {
    const batchRLS = this.reflector.getAllAndOverride<{
      itemTenantExtractor: (item: any) => string;
    }>('batch_rls', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!batchRLS || !items || !Array.isArray(items)) {
      return;
    }

    // 检查所有项目是否属于同一租户
    for (const item of items) {
      const itemTenantId = batchRLS.itemTenantExtractor(item);
      if (itemTenantId && itemTenantId !== rlsContext.tenantId) {
        throw new ForbiddenException(
          `Batch operation contains items from different tenant: ${itemTenantId}`
        );
      }
    }
  }

  /**
   * 执行RLS策略验证
   */
  private async validateRLSPolicies(
    tableName: string,
    rlsContext: RLSExecutionContext,
    options: RLSOptions,
  ): Promise<void> {
    if (!options.validatePolicies || !this.rlsService) {
      return;
    }

    try {
      const validation = await this.rlsService.validateRLSPolicies(tableName);
      
      if (!validation.isEnabled) {
        this.logger.warn(`RLS not enabled for table: ${tableName}`);
        if (options.errorMode === 'throw') {
          throw new Error(`RLS not enabled for table: ${tableName}`);
        }
      }

      if (validation.missingPolicies.length > 0) {
        this.logger.warn(`Missing RLS policies for table ${tableName}:`, validation.missingPolicies);
        if (options.errorMode === 'throw') {
          throw new Error(`Missing RLS policies for table: ${tableName}`);
        }
      }

    } catch (error) {
      this.logger.error('RLS policy validation failed:', error);
      if (options.errorMode === 'throw') {
        throw error;
      }
    }
  }

  /**
   * 执行RLS测试
   */
  private async executeRLSTest(
    rlsContext: RLSExecutionContext,
    options: RLSOptions,
  ): Promise<void> {
    const testConfig = this.reflector.getAllAndOverride<{
      testMode: 'validate' | 'simulate' | 'debug';
    }>('rls_test', []);

    if (!testConfig || !this.rlsService) {
      return;
    }

    this.logger.debug(`Executing RLS test in ${testConfig.testMode} mode`);

    try {
      switch (testConfig.testMode) {
        case 'validate':
          // 验证RLS策略
          // await this.validateRLSPolicies(tableName, rlsContext, options);
          break;
          
        case 'simulate':
          // 模拟RLS操作
          const testTenantId = options.metadata?.testTenantId || rlsContext.tenantId;
          // const testResult = await this.rlsService.testRLSPolicy(tableName, testTenantId, rlsContext.userId);
          // this.logger.debug('RLS test result:', testResult);
          break;
          
        case 'debug':
          // 输出调试信息
          this.logger.debug('RLS debug info:', {
            tenantId: rlsContext.tenantId,
            userId: rlsContext.userId,
            userRoles: rlsContext.userRoles,
            isAdmin: rlsContext.isAdmin,
            isSuperAdmin: rlsContext.isSuperAdmin,
            options,
          });
          break;
      }

    } catch (error) {
      this.logger.error('RLS test failed:', error);
      if (options.errorMode === 'throw') {
        throw error;
      }
    }
  }
}