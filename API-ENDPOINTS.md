# 核心微服务 API 端点文档

## 概述

本文档列出了企业级微服务平台中12个核心微服务的API端点定义，按服务和功能模块分类组织。这些是平台运行的必需服务，提供了基础的身份认证、用户管理、多租户、通知、文件存储、监控、审计、任务调度、消息队列和缓存功能。

**重要说明：**
- ✅ **已定义**: 基于实际开发文档中明确定义的端点
- 🔄 **推荐**: 基于微服务最佳实践推荐添加的端点  
- 🔧 **系统级**: 系统运维和健康检查相关端点
- 🔗 **内部**: 微服务间内部通信端点

**扩展服务**: 19个扩展微服务的API端点请参考 [扩展微服务 API 端点文档](./EXTENDED-SERVICES-API-ENDPOINTS.md)

## 核心微服务架构

### 12个核心微服务

1. **API网关服务** (api-gateway-service) - 统一入口和路由
2. **认证授权服务** (auth-service) - 用户身份验证
3. **权限管理服务** (rbac-service) - 访问授权和权限控制
4. **用户管理服务** (user-management-service) - 用户生命周期管理
5. **多租户管理服务** (tenant-management-service) - 多租户资源管理
6. **消息通知服务** (notification-service) - 多渠道消息推送
7. **文件存储服务** (file-storage-service) - 文件上传和管理
8. **监控告警服务** (monitoring-service) - 系统监控和指标
9. **日志审计服务** (audit-service) - 操作日志和审计追踪
10. **任务调度服务** (scheduler-service) - 定时任务和调度管理
11. **消息队列服务** (message-queue-service) - 异步消息处理
12. **缓存服务** (cache-service) - 分布式缓存管理

---

## 1. API网关服务 (api-gateway-service)

### 基础管理
- 🔧 `GET /api/v1/gateway/health` - 网关健康检查
- 🔄 `GET /api/v1/gateway/status` - 网关运行状态
- 🔧 `GET /api/v1/gateway/version` - 获取网关版本信息
- 🔄 `GET /api/v1/gateway/metrics` - 网关性能指标
- 🔄 `POST /api/v1/gateway/reload` - 重新加载配置
- 🔄 `PUT /api/v1/gateway/config` - 更新网关配置
- 🔄 `POST /api/v1/gateway/backup` - 备份网关配置

### 路由管理
- 🔄 `GET /api/v1/gateway/routes` - 获取路由配置
- 🔄 `POST /api/v1/gateway/routes` - 创建路由规则
- 🔄 `PUT /api/v1/gateway/routes/{id}` - 更新路由规则
- 🔄 `DELETE /api/v1/gateway/routes/{id}` - 删除路由规则
- 🔄 `PATCH /api/v1/gateway/routes/{id}/status` - 启用/禁用路由
- 🔄 `POST /api/v1/gateway/testing/route` - 测试路由配置

### 负载均衡与限流
- 🔄 `GET /api/v1/gateway/load-balancers` - 获取负载均衡器配置
- 🔄 `POST /api/v1/gateway/load-balancers` - 创建负载均衡器
- 🔄 `PUT /api/v1/gateway/load-balancers/{id}` - 更新负载均衡器
- 🔄 `DELETE /api/v1/gateway/load-balancers/{id}` - 删除负载均衡器
- 🔄 `GET /api/v1/gateway/rate-limits` - 获取限流配置
- 🔄 `POST /api/v1/gateway/rate-limits` - 创建限流规则
- 🔄 `PUT /api/v1/gateway/rate-limits/{id}` - 更新限流规则
- 🔄 `DELETE /api/v1/gateway/rate-limits/{id}` - 删除限流规则
- 🔄 `PATCH /api/v1/gateway/rate-limits/{id}/status` - 启用/禁用限流
- 🔗 `GET /api/v1/gateway/internal/circuit-breaker` - 熔断器状态
- 🔄 `POST /api/v1/gateway/circuit-breaker/reset` - 重置熔断器

### 安全与认证
- 🔄 `GET /api/v1/gateway/security/policies` - 获取安全策略
- 🔄 `PUT /api/v1/gateway/security/policies/{id}` - 更新安全策略
- 🔄 `GET /api/v1/gateway/api-keys` - 获取API密钥列表
- 🔄 `POST /api/v1/gateway/api-keys` - 生成API密钥
- 🔄 `DELETE /api/v1/gateway/api-keys/{id}` - 删除API密钥
- 🔄 `GET /api/v1/gateway/cors` - 获取CORS配置
- 🔄 `PUT /api/v1/gateway/cors` - 更新CORS配置

### 插件与中间件
- 🔄 `GET /api/v1/gateway/plugins` - 获取插件列表
- 🔄 `POST /api/v1/gateway/plugins/install` - 安装插件
- 🔄 `DELETE /api/v1/gateway/plugins/{id}` - 卸载插件
- 🔄 `PATCH /api/v1/gateway/plugins/{id}/status` - 启用/禁用插件
- 🔄 `GET /api/v1/gateway/middlewares` - 获取中间件列表
- 🔄 `POST /api/v1/gateway/middlewares` - 创建中间件
- 🔄 `PUT /api/v1/gateway/middlewares/{id}` - 更新中间件
- 🔄 `DELETE /api/v1/gateway/middlewares/{id}` - 删除中间件

### 证书管理
- 🔄 `GET /api/v1/gateway/certificates` - 获取SSL证书列表
- 🔄 `POST /api/v1/gateway/certificates/upload` - 上传SSL证书
- 🔄 `DELETE /api/v1/gateway/certificates/{id}` - 删除SSL证书

### 服务发现
- 🔄 `GET /api/v1/gateway/discovery/services` - 获取注册服务列表
- 🔄 `GET /api/v1/gateway/discovery/instances/{service}` - 获取服务实例
- 🔄 `POST /api/v1/gateway/discovery/register` - 注册服务
- 🔄 `POST /api/v1/gateway/discovery/heartbeat` - 发送心跳
- 🔄 `DELETE /api/v1/gateway/discovery/deregister` - 注销服务

### 配置中心
- 🔄 `GET /api/v1/gateway/config/applications` - 获取应用配置
- 🔄 `GET /api/v1/gateway/config/environments` - 获取环境配置
- 🔄 `GET /api/v1/gateway/config/properties` - 获取配置属性
- 🔄 `POST /api/v1/gateway/config/applications` - 创建应用配置
- 🔄 `POST /api/v1/gateway/config/publish` - 发布配置
- 🔄 `POST /api/v1/gateway/config/reload` - 重新加载配置
- 🔄 `PUT /api/v1/gateway/config/properties/{key}` - 更新配置属性
- 🔄 `DELETE /api/v1/gateway/config/properties/{key}` - 删除配置

### 监控分析
- 🔄 `GET /api/v1/gateway/services` - 获取后端服务列表
- 🔄 `PATCH /api/v1/gateway/services/{id}/status` - 启用/禁用服务
- 🔄 `GET /api/v1/gateway/upstreams` - 获取上游服务配置
- 🔄 `POST /api/v1/gateway/upstreams` - 创建上游服务
- 🔄 `PUT /api/v1/gateway/upstreams/{id}` - 更新上游服务
- 🔄 `DELETE /api/v1/gateway/upstreams/{id}` - 删除上游服务
- 🔄 `PATCH /api/v1/gateway/upstreams/{id}/health` - 更新上游健康状态
- 🔄 `GET /api/v1/gateway/cache/stats` - 获取缓存统计
- 🔄 `POST /api/v1/gateway/cache/clear` - 清除缓存
- 🔄 `GET /api/v1/gateway/analytics/traffic` - 获取流量分析
- 🔄 `GET /api/v1/gateway/analytics/errors` - 获取错误分析
- 🔄 `GET /api/v1/gateway/analytics/latency` - 获取延迟分析
- 🔄 `GET /api/v1/gateway/transformations` - 获取请求转换规则
- 🔄 `POST /api/v1/gateway/transformations` - 创建转换规则
- 🔄 `PUT /api/v1/gateway/transformations/{id}` - 更新转换规则
- 🔄 `DELETE /api/v1/gateway/transformations/{id}` - 删除转换规则
- 🔄 `GET /api/v1/gateway/webhooks` - 获取Webhook配置
- 🔄 `POST /api/v1/gateway/webhooks` - 创建Webhook
- 🔄 `DELETE /api/v1/gateway/webhooks/{id}` - 删除Webhook

### 版本管理与国际化
- 🔄 `GET /api/v1/gateway/versions` - 获取API版本信息
- 🔄 `GET /api/v1/gateway/compatibility` - 获取版本兼容性检查
- 🔄 `POST /api/v1/gateway/versions/promote` - 版本提升
- 🔄 `POST /api/v1/gateway/versions/deprecate` - 版本废弃
- 🔄 `POST /api/v1/gateway/versions/migrate` - 版本迁移
- 🔄 `GET /api/v1/gateway/i18n/languages` - 获取支持语言列表
- 🔄 `POST /api/v1/gateway/i18n/translate` - 翻译文本
- 🔄 `POST /api/v1/gateway/i18n/batch` - 批量翻译
- 🔄 `POST /api/v1/gateway/i18n/detect` - 语言检测

### 高级路由功能
- 🔄 `GET /api/v1/gateway/routing/canary` - 获取灰度发布配置
- 🔄 `POST /api/v1/gateway/routing/canary` - 创建灰度发布规则
- 🔄 `PUT /api/v1/gateway/routing/canary/{id}` - 更新灰度发布配置
- 🔄 `DELETE /api/v1/gateway/routing/canary/{id}` - 删除灰度发布规则
- 🔄 `POST /api/v1/gateway/routing/canary/{id}/promote` - 灰度发布晋级
- 🔄 `POST /api/v1/gateway/routing/canary/{id}/rollback` - 灰度发布回滚
- 🔄 `GET /api/v1/gateway/routing/blue-green` - 获取蓝绿部署状态
- 🔄 `POST /api/v1/gateway/routing/blue-green/switch` - 蓝绿部署切换
- 🔄 `GET /api/v1/gateway/routing/mirror` - 获取流量镜像配置
- 🔄 `POST /api/v1/gateway/routing/mirror` - 创建流量镜像规则
- 🔄 `DELETE /api/v1/gateway/routing/mirror/{id}` - 删除流量镜像
- 🔄 `GET /api/v1/gateway/routing/geo` - 获取地理路由规则
- 🔄 `POST /api/v1/gateway/routing/geo` - 创建地理路由规则
- 🔄 `PUT /api/v1/gateway/routing/geo/{id}` - 更新地理路由规则
- 🔄 `GET /api/v1/gateway/routing/ab-tests` - 获取A/B测试配置
- 🔄 `POST /api/v1/gateway/routing/ab-tests` - 创建A/B测试
- 🔄 `PUT /api/v1/gateway/routing/ab-tests/{id}` - 更新A/B测试
- 🔄 `POST /api/v1/gateway/routing/ab-tests/{id}/results` - 获取A/B测试结果

### 性能优化
- 🔄 `GET /api/v1/gateway/performance/connections` - 获取连接池状态
- 🔄 `PUT /api/v1/gateway/performance/connections/config` - 配置连接池参数
- 🔄 `POST /api/v1/gateway/performance/connections/reset` - 重置连接池
- 🔄 `GET /api/v1/gateway/performance/idempotency` - 获取幂等性配置
- 🔄 `POST /api/v1/gateway/performance/idempotency/keys` - 生成幂等性密钥
- 🔄 `DELETE /api/v1/gateway/performance/idempotency/keys/{key}` - 清理幂等性密钥
- 🔄 `GET /api/v1/gateway/performance/deduplication` - 获取去重配置
- 🔄 `PUT /api/v1/gateway/performance/deduplication` - 更新去重规则
- 🔄 `GET /api/v1/gateway/performance/failover` - 获取故障转移配置
- 🔄 `PUT /api/v1/gateway/performance/failover` - 更新故障转移策略
- 🔄 `POST /api/v1/gateway/performance/failover/test` - 测试故障转移
- 🔄 `GET /api/v1/gateway/performance/queue` - 获取请求队列状态
- 🔄 `PUT /api/v1/gateway/performance/queue/config` - 配置队列参数
- 🔄 `POST /api/v1/gateway/performance/backpressure` - 启用背压控制

### API治理
- 🔄 `GET /api/v1/gateway/governance/lifecycle` - 获取API生命周期状态
- 🔄 `POST /api/v1/gateway/governance/lifecycle/{api}/retire` - 废弃API
- 🔄 `POST /api/v1/gateway/governance/lifecycle/{api}/restore` - 恢复API
- 🔄 `GET /api/v1/gateway/governance/docs` - 获取API文档列表
- 🔄 `POST /api/v1/gateway/governance/docs/generate` - 自动生成API文档
- 🔄 `PUT /api/v1/gateway/governance/docs/{id}` - 更新API文档
- 🔄 `POST /api/v1/gateway/governance/docs/sync` - 同步API文档
- 🔄 `GET /api/v1/gateway/governance/analytics/usage` - 获取API使用统计
- 🔄 `GET /api/v1/gateway/governance/analytics/performance` - 获取API性能分析
- 🔄 `GET /api/v1/gateway/governance/analytics/errors` - 获取API错误分析
- 🔄 `POST /api/v1/gateway/governance/analytics/reports` - 生成分析报告
- 🔄 `GET /api/v1/gateway/governance/developer-keys` - 获取开发者密钥列表
- 🔄 `POST /api/v1/gateway/governance/developer-keys` - 分发开发者密钥
- 🔄 `PUT /api/v1/gateway/governance/developer-keys/{id}` - 更新密钥权限
- 🔄 `DELETE /api/v1/gateway/governance/developer-keys/{id}` - 撤销开发者密钥

### 企业级协议支持
- 🔄 `GET /api/v1/gateway/protocols/http2` - 获取HTTP/2配置
- 🔄 `PUT /api/v1/gateway/protocols/http2` - 配置HTTP/2支持
- 🔄 `GET /api/v1/gateway/protocols/grpc` - 获取gRPC配置
- 🔄 `PUT /api/v1/gateway/protocols/grpc` - 配置gRPC支持
- 🔄 `POST /api/v1/gateway/protocols/grpc/transcode` - gRPC转码配置
- 🔄 `GET /api/v1/gateway/protocols/websocket` - 获取WebSocket配置
- 🔄 `PUT /api/v1/gateway/protocols/websocket` - 配置WebSocket支持
- 🔄 `GET /api/v1/gateway/adapters` - 获取外部系统适配器
- 🔄 `POST /api/v1/gateway/adapters` - 创建系统适配器
- 🔄 `PUT /api/v1/gateway/adapters/{id}` - 更新适配器配置
- 🔄 `DELETE /api/v1/gateway/adapters/{id}` - 删除适配器
- 🔄 `GET /api/v1/gateway/transformation/formats` - 获取数据格式转换器
- 🔄 `POST /api/v1/gateway/transformation/formats` - 创建格式转换规则
- 🔄 `PUT /api/v1/gateway/transformation/formats/{id}` - 更新转换规则
- 🔄 `GET /api/v1/gateway/cluster/config` - 获取网关集群配置
- 🔄 `PUT /api/v1/gateway/cluster/config` - 更新集群配置
- 🔄 `GET /api/v1/gateway/cluster/nodes` - 获取集群节点状态
- 🔄 `POST /api/v1/gateway/cluster/nodes/{id}/join` - 节点加入集群
- 🔄 `POST /api/v1/gateway/cluster/nodes/{id}/leave` - 节点离开集群
- 🔄 `GET /api/v1/gateway/ha/status` - 获取高可用状态
- 🔄 `PUT /api/v1/gateway/ha/config` - 配置高可用策略

---

## 2. 认证服务 (auth-service)

### 用户认证
- ✅ `POST /api/v1/auth/login` - 用户登录
- ✅ `POST /api/v1/auth/logout` - 用户登出
- ✅ `POST /api/v1/auth/register` - 用户注册
- ✅ `POST /api/v1/auth/verify` - 验证令牌
- ✅ `POST /api/v1/auth/email/verify` - 邮箱验证
- 🔧 `GET /api/v1/auth/health` - 认证服务健康检查

### 令牌管理
- ✅ `GET /api/v1/auth/tokens` - 获取访问令牌
- ✅ `POST /api/v1/auth/refresh` - 刷新令牌
- ✅ `DELETE /api/v1/auth/tokens/{id}` - 删除令牌

### 密码管理
- ✅ `POST /api/v1/auth/password/reset` - 重置密码
- ✅ `POST /api/v1/auth/password/change` - 修改密码
- 🔄 `GET /api/v1/auth/password-policy` - 获取密码策略
- 🔄 `PUT /api/v1/auth/password-policy` - 更新密码策略

### 双因子认证
- 🔄 `GET /api/v1/auth/2fa/status` - 获取双因子认证状态
- 🔄 `POST /api/v1/auth/2fa/enable` - 启用双因子认证
- 🔄 `POST /api/v1/auth/2fa/disable` - 禁用双因子认证
- 🔄 `POST /api/v1/auth/2fa/verify` - 验证双因子认证

### OAuth集成
- ✅ `GET /api/v1/auth/oauth/providers` - 获取第三方登录提供商
- ✅ `GET /api/v1/auth/oauth/callback` - OAuth回调处理
- ✅ `POST /api/v1/auth/oauth/authorize` - OAuth授权
- ✅ `POST /api/v1/auth/oauth/token` - OAuth令牌交换
- ✅ `DELETE /api/v1/auth/oauth/revoke` - 撤销OAuth授权

### 会话管理
- ✅ `GET /api/v1/auth/sessions` - 获取用户会话
- ✅ `DELETE /api/v1/auth/sessions/{id}` - 删除会话
- 🔄 `POST /api/v1/auth/session/revoke` - 撤销会话
- 🔄 `PUT /api/v1/auth/session-timeout` - 更新会话超时
- 🔄 `PATCH /api/v1/auth/session/extend` - 延长会话

### 设备管理
- 🔄 `GET /api/v1/auth/devices` - 获取已授权设备
- 🔄 `POST /api/v1/auth/device/trust` - 信任设备
- 🔄 `POST /api/v1/auth/device/revoke` - 撤销设备信任
- 🔄 `DELETE /api/v1/auth/devices/{id}` - 删除授权设备

### 安全防护
- 🔄 `GET /api/v1/auth/ip-whitelist` - 获取IP白名单
- 🔄 `GET /api/v1/auth/blacklist` - 获取黑名单
- 🔄 `POST /api/v1/auth/ip/whitelist` - 添加IP白名单
- 🔄 `POST /api/v1/auth/ip/blacklist` - 添加IP黑名单
- 🔄 `DELETE /api/v1/auth/ip/whitelist/{id}` - 删除IP白名单
- 🔄 `DELETE /api/v1/auth/ip/blacklist/{id}` - 删除IP黑名单
- 🔄 `GET /api/v1/auth/security-logs` - 获取安全日志
- 🔄 `GET /api/v1/auth/audit-logs` - 获取审计日志

### 用户资料管理
- ✅ `GET /api/v1/auth/profile` - 获取用户资料
- ✅ `PUT /api/v1/auth/profile` - 更新用户资料
- ✅ `PATCH /api/v1/auth/profile/avatar` - 更新头像
- ✅ `PATCH /api/v1/auth/profile/preferences` - 更新用户偏好
- 🔄 `PATCH /api/v1/auth/account/status` - 更新账户状态

### 密钥管理
- 🔄 `GET /api/v1/auth/keys` - 获取密钥列表
- 🔄 `GET /api/v1/auth/keys/{id}/metadata` - 获取密钥元数据
- 🔄 `GET /api/v1/auth/keys/policies` - 获取密钥访问策略
- 🔄 `POST /api/v1/auth/keys/generate` - 生成密钥
- 🔄 `POST /api/v1/auth/keys/encrypt` - 加密数据
- 🔄 `POST /api/v1/auth/keys/decrypt` - 解密数据
- 🔄 `POST /api/v1/auth/keys/rotate` - 密钥轮换
- 🔄 `DELETE /api/v1/auth/keys/{id}` - 删除密钥

### 数据治理
- 🔄 `GET /api/v1/auth/governance/policies` - 获取数据治理策略
- 🔄 `GET /api/v1/auth/governance/compliance` - 获取合规报告
- 🔄 `GET /api/v1/auth/governance/classifications` - 获取数据分类
- 🔄 `GET /api/v1/auth/governance/lineage` - 获取数据血缘
- 🔄 `POST /api/v1/auth/governance/policies` - 创建数据治理策略
- 🔄 `POST /api/v1/auth/governance/scan` - 执行合规扫描
- 🔄 `POST /api/v1/auth/governance/classify` - 数据分类
- 🔄 `PUT /api/v1/auth/governance/policies/{id}` - 更新数据治理策略
- 🔄 `DELETE /api/v1/auth/governance/policies/{id}` - 删除数据治理策略

### 威胁检测
- 🔄 `GET /api/v1/auth/security/threats` - 获取威胁列表
- 🔄 `GET /api/v1/auth/security/vulnerabilities` - 获取漏洞扫描结果
- 🔄 `GET /api/v1/auth/security/incidents` - 获取安全事件
- 🔄 `GET /api/v1/auth/security/rules` - 获取检测规则
- 🔄 `POST /api/v1/auth/security/scan` - 执行安全扫描
- 🔄 `POST /api/v1/auth/security/analyze` - 威胁分析
- 🔄 `POST /api/v1/auth/security/rules` - 创建检测规则
- 🔄 `POST /api/v1/auth/security/incidents` - 报告安全事件
- 🔄 `PUT /api/v1/auth/security/policies/{id}` - 更新安全策略

### 企业身份集成
- 🔄 `GET /api/v1/auth/enterprise/ldap/config` - 获取LDAP配置
- 🔄 `POST /api/v1/auth/enterprise/ldap/connect` - 连接LDAP服务器
- 🔄 `POST /api/v1/auth/enterprise/ldap/sync` - 同步LDAP用户
- 🔄 `PUT /api/v1/auth/enterprise/ldap/config` - 更新LDAP配置
- 🔄 `POST /api/v1/auth/enterprise/ldap/test` - 测试LDAP连接
- 🔄 `GET /api/v1/auth/enterprise/ad/config` - 获取Active Directory配置
- 🔄 `POST /api/v1/auth/enterprise/ad/connect` - 连接Active Directory
- 🔄 `POST /api/v1/auth/enterprise/ad/sync` - 同步AD用户和组
- 🔄 `GET /api/v1/auth/enterprise/saml/config` - 获取SAML配置
- 🔄 `POST /api/v1/auth/enterprise/saml/sso` - SAML单点登录
- 🔄 `POST /api/v1/auth/enterprise/saml/metadata` - 获取SAML元数据
- 🔄 `PUT /api/v1/auth/enterprise/saml/config` - 更新SAML配置
- 🔄 `GET /api/v1/auth/enterprise/providers` - 获取身份提供商列表
- 🔄 `POST /api/v1/auth/enterprise/providers` - 添加身份提供商
- 🔄 `PUT /api/v1/auth/enterprise/providers/{id}` - 更新身份提供商
- 🔄 `DELETE /api/v1/auth/enterprise/providers/{id}` - 删除身份提供商
- 🔄 `POST /api/v1/auth/enterprise/federation/trust` - 建立联邦信任关系
- 🔄 `GET /api/v1/auth/enterprise/federation/domains` - 获取联邦域列表

### 高级认证方式
- 🔄 `GET /api/v1/auth/biometric/config` - 获取生物识别配置
- 🔄 `POST /api/v1/auth/biometric/enroll` - 注册生物识别
- 🔄 `POST /api/v1/auth/biometric/verify` - 验证生物识别
- 🔄 `DELETE /api/v1/auth/biometric/{id}` - 删除生物识别数据
- 🔄 `GET /api/v1/auth/hardware-tokens` - 获取硬件令牌列表
- 🔄 `POST /api/v1/auth/hardware-tokens/register` - 注册硬件令牌
- 🔄 `POST /api/v1/auth/hardware-tokens/verify` - 验证硬件令牌
- 🔄 `DELETE /api/v1/auth/hardware-tokens/{id}` - 撤销硬件令牌
- 🔄 `GET /api/v1/auth/fido2/config` - 获取FIDO2配置
- 🔄 `POST /api/v1/auth/fido2/register` - 注册FIDO2设备
- 🔄 `POST /api/v1/auth/fido2/authenticate` - FIDO2认证
- 🔄 `GET /api/v1/auth/fido2/devices` - 获取用户FIDO2设备
- 🔄 `DELETE /api/v1/auth/fido2/devices/{id}` - 删除FIDO2设备
- 🔄 `POST /api/v1/auth/push/send` - 发送推送认证
- 🔄 `POST /api/v1/auth/push/verify` - 验证推送认证
- 🔄 `GET /api/v1/auth/passwordless/options` - 获取无密码登录选项

### 自适应认证
- 🔄 `GET /api/v1/auth/adaptive/fingerprint` - 获取设备指纹
- 🔄 `POST /api/v1/auth/adaptive/fingerprint/verify` - 验证设备指纹
- 🔄 `GET /api/v1/auth/adaptive/risk/score` - 获取风险评分
- 🔄 `POST /api/v1/auth/adaptive/risk/assess` - 执行风险评估
- 🔄 `GET /api/v1/auth/adaptive/location/verify` - 地理位置验证
- 🔄 `POST /api/v1/auth/adaptive/location/whitelist` - 添加位置白名单
- 🔄 `GET /api/v1/auth/adaptive/patterns` - 获取用户行为模式
- 🔄 `POST /api/v1/auth/adaptive/patterns/analyze` - 分析行为模式
- 🔄 `GET /api/v1/auth/adaptive/rules` - 获取自适应规则
- 🔄 `POST /api/v1/auth/adaptive/rules` - 创建自适应规则
- 🔄 `PUT /api/v1/auth/adaptive/rules/{id}` - 更新自适应规则
- 🔄 `POST /api/v1/auth/adaptive/challenge` - 触发额外认证挑战

### 合规检查
- 🔄 `GET /api/v1/auth/compliance/password/policy` - 获取密码合规策略
- 🔄 `POST /api/v1/auth/compliance/password/validate` - 验证密码合规性
- 🔄 `PUT /api/v1/auth/compliance/password/policy` - 更新密码策略
- 🔄 `GET /api/v1/auth/compliance/account/lockout` - 获取账户锁定策略
- 🔄 `POST /api/v1/auth/compliance/account/unlock` - 解锁账户
- 🔄 `GET /api/v1/auth/compliance/logs` - 获取合规日志
- 🔄 `POST /api/v1/auth/compliance/reports/generate` - 生成合规报告
- 🔄 `GET /api/v1/auth/compliance/gdpr/consent` - 获取用户同意状态
- 🔄 `POST /api/v1/auth/compliance/gdpr/consent` - 记录用户同意
- 🔄 `POST /api/v1/auth/compliance/gdpr/forget` - 处理被遗忘权请求
- 🔄 `GET /api/v1/auth/compliance/data/retention` - 获取数据保留策略
- 🔄 `POST /api/v1/auth/compliance/data/anonymize` - 数据匿名化处理

---

## 3. 权限管理服务 (rbac-service)

### 角色管理
- 🔄 `GET /api/v1/rbac/roles` - 获取角色列表
- 🔄 `GET /api/v1/rbac/roles/{id}` - 获取角色详情
- 🔄 `GET /api/v1/rbac/roles/{id}/permissions` - 获取角色权限
- 🔄 `GET /api/v1/rbac/roles/{id}/users` - 获取角色用户列表
- 🔄 `GET /api/v1/rbac/roles/hierarchy` - 获取角色层级结构
- 🔄 `POST /api/v1/rbac/roles` - 创建角色
- 🔄 `PUT /api/v1/rbac/roles/{id}` - 更新角色
- 🔄 `DELETE /api/v1/rbac/roles/{id}` - 删除角色
- 🔄 `PATCH /api/v1/rbac/roles/{id}/status` - 更新角色状态

### 权限管理
- 🔄 `GET /api/v1/rbac/permissions` - 获取权限列表
- 🔄 `GET /api/v1/rbac/permissions/{id}` - 获取权限详情
- 🔄 `GET /api/v1/rbac/permissions/categories` - 获取权限分类
- 🔄 `GET /api/v1/rbac/permissions/resources` - 获取资源权限
- 🔄 `POST /api/v1/rbac/permissions` - 创建权限
- 🔄 `PUT /api/v1/rbac/permissions/{id}` - 更新权限
- 🔄 `DELETE /api/v1/rbac/permissions/{id}` - 删除权限
- 🔄 `PATCH /api/v1/rbac/permissions/{id}/status` - 更新权限状态

### RBAC控制
- 🔄 `GET /api/v1/rbac/users/{id}/roles` - 获取用户角色
- 🔄 `GET /api/v1/rbac/users/{id}/permissions` - 获取用户权限
- 🔄 `GET /api/v1/rbac/users/{id}/effective-permissions` - 获取用户有效权限
- 🔄 `POST /api/v1/rbac/users/{id}/roles` - 分配用户角色
- 🔄 `DELETE /api/v1/rbac/users/{id}/roles/{roleId}` - 移除用户角色
- 🔄 `POST /api/v1/rbac/roles/{id}/permissions` - 分配角色权限
- 🔄 `DELETE /api/v1/rbac/roles/{id}/permissions/{permissionId}` - 移除角色权限

### 权限检查
- 🔄 `POST /api/v1/rbac/check` - 检查权限
- 🔄 `POST /api/v1/rbac/batch-check` - 批量权限检查
- 🔄 `GET /api/v1/rbac/check/{userId}/{resource}` - 检查资源权限
- 🔄 `POST /api/v1/rbac/validate/token` - 验证令牌权限

### 策略管理
- 🔄 `GET /api/v1/rbac/policies` - 获取访问策略
- 🔄 `GET /api/v1/rbac/policies/{id}` - 获取策略详情
- 🔄 `POST /api/v1/rbac/policies` - 创建访问策略
- 🔄 `PUT /api/v1/rbac/policies/{id}` - 更新访问策略
- 🔄 `DELETE /api/v1/rbac/policies/{id}` - 删除访问策略
- 🔄 `POST /api/v1/rbac/policies/{id}/evaluate` - 评估策略

### 权限审计
- 🔄 `GET /api/v1/rbac/audit/changes` - 获取权限变更记录
- 🔄 `GET /api/v1/rbac/audit/access-logs` - 获取访问日志
- 🔄 `GET /api/v1/rbac/audit/users/{id}/activities` - 获取用户权限活动
- 🔄 `POST /api/v1/rbac/audit/reports/generate` - 生成权限审计报告

### 动态权限管理
- 🔄 `GET /api/v1/rbac/dynamic/permissions` - 获取动态权限规则
- 🔄 `POST /api/v1/rbac/dynamic/permissions` - 创建动态权限
- 🔄 `PUT /api/v1/rbac/dynamic/permissions/{id}` - 更新动态权限
- 🔄 `DELETE /api/v1/rbac/dynamic/permissions/{id}` - 删除动态权限
- 🔄 `POST /api/v1/rbac/dynamic/evaluate` - 评估动态权限
- 🔄 `GET /api/v1/rbac/temporal/permissions/{userId}` - 获取时间权限
- 🔄 `POST /api/v1/rbac/temporal/permissions` - 创建时间限制权限
- 🔄 `PUT /api/v1/rbac/temporal/permissions/{id}` - 更新时间权限
- 🔄 `POST /api/v1/rbac/temporal/extend` - 延长权限有效期

### 权限委托机制
- 🔄 `GET /api/v1/rbac/delegation/requests` - 获取委托请求列表
- 🔄 `GET /api/v1/rbac/delegation/granted` - 获取已授予委托
- 🔄 `GET /api/v1/rbac/delegation/{id}/details` - 获取委托详情
- 🔄 `POST /api/v1/rbac/delegation/request` - 申请权限委托
- 🔄 `POST /api/v1/rbac/delegation/approve` - 批准委托申请
- 🔄 `POST /api/v1/rbac/delegation/reject` - 拒绝委托申请
- 🔄 `POST /api/v1/rbac/delegation/revoke` - 撤销权限委托
- 🔄 `POST /api/v1/rbac/delegation/proxy` - 代理执行权限
- 🔄 `GET /api/v1/rbac/delegation/chains` - 获取委托链
- 🔄 `POST /api/v1/rbac/delegation/validate` - 验证委托权限

### ABAC属性访问控制
- 🔄 `GET /api/v1/rbac/abac/attributes` - 获取属性定义
- 🔄 `GET /api/v1/rbac/abac/subjects/{id}/attributes` - 获取主体属性
- 🔄 `GET /api/v1/rbac/abac/resources/{id}/attributes` - 获取资源属性
- 🔄 `GET /api/v1/rbac/abac/environments` - 获取环境属性
- 🔄 `POST /api/v1/rbac/abac/attributes` - 创建属性定义
- 🔄 `PUT /api/v1/rbac/abac/attributes/{id}` - 更新属性定义
- 🔄 `POST /api/v1/rbac/abac/subjects/{id}/attributes` - 设置主体属性
- 🔄 `POST /api/v1/rbac/abac/resources/{id}/attributes` - 设置资源属性
- 🔄 `POST /api/v1/rbac/abac/evaluate` - ABAC权限评估
- 🔄 `POST /api/v1/rbac/abac/policies` - 创建ABAC策略
- 🔄 `PUT /api/v1/rbac/abac/policies/{id}` - 更新ABAC策略
- 🔄 `POST /api/v1/rbac/abac/test` - 测试ABAC规则

### 细粒度资源控制
- 🔄 `GET /api/v1/rbac/resources/hierarchy` - 获取资源层级结构
- 🔄 `GET /api/v1/rbac/resources/{id}/permissions` - 获取资源权限配置
- 🔄 `GET /api/v1/rbac/resources/{id}/owners` - 获取资源所有者
- 🔄 `POST /api/v1/rbac/resources/register` - 注册资源
- 🔄 `PUT /api/v1/rbac/resources/{id}/metadata` - 更新资源元数据
- 🔄 `POST /api/v1/rbac/resources/{id}/permissions` - 设置资源权限
- 🔄 `POST /api/v1/rbac/resources/{id}/share` - 资源共享设置
- 🔄 `POST /api/v1/rbac/resources/{id}/lock` - 锁定资源访问
- 🔄 `POST /api/v1/rbac/resources/{id}/unlock` - 解锁资源访问
- 🔄 `GET /api/v1/rbac/resources/field-level` - 获取字段级权限
- 🔄 `POST /api/v1/rbac/resources/field-level` - 设置字段级权限

### 权限继承与层级
- 🔄 `GET /api/v1/rbac/inheritance/tree` - 获取权限继承树
- 🔄 `GET /api/v1/rbac/inheritance/effective/{userId}` - 获取有效继承权限
- 🔄 `POST /api/v1/rbac/inheritance/rules` - 创建继承规则
- 🔄 `PUT /api/v1/rbac/inheritance/rules/{id}` - 更新继承规则
- 🔄 `POST /api/v1/rbac/inheritance/override` - 权限覆盖设置
- 🔄 `POST /api/v1/rbac/inheritance/resolve` - 解析权限冲突
- 🔄 `GET /api/v1/rbac/inheritance/conflicts` - 获取权限冲突
- 🔄 `POST /api/v1/rbac/inheritance/propagate` - 权限传播

### 条件权限与业务规则
- 🔄 `GET /api/v1/rbac/conditions/rules` - 获取条件规则
- 🔄 `POST /api/v1/rbac/conditions/rules` - 创建条件规则
- 🔄 `PUT /api/v1/rbac/conditions/rules/{id}` - 更新条件规则
- 🔄 `POST /api/v1/rbac/conditions/evaluate` - 评估条件权限
- 🔄 `GET /api/v1/rbac/business-rules` - 获取业务规则
- 🔄 `POST /api/v1/rbac/business-rules` - 创建业务规则
- 🔄 `PUT /api/v1/rbac/business-rules/{id}` - 更新业务规则
- 🔄 `POST /api/v1/rbac/business-rules/execute` - 执行业务规则

### 权限版本管理
- 🔄 `GET /api/v1/rbac/versions` - 获取权限版本历史
- 🔄 `GET /api/v1/rbac/versions/{id}` - 获取特定版本详情
- 🔄 `POST /api/v1/rbac/versions/create` - 创建权限版本
- 🔄 `POST /api/v1/rbac/versions/{id}/rollback` - 回滚到指定版本
- 🔄 `POST /api/v1/rbac/versions/compare` - 比较权限版本
- 🔄 `POST /api/v1/rbac/versions/{id}/backup` - 备份权限配置
- 🔄 `POST /api/v1/rbac/versions/{id}/restore` - 恢复权限配置
- 🔄 `GET /api/v1/rbac/versions/changes` - 获取版本变更记录

### 行级权限控制 (RLS)

- 🔄 `GET /api/v1/rbac/rls/rules` - 获取行级权限规则
- 🔄 `POST /api/v1/rbac/rls/rules` - 创建行级权限规则
- 🔄 `PUT /api/v1/rbac/rls/rules/{id}` - 更新行级权限规则
- 🔄 `DELETE /api/v1/rbac/rls/rules/{id}` - 删除行级权限规则
- 🔄 `POST /api/v1/rbac/rls/check` - 检查行级权限
- 🔄 `POST /api/v1/rbac/rls/sync` - 同步RLS与RBAC规则

- 🔧 `GET /api/v1/rbac/health` - 权限服务健康检查

---

## 4. 用户管理服务 (user-management-service)

### 基础用户管理
- ✅ `GET /api/v1/users` - 获取用户列表
- ✅ `GET /api/v1/users/{id}` - 获取用户详情
- ✅ `POST /api/v1/users` - 创建用户
- ✅ `PUT /api/v1/users/{id}` - 更新用户信息
- ✅ `PUT /api/v1/users/{id}/profile` - 更新用户资料
- ✅ `DELETE /api/v1/users/{id}` - 删除用户
- ✅ `PATCH /api/v1/users/{id}/status` - 更新用户状态
- 🔄 `POST /api/v1/users/{id}/activate` - 激活用户
- 🔄 `POST /api/v1/users/{id}/deactivate` - 停用用户
- 🔄 `PUT /api/v1/users/{id}/password` - 更新用户密码
- 🔄 `PUT /api/v1/users/{id}/email` - 更新用户邮箱
- 🔄 `POST /api/v1/users/{id}/reset-password` - 重置用户密码
- 🔄 `POST /api/v1/users/{id}/send-verification` - 发送验证邮件
- 🔄 `DELETE /api/v1/users/{id}/sessions` - 删除用户所有会话
- 🔧 `GET /api/v1/users/health` - 用户服务健康检查

### 动态用户模式管理
- 🔄 `GET /api/v1/users/schema` - 获取租户用户模式定义
- 🔄 `POST /api/v1/users/schema` - 创建用户模式
- 🔄 `PUT /api/v1/users/schema` - 更新用户模式
- 🔄 `GET /api/v1/users/schema/fields` - 获取可用字段类型
- 🔄 `POST /api/v1/users/schema/validate` - 验证模式定义
- 🔄 `GET /api/v1/users/schema/versions` - 获取模式版本历史
- 🔄 `POST /api/v1/users/schema/migrate` - 执行模式迁移
- 🔄 `GET /api/v1/users/schema/templates` - 获取行业模式模板

### 用户查询与搜索
- ✅ `GET /api/v1/users/search` - 搜索用户（保留原有简单搜索）
- 🔄 `POST /api/v1/users/search` - 动态条件搜索用户
- 🔄 `POST /api/v1/users/query` - 复杂查询构建器
- 🔄 `GET /api/v1/users/aggregations` - 用户数据聚合分析
- 🔄 `POST /api/v1/users/export` - 导出用户数据
- 🔄 `POST /api/v1/users/filters/save` - 保存查询过滤器
- 🔄 `GET /api/v1/users/filters` - 获取保存的过滤器

### 用户统计与监控
- 🔄 `GET /api/v1/users/{id}/stats` - 获取用户统计信息
- 🔄 `GET /api/v1/users/{id}/activities` - 获取用户活动记录
- 🔄 `GET /api/v1/users/{id}/connections` - 获取用户连接记录
- 🔄 `PATCH /api/v1/users/{id}/last-login` - 更新最后登录时间
- 🔄 `PATCH /api/v1/users/{id}/verification-status` - 更新验证状态

### 用户设置与偏好
- 🔄 `GET /api/v1/users/{id}/preferences` - 获取用户偏好设置
- 🔄 `PUT /api/v1/users/{id}/preferences` - 更新用户偏好设置
- 🔄 `GET /api/v1/users/{id}/notifications` - 获取用户通知设置
- 🔄 `PUT /api/v1/users/{id}/notifications` - 更新通知设置
- 🔄 `PUT /api/v1/users/{id}/avatar` - 更新用户头像
- 🔄 `PUT /api/v1/users/{id}/phone` - 更新用户手机号
- 🔄 `PATCH /api/v1/users/{id}/settings` - 更新用户设置

### 用户关系与组织
- 🔄 `GET /api/v1/users/{id}/groups` - 获取用户所属组
- 🔄 `POST /api/v1/users/{id}/groups` - 添加用户到组
- 🔄 `DELETE /api/v1/users/{id}/groups/{groupId}` - 从组中移除用户
- ✅ `DELETE /api/v1/users/{id}/roles/{roleId}` - 移除用户角色
- ✅ `DELETE /api/v1/users/{id}/permissions/{permissionId}` - 移除用户权限

### 批量操作引擎

- 🔄 `POST /api/v1/users/batch/create` - 批量创建用户
- 🔄 `POST /api/v1/users/batch/update` - 批量更新用户
- 🔄 `POST /api/v1/users/batch/delete` - 批量删除用户
- 🔄 `POST /api/v1/users/batch/import` - 导入用户数据
- 🔄 `GET /api/v1/users/batch/jobs` - 获取批量任务状态
- 🔄 `GET /api/v1/users/batch/jobs/{jobId}` - 获取任务详情
- 🔄 `POST /api/v1/users/batch/validate` - 验证批量数据

### 配置化业务流程
- 🔄 `GET /api/v1/users/workflows` - 获取用户业务流程配置
- 🔄 `POST /api/v1/users/workflows` - 创建业务流程
- 🔄 `PUT /api/v1/users/workflows/{id}` - 更新业务流程
- 🔄 `POST /api/v1/users/workflows/{id}/trigger` - 触发业务流程
- 🔄 `GET /api/v1/users/workflows/{id}/history` - 获取流程执行历史

### 模式版本管理
- 🔄 `GET /api/v1/users/versions` - 获取用户模式版本历史
- 🔄 `POST /api/v1/users/versions/create` - 创建新版本
- 🔄 `POST /api/v1/users/versions/{id}/rollback` - 回滚到指定版本
- 🔄 `POST /api/v1/users/versions/compare` - 比较版本差异

---

## 5. 多租户管理服务 (tenant-management-service)

### 租户基础管理

- ✅ `GET /api/v1/tenants` - 获取租户列表
- ✅ `GET /api/v1/tenants/{id}` - 获取租户详情
- ✅ `POST /api/v1/tenants` - 创建租户
- ✅ `PUT /api/v1/tenants/{id}` - 更新租户信息
- ✅ `DELETE /api/v1/tenants/{id}` - 删除租户
- ✅ `PATCH /api/v1/tenants/{id}/status` - 更新租户状态
- ✅ `PATCH /api/v1/tenants/{id}/plan` - 更新租户计划
- 🔧 `GET /api/v1/tenants/health` - 租户服务健康检查

### 租户生命周期管理

- 🔄 `POST /api/v1/tenants/{id}/activate` - 激活租户
- 🔄 `POST /api/v1/tenants/{id}/suspend` - 暂停租户
- 🔄 `POST /api/v1/tenants/{id}/restore` - 恢复租户
- 🔄 `POST /api/v1/tenants/{id}/clone` - 克隆租户
- 🔄 `POST /api/v1/tenants/{id}/migrate` - 迁移租户
- 🔄 `GET /api/v1/tenants/{id}/lifecycle/history` - 获取生命周期历史
- 🔄 `POST /api/v1/tenants/{id}/lifecycle/schedule` - 计划生命周期操作
- 🔄 `GET /api/v1/tenants/{id}/lifecycle/status` - 获取当前生命周期状态

### 租户配置管理

- ✅ `GET /api/v1/tenants/{id}/settings` - 获取租户设置
- ✅ `GET /api/v1/tenants/{id}/config` - 获取租户配置
- ✅ `PUT /api/v1/tenants/{id}/settings` - 更新租户设置
- ✅ `PUT /api/v1/tenants/{id}/config` - 更新租户配置
- 🔄 `GET /api/v1/tenants/{id}/config/templates` - 获取配置模板
- 🔄 `POST /api/v1/tenants/{id}/config/validate` - 验证配置
- 🔄 `GET /api/v1/tenants/{id}/config/versions` - 获取配置版本历史
- 🔄 `POST /api/v1/tenants/{id}/config/rollback` - 回滚配置版本

### 租户用户与权限

- ✅ `GET /api/v1/tenants/{id}/users` - 获取租户用户
- ✅ `POST /api/v1/tenants/{id}/users` - 添加租户用户
- ✅ `DELETE /api/v1/tenants/{id}/users/{userId}` - 移除租户用户
- 🔄 `GET /api/v1/tenants/{id}/users/{userId}/roles` - 获取用户租户角色
- 🔄 `POST /api/v1/tenants/{id}/users/{userId}/roles` - 分配租户角色
- 🔄 `DELETE /api/v1/tenants/{id}/users/{userId}/roles/{roleId}` - 移除租户角色
- 🔄 `GET /api/v1/tenants/{id}/roles` - 获取租户角色列表
- 🔄 `POST /api/v1/tenants/{id}/roles` - 创建租户角色

### 租户域名与集成

- ✅ `GET /api/v1/tenants/{id}/domains` - 获取租户域名
- ✅ `POST /api/v1/tenants/{id}/domains` - 添加租户域名
- ✅ `DELETE /api/v1/tenants/{id}/domains/{domainId}` - 删除租户域名
- ✅ `GET /api/v1/tenants/{id}/api-keys` - 获取租户API密钥
- ✅ `POST /api/v1/tenants/{id}/api-keys` - 生成API密钥
- ✅ `DELETE /api/v1/tenants/{id}/api-keys/{keyId}` - 删除API密钥
- 🔄 `POST /api/v1/tenants/{id}/domains/{domainId}/verify` - 验证域名所有权
- 🔄 `GET /api/v1/tenants/{id}/domains/{domainId}/ssl` - 获取SSL证书状态
- 🔄 `POST /api/v1/tenants/{id}/api-keys/{keyId}/rotate` - 轮换API密钥

### 订阅计费管理

- ✅ `GET /api/v1/tenants/{id}/billing` - 获取租户计费信息
- ✅ `GET /api/v1/tenants/{id}/usage` - 获取租户使用情况
- 🔄 `PUT /api/v1/tenants/{id}/billing` - 更新计费信息
- 🔄 `PATCH /api/v1/tenants/{id}/usage/reset` - 重置使用量
- 🔄 `PATCH /api/v1/tenants/{id}/trial/extend` - 延长试用期
- 🔄 `GET /api/v1/tenants/{id}/billing/plans` - 获取可用计费方案
- 🔄 `POST /api/v1/tenants/{id}/billing/upgrade` - 升级计费方案
- 🔄 `POST /api/v1/tenants/{id}/billing/downgrade` - 降级计费方案

### 支付与订阅管理

- 🔄 `GET /api/v1/tenants/{id}/payments` - 获取租户支付记录
- 🔄 `GET /api/v1/tenants/{id}/payments/{paymentId}` - 获取支付详情
- 🔄 `GET /api/v1/tenants/{id}/payment-methods` - 获取支付方式
- 🔄 `GET /api/v1/tenants/{id}/invoices` - 获取租户发票
- 🔄 `GET /api/v1/tenants/{id}/subscriptions` - 获取租户订阅
- 🔄 `GET /api/v1/tenants/{id}/refunds` - 获取退款记录
- 🔄 `POST /api/v1/tenants/{id}/payments/process` - 处理支付
- 🔄 `POST /api/v1/tenants/{id}/payments/refund` - 申请退款
- 🔄 `POST /api/v1/tenants/{id}/payments/verify` - 验证支付
- 🔄 `POST /api/v1/tenants/{id}/subscriptions` - 创建订阅
- 🔄 `POST /api/v1/tenants/{id}/invoices/generate` - 生成发票
- 🔄 `PUT /api/v1/tenants/{id}/payment-methods/{methodId}` - 更新支付方式
- 🔄 `DELETE /api/v1/tenants/{id}/payment-methods/{methodId}` - 删除支付方式
- 🔄 `DELETE /api/v1/tenants/{id}/subscriptions/{subscriptionId}` - 取消订阅
- 🔄 `PATCH /api/v1/tenants/{id}/subscriptions/{subscriptionId}/status` - 更新订阅状态

### 资源配额管理

- ✅ `GET /api/v1/tenants/{id}/resources` - 获取租户资源
- ✅ `GET /api/v1/tenants/{id}/limits` - 获取租户限制
- ✅ `GET /api/v1/tenants/{id}/features` - 获取租户功能
- ✅ `POST /api/v1/tenants/{id}/resources` - 分配租户资源
- ✅ `PUT /api/v1/tenants/{id}/limits` - 更新租户限制
- ✅ `PUT /api/v1/tenants/{id}/features` - 更新租户功能
- ✅ `DELETE /api/v1/tenants/{id}/resources/{resourceId}` - 移除租户资源
- 🔄 `GET /api/v1/tenants/{id}/quotas` - 获取配额使用情况
- 🔄 `POST /api/v1/tenants/{id}/quotas/alert` - 设置配额告警
- 🔄 `GET /api/v1/tenants/{id}/features/matrix` - 获取功能权限矩阵

### 多云与基础设施

- 🔄 `GET /api/v1/tenants/{id}/multicloud/providers` - 获取云提供商
- 🔄 `GET /api/v1/tenants/{id}/multicloud/resources` - 获取云资源
- 🔄 `GET /api/v1/tenants/{id}/multicloud/costs` - 获取成本分析
- 🔄 `POST /api/v1/tenants/{id}/multicloud/provision` - 资源配置
- 🔄 `POST /api/v1/tenants/{id}/multicloud/migrate` - 资源迁移
- 🔄 `POST /api/v1/tenants/{id}/multicloud/backup` - 跨云备份
- 🔄 `PUT /api/v1/tenants/{id}/multicloud/resources/{id}` - 更新云资源
- 🔄 `DELETE /api/v1/tenants/{id}/multicloud/resources/{id}` - 删除云资源

### 备份恢复管理

- ✅ `GET /api/v1/tenants/{id}/backup` - 获取租户备份
- ✅ `POST /api/v1/tenants/{id}/backup` - 创建租户备份
- 🔄 `GET /api/v1/tenants/{id}/backup/jobs` - 获取备份任务
- 🔄 `GET /api/v1/tenants/{id}/backup/snapshots` - 获取备份快照
- 🔄 `POST /api/v1/tenants/{id}/backup/create` - 创建备份
- 🔄 `POST /api/v1/tenants/{id}/backup/restore` - 恢复备份
- 🔄 `POST /api/v1/tenants/{id}/backup/schedule` - 计划备份
- 🔄 `PUT /api/v1/tenants/{id}/backup/jobs/{id}` - 更新备份任务
- 🔄 `DELETE /api/v1/tenants/{id}/backup/jobs/{id}` - 删除备份任务

### 数据安全与隔离

- ✅ `GET /api/v1/tenants/{id}/audit-logs` - 获取租户审计日志
- 🔄 `GET /api/v1/tenants/{id}/rls/policies` - 获取租户RLS策略
- 🔄 `GET /api/v1/tenants/{id}/rls/status` - 获取RLS状态
- 🔄 `POST /api/v1/tenants/{id}/rls/policies` - 创建RLS策略
- 🔄 `POST /api/v1/tenants/{id}/rls/enable` - 启用租户RLS
- 🔄 `POST /api/v1/tenants/{id}/rls/disable` - 禁用租户RLS
- 🔄 `POST /api/v1/tenants/{id}/rls/validate` - 验证RLS配置
- 🔄 `PUT /api/v1/tenants/{id}/rls/policies/{policyId}` - 更新RLS策略
- 🔄 `DELETE /api/v1/tenants/{id}/rls/policies/{policyId}` - 删除RLS策略

### 集成与定制

- ✅ `GET /api/v1/tenants/{id}/integrations` - 获取租户集成
- ✅ `POST /api/v1/tenants/{id}/integrations` - 添加集成
- ✅ `DELETE /api/v1/tenants/{id}/integrations/{integrationId}` - 删除集成
- 🔄 `GET /api/v1/tenants/{id}/webhooks` - 获取Webhook配置
- 🔄 `POST /api/v1/tenants/{id}/webhooks` - 创建Webhook
- 🔄 `PUT /api/v1/tenants/{id}/webhooks/{id}` - 更新Webhook
- 🔄 `DELETE /api/v1/tenants/{id}/webhooks/{id}` - 删除Webhook
- 🔄 `POST /api/v1/tenants/{id}/webhooks/{id}/test` - 测试Webhook

---

## 6. 消息通知服务 (notification-service)

### 通知基础管理

- ✅ `GET /api/v1/notifications` - 获取通知列表
- ✅ `GET /api/v1/notifications/{id}` - 获取通知详情
- ✅ `GET /api/v1/notifications/history` - 获取通知历史
- ✅ `POST /api/v1/notifications` - 发送通知
- ✅ `POST /api/v1/notifications/broadcast` - 广播通知
- ✅ `PUT /api/v1/notifications/{id}` - 更新通知
- ✅ `DELETE /api/v1/notifications/{id}` - 删除通知
- ✅ `PATCH /api/v1/notifications/{id}/status` - 更新通知状态
- ✅ `PATCH /api/v1/notifications/{id}/read` - 标记通知已读
- 🔄 `POST /api/v1/notifications/bulk` - 批量发送通知
- 🔄 `POST /api/v1/notifications/test` - 测试通知
- 🔄 `PATCH /api/v1/notifications/bulk/read` - 批量标记已读
- 🔧 `GET /api/v1/notifications/health` - 通知服务健康检查

### 发送队列与调度

- 🔄 `GET /api/v1/notifications/queue` - 获取通知队列
- 🔄 `GET /api/v1/notifications/delivery-status` - 获取投递状态
- 🔄 `POST /api/v1/notifications/schedule` - 定时发送通知
- 🔄 `POST /api/v1/notifications/retry` - 重试失败通知
- 🔄 `DELETE /api/v1/notifications/queue/{id}` - 删除队列中的通知
- 🔄 `GET /api/v1/notifications/stats` - 获取通知统计

### 模板管理

- ✅ `GET /api/v1/notifications/templates` - 获取通知模板
- ✅ `POST /api/v1/notifications/templates` - 创建通知模板
- ✅ `PUT /api/v1/notifications/templates/{id}` - 更新通知模板
- ✅ `DELETE /api/v1/notifications/templates/{id}` - 删除通知模板

### 渠道与提供商管理

- ✅ `GET /api/v1/notifications/channels` - 获取通知渠道
- ✅ `POST /api/v1/notifications/channels` - 创建通知渠道
- ✅ `PUT /api/v1/notifications/channels/{id}` - 更新通知渠道
- ✅ `DELETE /api/v1/notifications/channels/{id}` - 删除通知渠道
- 🔄 `GET /api/v1/notifications/providers` - 获取通知提供商
- 🔄 `PUT /api/v1/notifications/providers/{id}` - 更新通知提供商
- 🔄 `PATCH /api/v1/notifications/channels/{id}/status` - 更新渠道状态
- 🔄 `PATCH /api/v1/notifications/providers/{id}/status` - 更新提供商状态

### 用户订阅管理

- ✅ `GET /api/v1/notifications/preferences` - 获取通知偏好
- ✅ `PUT /api/v1/notifications/preferences` - 更新通知偏好
- ✅ `POST /api/v1/notifications/subscribe` - 订阅通知
- ✅ `POST /api/v1/notifications/unsubscribe` - 取消订阅
- 🔄 `GET /api/v1/notifications/subscriptions` - 获取订阅列表
- 🔄 `DELETE /api/v1/notifications/subscriptions/{id}` - 删除订阅

### 邮件通知

- 🔄 `POST /api/v1/notifications/email/send` - 发送邮件
- 🔄 `POST /api/v1/notifications/email/send-batch` - 批量发送邮件
- 🔄 `GET /api/v1/notifications/email/templates` - 获取邮件模板
- 🔄 `POST /api/v1/notifications/email/templates` - 创建邮件模板
- 🔄 `PUT /api/v1/notifications/email/templates/{id}` - 更新邮件模板
- 🔄 `DELETE /api/v1/notifications/email/templates/{id}` - 删除邮件模板
- 🔄 `GET /api/v1/notifications/email/campaigns` - 获取邮件活动
- 🔄 `POST /api/v1/notifications/email/campaigns` - 创建邮件活动
- 🔄 `PATCH /api/v1/notifications/email/campaigns/{id}/status` - 更新邮件活动状态
- 🔄 `GET /api/v1/notifications/email/analytics` - 获取邮件统计

### 短信通知

- 🔄 `POST /api/v1/notifications/sms/send` - 发送短信
- 🔄 `POST /api/v1/notifications/sms/verify` - 发送验证码
- 🔄 `GET /api/v1/notifications/sms/templates` - 获取短信模板
- 🔄 `POST /api/v1/notifications/sms/templates` - 创建短信模板
- 🔄 `PUT /api/v1/notifications/sms/templates/{id}` - 更新短信模板
- 🔄 `DELETE /api/v1/notifications/sms/templates/{id}` - 删除短信模板
- 🔄 `GET /api/v1/notifications/sms/providers` - 获取短信提供商

### 推送通知

- 🔄 `POST /api/v1/notifications/push/send` - 发送推送
- 🔄 `POST /api/v1/notifications/push/subscribe` - 订阅推送
- 🔄 `GET /api/v1/notifications/push/devices` - 获取推送设备
- 🔄 `POST /api/v1/notifications/push/devices/register` - 注册推送设备
- 🔄 `DELETE /api/v1/notifications/push/devices/{id}` - 删除推送设备
- 🔄 `GET /api/v1/notifications/push/subscriptions` - 获取推送订阅

### Webhook通知渠道

- 🔄 `GET /api/v1/notifications/webhooks` - 获取通知Webhook
- 🔄 `POST /api/v1/notifications/webhooks` - 创建Webhook
- 🔄 `PUT /api/v1/notifications/webhooks/{id}` - 更新Webhook
- 🔄 `DELETE /api/v1/notifications/webhooks/{id}` - 删除Webhook

### 语音通知

- 🔄 `POST /api/v1/notifications/voice/send` - 发送语音通知
- 🔄 `POST /api/v1/notifications/voice/text-to-speech` - 文字转语音
- 🔄 `POST /api/v1/notifications/voice/speech-to-text` - 语音转文字
- 🔄 `POST /api/v1/notifications/voice/synthesis` - 语音合成
- 🔄 `POST /api/v1/notifications/voice/recognition` - 语音识别
- 🔄 `POST /api/v1/notifications/voice/analyze` - 语音分析
- 🔄 `GET /api/v1/notifications/voice/recordings` - 获取录音列表
- 🔄 `GET /api/v1/notifications/voice/transcripts` - 获取转录文本
- 🔄 `GET /api/v1/notifications/voice/models` - 获取语音模型
- 🔄 `PUT /api/v1/notifications/voice/models/{id}` - 更新语音模型
- 🔄 `DELETE /api/v1/notifications/voice/recordings/{id}` - 删除录音

---

## 7. 文件存储服务 (file-storage-service)

### 文件基础管理
- ✅ `GET /api/v1/files` - 获取文件列表
- ✅ `GET /api/v1/files/{id}` - 获取文件详情
- ✅ `GET /api/v1/files/{id}/download` - 下载文件
- ✅ `GET /api/v1/files/{id}/preview` - 预览文件
- ✅ `GET /api/v1/files/recent` - 获取最近文件
- ✅ `GET /api/v1/files/trash` - 获取回收站文件
- ✅ `GET /api/v1/files/storage/usage` - 获取存储使用情况
- ✅ `POST /api/v1/files/upload` - 上传文件
- ✅ `POST /api/v1/files/upload/chunk` - 分块上传
- ✅ `POST /api/v1/files/{id}/copy` - 复制文件
- ✅ `POST /api/v1/files/{id}/move` - 移动文件
- ✅ `POST /api/v1/files/{id}/restore` - 恢复文件
- ✅ `PUT /api/v1/files/{id}` - 更新文件信息
- ✅ `PUT /api/v1/files/{id}/content` - 更新文件内容
- ✅ `PUT /api/v1/files/{id}/permissions` - 更新文件权限
- ✅ `DELETE /api/v1/files/{id}` - 删除文件
- ✅ `DELETE /api/v1/files/{id}/permanent` - 永久删除文件
- ✅ `DELETE /api/v1/files/trash/empty` - 清空回收站
- ✅ `PATCH /api/v1/files/{id}/rename` - 重命名文件
- ✅ `PATCH /api/v1/files/{id}/favorite` - 收藏/取消收藏文件
- ✅ `PATCH /api/v1/files/{id}/lock` - 锁定/解锁文件
- 🔄 `GET /api/v1/files/stats` - 获取文件统计
- 🔄 `GET /api/v1/files/versions/{id}` - 获取文件版本
- 🔄 `GET /api/v1/files/permissions/{id}` - 获取文件权限
- 🔄 `GET /api/v1/files/search` - 搜索文件
- 🔄 `GET /api/v1/files/thumbnails/{id}` - 获取文件缩略图
- 🔄 `GET /api/v1/files/metadata/{id}` - 获取文件元数据
- 🔄 `POST /api/v1/files/bulk/upload` - 批量上传
- 🔄 `POST /api/v1/files/bulk/delete` - 批量删除
- 🔄 `POST /api/v1/files/bulk/move` - 批量移动
- 🔄 `POST /api/v1/files/zip` - 压缩文件
- 🔄 `POST /api/v1/files/unzip` - 解压文件
- 🔄 `POST /api/v1/files/sync` - 同步文件
- 🔄 `POST /api/v1/files/backup` - 备份文件
- 🔄 `PUT /api/v1/files/{id}/metadata` - 更新文件元数据
- 🔄 `PUT /api/v1/files/{id}/tags` - 更新文件标签
- 🔄 `PUT /api/v1/files/{id}/description` - 更新文件描述
- 🔄 `DELETE /api/v1/files/versions/{id}` - 删除文件版本
- 🔄 `DELETE /api/v1/files/thumbnails/{id}` - 删除缩略图
- 🔄 `PATCH /api/v1/files/{id}/visibility` - 更新文件可见性
- 🔄 `PATCH /api/v1/files/{id}/expiry` - 更新文件过期时间
- 🔧 `GET /api/v1/files/health` - 文件服务健康检查

### 文件夹管理
- ✅ `GET /api/v1/files/folders` - 获取文件夹列表
- ✅ `GET /api/v1/files/folders/{id}` - 获取文件夹详情
- ✅ `POST /api/v1/files/folders` - 创建文件夹
- ✅ `PUT /api/v1/files/folders/{id}` - 更新文件夹
- ✅ `DELETE /api/v1/files/folders/{id}` - 删除文件夹
- 🔄 `PATCH /api/v1/files/folders/{id}/color` - 更新文件夹颜色

### 文件共享
- ✅ `GET /api/v1/files/shared` - 获取共享文件
- ✅ `POST /api/v1/files/{id}/share` - 分享文件
- ✅ `POST /api/v1/files/{id}/unshare` - 取消分享
- 🔄 `DELETE /api/v1/files/shared/{id}` - 删除共享链接

### 图像处理
- 🔄 `GET /api/v1/files/images/{id}` - 获取图像信息
- 🔄 `GET /api/v1/files/images/{id}/metadata` - 获取图像元数据
- 🔄 `POST /api/v1/files/images/resize` - 调整图像大小
- 🔄 `POST /api/v1/files/images/crop` - 裁剪图像
- 🔄 `POST /api/v1/files/images/filter` - 图像滤镜
- 🔄 `POST /api/v1/files/images/ocr` - 图像文字识别
- 🔄 `POST /api/v1/files/images/compress` - 压缩图像

### 文档转换
- 🔄 `GET /api/v1/files/conversion/jobs` - 获取转换任务
- 🔄 `GET /api/v1/files/conversion/formats` - 获取支持格式
- 🔄 `POST /api/v1/files/conversion/convert` - 转换文档
- 🔄 `POST /api/v1/files/conversion/pdf/merge` - 合并PDF
- 🔄 `POST /api/v1/files/conversion/pdf/split` - 拆分PDF

### 二维码生成
- 🔄 `GET /api/v1/files/qr/codes` - 获取二维码列表
- 🔄 `POST /api/v1/files/qr/generate` - 生成二维码
- 🔄 `POST /api/v1/files/qr/decode` - 解码二维码
- 🔄 `POST /api/v1/files/qr/batch` - 批量生成二维码

### 代码生成
- 🔄 `GET /api/v1/files/codegen/templates` - 获取代码模板
- 🔄 `GET /api/v1/files/codegen/languages` - 获取支持语言
- 🔄 `GET /api/v1/files/codegen/projects` - 获取生成项目
- 🔄 `POST /api/v1/files/codegen/generate` - 生成代码
- 🔄 `POST /api/v1/files/codegen/scaffold` - 生成脚手架
- 🔄 `POST /api/v1/files/codegen/api/from-schema` - 从 Schema生成API
- 🔄 `POST /api/v1/files/codegen/docs` - 生成文档
- 🔄 `PUT /api/v1/files/codegen/templates/{id}` - 更新代码模板
- 🔄 `DELETE /api/v1/files/codegen/templates/{id}` - 删除代码模板

---

## 8. 监控告警服务 (monitoring-service)

### 基础监控管理
- ✅ `GET /api/v1/monitoring/metrics` - 获取系统指标
- ✅ `GET /api/v1/monitoring/performance` - 获取性能数据
- ✅ `GET /api/v1/monitoring/uptime` - 获取运行时间
- ✅ `GET /api/v1/monitoring/resources` - 获取资源使用情况
- ✅ `POST /api/v1/monitoring/metrics/custom` - 自定义指标
- 🔄 `GET /api/v1/monitoring/capacity` - 获取容量规划
- 🔄 `GET /api/v1/monitoring/traces` - 获取链路追踪
- 🔄 `DELETE /api/v1/monitoring/metrics/{id}` - 删除自定义指标
- 🔧 `GET /api/v1/monitoring/health` - 监控服务健康检查

### 服务状态监控
- ✅ `GET /api/v1/monitoring/services` - 获取服务状态
- ✅ `PATCH /api/v1/monitoring/services/{id}/status` - 更新服务状态
- 🔄 `GET /api/v1/monitoring/dependencies` - 获取服务依赖
- 🔄 `GET /api/v1/monitoring/sla` - 获取SLA数据

### 告警管理
- ✅ `GET /api/v1/monitoring/alerts` - 获取告警信息
- ✅ `POST /api/v1/monitoring/alerts` - 创建告警规则
- ✅ `PUT /api/v1/monitoring/alerts/{id}` - 更新告警规则
- ✅ `DELETE /api/v1/monitoring/alerts/{id}` - 删除告警规则
- ✅ `PATCH /api/v1/monitoring/alerts/{id}/status` - 更新告警状态
- ✅ `PUT /api/v1/monitoring/thresholds/{id}` - 更新告警阈值
- 🔄 `GET /api/v1/monitoring/thresholds` - 获取告警阈值
- 🔄 `PATCH /api/v1/monitoring/alerts/{id}/acknowledge` - 确认告警
- 🔄 `PATCH /api/v1/monitoring/alerts/{id}/silence` - 静默告警

### 事件管理
- ✅ `POST /api/v1/monitoring/incidents` - 创建故障事件
- ✅ `DELETE /api/v1/monitoring/incidents/{id}` - 删除故障事件
- ✅ `PATCH /api/v1/monitoring/incidents/{id}/status` - 更新事件状态
- 🔄 `GET /api/v1/monitoring/incidents` - 获取故障事件
- 🔄 `PUT /api/v1/monitoring/incidents/{id}` - 更新故障事件

### 面板管理
- ✅ `GET /api/v1/monitoring/dashboards` - 获取监控面板
- ✅ `POST /api/v1/monitoring/dashboards` - 创建监控面板
- ✅ `PUT /api/v1/monitoring/dashboards/{id}` - 更新监控面板
- ✅ `DELETE /api/v1/monitoring/dashboards/{id}` - 删除监控面板

### 日志管理
- ✅ `GET /api/v1/monitoring/logs` - 获取系统日志
- 🔄 `GET /api/v1/monitoring/logs/search` - 搜索日志
- 🔄 `GET /api/v1/monitoring/logs/streams` - 获取日志流
- 🔄 `GET /api/v1/monitoring/logs/analytics` - 获取日志分析
- 🔄 `POST /api/v1/monitoring/logs/ingest` - 接收日志数据
- 🔄 `POST /api/v1/monitoring/logs/alerts` - 创建日志告警

### 异常检测
- 🔄 `GET /api/v1/monitoring/anomaly/detections` - 获取异常检测结果
- 🔄 `GET /api/v1/monitoring/anomaly/models` - 获取异常检测模型
- 🔄 `GET /api/v1/monitoring/anomaly/baselines` - 获取异常检测基线
- 🔄 `POST /api/v1/monitoring/anomaly/detect` - 执行异常检测
- 🔄 `POST /api/v1/monitoring/anomaly/train` - 训练异常检测模型
- 🔄 `POST /api/v1/monitoring/anomaly/alert` - 创建异常告警

### 容器编排监控
- 🔄 `GET /api/v1/monitoring/orchestration/pods` - 获取Pod列表
- 🔄 `GET /api/v1/monitoring/orchestration/services` - 获取服务列表
- 🔄 `GET /api/v1/monitoring/orchestration/deployments` - 获取部署列表
- 🔄 `GET /api/v1/monitoring/orchestration/nodes` - 获取节点信息
- 🔄 `POST /api/v1/monitoring/orchestration/deploy` - 部署应用
- 🔄 `POST /api/v1/monitoring/orchestration/scale` - 扩缩容
- 🔄 `POST /api/v1/monitoring/orchestration/rollback` - 回滚部署
- 🔄 `PUT /api/v1/monitoring/orchestration/deployments/{id}` - 更新部署
- 🔄 `DELETE /api/v1/monitoring/orchestration/pods/{id}` - 删除Pod

### 构建管道监控
- 🔄 `GET /api/v1/monitoring/pipelines` - 获取管道列表
- 🔄 `GET /api/v1/monitoring/pipelines/{id}/builds` - 获取构建历史
- 🔄 `GET /api/v1/monitoring/pipelines/{id}/artifacts` - 获取构建产物
- 🔄 `GET /api/v1/monitoring/pipelines/templates` - 获取管道模板
- 🔄 `POST /api/v1/monitoring/pipelines` - 创建管道
- 🔄 `POST /api/v1/monitoring/pipelines/{id}/trigger` - 触发构建
- 🔄 `POST /api/v1/monitoring/pipelines/{id}/abort` - 中止构建
- 🔄 `PUT /api/v1/monitoring/pipelines/{id}` - 更新管道
- 🔄 `DELETE /api/v1/monitoring/pipelines/{id}` - 删除管道

### 报告管理
- 🔄 `GET /api/v1/monitoring/reports` - 获取监控报告
- 🔄 `POST /api/v1/monitoring/reports/generate` - 生成监控报告
- 🔄 `POST /api/v1/monitoring/export` - 导出监控数据

### 维护管理
- 🔄 `POST /api/v1/monitoring/maintenance` - 创建维护窗口
- 🔄 `PUT /api/v1/monitoring/maintenance/{id}` - 更新维护窗口
- 🔄 `DELETE /api/v1/monitoring/maintenance/{id}` - 删除维护窗口
- 🔄 `PATCH /api/v1/monitoring/maintenance/{id}/status` - 更新维护状态

### 集成与配置管理
- 🔄 `POST /api/v1/monitoring/webhooks` - 创建监控Webhook
- 🔄 `DELETE /api/v1/monitoring/webhooks/{id}` - 删除Webhook
- 🔄 `POST /api/v1/monitoring/tests` - 创建监控测试
- 🔄 `POST /api/v1/monitoring/snapshots` - 创建监控快照
- 🔄 `PUT /api/v1/monitoring/config` - 更新监控配置

---

## 9. 日志审计服务 (audit-service)

### 审计日志管理
- ✅ `GET /api/v1/audit/logs` - 获取审计日志
- ✅ `GET /api/v1/audit/events` - 获取审计事件
- ✅ `POST /api/v1/audit/events` - 记录审计事件
- ✅ `DELETE /api/v1/audit/events/{id}` - 删除审计事件
- ✅ `PATCH /api/v1/audit/events/{id}/status` - 更新事件状态
- 🔄 `GET /api/v1/audit/search` - 搜索审计记录
- 🔄 `POST /api/v1/audit/search/advanced` - 高级搜索
- 🔄 `GET /api/v1/audit/trends` - 获取审计趋势
- 🔄 `GET /api/v1/audit/categories` - 获取审计分类
- 🔧 `GET /api/v1/audit/health` - 审计服务健康检查

### 用户活动追踪
- ✅ `GET /api/v1/audit/users/{id}/activities` - 获取用户活动
- ✅ `GET /api/v1/audit/sessions` - 获取会话审计
- ✅ `GET /api/v1/audit/resources/{id}/history` - 获取资源变更历史

### 合规管理
- ✅ `GET /api/v1/audit/compliance` - 获取合规报告
- ✅ `POST /api/v1/audit/compliance/check` - 合规检查
- 🔄 `GET /api/v1/audit/violations` - 获取违规记录
- 🔄 `PATCH /api/v1/audit/violations/{id}/resolve` - 解决违规
- 🔄 `POST /api/v1/audit/validate` - 验证审计完整性

### 报告管理
- ✅ `GET /api/v1/audit/reports` - 获取审计报告
- ✅ `POST /api/v1/audit/reports/generate` - 生成审计报告
- ✅ `DELETE /api/v1/audit/reports/{id}` - 删除审计报告
- ✅ `PATCH /api/v1/audit/reports/{id}/status` - 更新报告状态
- ✅ `GET /api/v1/audit/statistics` - 获取审计统计
- 🔄 `GET /api/v1/audit/templates` - 获取报告模板
- ✅ `PUT /api/v1/audit/templates/{id}` - 更新报告模板
- 🔄 `POST /api/v1/audit/templates` - 创建报告模板
- 🔄 `DELETE /api/v1/audit/templates/{id}` - 删除报告模板

### 数据导出管理
- ✅ `POST /api/v1/audit/export` - 导出审计数据
- ✅ `DELETE /api/v1/audit/exports/{id}` - 删除导出记录
- 🔄 `GET /api/v1/audit/exports` - 获取导出记录

### 策略管理
- ✅ `PUT /api/v1/audit/policies/{id}` - 更新审计策略
- 🔄 `GET /api/v1/audit/policies` - 获取审计策略
- 🔄 `POST /api/v1/audit/policies` - 创建审计策略
- 🔄 `DELETE /api/v1/audit/policies/{id}` - 删除审计策略
- 🔄 `PATCH /api/v1/audit/policies/{id}/status` - 更新策略状态

### 数据保留管理
- ✅ `PUT /api/v1/audit/retention/{id}` - 更新保留策略
- 🔄 `GET /api/v1/audit/retention` - 获取保留策略
- 🔄 `POST /api/v1/audit/retention/apply` - 应用保留策略
- 🔄 `POST /api/v1/audit/archive` - 归档审计数据
- 🔄 `POST /api/v1/audit/restore` - 恢复审计数据
- 🔄 `DELETE /api/v1/audit/archived/{id}` - 删除归档数据

### 告警管理
- 🔄 `POST /api/v1/audit/alerts` - 创建审计告警
- 🔄 `PUT /api/v1/audit/alerts/{id}` - 更新审计告警
- 🔄 `DELETE /api/v1/audit/alerts/{id}` - 删除审计告警
- 🔄 `PATCH /api/v1/audit/alerts/{id}/acknowledge` - 确认告警
- 🔄 `POST /api/v1/audit/notifications` - 创建审计通知

### 面板管理
- 🔄 `GET /api/v1/audit/dashboards` - 获取审计面板
- 🔄 `POST /api/v1/audit/dashboards` - 创建审计面板
- 🔄 `PUT /api/v1/audit/dashboards/{id}` - 更新审计面板
- 🔄 `DELETE /api/v1/audit/dashboards/{id}` - 删除审计面板
- 🔄 `PATCH /api/v1/audit/dashboards/{id}/visibility` - 更新面板可见性
- 🔄 `PUT /api/v1/audit/config` - 更新审计配置

### 数据同步集成
- 🔄 `GET /api/v1/audit/sync/sources` - 获取数据源列表
- 🔄 `GET /api/v1/audit/sync/mappings` - 获取数据映射配置
- 🔄 `GET /api/v1/audit/sync/status` - 获取同步状态
- 🔄 `GET /api/v1/audit/sync/conflicts` - 获取同步冲突
- 🔄 `GET /api/v1/audit/sync/logs` - 获取同步日志
- 🔄 `POST /api/v1/audit/sync/sources` - 添加数据源
- 🔄 `POST /api/v1/audit/sync/mappings` - 创建数据映射
- 🔄 `POST /api/v1/audit/sync/start` - 启动数据同步
- 🔄 `POST /api/v1/audit/sync/pause` - 暂停数据同步
- 🔄 `POST /api/v1/audit/sync/resume` - 恢复数据同步
- 🔄 `POST /api/v1/audit/sync/conflicts/resolve` - 解决同步冲突
- 🔄 `PUT /api/v1/audit/sync/sources/{id}` - 更新数据源
- 🔄 `PUT /api/v1/audit/sync/mappings/{id}` - 更新数据映射
- 🔄 `DELETE /api/v1/audit/sync/sources/{id}` - 删除数据源
- 🔄 `DELETE /api/v1/audit/sync/mappings/{id}` - 删除数据映射
- 🔄 `PATCH /api/v1/audit/sync/sources/{id}/status` - 更新数据源状态
- 🔄 `PATCH /api/v1/audit/sync/mappings/{id}/status` - 更新映射状态

### RLS审计模块
- 🔄 `GET /api/v1/audit/rls/events` - 获取RLS审计事件
- 🔄 `GET /api/v1/audit/rls/violations` - 获取RLS违规记录
- 🔄 `POST /api/v1/audit/rls/reports/generate` - 生成RLS合规报告
- 🔄 `GET /api/v1/audit/rls/compliance` - 获取RLS合规状态

---

## 10. 任务调度服务 (scheduler-service)

### 任务定义管理
- 🔄 `GET /api/v1/scheduler/jobs` - 获取定时任务列表
- 🔄 `GET /api/v1/scheduler/jobs/{id}` - 获取任务详情
- 🔄 `POST /api/v1/scheduler/jobs` - 创建定时任务
- 🔄 `PUT /api/v1/scheduler/jobs/{id}` - 更新定时任务
- 🔄 `DELETE /api/v1/scheduler/jobs/{id}` - 删除定时任务

### 任务执行控制
- 🔄 `POST /api/v1/scheduler/jobs/{id}/start` - 启动任务
- 🔄 `POST /api/v1/scheduler/jobs/{id}/pause` - 暂停任务
- 🔄 `POST /api/v1/scheduler/jobs/{id}/resume` - 恢复任务
- 🔄 `POST /api/v1/scheduler/jobs/{id}/trigger` - 手动触发任务

### 执行历史查询
- 🔄 `GET /api/v1/scheduler/executions` - 获取执行历史
- 🔄 `GET /api/v1/scheduler/executions/{id}` - 获取执行详情
- 🔄 `GET /api/v1/scheduler/jobs/{jobId}/executions` - 获取任务执行历史

### 调度器管理
- 🔧 `GET /api/v1/scheduler/status` - 获取调度器状态
- 🔧 `POST /api/v1/scheduler/start` - 启动调度器
- 🔧 `POST /api/v1/scheduler/shutdown` - 关闭调度器

### 健康检查
- 🔧 `GET /api/v1/scheduler/health` - 服务健康检查

---

## 11. 消息队列服务 (message-queue-service)

### 队列管理
- 🔄 `GET /api/v1/mq/queues` - 获取队列列表
- 🔄 `GET /api/v1/mq/queues/{name}` - 获取队列详情
- 🔄 `POST /api/v1/mq/queues` - 创建队列
- 🔄 `DELETE /api/v1/mq/queues/{name}` - 删除队列

### 消息操作
- 🔄 `POST /api/v1/mq/messages/send` - 发送消息
- 🔄 `GET /api/v1/mq/messages/receive` - 接收消息
- 🔄 `POST /api/v1/mq/messages/ack` - 确认消息处理
- 🔄 `POST /api/v1/mq/messages/nack` - 拒绝消息

### 交换器管理
- 🔄 `GET /api/v1/mq/exchanges` - 获取交换器列表
- 🔄 `POST /api/v1/mq/exchanges` - 创建交换器
- 🔄 `POST /api/v1/mq/bindings` - 创建队列绑定

### 监控统计
- 🔄 `GET /api/v1/mq/stats/queues` - 获取队列统计
- 🔄 `GET /api/v1/mq/stats/messages` - 获取消息统计
- 🔄 `GET /api/v1/mq/stats/consumers` - 获取消费者统计

### 健康检查
- 🔧 `GET /api/v1/mq/health` - 服务健康检查

---

## 12. 缓存服务 (cache-service)

### 缓存基础操作
- 🔄 `GET /api/v1/cache/keys/{key}` - 获取缓存值
- 🔄 `PUT /api/v1/cache/keys/{key}` - 设置缓存值
- 🔄 `DELETE /api/v1/cache/keys/{key}` - 删除缓存
- 🔄 `POST /api/v1/cache/keys/{key}/expire` - 设置过期时间
- 🔄 `GET /api/v1/cache/keys/{key}/ttl` - 获取剩余时间
- 🔄 `POST /api/v1/cache/keys/{key}/touch` - 更新访问时间
- 🔄 `POST /api/v1/cache/keys/exists` - 检查键是否存在

### 集群管理
- 🔄 `GET /api/v1/cache/cluster/nodes` - 获取集群节点状态
- 🔄 `GET /api/v1/cache/cluster/slots` - 获取集群插槽分布
- 🔄 `POST /api/v1/cache/cluster/failover` - 执行故障转移
- 🔄 `GET /api/v1/cache/cluster/replication` - 获取复制状态
- 🔄 `POST /api/v1/cache/cluster/reshard` - 重新分片
- 🔄 `GET /api/v1/cache/cluster/health` - 集群健康检查

### 性能优化
- 🔄 `GET /api/v1/cache/connections` - 获取连接池状态
- 🔄 `PUT /api/v1/cache/connections/config` - 配置连接池参数
- 🔄 `POST /api/v1/cache/preload` - 预加载数据
- 🔄 `GET /api/v1/cache/hotkeys` - 获取热点键统计
- 🔄 `POST /api/v1/cache/compress/{key}` - 压缩特定键值
- 🔄 `GET /api/v1/cache/memory/analyze` - 内存使用分析
- 🔄 `POST /api/v1/cache/eviction/policy` - 设置淘汰策略

### 监控与统计
- 🔄 `GET /api/v1/cache/stats` - 获取缓存统计
- 🔄 `GET /api/v1/cache/metrics` - 获取性能指标
- 🔄 `GET /api/v1/cache/info` - 获取缓存信息
- 🔄 `GET /api/v1/cache/memory` - 内存使用情况
- 🔄 `GET /api/v1/cache/performance` - 性能分析报告
- 🔄 `GET /api/v1/cache/latency` - 延迟统计
- 🔄 `GET /api/v1/cache/throughput` - 吞吐量监控

### 健康检查
- 🔧 `GET /api/v1/cache/health` - 服务健康检查
- 🔧 `GET /api/v1/cache/ping` - 连接性检查
- 🔧 `GET /api/v1/cache/status` - 服务状态

---

## API 端点统计

### 12个核心服务端点统计
- **API网关服务**: 70个端点 (按功能模块组织)
- **认证服务**: 60个端点 (专注身份验证，按功能模块组织)
- **权限管理服务**: 36个端点 (独立RBAC服务)
- **用户管理服务**: 57个端点 (移除权限相关端点)
- **租户管理服务**: 57个端点
- **通知服务**: 64个端点
- **文件存储服务**: 66个端点
- **监控服务**: 55个端点
- **审计服务**: 52个端点
- **任务调度服务**: 16个端点
- **消息队列服务**: 15个端点
- **缓存服务**: 31个端点

**核心服务总计**: 579个端点

### 扩展服务文档

本文档专注于12个核心微服务的API端点定义。19个扩展服务的详细API端点已单独整理，请参考：

📋 **[扩展微服务 API 端点文档](./EXTENDED-SERVICES-API-ENDPOINTS.md)**

包含以下扩展服务：
- **业务功能服务** (8个): 工作流引擎、搜索、CMS、AI/ML、聊天通信、客服支持、知识库、表单构建
- **扩展业务服务** (6个): 报表分析、直播、电商、视频会议、地理位置、区块链
- **数据处理服务** (4个): 数据湖、ETL、IoT设备管理、边缘计算
- **基础设施服务** (1个): 安全威胁检测

### 核心服务端点统计

- **总端点数**: 561个
- **服务数量**: 12个核心微服务

**核心服务说明**:
1. **服务职责分离**: 将认证(Authentication)和授权(Authorization)分离为独立服务
2. **功能模块组织**: 端点按功能模块而非HTTP方法组织，符合实际开发结构
3. **完整基础设施**: 包含了任务调度、消息队列、缓存等必需的基础设施服务
4. **专注核心功能**: 核心服务只包含平台运行的必需功能，保持精简高效

---

## API 设计规范

### 1. 命名约定

- 使用 RESTful 风格的 URL 设计
- 资源名称使用复数形式
- 使用连字符分隔多个单词
- 版本号使用 v1、v2 等格式

### 2. HTTP 状态码

- 200: 成功
- 201: 创建成功
- 400: 请求错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 500: 服务器错误

### 3. 响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4. 错误处理

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": []
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 5. 认证机制

- 使用 JWT Bearer Token
- 支持 OAuth 2.0
- 实现 API Key 认证
- 支持双因子认证

### 6. 限流策略

- IP 限流：每分钟 100 次请求
- 用户限流：每分钟 1000 次请求
- API 限流：根据不同端点设置不同限制

---

## 核心服务开发优先级

### Phase 1: 核心基础服务 (必须实现)

1. **API网关服务** (api-gateway-service) - 系统统一入口
2. **认证授权服务** (auth-service) - 身份认证基础
3. **权限管理服务** (rbac-service) - 访问授权控制
4. **用户管理服务** (user-management-service) - 用户生命周期管理

### Phase 2: 核心功能服务 (高优先级)

1. **多租户管理服务** (tenant-management-service) - 多租户支持
2. **消息通知服务** (notification-service) - 多渠道消息推送
3. **文件存储服务** (file-storage-service) - 文件上传和管理
4. **监控告警服务** (monitoring-service) - 系统监控和指标
5. **日志审计服务** (audit-service) - 操作日志和审计追踪

### 扩展服务开发

扩展服务的开发优先级和详细规划请参考：

📋 **[扩展微服务 API 端点文档](./EXTENDED-SERVICES-API-ENDPOINTS.md)**

---

## 后续开发计划

1. **架构设计阶段**
   - 完善微服务架构设计
   - 确定技术栈选型
   - 设计数据库模型

2. **开发实施阶段**
   - 按优先级逐步开发各服务
   - 实现API端点功能
   - 编写单元测试和集成测试

3. **部署运维阶段**
   - 容器化部署
   - 监控告警配置
   - 性能优化调优

4. **持续改进阶段**
   - 功能迭代升级
   - 性能监控优化
   - 安全加固增强
