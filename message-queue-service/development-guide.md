# 消息队列服务开发指南

## 🎯 服务概述

消息队列服务是微服务平台的消息中间件核心，面向**100租户+10万用户**的企业级生产系统，负责异步消息传递、服务解耦、事件驱动架构和可靠消息传输，为整个平台提供高性能、高可用的消息通信能力。

### 核心功能
- **队列管理**: 创建、配置、监控消息队列
- **消息发布**: 支持单条、批量、延迟、定时消息发布
- **消息订阅**: 灵活的订阅管理和消费者组配置
- **监控统计**: 实时消息处理指标和系统健康状态

### 服务定位
- **端口**: 3010
- **依赖关系**: 依赖用户管理(3003)、认证授权(3001)、API网关(3000)
- **优先级**: ⭐⭐⭐⭐ (Week 3-4 扩展服务)
- **复杂度**: 高 - Redis Streams + PostgreSQL

## 🛠️ 技术栈

### 标准版本技术选择 ✅
- **消息存储**: Redis Streams (适合标准版本吞吐量)
- **元数据存储**: PostgreSQL (复用现有数据库)
- **框架**: NestJS 10.x + TypeScript 5.x (统一技术栈)
- **部署**: Docker Compose (避免K8S复杂性)
- **序列化**: JSON (简化处理)

### 企业版本扩展计划 ⭐ (V2.0版本)
- **高级消息队列**: 企业版可选Kafka集成
- **消息压缩**: Protobuf/Avro等高级序列化
- **分布式跟踪**: Jaeger/Zipkin集成

## 📋 完整功能列表

### 1. 队列管理 (Queue Management)
- 创建队列/主题
- 队列配置管理
- 队列状态监控
- 队列清空和删除

### 2. 消息发布 (Message Publishing)
- 单条消息发布
- 批量消息发布
- 延迟消息发布
- 定时消息发布
- 消息路由和分区

### 3. 消息订阅 (Message Subscription)
- 订阅创建和配置
- 消费者组管理
- 消息消费和确认
- 失败重试机制

### 4. 监控统计 (Monitoring & Metrics)
- 消息处理指标
- 队列状态监控
- 消费者性能监控
- 系统健康检查

## 🔗 API设计

### 队列管理接口
```typescript
POST   /api/v1/mq/queues                     // 创建队列
GET    /api/v1/mq/queues                     // 获取队列列表
GET    /api/v1/mq/queues/{name}              // 获取队列详情
PUT    /api/v1/mq/queues/{name}              // 更新队列配置
DELETE /api/v1/mq/queues/{name}              // 删除队列
POST   /api/v1/mq/queues/{name}/purge        // 清空队列
```

### 消息发布接口
```typescript
POST   /api/v1/mq/publish                    // 发布单条消息
POST   /api/v1/mq/publish/batch              // 批量发布消息
POST   /api/v1/mq/publish/delayed            // 延迟消息发布
POST   /api/v1/mq/publish/scheduled          // 定时消息发布
POST   /api/v1/mq/topics/{name}/publish      // 发布到指定主题
```

### 消息订阅管理
```typescript
POST   /api/v1/mq/subscriptions              // 创建订阅
GET    /api/v1/mq/subscriptions              // 获取订阅列表
GET    /api/v1/mq/subscriptions/{id}         // 获取订阅详情
PUT    /api/v1/mq/subscriptions/{id}         // 更新订阅
DELETE /api/v1/mq/subscriptions/{id}         // 删除订阅
POST   /api/v1/mq/subscriptions/{id}/pause   // 暂停订阅
POST   /api/v1/mq/subscriptions/{id}/resume  // 恢复订阅
```

### 监控统计接口
```typescript
GET    /api/v1/mq/metrics                    // 获取系统指标
GET    /api/v1/mq/metrics/topics             // 获取主题指标
GET    /api/v1/mq/metrics/consumers          // 获取消费者指标
GET    /api/v1/mq/health                     // 健康检查
GET    /api/v1/mq/status                     // 服务状态
```

## 🗄️ 数据库设计

### 主题表 (message_topics)
```sql
CREATE TABLE message_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  display_name VARCHAR(200),
  description TEXT,
  
  -- 主题配置
  topic_type VARCHAR(50) NOT NULL, -- 'kafka', 'redis_stream'
  partition_count INTEGER DEFAULT 1,
  replication_factor INTEGER DEFAULT 1,
  retention_ms BIGINT DEFAULT 604800000, -- 7天
  
  -- 消息配置
  message_format VARCHAR(50) DEFAULT 'json', -- 'json', 'avro', 'protobuf'
  schema_definition JSONB,
  compression_type VARCHAR(20) DEFAULT 'none',
  
  -- 访问控制
  tenant_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  allowed_producers JSONB DEFAULT '[]',
  allowed_consumers JSONB DEFAULT '[]',
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'archived'
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 订阅表 (message_subscriptions)
```sql
CREATE TABLE message_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES message_topics(id) ON DELETE CASCADE,
  
  -- 订阅信息
  consumer_group VARCHAR(200) NOT NULL,
  consumer_name VARCHAR(200) NOT NULL,
  subscription_type VARCHAR(50) NOT NULL, -- 'kafka_consumer', 'redis_consumer', 'webhook'
  
  -- 消费配置
  offset_reset_policy VARCHAR(20) DEFAULT 'latest', -- 'earliest', 'latest'
  max_poll_records INTEGER DEFAULT 500,
  session_timeout_ms INTEGER DEFAULT 30000,
  heartbeat_interval_ms INTEGER DEFAULT 3000,
  
  -- 消息处理
  handler_config JSONB NOT NULL, -- 处理器配置
  dead_letter_queue VARCHAR(200),
  max_retry_attempts INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  
  -- 过滤器
  message_filter JSONB, -- 消息过滤条件
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'stopped'
  tenant_id UUID NOT NULL,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_consumed_at TIMESTAMP,
  
  UNIQUE(topic_id, consumer_group, consumer_name)
);
```

### 消息记录表 (message_records)
```sql
CREATE TABLE message_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES message_topics(id),
  
  -- 消息标识
  message_key VARCHAR(500),
  message_id VARCHAR(200) UNIQUE NOT NULL,
  correlation_id VARCHAR(200),
  
  -- 消息内容
  headers JSONB DEFAULT '{}',
  payload JSONB,
  payload_size INTEGER,
  content_type VARCHAR(100) DEFAULT 'application/json',
  
  -- 路由信息
  partition_id INTEGER,
  offset_value BIGINT,
  
  -- 消息状态
  status VARCHAR(20) DEFAULT 'published', -- 'published', 'consumed', 'failed', 'dead_letter'
  retry_count INTEGER DEFAULT 0,
  
  -- 时间信息
  published_at TIMESTAMP DEFAULT NOW(),
  scheduled_at TIMESTAMP,
  consumed_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- 元数据
  producer_id VARCHAR(200),
  tenant_id UUID NOT NULL,
  trace_id VARCHAR(100)
);
```

### 消费记录表 (consumption_records)
```sql
CREATE TABLE consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES message_subscriptions(id),
  message_id VARCHAR(200) NOT NULL,
  
  -- 消费信息
  consumer_instance VARCHAR(200) NOT NULL,
  partition_id INTEGER,
  offset_value BIGINT,
  
  -- 处理结果
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'retrying'
  processing_time_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- 时间戳
  consumed_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  
  -- 元数据
  tenant_id UUID NOT NULL
);
```

## 🏗️ 核心架构实现

### 标准版本消息架构
**简化架构** - 专注Redis Streams，避免过度复杂性：

```mermaid
graph TB
    Producer[消息生产者] --> Gateway[API网关:3000]
    Gateway --> MQService[消息队列服务:3010]
    
    MQService --> RedisStreams[Redis Streams]
    MQService --> PostgreSQL[PostgreSQL元数据]
    
    RedisStreams --> ConsumerGroup[消费者组]
    ConsumerGroup --> MessageProcessor[消息处理器]
    
    MessageProcessor --> UserService[用户服务:3003]
    MessageProcessor --> NotificationService[通知服务:3005]
    MessageProcessor --> AuditService[审计服务:3008]
    
    MessageProcessor --> DeadLetter[死信队列]
    MessageProcessor --> Monitoring[监控服务:3007]
```

### Redis Streams实现
```typescript
@Injectable()
export class MessagePublisher {
  constructor(
    private readonly redis: Redis,
    private readonly auditService: AuditService
  ) {}
  
  async publishMessage(request: PublishMessageRequest): Promise<PublishMessageResponse> {
    const stream = `mq:${request.queue}`;
    const messageData = {
      id: generateId(),
      payload: JSON.stringify(request.payload),
      headers: JSON.stringify(request.headers || {}),
      tenant_id: request.tenantId,
      created_at: Date.now().toString()
    };
    
    try {
      const messageId = await this.redis.xadd(
        stream,
        '*',
        ...Object.entries(messageData).flat()
      );
      
      await this.auditService.logOperation({
        operation: 'message_published',
        resource: `queue:${request.queue}`,
        tenantId: request.tenantId,
        details: { messageId, size: JSON.stringify(request.payload).length }
      });
      
      return {
        messageId,
        queue: request.queue,
        publishedAt: new Date()
      };
    } catch (error) {
      throw new MessagePublishException(
        `Failed to publish message to queue ${request.queue}`,
        error
      );
    }
  }
}
```

## 🔄 服务间交互设计

### 内部API接口 (服务间通信)
```typescript
// 内部服务调用 - 使用X-Service-Token认证
interface InternalMessageAPI {
  // 用户服务调用
  'POST /internal/mq/user-events',           // 用户事件发布
  'POST /internal/mq/user-notifications',   // 用户通知消息
  
  // 审计服务调用
  'POST /internal/mq/audit-logs',           // 审计日志消息
  'GET /internal/mq/audit-queue-status',    // 审计队列状态
  
  // 通知服务调用
  'POST /internal/mq/notifications',        // 通知消息发布
  'GET /internal/mq/notification-queue',    // 通知队列状态
  
  // 监控服务调用
  'GET /internal/mq/metrics',              // 消息队列指标
  'GET /internal/mq/health-detailed'       // 详细健康状态
}
```

### 统一错误处理
```typescript
// 标准版本错误响应格式
interface MessageQueueError {
  code: 'MQ_QUEUE_NOT_FOUND' | 'MQ_PUBLISH_FAILED' | 'MQ_CONSUMER_ERROR';
  message: string;
  details?: any;
  retryAfter?: number; // 重试延迟(秒)
}
```

## ⚡ 性能优化

### 批量处理优化
```typescript
@Injectable()
export class BatchProcessor {
  private batches: Map<string, MessageBatch> = new Map();
  
  async addToBatch(topic: string, message: Message): Promise<void> {
    let batch = this.batches.get(topic);
    
    if (!batch) {
      batch = new MessageBatch(topic, this.config.batchSize);
      this.batches.set(topic, batch);
    }
    
    batch.addMessage(message);
    
    if (batch.isFull() || batch.isExpired()) {
      await this.processBatch(batch);
      this.batches.delete(topic);
    }
  }
}
```

### 连接池管理
- Redis连接池：5-20个连接
- 消息批量大小：50条/批次
- 最大并发消费者：5个
- 处理超时：15秒

## 🛡️ 安全措施

### 消息加密
```typescript
@Injectable()
export class MessageEncryption {
  async encryptMessage(payload: any, tenantKey: string): Promise<string> {
    const cipher = crypto.createCipher('aes-256-gcm', tenantKey);
    const encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex') + 
                     cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return Buffer.from(JSON.stringify({
      data: encrypted,
      authTag: authTag.toString('hex')
    })).toString('base64');
  }
}
```

### 访问控制
- 租户级别消息隔离
- 生产者/消费者权限验证
- 内部服务间API认证
- 消息传输加密

## 📈 监控和告警

### 系统指标
```typescript
interface MessageQueueMetrics {
  redisStreams: {
    totalStreams: number;
    totalConsumerGroups: number;
    totalMessages: number;
    pendingMessages: number;
  };
  
  consumers: {
    activeConsumers: number;
    totalLag: number;
    processingRate: number;
    errorRate: number;
  };
  
  performance: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
  };
}
```

### 健康检查实现
```typescript
// 消息队列服务健康检查控制器
@Controller('health')
export class MessageQueueHealthController {
  constructor(
    private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService
  ) {}

  @Get()
  async checkHealth(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    
    const checks = await Promise.allSettled([
      this.checkRedisStreams(),
      this.checkDatabase(),
      this.checkQueues(),
      this.checkConsumers(),
      this.checkMemory(),
      this.checkDependencies()
    ]);
    
    const redisStatus = checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy';
    const databaseStatus = checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy';
    const queuesStatus = checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy';
    const consumersStatus = checks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy';
    const memoryStatus = checks[4].status === 'fulfilled' ? 'healthy' : 'unhealthy';
    const dependenciesStatus = checks[5].status === 'fulfilled' ? 'healthy' : 'unhealthy';
    
    const overallStatus = [redisStatus, databaseStatus, queuesStatus, consumersStatus, memoryStatus, dependenciesStatus]
      .every(status => status === 'healthy') ? 'healthy' : 'unhealthy';
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'message-queue-service',
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime,
      checks: {
        redisStreams: redisStatus,
        database: databaseStatus,
        queues: queuesStatus,
        consumers: consumersStatus,
        memory: memoryStatus,
        dependencies: dependenciesStatus
      },
      metrics: await this.getHealthMetrics()
    };
  }

  @Get('ping')
  async ping(): Promise<{ status: string; timestamp: string; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - startTime;
      
      return {
        status: 'pong',
        timestamp: new Date().toISOString(),
        latency
      };
    } catch (error) {
      throw new ServiceUnavailableException('Redis connection failed');
    }
  }

  @Get('status')
  async getStatus(): Promise<MessageQueueStatusResponse> {
    const redisInfo = await this.redis.info();
    const memory = process.memoryUsage();
    const queuesInfo = await this.getQueuesInfo();
    
    return {
      service: 'message-queue-service',
      status: 'running',
      timestamp: new Date().toISOString(),
      redis: {
        version: redisInfo.redis_version,
        uptime: parseInt(redisInfo.uptime_in_seconds),
        connectedClients: parseInt(redisInfo.connected_clients),
        usedMemory: redisInfo.used_memory_human,
        totalCommandsProcessed: parseInt(redisInfo.total_commands_processed)
      },
      queues: queuesInfo,
      application: {
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
        }
      }
    };
  }

  private async checkRedisStreams(): Promise<void> {
    // 检查Redis Streams连接和基本操作
    const testStream = 'health:check:stream:' + Date.now();
    
    try {
      // 测试写入stream
      const messageId = await this.redis.xadd(testStream, '*', 'test', 'data');
      
      // 测试读取stream
      const messages = await this.redis.xrange(testStream, '-', '+');
      if (messages.length === 0) {
        throw new Error('Redis Streams read test failed');
      }
      
      // 清理测试数据
      await this.redis.del(testStream);
    } catch (error) {
      throw new Error(`Redis Streams health check failed: ${error.message}`);
    }
  }

  private async checkDatabase(): Promise<void> {
    // 检查PostgreSQL连接
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkQueues(): Promise<void> {
    // 检查活跃队列状态
    const activeQueues = await this.messageQueueService.getActiveQueues();
    
    for (const queue of activeQueues) {
      try {
        const queueInfo = await this.redis.xinfo('STREAM', queue.name);
        if (!queueInfo) {
          throw new Error(`Queue ${queue.name} is not accessible`);
        }
      } catch (error) {
        throw new Error(`Queue health check failed for ${queue.name}: ${error.message}`);
      }
    }
  }

  private async checkConsumers(): Promise<void> {
    // 检查消费者组状态
    const activeConsumers = await this.messageQueueService.getActiveConsumers();
    
    // 检查是否有消费者处于异常状态
    const unhealthyConsumers = activeConsumers.filter(consumer => {
      const lastHeartbeat = new Date(consumer.lastHeartbeat);
      const now = new Date();
      const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();
      
      // 如果超过60秒没有心跳，认为消费者不健康
      return timeSinceLastHeartbeat > 60000;
    });

    if (unhealthyConsumers.length > 0) {
      throw new Error(`Found ${unhealthyConsumers.length} unhealthy consumers`);
    }
  }

  private async checkMemory(): Promise<void> {
    const memory = process.memoryUsage();
    const memoryUsageMB = memory.heapUsed / 1024 / 1024;
    
    // 检查内存使用是否超过阈值(400MB警告)
    if (memoryUsageMB > 400) {
      throw new Error(`High memory usage: ${Math.round(memoryUsageMB)}MB`);
    }
  }

  private async checkDependencies(): Promise<void> {
    // 检查关键服务依赖
    const dependencies = [
      { name: 'auth-service', url: process.env.AUTH_SERVICE_URL },
      { name: 'user-service', url: process.env.USER_SERVICE_URL },
      { name: 'audit-service', url: process.env.AUDIT_SERVICE_URL },
      { name: 'notification-service', url: process.env.NOTIFICATION_SERVICE_URL }
    ];

    for (const dep of dependencies) {
      if (dep.url) {
        try {
          const response = await fetch(`${dep.url}/health`, { timeout: 3000 });
          if (!response.ok) {
            throw new Error(`${dep.name} health check failed`);
          }
        } catch (error) {
          // 依赖服务不可用时只记录警告，不影响自身健康状态
          console.warn(`Dependency ${dep.name} is unavailable:`, error.message);
        }
      }
    }
  }

  private async getHealthMetrics(): Promise<any> {
    const metrics = await this.messageQueueService.getMetrics();
    const memory = process.memoryUsage();
    
    return {
      messageQueue: {
        totalQueues: metrics.totalQueues,
        totalMessages: metrics.totalMessages,
        pendingMessages: metrics.pendingMessages,
        processingRate: metrics.processingRate,
        errorRate: metrics.errorRate,
        averageLatency: metrics.averageLatency
      },
      consumers: {
        activeConsumers: metrics.activeConsumers,
        totalLag: metrics.totalLag
      },
      system: {
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024),
          total: Math.round(memory.heapTotal / 1024 / 1024),
          usage: Math.round((memory.heapUsed / memory.heapTotal) * 100)
        },
        uptime: process.uptime(),
        cpu: process.cpuUsage()
      }
    };
  }

  private async getQueuesInfo(): Promise<any> {
    const queues = await this.messageQueueService.getActiveQueues();
    const queuesInfo = [];

    for (const queue of queues) {
      try {
        const streamInfo = await this.redis.xinfo('STREAM', queue.name);
        queuesInfo.push({
          name: queue.name,
          length: streamInfo.length,
          lastGeneratedId: streamInfo['last-generated-id'],
          groups: streamInfo['groups']
        });
      } catch (error) {
        queuesInfo.push({
          name: queue.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return queuesInfo;
  }
}

// 健康检查响应接口
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  responseTime: number;
  checks: {
    redisStreams: string;
    database: string;
    queues: string;
    consumers: string;
    memory: string;
    dependencies: string;
  };
  metrics: any;
}

interface MessageQueueStatusResponse {
  service: string;
  status: string;
  timestamp: string;
  redis: {
    version: string;
    uptime: number;
    connectedClients: number;
    usedMemory: string;
    totalCommandsProcessed: number;
  };
  queues: any[];
  application: {
    nodeVersion: string;
    pid: number;
    uptime: number;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  };
}
```

### 健康检查特性
- **Redis连通性检查**: 测试Redis Streams读写操作
- **数据库连接状态**: 验证PostgreSQL连接
- **队列状态监控**: 检查所有活跃队列的健康状态
- **消费者健康状态**: 监控消费者组的心跳和处理状态
- **内存使用监控**: 防止内存泄漏和过度使用
- **依赖服务检查**: 验证关键服务的可用性

## 🐳 部署配置

### Docker Compose配置
```yaml
# docker-compose.yml
services:
  message-queue-service:
    build: ./message-queue-service
    container_name: message-queue-service
    ports:
      - "3010:3010"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://platform_user:platform_pass@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379/10
      - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-management-service:3003
      - AUDIT_SERVICE_URL=http://audit-service:3008
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
      - MESSAGE_BATCH_SIZE=50
      - MAX_CONCURRENT_CONSUMERS=5
      - PROCESSING_TIMEOUT_MS=15000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - platform-network
    deploy:
      resources:
        limits:
          memory: 768M
          cpus: '0.75'
        reservations:
          memory: 384M
          cpus: '0.5'
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3010/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 环境变量配置
```env
NODE_ENV=production
PORT=3010
DATABASE_URL=postgresql://platform_user:platform_pass@postgres:5432/platform_db
REDIS_URL=redis://redis:6379/10
REDIS_KEY_PREFIX=mq:
INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
MAX_MESSAGE_SIZE=1048576  # 1MB
DEFAULT_TTL=604800       # 7天
MAX_QUEUE_LENGTH=10000
CONSUMER_TIMEOUT=30000
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
```

## 🧪 测试策略

### 单元测试
- 消息发布/订阅逻辑测试
- Redis Streams操作测试
- 序列化/反序列化测试
- 错误处理测试

### 集成测试
- 与Redis集成测试
- 与PostgreSQL集成测试
- 服务间通信测试
- API端点测试

### 性能测试
- 消息吞吐量测试 (目标1000 QPS)
- 延迟测试 (目标P95 < 50ms)
- 并发消费者测试
- 内存使用测试 (目标512MB)

## 📅 项目规划

### 开发周期
**Week 3-4** (标准版本4周计划)
- **优先级**: ⭐⭐⭐⭐ (Week 3-4 扩展服务)
- **内存分配**: 768MB (总计8GB中的分配)
- **API端点**: 14个核心端点

### 里程碑设置
- **Week 3.1**: 基础消息操作实现 (发布/订阅)
- **Week 3.2**: Redis Streams集成完成
- **Week 3.3**: 队列管理和监控功能
- **Week 3.4**: 健康检查和服务集成
- **Week 4.1**: 性能优化和错误处理
- **Week 4.2**: 综合测试和部署验证

### 风险评估
- **技术风险**: Redis Streams学习曲线 - 中等风险
- **依赖风险**: 需要认证服务先完成 - 低风险
- **集成风险**: 与所有服务都有消息交互 - 高风险
- **性能风险**: 10万用户消息量 - 中等风险

## ✅ 开发完成情况总结

### 架构设计阶段 ✅ 已完成
- ✅ 系统架构设计：简化的Redis Streams架构，避免Kafka复杂性
- ✅ 数据库设计：完整的PostgreSQL表结构设计(4个核心表)
- ✅ API设计：14个RESTful接口，涵盖4个功能模块
- ✅ 安全架构设计：服务间认证、消息加密、访问控制
- ✅ 性能规划：针对标准版本规模的批量处理和连接池设计

### 技术架构优化
1. **移除过度复杂性**：从Kafka混合架构简化为Redis Streams单一架构
2. **统一基础设施**：共享PostgreSQL和Redis实例，降低运维复杂度
3. **Docker Compose优化**：避免K8S，使用容器编排进行服务发现

### 服务集成增强
1. **内部API设计**：定义与其他11个服务的消息交互接口
2. **统一错误处理**：标准化错误响应格式和重试机制
3. **健康检查集成**：与监控服务(3007)深度集成

### 标准版本适配
1. **性能目标明确**：日处理100万消息，支持1000 QPS
2. **资源配置优化**：512MB内存分配，适合8GB总内存限制
3. **部署简化**：单一Docker Compose文件，避免多组件依赖

通过标准版本优化，消息队列服务现在具备了生产级别的架构设计、明确的开发路径和完整的集成方案，能够在4周开发计划中高质量交付。