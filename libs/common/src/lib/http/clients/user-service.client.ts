/**
 * 用户管理服务客户端
 * 提供用户信息查询、验证等功能
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { ServiceClientBase } from '../service-client.base';

// 用户基本信息接口
export interface UserInfo {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  roles: string[];
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// 用户凭据验证请求
export interface UserCredentialsValidation {
  email: string;
  password: string;
}

// 用户凭据验证结果
export interface UserCredentialsResult {
  valid: boolean;
  user?: UserInfo;
  reason?: string;
}

// 用户状态验证请求
export interface UserStatusValidation {
  userIds: string[];
  tenantId: string;
}

// 用户状态验证结果
export interface UserStatusResult {
  results: Array<{
    userId: string;
    isActive: boolean;
    status: string;
    lastLoginAt?: string;
    lockedUntil?: string;
  }>;
}

// 用户搜索条件
export interface UserSearchCriteria {
  tenantId: string;
  email?: string;
  username?: string;
  status?: string;
  roles?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 用户搜索结果
export interface UserSearchResult {
  users: UserInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 用户创建请求
export interface CreateUserRequest {
  tenantId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  password: string;
  roles?: string[];
  status?: 'active' | 'inactive';
  emailVerified?: boolean;
  metadata?: Record<string, any>;
  createdBy: string;
}

// 用户更新请求
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
  updatedBy: string;
}

// 密码重置请求
export interface PasswordResetRequest {
  userId: string;
  newPassword: string;
  resetBy: string;
  reason?: string;
}

@Injectable()
export class UserServiceClient extends ServiceClientBase {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super(httpService, configService, {
      serviceName: 'user-management-service',
    });
  }

  /**
   * 根据ID获取用户信息
   */
  getUserById(userId: string): Observable<UserInfo> {
    return this.get<UserInfo>(`/internal/users/${userId}`);
  }

  /**
   * 根据邮箱获取用户信息
   */
  getUserByEmail(email: string, tenantId: string): Observable<UserInfo> {
    return this.get<UserInfo>('/internal/users/by-email', { email, tenantId });
  }

  /**
   * 根据用户名获取用户信息
   */
  getUserByUsername(username: string, tenantId: string): Observable<UserInfo> {
    return this.get<UserInfo>('/internal/users/by-username', { username, tenantId });
  }

  /**
   * 验证用户凭据
   */
  validateCredentials(request: UserCredentialsValidation): Observable<UserCredentialsResult> {
    return this.post<UserCredentialsResult>('/internal/users/validate-credentials', request);
  }

  /**
   * 验证用户状态
   */
  validateUserStatus(request: UserStatusValidation): Observable<UserStatusResult> {
    return this.post<UserStatusResult>('/internal/users/validate-status', request);
  }

  /**
   * 搜索用户
   */
  searchUsers(criteria: UserSearchCriteria): Observable<UserSearchResult> {
    return this.post<UserSearchResult>('/internal/users/search', criteria);
  }

  /**
   * 批量获取用户信息
   */
  getUsersBatch(userIds: string[], tenantId: string): Observable<UserInfo[]> {
    return this.post<UserInfo[]>('/internal/users/batch', { userIds, tenantId });
  }

  /**
   * 创建用户
   */
  createUser(request: CreateUserRequest): Observable<UserInfo> {
    return this.post<UserInfo>('/internal/users', request);
  }

  /**
   * 更新用户信息
   */
  updateUser(userId: string, request: UpdateUserRequest): Observable<UserInfo> {
    return this.put<UserInfo>(`/internal/users/${userId}`, request);
  }

  /**
   * 删除用户
   */
  deleteUser(userId: string, deletedBy: string, reason?: string): Observable<void> {
    return this.delete<void>(`/internal/users/${userId}`, {
      data: { deletedBy, reason },
    });
  }

  /**
   * 重置用户密码
   */
  resetPassword(request: PasswordResetRequest): Observable<void> {
    return this.post<void>('/internal/users/reset-password', request);
  }

  /**
   * 锁定用户账户
   */
  lockUser(userId: string, lockedBy: string, reason: string, lockUntil?: string): Observable<void> {
    return this.post<void>(`/internal/users/${userId}/lock`, {
      lockedBy,
      reason,
      lockUntil,
    });
  }

  /**
   * 解锁用户账户
   */
  unlockUser(userId: string, unlockedBy: string, reason: string): Observable<void> {
    return this.post<void>(`/internal/users/${userId}/unlock`, {
      unlockedBy,
      reason,
    });
  }

  /**
   * 更新用户最后登录时间
   */
  updateLastLogin(userId: string, loginTime: string, ipAddress?: string): Observable<void> {
    return this.post<void>(`/internal/users/${userId}/last-login`, {
      loginTime,
      ipAddress,
    });
  }

  /**
   * 检查邮箱是否已存在
   */
  checkEmailExists(email: string, tenantId: string, excludeUserId?: string): Observable<{
    exists: boolean;
    userId?: string;
  }> {
    return this.get<{
      exists: boolean;
      userId?: string;
    }>('/internal/users/email-exists', { email, tenantId, excludeUserId });
  }

  /**
   * 检查用户名是否已存在
   */
  checkUsernameExists(username: string, tenantId: string, excludeUserId?: string): Observable<{
    exists: boolean;
    userId?: string;
  }> {
    return this.get<{
      exists: boolean;
      userId?: string;
    }>('/internal/users/username-exists', { username, tenantId, excludeUserId });
  }

  /**
   * 获取用户统计信息
   */
  getUserStats(tenantId: string): Observable<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    newUsersThisMonth: number;
    lastUpdated: string;
  }> {
    return this.get<{
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      suspendedUsers: number;
      newUsersThisMonth: number;
      lastUpdated: string;
    }>(`/internal/users/stats`, { tenantId });
  }

  /**
   * 验证用户邮箱
   */
  verifyEmail(userId: string, verifiedBy: string): Observable<void> {
    return this.post<void>(`/internal/users/${userId}/verify-email`, { verifiedBy });
  }

  /**
   * 验证用户手机号
   */
  verifyPhone(userId: string, verifiedBy: string): Observable<void> {
    return this.post<void>(`/internal/users/${userId}/verify-phone`, { verifiedBy });
  }
}