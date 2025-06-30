/**
 * 内部服务HTTP客户端基类
 * 提供统一的服务间调用接口，支持认证、重试、错误处理
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, timeout, map } from 'rxjs/operators';
import { BaseResponse } from '@platform/types';

export interface ServiceClientConfig {
  serviceName: string;
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface InternalServiceHeaders {
  'X-Service-Token': string;
  'X-Service-Name': string;
  'X-Request-ID'?: string;
  'X-Trace-ID'?: string;
  'Content-Type'?: string;
}

@Injectable()
export abstract class ServiceClientBase {
  protected readonly logger: Logger;
  protected readonly config: ServiceClientConfig;
  protected readonly defaultTimeout = 10000; // 10秒
  protected readonly defaultRetries = 3;
  protected readonly defaultRetryDelay = 1000; // 1秒

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    config: Partial<ServiceClientConfig>,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.config = this.buildConfig(config);
  }

  /**
   * 构建服务配置
   */
  private buildConfig(config: Partial<ServiceClientConfig>): ServiceClientConfig {
    const serviceName = config.serviceName!;
    const baseUrl = config.baseUrl || this.getServiceUrl(serviceName);
    
    return {
      serviceName,
      baseUrl,
      timeout: config.timeout || this.defaultTimeout,
      retries: config.retries || this.defaultRetries,
      retryDelay: config.retryDelay || this.defaultRetryDelay,
    };
  }

  /**
   * 获取服务URL (从环境变量或配置)
   */
  private getServiceUrl(serviceName: string): string {
    const envKey = `${serviceName.toUpperCase().replace('-', '_')}_URL`;
    return (
      this.configService.get<string>(envKey) ||
      `http://${serviceName}:${this.getServicePort(serviceName)}`
    );
  }

  /**
   * 获取服务端口映射
   */
  private getServicePort(serviceName: string): number {
    const portMap: Record<string, number> = {
      'api-gateway-service': 3000,
      'auth-service': 3001,
      'rbac-service': 3002,
      'user-management-service': 3003,
      'tenant-management-service': 3004,
      'notification-service': 3005,
      'file-storage-service': 3006,
      'monitoring-service': 3007,
      'audit-service': 3008,
      'scheduler-service': 3009,
      'message-queue-service': 3010,
      'cache-service': 3011,
    };
    
    return portMap[serviceName] || 3000;
  }

  /**
   * 构建内部服务请求头
   */
  private buildInternalHeaders(additionalHeaders?: Record<string, string>): InternalServiceHeaders {
    const internalToken = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!internalToken) {
      throw new Error('INTERNAL_SERVICE_TOKEN not configured');
    }

    const headers: InternalServiceHeaders = {
      'X-Service-Token': internalToken,
      'X-Service-Name': this.getCurrentServiceName(),
      'Content-Type': 'application/json',
    };

    // 添加链路追踪头部
    const traceId = this.generateTraceId();
    const requestId = this.generateRequestId();
    
    headers['X-Trace-ID'] = traceId;
    headers['X-Request-ID'] = requestId;

    // 合并额外头部
    if (additionalHeaders) {
      Object.assign(headers, additionalHeaders);
    }

    return headers;
  }

  /**
   * 获取当前服务名称
   */
  private getCurrentServiceName(): string {
    return this.configService.get<string>('SERVICE_NAME') || 'unknown-service';
  }

  /**
   * 生成链路追踪ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 执行GET请求
   */
  protected get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options?: AxiosRequestConfig,
  ): Observable<T> {
    return this.makeRequest<T>('GET', endpoint, undefined, { params, ...options });
  }

  /**
   * 执行POST请求
   */
  protected post<T = any>(
    endpoint: string,
    data?: any,
    options?: AxiosRequestConfig,
  ): Observable<T> {
    return this.makeRequest<T>('POST', endpoint, data, options);
  }

  /**
   * 执行PUT请求
   */
  protected put<T = any>(
    endpoint: string,
    data?: any,
    options?: AxiosRequestConfig,
  ): Observable<T> {
    return this.makeRequest<T>('PUT', endpoint, data, options);
  }

  /**
   * 执行DELETE请求
   */
  protected delete<T = any>(
    endpoint: string,
    options?: AxiosRequestConfig,
  ): Observable<T> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * 执行PATCH请求
   */
  protected patch<T = any>(
    endpoint: string,
    data?: any,
    options?: AxiosRequestConfig,
  ): Observable<T> {
    return this.makeRequest<T>('PATCH', endpoint, data, options);
  }

  /**
   * 通用HTTP请求方法
   */
  private makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: AxiosRequestConfig,
  ): Observable<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = this.buildInternalHeaders(options?.headers);
    
    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      data,
      headers,
      timeout: this.config.timeout,
      ...options,
    };

    this.logger.debug(`[${method}] ${url}`, {
      headers: this.maskSensitiveHeaders(headers),
      data: data ? JSON.stringify(data) : undefined,
    });

    const startTime = Date.now();

    return this.httpService.request<BaseResponse<T>>(requestConfig).pipe(
      timeout(this.config.timeout!),
      retry({
        count: this.config.retries!,
        delay: (error, retryCount) => {
          this.logger.warn(
            `Request failed, retrying ${retryCount}/${this.config.retries}`,
            { url, error: error.message },
          );
          return timer(this.config.retryDelay! * retryCount);
        },
      }),
      map((response: AxiosResponse<BaseResponse<T>>) => {
        const duration = Date.now() - startTime;
        this.logger.debug(`[${method}] ${url} - ${response.status} (${duration}ms)`);
        
        // 处理标准化响应
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
          if (!response.data.success) {
            throw new Error(response.data.message || 'Service request failed');
          }
          return response.data.data as T;
        }
        
        return response.data as T;
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(`[${method}] ${url} failed (${duration}ms)`, {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        
        return throwError(() => this.transformError(error));
      }),
    );
  }

  /**
   * 转换错误格式
   */
  private transformError(error: any): Error {
    if (error.response) {
      // HTTP错误响应
      const status = error.response.status;
      const data = error.response.data;
      
      if (data && typeof data === 'object' && data.error) {
        return new Error(`[${status}] ${data.error.message || data.error.code}`);
      }
      
      return new Error(`[${status}] ${error.message}`);
    } else if (error.code === 'ECONNREFUSED') {
      return new Error(`Service unavailable: ${this.config.serviceName}`);
    } else if (error.code === 'TIMEOUT') {
      return new Error(`Request timeout: ${this.config.serviceName}`);
    }
    
    return new Error(error.message || 'Unknown service error');
  }

  /**
   * 脱敏敏感头部信息
   */
  private maskSensitiveHeaders(headers: InternalServiceHeaders): Record<string, string> {
    const masked = { ...headers };
    if (masked['X-Service-Token']) {
      masked['X-Service-Token'] = '***masked***';
    }
    return masked;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.get('/health').toPromise();
      return !!result;
    } catch (error) {
      this.logger.warn(`Health check failed for ${this.config.serviceName}:`, error);
      return false;
    }
  }

  /**
   * 获取服务信息
   */
  getServiceInfo(): ServiceClientConfig {
    return { ...this.config };
  }
}