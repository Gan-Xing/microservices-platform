/**
 * 审计服务
 * 提供异步审计日志处理和队列管理
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, BehaviorSubject, interval } from 'rxjs';
import { buffer, filter, switchMap, catchError, tap } from 'rxjs/operators';
import { AuditServiceClient, AuditEvent } from '../http/clients/audit-service.client';
import { CacheService } from '../cache/cache.service';

// 审计队列条目
export interface AuditQueueItem {
  id: string;
  event: AuditEvent;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

// 审计服务配置
export interface AuditServiceConfig {
  // 队列配置
  maxQueueSize: number;
  batchSize: number;
  flushInterval: number; // 毫秒
  
  // 重试配置
  maxRetries: number;
  retryDelay: number; // 毫秒
  
  // 持久化配置
  enablePersistence: boolean;
  persistenceKey: string;
  
  // 性能配置
  enableCompression: boolean;
  enableDeduplication: boolean;
  
  // 降级配置
  enableFallback: boolean;
  fallbackToFile: boolean;
  fallbackFilePath: string;
}

// 审计统计信息
export interface AuditStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  queueSize: number;
  averageProcessingTime: number;
  lastFlushTime: Date;
  errorRate: number;
}

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  
  // 配置
  private readonly config: AuditServiceConfig;
  
  // 队列和流
  private readonly auditQueue: AuditQueueItem[] = [];
  private readonly auditStream = new Subject<AuditQueueItem>();
  private readonly flushTrigger = new Subject<void>();
  
  // 状态管理
  private readonly isProcessing = new BehaviorSubject<boolean>(false);
  private isShuttingDown = false;
  
  // 统计信息
  private stats: AuditStats = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    queueSize: 0,
    averageProcessingTime: 0,
    lastFlushTime: new Date(),
    errorRate: 0,
  };
  
  // 去重缓存
  private readonly deduplicationCache = new Set<string>();
  
  constructor(
    private readonly configService: ConfigService,
    private readonly auditClient: AuditServiceClient,
    private readonly cacheService: CacheService,
  ) {
    this.config = this.buildConfig();
  }

  async onModuleInit() {
    this.logger.log('Initializing Audit Service...');
    
    // 恢复持久化的审计事件
    if (this.config.enablePersistence) {
      await this.restorePersistedEvents();
    }
    
    // 启动批量处理
    this.setupBatchProcessing();
    
    // 启动定时刷新
    this.setupPeriodicFlush();
    
    this.logger.log('Audit Service initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Audit Service...');
    this.isShuttingDown = true;
    
    // 等待当前批次处理完成
    if (this.isProcessing.value) {
      await this.waitForProcessingComplete();
    }
    
    // 刷新剩余的审计事件
    await this.flushQueue();
    
    // 持久化未处理的事件
    if (this.config.enablePersistence && this.auditQueue.length > 0) {
      await this.persistPendingEvents();
    }
    
    this.logger.log('Audit Service shutdown complete');
  }

  /**
   * 添加审计事件到队列
   */
  async logEvent(event: AuditEvent, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): Promise<string> {
    try {
      const eventId = this.generateEventId();
      
      // 去重检查
      if (this.config.enableDeduplication) {
        const eventHash = this.calculateEventHash(event);
        if (this.deduplicationCache.has(eventHash)) {
          this.logger.debug(`Duplicate audit event detected: ${eventId}`);
          return eventId;
        }
        this.deduplicationCache.add(eventHash);
        
        // 限制去重缓存大小
        if (this.deduplicationCache.size > 10000) {
          this.deduplicationCache.clear();
        }
      }
      
      const queueItem: AuditQueueItem = {
        id: eventId,
        event: { ...event, id: eventId },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        priority,
      };
      
      // 检查队列大小
      if (this.auditQueue.length >= this.config.maxQueueSize) {
        if (priority === 'critical') {
          // 关键事件强制入队，移除最旧的低优先级事件
          this.removeOldestLowPriorityEvent();
        } else {
          this.logger.warn(`Audit queue full, dropping ${priority} priority event`);
          this.stats.failedEvents++;
          return eventId;
        }
      }
      
      // 添加到队列
      this.auditQueue.push(queueItem);
      this.stats.totalEvents++;
      this.stats.queueSize = this.auditQueue.length;
      
      // 发送到流
      this.auditStream.next(queueItem);
      
      // 如果是关键事件，立即刷新
      if (priority === 'critical') {
        this.flushTrigger.next();
      }
      
      this.logger.debug(`Audit event queued: ${eventId} (priority: ${priority})`);
      return eventId;
      
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
      this.stats.failedEvents++;
      
      // 降级处理
      if (this.config.enableFallback) {
        await this.handleFallback(event);
      }
      
      throw error;
    }
  }

  /**
   * 批量添加审计事件
   */
  async logEvents(events: AuditEvent[]): Promise<string[]> {
    const eventIds: string[] = [];
    
    for (const event of events) {
      try {
        const eventId = await this.logEvent(event);
        eventIds.push(eventId);
      } catch (error) {
        this.logger.error('Failed to log batch event:', error);
        eventIds.push(''); // 保持索引对应
      }
    }
    
    return eventIds;
  }

  /**
   * 手动刷新队列
   */
  async flushQueue(): Promise<void> {
    if (this.auditQueue.length === 0) {
      return;
    }
    
    this.logger.debug(`Flushing audit queue: ${this.auditQueue.length} events`);
    
    const startTime = Date.now();
    const batch = this.auditQueue.splice(0, this.config.batchSize);
    
    try {
      const events = batch.map(item => item.event);
      const result = await this.auditClient.logEventsBatch({ events }).toPromise();
      
      this.stats.successfulEvents += result.successful;
      this.stats.failedEvents += result.failed;
      
      // 处理失败的事件
      if (result.failed > 0) {
        await this.handleFailedEvents(batch.slice(result.successful));
      }
      
    } catch (error) {
      this.logger.error('Failed to flush audit batch:', error);
      
      // 重新入队失败的事件
      await this.requeueFailedEvents(batch);
    }
    
    const processingTime = Date.now() - startTime;
    this.updateProcessingStats(processingTime);
    
    this.stats.queueSize = this.auditQueue.length;
    this.stats.lastFlushTime = new Date();
  }

  /**
   * 获取审计统计信息
   */
  getStats(): AuditStats {
    return {
      ...this.stats,
      errorRate: this.stats.totalEvents > 0 
        ? this.stats.failedEvents / this.stats.totalEvents 
        : 0,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      queueSize: this.auditQueue.length,
      averageProcessingTime: 0,
      lastFlushTime: new Date(),
      errorRate: 0,
    };
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    size: number;
    isProcessing: boolean;
    oldestEvent?: Date;
    priorityDistribution: Record<string, number>;
  } {
    const priorityDistribution = this.auditQueue.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      size: this.auditQueue.length,
      isProcessing: this.isProcessing.value,
      oldestEvent: this.auditQueue.length > 0 
        ? new Date(Math.min(...this.auditQueue.map(item => item.timestamp)))
        : undefined,
      priorityDistribution,
    };
  }

  /**
   * 构建服务配置
   */
  private buildConfig(): AuditServiceConfig {
    return {
      maxQueueSize: this.configService.get<number>('AUDIT_MAX_QUEUE_SIZE', 1000),
      batchSize: this.configService.get<number>('AUDIT_BATCH_SIZE', 50),
      flushInterval: this.configService.get<number>('AUDIT_FLUSH_INTERVAL', 5000),
      maxRetries: this.configService.get<number>('AUDIT_MAX_RETRIES', 3),
      retryDelay: this.configService.get<number>('AUDIT_RETRY_DELAY', 1000),
      enablePersistence: this.configService.get<boolean>('AUDIT_ENABLE_PERSISTENCE', true),
      persistenceKey: this.configService.get<string>('AUDIT_PERSISTENCE_KEY', 'audit_queue'),
      enableCompression: this.configService.get<boolean>('AUDIT_ENABLE_COMPRESSION', false),
      enableDeduplication: this.configService.get<boolean>('AUDIT_ENABLE_DEDUPLICATION', true),
      enableFallback: this.configService.get<boolean>('AUDIT_ENABLE_FALLBACK', true),
      fallbackToFile: this.configService.get<boolean>('AUDIT_FALLBACK_TO_FILE', false),
      fallbackFilePath: this.configService.get<string>('AUDIT_FALLBACK_FILE_PATH', '/tmp/audit_fallback.log'),
    };
  }

  /**
   * 设置批量处理
   */
  private setupBatchProcessing(): void {
    this.auditStream.pipe(
      buffer(
        interval(this.config.flushInterval).pipe(
          filter(() => !this.isShuttingDown),
        ),
      ),
      filter(batch => batch.length > 0),
      tap(() => this.isProcessing.next(true)),
      switchMap(() => this.flushQueue()),
      tap(() => this.isProcessing.next(false)),
      catchError(error => {
        this.logger.error('Batch processing error:', error);
        this.isProcessing.next(false);
        return [];
      }),
    ).subscribe();
  }

  /**
   * 设置定时刷新
   */
  private setupPeriodicFlush(): void {
    // 定时刷新
    interval(this.config.flushInterval).pipe(
      filter(() => !this.isShuttingDown && this.auditQueue.length > 0),
      switchMap(() => this.flushQueue()),
      catchError(error => {
        this.logger.error('Periodic flush error:', error);
        return [];
      }),
    ).subscribe();

    // 手动刷新触发器
    this.flushTrigger.pipe(
      filter(() => !this.isShuttingDown),
      switchMap(() => this.flushQueue()),
      catchError(error => {
        this.logger.error('Manual flush error:', error);
        return [];
      }),
    ).subscribe();
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算事件哈希
   */
  private calculateEventHash(event: AuditEvent): string {
    const hashInput = `${event.tenantId}:${event.userId}:${event.eventType}:${event.resource}:${event.action}:${JSON.stringify(event.metadata)}`;
    // 简单哈希实现，生产环境可能需要更好的哈希算法
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 移除最旧的低优先级事件
   */
  private removeOldestLowPriorityEvent(): void {
    const lowPriorityIndex = this.auditQueue.findIndex(
      item => item.priority === 'low' || item.priority === 'normal'
    );
    
    if (lowPriorityIndex !== -1) {
      this.auditQueue.splice(lowPriorityIndex, 1);
      this.logger.debug('Removed oldest low priority event to make room');
    }
  }

  /**
   * 处理失败的事件
   */
  private async handleFailedEvents(failedItems: AuditQueueItem[]): Promise<void> {
    for (const item of failedItems) {
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        item.timestamp = Date.now() + (this.config.retryDelay * item.retryCount);
        this.auditQueue.push(item);
        this.logger.debug(`Requeued failed event: ${item.id} (retry ${item.retryCount})`);
      } else {
        this.logger.error(`Audit event failed after max retries: ${item.id}`);
        
        if (this.config.enableFallback) {
          await this.handleFallback(item.event);
        }
      }
    }
  }

  /**
   * 重新入队失败的事件
   */
  private async requeueFailedEvents(failedItems: AuditQueueItem[]): Promise<void> {
    for (const item of failedItems) {
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        this.auditQueue.unshift(item); // 添加到队列前端，优先处理
      } else {
        this.logger.error(`Audit event abandoned after max retries: ${item.id}`);
        
        if (this.config.enableFallback) {
          await this.handleFallback(item.event);
        }
      }
    }
  }

  /**
   * 降级处理
   */
  private async handleFallback(event: AuditEvent): Promise<void> {
    if (this.config.fallbackToFile) {
      // 写入文件 (需要实现文件写入逻辑)
      this.logger.warn(`Writing audit event to fallback file: ${event.id}`);
    } else {
      // 写入本地日志
      this.logger.warn(`FALLBACK AUDIT: ${JSON.stringify(event)}`);
    }
  }

  /**
   * 恢复持久化的事件
   */
  private async restorePersistedEvents(): Promise<void> {
    try {
      const persistedEvents = await this.cacheService.get<AuditQueueItem[]>(
        this.config.persistenceKey
      );
      
      if (persistedEvents && persistedEvents.length > 0) {
        this.auditQueue.push(...persistedEvents);
        await this.cacheService.del(this.config.persistenceKey);
        this.logger.log(`Restored ${persistedEvents.length} persisted audit events`);
      }
    } catch (error) {
      this.logger.error('Failed to restore persisted events:', error);
    }
  }

  /**
   * 持久化待处理事件
   */
  private async persistPendingEvents(): Promise<void> {
    try {
      if (this.auditQueue.length > 0) {
        await this.cacheService.set(
          this.config.persistenceKey,
          this.auditQueue,
          3600 // 1小时TTL
        );
        this.logger.log(`Persisted ${this.auditQueue.length} pending audit events`);
      }
    } catch (error) {
      this.logger.error('Failed to persist pending events:', error);
    }
  }

  /**
   * 等待处理完成
   */
  private async waitForProcessingComplete(): Promise<void> {
    return new Promise((resolve) => {
      const subscription = this.isProcessing.subscribe(isProcessing => {
        if (!isProcessing) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * 更新处理统计
   */
  private updateProcessingStats(processingTime: number): void {
    const totalProcessed = this.stats.successfulEvents + this.stats.failedEvents;
    if (totalProcessed > 1) {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed;
    } else {
      this.stats.averageProcessingTime = processingTime;
    }
  }
}