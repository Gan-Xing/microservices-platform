/**
 * 标准JWT载荷接口 - 基于统一认证标准化
 * 支持企业级认证和授权
 */

export interface StandardJWTPayload {
  // 标准JWT字段
  sub: string;                    // 用户ID (subject)
  iss: string;                    // 签发者 'platform-auth-service'
  aud: string[];                  // 受众 ['api-gateway', 'internal-services']
  exp: number;                    // 过期时间戳
  iat: number;                    // 签发时间戳
  jti: string;                    // JWT唯一标识符
  
  // 业务字段
  tenantId: string;               // 租户ID
  sessionId: string;              // 会话ID
  userType: 'admin' | 'member' | 'guest' | 'system';
  
  // 权限和角色
  roles: string[];                // 用户角色列表
  permissions: string[];          // 权限列表（高频权限直接存储）
  
  // 安全字段
  loginMethod: 'password' | 'sso' | 'api_key' | 'system';
  deviceId?: string;              // 设备标识
  ipAddress?: string;             // IP地址
  userAgent?: string;             // 用户代理
  
  // 扩展字段
  metadata?: Record<string, any>; // 额外元数据
}

export interface InternalServiceToken {
  serviceName: string;            // 服务名称
  serviceId: string;              // 服务实例ID
  permissions: string[];          // 服务权限
  exp: number;                    // 过期时间
  iat: number;                    // 签发时间
}