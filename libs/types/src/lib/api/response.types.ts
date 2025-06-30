/**
 * API响应类型定义
 * 基于BaseResponseDto标准
 */

export interface BaseResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
  requestId?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends BaseResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BulkResponse<T = any> {
  success: boolean;
  message: string;
  results: BulkItemResult<T>[];
  summary: BulkSummary;
  requestId?: string;
  timestamp?: string;
}

export interface BulkItemResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  index: number;
}

export interface BulkSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

// 用户管理相关响应类型
export interface UserResponse {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  roles: RoleResponse[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface UserProfileResponse extends UserResponse {
  preferences: UserPreferences;
  statistics: UserStatistics;
}

export interface UserPreferences {
  timezone: string;
  locale: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
}

export interface UserStatistics {
  loginCount: number;
  lastActivityAt?: string;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  storage: number;
  apiCalls: number;
  bandwidth: number;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
}

// 认证相关响应类型
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserResponse;
  session: SessionInfo;
}

export interface SessionInfo {
  id: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

export interface DeviceInfo {
  name: string;
  type: 'web' | 'mobile' | 'desktop';
  os?: string;
  browser?: string;
  trusted: boolean;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// 租户管理相关响应类型
export interface TenantResponse {
  id: string;
  name: string;
  domain?: string;
  plan: string;
  status: 'active' | 'suspended' | 'cancelled';
  settings: TenantSettings;
  usage: TenantUsage;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  branding: BrandingSettings;
  features: FeatureSettings;
  limits: TenantLimits;
}

export interface BrandingSettings {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
}

export interface FeatureSettings {
  sso: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
}

export interface TenantLimits {
  users: number;
  storage: number; // in bytes
  apiCalls: number; // per month
  bandwidth: number; // in bytes per month
}

export interface TenantUsage {
  users: number;
  storage: number;
  apiCalls: number;
  bandwidth: number;
  lastUpdated: string;
}

// 权限管理相关响应类型
export interface RoleResponse {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionResponse[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  isSystem: boolean;
}

// 文件存储相关响应类型
export interface FileResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folder?: string;
  isPublic: boolean;
  url: string;
  downloadUrl: string;
  metadata?: Record<string, any>;
  uploadedBy: string;
  uploadedAt: string;
}

export interface UploadResponse {
  files: FileResponse[];
  summary: UploadSummary;
}

export interface UploadSummary {
  total: number;
  successful: number;
  failed: number;
  totalSize: number;
}

// 通知相关响应类型
export interface NotificationResponse {
  id: string;
  subject?: string;
  content: string;
  channels: NotificationChannel[];
  status: 'pending' | 'sending' | 'sent' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipients: NotificationRecipient[];
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'email';
  address: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

// 任务调度相关响应类型
export interface JobResponse {
  id: string;
  name: string;
  type: string;
  schedule?: string;
  status: 'active' | 'inactive' | 'running' | 'failed';
  lastRun?: JobRunResponse;
  nextRun?: string;
  statistics: JobStatistics;
  createdAt: string;
  updatedAt: string;
}

export interface JobRunResponse {
  id: string;
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
}

export interface JobStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
}

// 监控相关响应类型
export interface MetricsResponse {
  metrics: MetricData[];
  timeRange: TimeRange;
  granularity: string;
}

export interface MetricData {
  name: string;
  service: string;
  dataPoints: DataPoint[];
  unit: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface DataPoint {
  timestamp: string;
  value: number;
}

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: string;
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}