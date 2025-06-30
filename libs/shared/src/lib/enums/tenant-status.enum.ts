/**
 * 租户状态和计费相关枚举
 * 企业级微服务平台标准版本
 */

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  TRIAL = 'trial',
  EXPIRED = 'expired',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional', 
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum TenantSize {
  SMALL = 'small',      // 1-10 users
  MEDIUM = 'medium',    // 11-100 users
  LARGE = 'large',      // 101-1000 users
  ENTERPRISE = 'enterprise', // 1000+ users
}

export enum ResourceQuotaType {
  API_CALLS = 'api_calls',
  STORAGE_GB = 'storage_gb',
  BANDWIDTH_GB = 'bandwidth_gb',
  USERS = 'users',
  PROJECTS = 'projects',
}