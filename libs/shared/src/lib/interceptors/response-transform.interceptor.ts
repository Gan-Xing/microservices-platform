/**
 * 响应转换拦截器 - 统一响应格式
 * 基于BaseResponseDto标准
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto/base-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, BaseResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuidv4();

    return next.handle().pipe(
      map((data) => {
        // 如果返回的已经是标准响应格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            requestId,
            timestamp: new Date().toISOString(),
          };
        }

        // 转换为标准响应格式
        return {
          success: true,
          message: '操作成功',
          data,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}