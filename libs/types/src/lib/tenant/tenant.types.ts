/**
 * 租户核心类型定义
 * 支持多租户架构和资源隔离
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
  limits: TenantLimits;
  usage: TenantUsage;
  billing: TenantBilling;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  PENDING_ACTIVATION = 'pending_activation',
}

export interface TenantPlan {
  id: string;
  name: string;
  type: 'free' | 'trial' | 'basic' | 'professional' | 'enterprise';
  features: string[];
  limits: PlanLimits;
  pricing: PlanPricing;
}

export interface PlanLimits {
  users: number;
  storage: number; // in bytes
  apiCalls: number; // per month
  bandwidth: number; // in bytes per month
  fileUploads: number; // per month
  emailNotifications: number; // per month
  smsNotifications: number; // per month
  customDomains: number;
  apiKeys: number;
  webhooks: number;
}

export interface PlanPricing {
  basePrice: number; // monthly price in cents
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  overageRates: OverageRates;
}

export interface OverageRates {
  perUser: number; // additional cost per user
  perGB: number; // additional cost per GB storage
  per1000ApiCalls: number;
  per1000Emails: number;
  per1000SMS: number;
}

export interface TenantSettings {
  branding: BrandingSettings;
  features: FeatureSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
}

export interface BrandingSettings {
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily?: string;
  customCSS?: string;
  customDomain?: string;
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
}

export interface FeatureSettings {
  sso: boolean;
  twoFactorAuth: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  bulkOperations: boolean;
  dataExport: boolean;
  auditLogs: boolean;
  teamManagement: boolean;
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // in minutes
  ipWhitelist: string[];
  allowedDomains: string[];
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  enableAuditLogging: boolean;
  dataRetentionPeriod: number; // in days
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  preventReuse: number; // number of previous passwords to check
  maxAge: number; // in days
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  webhookNotifications: boolean;
  defaultSender: string;
  replyToEmail: string;
  emailTemplates: Record<string, string>;
  smsProvider: string;
  smsCredentials?: Record<string, string>;
}

export interface IntegrationSettings {
  apiKeys: boolean;
  webhooks: boolean;
  ssoProviders: SSOProvider[];
  paymentGateways: PaymentGateway[];
  storageProviders: StorageProvider[];
}

export interface SSOProvider {
  type: 'google' | 'microsoft' | 'github' | 'gitlab' | 'ldap' | 'saml';
  enabled: boolean;
  config: Record<string, any>;
}

export interface PaymentGateway {
  type: 'stripe' | 'paypal' | 'square';
  enabled: boolean;
  config: Record<string, any>;
}

export interface StorageProvider {
  type: 'local' | 's3' | 'gcs' | 'azure';
  enabled: boolean;
  config: Record<string, any>;
}

export interface TenantLimits {
  users: number;
  storage: number;
  apiCalls: number;
  bandwidth: number;
  fileUploads: number;
  emailNotifications: number;
  smsNotifications: number;
  customDomains: number;
  apiKeys: number;
  webhooks: number;
}

export interface TenantUsage {
  users: number;
  storage: number;
  apiCalls: number;
  bandwidth: number;
  fileUploads: number;
  emailNotifications: number;
  smsNotifications: number;
  customDomains: number;
  apiKeys: number;
  webhooks: number;
  lastUpdated: string;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface TenantBilling {
  customerId?: string;
  subscriptionId?: string;
  paymentMethodId?: string;
  billingEmail: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  currency: string;
  nextBillingDate?: string;
  trialEndsAt?: string;
  gracePeriodEndsAt?: string;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface TenantMember {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  status: 'active' | 'invited' | 'suspended';
  invitedAt?: string;
  joinedAt?: string;
  invitedBy?: string;
  lastActivityAt?: string;
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
  token: string;
  expiresAt: string;
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}