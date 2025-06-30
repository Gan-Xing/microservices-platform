/**
 * 认证核心类型定义
 * 基于统一认证标准化文档
 */

export interface AuthContext {
  user: AuthUser;
  tenant: AuthTenant;
  session: AuthSession;
  permissions: string[];
  roles: string[];
  metadata?: Record<string, any>;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'cancelled';
  plan: string;
  features: string[];
  limits: TenantLimits;
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: string;
  lastActivityAt: string;
  loginMethod: 'password' | 'sso' | 'api_key' | 'system';
}

export interface LoginCredentials {
  identifier: string; // email, username, or phone
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  termsAccepted: boolean;
  invitationCode?: string;
  metadata?: Record<string, any>;
}

export interface DeviceInfo {
  name: string;
  type: 'web' | 'mobile' | 'desktop';
  os?: string;
  browser?: string;
  version?: string;
  fingerprint?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string[];
}

export interface PasswordResetRequest {
  email: string;
  callbackUrl?: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerification {
  token: string;
}

export interface PhoneVerification {
  phone: string;
  code: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  code: string;
  backupCode?: string;
}

export interface ApiKeyRequest {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}

export interface LoginAttempt {
  id: string;
  identifier: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  attemptedAt: string;
  userId?: string;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
  occurredAt: string;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
}