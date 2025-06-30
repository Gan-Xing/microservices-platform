/**
 * 审计装饰器
 * 提供自动审计日志记录功能
 */

import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';

// 审计元数据键
export const AUDIT_KEY = 'audit';
export const AUDIT_OPTIONS_KEY = 'audit_options';

// 审计事件类型
export enum AuditEventType {
  // 数据操作
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  
  // 用户操作
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  
  // 权限操作
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  ROLE_ASSIGN = 'role_assign',
  ROLE_REMOVE = 'role_remove',
  
  // 配置操作
  CONFIG_CHANGE = 'config_change',
  SETTING_UPDATE = 'setting_update',
  
  // 文件操作
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
  
  // 系统操作
  SYSTEM_START = 'system_start',
  SYSTEM_STOP = 'system_stop',
  BACKUP_CREATE = 'backup_create',
  RESTORE_EXECUTE = 'restore_execute',
  
  // 业务操作
  BUSINESS_ACTION = 'business_action',
  WORKFLOW_START = 'workflow_start',
  WORKFLOW_COMPLETE = 'workflow_complete',
  
  // 安全操作
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCESS_DENIED = 'access_denied',
  
  // 自定义操作
  CUSTOM = 'custom',
}

// 审计级别
export enum AuditLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 审计选项
export interface AuditOptions {
  // 事件类型
  eventType: AuditEventType | string;
  
  // 资源类型
  resource: string;
  
  // 审计级别
  level?: AuditLevel;
  
  // 是否记录请求数据
  includeRequestData?: boolean;
  
  // 是否记录响应数据
  includeResponseData?: boolean;
  
  // 是否记录操作前的数据状态
  includeBeforeData?: boolean;
  
  // 是否记录操作后的数据状态
  includeAfterData?: boolean;
  
  // 敏感字段（需要脱敏）
  sensitiveFields?: string[];
  
  // 自定义元数据
  metadata?: Record<string, any>;
  
  // 是否异步记录（默认true）
  async?: boolean;
  
  // 自定义消息模板
  messageTemplate?: string;
  
  // 条件审计（满足条件才记录）
  condition?: (context: any) => boolean;
  
  // 资源ID提取器
  resourceIdExtractor?: (context: any) => string | undefined;
  
  // 自定义标签
  tags?: string[];
  
  // 是否跳过失败的操作
  skipOnError?: boolean;
}

// 审计上下文
export interface AuditContext {
  eventType: AuditEventType | string;
  resource: string;
  resourceId?: string;
  action: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  requestId?: string;
  method: string;
  url: string;
  userAgent?: string;
  sourceIp?: string;
  requestData?: any;
  responseData?: any;
  beforeData?: any;
  afterData?: any;
  duration?: number;
  statusCode?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  level: AuditLevel;
  timestamp: Date;
}

/**
 * 审计装饰器
 * 自动记录方法执行的审计日志
 * 
 * @param eventType 事件类型
 * @param resource 资源类型
 * @param options 审计选项
 * 
 * @example
 * @Audit(AuditEventType.CREATE, 'user')
 * @Audit(AuditEventType.UPDATE, 'user', { includeBeforeData: true })
 * @Audit('custom_action', 'order', { level: AuditLevel.HIGH })
 */
export const Audit = (
  eventType: AuditEventType | string,
  resource: string,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  const auditConfig: AuditOptions = {
    eventType,
    resource,
    level: AuditLevel.MEDIUM,
    includeRequestData: true,
    includeResponseData: false,
    includeBeforeData: false,
    includeAfterData: false,
    async: true,
    skipOnError: false,
    ...options,
  };

  return applyDecorators(
    SetMetadata(AUDIT_KEY, true),
    SetMetadata(AUDIT_OPTIONS_KEY, auditConfig),
    UseInterceptors(AuditInterceptor),
  );
};

/**
 * 数据审计装饰器
 * 专用于数据操作的审计，自动记录数据变更
 * 
 * @param resource 资源类型
 * @param options 审计选项
 */
export const DataAudit = (
  resource: string,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(AuditEventType.UPDATE, resource, {
    includeBeforeData: true,
    includeAfterData: true,
    level: AuditLevel.HIGH,
    ...options,
  });
};

/**
 * 安全审计装饰器
 * 专用于安全相关操作的审计
 * 
 * @param eventType 安全事件类型
 * @param resource 资源类型
 * @param options 审计选项
 */
export const SecurityAudit = (
  eventType: AuditEventType | string,
  resource: string,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(eventType, resource, {
    level: AuditLevel.CRITICAL,
    includeRequestData: true,
    includeResponseData: true,
    async: false, // 安全审计同步记录
    ...options,
  });
};

/**
 * 业务审计装饰器
 * 专用于关键业务操作的审计
 * 
 * @param action 业务动作
 * @param resource 资源类型
 * @param options 审计选项
 */
export const BusinessAudit = (
  action: string,
  resource: string,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(action, resource, {
    level: AuditLevel.HIGH,
    includeRequestData: true,
    includeAfterData: true,
    tags: ['business'],
    ...options,
  });
};

/**
 * 用户操作审计装饰器
 * 专用于用户相关操作的审计
 * 
 * @param eventType 事件类型
 * @param options 审计选项
 */
export const UserAudit = (
  eventType: AuditEventType,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(eventType, 'user', {
    level: AuditLevel.HIGH,
    includeRequestData: true,
    sensitiveFields: ['password', 'token', 'secret'],
    tags: ['user'],
    ...options,
  });
};

/**
 * 文件操作审计装饰器
 * 专用于文件相关操作的审计
 * 
 * @param eventType 文件事件类型
 * @param options 审计选项
 */
export const FileAudit = (
  eventType: AuditEventType,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(eventType, 'file', {
    level: AuditLevel.MEDIUM,
    includeRequestData: true,
    includeResponseData: true,
    tags: ['file'],
    ...options,
  });
};

/**
 * 条件审计装饰器
 * 根据条件决定是否记录审计日志
 * 
 * @param condition 审计条件
 * @param eventType 事件类型
 * @param resource 资源类型
 * @param options 审计选项
 */
export const ConditionalAudit = (
  condition: (context: any) => boolean,
  eventType: AuditEventType | string,
  resource: string,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(eventType, resource, {
    condition,
    ...options,
  });
};

/**
 * 批量操作审计装饰器
 * 专用于批量操作的审计
 * 
 * @param eventType 事件类型
 * @param resource 资源类型
 * @param options 审计选项
 */
export const BatchAudit = (
  eventType: AuditEventType,
  resource: string,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(eventType, resource, {
    level: AuditLevel.HIGH,
    includeRequestData: true,
    includeResponseData: true,
    tags: ['batch'],
    metadata: { isBatchOperation: true },
    ...options,
  });
};

/**
 * 系统操作审计装饰器
 * 专用于系统级操作的审计
 * 
 * @param eventType 系统事件类型
 * @param options 审计选项
 */
export const SystemAudit = (
  eventType: AuditEventType,
  options: Partial<AuditOptions> = {},
): MethodDecorator => {
  return Audit(eventType, 'system', {
    level: AuditLevel.CRITICAL,
    includeRequestData: true,
    includeResponseData: true,
    async: false, // 系统操作同步记录
    tags: ['system'],
    ...options,
  });
};

/**
 * 跳过审计装饰器
 * 明确标记某个方法不需要审计
 */
export const SkipAudit = (): MethodDecorator => {
  return SetMetadata('skip_audit', true);
};