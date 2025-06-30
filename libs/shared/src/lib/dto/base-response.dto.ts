/**
 * 基础响应DTO
 * 企业级微服务平台标准版本
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination.dto';

export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: '请求是否成功',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '响应消息',
    example: '操作成功',
  })
  message: string;

  @ApiPropertyOptional({
    description: '响应数据',
  })
  data?: T;

  @ApiPropertyOptional({
    description: '错误代码',
    example: 'VALIDATION_ERROR',
  })
  errorCode?: string;

  @ApiPropertyOptional({
    description: '请求ID',
    example: 'req_1234567890',
  })
  requestId?: string;

  @ApiPropertyOptional({
    description: '时间戳',
    example: '2023-12-01T10:00:00.000Z',
  })
  timestamp?: string;

  constructor(success: boolean, message: string, data?: T, errorCode?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data?: T, message = '操作成功'): BaseResponseDto<T> {
    return new BaseResponseDto(true, message, data);
  }

  static error(message: string, errorCode?: string): BaseResponseDto {
    return new BaseResponseDto(false, message, undefined, errorCode);
  }
}

export class PaginatedResponseDto<T = any> extends BaseResponseDto<T[]> {
  @ApiProperty({
    description: '分页信息',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  constructor(
    success: boolean,
    message: string,
    data: T[],
    meta: PaginationMetaDto,
    errorCode?: string,
  ) {
    super(success, message, data, errorCode);
    this.meta = meta;
  }

  static success<T>(
    data: T[],
    meta: PaginationMetaDto,
    message = '查询成功',
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto(true, message, data, meta);
  }
}