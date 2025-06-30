/**
 * RLS (Row Level Security) 装饰器
 * 提供多租户数据隔离的声明式支持
 */

import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor';

// RLS元数据键
export const RLS_CONTEXT_KEY = 'rls_context';
export const TENANT_ISOLATION_KEY = 'tenant_isolation';
export const RLS_OPTIONS_KEY = 'rls_options';

// RLS配置选项
export interface RLSOptions {
  // 是否自动设置租户上下文
  autoSetContext?: boolean;
  
  // 是否验证租户访问权限
  validateAccess?: boolean;
  
  // 是否自动获取用户角色
  autoLoadRoles?: boolean;
  
  // 自定义租户ID提取器
  tenantIdExtractor?: (context: any) => string;
  
  // 自定义用户ID提取器
  userIdExtractor?: (context: any) => string;
  
  // 是否在操作后清除上下文
  clearAfter?: boolean;
  
  // 自定义元数据
  metadata?: Record<string, any>;
  
  // 错误处理模式
  errorMode?: 'throw' | 'log' | 'ignore';
  
  // 是否启用RLS策略检查
  validatePolicies?: boolean;
  
  // 需要的最小权限级别
  minPermissionLevel?: string;
}

// 租户隔离选项
export interface TenantIsolationOptions {
  // 是否严格隔离
  strict?: boolean;
  
  // 允许的跨租户操作
  allowCrossTenant?: boolean;
  
  // 超级管理员绕过隔离
  allowSuperAdmin?: boolean;
  
  // 自定义隔离规则
  customRule?: (context: any) => boolean;
  
  // 错误消息
  errorMessage?: string;
}

/**
 * RLS上下文设置装饰器
 * 自动设置数据库的RLS上下文变量
 * 
 * @param options RLS配置选项
 * 
 * @example
 * @SetRLSContext()
 * @SetRLSContext({ autoLoadRoles: true })
 * @SetRLSContext({ validateAccess: true, clearAfter: true })
 */
export const SetRLSContext = (
  options: RLSOptions = {},
): MethodDecorator & ClassDecorator => {
  const defaultOptions: RLSOptions = {
    autoSetContext: true,
    validateAccess: true,
    autoLoadRoles: true,
    clearAfter: true,
    errorMode: 'throw',
    validatePolicies: false,
    ...options,
  };

  return applyDecorators(
    SetMetadata(RLS_CONTEXT_KEY, true),
    SetMetadata(RLS_OPTIONS_KEY, defaultOptions),
    UseInterceptors(TenantContextInterceptor),
  );
};

/**
 * 租户隔离装饰器
 * 确保操作只能访问当前租户的数据
 * 
 * @param options 租户隔离选项
 * 
 * @example
 * @TenantIsolated()
 * @TenantIsolated({ strict: true })
 * @TenantIsolated({ allowSuperAdmin: true })
 */
export const TenantIsolated = (
  options: TenantIsolationOptions = {},
): MethodDecorator & ClassDecorator => {
  const defaultOptions: TenantIsolationOptions = {
    strict: true,
    allowCrossTenant: false,
    allowSuperAdmin: true,
    ...options,
  };

  return applyDecorators(
    SetMetadata(TENANT_ISOLATION_KEY, true),
    SetMetadata(RLS_OPTIONS_KEY, defaultOptions),
    SetRLSContext({
      autoSetContext: true,
      validateAccess: true,
      autoLoadRoles: true,
    }),
  );
};

/**
 * 用户级隔离装饰器
 * 确保操作只能访问用户自己的数据
 * 
 * @param userIdField 用户ID字段名
 * @param options RLS选项
 * 
 * @example
 * @UserIsolated()
 * @UserIsolated('userId')
 * @UserIsolated('ownerId', { allowSuperAdmin: true })
 */
export const UserIsolated = (
  userIdField: string = 'userId',
  options: RLSOptions & TenantIsolationOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('user_isolation', { userIdField }),
    SetMetadata(RLS_OPTIONS_KEY, options),
    SetRLSContext({
      autoSetContext: true,
      validateAccess: true,
      autoLoadRoles: true,
      userIdExtractor: (context) => context.params?.[userIdField] || context.body?.[userIdField],
      ...options,
    }),
  );
};

/**
 * 资源级隔离装饰器
 * 基于资源所有权进行数据隔离
 * 
 * @param resourceType 资源类型
 * @param ownerField 所有者字段名
 * @param options RLS选项
 * 
 * @example
 * @ResourceIsolated('project', 'ownerId')
 * @ResourceIsolated('document', 'createdBy', { allowSuperAdmin: true })
 */
export const ResourceIsolated = (
  resourceType: string,
  ownerField: string = 'ownerId',
  options: RLSOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('resource_isolation', { resourceType, ownerField }),
    SetMetadata(RLS_OPTIONS_KEY, options),
    SetRLSContext({
      autoSetContext: true,
      validateAccess: true,
      metadata: { resourceType, ownerField },
      ...options,
    }),
  );
};

/**
 * 跨租户访问装饰器
 * 允许在特定条件下进行跨租户访问
 * 
 * @param condition 访问条件
 * @param options RLS选项
 * 
 * @example
 * @CrossTenantAccess((context) => context.user.roles.includes('super_admin'))
 * @CrossTenantAccess((context) => context.headers['x-cross-tenant'] === 'true')
 */
export const CrossTenantAccess = (
  condition: (context: any) => boolean,
  options: RLSOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('cross_tenant_access', { condition }),
    SetMetadata(RLS_OPTIONS_KEY, {
      autoSetContext: false, // 跨租户访问时不自动设置上下文
      validateAccess: false,
      ...options,
    }),
  );
};

/**
 * 系统级访问装饰器
 * 绕过所有RLS检查，用于系统级操作
 * 
 * @example
 * @SystemAccess()
 */
export const SystemAccess = (): MethodDecorator & ClassDecorator => {
  return applyDecorators(
    SetMetadata('system_access', true),
    SetMetadata(RLS_OPTIONS_KEY, {
      autoSetContext: false,
      validateAccess: false,
      validatePolicies: false,
    }),
  );
};

/**
 * 管理员访问装饰器
 * 只允许管理员进行跨租户访问
 * 
 * @param requiredRole 需要的管理员角色
 * @param options RLS选项
 * 
 * @example
 * @AdminAccess()
 * @AdminAccess('super_admin')
 * @AdminAccess('tenant_admin', { allowCrossTenant: true })
 */
export const AdminAccess = (
  requiredRole: string = 'admin',
  options: RLSOptions & TenantIsolationOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('admin_access', { requiredRole }),
    SetMetadata(RLS_OPTIONS_KEY, {
      autoSetContext: true,
      validateAccess: true,
      autoLoadRoles: true,
      allowSuperAdmin: true,
      minPermissionLevel: requiredRole,
      ...options,
    }),
  );
};

/**
 * 读取隔离装饰器
 * 只对读取操作应用RLS
 * 
 * @param options RLS选项
 * 
 * @example
 * @ReadIsolated()
 */
export const ReadIsolated = (
  options: RLSOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('read_isolation', true),
    SetRLSContext({
      autoSetContext: true,
      validateAccess: true,
      clearAfter: true,
      ...options,
    }),
  );
};

/**
 * 写入隔离装饰器
 * 只对写入操作应用RLS
 * 
 * @param options RLS选项
 * 
 * @example
 * @WriteIsolated()
 */
export const WriteIsolated = (
  options: RLSOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('write_isolation', true),
    SetRLSContext({
      autoSetContext: true,
      validateAccess: true,
      validatePolicies: true,
      ...options,
    }),
  );
};

/**
 * 条件RLS装饰器
 * 基于运行时条件决定是否应用RLS
 * 
 * @param condition RLS应用条件
 * @param options RLS选项
 * 
 * @example
 * @ConditionalRLS((context) => context.method === 'GET')
 * @ConditionalRLS((context) => !context.user.roles.includes('admin'))
 */
export const ConditionalRLS = (
  condition: (context: any) => boolean,
  options: RLSOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('conditional_rls', { condition }),
    SetMetadata(RLS_OPTIONS_KEY, {
      autoSetContext: true,
      validateAccess: true,
      ...options,
    }),
  );
};

/**
 * RLS测试装饰器
 * 用于测试和调试RLS策略
 * 
 * @param testMode 测试模式
 * @param options RLS选项
 * 
 * @example
 * @RLSTest('validate')
 * @RLSTest('simulate', { metadata: { testTenantId: 'test-tenant' } })
 */
export const RLSTest = (
  testMode: 'validate' | 'simulate' | 'debug' = 'debug',
  options: RLSOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('rls_test', { testMode }),
    SetMetadata(RLS_OPTIONS_KEY, {
      autoSetContext: true,
      validatePolicies: true,
      errorMode: 'log',
      metadata: { testMode },
      ...options,
    }),
  );
};

/**
 * 跳过RLS装饰器
 * 明确跳过RLS处理
 * 
 * @example
 * @SkipRLS()
 */
export const SkipRLS = (): MethodDecorator & ClassDecorator => {
  return SetMetadata('skip_rls', true);
};

/**
 * 批量RLS装饰器
 * 用于批量操作的RLS处理
 * 
 * @param itemTenantExtractor 从批量项目中提取租户ID的函数
 * @param options RLS选项
 * 
 * @example
 * @BatchRLS((item) => item.tenantId)
 * @BatchRLS((item) => item.tenant?.id, { strict: true })
 */
export const BatchRLS = (
  itemTenantExtractor: (item: any) => string,
  options: RLSOptions & TenantIsolationOptions = {},
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('batch_rls', { itemTenantExtractor }),
    SetMetadata(RLS_OPTIONS_KEY, {
      autoSetContext: true,
      validateAccess: true,
      strict: true,
      ...options,
    }),
  );
};