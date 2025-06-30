/**
 * 应用核心配置
 * 标准版本：100租户+10万用户
 */

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'test' | 'staging' | 'production';
  port: number;
  globalPrefix: string;
  corsEnabled: boolean;
  enableSwagger: boolean;
  timezone: string;
}

export const defaultAppConfig: AppConfig = {
  name: process.env.APP_NAME || 'microservices-platform',
  version: process.env.APP_VERSION || '1.0.0',
  environment: (process.env.NODE_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  globalPrefix: process.env.GLOBAL_PREFIX || 'api/v1',
  corsEnabled: process.env.CORS_ENABLED === 'true',
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  timezone: process.env.TZ || 'UTC',
};