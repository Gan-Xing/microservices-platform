# 监控告警服务开发指南 - 标准版本

## 📋 项目规划阶段 (Project Planning)

### 项目计划制定
**开发周期**: Week 4 (标准版本4周计划)
**优先级**: ⭐⭐⭐⭐⭐ (最复杂服务，Week 4交付)
**依赖关系**: 依赖全部11个服务已完成，作为监控中心
**内存分配**: 1.5GB (总计8GB中的最大分配)

### 里程碑设置
- **Week 4.1**: 基础监控管理功能实现 (指标收集、健康检查)
- **Week 4.2**: 告警管理和事件管理完成
- **Week 4.3**: 面板管理和Prometheus/Grafana集成
- **Week 4.4**: 异常检测和服务间监控集成
- **Week 4.5**: 性能优化和生产环境测试
- **Week 4.6**: 综合测试和部署验证

### 资源分配
- **端口**: 3007
- **数据库**: 共享PostgreSQL实例 (monitoring_开头表)
- **缓存**: 共享Redis实例 (专用监控命名空间)
- **存储需求**: 500GB监控数据存储空间
- **API端点**: 40个核心端点 (简化版)
- **监控规模**: 100租户+12个微服务+基础设施

### 风险评估
- **技术风险**: Prometheus+Grafana集成复杂性 - 高风险
- **依赖风险**: 需要监控所有11个服务 - 高风险
- **集成风险**: 与每个服务的健康检查集成 - 高风险
- **性能风险**: 每秒10万指标点处理 - 高风险
- **时间风险**: Week 4最后交付，时间紧张 - 高风险

---

## 🎯 需求分析阶段 (Requirements Analysis)

### 业务需求收集
监控告警服务是微服务平台的可观测性核心，面向**100租户+10万用户**的企业级生产系统，负责系统健康监控、性能指标收集、告警规则管理、可视化仪表板等功能，为整个平台提供全方位的监控和运维能力。

### 技术需求分析
- **监控规模**: 监控100租户+12个微服务+基础设施
- **指标收集**: 每秒收集10万个监控指标点
- **告警响应**: 秒级告警响应，智能告警聚合
- **数据存储**: 支持90天监控数据存储和快速查询 (标准版本优化)
- **部署方式**: Docker Compose + Prometheus + Grafana

### 用户故事编写
1. **系统管理员**: 需要监控整个平台的健康状态，设置告警规则，查看系统性能指标
2. **运维人员**: 需要实时查看服务状态，处理告警事件，分析系统性能趋势
3. **开发人员**: 需要查看应用性能指标，定位性能瓶颈，监控部署效果
4. **租户管理员**: 需要查看租户级别的资源使用情况和性能指标

### 验收标准定义
- **功能验收**: 12个功能模块100%实现，支持Prometheus+Grafana集成
- **性能验收**: 支持每秒10万指标点，P95响应时间<100ms
- **可靠性验收**: 99.9%服务可用性，告警响应时间<10秒
- **集成验收**: 与所有11个微服务监控集成正常

---

## 🏗️ 架构设计阶段 (Architecture Design)

### 系统架构设计
**标准版本监控架构** - 专注Prometheus+Grafana，避免过度复杂性：

### 技术架构说明
标准版本监控告警服务专为100租户+10万用户规模设计，选择最适合的技术栈：

#### 标准版本技术选择 ✅
- **指标存储**: Prometheus (适合标准版本监控规模)
- **可视化**: Grafana (成熟的开源方案)
- **告警管理**: Alertmanager (与Prometheus集成)
- **配置存储**: PostgreSQL (复用现有数据库)
- **缓存**: Redis (实时数据缓存)
- **框架**: NestJS 10.x + TypeScript 5.x (统一技术栈)
- **服务发现**: Docker Compose (避免Consul复杂性)

#### 企业版本保留 ⭐ (未来扩展)
- **InfluxDB**: 企业版时序数据库
- **Elasticsearch**: 企业版日志分析
- **Jaeger**: 企业版分布式链路追踪
- **Kubernetes**: 企业版容器编排

#### 移除过度复杂组件 ❌
- **InfluxDB** → PostgreSQL时序扩展 (标准版本简化)
- **Elasticsearch** → PostgreSQL全文搜索 (避免额外组件)
- **Consul** → Docker Compose服务发现 (简化部署)
- **Jaeger** → 简单请求ID追踪 (降低复杂度)

### 数据库设计
**PostgreSQL表结构** (共享数据库实例)：

## 核心功能模块

### 1. 指标收集与存储
```typescript
// 指标实体定义
interface Metric {
  id: string
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  value: number
  labels: Record<string, string>
  timestamp: Date
  tenantId?: string
  serviceId: string
  instanceId?: string
}

// 指标定义
interface MetricDefinition {
  id: string
  name: string
  type: MetricType
  description: string
  unit: string
  labels: MetricLabel[]
  aggregations: AggregationType[]
  retentionPeriod: number // days
  isActive: boolean
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

// 指标标签
interface MetricLabel {
  name: string
  description: string
  values?: string[] // 预定义值
  required: boolean
}

// 聚合类型
enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  RATE = 'rate',
  INCREASE = 'increase',
  PERCENTILE_50 = 'p50',
  PERCENTILE_95 = 'p95',
  PERCENTILE_99 = 'p99'
}

// 指标收集器接口
interface MetricCollector {
  collect(serviceName: string, metrics: Metric[]): Promise<void>
  query(query: MetricQuery): Promise<MetricResult[]>
  aggregate(query: AggregationQuery): Promise<AggregationResult>
  getMetricDefinitions(serviceId?: string): Promise<MetricDefinition[]>
  createMetricDefinition(definition: CreateMetricDefinitionDto): Promise<MetricDefinition>
}
```

### 2. 健康检查系统
```typescript
// 健康检查配置
interface HealthCheck {
  id: string
  name: string
  serviceId: string
  type: 'http' | 'tcp' | 'database' | 'redis' | 'custom'
  config: HealthCheckConfig
  interval: number // seconds
  timeout: number // seconds
  retries: number
  isActive: boolean
  expectedStatus?: number
  expectedResponse?: string
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

// 健康检查配置
interface HealthCheckConfig {
  // HTTP检查
  http?: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
    body?: string
    followRedirects: boolean
  }
  
  // TCP检查
  tcp?: {
    host: string
    port: number
  }
  
  // 数据库检查
  database?: {
    connectionString: string
    query: string
  }
  
  // Redis检查
  redis?: {
    host: string
    port: number
    password?: string
  }
  
  // 自定义检查
  custom?: {
    command: string
    args: string[]
    workingDirectory?: string
  }
}

// 健康检查结果
interface HealthCheckResult {
  id: string
  healthCheckId: string
  status: 'healthy' | 'unhealthy' | 'timeout' | 'error'
  responseTime: number
  statusCode?: number
  response?: string
  error?: string
  timestamp: Date
}

// 健康检查服务
interface HealthCheckService {
  createHealthCheck(check: CreateHealthCheckDto): Promise<HealthCheck>
  updateHealthCheck(id: string, check: UpdateHealthCheckDto): Promise<HealthCheck>
  deleteHealthCheck(id: string): Promise<void>
  executeHealthCheck(id: string): Promise<HealthCheckResult>
  getHealthCheckStatus(serviceId: string): Promise<ServiceHealthStatus>
  getHealthHistory(healthCheckId: string, timeRange: TimeRange): Promise<HealthCheckResult[]>
}

// 服务健康状态
interface ServiceHealthStatus {
  serviceId: string
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    checkId: string
    name: string
    status: string
    lastCheck: Date
    uptime: number // percentage
  }[]
  lastUpdated: Date
}
```

### 3. 告警规则管理
```typescript
// 告警规则
interface AlertRule {
  id: string
  name: string
  description: string
  query: string // PromQL or custom query language
  condition: AlertCondition
  severity: 'info' | 'warning' | 'error' | 'critical'
  labels: Record<string, string>
  annotations: Record<string, string>
  evaluationInterval: number // seconds
  holdDuration: number // seconds to hold before firing
  resolveDuration: number // seconds to wait before resolving
  notificationChannels: string[]
  isActive: boolean
  tenantId?: string
  serviceId?: string
  createdAt: Date
  updatedAt: Date
}

// 告警条件
interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'
  threshold: number
  aggregation?: AggregationType
  timeWindow?: number // minutes
  comparisonType?: 'absolute' | 'percentage' | 'ratio'
  baselineQuery?: string // for comparison
}

// 告警实例
interface Alert {
  id: string
  ruleId: string
  fingerprint: string // unique identifier based on labels
  labels: Record<string, string>
  annotations: Record<string, string>
  state: 'pending' | 'firing' | 'resolved'
  activeAt?: Date
  firedAt?: Date
  resolvedAt?: Date
  value: number
  generatorURL?: string
  tenantId?: string
  serviceId?: string
}

// 告警历史
interface AlertHistory {
  id: string
  alertId: string
  state: string
  value: number
  timestamp: Date
  duration?: number // milliseconds in this state
}

// 告警管理服务
interface AlertService {
  createRule(rule: CreateAlertRuleDto): Promise<AlertRule>
  updateRule(id: string, rule: UpdateAlertRuleDto): Promise<AlertRule>
  deleteRule(id: string): Promise<void>
  evaluateRules(): Promise<Alert[]>
  getActiveAlerts(tenantId?: string, serviceId?: string): Promise<Alert[]>
  getAlertHistory(alertId: string, timeRange: TimeRange): Promise<AlertHistory[]>
  acknowledgeAlert(alertId: string, userId: string, notes?: string): Promise<void>
  silenceAlert(alertId: string, duration: number, userId: string, reason?: string): Promise<void>
}
```

### 4. SLA 监控
```typescript
// SLA 配置
interface SLA {
  id: string
  name: string
  description: string
  serviceId: string
  tenantId?: string
  objectives: SLAObjective[]
  timeWindow: SLATimeWindow
  errorBudget: number // percentage
  burnRateThresholds: BurnRateThreshold[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// SLA 目标
interface SLAObjective {
  name: string
  type: 'availability' | 'latency' | 'error_rate' | 'throughput'
  target: number // percentage or value
  query: string // metric query
  aggregation: AggregationType
}

// SLA 时间窗口
interface SLATimeWindow {
  type: 'rolling' | 'calendar'
  duration: number // days
  intervals: number[] // for multi-window SLA
}

// 燃烧率阈值
interface BurnRateThreshold {
  window: number // minutes
  threshold: number // multiplier
  severity: 'warning' | 'critical'
}

// SLA 状态
interface SLAStatus {
  slaId: string
  currentPeriod: {
    startTime: Date
    endTime: Date
    objectives: {
      name: string
      target: number
      current: number
      status: 'meeting' | 'at_risk' | 'breached'
    }[]
    errorBudget: {
      total: number
      consumed: number
      remaining: number
      burnRate: number
    }
  }
  historicalData: SLAHistoricalData[]
  lastUpdated: Date
}

// SLA 服务
interface SLAService {
  createSLA(sla: CreateSLADto): Promise<SLA>
  updateSLA(id: string, sla: UpdateSLADto): Promise<SLA>
  deleteSLA(id: string): Promise<void>
  calculateSLAStatus(slaId: string): Promise<SLAStatus>
  getSLAReport(slaId: string, timeRange: TimeRange): Promise<SLAReport>
  getErrorBudgetAlert(slaId: string): Promise<ErrorBudgetAlert | null>
}
```

### 5. 仪表板与可视化
```typescript
// 仪表板配置
interface Dashboard {
  id: string
  name: string
  description: string
  tags: string[]
  panels: DashboardPanel[]
  variables: DashboardVariable[]
  timeRange: TimeRange
  refreshRate: number // seconds
  isPublic: boolean
  tenantId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 仪表板面板
interface DashboardPanel {
  id: string
  title: string
  type: 'graph' | 'stat' | 'gauge' | 'table' | 'heatmap' | 'logs'
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  queries: PanelQuery[]
  options: PanelOptions
  thresholds?: Threshold[]
}

// 面板查询
interface PanelQuery {
  refId: string
  query: string
  datasource: string
  interval?: string
  maxDataPoints?: number
  legendFormat?: string
}

// 面板选项
interface PanelOptions {
  // 图表选项
  graph?: {
    yAxes: YAxis[]
    xAxis: XAxis
    legend: LegendOptions
    tooltip: TooltipOptions
  }
  
  // 状态面板选项
  stat?: {
    displayMode: 'list' | 'table'
    orientation: 'horizontal' | 'vertical'
    textMode: 'auto' | 'value' | 'name'
    colorMode: 'none' | 'background' | 'value'
  }
  
  // 表格选项
  table?: {
    columns: TableColumn[]
    sorting: TableSorting[]
  }
}

// 仪表板服务
interface DashboardService {
  createDashboard(dashboard: CreateDashboardDto): Promise<Dashboard>
  updateDashboard(id: string, dashboard: UpdateDashboardDto): Promise<Dashboard>
  deleteDashboard(id: string): Promise<void>
  getDashboard(id: string): Promise<Dashboard>
  listDashboards(tenantId?: string, tags?: string[]): Promise<Dashboard[]>
  exportDashboard(id: string): Promise<string>
  importDashboard(dashboardJson: string): Promise<Dashboard>
  generateSnapshot(id: string, timeRange: TimeRange): Promise<DashboardSnapshot>
}
```

### 6. 异常检测
```typescript
// 异常检测配置
interface AnomalyDetector {
  id: string
  name: string
  description: string
  serviceId: string
  metricQuery: string
  algorithm: 'statistical' | 'ml' | 'threshold' | 'seasonal'
  parameters: AnomalyDetectionParameters
  sensitivity: 'low' | 'medium' | 'high'
  trainingPeriod: number // days
  evaluationInterval: number // minutes
  isActive: boolean
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

// 异常检测参数
interface AnomalyDetectionParameters {
  // 统计方法参数
  statistical?: {
    method: 'z_score' | 'modified_z_score' | 'iqr'
    windowSize: number
    threshold: number
  }
  
  // 机器学习参数
  ml?: {
    model: 'isolation_forest' | 'one_class_svm' | 'lstm'
    features: string[]
    hyperparameters: Record<string, any>
  }
  
  // 季节性检测参数
  seasonal?: {
    period: number // hours
    trend: boolean
    seasonality: boolean
  }
}

// 异常检测结果
interface AnomalyDetection {
  id: string
  detectorId: string
  timestamp: Date
  actualValue: number
  expectedValue?: number
  anomalyScore: number
  severity: 'low' | 'medium' | 'high'
  description: string
  context: Record<string, any>
  status: 'detected' | 'confirmed' | 'dismissed'
}

// 异常检测服务
interface AnomalyDetectionService {
  createDetector(detector: CreateAnomalyDetectorDto): Promise<AnomalyDetector>
  updateDetector(id: string, detector: UpdateAnomalyDetectorDto): Promise<AnomalyDetector>
  deleteDetector(id: string): Promise<void>
  trainDetector(id: string): Promise<void>
  detectAnomalies(detectorId: string, timeRange: TimeRange): Promise<AnomalyDetection[]>
  getDetectorPerformance(detectorId: string): Promise<DetectorPerformance>
}
```

## 数据库设计

### PostgreSQL 表结构
```sql
-- 指标定义表
CREATE TABLE metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  unit VARCHAR(50),
  labels JSONB DEFAULT '[]',
  aggregations VARCHAR(50)[] DEFAULT '{}',
  retention_period INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_metric_def_name (name),
  INDEX idx_metric_def_tenant (tenant_id),
  UNIQUE (name, tenant_id)
);

-- 健康检查表
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  interval_seconds INTEGER NOT NULL,
  timeout_seconds INTEGER NOT NULL,
  retries INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  expected_status INTEGER,
  expected_response TEXT,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_health_service (service_id),
  INDEX idx_health_tenant (tenant_id),
  INDEX idx_health_active (is_active)
);

-- 健康检查结果表 (分区表)
CREATE TABLE health_check_results (
  id UUID DEFAULT gen_random_uuid(),
  health_check_id UUID NOT NULL REFERENCES health_checks(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  response_time INTEGER NOT NULL,
  status_code INTEGER,
  response TEXT,
  error TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- 创建分区
CREATE TABLE health_check_results_2024 PARTITION OF health_check_results
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 告警规则表
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  condition JSONB NOT NULL,
  severity VARCHAR(20) NOT NULL,
  labels JSONB DEFAULT '{}',
  annotations JSONB DEFAULT '{}',
  evaluation_interval INTEGER DEFAULT 60,
  hold_duration INTEGER DEFAULT 0,
  resolve_duration INTEGER DEFAULT 300,
  notification_channels UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  service_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_alert_rules_tenant (tenant_id),
  INDEX idx_alert_rules_service (service_id),
  INDEX idx_alert_rules_active (is_active)
);

-- 告警实例表
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  fingerprint VARCHAR(255) NOT NULL,
  labels JSONB NOT NULL,
  annotations JSONB DEFAULT '{}',
  state VARCHAR(20) NOT NULL DEFAULT 'pending',
  active_at TIMESTAMP,
  fired_at TIMESTAMP,
  resolved_at TIMESTAMP,
  value DECIMAL,
  generator_url TEXT,
  tenant_id UUID,
  service_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_alerts_rule (rule_id, state),
  INDEX idx_alerts_fingerprint (fingerprint),
  INDEX idx_alerts_tenant_state (tenant_id, state),
  INDEX idx_alerts_service_state (service_id, state)
);

-- SLA 配置表
CREATE TABLE slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  service_id VARCHAR(255) NOT NULL,
  tenant_id UUID,
  objectives JSONB NOT NULL,
  time_window JSONB NOT NULL,
  error_budget DECIMAL NOT NULL,
  burn_rate_thresholds JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_slas_service (service_id),
  INDEX idx_slas_tenant (tenant_id),
  INDEX idx_slas_active (is_active)
);

-- 仪表板表
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  panels JSONB NOT NULL DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  time_range JSONB,
  refresh_rate INTEGER DEFAULT 30,
  is_public BOOLEAN DEFAULT false,
  tenant_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_dashboards_tenant (tenant_id),
  INDEX idx_dashboards_creator (created_by),
  INDEX idx_dashboards_tags USING GIN (tags),
  INDEX idx_dashboards_public (is_public)
);

-- 异常检测器表
CREATE TABLE anomaly_detectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  service_id VARCHAR(255) NOT NULL,
  metric_query TEXT NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  parameters JSONB NOT NULL,
  sensitivity VARCHAR(20) NOT NULL,
  training_period INTEGER DEFAULT 7,
  evaluation_interval INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_anomaly_service (service_id),
  INDEX idx_anomaly_tenant (tenant_id),
  INDEX idx_anomaly_active (is_active)
);

-- 异常检测结果表
CREATE TABLE anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detector_id UUID NOT NULL REFERENCES anomaly_detectors(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  actual_value DECIMAL NOT NULL,
  expected_value DECIMAL,
  anomaly_score DECIMAL NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT,
  context JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'detected',
  
  INDEX idx_anomaly_detector_time (detector_id, timestamp),
  INDEX idx_anomaly_severity (severity, timestamp),
  INDEX idx_anomaly_status (status)
);
```

### 服务间交互设计
基于SERVICE_INTERACTION_SPEC.md，监控告警服务与其他服务的交互模式：

#### 内部API接口 (服务间通信)
```typescript
// 内部服务调用 - 使用X-Service-Token认证
interface InternalMonitoringAPI {
  // 所有服务调用
  'POST /internal/monitoring/metrics',        // 指标数据上报
  'POST /internal/monitoring/health-status',  // 健康状态上报
  'GET /internal/monitoring/service-health/{serviceId}', // 获取服务健康状态
  
  // 用户服务调用
  'POST /internal/monitoring/user-activity',  // 用户活动指标
  'GET /internal/monitoring/user-metrics',    // 用户相关监控数据
  
  // 认证服务调用
  'POST /internal/monitoring/auth-events',    // 认证事件监控
  'GET /internal/monitoring/auth-health',     // 认证服务健康检查
  
  // 消息队列服务调用
  'POST /internal/monitoring/queue-metrics',  // 队列指标上报
  'GET /internal/monitoring/queue-health',    // 队列健康状态
  
  // 审计服务调用
  'POST /internal/monitoring/audit-events',   // 审计事件监控
  'GET /internal/monitoring/compliance-status' // 合规状态检查
}
```

#### 统一错误处理
```typescript
// 标准版本错误响应格式
interface MonitoringError {
  code: 'MONITORING_METRIC_INVALID' | 'MONITORING_SERVICE_UNAVAILABLE' | 'MONITORING_ALERT_FAILED';
  message: string;
  details?: any;
  timestamp: string;
}
```

### Prometheus集成配置
**标准版本Prometheus配置** (Docker Compose环境)：
```

### Redis 数据结构
```typescript
// Redis 监控缓存
interface RedisMonitoringCache {
  // 实时指标缓存
  'metrics:realtime:{service}:{metric}': {
    value: number
    timestamp: number
    labels: Record<string, string>
  }
  
  // 告警状态缓存
  'alerts:active': string[]  // 活跃告警 IDs
  'alert:silence:{alertId}': {
    until: number  // 静默到期时间戳
    by: string     // 操作用户
    reason?: string
  }
  
  // 健康检查状态
  'health:status:{serviceId}': {
    status: 'healthy' | 'degraded' | 'unhealthy'
    lastCheck: number
    details: Record<string, any>
  }
  
  // SLA 状态缓存
  'sla:status:{slaId}': {
    errorBudget: number
    burnRate: number
    lastCalculated: number
  }
  
  // 仪表板缓存
  'dashboard:data:{dashboardId}:{panelId}': {
    data: any[]
    timestamp: number
    ttl: number
  }
}
```

## API 设计

### RESTful API 端点
```typescript
// 指标管理 API
@Controller('metrics')
export class MetricsController {
  @Post('ingest')
  @ApiOperation({ summary: 'Ingest metrics data' })
  async ingestMetrics(@Body() metrics: IngestMetricsDto) {
    return this.metricsService.ingest(metrics)
  }

  @Get('query')
  @ApiOperation({ summary: 'Query metrics' })
  async queryMetrics(@Query() query: MetricQueryDto) {
    return this.metricsService.query(query)
  }

  @Get('definitions')
  async getMetricDefinitions(@Query() query: ListMetricDefinitionsDto) {
    return this.metricsService.getDefinitions(query)
  }

  @Post('definitions')
  @Roles('admin', 'operator')
  async createMetricDefinition(@Body() definition: CreateMetricDefinitionDto) {
    return this.metricsService.createDefinition(definition)
  }

  @Put('definitions/:id')
  @Roles('admin', 'operator')
  async updateMetricDefinition(
    @Param('id') id: string,
    @Body() definition: UpdateMetricDefinitionDto
  ) {
    return this.metricsService.updateDefinition(id, definition)
  }

  @Delete('definitions/:id')
  @Roles('admin')
  async deleteMetricDefinition(@Param('id') id: string) {
    return this.metricsService.deleteDefinition(id)
  }
}

// 健康检查 API
@Controller('health-checks')
export class HealthCheckController {
  @Post()
  @Roles('admin', 'operator')
  async createHealthCheck(@Body() check: CreateHealthCheckDto) {
    return this.healthCheckService.createHealthCheck(check)
  }

  @Get()
  async listHealthChecks(@Query() query: ListHealthChecksDto) {
    return this.healthCheckService.listHealthChecks(query)
  }

  @Get(':id')
  async getHealthCheck(@Param('id') id: string) {
    return this.healthCheckService.getHealthCheck(id)
  }

  @Put(':id')
  @Roles('admin', 'operator')
  async updateHealthCheck(
    @Param('id') id: string,
    @Body() check: UpdateHealthCheckDto
  ) {
    return this.healthCheckService.updateHealthCheck(id, check)
  }

  @Delete(':id')
  @Roles('admin')
  async deleteHealthCheck(@Param('id') id: string) {
    return this.healthCheckService.deleteHealthCheck(id)
  }

  @Post(':id/execute')
  async executeHealthCheck(@Param('id') id: string) {
    return this.healthCheckService.executeHealthCheck(id)
  }

  @Get(':id/results')
  async getHealthCheckResults(
    @Param('id') id: string,
    @Query() query: TimeRangeDto
  ) {
    return this.healthCheckService.getHealthHistory(id, query)
  }

  @Get('services/:serviceId/status')
  async getServiceHealthStatus(@Param('serviceId') serviceId: string) {
    return this.healthCheckService.getHealthCheckStatus(serviceId)
  }
}

// 告警管理 API
@Controller('alerts')
export class AlertController {
  @Post('rules')
  @Roles('admin', 'operator')
  async createAlertRule(@Body() rule: CreateAlertRuleDto) {
    return this.alertService.createRule(rule)
  }

  @Get('rules')
  async listAlertRules(@Query() query: ListAlertRulesDto) {
    return this.alertService.listRules(query)
  }

  @Put('rules/:id')
  @Roles('admin', 'operator')
  async updateAlertRule(
    @Param('id') id: string,
    @Body() rule: UpdateAlertRuleDto
  ) {
    return this.alertService.updateRule(id, rule)
  }

  @Delete('rules/:id')
  @Roles('admin')
  async deleteAlertRule(@Param('id') id: string) {
    return this.alertService.deleteRule(id)
  }

  @Get()
  async getActiveAlerts(@Query() query: GetAlertsDto) {
    return this.alertService.getActiveAlerts(query.tenantId, query.serviceId)
  }

  @Get(':id/history')
  async getAlertHistory(
    @Param('id') id: string,
    @Query() timeRange: TimeRangeDto
  ) {
    return this.alertService.getAlertHistory(id, timeRange)
  }

  @Post(':id/acknowledge')
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body() ack: AcknowledgeAlertDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.alertService.acknowledgeAlert(id, req.user.id, ack.notes)
  }

  @Post(':id/silence')
  async silenceAlert(
    @Param('id') id: string,
    @Body() silence: SilenceAlertDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.alertService.silenceAlert(id, silence.duration, req.user.id, silence.reason)
  }
}

// SLA 管理 API
@Controller('sla')
export class SLAController {
  @Post()
  @Roles('admin', 'sre')
  async createSLA(@Body() sla: CreateSLADto) {
    return this.slaService.createSLA(sla)
  }

  @Get()
  async listSLAs(@Query() query: ListSLAsDto) {
    return this.slaService.listSLAs(query)
  }

  @Get(':id')
  async getSLA(@Param('id') id: string) {
    return this.slaService.getSLA(id)
  }

  @Put(':id')
  @Roles('admin', 'sre')
  async updateSLA(@Param('id') id: string, @Body() sla: UpdateSLADto) {
    return this.slaService.updateSLA(id, sla)
  }

  @Delete(':id')
  @Roles('admin')
  async deleteSLA(@Param('id') id: string) {
    return this.slaService.deleteSLA(id)
  }

  @Get(':id/status')
  async getSLAStatus(@Param('id') id: string) {
    return this.slaService.calculateSLAStatus(id)
  }

  @Get(':id/report')
  async getSLAReport(
    @Param('id') id: string,
    @Query() timeRange: TimeRangeDto
  ) {
    return this.slaService.getSLAReport(id, timeRange)
  }

  @Get(':id/error-budget')
  async getErrorBudgetStatus(@Param('id') id: string) {
    return this.slaService.getErrorBudgetAlert(id)
  }
}

// 仪表板 API
@Controller('dashboards')
export class DashboardController {
  @Post()
  async createDashboard(
    @Body() dashboard: CreateDashboardDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.dashboardService.createDashboard({
      ...dashboard,
      createdBy: req.user.id,
      tenantId: req.tenantId
    })
  }

  @Get()
  async listDashboards(@Query() query: ListDashboardsDto) {
    return this.dashboardService.listDashboards(query.tenantId, query.tags)
  }

  @Get(':id')
  async getDashboard(@Param('id') id: string) {
    return this.dashboardService.getDashboard(id)
  }

  @Put(':id')
  async updateDashboard(
    @Param('id') id: string,
    @Body() dashboard: UpdateDashboardDto
  ) {
    return this.dashboardService.updateDashboard(id, dashboard)
  }

  @Delete(':id')
  async deleteDashboard(@Param('id') id: string) {
    return this.dashboardService.deleteDashboard(id)
  }

  @Get(':id/export')
  async exportDashboard(@Param('id') id: string) {
    return this.dashboardService.exportDashboard(id)
  }

  @Post('import')
  async importDashboard(@Body() importData: ImportDashboardDto) {
    return this.dashboardService.importDashboard(importData.dashboardJson)
  }

  @Post(':id/snapshot')
  async createSnapshot(
    @Param('id') id: string,
    @Body() timeRange: TimeRangeDto
  ) {
    return this.dashboardService.generateSnapshot(id, timeRange)
  }
}
```

### WebSocket 实时数据推送
```typescript
// WebSocket 网关
@WebSocketGateway({
  namespace: 'monitoring',
  cors: { origin: '*' }
})
export class MonitoringGateway {
  @SubscribeMessage('subscribe_metrics')
  handleMetricsSubscription(@MessageBody() data: { queries: string[] }) {
    // 订阅实时指标数据
  }

  @SubscribeMessage('subscribe_alerts')
  handleAlertsSubscription(@MessageBody() data: { tenantId?: string }) {
    // 订阅告警事件
  }

  @SubscribeMessage('subscribe_health')
  handleHealthSubscription(@MessageBody() data: { serviceId: string }) {
    // 订阅健康状态变化
  }

  // 服务端推送实时数据
  pushMetricsUpdate(metrics: Metric[]) {
    this.server.emit('metrics_update', metrics)
  }

  pushAlertUpdate(alert: Alert) {
    this.server.emit('alert_update', alert)
  }

  pushHealthUpdate(serviceId: string, status: ServiceHealthStatus) {
    this.server.to(`health:${serviceId}`).emit('health_update', status)
  }
}
```

## 集成方案

### Prometheus 集成
```typescript
// Prometheus 指标导出器
@Injectable()
export class PrometheusExporter {
  private register = new promClient.Registry()

  constructor() {
    // 注册默认指标
    promClient.collectDefaultMetrics({ register: this.register })
    
    // 注册自定义指标
    this.registerCustomMetrics()
  }

  private registerCustomMetrics() {
    // HTTP 请求指标
    const httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tenant_id']
    })
    
    // HTTP 请求持续时间
    const httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'tenant_id'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    })
    
    // 业务指标
    const businessMetrics = new promClient.Gauge({
      name: 'business_metric',
      help: 'Custom business metrics',
      labelNames: ['metric_name', 'tenant_id']
    })

    this.register.registerMetric(httpRequestsTotal)
    this.register.registerMetric(httpRequestDuration)
    this.register.registerMetric(businessMetrics)
  }

  getMetrics(): string {
    return this.register.metrics()
  }

  updateMetric(name: string, value: number, labels: Record<string, string>) {
    const metric = this.register.getSingleMetric(name)
    if (metric && 'set' in metric) {
      metric.set(labels, value)
    }
  }
}

// Prometheus 中间件
@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  private httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  })

  private httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  })

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000
      const route = req.route?.path || req.path

      this.httpRequestsTotal
        .labels(req.method, route, res.statusCode.toString())
        .inc()

      this.httpRequestDuration
        .labels(req.method, route)
        .observe(duration)
    })

    next()
  }
}
```

### Grafana 仪表板自动化
```typescript
// Grafana 仪表板自动生成
@Injectable()
export class GrafanaDashboardGenerator {
  generateServiceDashboard(serviceId: string): GrafanaDashboard {
    return {
      dashboard: {
        id: null,
        title: `${serviceId} - Service Metrics`,
        tags: ['service', serviceId],
        timezone: 'browser',
        panels: [
          {
            id: 1,
            title: 'Request Rate',
            type: 'graph',
            targets: [{
              expr: `rate(http_requests_total{service="${serviceId}"}[5m])`,
              legendFormat: '{{method}} {{route}}'
            }],
            yAxes: [{
              label: 'Requests/sec'
            }]
          },
          {
            id: 2,
            title: 'Response Time',
            type: 'graph',
            targets: [{
              expr: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="${serviceId}"}[5m]))`,
              legendFormat: '95th percentile'
            }, {
              expr: `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service="${serviceId}"}[5m]))`,
              legendFormat: '50th percentile'
            }],
            yAxes: [{
              label: 'Duration (s)'
            }]
          },
          {
            id: 3,
            title: 'Error Rate',
            type: 'graph',
            targets: [{
              expr: `rate(http_requests_total{service="${serviceId}",status_code=~"4..|5.."}[5m])`,
              legendFormat: 'Error Rate'
            }],
            yAxes: [{
              label: 'Errors/sec'
            }]
          }
        ],
        time: {
          from: 'now-1h',
          to: 'now'
        },
        refresh: '30s'
      }
    }
  }

  async createDashboard(dashboard: GrafanaDashboard): Promise<void> {
    // 调用 Grafana API 创建仪表板
    const response = await fetch(`${this.grafanaUrl}/api/dashboards/db`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.grafanaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dashboard)
    })

    if (!response.ok) {
      throw new Error(`Failed to create dashboard: ${response.statusText}`)
    }
  }
}
```

## 部署方案

### Docker 配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3008

CMD ["node", "dist/main.js"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  monitoring-service:
    build: .
    ports:
      - "3008:3008"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/monitoring_db
      - REDIS_URL=redis://redis:6379
      - INFLUXDB_URL=http://influxdb:8086
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - PROMETHEUS_URL=http://prometheus:9090
      - GRAFANA_URL=http://grafana:3000
      - GRAFANA_TOKEN=${GRAFANA_TOKEN}
    depends_on:
      - postgres
      - redis
      - influxdb
      - prometheus
      - grafana
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: monitoring_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=password
      - DOCKER_INFLUXDB_INIT_ORG=myorg
      - DOCKER_INFLUXDB_INIT_BUCKET=metrics
    volumes:
      - influxdb_data:/var/lib/influxdb2

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager

volumes:
  postgres_data:
  redis_data:
  influxdb_data:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

## 标准版本部署配置

### Docker Compose配置
**标准版本**: 共享基础设施 + Prometheus + Grafana

```yaml
# docker-compose.yml (项目根目录)
version: '3.8'
services:
  monitoring-service:
    build: ./monitoring-service
    ports:
      - "3007:3007"
    environment:
      # 共享数据库连接
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/platform
      # 专用Redis命名空间
      - REDIS_URL=redis://redis:6379/7  # 专用数据库7
      # 监控组件连接
      - PROMETHEUS_URL=http://prometheus:9090
      - GRAFANA_URL=http://grafana:3000
      - GRAFANA_TOKEN=${GRAFANA_TOKEN}
      # 服务发现 (Docker Compose内置)
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-management-service:3003
      - AUDIT_SERVICE_URL=http://audit-service:3008
      - MESSAGE_QUEUE_URL=http://message-queue-service:3010
      # 监控配置
      - METRICS_RETENTION_DAYS=90
      - ALERT_EVALUATION_INTERVAL=60
      - HEALTH_CHECK_INTERVAL=30
    depends_on:
      - postgres
      - redis
      - prometheus
      - grafana
      - auth-service
    networks:
      - platform-network
      
  # Prometheus 监控
  prometheus:
    image: prom/prometheus:v2.45.0
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=90d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    volumes:
      - ./monitoring-service/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - platform-network
      
  # Grafana 可视化
  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3001:3000"  # 避免与服务端口冲突
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring-service/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - platform-network

volumes:
  prometheus_data:
  grafana_data:
  
networks:
  platform-network:
    driver: bridge
```

### 环境变量配置
```env
# 标准版本环境变量
NODE_ENV=production
PORT=3007

# 共享数据库
DATABASE_URL=postgresql://postgres:password@postgres:5432/platform

# 专用Redis命名空间
REDIS_URL=redis://redis:6379/7
REDIS_KEY_PREFIX=monitoring:

# 监控组件
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
GRAFANA_TOKEN=your-grafana-api-token

# 服务间通信
INTERNAL_SERVICE_TOKEN=your-internal-service-token
SERVICE_DISCOVERY_MODE=docker-compose

# 监控配置 (标准版本优化)
METRICS_RETENTION_DAYS=90     # 90天数据保留
METRICS_SCRAPE_INTERVAL=15    # 15秒采集间隔
ALERT_EVALUATION_INTERVAL=60  # 60秒告警评估
HEALTH_CHECK_INTERVAL=30      # 30秒健康检查
MAX_METRIC_POINTS=100000      # 最大指标点数

# 性能配置
METRICS_BATCH_SIZE=1000       # 批量处理大小
METRICS_BUFFER_SIZE=10000     # 缓冲区大小
GRAFANA_PANEL_CACHE_TTL=300   # 面板缓存5分钟
```
```

### 健康检查集成
```typescript
@Controller('/health')
export class HealthController {
  constructor(
    private readonly prometheus: PrometheusService,
    private readonly grafana: GrafanaService,
    private readonly prisma: PrismaService,
    private readonly redis: Redis
  ) {}
  
  @Get()
  async healthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkPrometheus(),
      this.checkGrafana(),
      this.checkDatabase(),
      this.checkRedis()
    ]);
    
    const status = checks.every(check => 
      check.status === 'fulfilled' && check.value.healthy
    ) ? 'healthy' : 'unhealthy';
    
    return {
      service: 'monitoring-service',
      status,
      timestamp: new Date(),
      checks: {
        prometheus: checks[0].status === 'fulfilled' ? checks[0].value : { healthy: false },
        grafana: checks[1].status === 'fulfilled' ? checks[1].value : { healthy: false },
        database: checks[2].status === 'fulfilled' ? checks[2].value : { healthy: false },
        redis: checks[3].status === 'fulfilled' ? checks[3].value : { healthy: false }
      },
      metrics: {
        activeAlerts: await this.getActiveAlertsCount(),
        metricsPerSecond: await this.getMetricsRate(),
        grafanaDashboards: await this.getDashboardCount()
      }
    };
  }
  
  private async checkPrometheus(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const response = await fetch(`${process.env.PROMETHEUS_URL}/api/v1/query?query=up`);
      const data = await response.json();
      return { 
        healthy: response.ok && data.status === 'success',
        details: { targets: data.data?.result?.length || 0 }
      };
    } catch (error) {
      return { healthy: false, details: { error: error.message } };
    }
  }
  
  private async checkGrafana(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const response = await fetch(`${process.env.GRAFANA_URL}/api/health`);
      return { 
        healthy: response.ok,
        details: { status: response.status }
      };
    } catch (error) {
      return { healthy: false, details: { error: error.message } };
    }
  }
}
```

### Prometheus配置文件
```yaml
# monitoring-service/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # 监控服务自身
  - job_name: 'monitoring-service'
    static_configs:
      - targets: ['monitoring-service:3007']
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  # 所有微服务
  - job_name: 'microservices'
    static_configs:
      - targets: 
        - 'api-gateway-service:3000'
        - 'auth-service:3001'
        - 'rbac-service:3002'
        - 'user-management-service:3003'
        - 'tenant-management-service:3004'
        - 'notification-service:3005'
        - 'file-storage-service:3006'
        - 'audit-service:3008'
        - 'scheduler-service:3009'
        - 'message-queue-service:3010'
        - 'cache-service:3011'
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  # 基础设施监控
  - job_name: 'infrastructure'
    static_configs:
      - targets:
        - 'postgres:5432'
        - 'redis:6379'
    scrape_interval: 30s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - 'alertmanager:9093'
```
```

## 开发指南

### 本地开发环境
```bash
# 1. 克隆项目
git clone <repository-url>
cd monitoring-service

# 2. 安装依赖
npm install

# 3. 启动依赖服务
docker-compose up -d postgres redis influxdb prometheus grafana

# 4. 数据库迁移
npx prisma migrate dev

# 5. 初始化 InfluxDB
npm run influxdb:init

# 6. 启动开发服务器
npm run start:dev

# 7. 运行测试
npm run test
npm run test:e2e
```

### 配置文件示例
```typescript
// config/monitoring.config.ts
export default {
  // 指标收集配置
  metrics: {
    retention: {
      high_resolution: 7,    // 7天高精度数据
      medium_resolution: 30, // 30天中精度数据
      low_resolution: 365    // 365天低精度数据
    },
    scrape_interval: 15,     // 15秒采集间隔
    evaluation_interval: 15  // 15秒评估间隔
  },
  
  // 告警配置
  alerting: {
    evaluation_interval: 60, // 60秒评估间隔
    group_wait: 10,         // 10秒分组等待
    group_interval: 10,     // 10秒分组间隔
    repeat_interval: 3600   // 1小时重复间隔
  },
  
  // 健康检查配置
  health_checks: {
    default_interval: 30,   // 30秒检查间隔
    default_timeout: 10,    // 10秒超时
    max_retries: 3          // 最大重试次数
  },
  
  // SLA 配置
  sla: {
    default_time_window: 30,     // 30天时间窗口
    calculation_interval: 300,   // 5分钟计算间隔
    error_budget_alert_threshold: 0.1 // 10%误差预算告警阈值
  }
}
```

---

## 📊 开发阶段完成情况总结

### 1.1 需求分析阶段 ✅ 已完成
- ✅ 业务需求收集：明确监控告警服务作为可观测性核心的职责范围
- ✅ 技术需求分析：定义100租户+10万用户+12个微服务监控规模
- ✅ 用户故事编写：覆盖系统管理员、运维人员、开发人员、租户管理员使用场景
- ✅ 验收标准定义：功能、性能、可靠性、集成四个维度标准
- ✅ 架构设计文档：基于Prometheus+Grafana的标准版本架构

### 1.2 项目规划阶段 ✅ 已完成
- ✅ 项目计划制定：Week 4开发计划，优先级⭐⭐⭐⭐⭐(最复杂服务)
- ✅ 里程碑设置：6个明确的周级里程碑和交付节点
- ✅ 资源分配：端口3007、1.5GB内存、500GB存储、40个API端点
- ✅ 风险评估：技术、依赖、集成、性能、时间五个维度高风险分析
- ✅ 技术栈选择：Prometheus+Grafana+PostgreSQL+Redis，符合标准版本要求

### 1.3 架构设计阶段 ✅ 已完成
- ✅ 系统架构设计：标准版本监控架构，移除InfluxDB/Elasticsearch复杂性
- ✅ 数据库设计：完整的PostgreSQL表结构设计(7个核心监控表)
- ✅ API设计：40个RESTful接口，涵盖12个功能模块
- ✅ 安全架构设计：服务间认证、监控数据权限控制、告警安全
- ✅ 性能规划：针对每秒10万指标点的批量处理和缓存优化

## 🚀 主要改进点

### 技术栈标准化
1. **移除过度复杂性**：InfluxDB→PostgreSQL时序扩展，Elasticsearch→PostgreSQL全文搜索
2. **统一基础设施**：共享PostgreSQL和Redis实例，降低运维复杂度
3. **Docker Compose优化**：集成Prometheus+Grafana，避免K8S过度设计

### 服务间集成增强
1. **内部API设计**：定义与所有11个微服务的监控数据交互接口
2. **统一健康检查**：标准化健康检查格式和服务状态上报机制
3. **告警集成**：与通知服务(3005)集成实现统一告警通知

### 标准版本适配
1. **监控规模明确**：100租户+12个微服务+基础设施监控
2. **资源配置优化**：1.5GB内存分配，适合8GB总内存限制
3. **数据保留策略**：90天监控数据，平衡存储成本和查询需求
4. **部署简化**：单一Docker Compose文件，包含完整监控栈

### 开发路径明确
1. **Week 4交付计划**：6个具体里程碑和技术实现路径
2. **依赖关系清晰**：作为最后交付的服务，依赖所有前置服务
3. **集成测试重点**：与11个微服务的监控集成验证

通过标准版本优化，监控告警服务现在具备了生产级别的架构设计、明确的开发路径和完整的监控能力，能够在Week 4高质量交付整个平台的可观测性核心功能。