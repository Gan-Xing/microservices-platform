/**
 * 全局异常过滤器 - 基于统一错误处理标准化
 * 统一错误响应格式和错误监控
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StandardErrorResponse, ErrorCode } from '../interfaces/error-response.interface';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // 记录错误日志
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.error.httpStatus).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): StandardErrorResponse {
    const timestamp = new Date().toISOString();
    const requestId = request.headers['x-request-id'] as string || uuidv4();
    const service = process.env.SERVICE_NAME || 'unknown-service';
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = (request as any).user?.sub;

    // HTTP异常处理
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let message = exception.message;
      let code = this.getErrorCodeFromStatus(status);
      let details: any = undefined;

      // 处理详细错误信息
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        details = responseObj.details;
        code = responseObj.code || code;
      }

      return {
        success: false,
        error: {
          code,
          message,
          httpStatus: status,
          details,
          requestId,
          timestamp,
          service,
          retryable: this.isRetryable(status),
          tenantId,
          userId,
          correlationId: request.headers['x-correlation-id'] as string,
          stack: process.env.NODE_ENV !== 'production' ? exception.stack : undefined,
        },
      };
    }

    // 其他异常处理
    const error = exception as Error;
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: '服务器内部错误',
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        requestId,
        timestamp,
        service,
        retryable: true,
        tenantId,
        userId,
        correlationId: request.headers['x-correlation-id'] as string,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        originalError: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
    };
  }

  private getErrorCodeFromStatus(status: number): ErrorCode {
    const statusMap: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
    };

    return statusMap[status] || ErrorCode.INTERNAL_SERVER_ERROR;
  }

  private isRetryable(status: number): boolean {
    // 5xx错误通常可重试，4xx错误通常不可重试
    return status >= 500 || status === HttpStatus.TOO_MANY_REQUESTS;
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: StandardErrorResponse,
  ): void {
    const { method, url, headers, body } = request;
    const { code, httpStatus, requestId } = errorResponse.error;

    const logContext = {
      requestId,
      method,
      url,
      userAgent: headers['user-agent'],
      tenantId: headers['x-tenant-id'],
      userId: (request as any).user?.sub,
      errorCode: code,
      httpStatus,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (httpStatus >= 500) {
      this.logger.error(`服务器内部错误: ${exception}`, JSON.stringify(logContext));
    } else {
      this.logger.warn(`客户端错误: ${code}`, JSON.stringify(logContext));
    }
  }
}