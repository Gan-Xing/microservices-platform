/**
 * 认证配置 - 基于统一认证标准化文档
 * 支持JWT、API密钥、会话管理
 */

export interface AuthConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    algorithm: 'RS256' | 'HS256';
    issuer: string;
    audience: string[];
  };
  session: {
    secret: string;
    name: string;
    httpOnly: boolean;
    secure: boolean;
    maxAge: number;
  };
  password: {
    saltRounds: number;
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  rateLimiting: {
    windowMs: number;
    maxAttempts: number;
    blockDuration: number;
  };
}

export const defaultAuthConfig: AuthConfig = {
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET || 'your-access-token-secret',
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET || 'your-refresh-token-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
    algorithm: 'RS256',
    issuer: 'platform-auth-service',
    audience: ['api-gateway', 'internal-services'],
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    name: 'platform.sid',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  password: {
    saltRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
  },
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    blockDuration: 30 * 60 * 1000, // 30 minutes
  },
};