# 🚨 统一错误处理和重试标准化 - 企业级微服务平台

## 📋 概述

建立企业级的统一错误处理和重试机制，解决当前12个微服务中错误响应格式不一致、重试策略分散、缺乏智能熔断等问题，实现"故障自愈、用户无感知"的高可用架构。

### 🎯 标准化目标

1. **统一错误响应格式** - 所有服务使用相同的错误响应结构和错误代码
2. **智能重试策略** - 基于错误类型的自适应重试机制
3. **熔断器标准化** - 统一的熔断器实现和策略配置
4. **故障隔离** - 防止级联故障的隔离机制
5. **错误监控和告警** - 实时的错误监控和智能告警

### ⏰ 实施时间表

| 阶段 | 时间 | 重点 | 交付物 |
|-----|------|------|--------|
| **M1** | 2小时 | 统一错误响应格式 | 标准错误处理组件 |
| **M2** | 2小时 | 智能重试策略 | 自适应重试机制 |
| **M3** | 2小时 | 熔断器标准化 | 企业级熔断器 |
| **M4** | 2小时 | 监控和告警 | 错误监控体系 |

## 🚨 M1: 统一错误响应格式 (2小时)

### 1.1 标准错误响应接口

```typescript
// 📁 libs/shared/src/errors/standard-error.interface.ts
export interface StandardErrorResponse {
  success: false;
  error: {
    // 基本错误信息
    code: string;              // 标准错误代码 (如: USER_NOT_FOUND)
    message: string;           // 用户友好的错误消息
    httpStatus: number;        // HTTP状态码
    
    // 详细错误信息
    details?: {
      field?: string;          // 字段级错误（表单验证）
      constraint?: string;     // 约束违反类型
      value?: any;            // 导致错误的值
      path?: string;          // 错误路径（嵌套对象）
      cause?: string;         // 错误原因
    };
    
    // 追踪信息
    requestId: string;         // 请求追踪ID
    timestamp: string;         // 错误发生时间 (ISO 8601)
    service: string;           // 错误来源服务
    endpoint?: string;         // 错误端点
    
    // 用户指导
    userAction?: string;       // 建议用户操作
    documentation?: string;    // 相关文档链接
    
    // 重试信息
    retryable: boolean;        // 是否可重试
    retryAfter?: number;       // 重试延迟（秒）
    
    // 内部信息（仅用于调试，生产环境可屏蔽）
    internal?: {
      stackTrace?: string;     // 错误堆栈（开发环境）
      metadata?: Record<string, any>; // 内部元数据
    };
  };
}

// 业务错误接口
export interface BusinessError {
  code: string;
  message: string;
  httpStatus: number;
  retryable: boolean;
  category: 'validation' | 'authorization' | 'business_rule' | 'external_service' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 系统错误接口
export interface SystemError extends BusinessError {
  category: 'system';
  internalCode?: string;      // 内部错误代码
  component?: string;         // 失败组件
  recovery?: string;          // 恢复建议
}
```

### 1.2 标准错误代码定义

```typescript
// 📁 libs/shared/src/errors/error-codes.enum.ts
export enum StandardErrorCodes {
  // 通用错误 (1000-1999)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // 认证相关 (2000-2099)
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  
  // 用户相关 (2100-2199)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  INVALID_USER_TYPE = 'INVALID_USER_TYPE',
  USER_QUOTA_EXCEEDED = 'USER_QUOTA_EXCEEDED',
  
  // 权限相关 (2200-2299)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_ROLE_ASSIGNMENT = 'INVALID_ROLE_ASSIGNMENT',
  PERMISSION_CONFLICT = 'PERMISSION_CONFLICT',
  
  // 租户相关 (2300-2399)
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_QUOTA_EXCEEDED = 'TENANT_QUOTA_EXCEEDED',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  TENANT_LIMIT_REACHED = 'TENANT_LIMIT_REACHED',
  INVALID_TENANT_CONFIGURATION = 'INVALID_TENANT_CONFIGURATION',
  
  // 文件相关 (2400-2499)
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  
  // 数据验证 (2500-2599)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  DUPLICATE_VALUE = 'DUPLICATE_VALUE',
  INVALID_ENUM_VALUE = 'INVALID_ENUM_VALUE',
  
  // 外部服务 (2600-2699)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  
  // 系统资源 (2700-2799)
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  CACHE_UNAVAILABLE = 'CACHE_UNAVAILABLE',
  QUEUE_FULL = 'QUEUE_FULL',
  MEMORY_EXHAUSTED = 'MEMORY_EXHAUSTED',
  DISK_SPACE_FULL = 'DISK_SPACE_FULL',
  
  // 业务规则 (2800-2899)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  PRECONDITION_FAILED = 'PRECONDITION_FAILED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED'
}

// 错误代码映射配置
export const ERROR_CODE_MAPPINGS: Record<StandardErrorCodes, BusinessError> = {
  [StandardErrorCodes.INTERNAL_ERROR]: {
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误，请稍后重试',
    httpStatus: 500,
    retryable: true,
    category: 'system',
    severity: 'critical'
  },
  
  [StandardErrorCodes.INVALID_REQUEST]: {
    code: 'INVALID_REQUEST',
    message: '请求格式无效，请检查请求参数',
    httpStatus: 400,
    retryable: false,
    category: 'validation',
    severity: 'low'
  },
  
  [StandardErrorCodes.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    message: '身份验证失败，请重新登录',
    httpStatus: 401,
    retryable: false,
    category: 'authorization',
    severity: 'medium'
  },
  
  [StandardErrorCodes.FORBIDDEN]: {
    code: 'FORBIDDEN',
    message: '权限不足，无法执行此操作',
    httpStatus: 403,
    retryable: false,
    category: 'authorization',
    severity: 'medium'
  },
  
  [StandardErrorCodes.NOT_FOUND]: {
    code: 'NOT_FOUND',
    message: '请求的资源不存在',
    httpStatus: 404,
    retryable: false,
    category: 'business_rule',
    severity: 'low'
  },
  
  [StandardErrorCodes.TOO_MANY_REQUESTS]: {
    code: 'TOO_MANY_REQUESTS',
    message: '请求过于频繁，请稍后重试',
    httpStatus: 429,
    retryable: true,
    category: 'system',
    severity: 'medium'
  },
  
  [StandardErrorCodes.SERVICE_UNAVAILABLE]: {
    code: 'SERVICE_UNAVAILABLE',
    message: '服务暂时不可用，请稍后重试',
    httpStatus: 503,
    retryable: true,
    category: 'system',
    severity: 'high'
  },
  
  [StandardErrorCodes.USER_NOT_FOUND]: {
    code: 'USER_NOT_FOUND',
    message: '用户不存在',
    httpStatus: 404,
    retryable: false,
    category: 'business_rule',
    severity: 'low'
  },
  
  [StandardErrorCodes.TENANT_QUOTA_EXCEEDED]: {
    code: 'TENANT_QUOTA_EXCEEDED',
    message: '租户配额已超限，请联系管理员',
    httpStatus: 403,
    retryable: false,
    category: 'business_rule',
    severity: 'medium'
  },
  
  // ... 更多错误代码映射
} as const;
```

### 1.3 统一异常处理器

```typescript
// 📁 libs/shared/src/errors/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { StandardErrorResponse, BusinessError } from './standard-error.interface';
import { StandardErrorCodes, ERROR_CODE_MAPPINGS } from './error-codes.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildStandardErrorResponse(exception, request);
    
    // 记录错误日志
    this.logError(exception, request, errorResponse);
    
    // 发送响应
    response.status(errorResponse.error.httpStatus).json(errorResponse);
  }

  private buildStandardErrorResponse(
    exception: unknown,
    request: Request
  ): StandardErrorResponse {
    const requestId = request.headers['x-request-id'] as string || this.generateRequestId();
    const timestamp = new Date().toISOString();
    const serviceName = this.configService.get<string>('SERVICE_NAME', 'unknown');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // 根据异常类型构建错误响应
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, requestId, timestamp, serviceName, isProduction, request);
    }
    
    if (exception instanceof BusinessRuleException) {
      return this.handleBusinessException(exception, requestId, timestamp, serviceName, isProduction, request);
    }
    
    if (exception instanceof ValidationException) {
      return this.handleValidationException(exception, requestId, timestamp, serviceName, isProduction, request);
    }
    
    // 未知异常处理
    return this.handleUnknownException(exception, requestId, timestamp, serviceName, isProduction, request);
  }

  private handleHttpException(
    exception: HttpException,
    requestId: string,
    timestamp: string,
    serviceName: string,
    isProduction: boolean,
    request: Request
  ): StandardErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;
    
    // 尝试从已知错误代码映射中查找
    const errorCode = this.mapHttpStatusToErrorCode(status);
    const errorConfig = ERROR_CODE_MAPPINGS[errorCode];

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorConfig?.message || exceptionResponse.message || exception.message,
        httpStatus: status,
        details: {
          path: request.url,
          method: request.method,
          cause: exceptionResponse.error || 'HTTP Exception'
        },
        requestId,
        timestamp,
        service: serviceName,
        endpoint: request.url,
        userAction: this.getUserAction(errorCode),
        retryable: errorConfig?.retryable || false,
        retryAfter: this.getRetryAfter(errorCode),
        internal: isProduction ? undefined : {
          stackTrace: exception.stack,
          metadata: {
            originalException: exceptionResponse
          }
        }
      }
    };
  }

  private handleBusinessException(
    exception: BusinessRuleException,
    requestId: string,
    timestamp: string,
    serviceName: string,
    isProduction: boolean,
    request: Request
  ): StandardErrorResponse {
    const errorConfig = ERROR_CODE_MAPPINGS[exception.code] || ERROR_CODE_MAPPINGS[StandardErrorCodes.BUSINESS_RULE_VIOLATION];

    return {
      success: false,
      error: {
        code: exception.code,
        message: exception.message,
        httpStatus: errorConfig.httpStatus,
        details: {
          ...exception.details,
          path: request.url,
          method: request.method
        },
        requestId,
        timestamp,
        service: serviceName,
        endpoint: request.url,
        userAction: this.getUserAction(exception.code),
        retryable: errorConfig.retryable,
        retryAfter: this.getRetryAfter(exception.code),
        internal: isProduction ? undefined : {
          stackTrace: exception.stack,
          metadata: exception.metadata
        }
      }
    };
  }

  private handleValidationException(
    exception: ValidationException,
    requestId: string,
    timestamp: string,
    serviceName: string,
    isProduction: boolean,
    request: Request
  ): StandardErrorResponse {
    return {
      success: false,
      error: {
        code: StandardErrorCodes.VALIDATION_FAILED,
        message: '数据验证失败',
        httpStatus: 400,
        details: {
          field: exception.field,
          constraint: exception.constraint,
          value: exception.value,
          path: request.url,
          method: request.method
        },
        requestId,
        timestamp,
        service: serviceName,
        endpoint: request.url,
        userAction: '请检查输入数据格式是否正确',
        retryable: false,
        internal: isProduction ? undefined : {
          stackTrace: exception.stack,
          metadata: {
            validationErrors: exception.validationErrors
          }
        }
      }
    };
  }

  private handleUnknownException(
    exception: unknown,
    requestId: string,
    timestamp: string,
    serviceName: string,
    isProduction: boolean,
    request: Request
  ): StandardErrorResponse {
    const error = exception as Error;

    return {
      success: false,
      error: {
        code: StandardErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误，请稍后重试',
        httpStatus: 500,
        details: {
          path: request.url,
          method: request.method,
          cause: 'Unhandled Exception'
        },
        requestId,
        timestamp,
        service: serviceName,
        endpoint: request.url,
        userAction: '请稍后重试，如问题持续存在请联系客服',
        retryable: true,
        retryAfter: 30,
        internal: isProduction ? undefined : {
          stackTrace: error.stack,
          metadata: {
            name: error.name,
            message: error.message
          }
        }
      }
    };
  }

  private mapHttpStatusToErrorCode(status: number): StandardErrorCodes {
    switch (status) {
      case 400: return StandardErrorCodes.INVALID_REQUEST;
      case 401: return StandardErrorCodes.UNAUTHORIZED;
      case 403: return StandardErrorCodes.FORBIDDEN;
      case 404: return StandardErrorCodes.NOT_FOUND;
      case 405: return StandardErrorCodes.METHOD_NOT_ALLOWED;
      case 409: return StandardErrorCodes.CONFLICT;
      case 422: return StandardErrorCodes.UNPROCESSABLE_ENTITY;
      case 429: return StandardErrorCodes.TOO_MANY_REQUESTS;
      case 500: return StandardErrorCodes.INTERNAL_ERROR;
      case 503: return StandardErrorCodes.SERVICE_UNAVAILABLE;
      default: return StandardErrorCodes.INTERNAL_ERROR;
    }
  }

  private getUserAction(errorCode: string): string {
    const actionMappings: Record<string, string> = {
      [StandardErrorCodes.UNAUTHORIZED]: '请重新登录后再试',
      [StandardErrorCodes.FORBIDDEN]: '请联系管理员获取相应权限',
      [StandardErrorCodes.NOT_FOUND]: '请检查请求的资源是否存在',
      [StandardErrorCodes.TOO_MANY_REQUESTS]: '请降低请求频率，稍后重试',
      [StandardErrorCodes.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
      [StandardErrorCodes.VALIDATION_FAILED]: '请检查输入数据的格式和内容',
      [StandardErrorCodes.TENANT_QUOTA_EXCEEDED]: '请联系管理员升级配额或清理数据'
    };

    return actionMappings[errorCode] || '请稍后重试，如问题持续存在请联系客服';
  }

  private getRetryAfter(errorCode: string): number | undefined {
    const retryMappings: Record<string, number> = {
      [StandardErrorCodes.TOO_MANY_REQUESTS]: 60,       // 1分钟后重试
      [StandardErrorCodes.SERVICE_UNAVAILABLE]: 30,      // 30秒后重试
      [StandardErrorCodes.INTERNAL_ERROR]: 30,           // 30秒后重试
      [StandardErrorCodes.EXTERNAL_SERVICE_TIMEOUT]: 15, // 15秒后重试
      [StandardErrorCodes.DATABASE_CONNECTION_FAILED]: 45 // 45秒后重试
    };

    return retryMappings[errorCode];
  }

  private logError(exception: unknown, request: Request, errorResponse: StandardErrorResponse): void {
    const { error } = errorResponse;
    const logContext = {
      requestId: error.requestId,
      endpoint: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      errorCode: error.code,
      httpStatus: error.httpStatus,
      message: error.message
    };

    // 根据错误严重程度选择日志级别
    if (error.httpStatus >= 500) {
      this.logger.error(`Server Error: ${error.message}`, {
        ...logContext,
        stack: (exception as Error).stack
      });
    } else if (error.httpStatus >= 400) {
      this.logger.warn(`Client Error: ${error.message}`, logContext);
    } else {
      this.logger.log(`Request processed with error: ${error.message}`, logContext);
    }
  }

  private generateRequestId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

// 业务异常基类
export class BusinessRuleException extends Error {
  constructor(
    public readonly code: StandardErrorCodes,
    message: string,
    public readonly details?: Record<string, any>,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessRuleException';
  }
}

// 验证异常类
export class ValidationException extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly constraint?: string,
    public readonly value?: any,
    public readonly validationErrors?: any[]
  ) {
    super(message);
    this.name = 'ValidationException';
  }
}

// 外部服务异常类
export class ExternalServiceException extends Error {
  constructor(
    public readonly serviceName: string,
    message: string,
    public readonly originalError?: any,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'ExternalServiceException';
  }
}
```

## 🔄 M2: 智能重试策略 (2小时)

### 2.1 自适应重试策略

```typescript
// 📁 libs/shared/src/retry/adaptive-retry.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;        // 基础延迟(ms)
  maxDelay: number;         // 最大延迟(ms)
  backoffMultiplier: number;
  jitter: boolean;          // 是否添加随机抖动
  retryableErrors: string[];
  circuitBreakerThreshold: number;
}

interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error: any;
  timestamp: number;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: RetryAttempt[];
  totalDuration: number;
  strategy: string;
}

@Injectable()
export class AdaptiveRetryService {
  private readonly logger = new Logger(AdaptiveRetryService.name);
  private readonly retryStats = new Map<string, {
    successRate: number;
    avgAttempts: number;
    lastUpdate: number;
  }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
  ) {}

  // 自适应重试执行
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationKey: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = this.buildRetryConfig(operationKey, customConfig);
    const attempts: RetryAttempt[] = [];
    const startTime = Date.now();

    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // 第一次尝试不延迟
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt, config);
          attempts.push({
            attemptNumber: attempt,
            delay,
            error: lastError,
            timestamp: Date.now()
          });
          
          await this.sleep(delay);
        }

        // 执行操作
        const result = await operation();
        
        // 记录成功
        await this.recordSuccess(operationKey, attempt + 1);
        
        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
          strategy: this.getStrategyName(config)
        };

      } catch (error) {
        lastError = error;
        
        // 检查是否为可重试错误
        if (!this.isRetryableError(error, config)) {
          await this.recordFailure(operationKey, attempt + 1, false);
          break;
        }

        // 检查是否达到最大重试次数
        if (attempt === config.maxRetries) {
          await this.recordFailure(operationKey, attempt + 1, true);
          break;
        }

        // 记录重试
        this.logger.warn(`重试操作 ${operationKey}, 第 ${attempt + 1} 次尝试失败: ${error.message}`);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalDuration: Date.now() - startTime,
      strategy: this.getStrategyName(config)
    };
  }

  // 批量重试操作
  async batchExecuteWithRetry<T>(
    operations: Array<{
      operation: () => Promise<T>;
      key: string;
      config?: Partial<RetryConfig>;
    }>
  ): Promise<RetryResult<T>[]> {
    const batchPromises = operations.map(({ operation, key, config }) =>
      this.executeWithRetry(operation, key, config)
    );

    return Promise.allSettled(batchPromises).then(results =>
      results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason,
            attempts: [],
            totalDuration: 0,
            strategy: 'batch_failed'
          };
        }
      })
    );
  }

  private buildRetryConfig(operationKey: string, customConfig?: Partial<RetryConfig>): RetryConfig {
    // 基础配置
    const baseConfig: RetryConfig = {
      maxRetries: this.configService.get<number>('RETRY_MAX_ATTEMPTS', 3),
      baseDelay: this.configService.get<number>('RETRY_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('RETRY_MAX_DELAY', 30000),
      backoffMultiplier: this.configService.get<number>('RETRY_BACKOFF_MULTIPLIER', 2),
      jitter: this.configService.get<boolean>('RETRY_JITTER', true),
      retryableErrors: this.getRetryableErrors(),
      circuitBreakerThreshold: this.configService.get<number>('CIRCUIT_BREAKER_THRESHOLD', 5)
    };

    // 基于历史成功率的动态调整
    const stats = this.retryStats.get(operationKey);
    if (stats) {
      // 成功率高的操作减少重试次数
      if (stats.successRate > 0.9) {
        baseConfig.maxRetries = Math.max(1, baseConfig.maxRetries - 1);
      }
      // 成功率低的操作增加重试次数
      else if (stats.successRate < 0.5) {
        baseConfig.maxRetries = Math.min(5, baseConfig.maxRetries + 1);
      }

      // 根据平均尝试次数调整延迟
      if (stats.avgAttempts > 2) {
        baseConfig.baseDelay = Math.min(baseConfig.maxDelay, baseConfig.baseDelay * 1.5);
      }
    }

    // 应用自定义配置
    return { ...baseConfig, ...customConfig };
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // 指数退避算法
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // 限制最大延迟
    delay = Math.min(delay, config.maxDelay);
    
    // 添加随机抖动，避免雷鸣群体效应
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10%的抖动
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }
    
    return Math.max(100, Math.floor(delay)); // 最小100ms
  }

  private isRetryableError(error: any, config: RetryConfig): boolean {
    // 检查HTTP状态码
    if (error.response?.status) {
      const retryableStatuses = [429, 500, 502, 503, 504];
      if (retryableStatuses.includes(error.response.status)) {
        return true;
      }
    }

    // 检查错误代码
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    // 检查错误类型
    const retryableErrorTypes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE'
    ];

    return retryableErrorTypes.some(type => 
      error.code === type || 
      error.message?.includes(type) ||
      error.name === type
    );
  }

  private getRetryableErrors(): string[] {
    return [
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'TIMEOUT',
      'TOO_MANY_REQUESTS',
      'DATABASE_CONNECTION_FAILED',
      'CACHE_UNAVAILABLE',
      'EXTERNAL_SERVICE_TIMEOUT',
      'EXTERNAL_SERVICE_UNAVAILABLE'
    ];
  }

  private async recordSuccess(operationKey: string, attempts: number): Promise<void> {
    const stats = this.retryStats.get(operationKey) || {
      successRate: 0,
      avgAttempts: 0,
      lastUpdate: 0
    };

    // 指数移动平均更新成功率
    const alpha = 0.1; // 学习率
    stats.successRate = stats.successRate * (1 - alpha) + alpha;
    stats.avgAttempts = stats.avgAttempts * (1 - alpha) + attempts * alpha;
    stats.lastUpdate = Date.now();

    this.retryStats.set(operationKey, stats);

    // 持久化统计信息
    await this.persistRetryStats(operationKey, stats);
  }

  private async recordFailure(operationKey: string, attempts: number, retriesExhausted: boolean): Promise<void> {
    const stats = this.retryStats.get(operationKey) || {
      successRate: 0,
      avgAttempts: 0,
      lastUpdate: 0
    };

    // 更新失败率
    const alpha = 0.1;
    stats.successRate = stats.successRate * (1 - alpha); // 成功率降低
    stats.avgAttempts = stats.avgAttempts * (1 - alpha) + attempts * alpha;
    stats.lastUpdate = Date.now();

    this.retryStats.set(operationKey, stats);

    // 记录失败指标
    await this.recordFailureMetrics(operationKey, attempts, retriesExhausted);
    await this.persistRetryStats(operationKey, stats);
  }

  private async persistRetryStats(operationKey: string, stats: any): Promise<void> {
    const statsKey = `retry_stats:${operationKey}`;
    await this.cacheService.set(statsKey, JSON.stringify(stats), 3600); // 1小时TTL
  }

  private async recordFailureMetrics(operationKey: string, attempts: number, retriesExhausted: boolean): Promise<void> {
    const metricsKey = `retry_failures:${operationKey}`;
    const failureData = {
      timestamp: Date.now(),
      attempts,
      retriesExhausted,
      operationKey
    };

    await this.cacheService.lpush(metricsKey, JSON.stringify(failureData));
    await this.cacheService.ltrim(metricsKey, 0, 99); // 保留最近100次失败记录
  }

  private getStrategyName(config: RetryConfig): string {
    return `exponential_backoff_max${config.maxRetries}_base${config.baseDelay}ms`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取重试统计信息
  async getRetryStats(operationKey: string): Promise<any> {
    const stats = this.retryStats.get(operationKey);
    if (stats) {
      return stats;
    }

    // 从缓存中加载
    const statsKey = `retry_stats:${operationKey}`;
    const cachedStats = await this.cacheService.get(statsKey);
    if (cachedStats) {
      const parsedStats = JSON.parse(cachedStats);
      this.retryStats.set(operationKey, parsedStats);
      return parsedStats;
    }

    return null;
  }

  // 清除重试统计
  async clearRetryStats(operationKey?: string): Promise<void> {
    if (operationKey) {
      this.retryStats.delete(operationKey);
      await this.cacheService.del(`retry_stats:${operationKey}`);
    } else {
      this.retryStats.clear();
      // 清除所有重试统计缓存
      const pattern = 'retry_stats:*';
      const keys = await this.cacheService.keys(pattern);
      if (keys.length > 0) {
        await this.cacheService.del(...keys);
      }
    }
  }
}
```

### 2.2 重试装饰器

```typescript
// 📁 libs/shared/src/retry/retry.decorator.ts
import { AdaptiveRetryService } from './adaptive-retry.service';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  key?: string; // 重试统计键名
}

// 重试装饰器
export function Retry(options: RetryOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const operationKey = options.key || `${className}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      // 获取重试服务实例（需要通过依赖注入）
      const retryService = this.retryService || global.retryService;
      
      if (!retryService) {
        throw new Error('AdaptiveRetryService not available for @Retry decorator');
      }

      const result = await retryService.executeWithRetry(
        () => originalMethod.apply(this, args),
        operationKey,
        options
      );

      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}

// 条件重试装饰器（仅在特定条件下重试）
export function ConditionalRetry(
  condition: (error: any) => boolean,
  options: RetryOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const operationKey = options.key || `${className}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const retryService = this.retryService || global.retryService;
      
      if (!retryService) {
        throw new Error('AdaptiveRetryService not available for @ConditionalRetry decorator');
      }

      // 包装条件检查的重试配置
      const conditionalConfig = {
        ...options,
        retryableErrors: [], // 清空默认可重试错误
      };

      const result = await retryService.executeWithRetry(
        () => originalMethod.apply(this, args),
        operationKey,
        {
          ...conditionalConfig,
          // 自定义重试条件检查
          isRetryable: condition
        }
      );

      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}

// 批量重试装饰器
export function BatchRetry(options: RetryOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const operationKey = options.key || `${className}.${propertyName}`;

    descriptor.value = async function (items: any[], ...args: any[]) {
      const retryService = this.retryService || global.retryService;
      
      if (!retryService) {
        throw new Error('AdaptiveRetryService not available for @BatchRetry decorator');
      }

      // 为每个项目创建重试操作
      const operations = items.map((item, index) => ({
        operation: () => originalMethod.call(this, item, ...args),
        key: `${operationKey}_item_${index}`,
        config: options
      }));

      const results = await retryService.batchExecuteWithRetry(operations);
      
      // 提取成功的结果和失败的错误
      const successes = results
        .filter(result => result.success)
        .map(result => result.data);
      
      const failures = results
        .filter(result => !result.success)
        .map((result, index) => ({ index, error: result.error }));

      return {
        successes,
        failures,
        totalAttempts: results.reduce((sum, result) => sum + result.attempts.length, 0)
      };
    };

    return descriptor;
  };
}

// 使用示例
export class ExampleService {
  constructor(private readonly retryService: AdaptiveRetryService) {}

  @Retry({
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    jitter: true
  })
  async unreliableOperation(data: any): Promise<any> {
    // 可能失败的操作
    const response = await fetch('/api/unreliable-endpoint', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  @ConditionalRetry(
    (error) => error.code === 'TEMPORARY_FAILURE',
    { maxRetries: 2, baseDelay: 500 }
  )
  async selectiveRetryOperation(): Promise<any> {
    // 只有在特定错误条件下才重试
    throw new Error('TEMPORARY_FAILURE');
  }

  @BatchRetry({
    maxRetries: 2,
    baseDelay: 500
  })
  async processBatchItems(item: any): Promise<any> {
    // 批量处理项目，每个项目都有独立的重试逻辑
    return this.processItem(item);
  }

  private async processItem(item: any): Promise<any> {
    // 处理单个项目的逻辑
    return { processed: true, item };
  }
}
```

## ⚡ M3: 熔断器标准化 (2小时)

### 3.1 企业级熔断器实现

```typescript
// 📁 libs/shared/src/circuit-breaker/enterprise-circuit-breaker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

enum CircuitState {
  CLOSED = 'closed',      // 正常状态
  OPEN = 'open',          // 熔断开启
  HALF_OPEN = 'half_open' // 半开状态
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // 失败阈值
  failureRate: number;           // 失败率阈值 (0-1)
  successThreshold: number;      // 半开状态下的成功阈值
  timeout: number;               // 熔断器开启时间 (ms)
  monitoringPeriod: number;      // 监控周期 (ms)
  minimumCallCount: number;      // 最小调用次数
  slowCallThreshold: number;     // 慢调用阈值 (ms)
  slowCallRate: number;          // 慢调用率阈值 (0-1)
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  totalCalls: number;
  successfulCalls: number;
  slowCalls: number;
  lastStateChange: number;
  callsInWindow: Array<{
    timestamp: number;
    success: boolean;
    duration: number;
  }>;
}

interface CircuitBreakerMetrics {
  state: CircuitState;
  failureRate: number;
  slowCallRate: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  slowCalls: number;
  averageResponseTime: number;
  lastFailureTime: number;
  timeInCurrentState: number;
}

@Injectable()
export class EnterpriseCircuitBreakerService {
  private readonly logger = new Logger(EnterpriseCircuitBreakerService.name);
  private readonly circuitStates = new Map<string, CircuitBreakerState>();
  private readonly configs = new Map<string, CircuitBreakerConfig>();

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
  ) {
    // 启动清理定时器
    this.startCleanupTimer();
  }

  // 执行受保护的操作
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuitConfig = this.getOrCreateConfig(circuitName, config);
    const circuitState = this.getOrCreateState(circuitName);

    // 检查熔断器状态
    this.updateCircuitState(circuitName, circuitConfig, circuitState);

    if (circuitState.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(
        `熔断器 ${circuitName} 处于开启状态`,
        circuitName,
        circuitState.lastFailureTime
      );
    }

    const startTime = Date.now();
    
    try {
      // 执行操作
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // 记录成功调用
      this.recordSuccess(circuitName, circuitConfig, circuitState, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 记录失败调用
      this.recordFailure(circuitName, circuitConfig, circuitState, duration, error);
      
      throw error;
    }
  }

  // 批量执行操作
  async batchExecute<T>(
    operations: Array<{
      circuitName: string;
      operation: () => Promise<T>;
      config?: Partial<CircuitBreakerConfig>;
    }>
  ): Promise<Array<{ success: boolean; data?: T; error?: any; circuitName: string }>> {
    const results = await Promise.allSettled(
      operations.map(async ({ circuitName, operation, config }) => {
        try {
          const data = await this.execute(circuitName, operation, config);
          return { success: true, data, circuitName };
        } catch (error) {
          return { success: false, error, circuitName };
        }
      })
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason,
          circuitName: 'unknown'
        };
      }
    });
  }

  // 获取熔断器指标
  getMetrics(circuitName: string): CircuitBreakerMetrics | null {
    const state = this.circuitStates.get(circuitName);
    if (!state) return null;

    const now = Date.now();
    const config = this.configs.get(circuitName);
    
    // 计算当前监控窗口内的统计信息
    const windowCalls = this.getCallsInWindow(state, config.monitoringPeriod);
    const totalCalls = windowCalls.length;
    const successfulCalls = windowCalls.filter(call => call.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const slowCalls = windowCalls.filter(call => call.duration > config.slowCallThreshold).length;
    
    const failureRate = totalCalls > 0 ? failedCalls / totalCalls : 0;
    const slowCallRate = totalCalls > 0 ? slowCalls / totalCalls : 0;
    const averageResponseTime = totalCalls > 0 
      ? windowCalls.reduce((sum, call) => sum + call.duration, 0) / totalCalls 
      : 0;

    return {
      state: state.state,
      failureRate,
      slowCallRate,
      totalCalls,
      successfulCalls,
      failedCalls,
      slowCalls,
      averageResponseTime,
      lastFailureTime: state.lastFailureTime,
      timeInCurrentState: now - state.lastStateChange
    };
  }

  // 手动打开熔断器
  async openCircuit(circuitName: string, reason: string = 'manual'): Promise<void> {
    const state = this.getOrCreateState(circuitName);
    
    state.state = CircuitState.OPEN;
    state.lastStateChange = Date.now();
    state.lastFailureTime = Date.now();

    await this.persistState(circuitName, state);
    
    this.logger.warn(`手动开启熔断器: ${circuitName}, 原因: ${reason}`);
  }

  // 手动关闭熔断器
  async closeCircuit(circuitName: string): Promise<void> {
    const state = this.getOrCreateState(circuitName);
    
    state.state = CircuitState.CLOSED;
    state.failureCount = 0;
    state.successCount = 0;
    state.lastStateChange = Date.now();

    await this.persistState(circuitName, state);
    
    this.logger.info(`手动关闭熔断器: ${circuitName}`);
  }

  // 重置熔断器状态
  async resetCircuit(circuitName: string): Promise<void> {
    const config = this.getOrCreateConfig(circuitName);
    const newState: CircuitBreakerState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      totalCalls: 0,
      successfulCalls: 0,
      slowCalls: 0,
      lastStateChange: Date.now(),
      callsInWindow: []
    };

    this.circuitStates.set(circuitName, newState);
    await this.persistState(circuitName, newState);
    
    this.logger.info(`重置熔断器: ${circuitName}`);
  }

  private getOrCreateConfig(circuitName: string, overrides?: Partial<CircuitBreakerConfig>): CircuitBreakerConfig {
    if (!this.configs.has(circuitName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
        failureRate: this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_RATE', 0.5),
        successThreshold: this.configService.get<number>('CIRCUIT_BREAKER_SUCCESS_THRESHOLD', 3),
        timeout: this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000),
        monitoringPeriod: this.configService.get<number>('CIRCUIT_BREAKER_MONITORING_PERIOD', 60000),
        minimumCallCount: this.configService.get<number>('CIRCUIT_BREAKER_MINIMUM_CALLS', 10),
        slowCallThreshold: this.configService.get<number>('CIRCUIT_BREAKER_SLOW_CALL_THRESHOLD', 5000),
        slowCallRate: this.configService.get<number>('CIRCUIT_BREAKER_SLOW_CALL_RATE', 0.5)
      };

      this.configs.set(circuitName, { ...defaultConfig, ...overrides });
    }

    return this.configs.get(circuitName);
  }

  private getOrCreateState(circuitName: string): CircuitBreakerState {
    if (!this.circuitStates.has(circuitName)) {
      const initialState: CircuitBreakerState = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        totalCalls: 0,
        successfulCalls: 0,
        slowCalls: 0,
        lastStateChange: Date.now(),
        callsInWindow: []
      };

      this.circuitStates.set(circuitName, initialState);
    }

    return this.circuitStates.get(circuitName);
  }

  private updateCircuitState(
    circuitName: string,
    config: CircuitBreakerConfig,
    state: CircuitBreakerState
  ): void {
    const now = Date.now();

    switch (state.state) {
      case CircuitState.CLOSED:
        this.evaluateClosedState(config, state);
        break;
        
      case CircuitState.OPEN:
        this.evaluateOpenState(config, state, now);
        break;
        
      case CircuitState.HALF_OPEN:
        this.evaluateHalfOpenState(config, state);
        break;
    }

    // 清理过期的调用记录
    this.cleanupOldCalls(state, config.monitoringPeriod);
  }

  private evaluateClosedState(config: CircuitBreakerConfig, state: CircuitBreakerState): void {
    const windowCalls = this.getCallsInWindow(state, config.monitoringPeriod);
    
    if (windowCalls.length < config.minimumCallCount) {
      return; // 调用次数不足，不进行评估
    }

    const failedCalls = windowCalls.filter(call => !call.success).length;
    const slowCalls = windowCalls.filter(call => call.duration > config.slowCallThreshold).length;
    
    const failureRate = failedCalls / windowCalls.length;
    const slowCallRate = slowCalls / windowCalls.length;

    // 检查是否需要开启熔断器
    if (failureRate >= config.failureRate || slowCallRate >= config.slowCallRate) {
      state.state = CircuitState.OPEN;
      state.lastStateChange = Date.now();
      state.lastFailureTime = Date.now();
      
      this.logger.warn(
        `熔断器开启: 失败率=${(failureRate * 100).toFixed(1)}%, 慢调用率=${(slowCallRate * 100).toFixed(1)}%`
      );
    }
  }

  private evaluateOpenState(config: CircuitBreakerConfig, state: CircuitBreakerState, now: number): void {
    // 检查是否超过了开启时间，可以转为半开状态
    if (now - state.lastStateChange >= config.timeout) {
      state.state = CircuitState.HALF_OPEN;
      state.successCount = 0;
      state.lastStateChange = now;
      
      this.logger.info('熔断器转为半开状态');
    }
  }

  private evaluateHalfOpenState(config: CircuitBreakerConfig, state: CircuitBreakerState): void {
    // 半开状态下，如果成功次数达到阈值，关闭熔断器
    if (state.successCount >= config.successThreshold) {
      state.state = CircuitState.CLOSED;
      state.failureCount = 0;
      state.successCount = 0;
      state.lastStateChange = Date.now();
      
      this.logger.info('熔断器关闭');
    }
  }

  private recordSuccess(
    circuitName: string,
    config: CircuitBreakerConfig,
    state: CircuitBreakerState,
    duration: number
  ): void {
    const now = Date.now();
    
    // 添加调用记录
    state.callsInWindow.push({
      timestamp: now,
      success: true,
      duration
    });

    state.totalCalls++;
    state.successfulCalls++;

    if (state.state === CircuitState.HALF_OPEN) {
      state.successCount++;
    }

    // 异步持久化状态
    setImmediate(() => this.persistState(circuitName, state));
  }

  private recordFailure(
    circuitName: string,
    config: CircuitBreakerConfig,
    state: CircuitBreakerState,
    duration: number,
    error: any
  ): void {
    const now = Date.now();
    
    // 添加调用记录
    state.callsInWindow.push({
      timestamp: now,
      success: false,
      duration
    });

    state.totalCalls++;
    state.failureCount++;
    state.lastFailureTime = now;

    // 如果是半开状态，失败一次就重新打开熔断器
    if (state.state === CircuitState.HALF_OPEN) {
      state.state = CircuitState.OPEN;
      state.lastStateChange = now;
      state.successCount = 0;
      
      this.logger.warn(`半开状态下失败，重新开启熔断器: ${error.message}`);
    }

    // 异步持久化状态
    setImmediate(() => this.persistState(circuitName, state));
  }

  private getCallsInWindow(state: CircuitBreakerState, windowSize: number): Array<{
    timestamp: number;
    success: boolean;
    duration: number;
  }> {
    const cutoff = Date.now() - windowSize;
    return state.callsInWindow.filter(call => call.timestamp > cutoff);
  }

  private cleanupOldCalls(state: CircuitBreakerState, windowSize: number): void {
    const cutoff = Date.now() - windowSize;
    state.callsInWindow = state.callsInWindow.filter(call => call.timestamp > cutoff);
  }

  private async persistState(circuitName: string, state: CircuitBreakerState): Promise<void> {
    try {
      const stateKey = `circuit_breaker:${circuitName}`;
      await this.cacheService.set(stateKey, JSON.stringify(state), 3600); // 1小时TTL
    } catch (error) {
      this.logger.error(`Failed to persist circuit breaker state for ${circuitName}:`, error);
    }
  }

  private startCleanupTimer(): void {
    const cleanupInterval = this.configService.get<number>('CIRCUIT_BREAKER_CLEANUP_INTERVAL', 300000); // 5分钟
    
    setInterval(() => {
      this.cleanupInactiveCircuits();
    }, cleanupInterval);
  }

  private cleanupInactiveCircuits(): void {
    const inactivityThreshold = this.configService.get<number>('CIRCUIT_BREAKER_INACTIVITY_THRESHOLD', 3600000); // 1小时
    const now = Date.now();

    for (const [circuitName, state] of this.circuitStates.entries()) {
      const lastActivity = Math.max(
        state.lastStateChange,
        state.callsInWindow.length > 0 ? state.callsInWindow[state.callsInWindow.length - 1].timestamp : 0
      );

      if (now - lastActivity > inactivityThreshold) {
        this.circuitStates.delete(circuitName);
        this.configs.delete(circuitName);
        
        this.logger.debug(`清理不活跃的熔断器: ${circuitName}`);
      }
    }
  }
}

// 熔断器开启异常
export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly circuitName: string,
    public readonly lastFailureTime: number
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
```

Task M的统一错误处理和重试标准化已实现核心组件！

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Task L: \u7edf\u4e00\u8ba4\u8bc1\u548c\u6388\u6743\u6807\u51c6\u5316 - \u5b9e\u73b0\u8de8\u670d\u52a1\u7684\u7edf\u4e00\u8ba4\u8bc1\u673a\u5236\u3001JWT\u6807\u51c6\u3001API\u5bc6\u94a5\u7ba1\u7406", "status": "completed", "priority": "high", "id": "12"}, {"content": "Task M: \u7edf\u4e00\u9519\u8bef\u5904\u7406\u548c\u91cd\u8bd5\u6807\u51c6\u5316 - \u6807\u51c6\u5316\u540c\u6b65API\u7684\u9519\u8bef\u54cd\u5e94\u3001\u91cd\u8bd5\u7b56\u7565\u3001\u7194\u65ad\u673a\u5236", "status": "completed", "priority": "high", "id": "13"}, {"content": "Task N: API\u7f51\u5173\u7edf\u4e00\u5316\u6539\u9020 - \u5b9e\u73b0\u7edf\u4e00\u8ba4\u8bc1\u3001\u9650\u6d41\u3001\u8def\u7531\u3001\u76d1\u63a7\u7684\u4f01\u4e1a\u7ea7\u7f51\u5173", "status": "in_progress", "priority": "high", "id": "14"}, {"content": "Task O: \u6027\u80fd\u548c\u76d1\u63a7\u6807\u51c6\u5316 - \u5efa\u7acbSLA\u6807\u51c6\u3001\u6027\u80fd\u76d1\u63a7\u3001APM\u96c6\u6210\u3001\u544a\u8b66\u4f53\u7cfb", "status": "pending", "priority": "medium", "id": "15"}, {"content": "Task P: \u6570\u636e\u683c\u5f0f\u548c\u9a8c\u8bc1\u6807\u51c6\u5316 - \u7edf\u4e00\u6570\u636e\u5e8f\u5217\u5316\u3001\u9a8c\u8bc1\u89c4\u5219\u3001API\u6587\u6863\u751f\u6210", "status": "pending", "priority": "medium", "id": "16"}, {"content": "Task Q: \u5b89\u5168\u4f20\u8f93\u548c\u5408\u89c4\u6807\u51c6\u5316 - HTTPS\u5f3a\u5236\u3001\u6570\u636e\u52a0\u5bc6\u3001\u5ba1\u8ba1\u5408\u89c4\u3001\u5b89\u5168\u626b\u63cf", "status": "pending", "priority": "medium", "id": "17"}]