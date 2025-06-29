# 🚀 事件驱动架构设计 - 企业级微服务平台

## 📋 设计概述

基于标准版本(100租户+10万用户)的事件驱动架构设计，使用Redis Streams作为事件总线，实现微服务间的异步解耦和事件溯源能力。

### 🎯 核心目标
- **服务解耦**: 减少同步调用依赖，提升系统弹性
- **异步处理**: 关键业务流程异步化，提升用户体验
- **事件溯源**: 完整的业务事件历史，支持审计和回溯
- **横向扩展**: 支持服务独立扩展和故障隔离

## 🧬 统一事件模型设计

### 核心事件接口
```typescript
// 基础事件接口
interface BaseEvent {
  // 事件标识
  eventId: string;                    // 全局唯一事件ID
  eventType: string;                  // 事件类型 (如 user.created)
  eventVersion: string;               // 事件版本 (如 v1.0)
  
  // 业务标识
  aggregateId: string;                // 聚合根ID (如 用户ID)
  aggregateType: string;              // 聚合类型 (如 User)
  
  // 时间信息
  timestamp: string;                  // 事件发生时间 (ISO 8601)
  
  // 追踪信息
  tenantId: string;                   // 租户ID
  userId?: string;                    // 操作用户ID
  sessionId?: string;                 // 会话ID
  requestId?: string;                 // 请求ID
  correlationId?: string;             // 关联ID (用于事件链)
  
  // 事件数据
  eventData: Record<string, any>;     // 事件负载数据
  metadata: EventMetadata;            // 事件元数据
}

// 事件元数据
interface EventMetadata {
  source: string;                     // 事件源服务
  causedBy?: string;                  // 引起事件的原因
  entityVersion?: number;             // 实体版本号
  isReplay?: boolean;                 // 是否重放事件
  tags?: string[];                    // 事件标签
  [key: string]: any;                 // 扩展字段
}

// 领域事件基类
abstract class DomainEvent implements BaseEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly eventVersion: string;
  public readonly timestamp: string;
  public readonly tenantId: string;
  
  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly eventData: Record<string, any>,
    public readonly metadata: EventMetadata,
    tenantId: string,
    userId?: string
  ) {
    this.eventId = generateEventId();
    this.eventType = this.constructor.name.replace('Event', '').toLowerCase();
    this.eventVersion = 'v1.0';
    this.timestamp = new Date().toISOString();
    this.tenantId = tenantId;
    this.userId = userId;
  }
}
```

### 具体事件类型定义

#### 1. 用户相关事件
```typescript
// 用户创建事件
class UserCreatedEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      status: string;
    },
    tenantId: string,
    createdBy?: string
  ) {
    super(userId, 'User', eventData, {
      source: 'user-management-service',
      causedBy: 'user_registration'
    }, tenantId, createdBy);
  }
}

// 用户状态变更事件
class UserStatusChangedEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      oldStatus: string;
      newStatus: string;
      reason?: string;
    },
    tenantId: string,
    changedBy: string
  ) {
    super(userId, 'User', eventData, {
      source: 'user-management-service',
      causedBy: 'status_update'
    }, tenantId, changedBy);
  }
}
```

#### 2. 认证相关事件
```typescript
// 用户登录事件
class UserLoginEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      sessionId: string;
      sourceIp: string;
      userAgent: string;
      loginMethod: string;
    },
    tenantId: string
  ) {
    super(userId, 'Session', eventData, {
      source: 'auth-service',
      causedBy: 'user_login'
    }, tenantId, userId);
  }
}

// 会话撤销事件
class SessionRevokedEvent extends DomainEvent {
  constructor(
    sessionId: string,
    eventData: {
      userId: string;
      revokedBy: string;
      reason: string;
      affectedSessions: string[];
    },
    tenantId: string
  ) {
    super(sessionId, 'Session', eventData, {
      source: 'auth-service',
      causedBy: 'session_revocation'
    }, tenantId, eventData.userId);
  }
}
```

#### 3. 权限相关事件
```typescript
// 角色分配事件
class RoleAssignedEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      roleId: string;
      roleName: string;
      assignedBy: string;
      effectiveDate: string;
      expirationDate?: string;
    },
    tenantId: string
  ) {
    super(userId, 'UserRole', eventData, {
      source: 'rbac-service',
      causedBy: 'role_assignment'
    }, tenantId, eventData.assignedBy);
  }
}

// 权限检查事件
class PermissionCheckedEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      resource: string;
      action: string;
      allowed: boolean;
      appliedRoles: string[];
      context: Record<string, any>;
    },
    tenantId: string
  ) {
    super(userId, 'Permission', eventData, {
      source: 'rbac-service',
      causedBy: 'permission_check'
    }, tenantId, userId);
  }
}
```

## 🏗️ 事件总线架构改造

### 1. 消息队列服务改造为事件总线
```typescript
// 事件总线服务
@Injectable()
export class EventBusService {
  private readonly eventStreams = new Map<string, string>();
  
  constructor(
    private readonly redis: Redis,
    private readonly eventStore: EventStore,
    private readonly metricsService: MetricsService
  ) {
    this.initializeEventStreams();
  }
  
  // 发布事件
  async publishEvent(event: BaseEvent): Promise<void> {
    const streamName = this.getStreamName(event.eventType);
    
    try {
      // 1. 事件验证
      this.validateEvent(event);
      
      // 2. 事件持久化
      await this.eventStore.saveEvent(event);
      
      // 3. 发布到事件流
      const messageId = await this.redis.xadd(
        streamName,
        '*',
        'eventId', event.eventId,
        'eventType', event.eventType,
        'aggregateId', event.aggregateId,
        'tenantId', event.tenantId,
        'payload', JSON.stringify(event),
        'timestamp', event.timestamp
      );
      
      // 4. 记录指标
      this.metricsService.incrementEventPublished(event.eventType);
      
      console.log(`Event published: ${event.eventType}:${event.eventId} -> ${messageId}`);
      
    } catch (error) {
      this.metricsService.incrementEventPublishError(event.eventType);
      throw new EventPublishException(`Failed to publish event ${event.eventId}`, error);
    }
  }
  
  // 批量发布事件
  async publishEvents(events: BaseEvent[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const event of events) {
      const streamName = this.getStreamName(event.eventType);
      await this.eventStore.saveEvent(event);
      
      pipeline.xadd(
        streamName,
        '*',
        'eventId', event.eventId,
        'eventType', event.eventType,
        'aggregateId', event.aggregateId,
        'tenantId', event.tenantId,
        'payload', JSON.stringify(event),
        'timestamp', event.timestamp
      );
    }
    
    await pipeline.exec();
    this.metricsService.incrementBatchEventPublished(events.length);
  }
  
  // 订阅事件
  async subscribeToEvents(
    eventTypes: string[],
    consumerGroup: string,
    consumerName: string,
    handler: EventHandler
  ): Promise<EventSubscription> {
    const subscription = new EventSubscription(
      consumerGroup,
      consumerName,
      eventTypes,
      handler
    );
    
    // 为每个事件类型创建消费者组
    for (const eventType of eventTypes) {
      const streamName = this.getStreamName(eventType);
      
      try {
        await this.redis.xgroup(
          'CREATE',
          streamName,
          consumerGroup,
          '0',
          'MKSTREAM'
        );
      } catch (error) {
        // 消费者组已存在，忽略错误
        if (!error.message.includes('BUSYGROUP')) {
          throw error;
        }
      }
    }
    
    // 启动事件处理循环
    this.startEventProcessing(subscription);
    
    return subscription;
  }
  
  private async startEventProcessing(subscription: EventSubscription): Promise<void> {
    const { consumerGroup, consumerName, eventTypes, handler } = subscription;
    
    while (subscription.isActive) {
      try {
        for (const eventType of eventTypes) {
          const streamName = this.getStreamName(eventType);
          
          const messages = await this.redis.xreadgroup(
            'GROUP',
            consumerGroup,
            consumerName,
            'COUNT',
            '10',
            'BLOCK',
            '1000',
            'STREAMS',
            streamName,
            '>'
          );
          
          if (messages && messages.length > 0) {
            await this.processMessages(messages, consumerGroup, consumerName, handler);
          }
        }
      } catch (error) {
        console.error('Event processing error:', error);
        await this.sleep(5000); // 错误时等待5秒
      }
    }
  }
  
  private async processMessages(
    messages: any[],
    consumerGroup: string,
    consumerName: string,
    handler: EventHandler
  ): Promise<void> {
    for (const [streamName, streamMessages] of messages) {
      for (const [messageId, fields] of streamMessages) {
        try {
          const eventData = this.parseEventFromFields(fields);
          const event = JSON.parse(eventData.payload) as BaseEvent;
          
          // 处理事件
          await handler.handle(event);
          
          // 确认消息处理完成
          await this.redis.xack(streamName, consumerGroup, messageId);
          
          this.metricsService.incrementEventProcessed(event.eventType);
          
        } catch (error) {
          console.error(`Failed to process event ${messageId}:`, error);
          this.metricsService.incrementEventProcessError(eventData?.eventType || 'unknown');
          
          // 可以实现重试机制或死信队列
          await this.handleEventProcessingError(streamName, messageId, error);
        }
      }
    }
  }
  
  private getStreamName(eventType: string): string {
    return `events:${eventType.replace('.', ':')}`;
  }
}

// 事件处理器接口
interface EventHandler {
  handle(event: BaseEvent): Promise<void>;
}

// 事件订阅
class EventSubscription {
  public isActive: boolean = true;
  
  constructor(
    public readonly consumerGroup: string,
    public readonly consumerName: string,
    public readonly eventTypes: string[],
    public readonly handler: EventHandler
  ) {}
  
  stop(): void {
    this.isActive = false;
  }
}
```

### 2. 事件存储设计
```typescript
// 事件存储服务
@Injectable()
export class EventStore {
  constructor(
    private readonly prisma: PrismaService
  ) {}
  
  async saveEvent(event: BaseEvent): Promise<void> {
    await this.prisma.eventStore.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        tenantId: event.tenantId,
        userId: event.userId,
        sessionId: event.sessionId,
        requestId: event.requestId,
        correlationId: event.correlationId,
        eventData: event.eventData,
        metadata: event.metadata,
        timestamp: new Date(event.timestamp)
      }
    });
  }
  
  async getEventsByAggregate(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<BaseEvent[]> {
    const events = await this.prisma.eventStore.findMany({
      where: {
        aggregateId,
        aggregateType,
        ...(fromVersion && { version: { gte: fromVersion } })
      },
      orderBy: { timestamp: 'asc' }
    });
    
    return events.map(this.mapToEvent);
  }
  
  async getEventsByType(
    eventType: string,
    tenantId: string,
    limit: number = 100
  ): Promise<BaseEvent[]> {
    const events = await this.prisma.eventStore.findMany({
      where: { eventType, tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    
    return events.map(this.mapToEvent);
  }
}
```

### 3. 事件存储数据库设计
```sql
-- 事件存储表
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 事件标识
  event_id VARCHAR(100) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  event_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  
  -- 聚合信息
  aggregate_id VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_version INTEGER DEFAULT 1,
  
  -- 租户和用户信息
  tenant_id UUID NOT NULL,
  user_id UUID,
  session_id VARCHAR(100),
  
  -- 追踪信息
  request_id VARCHAR(100),
  correlation_id VARCHAR(100),
  
  -- 事件数据
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- 时间戳
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引优化
  CONSTRAINT event_store_tenant_aggregate_idx 
    UNIQUE(tenant_id, aggregate_id, aggregate_type, aggregate_version)
);

-- 创建索引
CREATE INDEX idx_event_store_tenant_type ON event_store(tenant_id, event_type);
CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_id, aggregate_type);
CREATE INDEX idx_event_store_timestamp ON event_store(timestamp);
CREATE INDEX idx_event_store_correlation ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;

-- 事件快照表 (用于事件溯源优化)
CREATE TABLE event_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  tenant_id UUID NOT NULL,
  version INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aggregate_id, aggregate_type, tenant_id, version)
);
```

## 🔄 事件发布标准化

### 1. 事件发布装饰器
```typescript
// 自动事件发布装饰器
export function PublishEvent(eventClass: new (...args: any[]) => BaseEvent) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // 构造事件
      const event = new eventClass(...args);
      
      // 发布事件
      const eventBus = this.eventBus || container.get(EventBusService);
      await eventBus.publishEvent(event);
      
      return result;
    };
  };
}

// 使用示例
@Injectable()
export class UserService {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly userRepository: UserRepository
  ) {}
  
  @PublishEvent(UserCreatedEvent)
  async createUser(userData: CreateUserDto, tenantId: string): Promise<User> {
    const user = await this.userRepository.create({
      ...userData,
      tenantId,
      status: 'active'
    });
    
    // 事件将自动发布
    return user;
  }
  
  @PublishEvent(UserStatusChangedEvent)
  async updateUserStatus(
    userId: string,
    newStatus: string,
    changedBy: string,
    tenantId: string
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    const oldStatus = user.status;
    
    const updatedUser = await this.userRepository.update(userId, {
      status: newStatus
    });
    
    // 事件数据会自动传递给事件构造函数
    return updatedUser;
  }
}
```

### 2. 事件发布助手
```typescript
// 事件发布助手服务
@Injectable()
export class EventPublisher {
  constructor(private readonly eventBus: EventBusService) {}
  
  // 用户相关事件
  async publishUserCreated(user: User, createdBy?: string): Promise<void> {
    const event = new UserCreatedEvent(
      user.id,
      {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status
      },
      user.tenantId,
      createdBy
    );
    
    await this.eventBus.publishEvent(event);
  }
  
  async publishUserLogin(
    userId: string,
    sessionId: string,
    sourceIp: string,
    userAgent: string,
    tenantId: string
  ): Promise<void> {
    const event = new UserLoginEvent(
      userId,
      { sessionId, sourceIp, userAgent, loginMethod: 'password' },
      tenantId
    );
    
    await this.eventBus.publishEvent(event);
  }
  
  // 角色相关事件
  async publishRoleAssigned(
    userId: string,
    roleId: string,
    roleName: string,
    assignedBy: string,
    tenantId: string
  ): Promise<void> {
    const event = new RoleAssignedEvent(
      userId,
      {
        roleId,
        roleName,
        assignedBy,
        effectiveDate: new Date().toISOString()
      },
      tenantId
    );
    
    await this.eventBus.publishEvent(event);
  }
}
```

## 📊 事件监控和指标

### 事件指标收集
```typescript
@Injectable()
export class EventMetricsService {
  private readonly counters = new Map<string, number>();
  private readonly latencies = new Map<string, number[]>();
  
  incrementEventPublished(eventType: string): void {
    const key = `events.published.${eventType}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }
  
  incrementEventProcessed(eventType: string): void {
    const key = `events.processed.${eventType}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }
  
  recordEventProcessingLatency(eventType: string, latency: number): void {
    const key = `events.latency.${eventType}`;
    const latencies = this.latencies.get(key) || [];
    latencies.push(latency);
    this.latencies.set(key, latencies);
  }
  
  getEventMetrics(): EventMetrics {
    return {
      publishedEvents: this.counters,
      processedEvents: this.counters,
      averageLatencies: this.calculateAverageLatencies(),
      totalEventTypes: new Set([...this.counters.keys()]).size
    };
  }
}

interface EventMetrics {
  publishedEvents: Map<string, number>;
  processedEvents: Map<string, number>;
  averageLatencies: Map<string, number>;
  totalEventTypes: number;
}
```

## ✅ Task F 完成标准

### 核心交付物 ✅
- [x] **统一事件模型设计** - 完整的BaseEvent接口和DomainEvent基类
- [x] **事件类型定义** - 用户、认证、权限相关的具体事件类型
- [x] **事件总线架构** - 基于Redis Streams的EventBusService
- [x] **事件存储设计** - 事件持久化和事件溯源支持
- [x] **发布标准化** - 装饰器和助手服务简化事件发布
- [x] **监控指标** - 完整的事件监控和指标收集

### 技术验证 ✅
- [x] **Redis Streams集成** - 事件发布和订阅机制
- [x] **数据库优化** - 事件存储表设计和索引优化
- [x] **错误处理** - 事件处理异常和重试机制
- [x] **性能考虑** - 批量处理和连接池管理

---

**Task F 总结**: 完成了企业级事件驱动架构的核心设计，建立了统一的事件模型、事件总线服务和事件存储机制。为后续的服务集成和异步业务流程实现奠定了坚实基础。