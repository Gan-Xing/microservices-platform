/**
 * 分页相关DTO
 * 企业级微服务平台标准版本
 */

import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数必须大于0' })
  @Max(100, { message: '每页条数不能超过100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '搜索关键词',
    maxLength: 255,
    example: 'search term',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  sortBy?: string;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsString({ message: '排序方向必须是字符串' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // 计算偏移量
  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}

export class PaginationMetaDto {
  @ApiPropertyOptional({ description: '当前页码' })
  page: number;

  @ApiPropertyOptional({ description: '每页条数' })
  limit: number;

  @ApiPropertyOptional({ description: '总条数' })
  total: number;

  @ApiPropertyOptional({ description: '总页数' })
  totalPages: number;

  @ApiPropertyOptional({ description: '是否有上一页' })
  hasPrevious: boolean;

  @ApiPropertyOptional({ description: '是否有下一页' })
  hasNext: boolean;

  constructor(pagination: PaginationDto, total: number) {
    this.page = pagination.page;
    this.limit = pagination.limit;
    this.total = total;
    this.totalPages = Math.ceil(total / pagination.limit);
    this.hasPrevious = pagination.page > 1;
    this.hasNext = pagination.page < this.totalPages;
  }
}