/**
 * 企业级日志服务 - 基于Winston
 * 支持结构化日志、多输出、日志轮转
 */

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { Request } from 'express';

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  service?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
  sessionId?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

@Injectable()
export class LoggingService implements LoggerService {
  private readonly winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS',
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          return JSON.stringify({
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            service: process.env.SERVICE_NAME || 'microservices-platform',
            ...info.context,
            stack: info.stack,
          });
        }),
      ),
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        // 文件输出 - 所有日志
        new winston.transports.File({
          filename: 'logs/app.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true,
        }),
        // 文件输出 - 错误日志
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760,
          maxFiles: 5,
          tailable: true,
        }),
      ],
      exceptionHandlers: [
        new winston.transports.File({
          filename: 'logs/exceptions.log',
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: 'logs/rejections.log',
        }),
      ],
    });
  }

  /**
   * 记录日志信息
   */
  log(message: string, context?: LogContext): void {
    this.winston.info(message, { context });
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | string, context?: LogContext): void {
    this.winston.error(message, {
      context: {
        ...context,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, { context });
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, { context });
  }

  /**
   * 记录详细日志
   */
  verbose(message: string, context?: LogContext): void {
    this.winston.verbose(message, { context });
  }

  /**
   * 记录API请求日志
   */
  logRequest(request: Request, responseTime?: number, statusCode?: number): void {
    const context: LogContext = {
      requestId: request.headers['x-request-id'] as string,
      tenantId: request.headers['x-tenant-id'] as string,
      userId: (request as any).user?.sub,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip || request.connection.remoteAddress,
      correlationId: request.headers['x-correlation-id'] as string,
      sessionId: (request as any).user?.sessionId,
      duration: responseTime,
      statusCode,
    };

    this.log(`${request.method} ${request.url}`, context);
  }

  /**
   * 记录业务操作日志
   */
  logBusinessOperation(
    operation: string,
    entity: string,
    entityId: string,
    userId?: string,
    tenantId?: string,
    details?: Record<string, any>,
  ): void {
    const context: LogContext = {
      operation,
      entity,
      entityId,
      userId,
      tenantId,
      operationType: 'business',
      ...details,
    };

    this.log(`业务操作: ${operation} ${entity}(${entityId})`, context);
  }

  /**
   * 记录安全事件日志
   */
  logSecurityEvent(
    event: string,
    userId?: string,
    tenantId?: string,
    ipAddress?: string,
    details?: Record<string, any>,
  ): void {
    const context: LogContext = {
      event,
      userId,
      tenantId,
      ipAddress,
      eventType: 'security',
      severity: 'high',
      ...details,
    };

    this.warn(`安全事件: ${event}`, context);
  }

  /**
   * 记录性能监控日志
   */
  logPerformance(
    operation: string,
    duration: number,
    details?: Record<string, any>,
  ): void {
    const context: LogContext = {
      operation,
      duration,
      operationType: 'performance',
      ...details,
    };

    if (duration > 1000) {
      this.warn(`性能警告: ${operation} 耗时 ${duration}ms`, context);
    } else {
      this.debug(`性能监控: ${operation} 耗时 ${duration}ms`, context);
    }
  }

  /**
   * 记录数据库操作日志
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration?: number,
    affectedRows?: number,
    query?: string,
  ): void {
    const context: LogContext = {
      operation,
      table,
      duration,
      affectedRows,
      query: process.env.LOG_SQL_QUERIES === 'true' ? query : undefined,
      operationType: 'database',
    };

    this.debug(`数据库操作: ${operation} ${table}`, context);
  }

  /**
   * 记录缓存操作日志
   */
  logCacheOperation(
    operation: 'get' | 'set' | 'del' | 'hit' | 'miss',
    key: string,
    duration?: number,
  ): void {
    const context: LogContext = {
      operation,
      cacheKey: key,
      duration,
      operationType: 'cache',
    };

    this.debug(`缓存操作: ${operation} ${key}`, context);
  }

  /**
   * 记录消息队列日志
   */
  logQueueOperation(
    operation: 'publish' | 'consume' | 'ack' | 'nack' | 'retry',
    queue: string,
    messageId?: string,
    details?: Record<string, any>,
  ): void {
    const context: LogContext = {
      operation,
      queue,
      messageId,
      operationType: 'queue',
      ...details,
    };

    this.log(`消息队列: ${operation} ${queue}`, context);
  }

  /**
   * 创建子日志记录器
   */
  createChildLogger(defaultContext: LogContext): LoggingService {
    const childLogger = new LoggingService();
    
    // 重写方法以包含默认上下文
    const originalLog = childLogger.log.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalDebug = childLogger.debug.bind(childLogger);

    childLogger.log = (message: string, context?: LogContext) =>
      originalLog(message, { ...defaultContext, ...context });

    childLogger.error = (message: string, error?: Error | string, context?: LogContext) =>
      originalError(message, error, { ...defaultContext, ...context });

    childLogger.warn = (message: string, context?: LogContext) =>
      originalWarn(message, { ...defaultContext, ...context });

    childLogger.debug = (message: string, context?: LogContext) =>
      originalDebug(message, { ...defaultContext, ...context });

    return childLogger;
  }
}