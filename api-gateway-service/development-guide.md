# API网关服务开发文档 - 标准版本

## 服务概述

API网关服务是微服务平台的统一入口（端口3000），面向**100租户+10万用户**的企业级生产系统，负责请求路由、认证授权、限流熔断、负载均衡、协议转换、API版本管理等功能，为整个平台提供统一的API接入和管理能力。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户的高并发API访问
- **性能要求**: API响应时间<50ms，支持10万QPS
- **可用性**: 99.9%可用性，多实例负载均衡
- **安全等级**: 企业级安全，多重认证授权
- **部署方式**: Docker Compose + Nginx负载均衡

### 🚨 依赖关系
- **PostgreSQL**: 存储路由配置、API密钥、版本管理等
- **Redis**: 限流计数、缓存、会话存储等
- **缓存服务(3011)**: 分布式缓存支撑
- **开发优先级**: 第2位（需先完成缓存服务）

## 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (配置数据) + Redis 7+ (缓存/限流)
- **ORM**: Prisma ORM
- **代理**: HTTP Proxy Middleware / Node HTTP Proxy
- **负载均衡**: Round Robin / Weighted Round Robin / Least Connections
- **断路器**: Opossum Circuit Breaker

### 网关技术 (标准版本)
- **协议支持**: HTTP/HTTPS, WebSocket (生产级协议)
- **认证**: JWT, API Key (简化认证，适合标准版本)
- **限流**: Redis Token Bucket (高性能限流)
- **缓存**: Redis 分布式缓存
- **压缩**: GZIP (标准压缩)

### 监控技术
- **日志**: Winston
- **指标**: Prometheus + Grafana
- **健康检查**: NestJS Health Check

## 📋 功能模块清单

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

### API端点映射表

| 功能模块 | 主要端点 | 端点数量 | 实现状态 |
|---------|---------|----------|----------|
| 基础管理 | `/api/v1/gateway/health`, `/api/v1/gateway/status` | 7个 | 🔧 系统级 |
| 路由管理 | `/api/v1/gateway/routes`, `/api/v1/gateway/routes/{id}` | 6个 | 🔄 推荐 |
| 负载均衡与限流 | `/api/v1/gateway/load-balancers`, `/api/v1/gateway/rate-limits` | 14个 | 🔄 推荐 |
| 安全与认证 | `/api/v1/gateway/security/policies`, `/api/v1/gateway/api-keys` | 7个 | 🔄 推荐 |
| 插件与中间件 | `/api/v1/gateway/plugins`, `/api/v1/gateway/middlewares` | 8个 | 🔄 推荐 |
| 证书管理 | `/api/v1/gateway/certificates` | 3个 | 🔄 推荐 |
| 服务发现 | `/api/v1/gateway/discovery/services` | 5个 | 🔄 推荐 |
| 配置中心 | `/api/v1/gateway/config/applications` | 8个 | 🔄 推荐 |
| 监控分析 | `/api/v1/gateway/services`, `/api/v1/gateway/analytics/traffic` | 17个 | 🔄 推荐 |
| 版本管理与国际化 | `/api/v1/gateway/versions`, `/api/v1/gateway/i18n/languages` | 10个 | 🔄 推荐 |
| 高级路由功能 | `/api/v1/gateway/routing/canary`, `/api/v1/gateway/routing/blue-green` | 19个 | 🔄 推荐 |
| 性能优化 | `/api/v1/gateway/performance/connections` | 13个 | 🔄 推荐 |
| API治理 | `/api/v1/gateway/governance/lifecycle` | 14个 | 🔄 推荐 |
| 企业级协议支持 | `/api/v1/gateway/protocols/http2`, `/api/v1/gateway/cluster/config` | 21个 | 🔄 推荐 |

**总计**: 70个API端点（14个功能模块）

## 核心技术实现

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

## 数据库设计

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

## API 设计

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

## 负载均衡算法

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

## 部署方案

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

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/gateway_db
      - REDIS_URL=redis://redis:6379
      - CACHE_SERVICE_URL=http://cache-service:3011
      - JWT_SECRET=${JWT_SECRET}
      - JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY}
    depends_on:
      - postgres
      - redis
      - cache-service
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: gateway_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  # 负载均衡器 (可选)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api-gateway

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes 部署
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
    - port: 80
      targetPort: 3000
      name: http
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: api-gateway-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

## 开发指南

### 本地开发环境 (Nx Monorepo)

```bash
# 1. 克隆项目（在workspace根目录）
git clone <repository-url>
cd platform

# 2. 安装依赖（workspace统一管理）
npm install

# 3. 启动依赖服务（先启动缓存服务）
docker-compose up -d postgres redis

# 4. 启动缓存服务（API网关的依赖）
nx serve cache-service

# 5. 数据库迁移（API网关）
nx run api-gateway-service:migrate

# 6. 启动API网关开发服务器
nx serve api-gateway-service

# 7. 运行测试
nx test api-gateway-service
nx e2e api-gateway-service

# 8. 构建服务
nx build api-gateway-service

# 9. 查看项目依赖图
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

  // 服务发现配置（连接其他微服务）
  services: {
    cacheService: 'http://localhost:3011',    // 缓存服务
    authService: 'http://localhost:3001',     // 认证服务
    rbacService: 'http://localhost:3002',     // 权限服务
    userService: 'http://localhost:3003',     // 用户服务
    tenantService: 'http://localhost:3004',   // 租户服务
    notificationService: 'http://localhost:3005', // 通知服务
    fileService: 'http://localhost:3006',     // 文件服务
    monitoringService: 'http://localhost:3007', // 监控服务
    auditService: 'http://localhost:3008',    // 审计服务
    schedulerService: 'http://localhost:3009', // 调度服务
    mqService: 'http://localhost:3010'        // 消息队列服务
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

这个API网关服务将作为整个微服务平台的统一入口，提供完整的API管理、安全认证、性能优化等功能，确保系统的可扩展性和可维护性。基于Nx monorepo架构，可以充分利用代码共享和统一构建的优势。