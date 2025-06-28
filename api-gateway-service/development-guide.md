# API网关服务开发文档 - 标准版本

## 🎯 服务概述

API网关服务是微服务平台的统一入口（端口3000），面向**100租户+10万用户**的企业级生产系统，负责请求路由、认证授权、限流熔断、负载均衡、协议转换、API版本管理等功能，为整个平台提供统一的API接入和管理能力。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户的高并发API访问
- **性能要求**: API响应时间<50ms，支持10万QPS
- **可用性**: 99.9%可用性，多实例负载均衡
- **安全等级**: 企业级安全，多重认证授权
- **部署方式**: Docker Compose + Nginx负载均衡

### 🚨 依赖关系与服务集成 (基于SERVICE_INTERACTION_SPEC.md)
- **PostgreSQL**: 存储路由配置、API密钥、版本管理等
- **Redis**: 限流计数、缓存、会话存储等
- **核心依赖服务**:
  - **缓存服务(3011)**: 分布式缓存支撑（必需依赖）
  - **认证服务(3001)**: JWT令牌验证（推荐集成）
  - **权限服务(3002)**: 权限检查（推荐集成）
  - **审计服务(3008)**: 请求日志记录（推荐集成）
  - **监控服务(3007)**: 性能指标上报（推荐集成）

### 📅 标准版本开发位置
- **开发阶段**: Week 2 (业务服务阶段)
- **开发优先级**: 第6位 (⭐⭐⭐) - 中等复杂度
- **依赖顺序**: 需先完成缓存服务(3011, 第4位)
- **内存分配**: 1GB (标准版本8GB总内存的12.5%)
- **性能目标**: 支持10万QPS，<50ms响应时间

## 🛠️ 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (配置数据) + Redis 7+ (缓存/限流)
- **ORM**: Prisma ORM
- **代理**: HTTP Proxy Middleware / Node HTTP Proxy
- **负载均衡**: Round Robin / Weighted Round Robin / Least Connections
- **断路器**: Opossum Circuit Breaker

### 网关技术 (标准版本优化)
- **协议支持**: HTTP/HTTPS, WebSocket (生产级协议，移除gRPC复杂性)
- **认证**: JWT, API Key (简化认证，符合标准版本要求)
- **限流**: Redis Token Bucket (高性能限流，替代复杂的分布式限流)
- **缓存**: Redis 分布式缓存 (统一缓存策略)
- **压缩**: GZIP (标准压缩，避免Brotli等复杂算法)
- **服务发现**: Docker Compose网络 (替代Consul/Eureka)
- **负载均衡**: 内置算法 (Round Robin/Weighted, 替代Nginx Plus)
- **消息队列**: Redis Streams (标准版本选择)

### 监控技术
- **日志**: Winston
- **指标**: Prometheus + Grafana
- **健康检查**: NestJS Health Check

## 📋 完整功能列表

### 核心功能总览 (14个功能模块)

基于 SERVICE_FUNCTIONS_LIST.md 中定义的功能模块，API网关服务包含以下14个核心功能：

1. **基础管理** - 健康检查、状态监控、版本管理、配置管理
2. **路由管理** - 路由配置、规则创建、状态控制、配置测试
3. **负载均衡与限流** - 负载均衡器、限流规则、熔断器控制
4. **安全与认证** - 安全策略、API密钥、CORS配置
5. **插件与中间件** - 插件管理、中间件配置、扩展支持
6. **证书管理** - SSL证书上传、管理、更新
7. **服务发现** - 服务注册、实例管理、心跳检测
8. **配置中心** - 应用配置、环境管理、属性设置
9. **监控分析** - 服务监控、缓存统计、流量分析
10. **版本管理与国际化** - API版本控制、兼容性检查、多语言支持
11. **高级路由功能** - 灰度发布、蓝绿部署、A/B测试、流量镜像
12. **性能优化** - 连接池管理、幂等性控制、故障转移
13. **API治理** - 生命周期管理、文档生成、开发者密钥
14. **企业级协议支持** - HTTP/2、gRPC、WebSocket、系统适配器

### API端点映射表 (基于API-ENDPOINTS.md标准)

| 功能模块 | 主要端点 | 端点数量 | 实现状态 |
|---------|---------|----------|----------|
| 基础管理 | `GET /api/v1/gateway/health`, `GET /api/v1/gateway/status` | 7个 | 🔧 系统级 |
| 路由管理 | `GET /api/v1/gateway/routes`, `POST /api/v1/gateway/routes` | 6个 | 🔄 推荐 |
| 负载均衡与限流 | `GET /api/v1/gateway/load-balancers`, `GET /api/v1/gateway/rate-limits` | 14个 | 🔄 推荐 |
| 安全与认证 | `GET /api/v1/gateway/security/policies`, `GET /api/v1/gateway/api-keys` | 7个 | 🔄 推荐 |
| 插件与中间件 | `GET /api/v1/gateway/plugins`, `GET /api/v1/gateway/middlewares` | 8个 | 🔄 推荐 |
| 证书管理 | `GET /api/v1/gateway/certificates` | 3个 | 🔄 推荐 |
| 服务发现 | `GET /api/v1/gateway/discovery/services` | 5个 | 🔄 推荐 |
| 配置中心 | `GET /api/v1/gateway/config/applications` | 8个 | 🔄 推荐 |
| 监控分析 | `GET /api/v1/gateway/services`, `GET /api/v1/gateway/analytics/traffic` | 17个 | 🔄 推荐 |
| 版本管理与国际化 | `GET /api/v1/gateway/versions`, `GET /api/v1/gateway/i18n/languages` | 10个 | 🔄 推荐 |
| 高级路由功能 | `GET /api/v1/gateway/routing/canary`, `GET /api/v1/gateway/routing/blue-green` | 19个 | 🔄 推荐 |
| 性能优化 | `GET /api/v1/gateway/performance/connections` | 13个 | 🔄 推荐 |
| API治理 | `GET /api/v1/gateway/governance/lifecycle` | 14个 | 🔄 推荐 |
| 企业级协议支持 | `GET /api/v1/gateway/protocols/http2`, `GET /api/v1/gateway/cluster/config` | 21个 | 🔄 推荐 |

**API端点标准化总计**: 
- **核心管理API**: 152个端点（基于API-ENDPOINTS.md第34-145行标准定义）
- **内部交互API**: 11个内部服务调用端点
- **扩展功能API**: 约30个高级功能端点
- **生产可用总计**: 约190个API端点覆盖完整网关功能

### 服务间交互端点 (基于SERVICE_INTERACTION_SPEC.md)

#### 内部服务调用端点 (X-Service-Token认证)
```typescript
// 缓存服务集成 (3011)
POST /api/v1/internal/cache/routes          // 路由缓存刷新
GET  /api/v1/internal/cache/limits          // 限流计数器查询

// 认证服务集成 (3001) 
POST /api/v1/internal/auth/verify           // JWT令牌验证
GET  /api/v1/internal/auth/user/{id}        // 用户信息获取

// 权限服务集成 (3002)
POST /api/v1/internal/rbac/check            // 权限检查
GET  /api/v1/internal/rbac/roles/{userId}   // 用户角色获取

// 审计服务集成 (3008)
POST /api/v1/internal/audit/events          // 审计日志记录

// 监控服务集成 (3007)
POST /api/v1/internal/monitoring/metrics    // 指标数据上报
```

## 🏗️ 核心架构实现

### 1. 路由管理
```typescript
// 路由配置实体
interface Route {
  id: string
  path: string
  methods: HTTPMethod[]
  backend: BackendConfig
  middleware: MiddlewareConfig[]
  rateLimit?: RateLimitConfig
  authentication?: AuthenticationConfig
  authorization?: AuthorizationConfig
  caching?: CachingConfig
  timeout: number
  retries: number
  isActive: boolean
  tenantId?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// HTTP 方法
enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

// 后端配置
interface BackendConfig {
  type: 'http' | 'grpc' | 'websocket'
  targets: BackendTarget[]
  loadBalancing: LoadBalancingConfig
  healthCheck?: HealthCheckConfig
  circuitBreaker?: CircuitBreakerConfig
}

// 后端目标
interface BackendTarget {
  id: string
  url: string
  weight: number
  healthCheckPath?: string
  metadata?: Record<string, any>
  isActive: boolean
}

// 负载均衡配置
interface LoadBalancingConfig {
  algorithm: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'ip_hash' | 'consistent_hash'
  sessionAffinity?: boolean
  stickySession?: {
    cookieName: string
    ttl: number
  }
}

// 路由服务接口
interface RouteService {
  createRoute(route: CreateRouteDto): Promise<Route>
  updateRoute(id: string, route: UpdateRouteDto): Promise<Route>
  deleteRoute(id: string): Promise<void>
  getRoute(id: string): Promise<Route>
  listRoutes(tenantId?: string, tags?: string[]): Promise<Route[]>
  findMatchingRoute(path: string, method: string, headers: Record<string, string>): Promise<Route | null>
  reloadRoutes(): Promise<void>
}
```

### 2. 认证授权系统
```typescript
// 认证配置
interface AuthenticationConfig {
  type: 'jwt' | 'oauth2' | 'api_key' | 'basic' | 'custom'
  required: boolean
  config: AuthConfig
  fallback?: AuthenticationConfig[]
}

// 认证配置详情
interface AuthConfig {
  // JWT 配置
  jwt?: {
    secret?: string
    publicKey?: string
    algorithm: string
    issuer?: string
    audience?: string
    clockTolerance?: number
  }
  
  // OAuth2 配置
  oauth2?: {
    provider: string
    clientId: string
    clientSecret: string
    scope: string[]
    tokenEndpoint: string
    userInfoEndpoint: string
  }
  
  // API Key 配置
  apiKey?: {
    header?: string
    query?: string
    prefix?: string
  }
  
  // Basic Auth 配置
  basic?: {
    realm: string
    users?: { username: string, password: string }[]
    ldap?: LDAPConfig
  }
  
  // 自定义认证
  custom?: {
    endpoint: string
    headers: Record<string, string>
    timeout: number
  }
}

// 授权配置
interface AuthorizationConfig {
  type: 'rbac' | 'abac' | 'acl' | 'custom'
  config: AuthzConfig
}

// 授权配置详情
interface AuthzConfig {
  // RBAC 配置
  rbac?: {
    roles: string[]
    permissions: string[]
    hierarchy?: Record<string, string[]>
  }
  
  // ABAC 配置
  abac?: {
    policies: ABACPolicy[]
    attributes: AttributeConfig[]
  }
  
  // ACL 配置
  acl?: {
    rules: ACLRule[]
  }
  
  // 自定义授权
  custom?: {
    endpoint: string
    headers: Record<string, string>
    timeout: number
  }
}

// 认证授权服务
interface AuthService {
  authenticate(request: IncomingRequest, config: AuthenticationConfig): Promise<AuthContext>
  authorize(authContext: AuthContext, config: AuthorizationConfig): Promise<boolean>
  extractToken(request: IncomingRequest, config: AuthConfig): Promise<string | null>
  validateToken(token: string, config: AuthConfig): Promise<TokenPayload>
  refreshToken(refreshToken: string, config: AuthConfig): Promise<TokenPair>
}

// 认证上下文
interface AuthContext {
  user?: {
    id: string
    username: string
    email?: string
    roles: string[]
    permissions: string[]
    attributes: Record<string, any>
  }
  tenant?: {
    id: string
    name: string
    plan: string
  }
  session?: {
    id: string
    expiresAt: Date
  }
  metadata: Record<string, any>
}
```

### 3. 限流与熔断
```typescript
// 限流配置
interface RateLimitConfig {
  algorithm: 'token_bucket' | 'sliding_window' | 'fixed_window' | 'leaky_bucket'
  limits: RateLimit[]
  keyGenerator: KeyGeneratorConfig
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  headers?: boolean
}

// 限流规则
interface RateLimit {
  window: number // 时间窗口 (秒)
  limit: number  // 请求数量限制
  burst?: number // 突发请求限制
  scope: 'global' | 'tenant' | 'user' | 'ip' | 'custom'
}

// 限流键生成配置
interface KeyGeneratorConfig {
  type: 'ip' | 'user' | 'tenant' | 'header' | 'custom'
  customKey?: string
  combineKeys?: boolean
}

// 断路器配置
interface CircuitBreakerConfig {
  enabled: boolean
  failureThreshold: number    // 失败阈值
  resetTimeout: number       // 重置超时时间 (毫秒)
  monitoringPeriod: number   // 监控周期 (毫秒)
  fallback?: FallbackConfig
}

// 降级配置
interface FallbackConfig {
  type: 'static' | 'cache' | 'redirect' | 'custom'
  response?: {
    statusCode: number
    body: any
    headers: Record<string, string>
  }
  cacheKey?: string
  cacheTTL?: number
  redirectUrl?: string
  customHandler?: string
}

// 限流服务
interface RateLimitService {
  checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult>
  incrementCounter(key: string, config: RateLimitConfig): Promise<void>
  getRemainingQuota(key: string, config: RateLimitConfig): Promise<number>
  resetCounter(key: string, config: RateLimitConfig): Promise<void>
  getCounterInfo(key: string, config: RateLimitConfig): Promise<CounterInfo>
}

// 限流结果
interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number
}

// 断路器服务
interface CircuitBreakerService {
  execute<T>(key: string, operation: () => Promise<T>, config: CircuitBreakerConfig): Promise<T>
  getState(key: string): CircuitBreakerState
  open(key: string): void
  close(key: string): void
  halfOpen(key: string): void
}

enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}
```

### 4. 请求转发与代理
```typescript
// 代理配置
interface ProxyConfig {
  target: string
  changeOrigin: boolean
  preserveHeaderKeyCase: boolean
  timeout: number
  retries: number
  retryDelay: number
  headers?: Record<string, string>
  removeHeaders?: string[]
  pathRewrite?: Record<string, string>
  compression: boolean
}

// 请求转换
interface RequestTransformer {
  transformRequest(request: IncomingRequest, route: Route): Promise<TransformedRequest>
  transformResponse(response: IncomingResponse, route: Route): Promise<TransformedResponse>
  addHeaders(headers: Record<string, string>): void
  removeHeaders(headerNames: string[]): void
  rewritePath(path: string, rules: Record<string, string>): string
}

// 协议适配器
interface ProtocolAdapter {
  type: 'http' | 'grpc' | 'websocket'
  canHandle(request: IncomingRequest): boolean
  forward(request: IncomingRequest, target: BackendTarget): Promise<AdapterResponse>
  transformRequest(request: IncomingRequest): Promise<any>
  transformResponse(response: any): Promise<IncomingResponse>
}

// HTTP 协议适配器
@Injectable()
export class HTTPAdapter implements ProtocolAdapter {
  type = 'http' as const

  canHandle(request: IncomingRequest): boolean {
    return !request.headers.upgrade
  }

  async forward(request: IncomingRequest, target: BackendTarget): Promise<AdapterResponse> {
    const response = await fetch(`${target.url}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    }
  }

  async transformRequest(request: IncomingRequest): Promise<any> {
    // HTTP 请求转换逻辑
    return request
  }

  async transformResponse(response: any): Promise<IncomingResponse> {
    // HTTP 响应转换逻辑
    return response
  }
}

// WebSocket 协议适配器
@Injectable()
export class WebSocketAdapter implements ProtocolAdapter {
  type = 'websocket' as const

  canHandle(request: IncomingRequest): boolean {
    return request.headers.upgrade === 'websocket'
  }

  async forward(request: IncomingRequest, target: BackendTarget): Promise<AdapterResponse> {
    // WebSocket 代理逻辑
    const targetUrl = target.url.replace('http', 'ws')
    // 实现 WebSocket 代理
    return { statusCode: 101, headers: {}, body: '' }
  }

  async transformRequest(request: IncomingRequest): Promise<any> {
    return request
  }

  async transformResponse(response: any): Promise<IncomingResponse> {
    return response
  }
}
```

### 5. API 版本管理
```typescript
// API 版本配置
interface APIVersion {
  id: string
  version: string
  routes: string[] // Route IDs
  isDefault: boolean
  isDeprecated: boolean
  deprecationDate?: Date
  sunsetDate?: Date
  changeLog: string
  backwardCompatible: boolean
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

// 版本策略
interface VersioningStrategy {
  type: 'header' | 'query' | 'path' | 'subdomain' | 'accept'
  config: VersioningConfig
}

interface VersioningConfig {
  // Header 版本控制
  header?: {
    name: string
    defaultValue?: string
  }
  
  // Query 版本控制
  query?: {
    parameter: string
    defaultValue?: string
  }
  
  // Path 版本控制
  path?: {
    prefix: string
    pattern: string
  }
  
  // Subdomain 版本控制
  subdomain?: {
    pattern: string
  }
  
  // Accept Header 版本控制
  accept?: {
    mediaType: string
    versionParameter: string
  }
}

// 版本管理服务
interface VersionService {
  createVersion(version: CreateAPIVersionDto): Promise<APIVersion>
  updateVersion(id: string, version: UpdateAPIVersionDto): Promise<APIVersion>
  deleteVersion(id: string): Promise<void>
  getVersion(id: string): Promise<APIVersion>
  listVersions(tenantId?: string): Promise<APIVersion[]>
  extractVersion(request: IncomingRequest, strategy: VersioningStrategy): Promise<string>
  getRoutesByVersion(version: string, tenantId?: string): Promise<Route[]>
  checkCompatibility(fromVersion: string, toVersion: string): Promise<CompatibilityCheck>
}

// 兼容性检查结果
interface CompatibilityCheck {
  compatible: boolean
  changes: APIChange[]
  breakingChanges: BreakingChange[]
  migration?: MigrationGuide
}
```

### 6. 缓存系统
```typescript
// 缓存配置
interface CachingConfig {
  enabled: boolean
  type: 'memory' | 'redis' | 'hybrid'
  ttl: number // seconds
  maxSize?: number
  keyGenerator: CacheKeyGenerator
  conditions: CacheCondition[]
  headers?: CacheHeaders
  varyBy?: string[]
}

// 缓存键生成器
interface CacheKeyGenerator {
  type: 'simple' | 'composite' | 'custom'
  template?: string
  fields?: string[]
  customFunction?: string
}

// 缓存条件
interface CacheCondition {
  type: 'method' | 'status' | 'header' | 'query' | 'body_size'
  operator: 'equals' | 'contains' | 'regex' | 'range'
  value: any
}

// 缓存头部配置
interface CacheHeaders {
  etag: boolean
  lastModified: boolean
  cacheControl: string
  expires?: boolean
  vary?: string[]
}

// 缓存服务
interface CacheService {
  get(key: string): Promise<CachedResponse | null>
  set(key: string, response: CachedResponse, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(pattern?: string): Promise<void>
  generateKey(request: IncomingRequest, config: CacheKeyGenerator): Promise<string>
  shouldCache(request: IncomingRequest, response: IncomingResponse, config: CachingConfig): boolean
  getStats(): Promise<CacheStats>
}

// 缓存响应
interface CachedResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  timestamp: Date
  etag?: string
  lastModified?: Date
}

// 缓存统计
interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  keys: number
}
```

## 🗄️ 数据库设计

### PostgreSQL 表结构
```sql
-- 路由配置表
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path VARCHAR(500) NOT NULL,
  methods VARCHAR(50)[] NOT NULL,
  backend JSONB NOT NULL,
  middleware JSONB DEFAULT '[]',
  rate_limit JSONB,
  authentication JSONB,
  authorization JSONB,
  caching JSONB,
  timeout INTEGER DEFAULT 30000,
  retries INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_routes_path (path),
  INDEX idx_routes_tenant (tenant_id),
  INDEX idx_routes_active (is_active),
  INDEX idx_routes_tags USING GIN (tags)
);

-- API 版本表
CREATE TABLE api_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  routes UUID[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_deprecated BOOLEAN DEFAULT false,
  deprecation_date TIMESTAMP,
  sunset_date TIMESTAMP,
  change_log TEXT,
  backward_compatible BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_versions_tenant (tenant_id),
  INDEX idx_versions_version (version),
  INDEX idx_versions_default (is_default),
  UNIQUE (version, tenant_id)
);

-- 后端目标表
CREATE TABLE backend_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  weight INTEGER DEFAULT 1,
  health_check_path VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_targets_route (route_id),
  INDEX idx_targets_active (is_active)
);

-- 健康检查结果表
CREATE TABLE health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL REFERENCES backend_targets(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_health_target_time (target_id, checked_at),
  INDEX idx_health_status (status, checked_at)
);

-- 中间件配置表
CREATE TABLE middleware_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_middleware_tenant (tenant_id),
  INDEX idx_middleware_type (type),
  INDEX idx_middleware_active (is_active)
);

-- API 密钥表
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL,
  user_id UUID,
  scopes TEXT[] DEFAULT '{}',
  rate_limit JSONB,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_api_keys_tenant (tenant_id),
  INDEX idx_api_keys_user (user_id),
  INDEX idx_api_keys_active (is_active),
  INDEX idx_api_keys_expires (expires_at)
);

-- 请求日志表 (分区表)
CREATE TABLE request_logs (
  id UUID DEFAULT gen_random_uuid(),
  request_id VARCHAR(255) NOT NULL,
  tenant_id UUID,
  user_id UUID,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  route_id UUID,
  backend_target_id UUID,
  cache_hit BOOLEAN DEFAULT false,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- 创建分区
CREATE TABLE request_logs_2024 PARTITION OF request_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 限流计数器表
CREATE TABLE rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_size INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  
  INDEX idx_rate_limit_key (key),
  INDEX idx_rate_limit_expires (expires_at),
  UNIQUE (key, window_start)
);
```

### Redis 数据结构
```typescript
// Redis 网关缓存
interface RedisGatewayCache {
  // 路由缓存
  'routes:cache': Route[]
  'route:match:{path}:{method}': Route
  
  // 限流计数器
  'rate_limit:{key}': {
    count: number
    resetTime: number
  }
  
  // 断路器状态
  'circuit_breaker:{target}': {
    state: 'open' | 'closed' | 'half_open'
    failures: number
    lastFailure: number
    nextAttempt: number
  }
  
  // 认证缓存
  'auth:token:{hash}': {
    userId: string
    tenantId: string
    roles: string[]
    expiresAt: number
  }
  
  // 响应缓存
  'cache:response:{key}': {
    statusCode: number
    headers: Record<string, string>
    body: string
    etag: string
    timestamp: number
  }
  
  // 健康检查状态
  'health:{targetId}': {
    status: 'healthy' | 'unhealthy'
    lastCheck: number
    consecutive_failures: number
  }
  
  // API 密钥缓存
  'api_key:{hash}': {
    keyId: string
    tenantId: string
    scopes: string[]
    rateLimit: any
    isActive: boolean
  }
}
```

## 🔗 API设计

### 网关管理 API
```typescript
// 路由管理 API
@Controller('routes')
export class RouteController {
  @Post()
  @Roles('admin', 'developer')
  async createRoute(@Body() route: CreateRouteDto) {
    return this.routeService.createRoute(route)
  }

  @Get()
  async listRoutes(@Query() query: ListRoutesDto) {
    return this.routeService.listRoutes(query.tenantId, query.tags)
  }

  @Get(':id')
  async getRoute(@Param('id') id: string) {
    return this.routeService.getRoute(id)
  }

  @Put(':id')
  @Roles('admin', 'developer')
  async updateRoute(@Param('id') id: string, @Body() route: UpdateRouteDto) {
    return this.routeService.updateRoute(id, route)
  }

  @Delete(':id')
  @Roles('admin')
  async deleteRoute(@Param('id') id: string) {
    return this.routeService.deleteRoute(id)
  }

  @Post('reload')
  @Roles('admin')
  async reloadRoutes() {
    return this.routeService.reloadRoutes()
  }

  @Post(':id/test')
  async testRoute(@Param('id') id: string, @Body() testRequest: TestRouteDto) {
    return this.routeService.testRoute(id, testRequest)
  }
}

// API 版本管理 API
@Controller('versions')
export class VersionController {
  @Post()
  @Roles('admin', 'developer')
  async createVersion(@Body() version: CreateAPIVersionDto) {
    return this.versionService.createVersion(version)
  }

  @Get()
  async listVersions(@Query() query: ListVersionsDto) {
    return this.versionService.listVersions(query.tenantId)
  }

  @Get(':id')
  async getVersion(@Param('id') id: string) {
    return this.versionService.getVersion(id)
  }

  @Put(':id')
  @Roles('admin', 'developer')
  async updateVersion(@Param('id') id: string, @Body() version: UpdateAPIVersionDto) {
    return this.versionService.updateVersion(id, version)
  }

  @Delete(':id')
  @Roles('admin')
  async deleteVersion(@Param('id') id: string) {
    return this.versionService.deleteVersion(id)
  }

  @Post(':id/deprecate')
  @Roles('admin')
  async deprecateVersion(@Param('id') id: string, @Body() deprecation: DeprecateVersionDto) {
    return this.versionService.deprecateVersion(id, deprecation)
  }

  @Get(':fromVersion/compatibility/:toVersion')
  async checkCompatibility(
    @Param('fromVersion') fromVersion: string,
    @Param('toVersion') toVersion: string
  ) {
    return this.versionService.checkCompatibility(fromVersion, toVersion)
  }
}

// API 密钥管理 API
@Controller('api-keys')
export class APIKeyController {
  @Post()
  @Roles('admin', 'developer')
  async createAPIKey(@Body() apiKey: CreateAPIKeyDto, @Req() req: AuthenticatedRequest) {
    return this.apiKeyService.createAPIKey({
      ...apiKey,
      tenantId: req.tenantId,
      createdBy: req.user.id
    })
  }

  @Get()
  async listAPIKeys(@Query() query: ListAPIKeysDto, @Req() req: AuthenticatedRequest) {
    return this.apiKeyService.listAPIKeys(req.tenantId, query)
  }

  @Get(':id')
  async getAPIKey(@Param('id') id: string) {
    return this.apiKeyService.getAPIKey(id)
  }

  @Put(':id')
  @Roles('admin', 'developer')
  async updateAPIKey(@Param('id') id: string, @Body() apiKey: UpdateAPIKeyDto) {
    return this.apiKeyService.updateAPIKey(id, apiKey)
  }

  @Delete(':id')
  @Roles('admin')
  async deleteAPIKey(@Param('id') id: string) {
    return this.apiKeyService.deleteAPIKey(id)
  }

  @Post(':id/regenerate')
  @Roles('admin', 'developer')
  async regenerateAPIKey(@Param('id') id: string) {
    return this.apiKeyService.regenerateAPIKey(id)
  }

  @Get(':id/usage')
  async getAPIKeyUsage(@Param('id') id: string, @Query() timeRange: TimeRangeDto) {
    return this.apiKeyService.getUsageStats(id, timeRange)
  }
}

// 网关统计 API
@Controller('analytics')
export class AnalyticsController {
  @Get('traffic')
  async getTrafficStats(@Query() query: TrafficStatsDto) {
    return this.analyticsService.getTrafficStats(query)
  }

  @Get('performance')
  async getPerformanceStats(@Query() query: PerformanceStatsDto) {
    return this.analyticsService.getPerformanceStats(query)
  }

  @Get('errors')
  async getErrorStats(@Query() query: ErrorStatsDto) {
    return this.analyticsService.getErrorStats(query)
  }

  @Get('top-endpoints')
  async getTopEndpoints(@Query() query: TopEndpointsDto) {
    return this.analyticsService.getTopEndpoints(query)
  }

  @Get('cache-stats')
  async getCacheStats(@Query() query: CacheStatsDto) {
    return this.analyticsService.getCacheStats(query)
  }
}
```

### 网关中间件
```typescript
// 认证中间件
@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const route = req['route'] as Route
    const authConfig = route.authentication

    if (!authConfig || !authConfig.required) {
      return next()
    }

    try {
      const authContext = await this.authService.authenticate(req, authConfig)
      req['authContext'] = authContext
      next()
    } catch (error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      })
    }
  }
}

// 限流中间件
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private rateLimitService: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const route = req['route'] as Route
    const rateLimitConfig = route.rateLimit

    if (!rateLimitConfig) {
      return next()
    }

    try {
      const key = await this.generateKey(req, rateLimitConfig.keyGenerator)
      const result = await this.rateLimitService.checkLimit(key, rateLimitConfig)

      // 设置限流头部
      res.setHeader('X-RateLimit-Limit', rateLimitConfig.limits[0].limit)
      res.setHeader('X-RateLimit-Remaining', result.remaining)
      res.setHeader('X-RateLimit-Reset', result.resetTime.getTime())

      if (!result.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests, retry after ${result.retryAfter} seconds`
        })
        return
      }

      await this.rateLimitService.incrementCounter(key, rateLimitConfig)
      next()
    } catch (error) {
      next() // 限流错误不应阻止请求
    }
  }

  private async generateKey(req: Request, config: KeyGeneratorConfig): Promise<string> {
    switch (config.type) {
      case 'ip':
        return req.ip
      case 'user':
        return req['authContext']?.user?.id || req.ip
      case 'tenant':
        return req['authContext']?.tenant?.id || req.ip
      case 'header':
        return req.get(config.customKey) || req.ip
      default:
        return req.ip
    }
  }
}

// 缓存中间件
@Injectable()
export class CacheMiddleware implements NestMiddleware {
  constructor(private cacheService: CacheService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const route = req['route'] as Route
    const cacheConfig = route.caching

    if (!cacheConfig || !cacheConfig.enabled || req.method !== 'GET') {
      return next()
    }

    try {
      const cacheKey = await this.cacheService.generateKey(req, cacheConfig.keyGenerator)
      const cachedResponse = await this.cacheService.get(cacheKey)

      if (cachedResponse) {
        // 设置缓存头部
        res.setHeader('X-Cache', 'HIT')
        res.setHeader('ETag', cachedResponse.etag)
        
        if (cachedResponse.lastModified) {
          res.setHeader('Last-Modified', cachedResponse.lastModified.toUTCString())
        }

        // 检查条件请求
        if (req.get('If-None-Match') === cachedResponse.etag) {
          return res.status(304).end()
        }

        res.status(cachedResponse.statusCode)
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value)
        })
        
        return res.send(cachedResponse.body)
      }

      // 拦截响应以进行缓存
      const originalSend = res.send
      res.send = function(body) {
        if (res.statusCode < 400 && cacheConfig.shouldCache?.(req, res, cacheConfig)) {
          const responseToCache: CachedResponse = {
            statusCode: res.statusCode,
            headers: res.getHeaders() as Record<string, string>,
            body: body.toString(),
            timestamp: new Date(),
            etag: res.get('ETag')
          }
          
          setImmediate(() => {
            cacheService.set(cacheKey, responseToCache, cacheConfig.ttl).catch(console.error)
          })
        }
        
        res.setHeader('X-Cache', 'MISS')
        return originalSend.call(this, body)
      }

      next()
    } catch (error) {
      next() // 缓存错误不应阻止请求
    }
  }
}

// 代理中间件
@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  constructor(
    private loadBalancer: LoadBalancerService,
    private circuitBreaker: CircuitBreakerService,
    private protocolAdapters: ProtocolAdapter[]
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const route = req['route'] as Route

    try {
      // 选择后端目标
      const target = await this.loadBalancer.selectTarget(route.backend)
      
      if (!target) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'No healthy backend targets available'
        })
      }

      // 选择协议适配器
      const adapter = this.protocolAdapters.find(a => a.canHandle(req))
      
      if (!adapter) {
        return res.status(400).json({
          error: 'Unsupported protocol',
          message: 'No suitable protocol adapter found'
        })
      }

      // 通过断路器执行请求
      const response = await this.circuitBreaker.execute(
        target.id,
        () => adapter.forward(req, target),
        route.backend.circuitBreaker
      )

      // 转发响应
      res.status(response.statusCode)
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value)
      })
      res.send(response.body)

    } catch (error) {
      if (error.name === 'CircuitBreakerOpenError') {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'Circuit breaker is open'
        })
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
```

## 🛡️ 安全措施

### JWT令牌验证
- **令牌格式**: RS256签名算法，支持公私钥对验证
- **令牌缓存**: Redis缓存已验证的令牌，TTL设置为令牌过期时间
- **令牌刷新**: 支持自动刷新即将过期的令牌
- **令牌撤销**: 支持黑名单机制，实时撤销被盗用的令牌

### API密钥管理
- **密钥生成**: 使用加密随机数生成器创建高强度API密钥
- **密钥存储**: 仅存储密钥的哈希值，原始密钥不可恢复
- **访问控制**: 基于API密钥的细粒度权限控制
- **使用统计**: 记录API密钥的使用情况和访问模式

### 请求安全防护
- **CORS配置**: 严格的跨域资源共享策略
- **HTTPS强制**: 生产环境强制使用HTTPS
- **请求大小限制**: 防止超大请求导致的DOS攻击
- **IP白名单**: 支持基于IP地址的访问控制

## 📈 监控和告警

### Prometheus指标收集
```typescript
// 网关核心指标
const gatewayMetrics = {
  // 请求指标
  'gateway_requests_total': Counter, // 总请求数
  'gateway_request_duration_seconds': Histogram, // 请求响应时间
  'gateway_request_size_bytes': Histogram, // 请求大小
  'gateway_response_size_bytes': Histogram, // 响应大小
  
  // 路由指标
  'gateway_route_matches_total': Counter, // 路由匹配次数
  'gateway_route_cache_hits_total': Counter, // 路由缓存命中
  
  // 限流指标
  'gateway_rate_limit_violations_total': Counter, // 限流违规次数
  'gateway_rate_limit_remaining': Gauge, // 剩余配额
  
  // 负载均衡指标
  'gateway_backend_requests_total': Counter, // 后端请求数
  'gateway_backend_failures_total': Counter, // 后端失败数
  'gateway_backend_response_time': Histogram, // 后端响应时间
  
  // 断路器指标
  'gateway_circuit_breaker_state': Gauge, // 断路器状态
  'gateway_circuit_breaker_failures': Counter, // 断路器失败次数
}
```

### 告警规则配置
```yaml
# API网关告警规则
groups:
  - name: api-gateway-alerts
    rules:
      - alert: GatewayHighErrorRate
        expr: rate(gateway_requests_total{status=~"5.."}[5m]) / rate(gateway_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API网关错误率过高"
          
      - alert: GatewayHighLatency
        expr: histogram_quantile(0.95, rate(gateway_request_duration_seconds_bucket[5m])) > 0.1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "API网关响应时间过长"
          
      - alert: GatewayRateLimitHigh
        expr: rate(gateway_rate_limit_violations_total[5m]) > 100
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "API网关限流触发频繁"
```

### 健康检查机制
```typescript
@Controller('health')
export class HealthController {
  @Get()
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBackendServices(),
      this.checkMemoryUsage()
    ]);
    
    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway-service',
      version: '1.0.0',
      dependencies: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled', 
        backends: checks[2].status === 'fulfilled',
        memory: checks[3].status === 'fulfilled'
      }
    };
  }
}
```

## 🧪 测试策略

### 单元测试
```typescript
// 路由匹配测试
describe('RouteService', () => {
  it('should find matching route for valid path', async () => {
    const route = await routeService.findMatchingRoute('/api/v1/users', 'GET', {});
    expect(route).toBeDefined();
    expect(route.path).toBe('/api/v1/users');
  });
  
  it('should return null for non-matching path', async () => {
    const route = await routeService.findMatchingRoute('/invalid', 'GET', {});
    expect(route).toBeNull();
  });
});

// 负载均衡测试
describe('LoadBalancer', () => {
  it('should distribute requests evenly in round robin', async () => {
    const backend = createMockBackend(3);
    const selections = [];
    
    for (let i = 0; i < 6; i++) {
      const target = await loadBalancer.selectTarget(backend);
      selections.push(target.id);
    }
    
    expect(selections).toEqual(['target1', 'target2', 'target3', 'target1', 'target2', 'target3']);
  });
});
```

### 集成测试
```typescript
// 端到端测试
describe('Gateway E2E', () => {
  it('should proxy request to backend service', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
      
    expect(response.body).toHaveProperty('data');
    expect(mockBackendService.getUsersCalled).toBe(true);
  });
  
  it('should enforce rate limiting', async () => {
    // 发送超过限制的请求
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get('/api/v1/test');
    }
    
    const response = await request(app.getHttpServer())
      .get('/api/v1/test')
      .expect(429);
      
    expect(response.body.error).toContain('Rate limit exceeded');
  });
});
```

### 性能测试
```bash
# 使用 Artillery 进行压力测试
artillery run --config artillery.yml

# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 100
scenarios:
  - name: "Load test API Gateway"
    requests:
      - get:
          url: "/api/v1/users"
          headers:
            Authorization: "Bearer test-token"
```

## ⚡ 性能优化

### 负载均衡器实现
```typescript
// 负载均衡器接口
interface LoadBalancerService {
  selectTarget(backend: BackendConfig): Promise<BackendTarget | null>
  markTargetHealthy(targetId: string): void
  markTargetUnhealthy(targetId: string): void
  getTargetHealth(targetId: string): TargetHealth
}

// 轮询负载均衡器
@Injectable()
export class RoundRobinLoadBalancer implements LoadBalancerService {
  private currentIndex = new Map<string, number>()

  async selectTarget(backend: BackendConfig): Promise<BackendTarget | null> {
    const healthyTargets = backend.targets.filter(t => t.isActive && this.isHealthy(t.id))
    
    if (healthyTargets.length === 0) {
      return null
    }

    const key = this.getBackendKey(backend)
    const currentIdx = this.currentIndex.get(key) || 0
    const selectedTarget = healthyTargets[currentIdx % healthyTargets.length]
    
    this.currentIndex.set(key, currentIdx + 1)
    return selectedTarget
  }

  private getBackendKey(backend: BackendConfig): string {
    return backend.targets.map(t => t.id).sort().join(',')
  }

  private isHealthy(targetId: string): boolean {
    // 检查目标健康状态
    return true // 简化实现
  }

  markTargetHealthy(targetId: string): void {
    // 标记目标为健康
  }

  markTargetUnhealthy(targetId: string): void {
    // 标记目标为不健康
  }

  getTargetHealth(targetId: string): TargetHealth {
    // 获取目标健康状态
    return TargetHealth.HEALTHY
  }
}

// 加权轮询负载均衡器
@Injectable()
export class WeightedRoundRobinLoadBalancer implements LoadBalancerService {
  private weightCounters = new Map<string, Map<string, number>>()

  async selectTarget(backend: BackendConfig): Promise<BackendTarget | null> {
    const healthyTargets = backend.targets.filter(t => t.isActive && this.isHealthy(t.id))
    
    if (healthyTargets.length === 0) {
      return null
    }

    const key = this.getBackendKey(backend)
    const counters = this.weightCounters.get(key) || new Map()
    
    // 找到权重计数最小的目标
    let selectedTarget: BackendTarget | null = null
    let minRatio = Infinity

    for (const target of healthyTargets) {
      const count = counters.get(target.id) || 0
      const ratio = count / target.weight
      
      if (ratio < minRatio) {
        minRatio = ratio
        selectedTarget = target
      }
    }

    if (selectedTarget) {
      counters.set(selectedTarget.id, (counters.get(selectedTarget.id) || 0) + 1)
      this.weightCounters.set(key, counters)
    }

    return selectedTarget
  }

  private getBackendKey(backend: BackendConfig): string {
    return backend.targets.map(t => t.id).sort().join(',')
  }

  private isHealthy(targetId: string): boolean {
    return true
  }

  markTargetHealthy(targetId: string): void {}
  markTargetUnhealthy(targetId: string): void {}
  getTargetHealth(targetId: string): TargetHealth {
    return TargetHealth.HEALTHY
  }
}

// 最少连接负载均衡器
@Injectable()
export class LeastConnectionsLoadBalancer implements LoadBalancerService {
  private connectionCounts = new Map<string, number>()

  async selectTarget(backend: BackendConfig): Promise<BackendTarget | null> {
    const healthyTargets = backend.targets.filter(t => t.isActive && this.isHealthy(t.id))
    
    if (healthyTargets.length === 0) {
      return null
    }

    // 找到连接数最少的目标
    let selectedTarget = healthyTargets[0]
    let minConnections = this.connectionCounts.get(selectedTarget.id) || 0

    for (const target of healthyTargets) {
      const connections = this.connectionCounts.get(target.id) || 0
      if (connections < minConnections) {
        minConnections = connections
        selectedTarget = target
      }
    }

    // 增加连接计数
    this.connectionCounts.set(selectedTarget.id, minConnections + 1)

    return selectedTarget
  }

  decrementConnection(targetId: string): void {
    const current = this.connectionCounts.get(targetId) || 0
    this.connectionCounts.set(targetId, Math.max(0, current - 1))
  }

  private isHealthy(targetId: string): boolean {
    return true
  }

  markTargetHealthy(targetId: string): void {}
  markTargetUnhealthy(targetId: string): void {}
  getTargetHealth(targetId: string): TargetHealth {
    return TargetHealth.HEALTHY
  }
}

enum TargetHealth {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}
```

## 🐳 部署配置

### Docker 配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Docker Compose (标准版本)
```yaml
# docker-compose.yml - 标准版本专用配置
version: '3.8'

services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - CACHE_SERVICE_URL=http://cache-service:3011
      - AUTH_SERVICE_URL=http://auth-service:3001
      - RBAC_SERVICE_URL=http://rbac-service:3002
      - USER_SERVICE_URL=http://user-service:3003
      - TENANT_SERVICE_URL=http://tenant-service:3004
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
      - FILE_SERVICE_URL=http://file-service:3006
      - MONITORING_SERVICE_URL=http://monitoring-service:3007
      - AUDIT_SERVICE_URL=http://audit-service:3008
      - SCHEDULER_SERVICE_URL=http://scheduler-service:3009
      - MQ_SERVICE_URL=http://mq-service:3010
      - JWT_SECRET=${JWT_SECRET}
      - JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY}
      - SERVICE_TOKEN=${SERVICE_TOKEN}
    depends_on:
      - postgres
      - redis
      - cache-service
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/gateway/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - platform-network

  # 标准版本统一PostgreSQL (所有服务共享)
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: platform_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_INITDB_ARGS: "--data-checksums"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    command: |
      postgres
        -c max_connections=200
        -c shared_buffers=256MB
        -c effective_cache_size=1GB
        -c work_mem=4MB
        -c maintenance_work_mem=64MB
        -c random_page_cost=1.1
        -c temp_file_limit=2GB
        -c log_min_duration_statement=1000
        -c log_connections=on
        -c log_disconnections=on
        -c log_lock_waits=on
    networks:
      - platform-network

  # 标准版本统一Redis (缓存+消息队列)
  redis:
    image: redis:7-alpine
    command: |
      redis-server
        --appendonly yes
        --maxmemory 1gb
        --maxmemory-policy allkeys-lru
        --tcp-keepalive 60
        --timeout 0
        --tcp-backlog 511
        --databases 16
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 1.5G
          cpus: '0.5'
        reservations:
          memory: 1G
          cpus: '0.25'
    networks:
      - platform-network

  # 可选：Nginx负载均衡 (生产环境推荐)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - api-gateway
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
    networks:
      - platform-network

volumes:
  postgres_data:
  redis_data:

networks:
  platform-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 标准版本Docker Compose扩展配置
```yaml
# docker-compose.override.yml - 开发环境扩展
version: '3.8'

services:
  api-gateway:
    environment:
      - LOG_LEVEL=debug
      - ENABLE_SWAGGER=true
      - ENABLE_METRICS=true
      - PROMETHEUS_METRICS=true
    volumes:
      - ./src:/app/src:ro
    command: npm run start:dev

  # 开发环境监控栈
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - platform-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - platform-network

  # Redis Commander (Redis管理界面)
  redis-commander:
    image: rediscommander/redis-commander:latest
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
    networks:
      - platform-network

volumes:
  prometheus_data:
  grafana_data:
```

### 生产环境Docker Swarm配置
```yaml
# docker-stack.yml - 生产环境Docker Swarm
version: '3.8'

services:
  api-gateway:
    image: api-gateway:${VERSION}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
      placement:
        constraints:
          - node.role == worker
    networks:
      - platform-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/gateway/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: platform_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
    secrets:
      - postgres_password
    networks:
      - platform-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass-file /run/secrets/redis_password
    volumes:
      - redis_data:/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          memory: 1.5G
          cpus: '0.5'
    secrets:
      - redis_password
    networks:
      - platform-network

volumes:
  postgres_data:
  redis_data:

networks:
  platform-network:
    driver: overlay
    attachable: true

secrets:
  postgres_password:
    external: true
  redis_password:
    external: true
```

## 📅 项目规划

### 🎯 标准版本项目规划总结

#### 内存分配策略 (8GB总内存)
- **API网关服务**: 1GB (12.5%) - 路由转发和限流
- **PostgreSQL**: 2GB (25%) - 统一数据存储
- **Redis**: 1.5GB (18.75%) - 缓存和消息队列
- **其他11个服务**: 3.5GB (43.75%) - 平均每服务320MB

#### 开发里程碑 (Week 2: 业务服务阶段)
- **Day 1-2**: 路由管理核心功能实现
- **Day 3-4**: 负载均衡和限流机制
- **Day 5-6**: 认证授权集成和安全策略
- **Day 7**: 测试验证和性能调优

#### 风险评估与缓解措施

**技术风险**:
1. **缓存服务依赖风险** - 缓解：实现本地内存缓存备份
2. **单点故障风险** - 缓解：Docker Compose健康检查和自动重启
3. **性能瓶颈风险** - 缓解：限流保护和连接池管理

**集成风险**:
1. **服务间认证复杂性** - 缓解：统一SERVICE_TOKEN认证机制
2. **数据一致性风险** - 缓解：事务性操作和补偿机制
3. **版本兼容性风险** - 缓解：API版本管理和向后兼容

### 开发阶段完成情况评估

#### ✅ 1.1 需求分析阶段 (Requirements Analysis) - 100%完成
- ✅ **业务需求收集**: 已明确API网关作为统一入口的核心职责
- ✅ **技术需求分析**: 已定义100租户+10万用户的性能指标
- ✅ **用户故事编写**: 通过190个API端点体现了完整的用户使用场景
- ✅ **验收标准定义**: 已明确功能验收和性能标准(99.9%可用性，<50ms响应)
- ✅ **架构设计文档**: 已有完整的技术架构说明和14个功能模块

#### ✅ 1.2 项目规划阶段 (Project Planning) - 100%完成
- ✅ **项目计划制定**: 已设定4周开发时间线，Week 2业务服务阶段
- ✅ **里程碑设置**: 已定义7天开发计划和阶段性目标
- ✅ **资源分配**: 已明确端口3000、内存分配1GB、优先级第6位
- ✅ **风险评估**: 已识别技术风险、集成风险并制定缓解措施
- ✅ **技术栈选择**: 已完全符合标准版本技术栈要求，移除K8S/Kafka等复杂组件

#### ✅ 1.3 架构设计阶段 (Architecture Design) - 100%完成
- ✅ **系统架构设计**: 已有完整的微服务架构图和11个服务交互设计
- ✅ **数据库设计**: 已有完整PostgreSQL表结构设计(8个核心表+分区表)
- ✅ **API设计**: 已有190个RESTful接口定义，包含内部服务调用端点
- ✅ **安全架构设计**: 已符合标准版本安全要求(JWT+API Key+X-Service-Token)
- ✅ **性能规划**: 已针对标准版本规模进行性能设计和资源分配

### 🔄 集成测试计划
1. **阶段1**: 与缓存服务(3011)集成测试 - 路由缓存和限流计数器
2. **阶段2**: 与认证服务(3001)集成测试 - JWT令牌验证链路
3. **阶段3**: 与权限服务(3002)集成测试 - 权限检查和RBAC
4. **阶段4**: 全链路压力测试 - 10万QPS性能验证

### 服务间交互设计 (基于SERVICE_INTERACTION_SPEC.md)

#### 统一数据模型集成

**JWT Payload标准化**:
```typescript
interface JWTPayload {
  sub: string                  // 用户ID
  tenant: string               // 租户ID
  username: string             // 用户名
  email: string                // 邮箱
  roles: string[]              // 角色列表
  permissions: string[]        // 权限列表
  iat: number                  // 签发时间
  exp: number                  // 过期时间
  iss: string                  // 签发者
  aud: string                  // 受众
}
```

**审计事件标准化**:
```typescript
interface AuditEvent {
  id: string                   // 事件ID
  tenantId: string            // 租户ID
  userId?: string             // 用户ID
  serviceId: 'api-gateway-service'
  eventType: 'request' | 'route' | 'auth' | 'rate_limit'
  resource: string            // 资源类型
  action: string              // 操作动作
  outcome: 'success' | 'failure' | 'partial'
  timestamp: Date             // 事件时间
  sourceIp: string            // 源IP
  requestId?: string          // 请求ID
  metadata: Record<string, any>
}
```

#### 内部服务调用认证
```typescript
// 服务间调用统一认证头
const serviceHeaders = {
  'X-Service-Token': process.env.SERVICE_TOKEN,
  'X-Service-Name': 'api-gateway-service',
  'X-Request-ID': requestId,
  'Content-Type': 'application/json'
}
```

#### 关键服务依赖关系与调用模式
1. **缓存服务(3011)** - 必需依赖，路由缓存、限流计数器
2. **认证服务(3001)** - 推荐集成，JWT令牌验证，用户会话管理
3. **权限服务(3002)** - 推荐集成，权限检查，RBAC控制
4. **用户服务(3003)** - 按需集成，用户信息获取，资料更新
5. **审计服务(3008)** - 推荐集成，请求日志记录，操作审计
6. **监控服务(3007)** - 推荐集成，性能指标上报，健康检查

### 本地开发环境 (Nx Monorepo)

```bash
# 1. 克隆项目（在workspace根目录）
git clone <repository-url>
cd platform

# 2. 安装依赖（workspace统一管理）
npm install

# 3. 启动基础设施（标准版本统一PostgreSQL+Redis）
docker-compose up -d postgres redis

# 4. 启动依赖服务（按开发顺序）
nx serve cache-service        # 3011 - 缓存服务（依赖项）
nx serve auth-service         # 3001 - 认证服务（可选）
nx serve rbac-service         # 3002 - 权限服务（可选）

# 5. 数据库迁移（API网关表结构）
nx run api-gateway-service:migrate

# 6. 启动API网关开发服务器
nx serve api-gateway-service  # 3000 - 本服务

# 7. 验证服务状态
curl http://localhost:3000/api/v1/gateway/health
curl http://localhost:3000/api/v1/gateway/status

# 8. 运行测试套件
nx test api-gateway-service
nx e2e api-gateway-service

# 9. 构建生产版本
nx build api-gateway-service

# 10. 查看服务依赖图
nx dep-graph
```

### 配置文件示例
```typescript
// apps/api-gateway-service/src/config/gateway.config.ts
export default {
  // 服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0',
    timeout: 30000,
    keepAliveTimeout: 5000
  },
  
  // 代理配置
  proxy: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    compression: true,
    preserveHeaderKeyCase: true
  },
  
  // 限流配置
  rateLimit: {
    windowMs: 60 * 1000, // 1分钟
    max: 1000,           // 每分钟最多1000次请求
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // 缓存配置
  cache: {
    type: 'redis',
    ttl: 300,      // 5分钟
    maxSize: 1000, // 最多1000个key
    compression: true
  },
  
  // 断路器配置
  circuitBreaker: {
    failureThreshold: 5,     // 5次失败触发断路器
    resetTimeout: 60000,     // 60秒后尝试恢复
    monitoringPeriod: 10000  // 10秒监控周期
  },
  
  // 健康检查配置
  healthCheck: {
    interval: 30000,  // 30秒检查间隔
    timeout: 5000,    // 5秒超时
    retries: 3        // 3次重试
  },

  // 标准版本服务发现配置（Docker Compose网络）
  services: {
    // 核心依赖服务（必需）
    cacheService: process.env.CACHE_SERVICE_URL || 'http://cache-service:3011',
    authService: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    rbacService: process.env.RBAC_SERVICE_URL || 'http://rbac-service:3002',
    
    // 业务服务（按需集成）
    userService: process.env.USER_SERVICE_URL || 'http://user-service:3003',
    tenantService: process.env.TENANT_SERVICE_URL || 'http://tenant-service:3004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005',
    fileService: process.env.FILE_SERVICE_URL || 'http://file-service:3006',
    
    // 系统服务（运维相关）
    monitoringService: process.env.MONITORING_SERVICE_URL || 'http://monitoring-service:3007',
    auditService: process.env.AUDIT_SERVICE_URL || 'http://audit-service:3008',
    schedulerService: process.env.SCHEDULER_SERVICE_URL || 'http://scheduler-service:3009',
    mqService: process.env.MQ_SERVICE_URL || 'http://mq-service:3010'
  },
  
  // 服务间认证配置
  serviceAuth: {
    token: process.env.SERVICE_TOKEN || 'service-secret-token',
    timeout: 10000,  // 10秒超时
    retries: 3,      // 重试3次
    headers: {
      'X-Service-Name': 'api-gateway-service',
      'X-Service-Version': '1.0.0'
    }
  },
  
  // 服务健康检查配置
  serviceHealthCheck: {
    interval: 30000,    // 30秒检查间隔
    timeout: 5000,      // 5秒超时
    retries: 3,         // 失败重试次数
    endpoints: {
      cache: '/api/v1/cache/health',
      auth: '/api/v1/auth/health',
      rbac: '/api/v1/rbac/health',
      user: '/api/v1/users/health',
      tenant: '/api/v1/tenants/health',
      notification: '/api/v1/notifications/health',
      file: '/api/v1/files/health',
      monitoring: '/api/v1/monitoring/health',
      audit: '/api/v1/audit/health',
      scheduler: '/api/v1/scheduler/health',
      mq: '/api/v1/mq/health'
    }
  }
}
```

### Nx Monorepo项目结构

```
workspace/
├── apps/
│   ├── api-gateway-service/           # 当前服务
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── config/
│   │   │   └── middleware/
│   │   ├── project.json              # Nx项目配置
│   │   └── Dockerfile
│   └── cache-service/                # 依赖的缓存服务
├── libs/
│   ├── shared/                       # 共享类型定义
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── interfaces/
│   │   │   │   ├── types/
│   │   │   │   └── constants/
│   │   └── project.json
│   ├── common/                       # 通用工具库
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   └── interceptors/
│   │   └── project.json
└── tools/                           # 构建工具
```

### 共享库使用示例

```typescript
// 引用共享类型
import { RouteConfig, AuthContext } from '@platform/shared'
import { BaseController, ApiResponse } from '@platform/common'

@Controller('api/v1/gateway')
export class GatewayController extends BaseController {
  // 使用共享类型
  async createRoute(@Body() route: RouteConfig): Promise<ApiResponse> {
    // 实现逻辑
  }
}
```

## 🔄 服务间交互设计

### 内存分配策略 (8GB总内存)
- **API网关服务**: 1GB (12.5%) - 路由转发和限流
- **PostgreSQL**: 2GB (25%) - 统一数据存储
- **Redis**: 1.5GB (18.75%) - 缓存和消息队列
- **其他11个服务**: 3.5GB (43.75%) - 平均每服务320MB

### 风险评估与缓解措施

#### 技术风险
1. **缓存服务依赖风险** - 缓解：实现本地内存缓存备份
2. **单点故障风险** - 缓解：Docker Compose健康检查和自动重启
3. **性能瓶颈风险** - 缓解：限流保护和连接池管理

#### 集成风险
1. **服务间认证复杂性** - 缓解：统一SERVICE_TOKEN认证机制
2. **数据一致性风险** - 缓解：事务性操作和补偿机制
3. **版本兼容性风险** - 缓解：API版本管理和向后兼容

### 开发里程碑 (Week 2)
- **Day 1-2**: 路由管理核心功能实现
- **Day 3-4**: 负载均衡和限流机制
- **Day 5-6**: 认证授权集成和安全策略
- **Day 7**: 测试验证和性能调优

### 集成测试计划
1. **阶段1**: 与缓存服务集成测试
2. **阶段2**: 与认证服务集成测试
3. **阶段3**: 与权限服务集成测试
4. **阶段4**: 全链路压力测试

## ✅ 开发完成情况总结

API网关服务作为企业级微服务平台的**统一入口**，已完成**3个核心开发阶段的100%设计规划**：

### ✅ 完成情况总览
- **需求分析**: 100%完成 - 明确了100租户+10万用户的核心需求
- **项目规划**: 100%完成 - 制定了Week 2开发计划和风险缓解措施
- **架构设计**: 100%完成 - 设计了190个API端点和完整的微服务交互机制

### 🚀 标准版本关键特性
- **技术栈优化**: 移除K8S/Kafka等复杂组件，使用Docker Compose+Redis
- **服务集成**: 与11个微服务的标准化交互，统一认证和数据模型
- **性能目标**: 1GB内存支持10万QPS，<50ms响应时间
- **部署方案**: Docker Compose单机/小集群部署，避免过度复杂性

### 📋 开发就绪状态
- **技术风险**: 已识别并制定缓解措施（缓存依赖、性能瓶颈、集成复杂性）
- **API设计**: 190个端点覆盖完整网关功能，包含内部服务调用
- **数据模型**: 8个PostgreSQL表+Redis缓存结构，支持租户隔离
- **监控集成**: Prometheus+Grafana监控栈，健康检查机制

### 🔄 下一步行动
1. **Week 2 Day 1-2**: 实现路由管理核心功能
2. **依赖服务**: 确保缓存服务(3011)优先完成
3. **集成测试**: 按4个阶段验证与其他服务的交互
4. **性能调优**: 最后进行10万QPS压力测试

**标准版本定位**: 作为第6优先级服务(⭐⭐⭐)，API网关将在Week 2实现，为整个微服务平台提供统一、高性能、生产可用的流量分发和安全防护能力。