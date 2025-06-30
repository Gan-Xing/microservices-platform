# @platform/shared

企业级微服务平台共享库 - 标准版本

## 概述

这是一个核心共享库，为平台的12个微服务提供通用的组件、装饰器、守卫、拦截器等功能。

## 功能模块

### 🔧 配置管理 (`config/`)
- 数据库配置
- Redis配置  
- 应用配置

### 📋 常量定义 (`constants/`)
- API常量
- 缓存常量
- 错误常量

### 🏷️ 枚举类型 (`enums/`)
- 用户状态枚举
- 租户状态枚举
- 权限枚举

### 📝 类型定义 (`types/`)
- API响应类型
- 分页类型
- 服务交互类型

### 🔌 接口定义 (`interfaces/`)
- 用户接口
- 租户接口
- 审计接口

### 🎨 装饰器 (`decorators/`)
- API响应装饰器
- 租户感知装饰器
- 审计装饰器

### 🛡️ 守卫 (`guards/`)
- 服务认证守卫
- 租户隔离守卫

### 📡 拦截器 (`interceptors/`)
- 响应格式拦截器
- 审计日志拦截器
- 租户上下文拦截器

### 🚫 异常过滤器 (`filters/`)
- HTTP异常过滤器
- 验证异常过滤器

### 🔄 中间件 (`middleware/`)
- 请求ID中间件
- 关联ID中间件

### 📋 数据传输对象 (`dto/`)
- 分页DTO
- 搜索DTO
- 基础响应DTO

### 🗃️ 基础实体 (`entities/`)
- 基础实体类
- 租户感知实体

### ❌ 自定义异常 (`exceptions/`)
- 业务异常
- 验证异常
- 服务异常

### ✅ 验证器 (`validators/`)
- 邮箱验证器
- 密码验证器

### 🛠️ 工具函数 (`utils/`)
- 加密工具
- 日期工具
- 验证工具
- 租户工具

## 使用方式

```typescript
// 导入常量
import { API_VERSION, SERVICE_PORTS } from '@platform/shared';

// 导入枚举
import { UserStatus, TenantStatus } from '@platform/shared';

// 导入DTO
import { PaginationDto, BaseResponseDto } from '@platform/shared';

// 导入装饰器
import { ApiResponse, TenantAware } from '@platform/shared';
```

## 标准版本特性

- 🎯 **目标规模**: 100租户 + 10万用户
- ⚡ **性能优化**: 1000 QPS, P95 < 100ms
- 🔒 **企业级安全**: 完整的认证授权体系
- 📈 **可扩展性**: 支持水平扩展
- 🛡️ **类型安全**: 完整的TypeScript类型定义

## 依赖关系

- `@nestjs/common` - NestJS核心功能
- `@nestjs/swagger` - API文档支持
- `class-validator` - 验证支持
- `class-transformer` - 转换支持

## 版本历史

- **v1.0.0** - 初始版本，支持企业级微服务平台标准版本