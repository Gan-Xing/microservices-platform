/**
 * HTTP模块配置
 * 提供内部服务HTTP客户端的依赖注入配置
 */

import { Module, Global } from '@nestjs/common';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServiceClientBase } from './service-client.base';
import { RbacServiceClient } from './clients/rbac-service.client';
import { UserServiceClient } from './clients/user-service.client';
import { AuditServiceClient } from './clients/audit-service.client';

// HTTP模块配置接口
export interface HttpModuleConfig {
  timeout?: number;
  maxRedirects?: number;
  retries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  defaultHeaders?: Record<string, string>;
}

@Global()
@Module({
  imports: [
    NestHttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT', 10000),
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS', 5),
        validateStatus: (status: number) => status < 500, // 允许4xx错误传递到应用层处理
        headers: {
          'User-Agent': `platform-service/${configService.get<string>('SERVICE_VERSION', '1.0.0')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    RbacServiceClient,
    UserServiceClient,
    AuditServiceClient,
    {
      provide: 'HTTP_MODULE_CONFIG',
      useFactory: (configService: ConfigService): HttpModuleConfig => ({
        timeout: configService.get<number>('HTTP_TIMEOUT', 10000),
        retries: configService.get<number>('HTTP_RETRIES', 3),
        retryDelay: configService.get<number>('HTTP_RETRY_DELAY', 1000),
        enableLogging: configService.get<boolean>('HTTP_ENABLE_LOGGING', true),
        defaultHeaders: {
          'User-Agent': `platform-service/${configService.get<string>('SERVICE_VERSION', '1.0.0')}`,
        },
      }),
      inject: [ConfigService],
    },
  ],
  exports: [
    NestHttpModule,
    RbacServiceClient,
    UserServiceClient,
    AuditServiceClient,
  ],
})
export class PlatformHttpModule {
  /**
   * 配置模块选项
   */
  static forRoot(config?: HttpModuleConfig) {
    return {
      module: PlatformHttpModule,
      providers: [
        {
          provide: 'HTTP_MODULE_CONFIG',
          useValue: {
            timeout: 10000,
            retries: 3,
            retryDelay: 1000,
            enableLogging: true,
            ...config,
          },
        },
      ],
    };
  }

  /**
   * 异步配置模块选项
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory?: (...args: any[]) => Promise<HttpModuleConfig> | HttpModuleConfig;
    inject?: any[];
  }) {
    return {
      module: PlatformHttpModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'HTTP_MODULE_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
    };
  }
}