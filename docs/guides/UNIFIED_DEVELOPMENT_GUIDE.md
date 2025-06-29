# 🚀 企业级微服务平台开发指南

## 📋 项目概述

### 🎯 标准版本定位

**企业级微服务平台标准版本**，目标在4周内完成支持**100租户、10万用户**的生产级平台。本平台遵循"选择最合适的技术，避免过度设计"的原则，在功能完整性和技术复杂度之间达到最佳平衡。

### 📊 核心指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 租户数 | 100 | 中小企业客户 |
| 用户数 | 10万 | 活跃用户 |
| 并发请求 | 1000 QPS | 峰值流量 |
| 响应时间 | P95 < 100ms | 生产环境要求 |
| 可用性 | 99% | 年度可用性目标 |
| 部署规模 | 8GB内存 | Docker Compose单机或小集群 |

---

## 🏗️ 技术架构

### 核心技术栈

```yaml
开发框架:
  - TypeScript 5.x (主开发语言)
  - NestJS 10.x (所有12个微服务统一框架)
  - Prisma ORM (类型安全数据库访问)
  - Nx Monorepo (代码库管理)

基础设施:
  - PostgreSQL 15+ (主数据库+全文搜索+时序数据)
  - Redis 7+ (缓存+会话+消息队列)
  - Docker + Docker Compose (推荐部署方案)
  
生产组件:
  - MinIO/S3 (对象存储)
  - Prometheus + Grafana (监控告警)
  - Nginx (负载均衡和SSL终止)

标准版本原则:
  - 避免K8S过度复杂性，Docker Compose足够
  - 避免Kafka重量级，Redis Streams满足需求
  - 避免Elasticsearch额外组件，PostgreSQL全文搜索足够
  - 避免InfluxDB，PostgreSQL时序扩展满足需求
```

### 服务端口分配

| 服务名称 | 端口 | 复杂度 | 优先级 |
|---------|------|-------|--------|
| API网关服务 | 3000 | ⭐⭐⭐ | Week 2 |
| 认证授权服务 | 3001 | ⭐⭐ | Week 1 |
| 权限管理服务 | 3002 | ⭐⭐ | Week 1 |
| 用户管理服务 | 3003 | ⭐ | Week 1 |
| 多租户管理服务 | 3004 | ⭐⭐⭐ | Week 2 |
| 消息通知服务 | 3005 | ⭐⭐⭐⭐ | Week 3 |
| 文件存储服务 | 3006 | ⭐⭐⭐⭐ | Week 3 |
| 监控服务 | 3007 | ⭐⭐⭐⭐⭐ | Week 4 |
| 审计服务 | 3008 | ⭐⭐⭐ | Week 2 |
| 任务调度服务 | 3009 | ⭐⭐⭐⭐ | Week 3 |
| 消息队列服务 | 3010 | ⭐⭐⭐⭐ | Week 3 |
| 缓存服务 | 3011 | ⭐⭐ | Week 1 |

---

## 📅 开发路线图

### 🚀 阶段一：基础服务（Week 1-2）

**目标**：建立平台基础架构，实现核心的用户认证体系

**开发顺序**：

1. **缓存服务** (3011) ⭐⭐ - 最简单，无业务依赖，为其他服务提供缓存支持
2. **用户管理服务** (3003) ⭐ - 基础CRUD，被所有服务依赖
3. **认证授权服务** (3001) ⭐⭐ - 依赖用户+缓存，提供JWT认证
4. **权限管理服务** (3002) ⭐⭐ - 依赖认证+用户+缓存，实现RBAC

### 🔐 阶段二：核心业务服务（Week 2-3）

**目标**：完善业务功能，建立多租户体系和API网关

**开发顺序**：

1. **API网关服务** (3000) ⭐⭐⭐ - 统一入口，依赖认证+权限+缓存
2. **多租户管理服务** (3004) ⭐⭐⭐ - 租户隔离，依赖用户+权限+认证
3. **审计服务** (3008) ⭐⭐⭐ - 合规要求，依赖所有前述服务

### 💼 阶段三：高级功能服务（Week 3-4）

**目标**：实现企业级功能，提供完整的生产能力

**开发顺序**：

1. **消息队列服务** (3010) ⭐⭐⭐⭐ - 异步通信基础
2. **任务调度服务** (3009) ⭐⭐⭐⭐ - 依赖消息队列
3. **文件存储服务** (3006) ⭐⭐⭐⭐ - 依赖认证+权限
4. **消息通知服务** (3005) ⭐⭐⭐⭐ - 依赖消息队列+用户+调度
5. **监控服务** (3007) ⭐⭐⭐⭐⭐ - 最复杂，监控所有服务

---

## 💾 系统架构配置

### 内存分配方案 (8GB总内存)

```yaml
基础设施组件 (3.5GB):
  PostgreSQL: 2GB    # 主数据库 + 全文搜索 + 时序数据
  Redis: 1GB         # 缓存 + 会话 + 消息队列
  Prometheus: 256MB  # 监控指标收集
  Grafana: 128MB     # 监控可视化
  MinIO: 128MB       # 对象存储

微服务组件 (4GB):
  高负载服务 (1.5GB):
    - API网关: 512MB
    - 认证服务: 512MB
    - 用户服务: 512MB
  
  中等负载服务 (1.5GB):
    - 权限服务: 256MB
    - 租户服务: 256MB
    - 通知服务: 256MB
    - 文件服务: 256MB
    - 监控服务: 256MB
    - 审计服务: 256MB
  
  低负载服务 (1GB):
    - 调度服务: 256MB
    - 队列服务: 256MB
    - 缓存服务: 256MB
    - 预留: 256MB

系统预留 (500MB):
  操作系统和Docker开销
```

### PostgreSQL 配置优化

```sql
-- 内存配置 (2GB分配)
shared_buffers = 512MB              -- 25%内存用于共享缓冲区
effective_cache_size = 1536MB       -- 系统可用缓存大小
work_mem = 8MB                      -- 单个查询工作内存
maintenance_work_mem = 128MB        -- 维护操作内存

-- 连接配置
max_connections = 200               -- 支持200并发连接
max_prepared_transactions = 100     -- 预处理事务数

-- 性能优化
random_page_cost = 1.1              -- SSD优化
seq_page_cost = 1.0                 -- 顺序扫描成本
cpu_tuple_cost = 0.01               -- CPU元组处理成本
cpu_index_tuple_cost = 0.005        -- 索引CPU成本

-- WAL配置
wal_level = replica                 -- 支持复制
max_wal_size = 2GB                  -- WAL最大大小
min_wal_size = 80MB                 -- WAL最小大小
checkpoint_completion_target = 0.9   -- 检查点完成时间
```

### Redis 配置优化

```conf
# 内存管理 (1GB分配)
maxmemory 1gb
maxmemory-policy allkeys-lru        # LRU淘汰策略
maxmemory-samples 5                 # LRU样本数

# 持久化配置
save 900 1                          # 15分钟内1个改变就保存
save 300 10                         # 5分钟内10个改变就保存
save 60 10000                       # 1分钟内10000个改变就保存
appendonly yes                      # 开启AOF
appendfsync everysec               # 每秒同步AOF

# 网络优化
tcp-keepalive 60                    # TCP保活时间
timeout 300                         # 客户端超时时间
tcp-backlog 511                     # TCP监听队列大小

# Redis Streams配置(消息队列)
stream-node-max-bytes 4096
stream-node-max-entries 100
```

---

## 🚀 快速开始

### 前置要求

- Docker 20.x+
- Docker Compose 2.x+
- Node.js 18.x+ (开发环境)
- 8GB 可用内存

### 一键启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd platform

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置密钥和数据库密码

# 3. 启动基础设施
docker-compose up -d postgres redis prometheus grafana minio

# 4. 启动微服务 (按阶段启动)
# 阶段1: 基础服务
docker-compose up -d cache-service user-service auth-service rbac-service

# 阶段2: 核心服务  
docker-compose up -d api-gateway tenant-service audit-service

# 阶段3: 高级服务
docker-compose up -d message-queue-service scheduler-service file-storage-service notification-service monitoring-service
```

### 访问地址

```text
核心服务:
- API网关: http://localhost:3000
- 用户管理: http://localhost:3003

管理界面:
- Grafana监控: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- MinIO控制台: http://localhost:9001 (minioadmin/minioadmin)
- Redis Commander: http://localhost:8081
```

### API 测试示例

```bash
# 1. 用户注册
curl -X POST http://localhost:3000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. 用户登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'

# 3. 获取用户信息 (需要JWT Token)
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 📊 监控与运维

### 关键指标监控

```yaml
应用指标:
- HTTP响应时间: < 100ms (P95)
- 错误率: < 1%
- 吞吐量: 1000 QPS
- 可用性: 99%

资源指标:
- CPU使用率: < 70%
- 内存使用率: < 80%
- 磁盘使用率: < 85%
- 网络延迟: < 10ms

业务指标:
- 活跃用户数: 实时监控
- 租户增长: 日增长监控
- API调用量: 服务级监控
- 数据库连接: 连接池监控
```

### 告警规则

```yaml
critical_alerts:
  - name: "服务不可用"
    condition: "up == 0"
    for: "1m"
    
  - name: "内存使用过高"
    condition: "memory_usage_percentage > 90"
    for: "5m"
    
  - name: "响应时间过长"
    condition: "http_request_duration_seconds{quantile='0.95'} > 0.1"
    for: "3m"

warning_alerts:
  - name: "CPU使用率高"
    condition: "cpu_usage_percentage > 70"
    for: "10m"
    
  - name: "错误率偏高"
    condition: "error_rate > 0.01"
    for: "5m"
```

---

## 🔧 开发最佳实践

### 代码规范

```typescript
// 1. 统一的服务结构
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('admin', 'user')
  async findAll(@Query() query: FindUsersDto): Promise<User[]> {
    return this.userService.findAll(query);
  }
}

// 2. 统一的错误处理
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 统一错误响应格式
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// 3. 统一的响应格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 数据库最佳实践

```sql
-- 1. 统一的表结构设计
CREATE TABLE base_entity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- 2. 多租户数据隔离
CREATE POLICY tenant_isolation ON users
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- 3. 索引优化
CREATE INDEX CONCURRENTLY idx_users_tenant_active 
ON users(tenant_id, is_active) 
WHERE is_active = true;
```

### 缓存策略

```typescript
// 多层缓存配置
export const CACHE_STRATEGIES = {
  userSessions: {
    ttl: 900,           // 15分钟
    keyPattern: 'session:{sessionId}',
    evictionPolicy: 'lru'
  },
  
  userData: {
    ttl: 3600,          // 1小时
    keyPattern: 'user:{userId}:data',
    evictionPolicy: 'lru'
  },
  
  apiResponses: {
    ttl: 300,           // 5分钟
    keyPattern: 'api:{endpoint}:{params}',
    evictionPolicy: 'lfu'
  }
};
```

---

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 服务启动失败

```bash
# 检查服务状态
docker-compose ps

# 查看服务日志
docker-compose logs [service-name]

# 重启特定服务
docker-compose restart [service-name]
```

#### 2. 内存不足

```bash
# 检查内存使用
docker stats

# 释放内存
docker system prune -f
docker volume prune -f

# 调整服务内存限制
# 编辑 docker-compose.yml 中的 mem_limit 配置
```

#### 3. 数据库连接问题

```bash
# 检查PostgreSQL状态
docker-compose exec postgres pg_isready -U postgres

# 检查连接池
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# 重启数据库
docker-compose restart postgres
```

#### 4. 性能问题

```bash
# 检查响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health

# 查看Prometheus指标
curl http://localhost:9090/metrics

# 分析慢查询
docker-compose exec postgres psql -U postgres -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 📈 扩展升级路径

### 垂直扩展 (单机优化)

```yaml
当前配置 → 优化后配置:
内存: 8GB → 16GB
CPU: 4核 → 8核
存储: SSD 500GB → SSD 1TB

支持能力提升:
用户数: 10万 → 20万
并发: 1000 QPS → 2000 QPS
租户数: 100 → 200
```

### 水平扩展 (多机部署)

```yaml
扩展触发条件:
- CPU使用率持续 > 70%
- 内存使用率持续 > 80%
- 响应时间 P95 > 100ms
- 并发用户 > 5000

扩展方案:
1. PostgreSQL主从复制
2. Redis Cluster (3节点)
3. 微服务多实例 + 负载均衡
4. 文件存储分布式部署
```

---

## 📋 部署检查清单

### 部署前检查

- [ ] 确认硬件资源 (8GB内存, 4CPU, 500GB SSD)
- [ ] 配置环境变量和密钥
- [ ] 准备SSL证书
- [ ] 配置备份策略
- [ ] 设置监控告警

### 部署后验证

- [ ] 所有服务健康检查通过
- [ ] 数据库连接正常
- [ ] 缓存服务可用
- [ ] API端点响应正常
- [ ] 监控面板数据正常
- [ ] 告警规则生效

### 性能测试

- [ ] 并发用户测试 (1000 用户)
- [ ] 压力测试 (1000 QPS)
- [ ] 长时间稳定性测试 (24小时)
- [ ] 故障恢复测试
- [ ] 数据一致性测试

---

## 📚 相关文档

- **服务开发文档**: 各个微服务的详细开发指南
- **API文档**: 完整的API端点文档
- **数据库设计**: 数据模型和关系设计
- **安全指南**: 认证、授权和数据保护
- **运维手册**: 部署、监控和故障处理

---

## 💡 总结

这个统一开发指南整合了5个原始文档的核心内容，提供了：

1. **完整的项目概述** - 100租户+10万用户的标准版本定位
2. **清晰的技术架构** - 统一的技术栈和服务端口分配
3. **详细的开发路线图** - 4周12个服务的开发计划
4. **生产级配置指南** - 8GB内存的详细分配和优化
5. **实用的快速开始** - 一键启动和API测试示例
6. **完善的监控运维** - 关键指标和告警规则
7. **实践性开发指南** - 代码规范和最佳实践
8. **完整的故障排除** - 常见问题和解决方案

通过这个统一的开发指南，团队可以：

- **快速上手**: 5分钟启动完整环境
- **高效开发**: 清晰的开发顺序和依赖关系
- **生产部署**: 经过优化的配置和监控
- **持续运维**: 完整的故障排除和扩展方案

这确保了整个微服务平台从开发到生产的全生命周期管理。
