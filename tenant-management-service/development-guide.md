# 多租户管理服务开发文档 - 标准版本

## 服务概述

多租户管理服务是微服务平台的资源隔离核心，面向**100租户+10万用户**的企业级生产系统，负责租户的创建、配置、资源分配、计费管理等功能，实现真正的多租户SaaS架构。

### 🎯 标准版本定位
- **租户规模**: 支持100个企业级租户，每租户平均1000用户
- **资源管理**: 智能配额管理，动态资源分配
- **计费能力**: 完整的计费系统，支持多种计费模式
- **隔离等级**: 数据库级隔离，确保租户数据安全
- **部署方式**: Docker Compose，支持租户独立部署

## 技术栈 (标准版本优化)

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (租户元数据+全文搜索+时序数据)
- **缓存/队列**: Redis 7+ (配置缓存+会话+消息队列)
- **ORM**: Prisma ORM (类型安全数据库访问)
- **消息队列**: Redis Streams (替代Kafka)
- **计费**: Stripe API + 自定义计费引擎
- **配置管理**: Redis + 环境变量
- **监控**: Prometheus + Grafana集成

### 标准版本移除组件
- ❌ Consul/etcd → ✅ Redis配置存储
- ❌ Kubernetes → ✅ Docker Compose
- ❌ Kafka → ✅ Redis Streams
- ❌ Elasticsearch → ✅ PostgreSQL全文搜索

### 架构模式 (标准版本)
- **数据隔离**: Shared Database + Row Level Security (适合100租户)
- **应用隔离**: Shared Container + 租户上下文隔离
- **网络隔离**: Docker Compose网络 + 服务发现
- **存储隔离**: 逻辑隔离 + PostgreSQL RLS权限控制
- **服务通信**: 通过API网关(3000) + 内部API(/internal/*)
- **部署方式**: Docker Compose单机或8GB内存小集群

## 核心功能模块

### 1. 租户管理模块
```typescript
// 租户CRUD操作
POST   /api/v1/tenants           // 创建租户
GET    /api/v1/tenants           // 获取租户列表
GET    /api/v1/tenants/{id}      // 获取租户详情
PUT    /api/v1/tenants/{id}      // 更新租户信息
DELETE /api/v1/tenants/{id}      // 删除租户
PATCH  /api/v1/tenants/{id}/status // 更新租户状态
```

### 2. 租户配置模块
```typescript
// 租户配置管理
GET    /api/v1/tenants/{id}/config    // 获取租户配置
PUT    /api/v1/tenants/{id}/config    // 更新租户配置
POST   /api/v1/tenants/{id}/config/reset // 重置为默认配置
GET    /api/v1/tenants/{id}/features  // 获取功能特性
PATCH  /api/v1/tenants/{id}/features  // 启用/禁用功能
```

### 3. 资源配额模块
```typescript
// 资源配额管理
GET    /api/v1/tenants/{id}/quotas     // 获取资源配额
PUT    /api/v1/tenants/{id}/quotas     // 设置资源配额
GET    /api/v1/tenants/{id}/usage      // 获取资源使用情况
POST   /api/v1/tenants/{id}/quotas/check // 检查配额限制
```

### 4. 计费管理模块
```typescript
// 计费管理
GET    /api/v1/tenants/{id}/billing    // 获取计费信息
POST   /api/v1/tenants/{id}/billing/plans // 更改计费计划
GET    /api/v1/tenants/{id}/invoices   // 获取账单列表
POST   /api/v1/tenants/{id}/payments   // 处理支付
```

## 数据库设计

### 租户主表 (tenants)
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  domain VARCHAR(255),
  status tenant_status_enum DEFAULT 'active',
  plan_id UUID REFERENCES subscription_plans(id),
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  suspended_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### 租户配置表 (tenant_configs)
```sql
CREATE TABLE tenant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  data_type config_data_type_enum NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, category, key)
);
```

### 资源配额表 (tenant_quotas)
```sql
CREATE TABLE tenant_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  limit_value BIGINT NOT NULL,
  used_value BIGINT DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  reset_period quota_reset_period_enum,
  last_reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, resource_type)
);
```

### 订阅计划表 (subscription_plans)
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB NOT NULL,
  quotas JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 多租户架构模式

### 1. 数据库隔离策略
```typescript
// 租户数据库路由
@Injectable()
export class TenantDatabaseService {
  private connections: Map<string, DataSource> = new Map();
  
  async getConnection(tenantId: string): Promise<DataSource> {
    if (!this.connections.has(tenantId)) {
      const tenant = await this.getTenant(tenantId);
      const connection = await this.createConnection(tenant.databaseConfig);
      this.connections.set(tenantId, connection);
    }
    return this.connections.get(tenantId);
  }
}

// 租户上下文中间件
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = this.extractTenantId(req);
    req['tenantId'] = tenantId;
    next();
  }
}
```

### 2. 应用隔离策略
```typescript
// 租户特性配置
interface TenantFeatures {
  userManagement: boolean;
  fileStorage: boolean;
  realTimeChat: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  ssoIntegration: boolean;
  auditLogs: boolean;
}

// 特性开关装饰器
@RequireFeature('advancedAnalytics')
@Controller('analytics')
export class AnalyticsController {
  @Get()
  async getAnalytics(@TenantId() tenantId: string) {
    // 只有启用高级分析功能的租户才能访问
  }
}
```

## 租户生命周期管理

### 租户创建流程
```mermaid
sequenceDiagram
  Client->>TenantService: 创建租户请求
  TenantService->>Database: 创建租户记录
  TenantService->>DatabaseService: 创建租户数据库
  TenantService->>ConfigService: 初始化默认配置
  TenantService->>QuotaService: 设置初始配额
  TenantService->>BillingService: 创建计费账户
  TenantService->>NotificationService: 发送欢迎邮件
  TenantService->>Client: 返回租户信息
```

### 租户删除流程
```typescript
@Injectable()
export class TenantDeletionService {
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantService.findById(tenantId);
    
    // 1. 备份租户数据
    await this.backupTenantData(tenant);
    
    // 2. 停止所有租户服务
    await this.stopTenantServices(tenant);
    
    // 3. 清理租户资源
    await this.cleanupTenantResources(tenant);
    
    // 4. 删除租户数据库
    await this.deleteTenantDatabase(tenant);
    
    // 5. 清理缓存
    await this.clearTenantCache(tenant);
    
    // 6. 删除租户记录
    await this.tenantService.delete(tenantId);
    
    // 7. 发送删除通知
    await this.notifyTenantDeletion(tenant);
  }
}
```

## 配置管理系统

### 分层配置模型
```typescript
interface TenantConfiguration {
  // 系统级配置（不可修改）
  system: {
    version: string;
    environment: string;
    region: string;
  };
  
  // 计划级配置
  plan: {
    maxUsers: number;
    storageLimit: number;
    apiRateLimit: number;
    features: string[];
  };
  
  // 租户级配置（可自定义）
  tenant: {
    branding: BrandingConfig;
    notifications: NotificationConfig;
    security: SecurityConfig;
    integrations: IntegrationConfig;
  };
}
```

### 动态配置热更新
```typescript
@Injectable()
export class ConfigUpdateService {
  @OnEvent('tenant.config.updated')
  async handleConfigUpdate(event: ConfigUpdateEvent) {
    const { tenantId, category, changes } = event;
    
    // 更新缓存
    await this.updateConfigCache(tenantId, category, changes);
    
    // 通知相关服务
    await this.notifyServicesConfigChange(tenantId, changes);
    
    // 记录配置变更日志
    await this.logConfigChange(tenantId, changes);
  }
}
```

## 资源配额管理

### 配额类型定义
```typescript
enum QuotaResourceType {
  USERS = 'users',
  STORAGE = 'storage',
  API_CALLS = 'api_calls',
  BANDWIDTH = 'bandwidth',
  DATABASES = 'databases',
  COMPUTE_HOURS = 'compute_hours',
  FILE_UPLOADS = 'file_uploads',
  EMAIL_SENDS = 'email_sends'
}

interface QuotaDefinition {
  type: QuotaResourceType;
  limit: number;
  unit: string;
  resetPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly';
  alertThresholds: number[]; // [75, 90, 95]
}
```

### 配额检查中间件
```typescript
@Injectable()
export class QuotaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    const resourceType = this.getResourceType(context);
    
    const quotaCheck = await this.quotaService.checkQuota(
      tenantId,
      resourceType,
      1
    );
    
    if (!quotaCheck.allowed) {
      throw new QuotaExceededException(quotaCheck.reason);
    }
    
    // 增加使用量
    await this.quotaService.incrementUsage(tenantId, resourceType, 1);
    
    return true;
  }
}
```

## 计费系统集成

### 订阅计划管理
```typescript
@Injectable()
export class SubscriptionService {
  async upgradePlan(tenantId: string, newPlanId: string): Promise<void> {
    const tenant = await this.tenantService.findById(tenantId);
    const newPlan = await this.planService.findById(newPlanId);
    
    // 计算按比例退款/补款
    const proratedAmount = await this.calculateProration(
      tenant.planId,
      newPlanId,
      tenant.currentPeriodEnd
    );
    
    // 更新 Stripe 订阅
    await this.stripe.subscriptions.update(tenant.stripeSubscriptionId, {
      items: [{ price: newPlan.stripePriceId }],
      proration_behavior: 'create_prorations'
    });
    
    // 更新租户计划
    await this.tenantService.updatePlan(tenantId, newPlanId);
    
    // 更新配额
    await this.quotaService.updateQuotas(tenantId, newPlan.quotas);
    
    // 发送确认邮件
    await this.notificationService.sendPlanUpgradeConfirmation(tenant);
  }
}
```

### 使用量计费
```typescript
@Injectable()
export class UsageBasedBillingService {
  @Cron('0 0 * * *') // 每日执行
  async calculateDailyUsage(): Promise<void> {
    const tenants = await this.tenantService.findActiveTenantsWithUsageBilling();
    
    for (const tenant of tenants) {
      const usage = await this.collectTenantUsage(tenant.id);
      await this.createUsageRecord(tenant.id, usage);
      
      // 检查是否需要发送用量告警
      await this.checkUsageAlerts(tenant.id, usage);
    }
  }
  
  private async collectTenantUsage(tenantId: string): Promise<UsageData> {
    return {
      apiCalls: await this.getApiCallCount(tenantId),
      storage: await this.getStorageUsage(tenantId),
      bandwidth: await this.getBandwidthUsage(tenantId),
      computeHours: await this.getComputeHours(tenantId)
    };
  }
}
```

## 租户隔离安全

### 数据访问控制
```typescript
// 租户数据隔离装饰器
@TenantIsolated()
@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  @TenantColumn() // 自动填充租户ID
  tenantId: string;
  
  @Column()
  title: string;
}

// 自动租户过滤
@Injectable()
export class TenantAwareRepository<T> extends Repository<T> {
  find(options?: FindManyOptions<T>): Promise<T[]> {
    const tenantId = this.getCurrentTenantId();
    return super.find({
      ...options,
      where: { ...options?.where, tenantId }
    });
  }
}
```

### 跨租户访问防护
```typescript
@Injectable()
export class TenantSecurityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userTenantId = request.user.tenantId;
    const requestTenantId = request.params.tenantId || request.body.tenantId;
    
    // 防止跨租户访问
    if (requestTenantId && requestTenantId !== userTenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
    
    return true;
  }
}
```

## 性能优化

### 租户配置缓存
```typescript
@Injectable()
export class TenantConfigCache {
  private readonly cache = new Map<string, TenantConfig>();
  private readonly ttl = 30 * 60 * 1000; // 30分钟
  
  async getConfig(tenantId: string): Promise<TenantConfig> {
    const cacheKey = `tenant_config:${tenantId}`;
    
    // 尝试从内存缓存获取
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // 尝试从 Redis 获取
    const cachedConfig = await this.redis.get(cacheKey);
    if (cachedConfig) {
      const config = JSON.parse(cachedConfig);
      this.cache.set(cacheKey, config);
      return config;
    }
    
    // 从数据库加载
    const config = await this.loadConfigFromDatabase(tenantId);
    
    // 缓存到 Redis 和内存
    await this.redis.setex(cacheKey, this.ttl / 1000, JSON.stringify(config));
    this.cache.set(cacheKey, config);
    
    return config;
  }
}
```

### 数据库连接池优化
```typescript
@Injectable()
export class TenantConnectionManager {
  private connectionPools: Map<string, Pool> = new Map();
  
  async getConnection(tenantId: string): Promise<PoolClient> {
    if (!this.connectionPools.has(tenantId)) {
      const tenant = await this.getTenant(tenantId);
      const pool = new Pool({
        ...tenant.databaseConfig,
        max: 20, // 最大连接数
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });
      this.connectionPools.set(tenantId, pool);
    }
    
    return this.connectionPools.get(tenantId).connect();
  }
}
```

## 监控指标

### 租户指标
- 活跃租户数量
- 新增租户转化率
- 租户流失率
- 平均租户价值
- 资源使用率

### 系统指标
- 多租户隔离性能
- 数据库连接池使用率
- 配置缓存命中率
- 跨租户访问尝试
- 配额超限告警

## 🗓️ 项目规划 (标准版本4周计划)

### Week 1: 基础架构 (第5优先级)
多租户管理服务在Week 2启动，依赖用户管理服务(Week 1)完成。

**里程碑1**: 多租户核心架构
- 租户CRUD操作 (2天)
- 数据库schema设计和RLS策略 (1天)
- 租户上下文中间件 (1天)
- 基础API端点测试 (1天)

### Week 2: 核心功能开发
**里程碑2**: 租户生命周期管理
- 租户创建/删除流程 (2天)
- 配置管理系统 (2天)
- 资源配额管理 (1天)

### Week 3: 高级功能
**里程碑3**: 计费与权限系统
- Stripe集成和订阅管理 (2天)
- 租户权限和特性开关 (2天)
- 性能优化和缓存策略 (1天)

### Week 4: 测试与部署
**里程碑4**: 生产就绪
- 集成测试和性能测试 (2天)
- 监控指标和健康检查 (1天)
- Docker Compose配置优化 (1天)
- 文档完善 (1天)

### 📊 资源分配 (8GB内存预算)
- **租户管理服务**: 1.2GB内存分配
- **PostgreSQL连接池**: 20个连接 (共享)
- **Redis缓存**: 200MB (租户配置缓存)
- **Docker容器**: 1个实例，支持水平扩展

### ⚠️ 风险评估
**技术风险**:
- 多租户数据隔离复杂性 - 通过PostgreSQL RLS缓解
- Stripe计费集成复杂度 - 分阶段实现，先支付后高级功能
- 性能瓶颈 - Redis缓存+连接池优化

**依赖风险**:
- 依赖用户管理服务(3003)认证 - 并行开发，接口优先定义
- 依赖API网关(3000)路由 - 使用Docker Compose网络临时方案
- 依赖权限管理服务(3002) - 内置基础权限，后期集成

**集成风险**:
- 跨服务数据一致性 - 事件驱动架构+补偿事务
- 服务启动顺序依赖 - Docker Compose健康检查+重试机制

## 🔗 服务间交互设计

### 依赖服务关系
```mermaid
graph TD
    A[API网关 3000] --> B[租户管理服务 3004]
    B --> C[用户管理服务 3003]
    B --> D[权限管理服务 3002]
    B --> E[审计服务 3008]
    B --> F[通知服务 3005]
    B --> G[缓存服务 3011]
```

### 内部API接口设计
```typescript
// 供其他服务调用的内部API
// 认证: X-Service-Token
GET    /internal/tenants/{id}/context     // 获取租户上下文
GET    /internal/tenants/{id}/features    // 获取租户功能特性
POST   /internal/tenants/{id}/usage      // 记录资源使用量
GET    /internal/tenants/{id}/quotas     // 检查配额限制
POST   /internal/tenants/validate        // 验证租户有效性
```

### 对外服务调用
```typescript
// 调用其他服务的API
// 用户管理服务 (3003)
GET    /internal/users/{id}/tenant-info   
POST   /internal/users/batch-update-tenant

// 权限管理服务 (3002)
POST   /internal/permissions/tenant-roles
GET    /internal/permissions/tenant-policies

// 审计服务 (3008)
POST   /internal/audit/tenant-events

// 通知服务 (3005)
POST   /internal/notifications/tenant-events
```

### 统一错误处理
```typescript
// 服务间调用错误处理
@Injectable()
export class ServiceInteractionGuard {
  async callInternalService(service: string, endpoint: string, data?: any) {
    const maxRetries = 3;
    const backoffMs = [1000, 2000, 4000];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.httpService.request({
          url: `http://${service}:${this.getServicePort(service)}${endpoint}`,
          headers: { 'X-Service-Token': this.serviceToken },
          data,
          timeout: 5000
        }).toPromise();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        await this.delay(backoffMs[attempt]);
      }
    }
  }
}
```

## 🐳 Docker Compose配置优化

### 服务定义
```yaml
version: '3.8'
services:
  tenant-management-service:
    build:
      context: .
      dockerfile: apps/tenant-management-service/Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/platform
      - REDIS_URL=redis://redis:6379/2
      - SERVICE_PORT=3004
      - SERVICE_NAME=tenant-management-service
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - platform-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1.2G
        reservations:
          memory: 800M
    restart: unless-stopped

  # 共享PostgreSQL实例
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-tenant-db.sql:/docker-entrypoint-initdb.d/01-tenant.sql
    networks:
      - platform-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 共享Redis实例
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - platform-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
  redis_data:

networks:
  platform-network:
    driver: bridge
```

### 服务发现配置
```typescript
// Docker Compose网络内服务发现
@Injectable()
export class ServiceDiscovery {
  private serviceEndpoints = {
    'api-gateway': 'http://api-gateway:3000',
    'auth-service': 'http://auth-service:3001',
    'permission-service': 'http://permission-service:3002',
    'user-management-service': 'http://user-management-service:3003',
    'notification-service': 'http://notification-service:3005',
    'audit-service': 'http://audit-service:3008',
    'cache-service': 'http://cache-service:3011'
  };
  
  getServiceUrl(serviceName: string): string {
    return this.serviceEndpoints[serviceName] || 
           `http://${serviceName}:${this.getDefaultPort(serviceName)}`;
  }
}
```

## 部署配置

### 环境变量 (标准版本)
```env
# 服务配置
SERVICE_NAME=tenant-management-service
SERVICE_PORT=3004
NODE_ENV=production

# 数据库配置 (共享PostgreSQL)
DATABASE_URL=postgresql://postgres:password@postgres:5432/platform
TENANT_DB_POOL_SIZE=20
TENANT_DB_TIMEOUT=2000
TENANT_DB_MAX_CONNECTIONS=50

# Redis配置 (共享实例)
REDIS_URL=redis://redis:6379/2
REDIS_TENANT_CONFIG_TTL=1800  # 30分钟
REDIS_CONNECTION_POOL_SIZE=10

# 服务间认证
SERVICE_TOKEN=tenant-mgmt-secret-token-2024
INTERNAL_API_TIMEOUT=5000

# Stripe集成 (标准版本)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_ENABLED=false  # 标准版本简化

# 配额设置 (标准版本默认值)
DEFAULT_USER_QUOTA=100
DEFAULT_STORAGE_QUOTA=10737418240  # 10GB
DEFAULT_API_QUOTA=10000
DEFAULT_BANDWIDTH_QUOTA=107374182400  # 100GB

# 计费配置
BILLING_CYCLE_DAY=1
USAGE_CALCULATION_TIMEZONE=UTC
USAGE_BILLING_ENABLED=true

# 监控配置
PROMETHEUS_ENABLED=true
METRICS_PORT=9464
HEALTH_CHECK_INTERVAL=30000

# Docker Compose网络
SERVICE_DISCOVERY_MODE=docker-compose
NETWORK_NAME=platform-network
```

### 数据库迁移
```sql
-- 租户数据库自动初始化
CREATE OR REPLACE FUNCTION initialize_tenant_database(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 创建租户特定的表结构
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS tenant_%s', replace(tenant_id::text, '-', '_'));
  
  -- 初始化基础数据
  INSERT INTO tenant_configs (tenant_id, category, key, value)
  VALUES (tenant_id, 'system', 'initialized_at', to_jsonb(NOW()));
END;
$$ LANGUAGE plpgsql;
```