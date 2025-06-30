/**
 * RBAC服务客户端
 * 提供权限检查、角色管理等功能
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { ServiceClientBase } from '../service-client.base';

// 权限检查请求接口
export interface PermissionCheckRequest {
  userId: string;
  tenantId: string;
  resource: string;
  action: string;
  resourceId?: string;
  context?: Record<string, any>;
}

// 权限检查结果接口
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  appliedRoles: string[];
  appliedPermissions: string[];
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

// 批量权限检查请求
export interface BatchPermissionCheckRequest {
  userId: string;
  tenantId: string;
  checks: Array<{
    resource: string;
    action: string;
    resourceId?: string;
  }>;
}

// 批量权限检查结果
export interface BatchPermissionCheckResult {
  results: Array<{
    resource: string;
    action: string;
    resourceId?: string;
    allowed: boolean;
    reason?: string;
    appliedRoles?: string[];
  }>;
}

// 用户角色信息
export interface UserRoleInfo {
  userId: string;
  tenantId: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    level: number;
    validFrom?: string;
    validUntil?: string;
    isActive: boolean;
  }>;
  effectivePermissions: Array<{
    name: string;
    resource: string;
    action: string;
    scope: string;
  }>;
}

// 角色分配请求
export interface RoleAssignmentRequest {
  tenantId: string;
  roleId: string;
  assignedBy: string;
  validFrom?: string;
  validUntil?: string;
  metadata?: Record<string, any>;
}

// RLS上下文设置请求
export interface RLSContextRequest {
  userId: string;
  tenantId: string;
  userRoles: string[];
  sessionId: string;
  connectionId?: string;
}

// RLS上下文设置结果
export interface RLSContextResult {
  success: boolean;
  context: Record<string, any>;
  policies: {
    appliedPolicies: string[];
  };
}

@Injectable()
export class RbacServiceClient extends ServiceClientBase {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super(httpService, configService, {
      serviceName: 'rbac-service',
    });
  }

  /**
   * 检查用户权限
   */
  checkPermission(request: PermissionCheckRequest): Observable<PermissionCheckResult> {
    return this.post<PermissionCheckResult>('/internal/permissions/check', request);
  }

  /**
   * 批量检查用户权限
   */
  checkPermissionsBatch(request: BatchPermissionCheckRequest): Observable<BatchPermissionCheckResult> {
    return this.post<BatchPermissionCheckResult>('/internal/permissions/check-batch', request);
  }

  /**
   * 获取用户角色信息
   */
  getUserRoles(userId: string, tenantId: string): Observable<UserRoleInfo> {
    return this.get<UserRoleInfo>(`/internal/users/${userId}/roles`, { tenantId });
  }

  /**
   * 为用户分配角色
   */
  assignRole(userId: string, request: RoleAssignmentRequest): Observable<void> {
    return this.post<void>(`/internal/users/${userId}/roles`, request);
  }

  /**
   * 撤销用户角色
   */
  revokeRole(
    userId: string, 
    roleId: string, 
    tenantId: string, 
    reason?: string
  ): Observable<void> {
    return this.delete<void>(`/internal/users/${userId}/roles/${roleId}`, {
      data: { tenantId, reason },
    });
  }

  /**
   * 设置RLS上下文
   */
  setRLSContext(request: RLSContextRequest): Observable<RLSContextResult> {
    return this.post<RLSContextResult>('/internal/rls/set-context', request);
  }

  /**
   * 清除RLS上下文
   */
  clearRLSContext(connectionId: string): Observable<void> {
    return this.post<void>('/internal/rls/clear-context', { connectionId });
  }

  /**
   * 验证用户状态
   */
  validateUserStatus(userIds: string[], tenantId: string): Observable<Array<{
    userId: string;
    isActive: boolean;
    status: string;
  }>> {
    return this.post<Array<{
      userId: string;
      isActive: boolean;
      status: string;
    }>>('/internal/users/validate-status', { userIds, tenantId });
  }

  /**
   * 获取角色权限列表
   */
  getRolePermissions(roleId: string, tenantId: string): Observable<Array<{
    id: string;
    name: string;
    resource: string;
    action: string;
    scope: string;
  }>> {
    return this.get<Array<{
      id: string;
      name: string;
      resource: string;
      action: string;
      scope: string;
    }>>(`/internal/roles/${roleId}/permissions`, { tenantId });
  }

  /**
   * 检查角色是否存在
   */
  checkRoleExists(roleId: string, tenantId: string): Observable<{
    exists: boolean;
    role?: {
      id: string;
      name: string;
      isActive: boolean;
    };
  }> {
    return this.get<{
      exists: boolean;
      role?: {
        id: string;
        name: string;
        isActive: boolean;
      };
    }>(`/internal/roles/${roleId}/exists`, { tenantId });
  }

  /**
   * 获取权限定义
   */
  getPermissionDefinition(permissionName: string): Observable<{
    id: string;
    name: string;
    resource: string;
    action: string;
    scope: string;
    description?: string;
    isActive: boolean;
  }> {
    return this.get<{
      id: string;
      name: string;
      resource: string;
      action: string;
      scope: string;
      description?: string;
      isActive: boolean;
    }>(`/internal/permissions/${permissionName}`);
  }

  /**
   * 检查权限是否存在
   */
  checkPermissionExists(permissionName: string): Observable<{
    exists: boolean;
    permission?: {
      id: string;
      name: string;
      resource: string;
      action: string;
    };
  }> {
    return this.get<{
      exists: boolean;
      permission?: {
        id: string;
        name: string;
        resource: string;
        action: string;
      };
    }>(`/internal/permissions/${permissionName}/exists`);
  }
}