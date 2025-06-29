# 🏗️ 企业级微服务平台 - Nx Monorepo 完整文件夹结构

## 📋 项目概述

基于 **Nx Monorepo** 最新最佳实践和 **NestJS** 最新版本，为支持 **100租户+10万用户** 的企业级微服务平台设计的完整目录结构。

### 🎯 标准版本定位
- **用户规模**: 100租户 + 10万用户
- **技术栈**: NestJS 10.x + TypeScript 5.x + PostgreSQL 15+ + Redis 7+
- **部署方式**: Docker Compose (非 Kubernetes)
- **开发周期**: 4周完成12个核心服务
- **内存需求**: 8GB标准配置
- **性能目标**: 1000 QPS, P95 < 100ms

### 🚀 12个核心微服务端口分配
| 端口 | 服务名称 | 功能描述 | 复杂度 | 开发周期 |
|------|---------|----------|--------|----------|
| 3000 | api-gateway-service | API网关统一入口 | ⭐⭐⭐ | Week 2 |
| 3001 | auth-service | 认证授权服务 | ⭐⭐ | Week 1 |
| 3002 | rbac-service | 权限管理服务 | ⭐⭐ | Week 1 |
| 3003 | user-management-service | 用户管理服务 | ⭐ | Week 1 |
| 3004 | tenant-management-service | 多租户管理服务 | ⭐⭐⭐ | Week 2 |
| 3005 | notification-service | 消息通知服务 | ⭐⭐⭐⭐ | Week 3 |
| 3006 | file-storage-service | 文件存储服务 | ⭐⭐⭐⭐ | Week 3 |
| 3007 | monitoring-service | 监控告警服务 | ⭐⭐⭐⭐⭐ | Week 4 |
| 3008 | audit-service | 日志审计服务 | ⭐⭐⭐ | Week 2 |
| 3009 | scheduler-service | 任务调度服务 | ⭐⭐⭐⭐ | Week 3 |
| 3010 | message-queue-service | 消息队列服务 | ⭐⭐⭐⭐ | Week 4 |
| 3011 | cache-service | 缓存服务 | ⭐⭐ | Week 1 |

## 🗂️ 完整文件夹结构

```
platform/                                      # 项目根目录
├── .github/                                   # GitHub 工作流配置
│   ├── workflows/
│   │   ├── ci.yml                            # 持续集成
│   │   ├── cd.yml                            # 持续部署
│   │   ├── security-scan.yml                 # 安全扫描
│   │   └── dependency-check.yml              # 依赖检查
│   └── ISSUE_TEMPLATE/                       # Issue 模板
├── .vscode/                                   # VS Code 配置
│   ├── settings.json                         # 工作区设置
│   ├── extensions.json                       # 推荐扩展
│   └── launch.json                           # 调试配置
├── .nx/                                       # Nx 缓存和配置
│   └── cache/                                # 构建缓存
├── .claude/                                   # Claude Code 配置
│   └── commands/                             # 自定义命令
│       ├── dev.md                            # 开发命令
│       ├── test.md                           # 测试命令
│       └── deploy.md                         # 部署命令
├── apps/                                      # 🎯 12个核心微服务应用
│   ├── api-gateway-service/                   # 端口 3000 - API网关
│   │   ├── src/
│   │   │   ├── main.ts                       # 应用入口
│   │   │   ├── app/
│   │   │   │   ├── app.module.ts             # 根模块
│   │   │   │   ├── app.controller.ts         # 根控制器
│   │   │   │   └── app.service.ts            # 根服务
│   │   │   ├── modules/                      # 功能模块
│   │   │   │   ├── gateway/                  # 网关核心模块
│   │   │   │   │   ├── gateway.module.ts
│   │   │   │   │   ├── gateway.controller.ts
│   │   │   │   │   └── gateway.service.ts
│   │   │   │   ├── routing/                  # 路由管理
│   │   │   │   │   ├── routing.module.ts
│   │   │   │   │   ├── routing.controller.ts
│   │   │   │   │   └── routing.service.ts
│   │   │   │   ├── load-balancer/            # 负载均衡
│   │   │   │   ├── rate-limiter/             # 限流控制
│   │   │   │   ├── security/                 # 安全策略
│   │   │   │   ├── monitoring/               # 监控分析
│   │   │   │   └── plugins/                  # 插件管理
│   │   │   ├── middleware/                   # 中间件
│   │   │   │   ├── auth.middleware.ts        # 认证中间件
│   │   │   │   ├── rate-limit.middleware.ts  # 限流中间件
│   │   │   │   └── logging.middleware.ts     # 日志中间件
│   │   │   ├── guards/                       # 守卫
│   │   │   │   ├── jwt-auth.guard.ts         # JWT守卫
│   │   │   │   └── roles.guard.ts            # 角色守卫
│   │   │   ├── interceptors/                 # 拦截器
│   │   │   │   ├── response.interceptor.ts   # 响应拦截器
│   │   │   │   └── timeout.interceptor.ts    # 超时拦截器
│   │   │   ├── dto/                          # 数据传输对象
│   │   │   │   ├── create-route.dto.ts
│   │   │   │   └── update-route.dto.ts
│   │   │   ├── entities/                     # 实体类
│   │   │   │   ├── route.entity.ts
│   │   │   │   └── api-key.entity.ts
│   │   │   ├── interfaces/                   # 接口定义
│   │   │   ├── exceptions/                   # 异常处理
│   │   │   │   ├── gateway.exception.ts
│   │   │   │   └── rate-limit.exception.ts
│   │   │   ├── config/                       # 配置文件
│   │   │   │   ├── gateway.config.ts
│   │   │   │   └── database.config.ts
│   │   │   └── utils/                        # 工具函数
│   │   ├── prisma/                           # Prisma 配置
│   │   │   ├── schema.prisma                 # 数据库模式
│   │   │   └── migrations/                   # 数据库迁移
│   │   ├── test/                             # 测试文件
│   │   │   ├── app.e2e-spec.ts              # E2E测试
│   │   │   └── jest-e2e.json                # Jest E2E配置
│   │   ├── Dockerfile                        # Docker配置
│   │   ├── project.json                      # Nx项目配置
│   │   ├── tsconfig.app.json                 # TypeScript应用配置
│   │   ├── tsconfig.spec.json                # TypeScript测试配置
│   │   └── .env.example                      # 环境变量示例
│   ├── auth-service/                          # 端口 3001 - 认证授权
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   │   ├── app.module.ts
│   │   │   │   ├── app.controller.ts
│   │   │   │   └── app.service.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/                     # 认证模块
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   └── auth.service.ts
│   │   │   │   ├── jwt/                      # JWT管理
│   │   │   │   ├── oauth/                    # OAuth集成
│   │   │   │   ├── mfa/                      # 多因素认证
│   │   │   │   ├── session/                  # 会话管理
│   │   │   │   ├── password/                 # 密码管理
│   │   │   │   └── security/                 # 安全审计
│   │   │   ├── strategies/                   # Passport策略
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── local.strategy.ts
│   │   │   │   └── oauth.strategy.ts
│   │   │   ├── guards/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── interfaces/
│   │   │   ├── exceptions/
│   │   │   ├── config/
│   │   │   └── utils/
│   │   ├── prisma/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── project.json
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.spec.json
│   │   └── .env.example
│   ├── rbac-service/                          # 端口 3002 - 权限管理
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── rbac/                     # RBAC核心
│   │   │   │   ├── roles/                    # 角色管理
│   │   │   │   ├── permissions/              # 权限管理
│   │   │   │   ├── policies/                 # 策略管理
│   │   │   │   └── audit/                    # 权限审计
│   │   │   ├── decorators/                   # 装饰器
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   └── permissions.decorator.ts
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── user-management-service/               # 端口 3003 - 用户管理
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── users/                    # 用户管理
│   │   │   │   ├── profiles/                 # 用户档案
│   │   │   │   ├── groups/                   # 用户组
│   │   │   │   ├── search/                   # 用户搜索
│   │   │   │   └── batch/                    # 批量操作
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── tenant-management-service/             # 端口 3004 - 多租户管理
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── tenants/                  # 租户管理
│   │   │   │   ├── isolation/                # 数据隔离
│   │   │   │   ├── subscriptions/            # 订阅管理
│   │   │   │   ├── billing/                  # 计费管理
│   │   │   │   └── resources/                # 资源管理
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── notification-service/                  # 端口 3005 - 消息通知
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── notifications/            # 通知管理
│   │   │   │   ├── templates/                # 模板管理
│   │   │   │   ├── channels/                 # 通道管理
│   │   │   │   │   ├── email/               # 邮件通道
│   │   │   │   │   ├── sms/                 # 短信通道
│   │   │   │   │   ├── push/                # 推送通道
│   │   │   │   │   └── webhook/             # Webhook通道
│   │   │   │   ├── scheduling/               # 调度管理
│   │   │   │   └── tracking/                 # 追踪管理
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── file-storage-service/                  # 端口 3006 - 文件存储
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── files/                    # 文件管理
│   │   │   │   ├── storage/                  # 存储管理
│   │   │   │   ├── upload/                   # 上传管理
│   │   │   │   ├── processing/               # 文件处理
│   │   │   │   └── cdn/                      # CDN管理
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── monitoring-service/                    # 端口 3007 - 监控告警
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── metrics/                  # 指标收集
│   │   │   │   ├── alerts/                   # 告警管理
│   │   │   │   ├── dashboards/               # 仪表板
│   │   │   │   ├── health/                   # 健康检查
│   │   │   │   └── reports/                  # 报告管理
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── audit-service/                         # 端口 3008 - 日志审计
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── audit/                    # 审计管理
│   │   │   │   ├── logs/                     # 日志管理
│   │   │   │   ├── compliance/               # 合规管理
│   │   │   │   ├── search/                   # 日志搜索
│   │   │   │   └── export/                   # 数据导出
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── scheduler-service/                     # 端口 3009 - 任务调度
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── scheduler/                # 调度管理
│   │   │   │   ├── jobs/                     # 任务管理
│   │   │   │   ├── cron/                     # Cron任务
│   │   │   │   ├── queue/                    # 队列管理
│   │   │   │   └── monitoring/               # 执行监控
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   ├── message-queue-service/                 # 端口 3010 - 消息队列
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── queue/                    # 队列管理
│   │   │   │   ├── producers/                # 生产者
│   │   │   │   ├── consumers/                # 消费者
│   │   │   │   └── monitoring/               # 队列监控
│   │   │   └── [其他标准目录]
│   │   └── [其他标准文件]
│   └── cache-service/                         # 端口 3011 - 缓存服务
│       ├── src/
│       │   ├── main.ts
│       │   ├── app/
│       │   ├── modules/
│       │   │   ├── cache/                     # 缓存管理
│       │   │   ├── redis/                     # Redis管理
│       │   │   ├── cluster/                   # 集群管理
│       │   │   ├── performance/               # 性能监控
│       │   │   └── eviction/                  # 淘汰策略
│       │   └── [其他标准目录]
│       └── [其他标准文件]
├── libs/                                      # 🔧 共享库
│   ├── shared/                                # @platform/shared
│   │   ├── src/
│   │   │   ├── index.ts                      # 导出文件
│   │   │   ├── lib/
│   │   │   │   ├── config/                   # 配置管理
│   │   │   │   │   ├── database.config.ts
│   │   │   │   │   ├── redis.config.ts
│   │   │   │   │   └── app.config.ts
│   │   │   │   ├── constants/                # 常量定义
│   │   │   │   │   ├── api.constants.ts
│   │   │   │   │   ├── cache.constants.ts
│   │   │   │   │   └── error.constants.ts
│   │   │   │   ├── enums/                    # 枚举类型
│   │   │   │   │   ├── user-status.enum.ts
│   │   │   │   │   ├── tenant-status.enum.ts
│   │   │   │   │   └── permission.enum.ts
│   │   │   │   ├── types/                    # 类型定义
│   │   │   │   │   ├── api-response.type.ts
│   │   │   │   │   ├── pagination.type.ts
│   │   │   │   │   └── service-interaction.type.ts
│   │   │   │   ├── interfaces/               # 接口定义
│   │   │   │   │   ├── user.interface.ts
│   │   │   │   │   ├── tenant.interface.ts
│   │   │   │   │   └── audit.interface.ts
│   │   │   │   ├── decorators/               # 装饰器
│   │   │   │   │   ├── api-response.decorator.ts
│   │   │   │   │   ├── tenant-aware.decorator.ts
│   │   │   │   │   └── audit.decorator.ts
│   │   │   │   ├── guards/                   # 共享守卫
│   │   │   │   │   ├── service-auth.guard.ts
│   │   │   │   │   └── tenant-isolation.guard.ts
│   │   │   │   ├── interceptors/             # 共享拦截器
│   │   │   │   │   ├── response-format.interceptor.ts
│   │   │   │   │   ├── audit-log.interceptor.ts
│   │   │   │   │   └── tenant-context.interceptor.ts
│   │   │   │   ├── filters/                  # 异常过滤器
│   │   │   │   │   ├── http-exception.filter.ts
│   │   │   │   │   └── validation.filter.ts
│   │   │   │   ├── middleware/               # 共享中间件
│   │   │   │   │   ├── request-id.middleware.ts
│   │   │   │   │   └── correlation-id.middleware.ts
│   │   │   │   ├── dto/                      # 共享DTO
│   │   │   │   │   ├── pagination.dto.ts
│   │   │   │   │   ├── search.dto.ts
│   │   │   │   │   └── base-response.dto.ts
│   │   │   │   ├── entities/                 # 基础实体
│   │   │   │   │   ├── base.entity.ts
│   │   │   │   │   └── tenant-aware.entity.ts
│   │   │   │   ├── exceptions/               # 自定义异常
│   │   │   │   │   ├── business.exception.ts
│   │   │   │   │   ├── validation.exception.ts
│   │   │   │   │   └── service.exception.ts
│   │   │   │   ├── validators/               # 自定义验证器
│   │   │   │   │   ├── email.validator.ts
│   │   │   │   │   └── password.validator.ts
│   │   │   │   └── utils/                    # 工具函数
│   │   │   │       ├── encryption.util.ts
│   │   │   │       ├── date.util.ts
│   │   │   │       ├── validation.util.ts
│   │   │       └── tenant.util.ts
│   │   │   └── testing/                      # 测试工具
│   │   │       ├── mocks/
│   │   │       └── fixtures/
│   │   ├── project.json
│   │   ├── tsconfig.lib.json
│   │   ├── tsconfig.spec.json
│   │   └── README.md
│   ├── common/                                # @platform/common
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── database/                 # 数据库工具
│   │   │   │   │   ├── prisma.service.ts
│   │   │   │   │   ├── migration.service.ts
│   │   │   │   │   └── transaction.service.ts
│   │   │   │   ├── cache/                    # 缓存工具
│   │   │   │   │   ├── redis.service.ts
│   │   │   │   │   ├── cache-manager.service.ts
│   │   │   │   │   └── distributed-lock.service.ts
│   │   │   │   ├── messaging/                # 消息传递
│   │   │   │   │   ├── queue.service.ts
│   │   │   │   │   ├── event-emitter.service.ts
│   │   │   │   │   └── webhook.service.ts
│   │   │   │   ├── logging/                  # 日志服务
│   │   │   │   │   ├── logger.service.ts
│   │   │   │   │   ├── audit-logger.service.ts
│   │   │   │   │   └── structured-logger.service.ts
│   │   │   │   ├── security/                 # 安全工具
│   │   │   │   │   ├── crypto.service.ts
│   │   │   │   │   ├── jwt.service.ts
│   │   │   │   │   ├── rate-limiter.service.ts
│   │   │   │   │   └── input-sanitizer.service.ts
│   │   │   │   ├── monitoring/               # 监控工具
│   │   │   │   │   ├── metrics.service.ts
│   │   │   │   │   ├── health-check.service.ts
│   │   │   │   │   └── performance.service.ts
│   │   │   │   ├── notification/             # 通知工具
│   │   │   │   │   ├── email.service.ts
│   │   │   │   │   ├── sms.service.ts
│   │   │   │   │   └── push.service.ts
│   │   │   │   ├── storage/                  # 存储工具
│   │   │   │   │   ├── file.service.ts
│   │   │   │   │   ├── s3.service.ts
│   │   │   │   │   └── local-storage.service.ts
│   │   │   │   ├── validation/               # 验证工具
│   │   │   │   │   ├── schema.validator.ts
│   │   │   │   │   └── business-rule.validator.ts
│   │   │   │   └── http/                     # HTTP工具
│   │   │   │       ├── http-client.service.ts
│   │   │   │       ├── api-client.service.ts
│   │   │   │       └── service-discovery.service.ts
│   │   │   └── testing/
│   │   ├── project.json
│   │   ├── tsconfig.lib.json
│   │   ├── tsconfig.spec.json
│   │   └── README.md
│   ├── types/                                 # @platform/types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── api/                      # API类型
│   │   │   │   │   ├── request.types.ts
│   │   │   │   │   ├── response.types.ts
│   │   │   │   │   └── pagination.types.ts
│   │   │   │   ├── database/                 # 数据库类型
│   │   │   │   │   ├── entities.types.ts
│   │   │   │   │   └── relations.types.ts
│   │   │   │   ├── auth/                     # 认证类型
│   │   │   │   │   ├── jwt.types.ts
│   │   │   │   │   ├── session.types.ts
│   │   │   │   │   └── permission.types.ts
│   │   │   │   ├── tenant/                   # 租户类型
│   │   │   │   │   ├── tenant.types.ts
│   │   │   │   │   └── isolation.types.ts
│   │   │   │   ├── notification/             # 通知类型
│   │   │   │   │   ├── template.types.ts
│   │   │   │   │   └── channel.types.ts
│   │   │   │   ├── file/                     # 文件类型
│   │   │   │   │   ├── upload.types.ts
│   │   │   │   │   └── storage.types.ts
│   │   │   │   ├── monitoring/               # 监控类型
│   │   │   │   │   ├── metrics.types.ts
│   │   │   │   │   └── alerts.types.ts
│   │   │   │   ├── queue/                    # 队列类型
│   │   │   │   │   ├── job.types.ts
│   │   │   │   │   └── message.types.ts
│   │   │   │   └── cache/                    # 缓存类型
│   │   │   │       ├── redis.types.ts
│   │   │   │       └── eviction.types.ts
│   │   │   └── global.d.ts                   # 全局类型声明
│   │   ├── project.json
│   │   ├── tsconfig.lib.json
│   │   └── README.md
│   ├── testing/                               # @platform/testing
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── setup/                    # 测试设置
│   │   │   │   │   ├── test-database.setup.ts
│   │   │   │   │   ├── test-redis.setup.ts
│   │   │   │   │   └── test-env.setup.ts
│   │   │   │   ├── mocks/                    # Mock对象
│   │   │   │   │   ├── user.mock.ts
│   │   │   │   │   ├── tenant.mock.ts
│   │   │   │   │   ├── auth.mock.ts
│   │   │   │   │   └── service.mock.ts
│   │   │   │   ├── fixtures/                 # 测试数据
│   │   │   │   │   ├── user.fixture.ts
│   │   │   │   │   ├── tenant.fixture.ts
│   │   │   │   │   └── api-response.fixture.ts
│   │   │   │   ├── helpers/                  # 测试辅助
│   │   │   │   │   ├── test-request.helper.ts
│   │   │   │   │   ├── db-cleaner.helper.ts
│   │   │   │   │   └── auth.helper.ts
│   │   │   │   └── matchers/                 # 自定义匹配器
│   │   │   │       ├── api-response.matcher.ts
│   │   │   │       └── date.matcher.ts
│   │   │   └── jest/                         # Jest配置
│   │   │       ├── jest.preset.js
│   │   │       └── test-setup.ts
│   │   ├── project.json
│   │   ├── tsconfig.lib.json
│   │   └── README.md
│   └── migrations/                            # @platform/migrations
│       ├── src/
│       │   ├── index.ts
│       │   ├── lib/
│       │   │   ├── scripts/                  # 迁移脚本
│       │   │   │   ├── initial-schema.sql
│       │   │   │   ├── seed-data.sql
│       │   │   │   └── test-data.sql
│       │   │   ├── seeders/                  # 数据播种
│       │   │   │   ├── user.seeder.ts
│       │   │   │   ├── tenant.seeder.ts
│       │   │   │   └── permission.seeder.ts
│       │   │   └── utils/                    # 迁移工具
│       │   │       ├── migration.util.ts
│       │   │       └── seed.util.ts
│       │   └── prisma/                       # 共享Prisma配置
│       │       ├── schema.prisma
│       │       └── migrations/
│       ├── project.json
│       └── README.md
├── tools/                                     # 🛠️ 开发工具
│   ├── scripts/                              # 脚本工具
│   │   ├── build-all.sh                     # 构建所有服务
│   │   ├── test-all.sh                      # 测试所有服务
│   │   ├── lint-all.sh                      # 代码检查
│   │   ├── docker-build.sh                  # Docker构建
│   │   ├── database/                        # 数据库脚本
│   │   │   ├── init-databases.sql           # 数据库初始化
│   │   │   ├── create-schemas.sql           # 模式创建
│   │   │   ├── setup-permissions.sql        # 权限设置
│   │   │   └── seed-data.sql                # 种子数据
│   │   ├── deployment/                      # 部署脚本
│   │   │   ├── deploy-staging.sh           # 预发布部署
│   │   │   ├── deploy-production.sh        # 生产部署
│   │   │   ├── rollback.sh                 # 回滚脚本
│   │   │   └── health-check.sh             # 健康检查
│   │   ├── development/                     # 开发脚本
│   │   │   ├── start-dev.sh                # 启动开发环境
│   │   │   ├── reset-db.sh                 # 重置数据库
│   │   │   ├── generate-types.sh           # 生成类型
│   │   │   └── update-deps.sh              # 更新依赖
│   │   └── monitoring/                      # 监控脚本
│   │       ├── check-services.sh           # 服务检查
│   │       ├── performance-test.sh         # 性能测试
│   │       └── log-analysis.sh             # 日志分析
│   ├── generators/                           # 代码生成器
│   │   ├── service/                         # 服务生成器
│   │   │   ├── files/                      # 模板文件
│   │   │   │   ├── __name__/
│   │   │   │   │   ├── src/
│   │   │   │   │   │   ├── main.ts.template
│   │   │   │   │   │   └── app/
│   │   │   │   │   │       └── app.module.ts.template
│   │   │   │   │   ├── Dockerfile.template
│   │   │   │   │   └── project.json.template
│   │   │   └── index.ts                    # 生成器逻辑
│   │   ├── module/                          # 模块生成器
│   │   │   ├── files/
│   │   │   └── index.ts
│   │   └── dto/                             # DTO生成器
│   │       ├── files/
│   │       └── index.ts
│   ├── linting/                             # 代码检查工具
│   │   ├── eslint-rules/                   # 自定义ESLint规则
│   │   │   ├── naming-convention.js
│   │   │   ├── api-response-format.js
│   │   │   └── tenant-isolation.js
│   │   └── prettier-configs/               # Prettier配置
│   │       ├── base.js
│   │       └── typescript.js
│   ├── testing/                             # 测试工具
│   │   ├── e2e/                            # E2E测试工具
│   │   │   ├── setup.ts
│   │   │   ├── teardown.ts
│   │   │   └── test-data.ts
│   │   ├── integration/                     # 集成测试工具
│   │   │   ├── database-cleaner.ts
│   │   │   └── service-mocker.ts
│   │   └── performance/                     # 性能测试工具
│   │       ├── load-test.ts
│   │       └── benchmark.ts
│   └── docker/                              # Docker工具
│       ├── development/                     # 开发环境
│       │   ├── Dockerfile.base             # 基础镜像
│       │   ├── Dockerfile.dev              # 开发镜像
│       │   └── docker-entrypoint.sh        # 入口脚本
│       ├── production/                      # 生产环境
│       │   ├── Dockerfile.prod             # 生产镜像
│       │   └── nginx/                      # Nginx配置
│       │       ├── nginx.conf
│       │       └── ssl/
│       └── monitoring/                      # 监控容器
│           ├── prometheus/
│           │   └── prometheus.yml
│           ├── grafana/
│           │   ├── dashboards/
│           │   └── provisioning/
│           └── alertmanager/
│               └── alertmanager.yml
├── config/                                   # 🔧 配置文件
│   ├── database/                            # 数据库配置
│   │   ├── postgres.conf                   # PostgreSQL配置
│   │   ├── redis.conf                      # Redis配置
│   │   └── migrations/                     # 共享迁移
│   ├── docker/                             # Docker配置
│   │   ├── docker-compose.yml              # 主要编排文件
│   │   ├── docker-compose.dev.yml          # 开发环境
│   │   ├── docker-compose.staging.yml      # 预发布环境
│   │   ├── docker-compose.prod.yml         # 生产环境
│   │   └── docker-compose.override.yml     # 本地覆盖
│   ├── nginx/                              # Nginx配置
│   │   ├── nginx.conf                      # 主配置
│   │   ├── upstream.conf                   # 上游服务
│   │   ├── ssl/                           # SSL证书
│   │   └── sites/                         # 站点配置
│   ├── monitoring/                         # 监控配置
│   │   ├── prometheus.yml                  # Prometheus配置
│   │   ├── grafana/                       # Grafana配置
│   │   │   ├── grafana.ini
│   │   │   ├── dashboards/                # 仪表板
│   │   │   │   ├── microservices-overview.json
│   │   │   │   ├── api-gateway.json
│   │   │   │   ├── database-metrics.json
│   │   │   │   └── business-metrics.json
│   │   │   └── provisioning/              # 自动配置
│   │   │       ├── datasources/
│   │   │       └── dashboards/
│   │   └── alertmanager/                  # 告警管理
│   │       ├── alertmanager.yml
│   │       └── alerts.yml
│   ├── security/                           # 安全配置
│   │   ├── tls/                           # TLS证书
│   │   ├── jwt/                           # JWT密钥
│   │   │   ├── private.key
│   │   │   └── public.key
│   │   └── secrets/                       # 密钥管理
│   │       ├── .env.development
│   │       ├── .env.staging
│   │       └── .env.production
│   └── backup/                             # 备份配置
│       ├── backup-script.sh
│       └── restore-script.sh
├── docs/                                     # 📚 项目文档
│   ├── architecture/                        # 架构文档
│   │   ├── microservices-overview.md       # 微服务总览
│   │   ├── service-interactions.md         # 服务交互
│   │   ├── data-flow.md                   # 数据流图
│   │   └── security-model.md              # 安全模型
│   ├── api/                                # API文档
│   │   ├── openapi.yaml                   # OpenAPI规范
│   │   ├── postman/                       # Postman集合
│   │   └── examples/                      # API示例
│   ├── deployment/                         # 部署文档
│   │   ├── docker-compose.md              # Docker Compose部署
│   │   ├── production-setup.md            # 生产环境设置
│   │   ├── monitoring.md                  # 监控设置
│   │   └── troubleshooting.md             # 故障排除
│   ├── development/                        # 开发文档
│   │   ├── getting-started.md             # 快速开始
│   │   ├── coding-standards.md            # 编码规范
│   │   ├── testing-guide.md               # 测试指南
│   │   └── contribution-guide.md          # 贡献指南
│   ├── security/                           # 安全文档
│   │   ├── authentication.md              # 认证机制
│   │   ├── authorization.md               # 授权机制
│   │   ├── data-protection.md             # 数据保护
│   │   └── compliance.md                  # 合规性
│   └── operations/                         # 运维文档
│       ├── monitoring.md                  # 监控指南
│       ├── logging.md                     # 日志管理
│       ├── backup-restore.md              # 备份恢复
│       └── performance-tuning.md          # 性能调优
├── tests/                                    # 🧪 全局测试
│   ├── e2e/                                # 端到端测试
│   │   ├── auth-flow.e2e-spec.ts          # 认证流程测试
│   │   ├── user-management.e2e-spec.ts    # 用户管理测试
│   │   ├── tenant-isolation.e2e-spec.ts   # 租户隔离测试
│   │   └── api-gateway.e2e-spec.ts        # 网关测试
│   ├── integration/                        # 集成测试
│   │   ├── database.integration-spec.ts    # 数据库集成测试
│   │   ├── redis.integration-spec.ts       # Redis集成测试
│   │   └── services.integration-spec.ts    # 服务集成测试
│   ├── performance/                        # 性能测试
│   │   ├── load-test.spec.ts              # 负载测试
│   │   ├── stress-test.spec.ts            # 压力测试
│   │   └── benchmark.spec.ts              # 基准测试
│   ├── security/                           # 安全测试
│   │   ├── auth.security-spec.ts          # 认证安全测试
│   │   ├── injection.security-spec.ts     # 注入攻击测试
│   │   └── rate-limit.security-spec.ts    # 限流测试
│   └── fixtures/                           # 测试数据
│       ├── users.json
│       ├── tenants.json
│       └── permissions.json
├── scripts/                                  # 📜 根级脚本
│   ├── setup.sh                            # 项目设置脚本
│   ├── dev.sh                              # 开发环境启动
│   ├── build.sh                            # 构建脚本
│   ├── test.sh                             # 测试脚本
│   ├── lint.sh                             # 代码检查脚本
│   ├── deploy.sh                           # 部署脚本
│   └── clean.sh                            # 清理脚本
├── .env.example                             # 环境变量示例
├── .env.local                               # 本地环境变量
├── .gitignore                               # Git忽略文件
├── .gitattributes                           # Git属性文件
├── .dockerignore                            # Docker忽略文件
├── .editorconfig                            # 编辑器配置
├── .prettierrc                              # Prettier配置
├── .prettierignore                          # Prettier忽略
├── .eslintrc.json                           # ESLint配置
├── .eslintignore                            # ESLint忽略
├── nx.json                                  # Nx工作区配置
├── project.json                             # 根项目配置
├── tsconfig.base.json                       # TypeScript基础配置
├── tsconfig.json                            # TypeScript配置
├── jest.config.ts                           # Jest测试配置
├── jest.preset.js                           # Jest预设
├── package.json                             # 包管理文件
├── package-lock.json                        # 锁定文件
├── docker-compose.yml                       # Docker编排文件
├── Dockerfile                               # 根Dockerfile
├── README.md                                # 项目说明
├── CHANGELOG.md                             # 变更日志
├── LICENSE                                  # 许可证
├── CONTRIBUTING.md                          # 贡献指南
├── CODE_OF_CONDUCT.md                       # 行为准则
├── SECURITY.md                              # 安全政策
└── CLAUDE.md                                # Claude Code配置
```

## 🔧 关键设计特点

### 🎯 标准版本优化
- **技术栈统一**: 所有服务使用 NestJS 10.x + TypeScript 5.x
- **部署简化**: Docker Compose 替代 Kubernetes
- **存储优化**: PostgreSQL + Redis 替代复杂存储方案
- **监控标准**: Prometheus + Grafana 标准监控栈

### 🏢 企业级特性
- **多租户支持**: 完整的租户隔离和管理
- **安全合规**: JWT、OAuth、RBAC、审计日志
- **高可用性**: 负载均衡、熔断、限流、监控
- **可扩展性**: Nx Monorepo 支持水平扩展

### ⚡ 开发效率
- **共享库设计**: 5个核心共享库减少代码重复
- **类型安全**: 完整的 TypeScript 类型系统
- **测试完备**: 单元、集成、E2E、性能测试
- **工具齐全**: 代码生成、自动化脚本、监控工具

### 📊 性能指标
- **并发用户**: 100,000 活跃用户
- **租户支持**: 100 个租户
- **QPS处理**: 1,000 QPS
- **响应时间**: P95 < 100ms
- **可用性**: 99.9% SLA
- **内存使用**: 8GB 标准配置

## 🚀 快速开始命令

### 环境准备
```bash
# 克隆项目
git clone <repository-url>
cd platform

# 安装依赖
npm install

# 设置环境变量
cp .env.example .env.local

# 启动基础设施
docker-compose up -d postgres redis

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev
```

### 开发命令
```bash
# 启动所有服务 (开发模式)
nx run-many --target=serve --projects=api-gateway-service,auth-service,user-management-service

# 构建所有服务
nx run-many --target=build --all

# 运行所有测试
nx run-many --target=test --all

# 代码检查
nx run-many --target=lint --all

# 生成新的微服务
nx generate @nx/nest:application new-service-name
```

### 生产部署
```bash
# 构建生产镜像
./scripts/build.sh

# 部署到生产环境
./scripts/deploy.sh production

# 健康检查
./scripts/health-check.sh
```

## 📚 相关文档

- [开发指南](./docs/development/getting-started.md)
- [API文档](./API-ENDPOINTS.md)
- [服务功能清单](./SERVICE_FUNCTIONS_LIST.md)
- [服务交互规范](./SERVICE_INTERACTION_SPEC.md)
- [部署指南](./docs/deployment/docker-compose.md)
- [监控指南](./docs/operations/monitoring.md)

## 📝 更新日志

- **v1.0.0** - 初始版本，包含12个核心微服务的完整架构设计
- 基于现有开发指南文档和最新 Nx + NestJS 最佳实践
- 支持企业级100租户+10万用户的标准版本定位

---

**💡 提示**: 这个结构设计完全符合企业级微服务平台标准版本定位，支持在4周内完成12个核心服务的开发目标。每个服务都有详细的架构实现和API端点定义，可以直接用于生产环境部署。