/**
 * 用户状态枚举
 * 企业级微服务平台标准版本
 */

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  USER = 'user',
  GUEST = 'guest',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
  WECHAT = 'wechat',
}

export enum AccountType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum PermissionScope {
  GLOBAL = 'global',
  TENANT = 'tenant',
  PROJECT = 'project',
  RESOURCE = 'resource',
}