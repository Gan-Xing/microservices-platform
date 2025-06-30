/**
 * API请求类型定义
 * 基于统一认证和错误处理标准化
 */

export interface BaseRequest {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  timestamp?: string;
}

export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchRequest extends PaginationRequest {
  query?: string;
  filters?: Record<string, any>;
  fields?: string[];
}

export interface BulkRequest<T> {
  items: T[];
  batchSize?: number;
  continueOnError?: boolean;
}

export interface UploadRequest {
  files: File[];
  maxSize?: number;
  allowedTypes?: string[];
  compress?: boolean;
}

// 用户管理相关请求类型
export interface CreateUserRequest {
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, any>;
}

export interface UserSearchRequest extends SearchRequest {
  status?: 'active' | 'inactive' | 'suspended';
  role?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// 认证相关请求类型
export interface LoginRequest {
  identifier: string; // email, username, or phone
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    name: string;
    type: 'web' | 'mobile' | 'desktop';
    os?: string;
    browser?: string;
  };
}

export interface RegisterRequest extends CreateUserRequest {
  confirmPassword: string;
  termsAccepted: boolean;
  invitationCode?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 租户管理相关请求类型
export interface CreateTenantRequest {
  name: string;
  domain?: string;
  plan?: string;
  settings?: Record<string, any>;
  adminUser: CreateUserRequest;
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  plan?: string;
  settings?: Record<string, any>;
  status?: 'active' | 'suspended' | 'cancelled';
}

// 权限管理相关请求类型
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AssignRoleRequest {
  userId: string;
  roleIds: string[];
}

// 文件存储相关请求类型
export interface UploadFileRequest {
  file: Buffer | string;
  filename: string;
  mimeType: string;
  size: number;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface FileSearchRequest extends SearchRequest {
  mimeType?: string;
  folder?: string;
  isPublic?: boolean;
  uploadedAfter?: string;
  uploadedBefore?: string;
}

// 通知相关请求类型
export interface SendNotificationRequest {
  recipients: string[]; // user IDs or email addresses
  template?: string;
  subject?: string;
  content: string;
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string;
  metadata?: Record<string, any>;
}

// 任务调度相关请求类型
export interface CreateJobRequest {
  name: string;
  type: string;
  schedule?: string; // cron expression
  payload?: Record<string, any>;
  options?: {
    attempts?: number;
    backoff?: string;
    delay?: number;
    priority?: number;
  };
}

export interface UpdateJobRequest {
  name?: string;
  schedule?: string;
  payload?: Record<string, any>;
  isActive?: boolean;
}

// 监控相关请求类型
export interface MetricsRequest {
  services?: string[];
  metrics?: string[];
  startTime: string;
  endTime: string;
  granularity?: '1m' | '5m' | '15m' | '1h' | '1d';
}

export interface AlertRequest {
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: string[];
  enabled?: boolean;
}