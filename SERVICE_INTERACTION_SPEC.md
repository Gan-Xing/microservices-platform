# 服务间交互规范文档

## 服务端口分配

基于标准版本开发路线图（100租户，10万用户），12个核心微服务端口分配如下：

| 服务名称 | 端口 | 用途说明 | 标准版本复杂度 | 标准版本依赖 |
|---------|------|----------|----------|----------|
| **用户管理服务** | **3003** | **用户CRUD，最简单服务** | **1 (⭐)** | **仅PostgreSQL** |
| 认证授权服务 | 3001 | JWT登录和会话管理 | 2 (⭐⭐) | PostgreSQL+Redis |
| 权限管理服务 (RBAC) | 3002 | 完整RBAC角色权限 | 3 (⭐⭐) | PostgreSQL |
| 缓存服务 | 3011 | 键值缓存服务 | 4 (⭐⭐) | Redis |
| 多租户管理服务 | 3004 | 租户隔离管理 | 5 (⭐⭐⭐) | PostgreSQL |
| API网关服务 | 3000 | 路由转发和限流 | 6 (⭐⭐⭐) | Redis |
| 日志审计服务 | 3008 | 操作日志记录 | 7 (⭐⭐⭐) | PostgreSQL |
| 消息通知服务 | 3005 | 邮件通知发送 | 8 (⭐⭐⭐⭐) | PostgreSQL+Redis |
| 任务调度服务 | 3009 | Cron定时任务 | 9 (⭐⭐⭐⭐) | PostgreSQL+Redis |
| 文件存储服务 | 3006 | 文件上传下载 | 10 (⭐⭐⭐⭐) | S3+PostgreSQL |
| 消息队列服务 | 3010 | 异步消息处理 | 11 (⭐⭐⭐⭐) | Redis Streams |
| 监控告警服务 | 3007 | 基础指标监控 | 12 (⭐⭐⭐⭐⭐) | PostgreSQL+Prometheus |

## 统一数据模型

### 用户实体 (跨服务统一)
```typescript
interface User {
  id: string                    // UUID
  tenantId: string             // 租户ID
  username: string             // 用户名
  email: string                // 邮箱
  phone?: string               // 手机号
  firstName: string            // 名
  lastName: string             // 姓
  avatar?: string              // 头像URL
  status: 'active' | 'inactive' | 'suspended' | 'deleted'
  roles: string[]              // 角色列表
  permissions: string[]        // 权限列表
  lastLoginAt?: Date          // 最后登录时间
  createdAt: Date             // 创建时间
  updatedAt: Date             // 更新时间
}
```

### JWT Payload (认证服务与网关统一)
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

### 审计事件 (所有服务统一)
```typescript
interface AuditEvent {
  id: string                   // 事件ID
  tenantId: string            // 租户ID
  userId?: string             // 用户ID
  serviceId: string           // 服务ID
  eventType: string           // 事件类型
  resource: string            // 资源类型
  resourceId?: string         // 资源ID
  action: string              // 操作动作
  outcome: 'success' | 'failure' | 'partial'
  timestamp: Date             // 事件时间
  sourceIp: string            // 源IP
  userAgent?: string          // 用户代理
  requestId?: string          // 请求ID
  metadata: Record<string, any> // 元数据
  beforeData?: any            // 操作前数据
  afterData?: any             // 操作后数据
}
```

### 通知消息 (通知服务统一)
```typescript
interface NotificationMessage {
  id: string                   // 消息ID
  tenantId: string            // 租户ID
  recipientId: string         // 接收者ID
  recipientType: 'user' | 'group' | 'tenant'
  channel: 'email' | 'sms' | 'push' | 'websocket'
  templateId?: string         // 模板ID
  subject?: string            // 主题
  content: string             // 内容
  priority: 'low' | 'normal' | 'high' | 'urgent'
  scheduledAt?: Date          // 计划发送时间
  sentAt?: Date               // 实际发送时间
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  metadata: Record<string, any> // 元数据
}
```

### RBAC权限实体 (RBAC服务统一)
```typescript
interface Role {
  id: string                   // 角色ID
  tenantId: string            // 租户ID
  name: string                // 角色名称
  displayName: string         // 显示名称
  description: string         // 描述
  type: 'system' | 'tenant' | 'custom'
  level: number               // 角色层级
  parentRoleId?: string       // 父角色ID
  permissions: Permission[]   // 权限列表
  isActive: boolean           // 是否激活
  isBuiltIn: boolean          // 是否内置
  metadata: Record<string, any> // 元数据
  createdAt: Date            // 创建时间
  updatedAt: Date            // 更新时间
}

interface Permission {
  id: string                   // 权限ID
  tenantId?: string           // 租户ID (null为系统级)
  name: string                // 权限名称
  displayName: string         // 显示名称
  resource: string            // 资源类型
  action: string              // 操作类型
  scope: 'global' | 'tenant' | 'resource' | 'field'
  conditions?: PermissionCondition[] // 权限条件
  isActive: boolean           // 是否激活
  isBuiltIn: boolean          // 是否内置
  createdAt: Date            // 创建时间
  updatedAt: Date            // 更新时间
}

interface PermissionCondition {
  type: 'time_based' | 'location_based' | 'resource_based' | 'custom'
  operator: 'equals' | 'in' | 'not_in' | 'greater_than' | 'less_than'
  value: any                  // 条件值
  metadata?: Record<string, any> // 元数据
}

interface UserRole {
  id: string                   // 用户角色ID
  tenantId: string            // 租户ID
  userId: string              // 用户ID
  roleId: string              // 角色ID
  assignedBy: string          // 分配者ID
  validFrom?: Date            // 有效开始时间
  validUntil?: Date           // 有效结束时间
  isActive: boolean           // 是否激活
  metadata: Record<string, any> // 元数据
  createdAt: Date            // 创建时间
}

interface PermissionCheck {
  userId: string              // 用户ID
  tenantId: string           // 租户ID
  resource: string           // 资源类型
  action: string             // 操作类型
  resourceId?: string        // 资源ID
  context?: Record<string, any> // 上下文信息
}

interface PermissionResult {
  allowed: boolean            // 是否允许
  reason?: string            // 拒绝原因
  appliedRoles: string[]     // 应用的角色
  appliedPermissions: string[] // 应用的权限
  conditions?: Record<string, any> // 生效条件
  metadata?: Record<string, any> // 元数据
}
```

## 标准版本服务交互原则

### 🎯 标准版本核心原则
1. **服务松耦合**: 所有服务通过HTTP REST API通信，无直接依赖
2. **生产级调用**: 标准版本实现完整的服务间调用，支持100租户业务需求
3. **有状态设计**: 每个服务独立运行，但通过共享数据库保持数据一致性
4. **Docker Compose部署**: 使用Docker Compose管理所有服务，不使用K8S

### 📋 标准版本服务依赖关系
```
前端应用
    ↓
API网关 (3000) - Docker Compose
    ↓ (路由分发)
各个微服务 (独立容器)
    ↓
PostgreSQL + Redis (Docker Compose管理)
```

### ⚠️ 标准版本技术选型
- **使用Docker Compose**: 适合100租户+10万用户规模的部署方案
- **使用Redis Streams**: 替代Kafka，满足消息队列需求
- **使用PostgreSQL全文搜索**: 替代Elasticsearch，满足搜索需求
- **使用Prometheus+Grafana**: 基础监控，不需要复杂的可观测性栈
- **不使用K8S**: 避免过度复杂的容器编排

## 服务间调用接口

### 1. 认证服务 (3001) ↔ 用户服务 (3003)

#### 认证服务调用用户服务
```typescript
// 获取用户信息
GET http://user-management-service:3003/internal/users/{userId}
Headers: X-Service-Token: {内部服务令牌}

Response:
{
  "id": "string",
  "tenantId": "string",
  "username": "string",
  "email": "string",
  "status": "active",
  "roles": ["user"],
  "permissions": ["user:read"]
}

// 验证用户凭据
POST http://user-management-service:3003/internal/users/validate-credentials
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "email": "user@example.com",
  "password": "plaintext_password"
}

Response:
{
  "valid": true,
  "user": { /* User对象 */ }
}
```

#### 用户服务调用认证服务
```typescript
// 注销用户所有会话
POST http://auth-service:3001/internal/sessions/revoke-user
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "userId": "user_id",
  "reason": "user_deleted"
}
```

### 2. 所有服务 → 审计服务 (3008)

```typescript
// 记录审计事件
POST http://audit-service:3008/internal/events
Headers: X-Service-Token: {内部服务令牌}
Body: AuditEvent

// 批量记录审计事件
POST http://audit-service:3008/internal/events/batch
Headers: X-Service-Token: {内部服务令牌}
Body: AuditEvent[]
```

### 3. 所有服务 → 通知服务 (3005)

```typescript
// 发送通知
POST http://notification-service:3005/internal/notifications/send
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "recipientId": "user_id",
  "recipientType": "user",
  "channel": "email",
  "templateId": "welcome_email",
  "variables": {
    "username": "John Doe",
    "activationLink": "https://app.com/activate/token"
  }
}
```

### 4. 所有服务 → 文件存储服务 (3006)

```typescript
// 生成上传URL
POST http://file-storage-service:3006/internal/files/upload-url
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "tenantId": "tenant_id",
  "userId": "user_id",
  "fileName": "avatar.jpg",
  "contentType": "image/jpeg",
  "folder": "avatars"
}

Response:
{
  "uploadUrl": "https://signed-url",
  "fileId": "file_id",
  "expiresAt": "2024-01-01T10:00:00Z"
}
```

### 5. 网关服务 (3000) → 认证服务 (3001)

```typescript
// 验证令牌
POST http://auth-service:3001/internal/tokens/verify
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "token": "jwt_token"
}

Response:
{
  "valid": true,
  "payload": { /* JWTPayload */ },
  "user": { /* User对象 */ }
}
```

### 6. 租户服务 (3004) → 监控服务 (3007)

```typescript
// 记录资源使用
POST http://monitoring-service:3007/internal/metrics/usage
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "tenantId": "tenant_id",
  "resourceType": "api_calls",
  "value": 1000,
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### 7. 所有服务 → 权限管理服务 (3002)

#### 权限验证 (核心功能)
```typescript
// 检查用户权限
POST http://rbac-service:3002/internal/permissions/check
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "userId": "user_id",
  "tenantId": "tenant_id",
  "resource": "user",
  "action": "read",
  "resourceId": "target_user_id",
  "context": {
    "requestIp": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}

Response:
{
  "allowed": true,
  "reason": null,
  "appliedRoles": ["tenant_admin"],
  "appliedPermissions": ["user:read"],
  "conditions": {
    "validUntil": "2024-12-31T23:59:59Z"
  },
  "metadata": {
    "evaluationTime": 15,
    "cacheHit": false
  }
}

// 批量权限检查
POST http://rbac-service:3002/internal/permissions/check-batch
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "userId": "user_id",
  "tenantId": "tenant_id",
  "checks": [
    {
      "resource": "user",
      "action": "read",
      "resourceId": "user1"
    },
    {
      "resource": "user",
      "action": "write",
      "resourceId": "user2"
    }
  ]
}

Response:
{
  "results": [
    {
      "resource": "user",
      "action": "read",
      "resourceId": "user1",
      "allowed": true,
      "appliedRoles": ["tenant_admin"]
    },
    {
      "resource": "user",
      "action": "write",
      "resourceId": "user2",
      "allowed": false,
      "reason": "insufficient_permissions"
    }
  ]
}
```

#### 用户角色管理
```typescript
// 获取用户角色
GET http://rbac-service:3002/internal/users/{userId}/roles?tenantId={tenantId}
Headers: X-Service-Token: {内部服务令牌}

Response:
{
  "userId": "user_id",
  "tenantId": "tenant_id",
  "roles": [
    {
      "id": "role_id",
      "name": "tenant_admin",
      "displayName": "租户管理员",
      "level": 10,
      "validFrom": "2024-01-01T00:00:00Z",
      "validUntil": "2024-12-31T23:59:59Z",
      "isActive": true
    }
  ],
  "effectivePermissions": [
    {
      "name": "user:read",
      "resource": "user",
      "action": "read",
      "scope": "tenant"
    }
  ]
}

// 为用户分配角色
POST http://rbac-service:3002/internal/users/{userId}/roles
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "tenantId": "tenant_id",
  "roleId": "role_id",
  "assignedBy": "admin_user_id",
  "validFrom": "2024-01-01T00:00:00Z",
  "validUntil": "2024-12-31T23:59:59Z",
  "metadata": {
    "reason": "New employee onboarding"
  }
}

// 撤销用户角色
DELETE http://rbac-service:3002/internal/users/{userId}/roles/{roleId}
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "tenantId": "tenant_id",
  "reason": "Role no longer needed"
}
```

#### PostgreSQL RLS上下文设置
```typescript
// 设置数据库RLS上下文 (在每次数据库操作前调用)
POST http://rbac-service:3002/internal/rls/set-context
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "userId": "user_id",
  "tenantId": "tenant_id",
  "userRoles": ["tenant_admin", "user"],
  "sessionId": "session_id",
  "connectionId": "db_connection_id"
}

Response:
{
  "success": true,
  "context": {
    "app.current_tenant_id": "tenant_id",
    "app.current_user_id": "user_id",
    "app.current_user_roles": "tenant_admin,user"
  },
  "policies": {
    "appliedPolicies": [
      "tenant_isolation_policy",
      "user_data_policy"
    ]
  }
}

// 清除RLS上下文
POST http://rbac-service:3002/internal/rls/clear-context
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "connectionId": "db_connection_id"
}
```

### 8. 权限管理服务 (3002) → 其他服务

#### 用户信息查询
```typescript
// 查询用户基本信息
GET http://user-management-service:3003/internal/users/{userId}
Headers: X-Service-Token: {内部服务令牌}

// 验证用户状态
POST http://user-management-service:3003/internal/users/validate-status
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "userIds": ["user1", "user2"],
  "tenantId": "tenant_id"
}
```

#### 缓存服务调用
```typescript
// 缓存权限结果
POST http://cache-service:3011/internal/cache/set
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "key": "permission:user_id:tenant_id:resource:action",
  "value": { /* PermissionResult */ },
  "ttl": 300
}

// 获取缓存的权限结果
GET http://cache-service:3011/internal/cache/get/permission:user_id:tenant_id:resource:action
Headers: X-Service-Token: {内部服务令牌}
```

#### 审计日志记录
```typescript
// 记录权限决策审计
POST http://audit-service:3008/internal/events
Headers: X-Service-Token: {内部服务令牌}
Body:
{
  "tenantId": "tenant_id",
  "userId": "user_id",
  "serviceId": "rbac-service",
  "eventType": "permission_check",
  "resource": "user",
  "resourceId": "target_user_id",
  "action": "read",
  "outcome": "success",
  "timestamp": "2024-01-01T10:00:00Z",
  "sourceIp": "192.168.1.1",
  "metadata": {
    "appliedRoles": ["tenant_admin"],
    "appliedPermissions": ["user:read"],
    "evaluationTime": 15
  }
}
```

## 内部服务认证

### 服务间调用认证机制
```typescript
// 每个服务配置内部服务令牌
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN

// 请求头格式
Headers: {
  'X-Service-Token': INTERNAL_SERVICE_TOKEN,
  'X-Service-Name': 'user-management-service',
  'Content-Type': 'application/json'
}

// 验证中间件
@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = request.headers['x-service-token']
    const serviceName = request.headers['x-service-name']
    
    return this.validateInternalToken(token, serviceName)
  }
}
```

## 错误处理规范

### 统一错误响应格式
```typescript
interface ErrorResponse {
  error: {
    code: string              // 错误代码
    message: string           // 错误消息
    details?: any            // 错误详情
    requestId: string        // 请求ID
    timestamp: string        // 时间戳
    service: string          // 服务名称
  }
}

// 示例错误响应
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 12345 not found",
    "requestId": "req_123456789",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "user-management-service"
  }
}
```

### 常用错误代码
```typescript
enum ErrorCodes {
  // 通用错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 用户相关
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // 租户相关
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_QUOTA_EXCEEDED = 'TENANT_QUOTA_EXCEEDED',
  
  // 文件相关
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // RBAC权限相关
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  PERMISSION_NOT_FOUND = 'PERMISSION_NOT_FOUND',
  INVALID_ROLE_ASSIGNMENT = 'INVALID_ROLE_ASSIGNMENT',
  ROLE_HIERARCHY_CONFLICT = 'ROLE_HIERARCHY_CONFLICT',
  PERMISSION_CONDITION_FAILED = 'PERMISSION_CONDITION_FAILED'
}
```

## 配置管理

### MVP环境变量配置
```bash
# 服务配置
SERVICE_NAME=user-management-service
SERVICE_PORT=3003

# 基础设施 (MVP只需要这两个)
DATABASE_URL=postgresql://postgres:password@localhost:5432/platform_db
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# API网关地址 (MVP阶段服务不直接调用)
API_GATEWAY_URL=http://localhost:3000

# 可选：S3存储 (文件服务使用)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=platform-files
```

## 链路追踪

### OpenTelemetry 配置
```typescript
// 统一链路追踪头部
Headers: {
  'X-Trace-ID': 'trace_id',      // 链路ID
  'X-Span-ID': 'span_id',        // 当前span ID
  'X-Parent-Span-ID': 'parent_span_id', // 父span ID
  'X-Request-ID': 'request_id'    // 请求ID
}

// 传播链路信息
const propagateTraceHeaders = (incomingHeaders: any) => ({
  'X-Trace-ID': incomingHeaders['x-trace-id'],
  'X-Span-ID': generateSpanId(),
  'X-Parent-Span-ID': incomingHeaders['x-span-id'],
  'X-Request-ID': incomingHeaders['x-request-id']
})
```

## 健康检查

### 统一健康检查接口
```typescript
// 健康检查端点
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00Z",
  "service": "user-management-service",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "auth-service": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "memory": {
      "used": "512MB",
      "total": "1GB"
    },
    "connections": {
      "active": 45,
      "max": 100
    }
  }
}
```

## MVP服务发现

### 简化服务配置
```yaml
# docker-compose.yml 示例
services:
  user-service:
    image: platform/user-service:latest
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  auth-service:
    image: platform/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  # MVP阶段不使用Consul，直接使用Docker网络进行服务发现
```

## MVP总结

MVP版本的服务交互规范专注于快速实现和验证：
1. **简化架构**: 所有服务通过API网关通信，避免复杂的服务间调用
2. **最小依赖**: 只使用PostgreSQL和Redis，不引入复杂中间件
3. **快速部署**: 使用Docker Compose，无需服务发现和配置中心
4. **渐进升级**: 先实现功能，后期按需添加高级特性

这个MVP规范确保在4周内完成100租户、10万用户的平台搭建。