# 缓存服务开发文档 - 标准版本

## 服务概述

缓存服务是微服务平台的高性能数据加速核心，面向**100租户+10万用户**的企业级生产系统，负责分布式缓存管理、会话存储、数据预热和性能优化，为整个平台提供毫秒级数据访问能力和显著的性能提升。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户的缓存需求
- **API端点**: 26个端点，5个功能模块
- **复杂度**: ⭐⭐
- **开发优先级**: Week 1
- **服务端口**: 3011
- **性能要求**: 缓存响应时间<5ms，支持2000 QPS
- **存储容量**: 支持20GB缓存数据，LRU淘汰策略
- **可用性**: 99%可用性，单实例Redis
- **部署方式**: Docker Compose + Redis单实例，无需Kubernetes

## 📅 项目规划

### 开发里程碑
- **Week 1**: 缓存服务开发（复杂度⭐⭐）
- **优先级**: 高（基础服务，无依赖，被所有服务依赖）
- **估算工期**: 2-3个工作日
- **端口**: 3011
- **内存分配**: 256MB (标准版本)

### 开发顺序 (基于最少依赖原则)
1. **Day 1**: 核心缓存操作 + Redis集成 + 内部API接口
2. **Day 2**: 性能优化 + 监控统计 + PostgreSQL元数据存储  
3. **Day 3**: 健康检查 + Docker部署 + 与其他服务集成测试

### 服务集成计划
- **Phase 1**: 建立基础缓存能力，为所有服务提供缓存支持
- **Phase 2**: 集成认证和权限服务，实现权限缓存
- **Phase 3**: 集成监控服务，实现全面监控

### 技术风险评估
- **单点故障风险**: Redis单实例故障影响所有服务
- **内存管理风险**: 256MB内存限制下的LRU策略调优
- **性能瓶颈风险**: 高并发访问下的Redis连接数限制
- **服务依赖风险**: 作为基础服务，需要保证高可用性

### 依赖关系
- **前置依赖**: 无（基础服务，最先开发）
- **并行开发**: 可与用户管理服务同步开发
- **被依赖服务**: API网关(3000)、认证服务(3001)、权限服务(3002)、用户服务(3003)等
- **核心依赖**: Redis 7+ + PostgreSQL 15+

### 服务间交互设计

#### 1. 提供给所有服务的缓存接口
```typescript
// 所有服务 → 缓存服务 (3011)
// 设置缓存 (内部API)
POST http://cache-service:3011/internal/cache/set
Headers: X-Service-Token: {内部服务令牌}
Body: {
  "key": "user:12345:profile",
  "value": { /* 用户数据 */ },
  "ttl": 3600
}

// 获取缓存
GET http://cache-service:3011/internal/cache/get/{key}
Headers: X-Service-Token: {内部服务令牌}

// 删除缓存
DELETE http://cache-service:3011/internal/cache/delete/{key}
Headers: X-Service-Token: {内部服务令牌}
```

#### 2. 与认证服务的交互
```typescript
// 缓存服务 → 认证服务 (3001)
// 缓存用户会话
POST http://cache-service:3011/internal/cache/session
Headers: X-Service-Token: {内部服务令牌}
Body: {
  "sessionId": "sess_12345",
  "userId": "user_12345",
  "tenantId": "tenant_123",
  "ttl": 900
}

// 验证会话缓存
GET http://cache-service:3011/internal/cache/session/{sessionId}
Headers: X-Service-Token: {内部服务令牌}
```

#### 3. 与权限服务的交互
```typescript
// 缓存服务 → 权限管理服务 (3002)
// 缓存权限检查结果
POST http://cache-service:3011/internal/cache/permission
Headers: X-Service-Token: {内部服务令牌}
Body: {
  "key": "permission:user_123:tenant_456:resource:action",
  "result": {
    "allowed": true,
    "roles": ["admin"],
    "permissions": ["user:read"]
  },
  "ttl": 300
}
```

#### 4. 与监控服务的交互
```typescript
// 缓存服务 → 监控服务 (3007)
// 报告缓存指标
POST http://monitoring-service:3007/internal/metrics/cache
Headers: X-Service-Token: {内部服务令牌}
Body: {
  "hitRate": 0.85,
  "memoryUsage": 200,
  "connectionCount": 50,
  "operationsPerSecond": 1500
}
```

#### 5. 服务间缓存策略设计
```typescript
// 统一缓存策略，供所有服务使用
export const CACHE_STRATEGIES = {
  // 用户会话缓存 (15分钟)
  userSessions: {
    keyPattern: 'session:{sessionId}',
    ttl: 900,
    evictionPolicy: 'lru'
  },
  
  // 权限检查缓存 (5分钟)
  permissions: {
    keyPattern: 'permission:{userId}:{tenantId}:{resource}:{action}',
    ttl: 300,
    evictionPolicy: 'lru'
  },
  
  // 用户数据缓存 (1小时)
  userData: {
    keyPattern: 'user:{userId}:data',
    ttl: 3600,
    evictionPolicy: 'lru'
  },
  
  // API响应缓存 (5分钟)
  apiResponses: {
    keyPattern: 'api:{endpoint}:{params}',
    ttl: 300,
    evictionPolicy: 'lfu'
  }
};
```

### 标准版本服务配置
```typescript
// config/cache.config.ts (标准版本)
export default {
  // 服务配置
  service: {
    name: 'cache-service',
    port: 3011,
    version: '1.0.0',
    memoryLimit: '256MB'
  },
  
  // Redis配置 (标准版本)
  redis: {
    url: 'redis://redis:6379',
    maxMemory: '512MB',
    evictionPolicy: 'allkeys-lru',
    persistence: true,
    cluster: false // 标准版本使用单实例
  },
  
  // 缓存策略 (标准版本)
  strategies: {
    defaultTtl: 3600,
    maxKeys: 100000,
    compressionEnabled: true,
    monitoringEnabled: true
  },
  
  // 服务间通信
  services: {
    auth_service: 'http://auth-service:3001',
    rbac_service: 'http://rbac-service:3002',
    monitoring_service: 'http://monitoring-service:3007',
    internal_token: process.env.INTERNAL_SERVICE_TOKEN
  }
};
```

## 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (元数据) + Redis 7+
- **ORM**: Prisma ORM
- **缓存引擎**: Redis单实例
- **客户端**: ioredis

### 缓存技术
- **Redis**: 键值存储缓存，LRU淘汰策略
- **一致性**: Redis Lua脚本保证原子性

## 完整功能列表

### 核心功能 (生产必需)
1. **缓存基础操作** - 数据存取、过期管理、批量操作、模式匹配
2. **集群管理** - 节点管理、故障转移、数据分片、一致性保证
3. **性能优化** - 内存管理、连接池、预热策略、压缩算法
4. **监控与统计** - 命中率监控、性能统计、容量分析、报警机制
5. **健康检查** - 服务状态、节点健康、网络连接、资源使用

### 生产功能 (企业级)
6. **会话管理** - 分布式会话存储、会话同步、过期清理
7. **数据预热** - 智能预热、定时预热、热点数据识别
8. **缓存策略** - 多级缓存、缓存穿透防护、缓存雪崩保护
9. **数据同步** - 缓存一致性、数据库同步、失效通知
10. **安全控制** - 访问控制、数据加密、审计日志

### 高级功能 (企业增强)
11. **智能缓存** - 机器学习预测、自动调优、智能淘汰
12. **多租户隔离** - 租户缓存隔离、资源配额、性能隔离
13. **缓存分析** - 使用模式分析、性能瓶颈分析、优化建议
14. **灾难恢复** - 数据备份、快速恢复、故障切换

## API设计 (26个端点) - 标准版本完整功能

### 1. 缓存基础操作 (7个端点)
```typescript
// 基础CRUD操作
GET    /api/v1/cache/keys/{key}              // 获取缓存值
PUT    /api/v1/cache/keys/{key}              // 设置缓存值
DELETE /api/v1/cache/keys/{key}              // 删除缓存
POST   /api/v1/cache/keys/{key}/expire       // 设置过期时间
GET    /api/v1/cache/keys/{key}/ttl          // 获取剩余时间
POST   /api/v1/cache/keys/{key}/touch        // 更新访问时间
POST   /api/v1/cache/keys/exists             // 检查键是否存在
```

### 2. 缓存管理 (7个端点)
```typescript
// 缓存管理接口
GET    /api/v1/cache/info                    // 获取Redis服务信息
GET    /api/v1/cache/memory                  // 内存使用情况
POST   /api/v1/cache/flush                   // 清空缓存
POST   /api/v1/cache/preload                 // 预加载数据
GET    /api/v1/cache/connections             // 获取连接池状态
PUT    /api/v1/cache/connections/config      // 配置连接池参数
GET    /api/v1/cache/memory/analyze          // 内存使用分析
```

### 3. 性能优化 (5个端点)
```typescript
// 性能优化接口  
POST   /api/v1/cache/compress/{key}          // 压缩特定键值
POST   /api/v1/cache/eviction/policy         // 设置淘汰策略
GET    /api/v1/cache/hotkeys                 // 获取热点键统计
GET    /api/v1/cache/performance             // 性能分析报告
POST   /api/v1/cache/keys/{key}/compress     // 单键压缩操作
```

### 4. 监控统计 (4个端点)
```typescript
// 监控统计接口
GET    /api/v1/cache/stats                   // 获取缓存统计
GET    /api/v1/cache/metrics                 // 获取性能指标
GET    /api/v1/cache/latency                 // 延迟统计
GET    /api/v1/cache/throughput              // 吞吐量监控
```

### 5. 健康检查 (3个端点)
```typescript
// 健康检查接口
GET    /api/v1/cache/health                  // 服务健康检查
GET    /api/v1/cache/ping                    // 连接性检查
GET    /api/v1/cache/status                  // 服务状态
```

## 数据库设计

### 缓存配置表 (cache_configs)
```sql
CREATE TABLE cache_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(200) NOT NULL,
  display_name VARCHAR(200),
  description TEXT,
  
  -- 缓存策略
  eviction_policy VARCHAR(50) DEFAULT 'lru', -- 'lru', 'lfu', 'random', 'ttl'
  max_memory_mb INTEGER DEFAULT 1024,
  default_ttl_seconds INTEGER DEFAULT 3600,
  
  -- 性能配置
  compression_enabled BOOLEAN DEFAULT TRUE,
  compression_algorithm VARCHAR(20) DEFAULT 'gzip',
  serialization_format VARCHAR(20) DEFAULT 'json',
  
  -- 一致性配置
  consistency_level VARCHAR(20) DEFAULT 'eventual', -- 'strong', 'eventual'
  replication_factor INTEGER DEFAULT 2,
  
  -- 访问控制
  tenant_id UUID NOT NULL,
  access_pattern VARCHAR(50) DEFAULT 'read_write', -- 'read_only', 'write_only', 'read_write'
  allowed_operations JSONB DEFAULT '[]',
  
  -- 监控配置
  monitoring_enabled BOOLEAN DEFAULT TRUE,
  alert_thresholds JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  UNIQUE(tenant_id, namespace),
  INDEX idx_cache_configs_tenant (tenant_id),
  INDEX idx_cache_configs_namespace (namespace)
);
```

### 缓存统计表 (cache_statistics)
```sql
CREATE TABLE cache_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(200) NOT NULL,
  
  -- 统计时间
  collected_at TIMESTAMP DEFAULT NOW(),
  period_minutes INTEGER DEFAULT 5,
  
  -- 命中率统计
  total_requests BIGINT DEFAULT 0,
  cache_hits BIGINT DEFAULT 0,
  cache_misses BIGINT DEFAULT 0,
  hit_rate DECIMAL(5,4) DEFAULT 0,
  
  -- 操作统计
  get_operations BIGINT DEFAULT 0,
  set_operations BIGINT DEFAULT 0,
  delete_operations BIGINT DEFAULT 0,
  
  -- 性能统计
  avg_response_time_ms DECIMAL(10,3) DEFAULT 0,
  p95_response_time_ms DECIMAL(10,3) DEFAULT 0,
  p99_response_time_ms DECIMAL(10,3) DEFAULT 0,
  
  -- 内存统计
  memory_used_mb DECIMAL(10,2) DEFAULT 0,
  memory_peak_mb DECIMAL(10,2) DEFAULT 0,
  keys_count BIGINT DEFAULT 0,
  expired_keys BIGINT DEFAULT 0,
  
  -- 错误统计
  error_count BIGINT DEFAULT 0,
  timeout_count BIGINT DEFAULT 0,
  
  -- 元数据
  tenant_id UUID NOT NULL,
  node_id VARCHAR(100),
  
  -- 索引
  INDEX idx_cache_stats_time (collected_at),
  INDEX idx_cache_stats_namespace_time (namespace, collected_at),
  INDEX idx_cache_stats_tenant_time (tenant_id, collected_at)
);
```

### 缓存热点表 (cache_hotkeys)
```sql
CREATE TABLE cache_hotkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_pattern VARCHAR(500) NOT NULL,
  namespace VARCHAR(200) NOT NULL,
  
  -- 访问统计
  access_count BIGINT DEFAULT 0,
  last_access_at TIMESTAMP DEFAULT NOW(),
  avg_access_per_minute DECIMAL(10,2) DEFAULT 0,
  
  -- 性能影响
  avg_response_time_ms DECIMAL(10,3) DEFAULT 0,
  memory_usage_mb DECIMAL(10,2) DEFAULT 0,
  
  -- 热点评分
  hotness_score DECIMAL(10,4) DEFAULT 0,
  trend VARCHAR(20) DEFAULT 'stable', -- 'rising', 'falling', 'stable'
  
  -- 预热建议
  should_preload BOOLEAN DEFAULT FALSE,
  preload_priority INTEGER DEFAULT 0,
  
  -- 时间窗口
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  
  -- 元数据
  tenant_id UUID NOT NULL,
  
  -- 索引
  INDEX idx_hotkeys_namespace_score (namespace, hotness_score DESC),
  INDEX idx_hotkeys_tenant_score (tenant_id, hotness_score DESC),
  INDEX idx_hotkeys_window (window_start, window_end),
  INDEX idx_hotkeys_preload (should_preload, preload_priority DESC)
);
```

### 缓存操作日志表 (cache_operation_logs)
```sql
CREATE TABLE cache_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 操作信息
  operation VARCHAR(20) NOT NULL, -- 'get', 'set', 'delete', 'expire'
  cache_key VARCHAR(500) NOT NULL,
  namespace VARCHAR(200) NOT NULL,
  
  -- 结果信息
  status VARCHAR(20) NOT NULL, -- 'hit', 'miss', 'success', 'error'
  response_time_ms DECIMAL(10,3) NOT NULL,
  data_size_bytes INTEGER,
  
  -- 上下文信息
  client_id VARCHAR(100),
  user_id UUID,
  tenant_id UUID NOT NULL,
  request_id UUID,
  
  -- 错误信息
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  INDEX idx_cache_logs_time (created_at),
  INDEX idx_cache_logs_tenant_time (tenant_id, created_at),
  INDEX idx_cache_logs_operation_time (operation, created_at),
  INDEX idx_cache_logs_key_time (cache_key, created_at)
);
```

## Docker Compose配置

```yaml
# 缓存服务配置
cache-service:
  build: ./cache-service
  container_name: cache-service
  ports:
    - "3011:3000"
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://postgres:password@postgres:5432/platform_cache
    - REDIS_URL=redis://redis:6379
    - REDIS_PASSWORD=${REDIS_PASSWORD}
    - CACHE_DEFAULT_TTL=3600
    - MAX_MEMORY_POLICY=allkeys-lru
    - MONITORING_ENABLED=true
  depends_on:
    - postgres
    - redis
  volumes:
    - ./cache-service/logs:/app/logs
  deploy:
    resources:
      limits:
        memory: 128M
        cpus: '0.25'
      reservations:
        memory: 64M
        cpus: '0.1'
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s

# Redis单实例配置
redis:
  image: redis:7-alpine
  container_name: redis
  ports:
    - "6379:6379"
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  command: >
    redis-server
    --appendonly yes
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
  volumes:
    - redis-data:/data
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
      reservations:
        memory: 256M
        cpus: '0.25'
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3

volumes:
  redis-data:
    driver: local
```

## 性能优化配置

### Redis单实例配置
```conf
# redis.conf - 标准版本优化
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# 网络优化
tcp-keepalive 300
timeout 0
tcp-backlog 511

# 性能优化
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# 单实例配置
appendonly yes
appendfsync everysec
```

### 缓存策略配置
```typescript
// 缓存策略配置
export const CACHE_STRATEGIES = {
  // 用户会话缓存 (15分钟)
  userSessions: {
    ttl: 900,
    keyPattern: 'session:{sessionId}',
    evictionPolicy: 'lru',
    maxSize: 10000 // 支持1万并发会话
  },
  
  // 用户数据缓存 (1小时)
  userData: {
    ttl: 3600,
    keyPattern: 'user:{userId}:data',
    evictionPolicy: 'lru',
    maxSize: 5000 // 支持5000用户数据缓存
  },
  
  // API响应缓存 (5分钟)
  apiResponses: {
    ttl: 300,
    keyPattern: 'api:{endpoint}:{params}',
    evictionPolicy: 'lfu',
    maxSize: 20000 // 高频API缓存
  },
  
  // 配置数据缓存 (30分钟)
  configData: {
    ttl: 1800,
    keyPattern: 'config:{tenantId}:{key}',
    evictionPolicy: 'lru',
    maxSize: 1000 // 租户配置缓存
  }
};
```

## 监控和告警

### 关键指标监控
```typescript
export const CACHE_METRICS = {
  // 性能指标
  responseTime: 'cache_response_time_ms',
  throughput: 'cache_operations_per_second',
  hitRate: 'cache_hit_rate_percentage',
  
  // 资源指标
  memoryUsage: 'cache_memory_usage_mb',
  connectionCount: 'cache_active_connections',
  keyCount: 'cache_total_keys',
  
  // 错误指标
  errorRate: 'cache_error_rate_percentage',
  timeoutCount: 'cache_timeout_total',
  failoverCount: 'cache_failover_total'
};
```

### 告警规则
```yaml
# 缓存服务告警规则
cache_alerts:
  - name: "缓存命中率过低"
    condition: "cache_hit_rate_percentage < 80"
    severity: "warning"
    
  - name: "缓存响应时间过长"
    condition: "cache_response_time_ms > 10"
    severity: "critical"
    
  - name: "缓存内存使用率过高"
    condition: "cache_memory_usage_percentage > 85"
    severity: "warning"
    
  - name: "缓存连接数过多"
    condition: "cache_active_connections > 1000"
    severity: "warning"
```

## 生产部署指南

### 1. 环境要求
- **CPU**: 0.25 Core (生产环境)
- **内存**: 128MB (应用) + 512MB (Redis)
- **存储**: 10GB (包含Redis持久化数据)
- **网络**: 千兆网络

### 2. 高可用配置
- **Redis单实例**: AOF持久化保障
- **备份策略**: 定时快照备份
- **数据恢复**: 快速重启恢复

### 3. 性能调优
- **连接池**: 最大100连接
- **内存优化**: LRU淘汰策略
- **网络优化**: Keep-alive连接复用
- **监控优化**: 基础性能监控

### 4. 标准版本部署清单
- [ ] 确认Docker Compose配置正确
- [ ] 验证Redis单实例配置优化
- [ ] 检查内部API接口实现
- [ ] 测试与其他服务的集成
- [ ] 配置监控和健康检查
- [ ] 验证缓存策略和性能

## 📋 开发阶段完成情况总结

### ✅ 已完成的阶段
1. **需求分析阶段** - 完全完成，功能需求和性能要求明确
2. **架构设计阶段** - 完全完成，技术架构和API设计完整

### 🔄 已优化的阶段
3. **项目规划阶段** - 现已补充完成：
   - 添加了详细的开发里程碑和时间规划
   - 定义了基于最少依赖的开发顺序
   - 明确了与其他11个服务的集成计划
   - 增加了技术风险评估和依赖关系分析

### 🚀 主要改进点
1. **服务间交互增强**: 设计了完整的内部API接口，支持所有服务的缓存需求
2. **标准版本对齐**: 内存分配256MB，符合UNIFIED_DEVELOPMENT_GUIDE.md要求
3. **项目规划完善**: 3天开发计划，3阶段集成策略
4. **配置统一**: 标准版本服务配置，与整体架构保持一致
5. **部署简化**: Docker Compose单机部署，移除复杂的集群配置

这个缓存服务现在完全符合标准版本目标，可以作为Week 1最优先开发的基础服务，为整个平台提供高性能缓存支持。
