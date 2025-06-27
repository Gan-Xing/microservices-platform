# 多租户管理服务开发文档 - 标准版本

## 服务概述

多租户管理服务是微服务平台的资源隔离核心，面向**100租户+10万用户**的企业级生产系统，负责租户的创建、配置、资源分配、计费管理等功能，实现真正的多租户SaaS架构。

### 🎯 标准版本定位
- **租户规模**: 支持100个企业级租户，每租户平均1000用户
- **资源管理**: 智能配额管理，动态资源分配
- **计费能力**: 完整的计费系统，支持多种计费模式
- **隔离等级**: 数据库级隔离，确保租户数据安全
- **部署方式**: Docker Compose，支持租户独立部署

## 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (租户元数据) + Redis 7+ (配置缓存)
- **ORM**: Prisma ORM
- **队列**: Bull Queue (Redis)
- **计费**: Stripe API + 自定义计费引擎
- **配置**: Redis + 环境变量 (标准版本简化配置)
- **企业版功能**: Consul + etcd (企业版保留)

### 架构模式 (标准版本)
- **数据隔离**: Shared Database + Row Level Security (适合100租户)
- **应用隔离**: Shared Container + 租户上下文隔离
- **网络隔离**: Docker网络隔离 + 访问控制
- **存储隔离**: 逻辑隔离 + 权限控制 (无需物理隔离)

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

## 部署配置

### 环境变量
```env
# 数据库配置
TENANT_DB_POOL_SIZE=20
TENANT_DB_TIMEOUT=2000
SHARED_DB_URL=postgresql://user:pass@localhost:5432/platform_shared

# Stripe 集成
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 配额设置
DEFAULT_USER_QUOTA=100
DEFAULT_STORAGE_QUOTA=10737418240  # 10GB
DEFAULT_API_QUOTA=10000

# 计费配置
BILLING_CYCLE_DAY=1
USAGE_CALCULATION_TIMEZONE=UTC
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