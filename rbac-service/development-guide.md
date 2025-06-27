# RBAC权限管理服务开发文档 - 标准版本

## 服务概述

RBAC（Role-Based Access Control）权限管理服务是微服务平台的权限控制核心，面向**100租户+10万用户**的企业级生产系统，负责角色管理、权限定义、用户角色绑定、多租户权限隔离等功能，结合PostgreSQL行级安全（RLS）提供企业级的数据安全保障。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户（每租户平均1000用户）
- **角色复杂度**: 支持多层级角色继承，动态权限分配
- **性能要求**: 权限检查<10ms，支持高并发权限验证
- **安全等级**: 企业级安全，支持细粒度权限控制
- **部署方式**: Docker Compose，无需Kubernetes

## 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (RLS支持) + Redis 7+ (权限缓存)
- **ORM**: Prisma ORM (支持RLS策略)
- **权限引擎**: CASL.js (客户端权限) + 自研服务端引擎
- **缓存策略**: Redis 多层缓存，权限热点数据缓存

### 核心特性
- **PostgreSQL RLS**: 行级安全数据隔离
- **零信任架构**: 数据库级权限验证
- **动态权限**: 基于条件的权限策略
- **权限继承**: 角色层级和权限继承
- **高性能缓存**: Redis权限缓存，支持10万用户并发

### 监控技术
- **日志**: Winston + Structured Logging
- **指标**: Prometheus + Custom Metrics
- **健康检查**: NestJS Health Check

## 完整功能列表

### 核心功能 (生产必需)
1. **角色管理系统** - 角色CRUD、层级管理、权限绑定、角色继承
2. **权限管理系统** - 权限定义、权限组、权限模板、条件权限
3. **用户角色绑定** - 用户角色分配、临时权限、权限委派、批量管理
4. **权限验证引擎** - 实时权限检查、缓存优化、性能监控
5. **多租户隔离** - 租户权限隔离、数据安全、跨租户权限

### 生产功能 (企业级)
6. **权限审计日志** - 权限变更记录、操作审计、合规追踪
7. **权限分析报告** - 权限使用统计、安全分析、异常检测
8. **权限模板系统** - 预定义角色模板、快速权限配置
9. **API权限控制** - 接口级权限、资源权限、操作权限
10. **权限同步机制** - 权限变更通知、缓存同步、一致性保证

### 高级功能 (企业增强)
11. **动态权限策略** - 基于时间、地理位置的动态权限
12. **权限工作流** - 权限申请、审批流程、自动化分配
13. **权限合规检查** - GDPR合规、权限最小化原则检查
14. **权限性能优化** - 权限预计算、智能缓存、性能调优

## API设计 (45个端点)

### 1. 角色管理 (12个端点)
```typescript
// 角色基础操作
POST   /api/v1/rbac/roles                     // 创建角色
GET    /api/v1/rbac/roles                     // 获取角色列表
GET    /api/v1/rbac/roles/{id}                // 获取角色详情
PUT    /api/v1/rbac/roles/{id}                // 更新角色
DELETE /api/v1/rbac/roles/{id}                // 删除角色
POST   /api/v1/rbac/roles/{id}/duplicate      // 复制角色

// 角色层级管理
GET    /api/v1/rbac/roles/{id}/hierarchy      // 获取角色层级
POST   /api/v1/rbac/roles/{id}/children       // 添加子角色
DELETE /api/v1/rbac/roles/{id}/children/{childId} // 移除子角色
GET    /api/v1/rbac/roles/{id}/effective-permissions // 获取有效权限

// 角色权限管理
POST   /api/v1/rbac/roles/{id}/permissions    // 分配权限
DELETE /api/v1/rbac/roles/{id}/permissions/{permissionId} // 移除权限
```

### 2. 权限管理 (10个端点)
```typescript
// 权限基础操作
POST   /api/v1/rbac/permissions               // 创建权限
GET    /api/v1/rbac/permissions               // 获取权限列表
GET    /api/v1/rbac/permissions/{id}          // 获取权限详情
PUT    /api/v1/rbac/permissions/{id}          // 更新权限
DELETE /api/v1/rbac/permissions/{id}          // 删除权限

// 权限组管理
POST   /api/v1/rbac/permission-groups         // 创建权限组
GET    /api/v1/rbac/permission-groups         // 获取权限组列表
POST   /api/v1/rbac/permission-templates      // 创建权限模板
GET    /api/v1/rbac/permission-templates      // 获取权限模板
POST   /api/v1/rbac/permissions/batch         // 批量权限操作
```

### 3. 用户角色管理 (12个端点)
```typescript
// 用户角色分配
POST   /api/v1/rbac/users/{userId}/roles      // 分配角色
GET    /api/v1/rbac/users/{userId}/roles      // 获取用户角色
DELETE /api/v1/rbac/users/{userId}/roles/{roleId} // 移除角色
PUT    /api/v1/rbac/users/{userId}/roles/{roleId} // 更新角色配置

// 批量用户管理
POST   /api/v1/rbac/users/batch/assign-roles // 批量分配角色
POST   /api/v1/rbac/users/batch/remove-roles // 批量移除角色
GET    /api/v1/rbac/users/by-role/{roleId}   // 获取角色下的用户

// 临时权限管理
POST   /api/v1/rbac/users/{userId}/temporary-permissions // 分配临时权限
GET    /api/v1/rbac/users/{userId}/temporary-permissions  // 获取临时权限
DELETE /api/v1/rbac/users/{userId}/temporary-permissions/{id} // 移除临时权限

// 权限委派
POST   /api/v1/rbac/users/{userId}/delegate   // 委派权限
GET    /api/v1/rbac/users/{userId}/delegations // 获取委派记录
```

### 4. 权限验证 (6个端点)
```typescript
// 权限检查
POST   /api/v1/rbac/check/permission          // 检查单个权限
POST   /api/v1/rbac/check/permissions         // 批量权限检查
POST   /api/v1/rbac/check/resource            // 检查资源权限
GET    /api/v1/rbac/users/{userId}/permissions // 获取用户所有权限
POST   /api/v1/rbac/validate/access           // 验证访问权限
GET    /api/v1/rbac/users/{userId}/accessible-resources // 获取可访问资源
```

### 5. 系统管理 (5个端点)
```typescript
// 系统管理
GET    /api/v1/rbac/health                    // 健康检查
GET    /api/v1/rbac/metrics                   // 性能指标
POST   /api/v1/rbac/cache/refresh             // 刷新缓存
GET    /api/v1/rbac/audit/logs                // 获取审计日志
GET    /api/v1/rbac/reports/permissions       // 权限分析报告
```

## 数据库设计

### 角色表 (roles)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 角色类型和层级
  type VARCHAR(20) DEFAULT 'custom', -- 'system', 'tenant', 'custom'
  level INTEGER DEFAULT 0,
  parent_role_id UUID REFERENCES roles(id),
  
  -- 状态管理
  is_active BOOLEAN DEFAULT TRUE,
  is_built_in BOOLEAN DEFAULT FALSE,
  
  -- 权限继承配置
  inheritance_type VARCHAR(20) DEFAULT 'full', -- 'full', 'partial', 'none'
  inheritance_conditions JSONB DEFAULT '{}',
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- 索引和约束
  UNIQUE(tenant_id, name),
  INDEX idx_roles_tenant_type (tenant_id, type),
  INDEX idx_roles_parent (parent_role_id),
  INDEX idx_roles_active (tenant_id, is_active)
);
```

### 权限表 (permissions)
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, -- NULL表示系统级权限
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 权限定义
  resource VARCHAR(100) NOT NULL, -- 'user', 'tenant', 'file', 'api'
  action VARCHAR(50) NOT NULL,    -- 'create', 'read', 'update', 'delete'
  scope VARCHAR(20) DEFAULT 'resource', -- 'global', 'tenant', 'resource', 'field'
  
  -- 权限条件
  conditions JSONB DEFAULT '[]',
  
  -- 状态管理
  is_active BOOLEAN DEFAULT TRUE,
  is_built_in BOOLEAN DEFAULT FALSE,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  category VARCHAR(50),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引和约束
  UNIQUE(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID), name),
  INDEX idx_permissions_resource_action (resource, action),
  INDEX idx_permissions_tenant_active (tenant_id, is_active),
  INDEX idx_permissions_scope (scope)
);
```

### 角色权限关联表 (role_permissions)
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- 权限配置
  granted BOOLEAN DEFAULT TRUE,
  conditions JSONB DEFAULT '{}',
  
  -- 时间和审计
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID NOT NULL,
  expires_at TIMESTAMP,
  
  -- 约束
  UNIQUE(role_id, permission_id),
  INDEX idx_role_permissions_role (role_id),
  INDEX idx_role_permissions_permission (permission_id),
  INDEX idx_role_permissions_tenant (tenant_id)
);
```

### 用户角色表 (user_roles)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- 分配信息
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- 状态和条件
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB DEFAULT '{}',
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  assignment_reason TEXT,
  
  -- 约束和索引
  UNIQUE(user_id, role_id, tenant_id),
  INDEX idx_user_roles_user_tenant (user_id, tenant_id),
  INDEX idx_user_roles_role (role_id),
  INDEX idx_user_roles_active (tenant_id, is_active)
);
```

### 临时权限表 (temporary_permissions)
```sql
CREATE TABLE temporary_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  permission_id UUID REFERENCES permissions(id),
  
  -- 临时权限配置
  reason TEXT NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  -- 状态
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMP,
  revoked_by UUID,
  revoke_reason TEXT,
  
  -- 使用统计
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- 索引
  INDEX idx_temp_permissions_user_tenant (user_id, tenant_id),
  INDEX idx_temp_permissions_expires (expires_at),
  INDEX idx_temp_permissions_active (is_active, expires_at)
);
```

### 权限审计表 (permission_audit_logs)
```sql
CREATE TABLE permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- 操作信息
  operation VARCHAR(50) NOT NULL, -- 'grant', 'revoke', 'check', 'deny'
  resource_type VARCHAR(50) NOT NULL, -- 'role', 'permission', 'user_role'
  resource_id UUID NOT NULL,
  
  -- 用户信息
  user_id UUID,
  performed_by UUID,
  
  -- 权限详情
  permission_name VARCHAR(100),
  role_name VARCHAR(100),
  
  -- 操作结果
  result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'denied'
  reason TEXT,
  
  -- 上下文信息
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  INDEX idx_audit_tenant_time (tenant_id, created_at),
  INDEX idx_audit_user_time (user_id, created_at),
  INDEX idx_audit_operation (operation, created_at),
  INDEX idx_audit_resource (resource_type, resource_id)
);
```

## Docker Compose配置

```yaml
# rbac-service 配置
rbac-service:
  build: ./rbac-service
  container_name: rbac-service
  ports:
    - "3002:3000"
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://postgres:password@postgres:5432/platform_rbac
    - REDIS_URL=redis://redis:6379/3
    - JWT_SECRET=${JWT_SECRET}
    - CACHE_TTL=300
    - MAX_ROLES_PER_USER=10
    - PERMISSION_CACHE_SIZE=10000
  depends_on:
    - postgres
    - redis
  volumes:
    - ./rbac-service/logs:/app/logs
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '1.0'
      reservations:
        memory: 256M
        cpus: '0.5'
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

## 性能优化配置

### Redis缓存策略
```typescript
// 权限缓存配置
export const RBAC_CACHE_CONFIG = {
  // 用户权限缓存 (1小时)
  userPermissions: {
    ttl: 3600,
    keyPattern: 'rbac:user:{userId}:permissions',
    maxSize: 50000 // 支持5万用户
  },
  
  // 角色权限缓存 (2小时)
  rolePermissions: {
    ttl: 7200,
    keyPattern: 'rbac:role:{roleId}:permissions',
    maxSize: 5000 // 支持5000个角色
  },
  
  // 权限检查结果缓存 (5分钟)
  permissionChecks: {
    ttl: 300,
    keyPattern: 'rbac:check:{userId}:{permission}:{resource}',
    maxSize: 100000 // 高频检查缓存
  }
};
```

### 数据库性能优化
```sql
-- 针对10万用户的索引优化
CREATE INDEX CONCURRENTLY idx_user_roles_performance 
ON user_roles (tenant_id, user_id, is_active) 
WHERE is_active = TRUE;

CREATE INDEX CONCURRENTLY idx_permissions_lookup 
ON permissions (tenant_id, resource, action, is_active) 
WHERE is_active = TRUE;

-- 分区表配置 (按租户分区)
CREATE TABLE permission_audit_logs_partitioned (
  LIKE permission_audit_logs INCLUDING ALL
) PARTITION BY HASH (tenant_id);

-- 创建16个分区支持100个租户
CREATE TABLE permission_audit_logs_p0 PARTITION OF permission_audit_logs_partitioned
FOR VALUES WITH (MODULUS 16, REMAINDER 0);
-- ... 创建其余15个分区
```

## 生产部署指南

### 1. 环境要求
- **CPU**: 1 Core (生产环境)
- **内存**: 512MB (生产环境)
- **存储**: 20GB (包含日志和缓存)
- **数据库**: PostgreSQL 15+ with RLS support
- **缓存**: Redis 7+ with persistence

### 2. 监控配置
```typescript
// 关键指标监控
export const RBAC_METRICS = {
  permissionCheckLatency: 'rbac_permission_check_duration_ms',
  cacheHitRate: 'rbac_cache_hit_rate',
  activeUsers: 'rbac_active_users_total',
  rolesPerUser: 'rbac_roles_per_user_avg',
  permissionDenials: 'rbac_permission_denials_total'
};
```

### 3. 安全配置
- 启用PostgreSQL RLS策略
- Redis AUTH认证
- JWT Token加密
- API访问限流
- 审计日志加密存储

这个RBAC服务设计支持100租户+10万用户的企业级权限管理，提供完整的角色权限控制、高性能缓存优化和生产级监控能力。