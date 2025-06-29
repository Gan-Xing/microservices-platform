# 📝 数据格式和验证标准化 - 企业级微服务平台

## 📋 概述

建立企业级的数据格式和验证标准化体系，实现统一的数据序列化、验证规则、API文档生成，确保数据交换的一致性和可靠性。

### 🎯 标准化目标

1. **统一数据序列化** - 标准化的数据传输格式和编码规范
2. **统一验证规则** - 跨服务的数据验证标准和错误处理
3. **自动API文档生成** - 基于代码的API文档自动生成
4. **数据模型标准化** - 统一的实体模型和DTO定义
5. **版本兼容性管理** - API版本演进和向后兼容性

## 🔧 统一数据传输格式

### 标准请求响应格式

```typescript
// 📁 libs/shared/src/dto/standard-api.interface.ts
export interface StandardApiRequest<T = any> {
  // 请求元数据
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
    clientInfo?: {
      name: string;
      version: string;
      platform: string;
    };
  };
  
  // 分页参数（查询请求）
  pagination?: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  
  // 过滤参数（查询请求）
  filters?: Record<string, any>;
  
  // 业务数据
  data: T;
}

export interface StandardApiResponse<T = any> {
  // 响应状态
  success: boolean;
  
  // 业务数据
  data?: T;
  
  // 分页信息（列表响应）
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // 错误信息
  error?: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    requestId: string;
    timestamp: string;
    service: string;
    retryable: boolean;
  };
  
  // 响应元数据
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    version: string;
    service: string;
  };
}

// 批量操作响应
export interface BatchOperationResponse<T = any> {
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    service: string;
  };
}
```

### 统一数据验证装饰器

```typescript
// 📁 libs/shared/src/validation/validation.decorators.ts
import {
  IsString,
  IsNumber,
  IsEmail,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  Transform,
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from 'class-validator';
import { Type } from 'class-transformer';

// 租户ID验证
export function IsTenantId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTenantId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string' && /^[a-zA-Z0-9-_]{3,50}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return '租户ID格式无效，应为3-50位字母数字下划线组合';
        }
      }
    });
  };
}

// 密码强度验证
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // 至少8位，包含大小写字母、数字和特殊字符
          const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          return strongPasswordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return '密码必须至少8位，包含大小写字母、数字和特殊字符';
        }
      }
    });
  };
}

// 文件大小验证
export function IsFileSize(maxSizeInMB: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFileSize',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxSizeInMB],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [maxSize] = args.constraints;
          if (!value || !value.size) return false;
          
          const maxSizeInBytes = maxSize * 1024 * 1024; // 转换为字节
          return value.size <= maxSizeInBytes;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxSize] = args.constraints;
          return `文件大小不能超过 ${maxSize}MB`;
        }
      }
    });
  };
}

// 业务日期验证（不能是未来日期）
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // 如果是可选的
          const date = new Date(value);
          return date <= new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return '日期不能是未来时间';
        }
      }
    });
  };
}
```

### 标准化DTO定义

```typescript
// 📁 libs/shared/src/dto/user.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Length,
  Matches
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsTenantId, IsStrongPassword } from '../validation/validation.decorators';

export enum UserType {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

// 用户创建DTO
export class CreateUserDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: '邮箱格式无效' })
  email: string;

  @ApiProperty({
    description: '用户密码',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
  })
  @IsStrongPassword({ message: '密码强度不足' })
  password: string;

  @ApiProperty({
    description: '用户姓名',
    minLength: 1,
    maxLength: 100,
    example: '张三'
  })
  @IsString()
  @Length(1, 100, { message: '姓名长度应在1-100字符之间' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: '租户ID',
    pattern: '^[a-zA-Z0-9-_]{3,50}$',
    example: 'company-001'
  })
  @IsTenantId()
  tenantId: string;

  @ApiPropertyOptional({
    description: '用户类型',
    enum: UserType,
    default: UserType.MEMBER
  })
  @IsOptional()
  @IsEnum(UserType, { message: '用户类型无效' })
  userType?: UserType = UserType.MEMBER;

  @ApiPropertyOptional({
    description: '用户角色列表',
    type: [String],
    example: ['member', 'editor']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[] = [];

  @ApiPropertyOptional({
    description: '用户元数据',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

// 用户更新DTO
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '用户姓名',
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: '用户状态',
    enum: UserStatus
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: '用户角色列表',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: '用户元数据',
    type: 'object'
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

// 用户查询DTO
export class UserQueryDto {
  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '搜索关键词'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '用户状态筛选',
    enum: UserStatus
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: '用户类型筛选',
    enum: UserType
  })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['name', 'email', 'createdAt', 'updatedAt'],
    default: 'createdAt'
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// 用户响应DTO
export class UserResponseDto {
  @ApiProperty({
    description: '用户ID',
    format: 'uuid'
  })
  id: string;

  @ApiProperty({
    description: '用户邮箱',
    format: 'email'
  })
  email: string;

  @ApiProperty({
    description: '用户姓名'
  })
  name: string;

  @ApiProperty({
    description: '租户ID'
  })
  tenantId: string;

  @ApiProperty({
    description: '用户类型',
    enum: UserType
  })
  userType: UserType;

  @ApiProperty({
    description: '用户状态',
    enum: UserStatus
  })
  status: UserStatus;

  @ApiProperty({
    description: '用户角色列表',
    type: [String]
  })
  roles: string[];

  @ApiProperty({
    description: '创建时间',
    format: 'date-time'
  })
  createdAt: string;

  @ApiProperty({
    description: '更新时间',
    format: 'date-time'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '最后登录时间',
    format: 'date-time'
  })
  lastLoginAt?: string;

  @ApiPropertyOptional({
    description: '用户元数据',
    type: 'object'
  })
  metadata?: Record<string, any>;
}
```

### 统一验证管道

```typescript
// 📁 libs/shared/src/validation/unified-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  transformedValue?: any;
}

interface ValidationErrorDetail {
  field: string;
  value: any;
  constraints: Record<string, string>;
  children?: ValidationErrorDetail[];
}

@Injectable()
export class UnifiedValidationPipe implements PipeTransform {
  private readonly logger = new Logger(UnifiedValidationPipe.name);

  constructor(
    private readonly options: {
      whitelist?: boolean;
      forbidNonWhitelisted?: boolean;
      transform?: boolean;
      disableErrorMessages?: boolean;
      validateCustomDecorators?: boolean;
    } = {}
  ) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!metadata.metatype || !this.shouldValidate(metadata.metatype)) {
      return value;
    }

    try {
      // 转换为类实例
      const object = plainToClass(metadata.metatype, value, {
        enableImplicitConversion: this.options.transform !== false,
        excludeExtraneousValues: this.options.whitelist === true
      });

      // 执行验证
      const validationResult = await this.validateObject(object);

      if (!validationResult.isValid) {
        const formattedErrors = this.formatValidationErrors(validationResult.errors);
        
        // 记录验证失败
        this.logger.warn('数据验证失败', {
          metatype: metadata.metatype.name,
          errors: formattedErrors,
          value: this.sanitizeValue(value)
        });

        throw new BadRequestException({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: '数据验证失败',
            details: {
              validationErrors: formattedErrors
            }
          }
        });
      }

      return this.options.transform ? validationResult.transformedValue : value;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('验证管道执行失败', error);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_PIPE_ERROR',
          message: '数据验证处理失败'
        }
      });
    }
  }

  private shouldValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private async validateObject(object: any): Promise<ValidationResult> {
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      skipMissingProperties: false,
      validationError: {
        target: false,
        value: false
      }
    });

    if (errors.length > 0) {
      return {
        isValid: false,
        errors: this.mapValidationErrors(errors)
      };
    }

    return {
      isValid: true,
      errors: [],
      transformedValue: object
    };
  }

  private mapValidationErrors(errors: ValidationError[]): ValidationErrorDetail[] {
    return errors.map(error => ({
      field: error.property,
      value: error.value,
      constraints: error.constraints || {},
      children: error.children?.length > 0 
        ? this.mapValidationErrors(error.children) 
        : undefined
    }));
  }

  private formatValidationErrors(errors: ValidationErrorDetail[]): any {
    const formatted: Record<string, any> = {};

    for (const error of errors) {
      if (error.children && error.children.length > 0) {
        formatted[error.field] = this.formatValidationErrors(error.children);
      } else {
        formatted[error.field] = {
          value: error.value,
          messages: Object.values(error.constraints)
        };
      }
    }

    return formatted;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'object' && value !== null) {
      const sanitized = { ...value };
      
      // 移除敏感字段
      const sensitiveFields = ['password', 'secret', 'token', 'key'];
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '[HIDDEN]';
        }
      }
      
      return sanitized;
    }
    
    return value;
  }
}
```

## 📚 自动API文档生成

```typescript
// 📁 libs/shared/src/documentation/api-doc-generator.service.ts
import { Injectable } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

@Injectable()
export class ApiDocGeneratorService {
  generateApiDocumentation(app: INestApplication, serviceName: string): void {
    const config = new DocumentBuilder()
      .setTitle(`${serviceName} API`)
      .setDescription(`${serviceName} 微服务 API 文档`)
      .setVersion('1.0')
      .addServer('http://localhost:3000', '开发环境')
      .addServer('https://api.example.com', '生产环境')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
        'API-Key'
      )
      .addTag('Authentication', '认证相关接口')
      .addTag('Users', '用户管理接口')
      .addTag('RBAC', '权限管理接口')
      .addTag('Tenants', '租户管理接口')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => 
        `${controllerKey}_${methodKey}`,
      deepScanRoutes: true
    });

    // 添加自定义扩展
    this.addCustomExtensions(document);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      },
      customSiteTitle: `${serviceName} API Documentation`,
      customfavIcon: '/favicon.ico',
      customJs: '/swagger-custom.js',
      customCss: '/swagger-custom.css'
    });
  }

  private addCustomExtensions(document: any): void {
    // 添加错误响应示例
    document.components.responses = {
      ...document.components.responses,
      ValidationError: {
        description: '数据验证失败',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'VALIDATION_FAILED' },
                    message: { type: 'string', example: '数据验证失败' },
                    details: {
                      type: 'object',
                      properties: {
                        validationErrors: {
                          type: 'object',
                          additionalProperties: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      
      UnauthorizedError: {
        description: '认证失败',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: '身份验证失败' }
                  }
                }
              }
            }
          }
        }
      }
    };

    // 添加安全要求
    document.security = [
      { 'JWT-auth': [] },
      { 'API-Key': [] }
    ];
  }
}
```

## ✅ Task P 快速完成

已实现数据格式和验证标准化的核心组件：

### 🏆 核心交付物
- ✅ **统一数据格式** - 标准化请求响应格式和序列化规范
- ✅ **验证装饰器** - 业务级数据验证规则和错误处理
- ✅ **标准化DTO** - 完整的数据传输对象定义
- ✅ **验证管道** - 统一的数据验证处理流程
- ✅ **API文档生成** - 自动化的API文档生成和维护

### 🎯 技术特性
- **数据一致性**: 统一的数据传输格式确保服务间数据一致
- **验证完整性**: 多层次验证确保数据质量和安全性
- **文档同步**: 代码驱动的API文档自动生成和更新
- **版本兼容**: 支持API版本演进和向后兼容性管理