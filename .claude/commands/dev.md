# 微服务开发优化 - $ARGUMENTS

目标：对 $ARGUMENTS/development-guide.md 进行全面优化，使其符合标准版本目标并加强微服务集成。

**第一步：读取并评估当前服务文档**

检查之前git记录是否已经更改，再进行下面的步骤

读取 $ARGUMENTS/development-guide.md，对照以下3个开发阶段检查完成情况：

### 1.1 需求分析阶段 (Requirements Analysis) 检查项：
- ✅/❌ 业务需求收集：是否明确服务的核心职责和功能范围
- ✅/❌ 技术需求分析：是否定义了性能指标（100租户+10万用户）
- ✅/❌ 用户故事编写：是否通过API端点体现了用户使用场景
- ✅/❌ 验收标准定义：是否有明确的功能验收和性能标准
- ✅/❌ 架构设计文档：是否有技术架构说明

### 1.2 项目规划阶段 (Project Planning) 检查项：
- ✅/❌ 项目计划制定：是否有具体的开发时间线和里程碑
- ✅/❌ 里程碑设置：是否定义了阶段性目标和交付节点
- ✅/❌ 资源分配：是否有内存分配、端口分配、开发优先级
- ✅/❌ 风险评估：是否分析了技术风险和服务依赖风险
- ✅/❌ 技术栈选择：是否符合标准版本技术栈

### 1.3 架构设计阶段 (Architecture Design) 检查项：
- ✅/❌ 系统架构设计：是否有完整的微服务架构图
- ✅/❌ 数据库设计：是否有PostgreSQL表结构设计
- ✅/❌ API设计：是否有RESTful接口定义
- ✅/❌ 安全架构设计：是否符合标准版本安全要求
- ✅/❌ 性能规划：是否针对标准版本规模进行了性能设计

**第二步：智能读取参考文档进行对比和补充**
使用分段搜索策略读取以下参考文档：
- **API-ENDPOINTS.md**：使用Grep工具搜索"$ARGUMENTS|service-name"等关键词，获取该服务的API端点定义
- **SERVICE_FUNCTIONS_LIST.md**：使用Grep工具搜索服务名称，获取该服务应包含的功能模块列表
- **SERVICE_INTERACTION_SPEC.md**：使用Grep工具搜索服务名称和端口号，了解与其他11个服务的交互规范
- **UNIFIED_DEVELOPMENT_GUIDE.md**：使用Read工具分段读取，确保技术架构一致性

**搜索策略示例：**
```bash
# 针对指定服务
Grep pattern="$ARGUMENTS|service-name" file="API-ENDPOINTS.md"
Grep pattern="$ARGUMENTS" file="SERVICE_FUNCTIONS_LIST.md"
Grep pattern="$ARGUMENTS|port-number" file="SERVICE_INTERACTION_SPEC.md"
```

**第三步：技术栈标准化检查和修正**
移除不符合标准版本的技术组件：
- ❌ Kubernetes → ✅ Docker Compose
- ❌ ClickHouse → ✅ PostgreSQL时序扩展
- ❌ Elasticsearch → ✅ PostgreSQL全文搜索
- ❌ Kafka → ✅ Redis Streams
- ❌ InfluxDB → ✅ PostgreSQL
- ❌ Consul → ✅ Docker Compose内置网络服务发现

**第四步：服务间交互设计增强**
基于SERVICE_INTERACTION_SPEC.md，设计该服务与其他服务的交互：
- 定义内部API接口（/internal/* 端点）
- 设计服务间调用的认证机制（X-Service-Token）
- 明确服务依赖关系和调用顺序
- 设计统一错误处理和重试机制
- 添加健康检查和监控集成

**第五步：完善项目规划**
补充缺失的项目规划内容：
- 开发里程碑：明确在4周计划中的Week和优先级
- 内存分配：基于UNIFIED_DEVELOPMENT_GUIDE.md的8GB内存分配方案
- 开发顺序：基于服务依赖关系设计开发步骤
- 风险评估：识别技术风险、依赖风险、集成风险
- 服务集成计划：分阶段集成其他服务的计划

**第六步：标准版本配置优化**
- 服务配置：端口、内存限制、环境变量
- Docker Compose配置：移除K8S，使用compose网络
- 服务发现：使用Docker Compose内置网络（service-name:port）
- 监控集成：Prometheus + Grafana + PostgreSQL
- 部署方案：单机或小集群Docker Compose部署

**智能文档处理策略：**
1. 优先使用Grep工具进行关键词搜索，避免读取整个大文件
2. 对于超过25000 tokens的文件，使用Read工具的offset和limit参数分段读取
3. 根据搜索结果确定需要详细阅读的文档部分
4. 使用多个并行的Grep搜索来快速定位相关内容

**执行要求：**
1. 直接修改$ARGUMENTS/development-guide.md文件
2. 保持文档的专业性和完整性
3. 确保完全符合标准版本目标（100租户+10万用户）
4. 与整体微服务架构保持一致
5. 实现生产可用功能，避免过度设计
6. 无需额外确认，直接完成所有修改
7. **智能处理大文档**：使用Grep搜索 + 分段Read的组合策略

最后总结该服务在3个开发阶段的完成情况和主要改进点。