# 企业级微服务交互架构重设计

## 🎯 设计原则

### 1. 服务分层架构
```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application Layer)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ API网关服务   │  │ 文件存储服务  │  │ 任务调度服务  │           │
│  │   (3000)    │  │   (3006)    │  │   (3009)    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    业务层 (Business Layer)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ 用户管理服务  │  │ 租户管理服务  │  │ 通知服务     │           │
│  │   (3003)    │  │   (3004)    │  │   (3005)    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    核心层 (Core Layer)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ 认证授权服务  │  │ 权限管理服务  │  │ 审计服务     │           │
│  │   (3001)    │  │   (3002)    │  │   (3008)    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  基础设施层 (Infrastructure Layer)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ 缓存服务     │  │ 消息队列服务  │  │ 监控服务     │           │
│  │   (3011)    │  │   (3010)    │  │   (3007)    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 2. 调用方向原则
- **向下调用**: 上层服务只能调用下层服务
- **同层调用**: 同层服务间通过事件总线进行异步通信
- **禁止向上调用**: 下层服务不能直接调用上层服务，只能通过事件通知

### 3. 性能分级标准
- **基础设施层**: < 5ms (缓存、队列、监控)
- **核心层**: < 20ms (认证、权限、审计)  
- **业务层**: < 50ms (用户、租户、通知)
- **应用层**: < 100ms (网关、文件、调度)

## 🔄 完整业务场景的服务交互设计

### 场景1: 用户注册完整流程
```typescript
// 1. API网关接收请求
POST /api/v1/auth/register
↓
// 2. 网关 → 认证服务预检查
POST http://auth-service:3001/internal/auth/pre-validate
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { email, tenantId }
↓
// 3. 认证服务 → 租户服务验证租户
GET http://tenant-management-service:3004/internal/tenants/{tenantId}/validate
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
↓
// 4. 认证服务 → 用户服务创建用户
POST http://user-management-service:3003/internal/users/create
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { email, password, tenantId, profile }
↓
// 5. 用户服务 → RBAC服务分配默认角色
POST http://rbac-service:3002/internal/users/{userId}/assign-default-role
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { tenantId, userType: "member" }
↓
// 6. 用户服务 → 消息队列发布用户创建事件
POST http://message-queue-service:3010/internal/events/publish
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  eventType: "user.created",
  tenantId,
  userId,
  data: { email, profile }
}
↓
// 7. 通知服务监听事件，发送欢迎邮件
// 8. 审计服务监听事件，记录用户创建日志
// 9. 监控服务监听事件，更新用户统计指标
```

### 场景2: 用户登录认证流程
```typescript
// 1. API网关接收登录请求
POST /api/v1/auth/login
↓
// 2. 网关 → 认证服务
POST http://auth-service:3001/internal/auth/authenticate
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { email, password, tenantId }
↓
// 3. 认证服务 → 用户服务验证凭据
POST http://user-management-service:3003/internal/users/validate-credentials
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { email, password, tenantId }
↓
// 4. 认证服务 → RBAC服务获取用户权限
GET http://rbac-service:3002/internal/users/{userId}/permissions
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Query: tenantId={tenantId}
↓
// 5. 认证服务 → 缓存服务存储会话
POST http://cache-service:3011/internal/sessions/create
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  sessionId,
  userId,
  tenantId,
  permissions,
  expiresAt
}
↓
// 6. 认证服务 → 消息队列发布登录事件
POST http://message-queue-service:3010/internal/events/publish
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  eventType: "auth.login",
  tenantId,
  userId,
  data: { loginTime, ip, userAgent }
}
```

### 场景3: 文件上传权限验证流程
```typescript
// 1. API网关接收文件上传请求
POST /api/v1/files/upload
↓
// 2. 网关 → 认证服务验证Token
POST http://auth-service:3001/internal/auth/verify-token
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { token: userJwtToken }
↓
// 3. 网关 → 文件服务
POST http://file-storage-service:3006/internal/files/upload-request
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}, X-User-Context: {userId,tenantId,permissions}
Body: { fileName, fileSize, contentType, folder }
↓
// 4. 文件服务 → RBAC服务检查上传权限
POST http://rbac-service:3002/internal/permissions/check
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  userId,
  tenantId,
  resource: "file",
  action: "upload",
  context: { folder, fileSize }
}
↓
// 5. 文件服务 → 租户服务检查存储配额
POST http://tenant-management-service:3004/internal/tenants/{tenantId}/check-quota
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  resourceType: "storage",
  requestedAmount: fileSize
}
↓
// 6. 文件服务执行上传，发布事件
POST http://message-queue-service:3010/internal/events/publish
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  eventType: "file.uploaded",
  tenantId,
  userId,
  data: { fileId, fileName, fileSize, folder }
}
```

### 场景4: 定时任务执行流程
```typescript
// 1. 任务调度服务触发定时任务
Scheduler triggers job execution
↓
// 2. 调度服务 → 认证服务获取系统Token
POST http://auth-service:3001/internal/auth/system-token
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: { serviceId: "scheduler-service", operation: "batch-cleanup" }
↓
// 3. 调度服务 → 目标业务服务执行操作
POST http://file-storage-service:3006/internal/maintenance/cleanup-temp-files
Headers: X-Service-Token: {token}, X-System-Token: {systemToken}, X-Request-ID: {requestId}
Body: { olderThan: "7d" }
↓
// 4. 调度服务 → 监控服务上报执行结果
POST http://monitoring-service:3007/internal/jobs/execution-result
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  jobId,
  jobType: "file-cleanup",
  status: "completed",
  duration: 1200,
  processedItems: 150,
  errors: []
}
↓
// 5. 如果执行失败 → 通知服务发送告警
POST http://notification-service:3005/internal/alerts/send
Headers: X-Service-Token: {token}, X-Request-ID: {requestId}
Body: {
  alertType: "job_failure",
  severity: "warning",
  jobId,
  message: "File cleanup job failed",
  recipients: ["admin@company.com"]
}
```

## 🔗 统一的内部API规范

### 1. 统一URL命名规范
```typescript
// 基础CRUD操作
GET    /internal/{resource}                    // 列表查询
GET    /internal/{resource}/{id}               // 单个查询  
POST   /internal/{resource}                    // 创建资源
PUT    /internal/{resource}/{id}               // 完整更新
PATCH  /internal/{resource}/{id}               // 部分更新
DELETE /internal/{resource}/{id}               // 删除资源

// 业务操作
POST   /internal/{resource}/{id}/{action}      // 特定业务操作
GET    /internal/{resource}/{id}/{subresource} // 子资源查询

// 批量操作
POST   /internal/{resource}/batch              // 批量创建
PUT    /internal/{resource}/batch              // 批量更新
POST   /internal/{resource}/batch-query        // 批量查询

// 验证和检查
POST   /internal/{resource}/validate           // 数据验证
POST   /internal/{resource}/check              // 状态检查
POST   /internal/{resource}/exists             // 存在性检查

// 系统操作
GET    /internal/health                        // 健康检查
GET    /internal/metrics                       // 指标数据
POST   /internal/events                        // 事件上报
```

### 2. 统一请求头规范
```typescript
interface StandardHeaders {
  'X-Service-Token': string        // 内部服务认证令牌 (必需)
  'X-Service-Name': string         // 调用方服务名称 (必需)
  'X-Request-ID': string           // 请求追踪ID (必需)
  'X-Correlation-ID'?: string      // 关联ID (业务流程追踪)
  'X-User-Context'?: string        // 用户上下文 (Base64编码的JSON)
  'X-Tenant-ID'?: string           // 租户ID (多租户操作)
  'X-System-Token'?: string        // 系统级操作令牌
  'Content-Type': 'application/json'
  'Accept': 'application/json'
}

// 用户上下文格式
interface UserContext {
  userId: string
  tenantId: string
  permissions: string[]
  roles: string[]
  sessionId?: string
}
```

### 3. 统一响应格式
```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true
  data: T
  meta?: {
    requestId: string
    timestamp: string
    duration: number      // 处理时间(ms)
    version: string       // API版本
  }
}

// 错误响应
interface ErrorResponse {
  success: false
  error: {
    code: string          // 错误代码 (如: USER_NOT_FOUND)
    message: string       // 错误描述
    details?: any         // 错误详情
    field?: string        // 字段错误(表单验证)
    requestId: string     // 请求ID
    timestamp: string     // 错误时间
    service: string       // 错误来源服务
    retryable: boolean    // 是否可重试
  }
}

// 分页响应
interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: ResponseMeta
}
```

### 4. 统一错误代码规范
```typescript
enum ServiceErrorCodes {
  // 通用错误 (1000-1999)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // 认证相关 (2000-2099)
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  
  // 用户相关 (2100-2199)  
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  
  // 权限相关 (2200-2299)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // 租户相关 (2300-2399)
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_QUOTA_EXCEEDED = 'TENANT_QUOTA_EXCEEDED',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  
  // 文件相关 (2400-2499)
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  
  // 缓存相关 (2500-2599)
  CACHE_MISS = 'CACHE_MISS',
  CACHE_UNAVAILABLE = 'CACHE_UNAVAILABLE',
  
  // 队列相关 (2600-2699)
  QUEUE_FULL = 'QUEUE_FULL',
  QUEUE_UNAVAILABLE = 'QUEUE_UNAVAILABLE',
  MESSAGE_PROCESSING_FAILED = 'MESSAGE_PROCESSING_FAILED'
}
```

## 🔄 事件驱动架构设计

### 1. 统一事件格式
```typescript
interface ServiceEvent {
  id: string                    // 事件ID
  type: string                  // 事件类型 (如: user.created)
  version: string               // 事件版本
  timestamp: string             // 事件时间 (ISO 8601)
  source: string                // 事件来源服务
  tenantId?: string             // 租户ID
  userId?: string               // 用户ID
  correlationId?: string        // 关联ID
  causationId?: string          // 因果ID
  data: Record<string, any>     // 事件数据
  metadata: {
    requestId?: string          // 原始请求ID
    userAgent?: string          // 用户代理
    sourceIp?: string           // 源IP
    sessionId?: string          // 会话ID
  }
}
```

### 2. 事件类型定义
```typescript
// 用户相关事件
enum UserEvents {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACTIVATED = 'user.activated',
  USER_SUSPENDED = 'user.suspended',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_PASSWORD_CHANGED = 'user.password_changed'
}

// 租户相关事件
enum TenantEvents {
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_SUSPENDED = 'tenant.suspended',
  TENANT_QUOTA_EXCEEDED = 'tenant.quota_exceeded',
  TENANT_PLAN_CHANGED = 'tenant.plan_changed'
}

// 文件相关事件
enum FileEvents {
  FILE_UPLOADED = 'file.uploaded',
  FILE_DOWNLOADED = 'file.downloaded',
  FILE_DELETED = 'file.deleted',
  FILE_VIRUS_DETECTED = 'file.virus_detected',
  FILE_STORAGE_QUOTA_WARNING = 'file.quota_warning'
}

// 系统相关事件
enum SystemEvents {
  SERVICE_STARTED = 'system.service_started',
  SERVICE_STOPPED = 'system.service_stopped',
  SERVICE_HEALTH_CHANGED = 'system.health_changed',
  JOB_STARTED = 'system.job_started',
  JOB_COMPLETED = 'system.job_completed',
  JOB_FAILED = 'system.job_failed'
}
```

### 3. 事件订阅模式
```typescript
// 各服务的事件订阅关系
const EVENT_SUBSCRIPTIONS = {
  'notification-service': [
    'user.created',           // 发送欢迎邮件
    'user.password_changed',  // 发送密码变更通知
    'tenant.quota_exceeded',  // 发送配额告警
    'file.virus_detected',    // 发送安全告警
    'system.job_failed'       // 发送任务失败告警
  ],
  
  'audit-service': [
    'user.*',                 // 记录所有用户相关操作
    'tenant.*',               // 记录所有租户相关操作
    'file.*',                 // 记录所有文件操作
    'system.*'                // 记录所有系统事件
  ],
  
  'monitoring-service': [
    'user.login',             // 更新登录统计
    'file.uploaded',          // 更新存储统计
    'tenant.created',         // 更新租户统计
    'system.*'                // 更新系统指标
  ],
  
  'cache-service': [
    'user.updated',           // 失效用户缓存
    'user.deleted',           // 清除用户缓存
    'tenant.updated',         // 失效租户缓存
    'rbac.role_changed'       // 失效权限缓存
  ]
}
```

## 🛡️ 安全与性能优化

### 1. 服务间认证中间件
```typescript
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const serviceToken = request.headers['x-service-token']
    const serviceName = request.headers['x-service-name']
    const requestId = request.headers['x-request-id']
    
    // 验证服务Token
    const isValidToken = await this.validateServiceToken(serviceToken, serviceName)
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid service token')
    }
    
    // 设置请求上下文
    request.serviceContext = {
      serviceName,
      requestId,
      timestamp: new Date().toISOString()
    }
    
    return true
  }
}
```

### 2. 超时和重试策略
```typescript
interface ServiceCallConfig {
  service: string
  timeout: number
  retries: number
  retryDelay: number
  backoffMultiplier: number
  circuitBreakerThreshold: number
}

const SERVICE_CONFIGS: Record<string, ServiceCallConfig> = {
  'cache-service': {
    service: 'cache-service',
    timeout: 5000,       // 5秒超时
    retries: 3,
    retryDelay: 100,     // 100ms初始延迟
    backoffMultiplier: 2,
    circuitBreakerThreshold: 10
  },
  
  'auth-service': {
    service: 'auth-service', 
    timeout: 10000,      // 10秒超时
    retries: 2,
    retryDelay: 200,
    backoffMultiplier: 2,
    circuitBreakerThreshold: 5
  },
  
  'notification-service': {
    service: 'notification-service',
    timeout: 30000,      // 30秒超时
    retries: 1,          // 通知类服务重试次数少
    retryDelay: 1000,
    backoffMultiplier: 1,
    circuitBreakerThreshold: 3
  }
}
```

### 3. 链路追踪和监控
```typescript
// 每个服务调用都需要传递追踪信息
interface TraceContext {
  traceId: string        // 链路追踪ID
  spanId: string         // 当前span ID
  parentSpanId?: string  // 父span ID
  flags: number          // 追踪标记
  baggage?: Record<string, string> // 透传数据
}

// 服务调用装饰器
function TraceServiceCall(serviceName: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    descriptor.value = async function(...args: any[]) {
      const traceId = this.getTraceId()
      const spanId = generateSpanId()
      
      // 开始span
      const span = tracer.startSpan(`${serviceName}.${propertyName}`, {
        parent: this.currentSpan,
        tags: {
          'service.name': serviceName,
          'operation.name': propertyName
        }
      })
      
      try {
        // 执行原方法
        const result = await method.apply(this, args)
        span.setTag('success', true)
        return result
      } catch (error) {
        span.setTag('success', false)
        span.setTag('error', error.message)
        throw error
      } finally {
        span.finish()
      }
    }
  }
}
```

这个重新设计的架构解决了原有规范的所有问题，提供了：

1. **清晰的服务分层** - 明确了调用方向和依赖关系
2. **完整的业务场景** - 覆盖了实际的端到端业务流程
3. **统一的API规范** - 标准化了所有内部API的格式和命名
4. **事件驱动模式** - 通过异步事件减少服务间耦合
5. **企业级安全** - 完整的认证、授权、追踪机制
6. **性能优化** - 分层的性能要求和重试策略

这将为100租户+10万用户的企业级微服务平台提供坚实的架构基础。