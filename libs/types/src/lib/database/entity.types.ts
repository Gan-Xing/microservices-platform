/**
 * 数据库实体类型定义
 * 支持多租户、软删除、审计追踪
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

export interface VersionedEntity extends BaseEntity {
  version: number;
}

// 用户相关实体类型
export interface User extends TenantEntity, AuditableEntity {
  email: string;
  username?: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  preferences: UserPreferences;
  metadata?: Record<string, any>;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export interface UserSession extends BaseEntity {
  userId: string;
  sessionId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
  deviceInfo?: DeviceInfo;
}

export interface UserRole extends BaseEntity {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

// 租户相关实体类型
export interface Tenant extends BaseEntity, AuditableEntity {
  name: string;
  slug: string;
  domain?: string;
  plan: string;
  status: TenantStatus;
  settings: TenantSettings;
  limits: TenantLimits;
  usage: TenantUsage;
  subscriptionId?: string;
  subscriptionStatus?: string;
  trialEndsAt?: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
  EXPIRED = 'expired',
}

// 权限相关实体类型
export interface Role extends TenantEntity, AuditableEntity {
  name: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
}

export interface Permission extends BaseEntity {
  name: string;
  resource: string;
  action: string;
  description?: string;
  isSystem: boolean;
}

export interface RolePermission extends BaseEntity {
  roleId: string;
  permissionId: string;
}

// 文件存储相关实体类型
export interface File extends TenantEntity, AuditableEntity {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folder?: string;
  path: string;
  url: string;
  isPublic: boolean;
  checksum: string;
  metadata?: Record<string, any>;
  uploadedBy: string;
}

export interface FileVersion extends BaseEntity {
  fileId: string;
  version: number;
  filename: string;
  size: number;
  path: string;
  checksum: string;
  createdBy: string;
}

// 通知相关实体类型
export interface Notification extends TenantEntity, AuditableEntity {
  subject?: string;
  content: string;
  template?: string;
  channels: NotificationChannelType[];
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  metadata?: Record<string, any>;
}

export enum NotificationChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface NotificationRecipient extends BaseEntity {
  notificationId: string;
  type: 'user' | 'email';
  userId?: string;
  email?: string;
  phone?: string;
  status: NotificationRecipientStatus;
  sentAt?: Date;
  error?: string;
}

export enum NotificationRecipientStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

// 任务调度相关实体类型
export interface Job extends TenantEntity, AuditableEntity {
  name: string;
  type: string;
  schedule?: string; // cron expression
  payload?: Record<string, any>;
  options?: JobOptions;
  status: JobStatus;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  failureCount: number;
  successCount: number;
}

export interface JobOptions {
  attempts?: number;
  backoff?: string;
  delay?: number;
  priority?: number;
  timeout?: number;
}

export enum JobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RUNNING = 'running',
  FAILED = 'failed',
  PAUSED = 'paused',
}

export interface JobRun extends BaseEntity {
  jobId: string;
  status: JobRunStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  attempt: number;
}

export enum JobRunStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// 审计相关实体类型
export interface AuditLog extends BaseEntity {
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  url?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  statusCode?: number;
  duration?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

// 缓存相关实体类型
export interface CacheEntry {
  key: string;
  value: any;
  ttl?: number;
  tags?: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  lastReset: Date;
}