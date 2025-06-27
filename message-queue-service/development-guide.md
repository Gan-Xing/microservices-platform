# 消息队列服务开发文档 - 标准版本

## 服务概述

消息队列服务是微服务平台的消息中间件核心，面向**100租户+10万用户**的企业级生产系统，负责异步消息传递、服务解耦、事件驱动架构和可靠消息传输，为整个平台提供高性能、高可用的消息通信能力。

### 🎯 标准版本定位
- **消息处理**: 日处理100万条消息，支持标准版本并发
- **可靠性**: 99.9%消息可靠性，支持消息持久化
- **延迟要求**: 消息延迟<10ms，实时消息处理
- **队列管理**: 支持多种队列类型，智能路由分发
- **部署方式**: Docker Compose + Redis Streams

## 技术栈

### 后端技术 (标准版本)
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (元数据) + Redis 7+ (消息存储)
- **ORM**: Prisma ORM
- **消息中间件**: Redis Streams (主要) + Redis Pub/Sub (辅助)
- **客户端**: ioredis + Redis Bull Queue
- **企业版功能**: Apache Kafka 3.5+ (企业版保留)

### 消息技术 (标准版本)
- **Redis Streams**: 主要消息队列 (适合标准版本规模)
- **Redis Pub/Sub**: 实时通知、轻量级消息
- **协调器**: Redis 分布式锁 + 消费者组
- **监控**: Redis Commander + Custom Metrics
- **序列化**: JSON (简化序列化)

## 核心功能模块

### 1. 队列管理
```typescript
// 队列管理接口
POST   /api/v1/mq/queues                     // 创建队列
GET    /api/v1/mq/queues                     // 获取队列列表
GET    /api/v1/mq/queues/{name}              // 获取队列详情
PUT    /api/v1/mq/queues/{name}              // 更新队列配置
DELETE /api/v1/mq/queues/{name}              // 删除队列
POST   /api/v1/mq/queues/{name}/purge        // 清空队列
```

### 2. 消息发布
```typescript
// 消息发布接口
POST   /api/v1/mq/publish                    // 发布单条消息
POST   /api/v1/mq/publish/batch              // 批量发布消息
POST   /api/v1/mq/publish/delayed            // 延迟消息发布
POST   /api/v1/mq/publish/scheduled          // 定时消息发布
POST   /api/v1/mq/topics/{name}/publish      // 发布到指定主题
```

### 3. 消息订阅
```typescript
// 消息订阅管理
POST   /api/v1/mq/subscriptions              // 创建订阅
GET    /api/v1/mq/subscriptions              // 获取订阅列表
GET    /api/v1/mq/subscriptions/{id}         // 获取订阅详情
PUT    /api/v1/mq/subscriptions/{id}         // 更新订阅
DELETE /api/v1/mq/subscriptions/{id}         // 删除订阅
POST   /api/v1/mq/subscriptions/{id}/pause   // 暂停订阅
POST   /api/v1/mq/subscriptions/{id}/resume  // 恢复订阅
```

### 4. 监控统计
```typescript
// 监控统计接口
GET    /api/v1/mq/metrics                    // 获取系统指标
GET    /api/v1/mq/metrics/topics             // 获取主题指标
GET    /api/v1/mq/metrics/consumers          // 获取消费者指标
GET    /api/v1/mq/health                     // 健康检查
GET    /api/v1/mq/status                     // 服务状态
```

## 数据库设计

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

## 消息架构设计

### Kafka + Redis 混合架构
```mermaid
graph TB
    Producer[消息生产者] --> Router[消息路由器]
    Router --> KafkaCheck{消息类型判断}
    Router --> RedisCheck{消息类型判断}
    
    KafkaCheck -->|业务事件| KafkaCluster[Kafka集群]
    KafkaCheck -->|数据流| KafkaCluster
    KafkaCheck -->|大批量消息| KafkaCluster
    
    RedisCheck -->|实时通知| RedisStreams[Redis Streams]
    RedisCheck -->|系统消息| RedisStreams
    RedisCheck -->|轻量消息| RedisStreams
    
    KafkaCluster --> KafkaConsumer[Kafka消费者]
    RedisStreams --> RedisConsumer[Redis消费者]
    
    KafkaConsumer --> MessageProcessor[消息处理器]
    RedisConsumer --> MessageProcessor
    
    MessageProcessor --> DeadLetter[死信队列]
    MessageProcessor --> Metrics[监控指标]
    MessageProcessor --> AuditLog[审计日志]
```

### 消息路由策略
```typescript
@Injectable()
export class MessageRouter {
  routeMessage(message: Message): MessageBackend {
    // 基于消息类型路由
    if (this.isHighThroughputMessage(message)) {
      return MessageBackend.KAFKA;
    }
    
    // 基于消息大小路由
    if (message.size > this.config.LARGE_MESSAGE_THRESHOLD) {
      return MessageBackend.KAFKA;
    }
    
    // 基于持久化要求路由
    if (message.headers.persistence === 'durable') {
      return MessageBackend.KAFKA;
    }
    
    // 基于实时性要求路由
    if (message.headers.priority === 'realtime') {
      return MessageBackend.REDIS;
    }
    
    // 默认使用Redis处理轻量消息
    return MessageBackend.REDIS;
  }
  
  private isHighThroughputMessage(message: Message): boolean {
    const highThroughputTypes = [
      'user.behavior',
      'system.metrics',
      'audit.log',
      'data.sync'
    ];
    
    return highThroughputTypes.includes(message.type);
  }
}
```

## Kafka集成实现

### Kafka生产者
```typescript
@Injectable()
export class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
  
  constructor() {
    this.kafka = new Kafka({
      clientId: 'message-queue-service',
      brokers: process.env.KAFKA_BROKERS.split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        retryOnFailure: true
      }
    });
    
    this.producer = this.kafka.producer({
      transactionTimeout: 30000,
      maxInFlightRequests: 5,
      idempotent: true, // 确保幂等性
      compression: CompressionTypes.GZIP
    });
  }
  
  async publishMessage(topic: string, message: MessagePayload): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{
        key: message.key,
        value: JSON.stringify(message.payload),
        headers: message.headers,
        partition: message.partition,
        timestamp: message.timestamp?.toString()
      }]
    });
  }
  
  async publishBatch(topic: string, messages: MessagePayload[]): Promise<void> {
    const kafkaMessages = messages.map(msg => ({
      key: msg.key,
      value: JSON.stringify(msg.payload),
      headers: msg.headers,
      partition: msg.partition
    }));
    
    await this.producer.sendBatch({
      topicMessages: [{
        topic,
        messages: kafkaMessages
      }]
    });
  }
  
  async publishWithTransaction(
    operations: Array<{ topic: string; messages: MessagePayload[] }>
  ): Promise<void> {
    const transaction = await this.producer.transaction();
    
    try {
      for (const operation of operations) {
        await transaction.send({
          topic: operation.topic,
          messages: operation.messages.map(msg => ({
            key: msg.key,
            value: JSON.stringify(msg.payload),
            headers: msg.headers
          }))
        });
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }
}
```

### Kafka消费者
```typescript
@Injectable()
export class KafkaConsumerService {
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  
  async createConsumer(config: KafkaConsumerConfig): Promise<void> {
    const consumer = this.kafka.consumer({
      groupId: config.consumerGroup,
      sessionTimeout: config.sessionTimeoutMs || 30000,
      heartbeatInterval: config.heartbeatIntervalMs || 3000,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: false
    });
    
    await consumer.subscribe({
      topics: config.topics,
      fromBeginning: config.offsetResetPolicy === 'earliest'
    });
    
    await consumer.run({
      autoCommit: false,
      partitionsConsumedConcurrently: config.maxConcurrency || 1,
      eachMessage: async ({ topic, partition, message }) => {
        await this.processMessage({
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
          value: message.value?.toString(),
          headers: message.headers,
          timestamp: message.timestamp
        }, config);
      }
    });
    
    this.consumers.set(config.consumerGroup, consumer);
  }
  
  private async processMessage(
    message: KafkaMessage, 
    config: KafkaConsumerConfig
  ): Promise<void> {
    const startTime = Date.now();
    let retryCount = 0;
    
    while (retryCount <= config.maxRetryAttempts) {
      try {
        await this.executeHandler(message, config.handlerConfig);
        
        // 记录成功消费
        await this.recordConsumption(message, 'success', Date.now() - startTime);
        
        // 提交offset
        await this.commitMessage(message, config);
        break;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount > config.maxRetryAttempts) {
          // 发送到死信队列
          await this.sendToDeadLetterQueue(message, error, config);
          await this.recordConsumption(message, 'failed', Date.now() - startTime, error);
        } else {
          // 等待重试
          await this.delay(config.retryDelayMs * Math.pow(2, retryCount - 1));
        }
      }
    }
  }
}
```

## Redis Streams实现

### Redis生产者
```typescript
@Injectable()
export class RedisProducerService {
  constructor(private readonly redis: Redis) {}
  
  async publishToStream(
    stream: string, 
    data: Record<string, any>,
    options?: StreamPublishOptions
  ): Promise<string> {
    const fields = this.flattenObject(data);
    
    const messageId = await this.redis.xadd(
      stream,
      options?.messageId || '*', // 使用自动生成的ID
      ...Object.entries(fields).flat()
    );
    
    // 设置流的最大长度（可选）
    if (options?.maxLength) {
      await this.redis.xtrim(stream, 'MAXLEN', '~', options.maxLength);
    }
    
    return messageId;
  }
  
  async publishBatchToStream(
    stream: string,
    messages: Array<Record<string, any>>
  ): Promise<string[]> {
    const pipeline = this.redis.pipeline();
    
    messages.forEach(message => {
      const fields = this.flattenObject(message);
      pipeline.xadd(stream, '*', ...Object.entries(fields).flat());
    });
    
    const results = await pipeline.exec();
    return results.map(result => result[1] as string);
  }
  
  private flattenObject(obj: Record<string, any>): Record<string, string> {
    const flattened: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        flattened[key] = JSON.stringify(value);
      } else {
        flattened[key] = String(value);
      }
    }
    
    return flattened;
  }
}
```

### Redis消费者
```typescript
@Injectable()
export class RedisConsumerService {
  private activeConsumers: Map<string, boolean> = new Map();
  
  async createConsumerGroup(
    stream: string,
    group: string,
    startId: string = '0'
  ): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', stream, group, startId, 'MKSTREAM');
    } catch (error) {
      // 忽略已存在的错误
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }
  
  async startConsumer(config: RedisConsumerConfig): Promise<void> {
    const consumerKey = `${config.stream}:${config.group}:${config.consumer}`;
    
    if (this.activeConsumers.get(consumerKey)) {
      throw new Error(`Consumer ${consumerKey} is already running`);
    }
    
    this.activeConsumers.set(consumerKey, true);
    
    // 启动消费循环
    this.consumeLoop(config);
  }
  
  private async consumeLoop(config: RedisConsumerConfig): Promise<void> {
    const consumerKey = `${config.stream}:${config.group}:${config.consumer}`;
    
    while (this.activeConsumers.get(consumerKey)) {
      try {
        // 读取新消息
        const results = await this.redis.xreadgroup(
          'GROUP', config.group, config.consumer,
          'COUNT', config.batchSize || 10,
          'BLOCK', config.blockTimeMs || 1000,
          'STREAMS', config.stream, '>'
        );
        
        if (results && results.length > 0) {
          const [, messages] = results[0];
          await this.processMessages(messages, config);
        }
        
        // 处理待确认的消息
        await this.processPendingMessages(config);
        
      } catch (error) {
        console.error(`Redis consumer error:`, error);
        await this.delay(config.errorDelayMs || 5000);
      }
    }
  }
  
  private async processMessages(
    messages: Array<[string, string[]]>,
    config: RedisConsumerConfig
  ): Promise<void> {
    for (const [messageId, fields] of messages) {
      try {
        const data = this.parseFields(fields);
        await this.executeHandler(data, config.handlerConfig);
        
        // 确认消息处理完成
        await this.redis.xack(config.stream, config.group, messageId);
        
      } catch (error) {
        console.error(`Message processing error:`, error);
        // 不确认消息，让它保持在pending状态
      }
    }
  }
  
  private async processPendingMessages(config: RedisConsumerConfig): Promise<void> {
    const pendingMessages = await this.redis.xpending(
      config.stream,
      config.group,
      '-', '+', 10 // 获取最多10条pending消息
    );
    
    for (const pending of pendingMessages) {
      const [messageId, , idleTime] = pending;
      
      // 如果消息空闲时间超过阈值，重新处理
      if (idleTime > (config.maxIdleTimeMs || 60000)) {
        try {
          const messages = await this.redis.xclaim(
            config.stream,
            config.group,
            config.consumer,
            config.maxIdleTimeMs || 60000,
            messageId
          );
          
          if (messages.length > 0) {
            await this.processMessages(messages, config);
          }
        } catch (error) {
          console.error(`Pending message processing error:`, error);
        }
      }
    }
  }
  
  private parseFields(fields: string[]): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      
      try {
        // 尝试解析JSON
        data[key] = JSON.parse(value);
      } catch {
        // 如果不是JSON，保持字符串
        data[key] = value;
      }
    }
    
    return data;
  }
}
```

## 消息处理器框架

### 处理器注册
```typescript
@Injectable()
export class MessageHandlerRegistry {
  private handlers: Map<string, MessageHandler> = new Map();
  
  registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }
  
  async executeHandler(
    message: Message,
    config: HandlerConfig
  ): Promise<void> {
    const handler = this.handlers.get(config.handlerType);
    
    if (!handler) {
      throw new Error(`No handler found for type: ${config.handlerType}`);
    }
    
    // 执行前置处理
    await this.preProcess(message, config);
    
    // 执行主处理逻辑
    const result = await handler.handle(message, config);
    
    // 执行后置处理
    await this.postProcess(message, result, config);
  }
  
  private async preProcess(message: Message, config: HandlerConfig): Promise<void> {
    // 消息验证
    if (config.schema) {
      await this.validateMessage(message, config.schema);
    }
    
    // 消息过滤
    if (config.filter) {
      const shouldProcess = await this.applyFilter(message, config.filter);
      if (!shouldProcess) {
        throw new MessageFilteredException('Message filtered out');
      }
    }
    
    // 消息转换
    if (config.transformer) {
      await this.transformMessage(message, config.transformer);
    }
  }
}
```

### 具体处理器实现
```typescript
// HTTP回调处理器
@Injectable()
export class HttpCallbackHandler implements MessageHandler {
  async handle(message: Message, config: HttpCallbackConfig): Promise<any> {
    const response = await this.httpService.post(config.url, {
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: message.payload,
      timeout: config.timeoutMs || 30000
    });
    
    if (response.status >= 400) {
      throw new Error(`HTTP callback failed: ${response.status}`);
    }
    
    return response.data;
  }
}

// 函数处理器
@Injectable()
export class FunctionHandler implements MessageHandler {
  async handle(message: Message, config: FunctionConfig): Promise<any> {
    const module = await import(config.modulePath);
    const func = module[config.functionName];
    
    if (typeof func !== 'function') {
      throw new Error(`Function ${config.functionName} not found`);
    }
    
    return await func(message.payload, message.headers);
  }
}

// 数据库处理器
@Injectable()
export class DatabaseHandler implements MessageHandler {
  async handle(message: Message, config: DatabaseConfig): Promise<any> {
    const entity = this.mapMessageToEntity(message.payload, config.mapping);
    
    switch (config.operation) {
      case 'insert':
        return await this.repository.insert(entity);
      case 'update':
        return await this.repository.update(config.criteria, entity);
      case 'delete':
        return await this.repository.delete(config.criteria);
      default:
        throw new Error(`Unsupported operation: ${config.operation}`);
    }
  }
}
```

## 消息序列化

### 多格式支持
```typescript
@Injectable()
export class MessageSerializer {
  serialize(data: any, format: SerializationFormat): Buffer {
    switch (format) {
      case SerializationFormat.JSON:
        return Buffer.from(JSON.stringify(data));
        
      case SerializationFormat.AVRO:
        return this.avroSerializer.serialize(data);
        
      case SerializationFormat.PROTOBUF:
        return this.protobufSerializer.serialize(data);
        
      case SerializationFormat.MSGPACK:
        return msgpack.encode(data);
        
      default:
        throw new Error(`Unsupported serialization format: ${format}`);
    }
  }
  
  deserialize(buffer: Buffer, format: SerializationFormat): any {
    switch (format) {
      case SerializationFormat.JSON:
        return JSON.parse(buffer.toString());
        
      case SerializationFormat.AVRO:
        return this.avroSerializer.deserialize(buffer);
        
      case SerializationFormat.PROTOBUF:
        return this.protobufSerializer.deserialize(buffer);
        
      case SerializationFormat.MSGPACK:
        return msgpack.decode(buffer);
        
      default:
        throw new Error(`Unsupported serialization format: ${format}`);
    }
  }
}
```

### Schema管理
```typescript
@Injectable()
export class SchemaRegistry {
  private schemas: Map<string, any> = new Map();
  
  async registerSchema(
    subject: string,
    schema: any,
    format: SchemaFormat
  ): Promise<string> {
    const schemaId = this.generateSchemaId(subject, schema);
    
    // 验证schema
    await this.validateSchema(schema, format);
    
    // 检查兼容性
    await this.checkCompatibility(subject, schema);
    
    // 存储schema
    this.schemas.set(schemaId, {
      subject,
      schema,
      format,
      version: await this.getNextVersion(subject),
      createdAt: new Date()
    });
    
    return schemaId;
  }
  
  async getSchema(schemaId: string): Promise<any> {
    const schemaInfo = this.schemas.get(schemaId);
    if (!schemaInfo) {
      throw new Error(`Schema not found: ${schemaId}`);
    }
    return schemaInfo.schema;
  }
}
```

## 监控和指标

### 系统指标
```typescript
interface MessageQueueMetrics {
  // Kafka指标
  kafkaTopics: {
    totalTopics: number;
    totalPartitions: number;
    totalMessages: number;
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
  
  // Redis指标
  redisStreams: {
    totalStreams: number;
    totalConsumerGroups: number;
    totalMessages: number;
    pendingMessages: number;
  };
  
  // 消费者指标
  consumers: {
    activeConsumers: number;
    totalLag: number;
    processingRate: number;
    errorRate: number;
  };
  
  // 性能指标
  performance: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
  };
}

@Injectable()
export class MetricsCollector {
  private prometheusRegistry = new Registry();
  
  constructor() {
    this.setupMetrics();
  }
  
  private setupMetrics(): void {
    // 消息计数器
    this.messageCounter = new Counter({
      name: 'mq_messages_total',
      help: 'Total number of messages',
      labelNames: ['topic', 'type', 'status', 'tenant_id'],
      registers: [this.prometheusRegistry]
    });
    
    // 消息延迟直方图
    this.latencyHistogram = new Histogram({
      name: 'mq_message_latency_seconds',
      help: 'Message processing latency',
      labelNames: ['topic', 'handler_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.prometheusRegistry]
    });
    
    // 队列大小gauge
    this.queueSizeGauge = new Gauge({
      name: 'mq_queue_size',
      help: 'Current queue size',
      labelNames: ['queue_name', 'type'],
      registers: [this.prometheusRegistry]
    });
  }
  
  recordMessage(
    topic: string,
    type: string,
    status: 'published' | 'consumed' | 'failed',
    tenantId: string
  ): void {
    this.messageCounter.inc({
      topic,
      type,
      status,
      tenant_id: tenantId
    });
  }
  
  recordLatency(
    topic: string,
    handlerType: string,
    latencySeconds: number
  ): void {
    this.latencyHistogram.observe(
      { topic, handler_type: handlerType },
      latencySeconds
    );
  }
}
```

### 健康检查
```typescript
@Injectable()
export class HealthCheckService {
  async checkKafkaHealth(): Promise<HealthStatus> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.fetchTopicMetadata();
      await admin.disconnect();
      
      return {
        status: 'healthy',
        details: {
          brokers: metadata.brokers.length,
          topics: metadata.topics.length
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  async checkRedisHealth(): Promise<HealthStatus> {
    try {
      const pong = await this.redis.ping();
      const info = await this.redis.info('memory');
      
      return {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        details: {
          ping: pong,
          memory: this.parseRedisInfo(info)
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
```

## 错误处理和重试

### 死信队列
```typescript
@Injectable()
export class DeadLetterQueueService {
  async sendToDeadLetter(
    originalMessage: Message,
    error: Error,
    config: ConsumerConfig
  ): Promise<void> {
    const deadLetterMessage = {
      originalTopic: originalMessage.topic,
      originalPartition: originalMessage.partition,
      originalOffset: originalMessage.offset,
      originalTimestamp: originalMessage.timestamp,
      failureReason: error.message,
      failureStack: error.stack,
      retryCount: originalMessage.retryCount || 0,
      payload: originalMessage.payload,
      headers: originalMessage.headers,
      failedAt: new Date().toISOString()
    };
    
    const deadLetterTopic = config.deadLetterQueue || `${originalMessage.topic}.deadletter`;
    
    await this.publishMessage(deadLetterTopic, deadLetterMessage);
    
    // 记录死信消息
    await this.recordDeadLetterMessage(deadLetterMessage);
  }
  
  async reprocessDeadLetterMessages(
    deadLetterTopic: string,
    maxMessages: number = 100
  ): Promise<void> {
    const messages = await this.consumeMessages(deadLetterTopic, maxMessages);
    
    for (const message of messages) {
      try {
        const originalTopic = message.payload.originalTopic;
        const originalPayload = message.payload.payload;
        
        // 重新发布到原始主题
        await this.publishMessage(originalTopic, originalPayload);
        
        // 确认死信消息处理完成
        await this.acknowledgeMessage(message);
        
      } catch (error) {
        console.error('Failed to reprocess dead letter message:', error);
      }
    }
  }
}
```

## API设计规范

### 消息发布接口
```typescript
interface PublishMessageRequest {
  topic: string;
  messages: Array<{
    key?: string;
    payload: any;
    headers?: Record<string, string>;
    partition?: number;
    timestamp?: number;
  }>;
  options?: {
    compression?: 'none' | 'gzip' | 'snappy' | 'lz4';
    acks?: 'all' | 0 | 1;
    timeout?: number;
  };
}

interface PublishMessageResponse {
  messageIds: string[];
  partitions: Array<{
    partition: number;
    offset: number;
  }>;
  timestamp: number;
}
```

### 错误响应格式
```typescript
enum MessageQueueErrorCode {
  TOPIC_NOT_FOUND = 'TOPIC_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  BROKER_NOT_AVAILABLE = 'BROKER_NOT_AVAILABLE'
}
```

## 部署配置

### 环境变量
```env
# Kafka配置
KAFKA_BROKERS=localhost:9092,localhost:9093,localhost:9094
KAFKA_CLIENT_ID=message-queue-service
KAFKA_COMPRESSION_TYPE=gzip
KAFKA_BATCH_SIZE=16384
KAFKA_LINGER_MS=5

# Redis配置
REDIS_CLUSTER_NODES=localhost:7001,localhost:7002,localhost:7003
REDIS_PASSWORD=your_redis_password
REDIS_MAX_RETRIES=3

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/messagequeue

# 监控配置
METRICS_ENABLED=true
PROMETHEUS_PORT=9465
HEALTH_CHECK_PORT=8081

# 性能调优
MAX_CONCURRENT_CONSUMERS=10
MESSAGE_BATCH_SIZE=100
PROCESSING_TIMEOUT_MS=30000
```

### Docker Compose配置
```yaml
version: '3.8'
services:
  message-queue-service:
    build: .
    ports:
      - "3010:3010"
      - "9465:9465"
    environment:
      - KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
      - REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379
    depends_on:
      - kafka1
      - kafka2
      - kafka3
      - redis1
      - redis2
      - redis3
      
  kafka1:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka1:9092
      KAFKA_BROKER_ID: 1
      
  redis1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
```

## 性能优化

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
  
  private async processBatch(batch: MessageBatch): Promise<void> {
    try {
      await this.publishBatch(batch.topic, batch.messages);
      batch.markAsProcessed();
    } catch (error) {
      batch.markAsFailed(error);
      await this.handleBatchError(batch, error);
    }
  }
}
```

### 连接池管理
```typescript
@Injectable()
export class ConnectionPoolManager {
  private kafkaProducers: Pool<Producer>;
  private redisConnections: Pool<Redis>;
  
  constructor() {
    this.kafkaProducers = new Pool({
      create: () => this.createKafkaProducer(),
      destroy: (producer) => producer.disconnect(),
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000
    });
    
    this.redisConnections = new Pool({
      create: () => this.createRedisConnection(),
      destroy: (redis) => redis.disconnect(),
      min: 5,
      max: 20,
      acquireTimeoutMillis: 10000,
      idleTimeoutMillis: 60000
    });
  }
  
  async withKafkaProducer<T>(operation: (producer: Producer) => Promise<T>): Promise<T> {
    const producer = await this.kafkaProducers.acquire();
    try {
      return await operation(producer);
    } finally {
      this.kafkaProducers.release(producer);
    }
  }
}
```

## 安全考虑

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
  
  async decryptMessage(encryptedPayload: string, tenantKey: string): Promise<any> {
    const { data, authTag } = JSON.parse(
      Buffer.from(encryptedPayload, 'base64').toString()
    );
    
    const decipher = crypto.createDecipher('aes-256-gcm', tenantKey);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    const decrypted = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
  }
}
```

### 访问控制
```typescript
@Injectable()
export class MessageAccessControl {
  async checkPublishPermission(
    userId: string,
    topic: string,
    tenantId: string
  ): Promise<boolean> {
    const topicConfig = await this.getTopicConfig(topic);
    
    // 检查租户权限
    if (topicConfig.tenantId !== tenantId) {
      return false;
    }
    
    // 检查生产者权限
    if (topicConfig.allowedProducers.length > 0) {
      return topicConfig.allowedProducers.includes(userId);
    }
    
    return true;
  }
  
  async checkConsumePermission(
    userId: string,
    topic: string,
    tenantId: string
  ): Promise<boolean> {
    const topicConfig = await this.getTopicConfig(topic);
    
    // 检查租户权限
    if (topicConfig.tenantId !== tenantId && !topicConfig.isPublic) {
      return false;
    }
    
    // 检查消费者权限
    if (topicConfig.allowedConsumers.length > 0) {
      return topicConfig.allowedConsumers.includes(userId);
    }
    
    return true;
  }
}
```

通过这样的设计，消息队列服务能够提供高性能、高可用、可扩展的消息传递能力，满足企业级应用的各种消息通信需求。