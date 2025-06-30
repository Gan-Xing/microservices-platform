/**
 * 审计拦截器
 * 实现审计装饰器的具体逻辑
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { AuditServiceClient } from '@platform/common';
import {
  AUDIT_KEY,
  AUDIT_OPTIONS_KEY,
  AuditOptions,
  AuditContext,
  AuditLevel,
  AuditEventType,
} from '../decorators/audit.decorator';
import { StandardJWTPayload } from '../interfaces/jwt-payload.interface';

// 扩展Request接口
interface AuthenticatedRequest extends Request {
  user?: StandardJWTPayload;
  tenantId?: string;
  requestId?: string;
  startTime?: number;
}

// 数据脱敏器
interface DataSanitizer {
  sanitizeObject(obj: any, sensitiveFields: string[]): any;
  sanitizeValue(value: any): any;
}

@Injectable()
export class DataSanitizerService implements DataSanitizer {
  private readonly MASK_VALUE = '***masked***';

  sanitizeObject(obj: any, sensitiveFields: string[] = []): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, sensitiveFields));
    }

    const sanitized = { ...obj };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (this.isSensitiveField(key, sensitiveFields)) {
        sanitized[key] = this.MASK_VALUE;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, sensitiveFields);
      }
    }

    return sanitized;
  }

  sanitizeValue(value: any): any {
    if (typeof value === 'string' && this.isPotentiallySensitive(value)) {
      return this.MASK_VALUE;
    }
    return value;
  }

  private isSensitiveField(fieldName: string, sensitiveFields: string[]): boolean {
    const normalizedField = fieldName.toLowerCase();
    const defaultSensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'private', 'confidential', 'sensitive', 'ssn', 'credit',
    ];

    const allSensitiveFields = [
      ...defaultSensitiveFields,
      ...sensitiveFields.map(f => f.toLowerCase()),
    ];

    return allSensitiveFields.some(sensitive => 
      normalizedField.includes(sensitive)
    );
  }

  private isPotentiallySensitive(value: string): boolean {
    // 检查是否像JWT token
    if (value.length > 100 && value.includes('.')) {
      return true;
    }
    
    // 检查是否像API key
    if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) {
      return true;
    }
    
    return false;
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly dataSanitizer = new DataSanitizerService();

  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly auditClient?: AuditServiceClient,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否需要审计
    const shouldAudit = this.reflector.getAllAndOverride<boolean>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipAudit = this.reflector.getAllAndOverride<boolean>('skip_audit', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!shouldAudit || skipAudit) {
      return next.handle();
    }

    const auditOptions = this.reflector.getAllAndOverride<AuditOptions>(
      AUDIT_OPTIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // 记录开始时间
    const startTime = Date.now();
    request.startTime = startTime;

    // 构建基础审计上下文
    const auditContext = this.buildBaseAuditContext(
      request,
      response,
      auditOptions,
      context,
    );

    // 检查条件审计
    if (auditOptions.condition && !auditOptions.condition(auditContext)) {
      return next.handle();
    }

    // 记录请求数据
    if (auditOptions.includeRequestData) {
      auditContext.requestData = this.sanitizeRequestData(
        request,
        auditOptions.sensitiveFields,
      );
    }

    // 获取操作前数据
    let beforeData: any;
    if (auditOptions.includeBeforeData) {
      beforeData = this.extractBeforeData(auditContext, auditOptions);
    }

    return next.handle().pipe(
      tap(responseData => {
        // 记录成功的操作
        this.recordSuccessAudit(
          auditContext,
          auditOptions,
          responseData,
          beforeData,
          startTime,
        );
      }),
      catchError(error => {
        // 记录失败的操作
        if (!auditOptions.skipOnError) {
          this.recordErrorAudit(
            auditContext,
            auditOptions,
            error,
            beforeData,
            startTime,
          );
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * 构建基础审计上下文
   */
  private buildBaseAuditContext(
    request: AuthenticatedRequest,
    response: Response,
    options: AuditOptions,
    context: ExecutionContext,
  ): AuditContext {
    const methodName = context.getHandler().name;
    const className = context.getClass().name;

    return {
      eventType: options.eventType,
      resource: options.resource,
      action: `${className}.${methodName}`,
      userId: request.user?.sub,
      tenantId: request.tenantId,
      sessionId: request.user?.sessionId,
      requestId: request.requestId || this.generateRequestId(),
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      sourceIp: this.extractClientIP(request),
      level: options.level || AuditLevel.MEDIUM,
      timestamp: new Date(),
      success: true,
      metadata: { ...options.metadata },
      tags: options.tags || [],
    };
  }

  /**
   * 提取客户端IP
   */
  private extractClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 脱敏请求数据
   */
  private sanitizeRequestData(
    request: AuthenticatedRequest,
    sensitiveFields: string[] = [],
  ): any {
    const requestData: any = {};

    // 添加查询参数
    if (Object.keys(request.query).length > 0) {
      requestData.query = this.dataSanitizer.sanitizeObject(
        request.query,
        sensitiveFields,
      );
    }

    // 添加请求体
    if (request.body && Object.keys(request.body).length > 0) {
      requestData.body = this.dataSanitizer.sanitizeObject(
        request.body,
        sensitiveFields,
      );
    }

    // 添加路径参数
    if (request.params && Object.keys(request.params).length > 0) {
      requestData.params = this.dataSanitizer.sanitizeObject(
        request.params,
        sensitiveFields,
      );
    }

    return requestData;
  }

  /**
   * 提取操作前数据
   */
  private extractBeforeData(
    context: AuditContext,
    options: AuditOptions,
  ): any {
    // 这里需要根据实际业务逻辑来获取操作前的数据
    // 可以通过资源ID和资源类型来查询当前状态
    
    if (options.resourceIdExtractor) {
      const resourceId = options.resourceIdExtractor(context);
      if (resourceId) {
        context.resourceId = resourceId;
        // 这里可以调用相应的服务获取当前数据状态
        // 暂时返回null，实际实现时需要根据资源类型进行查询
      }
    }

    return null;
  }

  /**
   * 记录成功审计
   */
  private recordSuccessAudit(
    context: AuditContext,
    options: AuditOptions,
    responseData: any,
    beforeData: any,
    startTime: number,
  ): void {
    const auditEvent = {
      ...context,
      success: true,
      duration: Date.now() - startTime,
      statusCode: 200,
      beforeData,
    };

    // 记录响应数据
    if (options.includeResponseData && responseData) {
      auditEvent.responseData = this.dataSanitizer.sanitizeObject(
        responseData,
        options.sensitiveFields,
      );
    }

    // 记录操作后数据
    if (options.includeAfterData) {
      auditEvent.afterData = this.extractAfterData(context, options, responseData);
    }

    this.sendAuditEvent(auditEvent, options.async !== false);
  }

  /**
   * 记录错误审计
   */
  private recordErrorAudit(
    context: AuditContext,
    options: AuditOptions,
    error: any,
    beforeData: any,
    startTime: number,
  ): void {
    const auditEvent = {
      ...context,
      success: false,
      duration: Date.now() - startTime,
      statusCode: error.status || 500,
      error: error.message || 'Unknown error',
      beforeData,
      level: AuditLevel.HIGH, // 错误事件提升级别
    };

    this.sendAuditEvent(auditEvent, false); // 错误事件同步记录
  }

  /**
   * 提取操作后数据
   */
  private extractAfterData(
    context: AuditContext,
    options: AuditOptions,
    responseData: any,
  ): any {
    // 根据响应数据或重新查询来获取操作后的数据状态
    // 这里需要根据实际业务逻辑实现
    
    if (responseData && typeof responseData === 'object') {
      // 如果响应数据包含更新后的实体，直接使用
      if (responseData.id || responseData._id) {
        return this.dataSanitizer.sanitizeObject(
          responseData,
          options.sensitiveFields,
        );
      }
    }

    return null;
  }

  /**
   * 发送审计事件
   */
  private sendAuditEvent(auditEvent: any, async: boolean = true): void {
    if (!this.auditClient) {
      this.logger.warn('Audit client not available, logging to console');
      this.logger.log(`AUDIT: ${JSON.stringify(auditEvent)}`);
      return;
    }

    const auditData = {
      id: this.generateEventId(),
      tenantId: auditEvent.tenantId,
      userId: auditEvent.userId,
      sessionId: auditEvent.sessionId,
      serviceId: process.env.SERVICE_NAME || 'unknown-service',
      eventType: auditEvent.eventType,
      resource: auditEvent.resource,
      resourceId: auditEvent.resourceId,
      action: auditEvent.action,
      outcome: auditEvent.success ? 'success' : 'failure',
      timestamp: auditEvent.timestamp.toISOString(),
      sourceIp: auditEvent.sourceIp,
      userAgent: auditEvent.userAgent,
      requestId: auditEvent.requestId,
      method: auditEvent.method,
      url: auditEvent.url,
      statusCode: auditEvent.statusCode,
      duration: auditEvent.duration,
      beforeData: auditEvent.beforeData,
      afterData: auditEvent.afterData,
      metadata: {
        ...auditEvent.metadata,
        level: auditEvent.level,
        tags: auditEvent.tags,
        requestData: auditEvent.requestData,
        responseData: auditEvent.responseData,
        error: auditEvent.error,
      },
    };

    if (async) {
      // 异步发送
      this.auditClient.logEvent(auditData).subscribe({
        next: (result) => {
          this.logger.debug(`Audit event logged: ${result.eventId}`);
        },
        error: (error) => {
          this.logger.error('Failed to log audit event:', error);
          // 可以考虑将失败的审计事件存储到本地队列中
        },
      });
    } else {
      // 同步发送
      this.auditClient.logEvent(auditData).toPromise().catch(error => {
        this.logger.error('Failed to log audit event synchronously:', error);
      });
    }
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}