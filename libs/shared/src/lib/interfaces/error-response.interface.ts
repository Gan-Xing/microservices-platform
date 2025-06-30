/**
 * 标准错误响应接口 - 基于统一错误处理标准化
 * 企业级错误处理和监控
 */

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
    
    // 重试信息
    retryable: boolean;        // 是否可重试
    retryAfter?: number;       // 建议重试等待时间(秒)
    
    // 业务上下文
    tenantId?: string;         // 租户ID
    userId?: string;           // 用户ID
    correlationId?: string;    // 关联ID
    
    // 开发调试信息（仅非生产环境）
    stack?: string;            // 错误堆栈
    originalError?: any;       // 原始错误对象
  };
}

// 常用错误代码枚举
export enum ErrorCode {
  // 通用错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // 认证和授权
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // 用户相关
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_INACTIVE = 'USER_INACTIVE',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // 租户相关
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  TENANT_LIMIT_EXCEEDED = 'TENANT_LIMIT_EXCEEDED',
  
  // 业务逻辑
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // 第三方服务
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
}