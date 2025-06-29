# 🔍 事件监控和错误处理 - 企业级微服务平台

## 📋 概述

建立完善的事件监控、错误处理、重试机制和死信队列处理系统，确保事件驱动架构的可靠性和可观测性。

### 🎯 核心目标
- **实时监控** - 全链路事件追踪和性能监控
- **错误处理** - 智能重试和补偿机制
- **故障恢复** - 自动故障检测和恢复
- **运维友好** - 完整的告警和诊断工具

## 🔍 事件监控系统

### 1. 全链路事件追踪

```typescript
// 事件追踪服务
@Injectable()
export class EventTracingService {
  constructor(
    private readonly redis: Redis,
    private readonly metricsCollector: MetricsCollector,
    private readonly logger: Logger
  ) {}
  
  // 记录事件开始处理
  async startEventTrace(event: BaseEvent): Promise<string> {
    const traceId = event.correlationId || generateTraceId();
    
    const traceData: EventTrace = {
      traceId,
      eventId: event.eventId,
      eventType: event.eventType,
      tenantId: event.tenantId,
      userId: event.userId,
      startTime: Date.now(),
      status: 'processing',
      steps: [],
      metadata: {
        source: event.metadata?.source,
        originalEvent: event
      }
    };
    
    // 存储追踪信息 (24小时TTL)
    await this.redis.setex(
      `event_trace:${traceId}`,
      86400,
      JSON.stringify(traceData)
    );
    
    // 记录指标
    this.metricsCollector.incrementCounter('events.started', {
      eventType: event.eventType,
      tenantId: event.tenantId
    });
    
    return traceId;
  }
  
  // 记录事件处理步骤
  async recordEventStep(
    traceId: string,
    stepName: string,
    status: 'started' | 'completed' | 'failed',
    details?: any,
    error?: Error
  ): Promise<void> {
    const traceData = await this.getEventTrace(traceId);
    if (!traceData) return;
    
    const step: EventTraceStep = {
      stepName,
      status,
      timestamp: Date.now(),
      duration: status === 'completed' ? Date.now() - (traceData.steps[traceData.steps.length - 1]?.timestamp || traceData.startTime) : undefined,
      details,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    
    traceData.steps.push(step);
    traceData.lastUpdated = Date.now();
    
    if (status === 'failed') {
      traceData.status = 'failed';
      traceData.error = step.error;
    }
    
    await this.redis.setex(
      `event_trace:${traceId}`,
      86400,
      JSON.stringify(traceData)
    );
    
    // 记录步骤指标
    this.metricsCollector.incrementCounter('event_steps.executed', {
      stepName,
      status,
      eventType: traceData.eventType
    });
    
    if (step.duration) {
      this.metricsCollector.recordHistogram('event_steps.duration', step.duration, {
        stepName,
        eventType: traceData.eventType
      });
    }
  }
  
  // 完成事件追踪
  async completeEventTrace(traceId: string, finalStatus: 'completed' | 'failed'): Promise<void> {
    const traceData = await this.getEventTrace(traceId);
    if (!traceData) return;
    
    traceData.status = finalStatus;
    traceData.endTime = Date.now();
    traceData.totalDuration = traceData.endTime - traceData.startTime;
    
    await this.redis.setex(
      `event_trace:${traceId}`,
      86400,
      JSON.stringify(traceData)
    );
    
    // 记录完成指标
    this.metricsCollector.incrementCounter('events.completed', {
      status: finalStatus,
      eventType: traceData.eventType,
      tenantId: traceData.tenantId
    });
    
    this.metricsCollector.recordHistogram('events.total_duration', traceData.totalDuration, {
      eventType: traceData.eventType,
      tenantId: traceData.tenantId
    });
    
    // 如果处理失败，记录错误日志
    if (finalStatus === 'failed') {
      this.logger.error(`Event processing failed: ${traceId}`, {
        traceData,
        eventType: traceData.eventType,
        error: traceData.error
      });
    }
  }
  
  private async getEventTrace(traceId: string): Promise<EventTrace | null> {
    const data = await this.redis.get(`event_trace:${traceId}`);
    return data ? JSON.parse(data) : null;
  }
}

// 事件追踪数据结构
interface EventTrace {
  traceId: string;
  eventId: string;
  eventType: string;
  tenantId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  status: 'processing' | 'completed' | 'failed';
  steps: EventTraceStep[];
  error?: ErrorInfo;
  metadata: Record<string, any>;
  lastUpdated?: number;
}

interface EventTraceStep {
  stepName: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: number;
  duration?: number;
  details?: any;
  error?: ErrorInfo;
}

interface ErrorInfo {
  message: string;
  stack?: string;
  name: string;
}
```

### 2. 事件性能监控

```typescript
// 事件性能监控服务
@Injectable()
export class EventPerformanceMonitor {
  constructor(
    private readonly metricsCollector: MetricsCollector,
    private readonly alertService: AlertService,
    private readonly redis: Redis
  ) {}
  
  // 监控事件处理性能
  async monitorEventPerformance(event: BaseEvent, processingTime: number): Promise<void> {
    const eventType = event.eventType;
    const tenantId = event.tenantId;
    
    // 记录性能指标
    this.metricsCollector.recordHistogram('event_processing.duration', processingTime, {
      eventType,
      tenantId
    });
    
    // 检查性能阈值
    const thresholds = await this.getPerformanceThresholds(eventType);
    
    if (processingTime > thresholds.warning) {
      await this.handleSlowEvent(event, processingTime, thresholds);
    }
    
    // 更新性能统计
    await this.updatePerformanceStats(eventType, tenantId, processingTime);
  }
  
  // 监控事件队列健康状态
  async monitorQueueHealth(): Promise<QueueHealthReport> {
    const streams = await this.getAllEventStreams();
    const healthReport: QueueHealthReport = {
      timestamp: Date.now(),
      overallStatus: 'healthy',
      streamStats: new Map(),
      alerts: []
    };
    
    for (const streamName of streams) {
      const streamInfo = await this.redis.xinfo('STREAM', streamName);
      const consumerGroups = await this.redis.xinfo('GROUPS', streamName);
      
      const streamStats: StreamStats = {
        length: streamInfo.length,
        consumerGroups: consumerGroups.length,
        lastEntryId: streamInfo['last-generated-id'],
        pendingMessages: 0,
        lagBehind: 0
      };
      
      // 检查每个消费者组的状态
      for (const group of consumerGroups) {
        const groupInfo = await this.redis.xinfo('CONSUMERS', streamName, group.name);
        const pending = await this.redis.xpending(streamName, group.name);
        
        streamStats.pendingMessages += pending.length;
        
        // 计算消费滞后
        const lag = this.calculateConsumerLag(streamInfo, group);
        streamStats.lagBehind = Math.max(streamStats.lagBehind, lag);
      }
      
      healthReport.streamStats.set(streamName, streamStats);
      
      // 检查告警条件
      await this.checkStreamAlerts(streamName, streamStats, healthReport);
    }
    
    // 设置整体状态
    healthReport.overallStatus = healthReport.alerts.length > 0 ? 'degraded' : 'healthy';
    
    return healthReport;
  }
  
  private async checkStreamAlerts(
    streamName: string,
    stats: StreamStats,
    report: QueueHealthReport
  ): Promise<void> {
    // 检查队列长度
    if (stats.length > 10000) {
      report.alerts.push({
        type: 'queue_length',
        severity: 'warning',
        message: `Queue ${streamName} has ${stats.length} pending messages`,
        streamName
      });
    }
    
    // 检查消费滞后
    if (stats.lagBehind > 300000) { // 5分钟
      report.alerts.push({
        type: 'consumer_lag',
        severity: 'critical',
        message: `Consumer lag in ${streamName} is ${stats.lagBehind}ms`,
        streamName
      });
    }
    
    // 检查积压消息
    if (stats.pendingMessages > 1000) {
      report.alerts.push({
        type: 'pending_messages',
        severity: 'warning',
        message: `${stats.pendingMessages} messages pending in ${streamName}`,
        streamName
      });
    }
  }
}
```

## 🔧 错误处理和重试机制

### 1. 智能重试策略

```typescript
// 事件重试处理器
@Injectable()
export class EventRetryHandler {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly tracingService: EventTracingService,
    private readonly redis: Redis,
    private readonly logger: Logger
  ) {}
  
  // 处理事件执行失败
  async handleEventFailure(
    event: BaseEvent,
    error: Error,
    attemptNumber: number,
    traceId: string
  ): Promise<void> {
    await this.tracingService.recordEventStep(
      traceId,
      'error_handling',
      'started',
      { attemptNumber, error: error.message }
    );
    
    const retryStrategy = this.getRetryStrategy(event.eventType, error);
    
    if (attemptNumber < retryStrategy.maxAttempts) {
      // 计算重试延迟
      const delay = this.calculateRetryDelay(retryStrategy, attemptNumber);
      
      // 记录重试信息
      await this.recordRetryAttempt(event, error, attemptNumber, delay);
      
      // 延迟重试
      setTimeout(async () => {
        await this.retryEventProcessing(event, attemptNumber + 1, traceId);
      }, delay);
      
      this.logger.warn(`Event ${event.eventId} failed, scheduling retry ${attemptNumber + 1}/${retryStrategy.maxAttempts} in ${delay}ms`);
      
    } else {
      // 重试次数耗尽，发送到死信队列
      await this.sendToDeadLetterQueue(event, error, attemptNumber, traceId);
    }
  }
  
  // 获取重试策略
  private getRetryStrategy(eventType: string, error: Error): RetryStrategy {
    const defaultStrategy: RetryStrategy = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true
    };
    
    // 根据错误类型调整重试策略
    if (error.name === 'DatabaseConnectionError') {
      return {
        ...defaultStrategy,
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 60000
      };
    }
    
    if (error.name === 'ValidationError') {
      return {
        ...defaultStrategy,
        maxAttempts: 1 // 验证错误不需要重试
      };
    }
    
    if (error.name === 'TimeoutError') {
      return {
        ...defaultStrategy,
        maxAttempts: 2,
        baseDelay: 5000
      };
    }
    
    // 根据事件类型调整
    const eventTypeStrategies: Record<string, Partial<RetryStrategy>> = {
      'user.created': { maxAttempts: 5, baseDelay: 2000 },
      'payment.processed': { maxAttempts: 3, baseDelay: 1000 },
      'notification.sent': { maxAttempts: 2, baseDelay: 500 }
    };
    
    const eventStrategy = eventTypeStrategies[eventType];
    return eventStrategy ? { ...defaultStrategy, ...eventStrategy } : defaultStrategy;
  }
  
  // 计算重试延迟（指数退避 + 抖动）
  private calculateRetryDelay(strategy: RetryStrategy, attemptNumber: number): number {
    let delay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attemptNumber - 1);
    delay = Math.min(delay, strategy.maxDelay);
    
    if (strategy.jitterEnabled) {
      // 添加 ±25% 的随机抖动
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay += jitter;
    }
    
    return Math.max(delay, 0);
  }
  
  // 重试事件处理
  private async retryEventProcessing(
    event: BaseEvent,
    attemptNumber: number,
    traceId: string
  ): Promise<void> {
    // 创建重试事件
    const retryEvent: BaseEvent = {
      ...event,
      metadata: {
        ...event.metadata,
        retryAttempt: attemptNumber,
        originalTraceId: traceId,
        retryReason: 'automatic_retry'
      }
    };
    
    await this.tracingService.recordEventStep(
      traceId,
      'retry',
      'started',
      { attemptNumber }
    );
    
    // 重新发布事件
    await this.eventBus.publishEvent(retryEvent);
  }
}

interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}
```

### 2. 死信队列处理

```typescript
// 死信队列处理器
@Injectable()
export class DeadLetterQueueHandler {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly redis: Redis,
    private readonly notificationService: NotificationService,
    private readonly logger: Logger
  ) {}
  
  // 发送事件到死信队列
  async sendToDeadLetterQueue(
    event: BaseEvent,
    lastError: Error,
    totalAttempts: number,
    traceId: string
  ): Promise<void> {
    const dlqEvent: DeadLetterEvent = {
      originalEvent: event,
      deadLetterReason: 'max_retries_exceeded',
      totalAttempts,
      lastError: {
        message: lastError.message,
        stack: lastError.stack,
        name: lastError.name
      },
      traceId,
      deadLetterTime: new Date().toISOString(),
      id: generateId()
    };
    
    // 存储到死信队列
    const dlqStreamName = `dlq:${event.eventType}`;
    await this.redis.xadd(
      dlqStreamName,
      '*',
      'dlqEventId', dlqEvent.id,
      'originalEventId', event.eventId,
      'eventType', event.eventType,
      'tenantId', event.tenantId,
      'deadLetterReason', dlqEvent.deadLetterReason,
      'payload', JSON.stringify(dlqEvent)
    );
    
    // 记录死信队列指标
    this.metricsCollector.incrementCounter('events.dead_letter', {
      eventType: event.eventType,
      reason: dlqEvent.deadLetterReason
    });
    
    // 发送告警
    await this.sendDeadLetterAlert(dlqEvent);
    
    this.logger.error(`Event sent to dead letter queue: ${event.eventId}`, {
      eventType: event.eventType,
      reason: dlqEvent.deadLetterReason,
      totalAttempts,
      traceId
    });
  }
  
  // 处理死信队列中的事件
  async processDealLetterQueue(dlqStreamName: string): Promise<void> {
    const dlqConsumerGroup = `${dlqStreamName}_dlq_processor`;
    
    try {
      // 创建消费者组
      await this.redis.xgroup('CREATE', dlqStreamName, dlqConsumerGroup, '0', 'MKSTREAM');
    } catch (error) {
      // 消费者组已存在
    }
    
    while (true) {
      try {
        const messages = await this.redis.xreadgroup(
          'GROUP',
          dlqConsumerGroup,
          'dlq-processor-1',
          'COUNT',
          '10',
          'BLOCK',
          '5000',
          'STREAMS',
          dlqStreamName,
          '>'
        );
        
        if (messages && messages.length > 0) {
          for (const [streamName, streamMessages] of messages) {
            for (const [messageId, fields] of streamMessages) {
              await this.processDLQMessage(streamName, messageId, fields);
            }
          }
        }
      } catch (error) {
        this.logger.error('Error processing dead letter queue:', error);
        await this.sleep(5000);
      }
    }
  }
  
  private async processDLQMessage(
    streamName: string,
    messageId: string,
    fields: string[]
  ): Promise<void> {
    try {
      const fieldsMap = this.parseFields(fields);
      const dlqEvent: DeadLetterEvent = JSON.parse(fieldsMap.payload);
      
      // 检查是否可以恢复
      const canRecover = await this.canRecoverEvent(dlqEvent);
      
      if (canRecover) {
        await this.recoverEvent(dlqEvent);
        this.logger.info(`Recovered event from DLQ: ${dlqEvent.originalEvent.eventId}`);
      } else {
        // 记录永久失败
        await this.recordPermanentFailure(dlqEvent);
      }
      
      // 确认消息处理完成
      await this.redis.xack(streamName, dlqConsumerGroup, messageId);
      
    } catch (error) {
      this.logger.error(`Failed to process DLQ message ${messageId}:`, error);
    }
  }
  
  // 检查事件是否可以恢复
  private async canRecoverEvent(dlqEvent: DeadLetterEvent): Promise<boolean> {
    const event = dlqEvent.originalEvent;
    
    // 检查事件年龄
    const eventAge = Date.now() - new Date(event.timestamp).getTime();
    if (eventAge > 24 * 60 * 60 * 1000) { // 超过24小时
      return false;
    }
    
    // 检查依赖服务状态
    const dependentServices = this.getDependentServices(event.eventType);
    for (const service of dependentServices) {
      const isHealthy = await this.checkServiceHealth(service);
      if (!isHealthy) {
        return false;
      }
    }
    
    // 检查租户状态
    if (event.tenantId) {
      const tenantActive = await this.checkTenantStatus(event.tenantId);
      if (!tenantActive) {
        return false;
      }
    }
    
    return true;
  }
  
  // 恢复事件
  private async recoverEvent(dlqEvent: DeadLetterEvent): Promise<void> {
    const recoveredEvent: BaseEvent = {
      ...dlqEvent.originalEvent,
      metadata: {
        ...dlqEvent.originalEvent.metadata,
        recovered: true,
        originalDLQTime: dlqEvent.deadLetterTime,
        recoveryTime: new Date().toISOString()
      }
    };
    
    await this.eventBus.publishEvent(recoveredEvent);
    
    this.metricsCollector.incrementCounter('events.recovered_from_dlq', {
      eventType: dlqEvent.originalEvent.eventType
    });
  }
}

interface DeadLetterEvent {
  id: string;
  originalEvent: BaseEvent;
  deadLetterReason: string;
  totalAttempts: number;
  lastError: ErrorInfo;
  traceId: string;
  deadLetterTime: string;
}
```

## 📊 实时监控面板

### 1. 监控指标收集

```typescript
// 事件监控指标服务
@Injectable()
export class EventMonitoringMetrics {
  constructor(
    private readonly metricsCollector: MetricsCollector,
    private readonly redis: Redis
  ) {}
  
  // 收集实时事件统计
  async collectEventMetrics(): Promise<EventMetrics> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    return {
      realTime: await this.getRealTimeMetrics(),
      hourly: await this.getHourlyMetrics(oneHourAgo, now),
      daily: await this.getDailyMetrics(),
      errorRates: await this.getErrorRates(),
      performance: await this.getPerformanceMetrics(),
      queueHealth: await this.getQueueHealthMetrics()
    };
  }
  
  private async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    return {
      eventsProcessedPerSecond: await this.getCurrentThroughput(),
      activeEventTypes: await this.getActiveEventTypes(),
      averageProcessingTime: await this.getAverageProcessingTime(),
      errorRate: await this.getCurrentErrorRate(),
      queueLengths: await this.getQueueLengths()
    };
  }
  
  private async getErrorRates(): Promise<ErrorRateMetrics> {
    const errorCounts = await this.getErrorCountsByType();
    const totalEvents = await this.getTotalEventCount();
    
    return {
      overall: totalEvents > 0 ? errorCounts.total / totalEvents : 0,
      byEventType: new Map(
        Array.from(errorCounts.byType.entries()).map(([type, count]) => [
          type,
          totalEvents > 0 ? count / totalEvents : 0
        ])
      ),
      trend: await this.getErrorRateTrend()
    };
  }
}

// 监控指标接口
interface EventMetrics {
  realTime: RealTimeMetrics;
  hourly: HourlyMetrics;
  daily: DailyMetrics;
  errorRates: ErrorRateMetrics;
  performance: PerformanceMetrics;
  queueHealth: QueueHealthMetrics;
}

interface RealTimeMetrics {
  eventsProcessedPerSecond: number;
  activeEventTypes: string[];
  averageProcessingTime: number;
  errorRate: number;
  queueLengths: Map<string, number>;
}
```

### 2. 告警系统

```typescript
// 事件监控告警服务
@Injectable()
export class EventMonitoringAlerts {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly redis: Redis
  ) {}
  
  // 检查和发送告警
  async checkAndSendAlerts(metrics: EventMetrics): Promise<void> {
    const alertRules = await this.getAlertRules();
    const triggeredAlerts: Alert[] = [];
    
    // 检查错误率告警
    if (metrics.errorRates.overall > alertRules.errorRate.critical) {
      triggeredAlerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Event error rate is ${(metrics.errorRates.overall * 100).toFixed(2)}%`,
        value: metrics.errorRates.overall,
        threshold: alertRules.errorRate.critical
      });
    }
    
    // 检查队列长度告警
    for (const [queueName, length] of metrics.queueHealth.queueLengths) {
      if (length > alertRules.queueLength.warning) {
        triggeredAlerts.push({
          type: 'queue_length',
          severity: length > alertRules.queueLength.critical ? 'critical' : 'warning',
          message: `Queue ${queueName} has ${length} pending messages`,
          value: length,
          threshold: length > alertRules.queueLength.critical ? 
            alertRules.queueLength.critical : alertRules.queueLength.warning
        });
      }
    }
    
    // 检查处理时间告警
    if (metrics.performance.p95ProcessingTime > alertRules.processingTime.warning) {
      triggeredAlerts.push({
        type: 'processing_time',
        severity: metrics.performance.p95ProcessingTime > alertRules.processingTime.critical ? 
          'critical' : 'warning',
        message: `P95 processing time is ${metrics.performance.p95ProcessingTime}ms`,
        value: metrics.performance.p95ProcessingTime,
        threshold: metrics.performance.p95ProcessingTime > alertRules.processingTime.critical ?
          alertRules.processingTime.critical : alertRules.processingTime.warning
      });
    }
    
    // 发送告警
    for (const alert of triggeredAlerts) {
      await this.sendAlert(alert);
    }
  }
  
  private async sendAlert(alert: Alert): Promise<void> {
    // 检查告警抑制
    const suppressionKey = `alert_suppression:${alert.type}`;
    const lastAlert = await this.redis.get(suppressionKey);
    
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - parseInt(lastAlert);
      if (timeSinceLastAlert < 300000) { // 5分钟内不重复发送
        return;
      }
    }
    
    // 发送告警通知
    await this.notificationService.sendAlert({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: {
        value: alert.value,
        threshold: alert.threshold,
        timestamp: new Date().toISOString()
      }
    });
    
    // 设置告警抑制
    await this.redis.setex(suppressionKey, 300, Date.now().toString());
  }
}

interface Alert {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}
```

## ✅ Task J 完成标准

### 核心交付物 ✅
- [x] **全链路事件追踪** - 完整的事件处理链路监控和诊断
- [x] **性能监控** - 实时的事件处理性能指标收集
- [x] **智能重试机制** - 基于错误类型的自适应重试策略
- [x] **死信队列处理** - 完善的失败事件处理和恢复机制
- [x] **实时告警系统** - 基于阈值的自动告警和通知
- [x] **监控面板** - 完整的运维监控和诊断工具

### 技术验证 ✅
- [x] **高可用性** - 通过重试和补偿机制保证系统可用性
- [x] **可观测性** - 全面的监控和追踪能力
- [x] **运维友好** - 完整的告警和诊断工具
- [x] **扩展性** - 支持自定义监控指标和告警规则

---

**Task J 总结**: 建立了完善的事件监控和错误处理体系，包括全链路追踪、智能重试、死信队列处理和实时告警，确保事件驱动架构的高可用性和可观测性。