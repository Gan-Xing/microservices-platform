# 思维协议

Claude必须在每次交互前进行深入的思考。

## 基本原则
- 使用 ```thinking 代码块进行思考
- 思考过程要自然、有机，像内在独白
- 避免机械化的列表格式
- 思考要流畅地在想法间跳跃
- 根据问题复杂性调整思考深度

## 核心思考流程
1. **初始理解**: 重新表述问题，形成初步印象，考虑背景
2. **问题分析**: 分解任务组件，识别需求和约束
3. **多假设生成**: 考虑多种解释和方法，保持开放性
4. **自然发现**: 从显而易见的开始，发现模式，质疑假设
5. **验证测试**: 质疑自己的假设，寻找漏洞，考虑替代观点
6. **知识综合**: 连接信息片段，构建连贯图景

## 思考特征
- **自然语言**: 使用"嗯...","这很有趣因为...","等一下..."等自然表达
- **渐进理解**: 从基本观察到深入洞察的自然发展
- **真实流动**: 想法间的自然过渡和深度递进
- **处理复杂性**: 自然地承认复杂性，系统性分解

## 质量控制
- 定期验证结论与证据的一致性
- 检查逻辑一致性和完整性
- 避免过早结论和未经审查的假设
- 根据查询重要性平衡深度与效率

## 重要提醒
- 思考过程必须全面深入
- 感觉自然、真实、非强制
- 禁止使用 `<thinking>` 格式
- 思考中不能包含三个反引号的代码块
- 思考与最终回应要分离
- 在所有语言和模态中遵循此协议

# 企业级微服务平台项目目标

## 🎯 项目目标

### 最终愿景
构建一个**企业级微服务平台生态系统**，解决云服务和SaaS公司重复开发基础功能的痛点。

### 标准版本目标（当前阶段）
- **规模**: 100租户，10万用户
- **时间**: 4周完成所有12个基础服务
- **复杂度**: 适合此规模的技术栈，使用PostgreSQL+Redis+Docker Compose
- **部署**: Docker Compose，单机或8GB内存集群（不使用K8S）

## 核心目标

### 1. 解决重复开发问题
- 消除"重复造轮子"：提供12个核心微服务即插即用
- 避免每个客户项目都要重新开发用户系统、认证、权限管理等基础功能
- 实现可复用的微服务平台基础设施

### 2. 提升开发效率
- 几小时内完成基础功能搭建
- 项目交付周期缩短60%
- 支持即插即用的服务模块
- 团队可并行开发多个项目

### 3. 实现商业价值转化
- 从内部效率工具演进为可销售的企业级产品
- 支持SaaS服务、白标方案、应用商店等多种变现模式
- 支持按量计费、订阅模式、授权费用等多种收费方式

## 技术目标

### 标准版本性能指标
- 支持10万活跃用户
- 支持100个租户
- 支持1000 QPS
- 99%可用性
- P95响应时间 < 100ms
- 内存需求: 8GB

### 架构规模
- **核心微服务**: 12个核心服务已完成开发文档
- **扩展服务**: 19个扩展服务按需实现
- **支持数据存储**: TB级数据处理能力（适合10万用户规模）
- **Nx Monorepo架构**: TypeScript + NestJS 技术栈

## 当前项目状态

### 12个核心微服务 (端口 3000-3011)

#### 标准版本开发顺序:

**Week 1: 基础服务**
1. **用户管理服务** (3003) - 最简单，仅PostgreSQL ⭐
2. **认证授权服务** (3001) - JWT认证 ⭐⭐
3. **权限管理服务** (3002) - 完整RBAC ⭐⭐
4. **缓存服务** (3011) - Redis键值存储 ⭐⭐

**Week 2: 业务服务**
5. **多租户管理服务** (3004) - 租户隔离 ⭐⭐⭐
6. **API网关服务** (3000) - 路由转发 ⭐⭐⭐
7. **审计服务** (3008) - 操作日志 ⭐⭐⭐

**Week 3-4: 扩展服务**
8. **消息通知服务** (3005) - 邮件通知 ⭐⭐⭐⭐
9. **任务调度服务** (3009) - Cron任务 ⭐⭐⭐⭐
10. **文件存储服务** (3006) - S3上传 ⭐⭐⭐⭐
11. **消息队列服务** (3010) - Redis Streams ⭐⭐⭐⭐
12. **监控服务** (3007) - 基础指标 ⭐⭐⭐⭐⭐

### 标准版本技术栈
- **Nx Monorepo**: 统一代码库管理
- **TypeScript + NestJS**: 所有服务统一框架
- **共享库**: @platform/shared, @platform/common
- **基础存储**: 
  - PostgreSQL (1个实例，所有服务共享)
  - Redis (1个实例，用于session和缓存)
  - MinIO/S3 (可选，文件存储)
- **部署方式**: Docker Compose（推荐，不使用K8S）
- **标准版本性能**: 10万用户，1000 QPS

### 标准版本重要特性
✅ **标准版本技术选型优化**：
- **最简单**: 用户服务 (仅PostgreSQL)
- **最复杂**: 监控服务 (PostgreSQL+Prometheus+Grafana)
- **服务松耦合**: 所有服务通过API网关通信
- **不用K8S**: 使用Docker Compose，避免过度复杂
- **不用Kafka**: 使用Redis Streams满足消息队列需求
- **不用ES**: 使用PostgreSQL全文搜索

## 牢记使命
这个平台的最终愿景是成为企业级微服务领域的"基础设施即服务"解决方案，既提升内部开发效率，又创造可持续的商业价值！每次交互都要以这个宏大目标为指引。

# 开发指南

## 重要文档参考
- **DEVELOPMENT_ROADMAP.md**: 开发优先级和依赖关系
- **SERVICE_FUNCTIONS_LIST.md**: 12个服务完整功能清单
- **API-ENDPOINTS.md**: 所有API端点文档 (433个端点)
- **SERVICE_INTERACTION_SPEC.md**: 服务间交互规范

## 开发命令 (Nx Monorepo)
```bash
# 启动服务
nx serve <service-name>

# 构建服务
nx build <service-name>

# 运行测试
nx test <service-name>

# 生成新服务
nx generate @nx/nest:application <service-name>
```

## 标准版本开发原则
1. **从用户服务开始**: 最简单的CRUD服务
2. **快速验证**: 4周内完成全部服务
3. **适合规模的依赖**: 使用PostgreSQL+Redis+Docker Compose
4. **服务松耦合**: 通过API网关通信
5. **渐进式升级**: 先实现功能，后优化性能

# 标准版本快速开始

## 环境准备
```bash
# 安装依赖
npm install

# 启动基础设施（Docker Compose）
docker-compose up -d postgres redis

# 启动第一个服务
nx serve user-management-service
```

## 标准版本部署架构
```
前端 → API网关(3000) → 各微服务(3001-3011) → PostgreSQL + Redis
         ↓
    Docker Compose管理所有服务
```

# 当前项目状态

本项目为**企业级微服务平台**标准版本，目标支持100租户、10万用户。

**标准版本特点**:
- 端口分配: 3000-3011
- 开发周期: 4周完成
- API端点: 约100个核心端点
- 标准版本性能: 10万用户，1000 QPS
- 部署要求: Docker Compose + 8GB内存

**标准版本专注生产可用，选择最适合的技术栈**

## Claude Code 斜线命令配置指南

## 📋 概述

Claude Code支持自定义斜线命令，通过在项目中创建`.claude/commands/`目录来定义可重用的prompt模板，大大提升开发效率。

## 🔧 配置方法

### 项目级命令 (.claude/commands/)

在项目根目录创建`.claude/commands/`目录，每个Markdown文件都会成为一个斜线命令：

```bash
# 项目结构
.claude/
└── commands/
    ├── dev.md                    # /project:dev
    ├── review.md                 # /project:review
    ├── frontend/
    │   └── component.md          # /project:frontend/component
    └── backend/
        └── api.md                # /project:backend/api
```

### 个人级命令 (~/.claude/commands/)

在用户主目录创建全局命令，可在所有项目中使用：

```bash
# 全局命令结构
~/.claude/
└── commands/
    ├── debug.md                  # /user:debug
    ├── optimize.md               # /user:optimize
    └── security-audit.md         # /user:security-audit
```

## 📝 命令文件格式

### 基础命令格式

```markdown
<!-- .claude/commands/example.md -->
# 文件上传功能开发

请帮我开发一个文件上传功能，包括：

1. 文件验证（大小、类型）
2. 安全检查
3. 存储处理
4. 错误处理

请提供完整的实现方案。
```

### 带参数的命令格式

使用`$ARGUMENTS`变量接收用户输入：

```markdown
<!-- .claude/commands/debug-issue.md -->
# 调试问题 #$ARGUMENTS

请帮我分析和修复GitHub issue #$ARGUMENTS：

1. 理解问题描述
2. 分析相关代码
3. 提供修复方案
4. 实现修复代码

请从代码库中搜索相关文件并提供完整的解决方案。
```

使用方式：`/project:debug-issue 123`

### 高级命令模板

```markdown
<!-- .claude/commands/dev.md -->
# 微服务开发优化 - $ARGUMENTS

目标：对 $ARGUMENTS/development-guide.md 进行全面优化，使其符合标准版本目标并加强微服务集成。

**执行步骤：**

1. **智能读取当前文档**：
   - 使用Read工具读取 $ARGUMENTS/development-guide.md
   - 评估3个开发阶段完成情况

2. **智能搜索参考文档**：
   - 使用Grep搜索 "$ARGUMENTS|service-name" 在API-ENDPOINTS.md中的定义
   - 搜索SERVICE_FUNCTIONS_LIST.md获取功能模块要求
   - 搜索SERVICE_INTERACTION_SPEC.md了解服务间交互

3. **技术栈标准化**：
   - 移除Kubernetes → Docker Compose
   - 移除Kafka → Redis Streams
   - 移除Elasticsearch → PostgreSQL全文搜索

4. **完善文档内容**：
   - 补充项目规划（里程碑、内存分配、风险评估）
   - 增强服务间交互设计
   - 优化Docker Compose配置

**输出要求**：
- 直接修改development-guide.md文件
- 确保符合标准版本目标（100租户+10万用户）
- 保持文档专业性和完整性
```

## 🎯 命令命名规范

### 推荐的命名约定

```bash
# 开发相关
/project:dev:{service-name}      # 开发服务
/project:review                  # 代码审查
/project:test                   # 测试相关
/project:deploy                 # 部署相关

# 分析相关  
/project:analyze                # 代码分析
/project:debug:{issue-number}   # 调试问题
/project:security-audit         # 安全审计
/project:performance            # 性能优化

# 文档相关
/project:docs                   # 文档生成
/project:api-spec              # API规范
/project:readme                # README更新
```

## 🚀 实用命令示例

### 1. 服务开发命令

```markdown
<!-- .claude/commands/dev.md -->
# 微服务开发优化模板

用于优化指定微服务的development-guide.md文档，使其符合企业级标准。

参数：服务名称 (如 api-gateway-service)
使用：/project:dev api-gateway-service
```

### 2. 代码审查命令

```markdown
<!-- .claude/commands/review.md -->
# 代码审查模板

请对当前项目进行全面的代码审查：

1. **架构审查**：检查服务架构是否合理
2. **安全审查**：识别潜在安全漏洞
3. **性能审查**：分析性能瓶颈
4. **代码质量**：检查代码规范和最佳实践

提供具体的改进建议和实现方案。
```

### 3. API文档生成命令

```markdown
<!-- .claude/commands/api-docs.md -->
# API文档自动生成

基于当前项目代码自动生成API文档：

1. 扫描所有Controller文件
2. 提取API端点和参数
3. 生成OpenAPI规范
4. 创建可读性强的文档

请生成完整的API文档。
```

## 🔍 最佳实践

### 1. 命令设计原则

- **单一职责**：每个命令专注一个特定任务
- **参数化**：使用$ARGUMENTS增加灵活性  
- **结构化**：提供清晰的执行步骤
- **可复用**：设计通用的命令模板

### 2. 参数使用技巧

```markdown
# 多参数支持
分析服务：$ARGUMENTS

# 从$ARGUMENTS中提取服务名称和操作类型
# 例如：/project:service api-gateway-service optimize
```

### 3. 命令组织建议

```bash
.claude/commands/
├── dev/                    # 开发相关命令
│   ├── service.md         # 服务开发
│   ├── api.md            # API开发  
│   └── frontend.md       # 前端开发
├── ops/                   # 运维相关命令
│   ├── deploy.md         # 部署
│   ├── monitor.md        # 监控
│   └── backup.md         # 备份
└── docs/                  # 文档相关命令
    ├── api-spec.md       # API规范
    ├── readme.md         # README
    └── architecture.md   # 架构文档
```

## 💡 高级功能

### 1. 条件执行

```markdown
# 根据项目类型执行不同逻辑
如果是微服务项目，执行服务优化流程
如果是前端项目，执行组件优化流程
```

### 2. 环境感知

```markdown
# 检测当前环境并调整行为
检查当前是否为开发环境、测试环境或生产环境
根据环境执行相应的操作
```

### 3. 智能文档处理

```markdown
# 大文档处理策略
1. 优先使用Grep工具搜索关键词
2. 使用Read工具分段读取大文件
3. 基于搜索结果确定需要详细处理的部分
```

通过合理配置和使用Claude Code的斜线命令功能，可以大幅提升开发效率，创建标准化的工作流程。
