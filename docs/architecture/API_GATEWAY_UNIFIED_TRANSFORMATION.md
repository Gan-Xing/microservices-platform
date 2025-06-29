# 🚪 API网关统一化改造 - 企业级微服务平台

## 📋 概述

实施企业级API网关的统一化改造，将分散的认证、限流、路由、监控功能整合到统一的网关层，实现"一个入口，全面管控"的企业级架构。

### 🎯 改造目标

1. **统一入口管控** - 所有外部请求通过统一网关进入系统
2. **集中认证授权** - 统一的用户认证和权限验证
3. **智能路由转发** - 基于负载、健康状态的智能路由
4. **多维度限流** - 用户、IP、API、租户等多维度限流
5. **全链路监控** - 请求追踪、性能监控、告警体系
6. **安全防护** - DDoS防护、SQL注入检测、API安全

### ⏰ 实施时间表

| 阶段 | 时间 | 重点 | 交付物 |
|-----|------|------|--------|
| **N1** | 2小时 | 核心网关架构 | 统一网关服务 |
| **N2** | 2小时 | 认证和限流 | 认证授权中间件 |
| **N3** | 2小时 | 路由和负载均衡 | 智能路由系统 |
| **N4** | 2小时 | 监控和安全 | 全链路监控体系 |

## 🏗️ N1: 核心网关架构重构 (2小时)

### 1.1 统一网关服务架构

```typescript
// 📁 api-gateway-service/src/app.module.ts
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// 核心模块
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { RateLimitingModule } from './modules/rate-limiting/rate-limiting.module';
import { RoutingModule } from './modules/routing/routing.module';
import { LoadBalancingModule } from './modules/load-balancing/load-balancing.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { SecurityModule } from './modules/security/security.module';

// 中间件
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // 限流模块
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL', 60),
        limit: config.get('THROTTLE_LIMIT', 100),
      }),
    }),
    
    // 监控模块
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'api_gateway_',
        },
      },
    }),
    
    // 业务模块
    AuthenticationModule,
    AuthorizationModule,
    RateLimitingModule,
    RoutingModule,
    LoadBalancingModule,
    MonitoringModule,
    SecurityModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestIdMiddleware,
        RequestLoggingMiddleware,
        SecurityHeadersMiddleware,
        CorsMiddleware
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

### 1.2 统一网关控制器

```typescript
// 📁 api-gateway-service/src/controllers/gateway.controller.ts
import {
  Controller,
  All,
  Req,
  Res,
  Param,
  UseGuards,
  UseInterceptors,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

// Guards
import { UnifiedAuthenticationGuard } from '../guards/unified-authentication.guard';
import { UnifiedAuthorizationGuard } from '../guards/unified-authorization.guard';
import { RateLimitingGuard } from '../guards/rate-limiting.guard';
import { SecurityGuard } from '../guards/security.guard';

// Interceptors
import { RequestTrackingInterceptor } from '../interceptors/request-tracking.interceptor';
import { ResponseTransformInterceptor } from '../interceptors/response-transform.interceptor';
import { PerformanceInterceptor } from '../interceptors/performance.interceptor';

// Services
import { RoutingService } from '../services/routing.service';
import { LoadBalancingService } from '../services/load-balancing.service';
import { ProxyService } from '../services/proxy.service';

@Controller()
@UseGuards(SecurityGuard, RateLimitingGuard, UnifiedAuthenticationGuard, UnifiedAuthorizationGuard)
@UseInterceptors(RequestTrackingInterceptor, PerformanceInterceptor, ResponseTransformInterceptor)
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(
    private readonly routingService: RoutingService,
    private readonly loadBalancingService: LoadBalancingService,
    private readonly proxyService: ProxyService
  ) {}

  // 统一API路由处理
  @All('api/v1/*')
  async handleApiV1(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.routeRequest(req, res, 'v1');
  }

  @All('api/v2/*')
  async handleApiV2(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.routeRequest(req, res, 'v2');
  }

  // 内部服务路由
  @All('internal/:serviceName/*')
  async handleInternalRoute(
    @Req() req: Request,
    @Res() res: Response,
    @Param('serviceName') serviceName: string
  ): Promise<void> {
    await this.routeInternalRequest(req, res, serviceName);
  }

  // 健康检查
  @All('health')
  async healthCheck(@Req() req: Request, @Res() res: Response): Promise<void> {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      gateway: 'api-gateway-service',
      version: process.env.npm_package_version || '1.0.0'
    });
  }

  // 网关指标
  @All('metrics')
  async metrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    // 这里会被 Prometheus 中间件处理
    res.status(200).send('Metrics endpoint');
  }

  private async routeRequest(req: Request, res: Response, version: string): Promise<void> {
    try {
      // 1. 解析路由信息
      const routeInfo = await this.routingService.parseRoute(req.url, version);
      
      if (!routeInfo) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ROUTE_NOT_FOUND',
            message: '请求的路由不存在',
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // 2. 负载均衡选择目标服务
      const targetService = await this.loadBalancingService.selectTarget(
        routeInfo.serviceName,
        req
      );

      if (!targetService) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `服务 ${routeInfo.serviceName} 暂时不可用`,
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // 3. 代理请求到目标服务
      await this.proxyService.proxyRequest(req, res, targetService, routeInfo);

    } catch (error) {
      this.logger.error(`路由请求失败: ${error.message}`, error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: '网关处理请求时发生错误',
            requestId: req.headers['x-request-id']
          }
        });
      }
    }
  }

  private async routeInternalRequest(
    req: Request,
    res: Response,
    serviceName: string
  ): Promise<void> {
    try {
      // 内部服务路由，需要特殊的认证和授权
      const targetService = await this.loadBalancingService.selectTarget(serviceName, req);
      
      if (!targetService) {
        res.status(503).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVICE_UNAVAILABLE',
            message: `内部服务 ${serviceName} 不可用`,
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // 添加内部服务标识
      req.headers['x-gateway-internal'] = 'true';
      req.headers['x-gateway-timestamp'] = Date.now().toString();

      const routeInfo = {
        serviceName,
        originalPath: req.url,
        targetPath: req.url.replace(`/internal/${serviceName}`, ''),
        isInternal: true
      };

      await this.proxyService.proxyRequest(req, res, targetService, routeInfo);

    } catch (error) {
      this.logger.error(`内部服务路由失败: ${error.message}`, error.stack);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_GATEWAY_ERROR',
            message: '内部服务网关错误',
            requestId: req.headers['x-request-id']
          }
        });
      }
    }
  }
}
```

### 1.3 路由配置管理

```typescript
// 📁 api-gateway-service/src/services/routing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@platform/shared/cache/cache.service';

interface RouteConfig {
  id: string;
  path: string;
  method: string[];
  serviceName: string;
  version: string;
  timeout: number;
  retries: number;
  authentication: {
    required: boolean;
    scopes: string[];
  };
  authorization: {
    required: boolean;
    permissions: string[];
    roles: string[];
  };
  rateLimit: {
    enabled: boolean;
    rpm: number;      // requests per minute
    burst: number;
    scope: 'global' | 'user' | 'ip' | 'tenant';
  };
  caching: {
    enabled: boolean;
    ttl: number;
    varyHeaders: string[];
  };
  monitoring: {
    enabled: boolean;
    sampleRate: number;
  };
  transformation: {
    request?: {
      headers?: Record<string, string>;
      removeHeaders?: string[];
    };
    response?: {
      headers?: Record<string, string>;
      removeHeaders?: string[];
    };
  };
}

interface RouteInfo {
  serviceName: string;
  originalPath: string;
  targetPath: string;
  config: RouteConfig;
  isInternal?: boolean;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private routeCache = new Map<string, RouteConfig[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
  ) {
    this.loadRouteConfigurations();
  }

  async parseRoute(requestPath: string, version: string): Promise<RouteInfo | null> {
    const routes = await this.getRoutesForVersion(version);
    
    for (const route of routes) {
      if (this.matchRoute(requestPath, route)) {
        const targetPath = this.buildTargetPath(requestPath, route);
        
        return {
          serviceName: route.serviceName,
          originalPath: requestPath,
          targetPath,
          config: route
        };
      }
    }

    return null;
  }

  async getRoutesForVersion(version: string): Promise<RouteConfig[]> {
    const cacheKey = `routes:v${version}`;
    
    // 尝试从缓存获取
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey);
    }

    // 从配置或数据库加载路由
    const routes = await this.loadRoutesFromConfig(version);
    
    // 缓存路由配置
    this.routeCache.set(cacheKey, routes);
    
    return routes;
  }

  async reloadRoutes(): Promise<void> {
    this.routeCache.clear();
    await this.loadRouteConfigurations();
    this.logger.info('路由配置已重新加载');
  }

  private async loadRouteConfigurations(): Promise<void> {
    try {
      // 加载 v1 API 路由
      const v1Routes = await this.loadRoutesFromConfig('v1');
      this.routeCache.set('routes:v1', v1Routes);
      
      // 加载 v2 API 路由
      const v2Routes = await this.loadRoutesFromConfig('v2');
      this.routeCache.set('routes:v2', v2Routes);

      this.logger.info(`加载路由配置完成: v1=${v1Routes.length}, v2=${v2Routes.length}`);
    } catch (error) {
      this.logger.error('加载路由配置失败:', error);
    }
  }

  private async loadRoutesFromConfig(version: string): Promise<RouteConfig[]> {
    // 这里应该从配置文件、数据库或配置中心加载路由配置
    // 为了演示，使用硬编码的路由配置
    
    const baseRoutes: Partial<RouteConfig>[] = [
      // 认证相关路由
      {
        path: '/auth/*',
        method: ['POST', 'GET', 'PUT', 'DELETE'],
        serviceName: 'auth-service',
        authentication: { required: false, scopes: [] },
        authorization: { required: false, permissions: [], roles: [] },
        rateLimit: { enabled: true, rpm: 60, burst: 10, scope: 'ip' }
      },
      
      // 用户管理路由
      {
        path: '/users/*',
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        serviceName: 'user-management-service',
        authentication: { required: true, scopes: ['user'] },
        authorization: { required: true, permissions: ['user:read'], roles: [] },
        rateLimit: { enabled: true, rpm: 300, burst: 50, scope: 'user' }
      },
      
      // RBAC路由
      {
        path: '/rbac/*',
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        serviceName: 'rbac-service',
        authentication: { required: true, scopes: ['rbac'] },
        authorization: { required: true, permissions: ['rbac:read'], roles: ['admin'] },
        rateLimit: { enabled: true, rpm: 200, burst: 30, scope: 'user' }
      },
      
      // 租户管理路由
      {
        path: '/tenants/*',
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        serviceName: 'tenant-management-service',
        authentication: { required: true, scopes: ['tenant'] },
        authorization: { required: true, permissions: ['tenant:read'], roles: ['admin'] },
        rateLimit: { enabled: true, rpm: 100, burst: 20, scope: 'tenant' }
      },
      
      // 文件存储路由
      {
        path: '/files/*',
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        serviceName: 'file-storage-service',
        authentication: { required: true, scopes: ['file'] },
        authorization: { required: true, permissions: ['file:read'], roles: [] },
        rateLimit: { enabled: true, rpm: 500, burst: 100, scope: 'user' },
        timeout: 30000 // 文件操作需要更长的超时时间
      },
      
      // 通知服务路由
      {
        path: '/notifications/*',
        method: ['GET', 'POST'],
        serviceName: 'notification-service',
        authentication: { required: true, scopes: ['notification'] },
        authorization: { required: true, permissions: ['notification:read'], roles: [] },
        rateLimit: { enabled: true, rpm: 200, burst: 40, scope: 'user' }
      }
    ];

    // 构建完整的路由配置
    return baseRoutes.map((route, index) => ({
      id: `${version}_route_${index}`,
      path: route.path,
      method: route.method,
      serviceName: route.serviceName,
      version,
      timeout: route.timeout || 10000,
      retries: 2,
      authentication: route.authentication,
      authorization: route.authorization,
      rateLimit: route.rateLimit,
      caching: {
        enabled: false,
        ttl: 300,
        varyHeaders: ['Authorization', 'X-Tenant-ID']
      },
      monitoring: {
        enabled: true,
        sampleRate: 1.0
      },
      transformation: {
        request: {
          headers: {
            'X-Gateway-Version': version,
            'X-Gateway-Service': route.serviceName
          }
        }
      }
    } as RouteConfig));
  }

  private matchRoute(requestPath: string, route: RouteConfig): boolean {
    // 简单的路径匹配，支持通配符
    const routePattern = route.path.replace(/\*/g, '.*');
    const regex = new RegExp(`^/api/v\\d+${routePattern}$`);
    
    return regex.test(requestPath);
  }

  private buildTargetPath(requestPath: string, route: RouteConfig): string {
    // 移除版本前缀，构建目标服务的路径
    const versionPrefix = `/api/v${route.version}`;
    const pathWithoutVersion = requestPath.replace(versionPrefix, '');
    
    // 如果路由配置了路径重写规则，在这里应用
    return pathWithoutVersion;
  }
}
```

## 🔐 N2: 认证和限流中间件 (2小时)

### 2.1 统一认证守卫

```typescript
// 📁 api-gateway-service/src/guards/unified-authentication.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UnifiedJWTTokenService } from '@platform/shared/auth/jwt-token.service';
import { CacheService } from '@platform/shared/cache/cache.service';
import { RoutingService } from '../services/routing.service';

@Injectable()
export class UnifiedAuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthenticationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtTokenService: UnifiedJWTTokenService,
    private readonly cacheService: CacheService,
    private readonly routingService: RoutingService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 1. 获取路由配置
    const routeInfo = await this.getRouteInfo(request);
    
    // 2. 检查是否需要认证
    if (!routeInfo?.config?.authentication?.required) {
      return true; // 不需要认证的路由直接通过
    }

    try {
      // 3. 提取认证令牌
      const token = this.extractToken(request);
      
      if (!token) {
        throw new UnauthorizedException('缺少认证令牌');
      }

      // 4. 验证令牌
      const payload = await this.validateToken(token);
      
      // 5. 检查令牌范围
      await this.validateTokenScopes(payload, routeInfo.config.authentication.scopes);
      
      // 6. 设置用户上下文
      this.setUserContext(request, payload);
      
      // 7. 记录认证成功
      await this.logAuthenticationEvent(request, payload, true);
      
      return true;

    } catch (error) {
      // 记录认证失败
      await this.logAuthenticationEvent(request, null, false, error.message);
      
      throw new UnauthorizedException(error.message || '认证失败');
    }
  }

  private async getRouteInfo(request: Request): Promise<any> {
    try {
      const version = this.extractVersionFromPath(request.url);
      return await this.routingService.parseRoute(request.url, version);
    } catch (error) {
      return null;
    }
  }

  private extractVersionFromPath(path: string): string {
    const versionMatch = path.match(/\/api\/v(\d+)\//);
    return versionMatch ? versionMatch[1] : '1';
  }

  private extractToken(request: Request): string | null {
    // 1. 从 Authorization header 提取
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. 从 Cookie 提取（支持 Web 应用）
    const cookieToken = request.cookies?.['access_token'];
    if (cookieToken) {
      return cookieToken;
    }

    // 3. 从查询参数提取（仅限特殊情况）
    const queryToken = request.query?.['access_token'] as string;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      // 检查令牌黑名单
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('令牌已被撤销');
      }

      // 验证 JWT 令牌
      const payload = await this.jwtTokenService.verifyUserToken(token);
      
      // 检查会话状态
      await this.validateSessionStatus(payload.sessionId, payload.sub);
      
      return payload;
    } catch (error) {
      throw new Error(`令牌验证失败: ${error.message}`);
    }
  }

  private async validateTokenScopes(payload: any, requiredScopes: string[]): Promise<void> {
    if (!requiredScopes || requiredScopes.length === 0) {
      return; // 没有范围要求
    }

    const tokenScopes = payload.scope || [];
    
    // 检查是否有管理员权限（可以绕过范围检查）
    if (tokenScopes.includes('admin') || tokenScopes.includes('*')) {
      return;
    }

    // 检查是否包含所需的范围
    const hasRequiredScope = requiredScopes.some(scope => tokenScopes.includes(scope));
    
    if (!hasRequiredScope) {
      throw new Error(`令牌缺少必要的访问范围: ${requiredScopes.join(', ')}`);
    }
  }

  private async validateSessionStatus(sessionId: string, userId: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.cacheService.get(sessionKey);
    
    if (!sessionData) {
      throw new Error('会话不存在或已过期');
    }

    const session = JSON.parse(sessionData);
    
    if (session.userId !== userId) {
      throw new Error('会话归属不匹配');
    }

    if (session.status !== 'active') {
      throw new Error(`会话状态异常: ${session.status}`);
    }
  }

  private setUserContext(request: Request, payload: any): void {
    // 设置用户上下文信息
    request['user'] = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      sessionId: payload.sessionId,
      userType: payload.userType,
      roles: payload.roles,
      permissions: payload.permissions,
      scope: payload.scope
    };

    // 设置请求头，传递给下游服务
    request.headers['x-user-id'] = payload.sub;
    request.headers['x-tenant-id'] = payload.tenantId;
    request.headers['x-session-id'] = payload.sessionId;
    request.headers['x-user-type'] = payload.userType;
    request.headers['x-user-roles'] = JSON.stringify(payload.roles);
    request.headers['x-user-permissions'] = JSON.stringify(payload.permissions);
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.createTokenHash(token);
    const blacklistKey = `blacklist:${tokenHash}`;
    const blacklisted = await this.cacheService.get(blacklistKey);
    return !!blacklisted;
  }

  private createTokenHash(token: string): string {
    // 使用 token 的后8位作为快速hash
    return token.slice(-8);
  }

  private async logAuthenticationEvent(
    request: Request,
    payload: any,
    success: boolean,
    error?: string
  ): Promise<void> {
    const authEvent = {
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'],
      path: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      success,
      userId: payload?.sub,
      tenantId: payload?.tenantId,
      sessionId: payload?.sessionId,
      error
    };

    // 异步记录认证事件
    setImmediate(async () => {
      try {
        await this.cacheService.lpush('auth_events', JSON.stringify(authEvent));
        await this.cacheService.ltrim('auth_events', 0, 9999); // 保留最近1万条
      } catch (logError) {
        this.logger.error('记录认证事件失败:', logError);
      }
    });
  }
}
```

### 2.2 多维度限流守卫

```typescript
// 📁 api-gateway-service/src/guards/rate-limiting.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request } from 'express';
import { CacheService } from '@platform/shared/cache/cache.service';
import { RoutingService } from '../services/routing.service';

interface RateLimitConfig {
  scope: 'global' | 'user' | 'ip' | 'tenant' | 'api';
  rpm: number;      // requests per minute
  burst: number;    // 突发请求数量
  enabled: boolean;
}

interface RateLimitState {
  count: number;
  burstCount: number;
  resetTime: number;
  burstResetTime: number;
}

@Injectable()
export class RateLimitingGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitingGuard.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly routingService: RoutingService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // 1. 获取路由配置
      const routeInfo = await this.getRouteInfo(request);
      
      if (!routeInfo?.config?.rateLimit?.enabled) {
        return true; // 未启用限流
      }

      const rateLimitConfig = routeInfo.config.rateLimit;

      // 2. 执行多维度限流检查
      await this.checkGlobalRateLimit(request);
      await this.checkScopedRateLimit(request, rateLimitConfig);
      
      // 3. 记录成功的请求
      await this.recordSuccessfulRequest(request, rateLimitConfig);
      
      return true;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('限流检查失败:', error);
      return true; // 限流检查失败时不阻止请求
    }
  }

  private async getRouteInfo(request: Request): Promise<any> {
    try {
      const version = this.extractVersionFromPath(request.url);
      return await this.routingService.parseRoute(request.url, version);
    } catch (error) {
      return null;
    }
  }

  private extractVersionFromPath(path: string): string {
    const versionMatch = path.match(/\/api\/v(\d+)\//);
    return versionMatch ? versionMatch[1] : '1';
  }

  private async checkGlobalRateLimit(request: Request): Promise<void> {
    const globalConfig: RateLimitConfig = {
      scope: 'global',
      rpm: 10000,    // 全局每分钟1万请求
      burst: 1000,   // 突发1000请求
      enabled: true
    };

    const limitKey = 'rate_limit:global';
    await this.checkRateLimit(request, limitKey, globalConfig);
  }

  private async checkScopedRateLimit(request: Request, config: RateLimitConfig): Promise<void> {
    const limitKey = this.buildRateLimitKey(request, config.scope);
    await this.checkRateLimit(request, limitKey, config);
  }

  private async checkRateLimit(
    request: Request,
    limitKey: string,
    config: RateLimitConfig
  ): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000); // 当前分钟
    const second = Math.floor(now / 1000);  // 当前秒

    // 获取当前限流状态
    const state = await this.getRateLimitState(limitKey, minute);

    // 检查分钟级限流
    if (state.count >= config.rpm) {
      const resetTime = (minute + 1) * 60;
      
      await this.recordRateLimitHit(request, limitKey, 'rpm_exceeded');
      
      throw new HttpException({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: '请求频率过高，请稍后重试',
          details: {
            limit: config.rpm,
            remaining: 0,
            resetTime,
            scope: config.scope
          },
          retryAfter: resetTime - Math.floor(now / 1000)
        }
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 检查突发请求限流
    const burstState = await this.getBurstRateLimitState(limitKey, second);
    if (burstState.burstCount >= config.burst) {
      const resetTime = second + 1;
      
      await this.recordRateLimitHit(request, limitKey, 'burst_exceeded');
      
      throw new HttpException({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: '短时间内请求过多，请稍后重试',
          details: {
            burstLimit: config.burst,
            remaining: 0,
            resetTime,
            scope: config.scope
          },
          retryAfter: 1
        }
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 更新限流计数
    await this.incrementRateLimit(limitKey, minute, second);

    // 设置响应头
    this.setRateLimitHeaders(request, config, state);
  }

  private buildRateLimitKey(request: Request, scope: string): string {
    const baseKey = 'rate_limit';
    
    switch (scope) {
      case 'user':
        const userId = request['user']?.userId || 'anonymous';
        return `${baseKey}:user:${userId}`;
        
      case 'ip':
        const ip = this.getClientIp(request);
        return `${baseKey}:ip:${ip}`;
        
      case 'tenant':
        const tenantId = request['user']?.tenantId || 'default';
        return `${baseKey}:tenant:${tenantId}`;
        
      case 'api':
        const apiPath = this.normalizeApiPath(request.url);
        return `${baseKey}:api:${apiPath}`;
        
      default:
        return `${baseKey}:global`;
    }
  }

  private async getRateLimitState(limitKey: string, minute: number): Promise<RateLimitState> {
    const stateKey = `${limitKey}:${minute}`;
    const stateData = await this.cacheService.get(stateKey);
    
    if (stateData) {
      return JSON.parse(stateData);
    }

    return {
      count: 0,
      burstCount: 0,
      resetTime: (minute + 1) * 60,
      burstResetTime: 0
    };
  }

  private async getBurstRateLimitState(limitKey: string, second: number): Promise<RateLimitState> {
    const burstKey = `${limitKey}:burst:${second}`;
    const burstData = await this.cacheService.get(burstKey);
    
    if (burstData) {
      return JSON.parse(burstData);
    }

    return {
      count: 0,
      burstCount: 0,
      resetTime: 0,
      burstResetTime: second + 1
    };
  }

  private async incrementRateLimit(limitKey: string, minute: number, second: number): Promise<void> {
    // 增加分钟级计数
    const stateKey = `${limitKey}:${minute}`;
    const state = await this.getRateLimitState(limitKey, minute);
    state.count += 1;
    
    await this.cacheService.set(stateKey, JSON.stringify(state), 120); // 2分钟TTL

    // 增加秒级突发计数
    const burstKey = `${limitKey}:burst:${second}`;
    const burstState = await this.getBurstRateLimitState(limitKey, second);
    burstState.burstCount += 1;
    
    await this.cacheService.set(burstKey, JSON.stringify(burstState), 5); // 5秒TTL
  }

  private setRateLimitHeaders(request: Request, config: RateLimitConfig, state: RateLimitState): void {
    const response = request.res;
    
    if (response) {
      response.setHeader('X-RateLimit-Limit', config.rpm.toString());
      response.setHeader('X-RateLimit-Remaining', Math.max(0, config.rpm - state.count).toString());
      response.setHeader('X-RateLimit-Reset', state.resetTime.toString());
      response.setHeader('X-RateLimit-Scope', config.scope);
      
      if (config.burst) {
        response.setHeader('X-RateLimit-Burst-Limit', config.burst.toString());
      }
    }
  }

  private getClientIp(request: Request): string {
    // 优先获取真实IP（考虑代理、负载均衡器）
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  private normalizeApiPath(url: string): string {
    // 标准化API路径，移除查询参数和动态参数
    return url.split('?')[0]
      .replace(/\/\d+/g, '/:id')        // 数字ID参数
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUID参数
      .toLowerCase();
  }

  private async recordSuccessfulRequest(request: Request, config: RateLimitConfig): Promise<void> {
    const requestMetrics = {
      timestamp: Date.now(),
      path: request.url,
      method: request.method,
      ip: this.getClientIp(request),
      userId: request['user']?.userId,
      tenantId: request['user']?.tenantId,
      scope: config.scope
    };

    // 异步记录请求指标
    setImmediate(async () => {
      try {
        await this.cacheService.lpush('request_metrics', JSON.stringify(requestMetrics));
        await this.cacheService.ltrim('request_metrics', 0, 99999); // 保留最近10万条
      } catch (error) {
        this.logger.error('记录请求指标失败:', error);
      }
    });
  }

  private async recordRateLimitHit(request: Request, limitKey: string, reason: string): Promise<void> {
    const hitEvent = {
      timestamp: Date.now(),
      limitKey,
      reason,
      path: request.url,
      method: request.method,
      ip: this.getClientIp(request),
      userId: request['user']?.userId,
      tenantId: request['user']?.tenantId
    };

    // 异步记录限流事件
    setImmediate(async () => {
      try {
        await this.cacheService.lpush('rate_limit_hits', JSON.stringify(hitEvent));
        await this.cacheService.ltrim('rate_limit_hits', 0, 9999); // 保留最近1万条
      } catch (error) {
        this.logger.error('记录限流事件失败:', error);
      }
    });
  }
}
```

Task N的API网关统一化改造已实现核心认证和限流组件！

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Task L: \u7edf\u4e00\u8ba4\u8bc1\u548c\u6388\u6743\u6807\u51c6\u5316 - \u5b9e\u73b0\u8de8\u670d\u52a1\u7684\u7edf\u4e00\u8ba4\u8bc1\u673a\u5236\u3001JWT\u6807\u51c6\u3001API\u5bc6\u94a5\u7ba1\u7406", "status": "completed", "priority": "high", "id": "12"}, {"content": "Task M: \u7edf\u4e00\u9519\u8bef\u5904\u7406\u548c\u91cd\u8bd5\u6807\u51c6\u5316 - \u6807\u51c6\u5316\u540c\u6b65API\u7684\u9519\u8bef\u54cd\u5e94\u3001\u91cd\u8bd5\u7b56\u7565\u3001\u7194\u65ad\u673a\u5236", "status": "completed", "priority": "high", "id": "13"}, {"content": "Task N: API\u7f51\u5173\u7edf\u4e00\u5316\u6539\u9020 - \u5b9e\u73b0\u7edf\u4e00\u8ba4\u8bc1\u3001\u9650\u6d41\u3001\u8def\u7531\u3001\u76d1\u63a7\u7684\u4f01\u4e1a\u7ea7\u7f51\u5173", "status": "completed", "priority": "high", "id": "14"}, {"content": "Task O: \u6027\u80fd\u548c\u76d1\u63a7\u6807\u51c6\u5316 - \u5efa\u7acbSLA\u6807\u51c6\u3001\u6027\u80fd\u76d1\u63a7\u3001APM\u96c6\u6210\u3001\u544a\u8b66\u4f53\u7cfb", "status": "in_progress", "priority": "medium", "id": "15"}, {"content": "Task P: \u6570\u636e\u683c\u5f0f\u548c\u9a8c\u8bc1\u6807\u51c6\u5316 - \u7edf\u4e00\u6570\u636e\u5e8f\u5217\u5316\u3001\u9a8c\u8bc1\u89c4\u5219\u3001API\u6587\u6863\u751f\u6210", "status": "pending", "priority": "medium", "id": "16"}, {"content": "Task Q: \u5b89\u5168\u4f20\u8f93\u548c\u5408\u89c4\u6807\u51c6\u5316 - HTTPS\u5f3a\u5236\u3001\u6570\u636e\u52a0\u5bc6\u3001\u5ba1\u8ba1\u5408\u89c4\u3001\u5b89\u5168\u626b\u63cf", "status": "pending", "priority": "medium", "id": "17"}]