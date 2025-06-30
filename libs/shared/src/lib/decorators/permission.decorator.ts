/**
 * 权限控制装饰器
 * 提供声明式权限检查功能
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';

// 权限元数据键
export const PERMISSION_KEY = 'permissions';
export const ROLE_KEY = 'roles';
export const TENANT_REQUIRED_KEY = 'tenant_required';
export const PERMISSION_OPTIONS_KEY = 'permission_options';

// 权限检查选项
export interface PermissionOptions {
  // 权限检查模式
  mode?: 'all' | 'any'; // all: 需要所有权限, any: 需要任一权限
  // 是否允许超级管理员绕过检查
  allowSuperAdmin?: boolean;
  // 自定义错误消息
  errorMessage?: string;
  // 权限检查上下文
  context?: Record<string, any>;
  // 是否缓存权限检查结果
  useCache?: boolean;
  // 缓存TTL (秒)
  cacheTTL?: number;
}

// 角色检查选项
export interface RoleOptions {
  // 角色检查模式
  mode?: 'all' | 'any'; // all: 需要所有角色, any: 需要任一角色
  // 是否检查角色层级
  checkHierarchy?: boolean;
  // 最小角色级别
  minLevel?: number;
  // 自定义错误消息
  errorMessage?: string;
  // 是否允许超级管理员绕过检查
  allowSuperAdmin?: boolean;
}

// 租户检查选项
export interface TenantOptions {
  // 是否必需租户ID
  required?: boolean;
  // 是否自动设置RLS上下文
  autoSetRLS?: boolean;
  // 自定义错误消息
  errorMessage?: string;
}

/**
 * 权限检查装饰器
 * 检查用户是否具有指定权限
 * 
 * @param permissions 权限名称或权限数组
 * @param options 权限检查选项
 * 
 * @example
 * @RequirePermission('user:read')
 * @RequirePermission(['user:read', 'user:write'])
 * @RequirePermission('user:admin', { mode: 'all', allowSuperAdmin: true })
 */
export const RequirePermission = (
  permissions: string | string[],
  options: PermissionOptions = {},
): MethodDecorator & ClassDecorator => {
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];
  
  const defaultOptions: PermissionOptions = {
    mode: 'all',
    allowSuperAdmin: true,
    useCache: true,
    cacheTTL: 300, // 5分钟
    ...options,
  };

  return applyDecorators(
    SetMetadata(PERMISSION_KEY, permissionList),
    SetMetadata(PERMISSION_OPTIONS_KEY, defaultOptions),
  );
};

/**
 * 角色检查装饰器
 * 检查用户是否具有指定角色
 * 
 * @param roles 角色名称或角色数组
 * @param options 角色检查选项
 * 
 * @example
 * @RequireRole('admin')
 * @RequireRole(['admin', 'manager'])
 * @RequireRole('admin', { checkHierarchy: true, minLevel: 5 })
 */
export const RequireRole = (
  roles: string | string[],
  options: RoleOptions = {},
): MethodDecorator & ClassDecorator => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  
  const defaultOptions: RoleOptions = {
    mode: 'any',
    checkHierarchy: false,
    allowSuperAdmin: true,
    ...options,
  };

  return applyDecorators(
    SetMetadata(ROLE_KEY, roleList),
    SetMetadata(PERMISSION_OPTIONS_KEY, defaultOptions),
  );
};

/**
 * 租户检查装饰器
 * 确保请求具有有效的租户上下文
 * 
 * @param options 租户检查选项
 * 
 * @example
 * @RequireTenant()
 * @RequireTenant({ autoSetRLS: true })
 */
export const RequireTenant = (
  options: TenantOptions = {},
): MethodDecorator & ClassDecorator => {
  const defaultOptions: TenantOptions = {
    required: true,
    autoSetRLS: true,
    ...options,
  };

  return applyDecorators(
    SetMetadata(TENANT_REQUIRED_KEY, true),
    SetMetadata(PERMISSION_OPTIONS_KEY, defaultOptions),
  );
};

/**
 * 组合权限装饰器
 * 同时检查权限和角色
 * 
 * @param permissions 权限要求
 * @param roles 角色要求
 * @param options 检查选项
 * 
 * @example
 * @RequirePermissionAndRole('user:write', 'editor')
 * @RequirePermissionAndRole(['user:read', 'user:write'], ['admin', 'manager'])
 */
export const RequirePermissionAndRole = (
  permissions: string | string[],
  roles: string | string[],
  options: PermissionOptions & RoleOptions = {},
): MethodDecorator & ClassDecorator => {
  return applyDecorators(
    RequirePermission(permissions, options),
    RequireRole(roles, options),
  );
};

/**
 * 超级管理员装饰器
 * 只允许超级管理员访问
 * 
 * @example
 * @SuperAdminOnly()
 */
export const SuperAdminOnly = (): MethodDecorator & ClassDecorator => {
  return RequireRole('super_admin', {
    allowSuperAdmin: false, // 必须是真正的super_admin角色
    errorMessage: 'Super admin access required',
  });
};

/**
 * 系统内部装饰器
 * 只允许系统内部服务调用
 * 
 * @example
 * @SystemOnly()
 */
export const SystemOnly = (): MethodDecorator & ClassDecorator => {
  return SetMetadata('system_only', true);
};

/**
 * 公开访问装饰器
 * 标记端点为公开访问，跳过认证和权限检查
 * 
 * @example
 * @Public()
 */
export const Public = (): MethodDecorator & ClassDecorator => {
  return SetMetadata('isPublic', true);
};

/**
 * 条件权限装饰器
 * 根据运行时条件动态检查权限
 * 
 * @param conditionFn 条件检查函数
 * @param permissions 权限要求
 * @param options 检查选项
 * 
 * @example
 * @ConditionalPermission(
 *   (context) => context.params.id === context.user.id,
 *   'user:write:own'
 * )
 */
export const ConditionalPermission = (
  conditionFn: (context: any) => boolean,
  permissions: string | string[],
  options: PermissionOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('conditional_permission', {
      condition: conditionFn,
      permissions: Array.isArray(permissions) ? permissions : [permissions],
      options,
    }),
  );
};

/**
 * 资源所有者装饰器
 * 检查用户是否为资源所有者
 * 
 * @param resourceParam 资源ID参数名
 * @param resourceType 资源类型
 * 
 * @example
 * @ResourceOwner('userId', 'user')
 * @ResourceOwner('projectId', 'project')
 */
export const ResourceOwner = (
  resourceParam: string,
  resourceType: string,
): MethodDecorator => {
  return SetMetadata('resource_owner', {
    resourceParam,
    resourceType,
  });
};

/**
 * IP白名单装饰器
 * 限制只能从指定IP访问
 * 
 * @param allowedIPs 允许的IP地址列表
 * 
 * @example
 * @IPWhitelist(['192.168.1.100', '10.0.0.0/8'])
 */
export const IPWhitelist = (allowedIPs: string[]): MethodDecorator & ClassDecorator => {
  return SetMetadata('ip_whitelist', allowedIPs);
};

/**
 * 时间窗口装饰器
 * 限制只能在指定时间窗口内访问
 * 
 * @param startTime 开始时间 (HH:mm格式)
 * @param endTime 结束时间 (HH:mm格式)
 * @param timezone 时区
 * 
 * @example
 * @TimeWindow('09:00', '18:00', 'Asia/Shanghai')
 */
export const TimeWindow = (
  startTime: string,
  endTime: string,
  timezone: string = 'UTC',
): MethodDecorator & ClassDecorator => {
  return SetMetadata('time_window', {
    startTime,
    endTime,
    timezone,
  });
};

/**
 * 限流装饰器
 * 限制访问频率
 * 
 * @param limit 限制次数
 * @param window 时间窗口（秒）
 * @param keyGenerator 键生成函数
 * 
 * @example
 * @RateLimit(100, 60) // 每分钟100次
 * @RateLimit(10, 1, (req) => req.ip) // 每秒10次，按IP限制
 */
export const RateLimit = (
  limit: number,
  window: number,
  keyGenerator?: (request: any) => string,
): MethodDecorator & ClassDecorator => {
  return SetMetadata('rate_limit', {
    limit,
    window,
    keyGenerator: keyGenerator || ((req) => req.ip || 'default'),
  });
};