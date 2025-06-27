# 监控告警服务开发文档 - 标准版本

## 服务概述

监控告警服务是微服务平台的可观测性核心，面向**100租户+10万用户**的企业级生产系统，负责系统健康监控、性能指标收集、告警规则管理、SLA监控、可视化仪表板等功能，为整个平台提供全方位的监控和运维能力。

### 🎯 标准版本定位
- **监控规模**: 监控100租户+12个微服务+基础设施
- **API端点**: 55个端点，12个功能模块
- **复杂度**: ⭐⭐⭐⭐⭐（最复杂服务）
- **开发优先级**: Week 4
- **服务端口**: 3007
- **指标收集**: 每秒收集10万个监控指标点
- **告警响应**: 秒级告警响应，智能告警聚合
- **数据存储**: 支持1年监控数据存储和快速查询
- **部署方式**: Docker Compose + Prometheus + Grafana

## 技术栈

### 后端技术 (标准版本)
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (配置数据 + 时序数据) + Redis 7+ (缓存)
- **时序数据**: PostgreSQL时序扩展 + Prometheus
- **ORM**: Prisma ORM
- **消息队列**: Redis Streams (标准版本适用)
- **指标收集**: Prometheus Client

### 监控技术栈 (标准版本)
- **指标存储**: Prometheus (单一指标存储)
- **可视化**: Grafana
- **告警管理**: Alertmanager
- **服务发现**: Docker Compose服务发现
- **链路追踪**: 简化链路追踪 (请求ID追踪)
- **日志聚合**: Winston + PostgreSQL存储

### 数据分析 (标准版本简化)
- **实时计算**: PostgreSQL + Redis (简化统计)
- **异常检测**: 基于阈值的简单异常检测
- **统计分析**: Node.js Statistics Libraries

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

### InfluxDB 数据结构 (时序数据)
```typescript
// InfluxDB 指标数据结构
interface InfluxMetric {
  measurement: string    // 指标名称
  tags: {               // 标签 (索引字段)
    service: string
    instance?: string
    tenant_id?: string
    environment: string
  }
  fields: {             // 字段 (值)
    value: number
    [key: string]: number | string | boolean
  }
  timestamp: number     // 纳秒时间戳
}

// InfluxDB 查询示例
const influxQueries = {
  // CPU使用率查询
  cpuUsage: `
    SELECT mean("value") 
    FROM "cpu_usage" 
    WHERE "service" = 'user-service' 
    AND time > now() - 1h 
    GROUP BY time(5m), "instance"
  `,
  
  // 响应时间分位数
  responseTimePercentiles: `
    SELECT percentile("value", 50) as p50,
           percentile("value", 95) as p95,
           percentile("value", 99) as p99
    FROM "http_request_duration"
    WHERE time > now() - 1h
    GROUP BY time(1m)
  `,
  
  // 错误率计算
  errorRate: `
    SELECT sum("errors") / sum("requests") * 100 as error_rate
    FROM (
      SELECT count("value") as requests,
             sum(CASE WHEN "status_code" >= 400 THEN 1 ELSE 0 END) as errors
      FROM "http_requests_total"
      WHERE time > now() - 5m
  `
};
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

### Docker Compose 部署 (标准版本推荐)
```yaml
# docker-compose.yml 中的监控服务配置
monitoring-service:
  build:
    context: ./monitoring-service
    dockerfile: Dockerfile
  container_name: platform-monitoring-service
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://platform_user:platform_password@postgres:5432/monitoring_db
    - REDIS_URL=redis://:redis_password@redis:6379
    - PROMETHEUS_URL=http://prometheus:9090
    - GRAFANA_URL=http://grafana:3000
  ports:
    - "3007:3007"
  volumes:
    - ./logs/monitoring-service:/app/logs
  networks:
    - platform-network
  depends_on:
    - postgres
    - redis
    - prometheus
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3007/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Kubernetes 部署 (企业版功能)
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monitoring-service
  template:
    metadata:
      labels:
        app: monitoring-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3008"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: monitoring-service
        image: monitoring-service:latest
        ports:
        - containerPort: 3008
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: INFLUXDB_URL
          valueFrom:
            configMapKeyRef:
              name: monitoring-config
              key: influxdb-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3008
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3008
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: monitoring-service
  labels:
    app: monitoring-service
spec:
  selector:
    app: monitoring-service
  ports:
    - port: 80
      targetPort: 3008
      name: http
  type: ClusterIP
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

这个监控告警服务将为整个微服务平台提供全面的可观测性能力，包括指标收集、健康监控、告警管理、SLA跟踪等功能，确保系统的可靠性和性能。