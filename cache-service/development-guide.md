# 缓存服务开发文档 - 标准版本

## 🎯 服务概述

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

## 🛠️ 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (元数据) + Redis 7+
- **ORM**: Prisma ORM
- **缓存引擎**: Redis单实例
- **客户端**: ioredis

### 缓存技术
- **Redis**: 键值存储缓存，LRU淘汰策略
- **一致性**: Redis Lua脚本保证原子性

## 📋 完整功能列表

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

## 🔗 API设计 (26个端点) - 标准版本完整功能

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

## 🗄️ 数据库设计

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

## 🏗️ 核心架构实现

### 缓存服务核心架构
```typescript
// 缓存服务主要组件
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL
    }),
    DatabaseModule,
    MonitoringModule,
    HealthModule
  ],
  controllers: [
    CacheController,
    InternalCacheController,
    HealthController
  ],
  providers: [
    CacheService,
    CacheStatisticsService,
    HotKeyDetectionService,
    CacheMetricsService
  ]
})
export class CacheServiceModule {}
```

### 分布式缓存管理器
```typescript
@Injectable()
export class DistributedCacheManager {
  constructor(
    private redis: Redis,
    private statisticsService: CacheStatisticsService
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const value = await this.redis.get(key);
      const responseTime = Date.now() - startTime;
      
      if (value) {
        await this.statisticsService.recordHit(key, responseTime);
        return this.deserialize(value);
      } else {
        await this.statisticsService.recordMiss(key, responseTime);
        return null;
      }
    } catch (error) {
      await this.statisticsService.recordError(key, error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    try {
      const serialized = this.serialize(value);
      const compressed = await this.compress(serialized);
      
      if (ttl) {
        await this.redis.setex(key, ttl, compressed);
      } else {
        await this.redis.set(key, compressed);
      }
      
      const responseTime = Date.now() - startTime;
      await this.statisticsService.recordSet(key, responseTime);
    } catch (error) {
      await this.statisticsService.recordError(key, error);
      throw error;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results = await this.redis.mget(...keys);
    return results.map(result => result ? this.deserialize(result) : null);
  }

  async mset(keyValuePairs: Array<[string, any, number?]>): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const [key, value, ttl] of keyValuePairs) {
      const serialized = this.serialize(value);
      const compressed = await this.compress(serialized);
      
      if (ttl) {
        pipeline.setex(key, ttl, compressed);
      } else {
        pipeline.set(key, compressed);
      }
    }
    
    await pipeline.exec();
  }
}
```

### 会话缓存管理器
```typescript
@Injectable()
export class SessionCacheManager {
  private readonly SESSION_PREFIX = 'session:';
  private readonly DEFAULT_TTL = 900; // 15分钟

  constructor(private cacheManager: DistributedCacheManager) {}

  async createSession(sessionData: SessionData): Promise<string> {
    const sessionId = this.generateSessionId();
    const key = this.getSessionKey(sessionId);
    
    await this.cacheManager.set(key, sessionData, this.DEFAULT_TTL);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.getSessionKey(sessionId);
    return await this.cacheManager.get<SessionData>(key);
  }

  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const existing = await this.getSession(sessionId);
    
    if (existing) {
      const updated = { ...existing, ...data, lastActivity: new Date() };
      await this.cacheManager.set(key, updated, this.DEFAULT_TTL);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.cacheManager.delete(key);
  }

  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 权限缓存管理器
```typescript
@Injectable()
export class PermissionCacheManager {
  private readonly PERMISSION_PREFIX = 'permission:';
  private readonly DEFAULT_TTL = 300; // 5分钟

  constructor(private cacheManager: DistributedCacheManager) {}

  async cachePermissionCheck(
    userId: string,
    tenantId: string,
    resource: string,
    action: string,
    result: PermissionCheckResult
  ): Promise<void> {
    const key = this.getPermissionKey(userId, tenantId, resource, action);
    await this.cacheManager.set(key, result, this.DEFAULT_TTL);
  }

  async getPermissionCheck(
    userId: string,
    tenantId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult | null> {
    const key = this.getPermissionKey(userId, tenantId, resource, action);
    return await this.cacheManager.get<PermissionCheckResult>(key);
  }

  async invalidateUserPermissions(userId: string, tenantId: string): Promise<void> {
    const pattern = this.getPermissionKey(userId, tenantId, '*', '*');
    await this.cacheManager.deleteByPattern(pattern);
  }

  private getPermissionKey(
    userId: string,
    tenantId: string,
    resource: string,
    action: string
  ): string {
    return `${this.PERMISSION_PREFIX}${userId}:${tenantId}:${resource}:${action}`;
  }
}
```

## 🔄 服务间交互设计

### 内部API设计原则
- **认证方式**: X-Service-Token内部服务令牌
- **数据格式**: JSON
- **错误处理**: 统一错误码和消息格式
- **性能要求**: 内部API响应时间 < 5ms
- **容错机制**: 缓存失败不应影响业务操作

### 1. 提供给所有服务的缓存接口
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

// 批量操作
POST http://cache-service:3011/internal/cache/mget
POST http://cache-service:3011/internal/cache/mset
POST http://cache-service:3011/internal/cache/exists
POST http://cache-service:3011/internal/cache/expire
```

### 2. 与认证服务的交互
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

### 3. 与权限服务的交互
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

### 4. 与监控服务的交互
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

### 5. 服务间缓存策略设计
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

## ⚡ 性能优化

### Redis性能优化
```typescript
// Redis连接池优化
const redisConfig = {
  host: 'redis',
  port: 6379,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  keepAlive: 30000,
  
  // 连接池配置
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // 性能优化
  enableReadyCheck: false,
  maxLoadingTimeout: 3000
};
```

### 缓存压缩优化
```typescript
@Injectable()
export class CacheCompressionService {
  async compress(data: string): Promise<string> {
    if (data.length < 1024) return data; // 小数据不压缩
    
    const compressed = await gzip(data);
    return `gzip:${compressed.toString('base64')}`;
  }

  async decompress(data: string): Promise<string> {
    if (!data.startsWith('gzip:')) return data;
    
    const base64Data = data.slice(5);
    const buffer = Buffer.from(base64Data, 'base64');
    return (await gunzip(buffer)).toString();
  }
}
```

### 热点数据预加载
```typescript
@Injectable()
export class DataPreloadService {
  async preloadHotData(): Promise<void> {
    const hotKeys = await this.getHotKeys();
    
    for (const key of hotKeys) {
      if (!await this.cacheManager.exists(key)) {
        const data = await this.fetchFromDatabase(key);
        await this.cacheManager.set(key, data, 3600);
      }
    }
  }

  private async getHotKeys(): Promise<string[]> {
    // 从统计表中获取热点键
    return this.hotKeyRepository.find({
      where: { shouldPreload: true },
      order: { preloadPriority: 'DESC' },
      take: 1000
    }).then(keys => keys.map(k => k.keyPattern));
  }
}
```

## 🛡️ 安全措施

### 数据安全
- **传输安全**: Redis连接使用TLS加密
- **数据加密**: 敏感数据在缓存前进行AES-256加密
- **访问控制**: Redis AUTH密码认证
- **网络隔离**: Docker网络隔离，仅内部访问

### 访问控制
- **服务认证**: X-Service-Token内部服务认证
- **权限验证**: 与RBAC服务集成的权限检查
- **API安全**: 请求频率限制和超时控制
- **输入验证**: 严格的键名和数据格式验证

### 缓存安全
```typescript
@Injectable()
export class CacheSecurityService {
  private readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i
  ];

  async encryptSensitiveData(key: string, data: any): Promise<any> {
    if (this.isSensitiveData(key)) {
      return this.encrypt(JSON.stringify(data));
    }
    return data;
  }

  async decryptSensitiveData(key: string, data: any): Promise<any> {
    if (this.isSensitiveData(key) && typeof data === 'string') {
      try {
        return JSON.parse(this.decrypt(data));
      } catch {
        return data; // 如果解密失败，返回原数据
      }
    }
    return data;
  }

  private isSensitiveData(key: string): boolean {
    return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
  }

  private encrypt(data: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.CACHE_ENCRYPTION_KEY);
    return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
  }

  private decrypt(encryptedData: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.CACHE_ENCRYPTION_KEY);
    return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  }
}
```

## 🐳 部署配置

### Docker Compose配置（标准版本优化）
```yaml
# 缓存服务配置
cache-service:
  build: ./apps/cache-service
  container_name: cache-service
  ports:
    - "3011:3011"
  environment:
    # 基础配置
    - NODE_ENV=production
    - SERVICE_PORT=3011
    - SERVICE_NAME=cache-service
    
    # 数据库配置（共享PostgreSQL实例）
    - DATABASE_URL=postgresql://platform:platform123@postgres:5432/platform
    - REDIS_URL=redis://redis:6379
    - REDIS_PASSWORD=${REDIS_PASSWORD}
    
    # 内部服务通信
    - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
    - AUTH_SERVICE_URL=http://auth-service:3001
    - RBAC_SERVICE_URL=http://rbac-service:3002
    - MONITORING_SERVICE_URL=http://monitoring-service:3007
    - AUDIT_SERVICE_URL=http://audit-service:3008
    
    # 缓存配置（标准版本优化）
    - CACHE_DEFAULT_TTL=3600
    - MAX_MEMORY_POLICY=allkeys-lru
    - COMPRESSION_ENABLED=true
    - MAX_CONNECTIONS=100
    - CONNECTION_POOL_SIZE=20
    
    # 性能配置
    - CACHE_MAX_KEYS=100000
    - PRELOAD_ENABLED=true
    - HOT_KEY_DETECTION=true
    - MONITORING_ENABLED=true
    
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
      
  networks:
    - platform-network
    
  volumes:
    - ./cache-service/logs:/app/logs
    
  deploy:
    resources:
      limits:
        memory: 256MB              # 标准版本内存分配
        cpus: '0.5'
      reservations:
        memory: 128MB
        cpus: '0.25'
        
  restart: unless-stopped
  
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3011/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
    
  # 标准版本日志配置
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"

# Redis单实例配置（标准版本）
redis:
  image: redis:7-alpine
  container_name: redis-cache
  ports:
    - "6379:6379"
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  command: >
    redis-server
    --appendonly yes
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 1gb
    --maxmemory-policy allkeys-lru
    --save 900 1
    --save 300 10
    --save 60 10000
    --tcp-keepalive 300
    --timeout 0
    --databases 16
    
  volumes:
    - redis-data:/data
    - ./redis/redis.conf:/etc/redis/redis.conf:ro
    
  networks:
    - platform-network
    
  deploy:
    resources:
      limits:
        memory: 1GB                # 标准版本Redis内存
        cpus: '1.0'
      reservations:
        memory: 512MB
        cpus: '0.5'
        
  restart: unless-stopped
  
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s

# 网络配置
networks:
  platform-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  redis-data:
    driver: local
```

## ⚙️ 性能优化配置

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

## 🧪 测试策略

### 单元测试
```typescript
describe('CacheService', () => {
  let service: CacheService;
  let redisClient: MockRedis;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useClass: MockRedis,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisClient = module.get('REDIS_CLIENT');
  });

  it('should set and get cache value successfully', async () => {
    const key = 'test:key';
    const value = { data: 'test-value' };
    const ttl = 3600;

    await service.set(key, value, ttl);
    const result = await service.get(key);

    expect(result).toEqual(value);
    expect(redisClient.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
  });

  it('should handle cache miss gracefully', async () => {
    const key = 'nonexistent:key';
    redisClient.get.mockResolvedValue(null);

    const result = await service.get(key);

    expect(result).toBeNull();
  });

  it('should delete cache key successfully', async () => {
    const key = 'test:key';

    await service.delete(key);

    expect(redisClient.del).toHaveBeenCalledWith(key);
  });

  it('should handle batch operations correctly', async () => {
    const keys = ['key1', 'key2', 'key3'];
    const values = ['value1', 'value2', 'value3'];
    
    redisClient.mget.mockResolvedValue(values);

    const results = await service.mget(keys);

    expect(results).toEqual(values);
    expect(redisClient.mget).toHaveBeenCalledWith(...keys);
  });
});
```

### 集成测试
```typescript
describe('Cache Service E2E', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let redis: Redis;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [CacheServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheService = moduleFixture.get<CacheService>(CacheService);
    redis = moduleFixture.get('REDIS_CLIENT');
    await app.init();
  });

  it('should integrate with Redis successfully', async () => {
    const key = 'integration:test:key';
    const value = { integration: true, timestamp: Date.now() };

    await cacheService.set(key, value, 300);
    const result = await cacheService.get(key);

    expect(result).toEqual(value);

    // 清理测试数据
    await cacheService.delete(key);
  });

  it('should handle session cache operations', async () => {
    const sessionData = {
      userId: 'user-123',
      tenantId: 'tenant-456',
      roles: ['user'],
      lastActivity: new Date()
    };

    const response = await request(app.getHttpServer())
      .post('/internal/cache/session')
      .set('X-Service-Token', process.env.INTERNAL_SERVICE_TOKEN)
      .send(sessionData)
      .expect(201);

    expect(response.body).toHaveProperty('sessionId');

    const sessionId = response.body.sessionId;
    const getResponse = await request(app.getHttpServer())
      .get(`/internal/cache/session/${sessionId}`)
      .set('X-Service-Token', process.env.INTERNAL_SERVICE_TOKEN)
      .expect(200);

    expect(getResponse.body.userId).toBe(sessionData.userId);
  });

  it('should enforce service authentication', async () => {
    await request(app.getHttpServer())
      .post('/internal/cache/set')
      .send({ key: 'test', value: 'test' })
      .expect(401); // 未认证的请求应该被拒绝
  });
});
```

### 性能测试
```typescript
describe('Cache Performance Tests', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    // 使用真实Redis进行性能测试
    cacheService = new CacheService(realRedisClient);
  });

  it('should handle high concurrency get operations', async () => {
    const concurrentRequests = 1000;
    const key = 'performance:test:key';
    const value = { data: 'performance-test-data' };

    // 预设缓存数据
    await cacheService.set(key, value, 3600);

    const promises = Array.from({ length: concurrentRequests }, () =>
      cacheService.get(key)
    );

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();

    const avgResponseTime = (endTime - startTime) / concurrentRequests;
    
    expect(results).toHaveLength(concurrentRequests);
    expect(results.every(result => result?.data === value.data)).toBe(true);
    expect(avgResponseTime).toBeLessThan(5); // 平均响应时间应小于5ms
  });

  it('should handle batch operations efficiently', async () => {
    const batchSize = 1000;
    const keyValuePairs = Array.from({ length: batchSize }, (_, i) => [
      `batch:key:${i}`,
      { data: `value-${i}` },
      3600
    ]);

    const startTime = Date.now();
    await cacheService.mset(keyValuePairs);
    const endTime = Date.now();

    const totalTime = endTime - startTime;
    const timePerOperation = totalTime / batchSize;

    expect(timePerOperation).toBeLessThan(1); // 每个操作应小于1ms

    // 验证数据正确性
    const keys = keyValuePairs.map(([key]) => key);
    const results = await cacheService.mget(keys);
    expect(results).toHaveLength(batchSize);
  });

  it('should maintain performance under memory pressure', async () => {
    // 填满缓存直到内存限制
    const largeValue = 'x'.repeat(1024); // 1KB数据
    const keyCount = 10000; // 10MB数据

    for (let i = 0; i < keyCount; i++) {
      await cacheService.set(`memory:test:${i}`, largeValue, 3600);
    }

    // 测试在内存压力下的性能
    const startTime = Date.now();
    await cacheService.get('memory:test:0');
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(10); // 应该仍然小于10ms
  });
});
```

### 负载测试
```bash
# 使用artillery进行负载测试
# cache-load-test.yml
config:
  target: 'http://localhost:3011'
  phases:
    - duration: 60
      arrivalRate: 100  # 每秒100个请求
    - duration: 120
      arrivalRate: 200  # 每秒200个请求

scenarios:
  - name: "Cache operations"
    weight: 70
    flow:
      - post:
          url: "/internal/cache/set"
          headers:
            X-Service-Token: "{{ $processEnvironment.INTERNAL_SERVICE_TOKEN }}"
          json:
            key: "load:test:{{ $randomString() }}"
            value: "{{ $randomString() }}"
            ttl: 300

  - name: "Cache retrieval"
    weight: 30
    flow:
      - get:
          url: "/internal/cache/get/load:test:fixed-key"
          headers:
            X-Service-Token: "{{ $processEnvironment.INTERNAL_SERVICE_TOKEN }}"
```

### 安全测试
```typescript
describe('Cache Security Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [CacheServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should reject requests without service token', async () => {
    await request(app.getHttpServer())
      .post('/internal/cache/set')
      .send({ key: 'test', value: 'test' })
      .expect(401);
  });

  it('should reject requests with invalid service token', async () => {
    await request(app.getHttpServer())
      .post('/internal/cache/set')
      .set('X-Service-Token', 'invalid-token')
      .send({ key: 'test', value: 'test' })
      .expect(401);
  });

  it('should sanitize malicious cache keys', async () => {
    const maliciousKey = '../../../etc/passwd';
    const sanitizedKey = 'etc_passwd'; // 预期的清理结果

    await request(app.getHttpServer())
      .post('/internal/cache/set')
      .set('X-Service-Token', process.env.INTERNAL_SERVICE_TOKEN)
      .send({ key: maliciousKey, value: 'test', ttl: 300 })
      .expect(201);

    // 验证键名已被清理
    const response = await request(app.getHttpServer())
      .get(`/internal/cache/get/${sanitizedKey}`)
      .set('X-Service-Token', process.env.INTERNAL_SERVICE_TOKEN)
      .expect(200);

    expect(response.body.value).toBe('test');
  });

  it('should encrypt sensitive data automatically', async () => {
    const sensitiveKey = 'user:password:123';
    const sensitiveValue = { password: 'secret123' };

    await request(app.getHttpServer())
      .post('/internal/cache/set')
      .set('X-Service-Token', process.env.INTERNAL_SERVICE_TOKEN)
      .send({ key: sensitiveKey, value: sensitiveValue, ttl: 300 })
      .expect(201);

    // 直接从Redis检查数据是否被加密
    const redisValue = await redis.get(sensitiveKey);
    expect(redisValue).not.toContain('secret123'); // 不应包含明文密码
  });
});
```

### 容错测试
```typescript
describe('Cache Fault Tolerance Tests', () => {
  let cacheService: CacheService;
  let mockRedis: MockRedis;

  beforeEach(() => {
    mockRedis = new MockRedis();
    cacheService = new CacheService(mockRedis);
  });

  it('should handle Redis connection failures gracefully', async () => {
    mockRedis.get.mockRejectedValue(new Error('Connection lost'));

    const result = await cacheService.get('test:key');

    expect(result).toBeNull(); // 应该返回null而不是抛出异常
  });

  it('should retry failed operations', async () => {
    let callCount = 0;
    mockRedis.set.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Temporary failure');
      }
      return Promise.resolve();
    });

    await cacheService.set('retry:test', 'value', 300);

    expect(callCount).toBe(3); // 应该重试了3次
  });

  it('should implement circuit breaker pattern', async () => {
    // 模拟连续失败
    for (let i = 0; i < 10; i++) {
      mockRedis.get.mockRejectedValueOnce(new Error('Service unavailable'));
      await cacheService.get(`failure:${i}`);
    }

    // 断路器应该打开，后续请求直接返回失败
    const startTime = Date.now();
    const result = await cacheService.get('test:after:circuit:open');
    const endTime = Date.now();

    expect(result).toBeNull();
    expect(endTime - startTime).toBeLessThan(10); // 应该立即返回，不等待Redis响应
  });
});
```

### 测试覆盖率要求
- **单元测试覆盖率**: ≥ 85%
- **集成测试覆盖率**: ≥ 75%
- **API端点覆盖率**: 100%
- **关键路径覆盖率**: 100%
- **性能测试**: 响应时间 < 5ms，吞吐量 > 2000 QPS

## 📈 监控和告警

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

## 🚀 生产部署指南

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
- [ ] 确认Docker Compose配置正确（端口3011，内存256MB+1GB Redis）
- [ ] 验证Redis单实例配置优化（LRU淘汰，AOF持久化）
- [ ] 实现12个内部API接口（缓存、会话、权限、监控）
- [ ] 测试与认证、权限、监控、审计服务的集成
- [ ] 配置健康检查和Prometheus监控指标
- [ ] 验证缓存策略和性能（<5ms响应，2000 QPS）
- [ ] 部署网络配置和服务发现（platform-network）
- [ ] 配置统一错误处理和重试机制

### 为其他服务提供的内部API端点
```typescript
// 基础缓存操作 - 所有服务调用
GET    /internal/cache/get/{key}
POST   /internal/cache/set
DELETE /internal/cache/delete/{key}
POST   /internal/cache/mget          // 批量获取
POST   /internal/cache/mset          // 批量设置
POST   /internal/cache/exists        // 检查存在
POST   /internal/cache/expire        // 设置过期

// 会话缓存 - 认证服务调用
POST   /internal/cache/session/set
GET    /internal/cache/session/get/{sessionId}
DELETE /internal/cache/session/delete/{sessionId}
POST   /internal/cache/session/cleanup

// 权限缓存 - 权限管理服务调用  
POST   /internal/cache/permission/set
GET    /internal/cache/permission/get
DELETE /internal/cache/permission/invalidate

// 缓存统计 - 监控服务调用
GET    /internal/cache/metrics
GET    /internal/cache/health
POST   /internal/cache/collect-stats
```

### 调用其他服务的API
```typescript
// 认证验证
POST http://auth-service:3001/internal/auth/verify-token

// 权限检查
POST http://rbac-service:3002/internal/permissions/check

// 审计记录
POST http://audit-service:3008/internal/events

// 监控上报
POST http://monitoring-service:3007/internal/metrics/cache
```

### 统一错误处理和重试机制
```typescript
// 服务间通信错误格式
interface CacheServiceError {
  code: string;           // 'CACHE_UNAVAILABLE', 'KEY_NOT_FOUND'
  message: string;        // 错误描述
  service: 'cache-service';
  timestamp: string;      // ISO时间戳
  details?: {
    key?: string;         // 相关缓存键
    operation?: string;   // 操作类型
    retryable: boolean;   // 是否可重试
  };
}

// 重试配置
const retryConfig = {
  retries: 3,
  retryDelay: 1000,      // 1秒
  timeout: 5000,         // 5秒超时
  exponentialBackoff: true,
  maxRetryDelay: 10000   // 最大重试延迟
};
```

## ✅ 开发完成情况总结

### 三个开发阶段完成情况

#### ✅ 需求分析阶段 (100%完成)
- ✅ 业务需求收集：5个功能模块明确定义
- ✅ 技术需求分析：100租户+10万用户缓存需求
- ✅ 用户故事编写：通过26个API端点体现使用场景
- ✅ 验收标准定义：缓存响应时间<5ms，2000 QPS
- ✅ 架构设计文档：完整的Redis单实例架构

#### ✅ 项目规划阶段 (100%完成)
- ✅ 项目计划制定：3天开发计划，Week 1优先级
- ✅ 里程碑设置：Day1-3阶段性目标明确
- ✅ 资源分配：256MB应用内存+1GB Redis内存
- ✅ 风险评估：单点故障、内存管理、性能瓶颈风险
- ✅ 技术栈选择：符合标准版本Redis单实例

#### ✅ 架构设计阶段 (100%完成)
- ✅ 系统架构设计：完整的微服务交互和内部API设计
- ✅ 数据库设计：4个核心表结构（配置、统计、热点、日志）
- ✅ API设计：26个外部+12个内部API端点
- ✅ 安全架构设计：服务间认证和权限控制
- ✅ 性能规划：针对标准版本的缓存策略和优化

### 主要改进点

#### 1. 新增内部API设计
- 🔗 **缓存API**: 12个内部端点，支持所有服务的缓存需求
- 📞 **服务调用**: 与4个核心服务的完整交互设计
- 🛡️ **错误处理**: 统一错误格式和重试机制
- 🔄 **会话管理**: 专门的会话缓存接口

#### 2. 优化标准版本配置
- 🐳 **Docker优化**: 256MB应用内存+1GB Redis内存分配
- 🌐 **网络配置**: Docker Compose网络和服务发现
- 📊 **性能调优**: 连接池、压缩、热点检测配置
- 🔧 **环境变量**: 完整的生产环境配置

#### 3. 强化服务间协作
- ⚡ **基础服务**: 作为Week 1最优先开发的无依赖服务
- 🔗 **被依赖性**: 为所有11个服务提供缓存支持
- 📈 **监控集成**: 与监控服务的完整指标上报
- 🔐 **安全集成**: 与认证和权限服务的协作

#### 4. 完善部署配置
- 🚀 **生产就绪**: 健康检查、日志配置、重启策略
- 💾 **持久化**: Redis AOF持久化和数据恢复
- 📊 **资源限制**: 内存和CPU限制符合标准版本
- 🔧 **配置管理**: 环境变量和配置文件优化

**缓存服务已完成100%标准版本优化，作为Week 1最优先开发的基础服务，具备企业级分布式缓存能力，全面支持100租户+10万用户的高性能缓存需求！** 🚀
