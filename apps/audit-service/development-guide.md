# 日志审计服务开发文档 - 标准版本

## 🎯 服务概述

日志审计服务是微服务平台的合规与安全核心，面向**100租户+10万用户**的企业级生产系统，负责系统日志收集、审计追踪、合规性管理、安全事件分析等功能，为整个平台提供完整的操作记录和安全监控能力。

### 🎯 标准版本定位
- **审计规模**: 支持100租户+10万用户的全量审计
- **日志处理**: 日处理100万条审计记录 (标准版本适用)
- **合规要求**: 支持GDPR、SOX等国际合规标准
- **存储能力**: 支持3年审计数据存储和快速检索
- **部署方式**: Docker Compose + PostgreSQL全文搜索

## 🛠️ 技术栈

### 后端技术 (标准版本)
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (审计数据 + 全文搜索 + 时序数据) + Redis 7+ (缓存)
- **搜索引擎**: PostgreSQL全文搜索 (标准版本适用)
- **消息队列**: Redis Streams (标准版本选择)
- **ORM**: Prisma ORM
- **日志处理**: Winston + PostgreSQL存储

### 分析技术 (标准版本)
- **实时分析**: PostgreSQL窗口函数 + Redis统计
- **批处理**: Node.js定时任务 (适合标准版本)
- **异常检测**: 基于规则的检测 + 统计分析
- **时序数据**: PostgreSQL时序扩展 (无需额外组件)
- **日志搜索**: PostgreSQL全文搜索 (替代Elasticsearch)

### 监控技术 (标准版本)
- **日志聚合**: Winston + PostgreSQL (简化日志存储)
- **指标监控**: Prometheus + Grafana
- **链路追踪**: Winston结构化日志 + 请求ID追踪
- **健康检查**: NestJS Health Check

## 📋 完整功能列表

### 1. 审计事件管理
```typescript
// 审计事件实体定义
interface AuditEvent {
  id: string
  tenantId: string
  userId?: string
  sessionId?: string
  eventType: AuditEventType
  resource: string
  resourceId?: string
  action: string
  outcome: 'success' | 'failure' | 'partial'
  severity: 'low' | 'medium' | 'high' | 'critical'
  sourceIp: string
  userAgent?: string
  location?: GeoLocation
  requestId?: string
  correlationId?: string
  metadata: Record<string, any>
  beforeData?: any
  afterData?: any
  timestamp: Date
  processingTime?: number
}

// 审计事件类型
enum AuditEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM_CONFIGURATION = 'system_configuration',
  USER_MANAGEMENT = 'user_management',
  FILE_OPERATION = 'file_operation',
  API_CALL = 'api_call',
  SECURITY_EVENT = 'security_event',
  COMPLIANCE_EVENT = 'compliance_event'
}

// 地理位置信息
interface GeoLocation {
  country: string
  region: string
  city: string
  latitude?: number
  longitude?: number
  timezone: string
}

// 审计事件服务接口
interface AuditEventService {
  logEvent(event: CreateAuditEventDto): Promise<AuditEvent>
  logBatchEvents(events: CreateAuditEventDto[]): Promise<AuditEvent[]>
  getEvent(id: string): Promise<AuditEvent>
  searchEvents(query: AuditSearchQuery): Promise<AuditSearchResult>
  getEventsByUser(userId: string, tenantId: string, options?: QueryOptions): Promise<AuditEvent[]>
  getEventsByResource(resource: string, resourceId: string, options?: QueryOptions): Promise<AuditEvent[]>
  deleteExpiredEvents(retentionDays: number): Promise<number>
}
```

### 2. 日志收集与处理
```typescript
// 系统日志实体
interface SystemLog {
  id: string
  tenantId?: string
  service: string
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  exception?: {
    type: string
    message: string
    stackTrace: string
  }
  requestId?: string
  correlationId?: string
  userId?: string
  metadata: Record<string, any>
}

// 日志级别
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

// 日志收集器接口
interface LogCollector {
  collect(serviceName: string, logs: SystemLog[]): Promise<void>
  subscribe(callback: (logs: SystemLog[]) => void): void
  unsubscribe(): void
  flush(): Promise<void>
}

// 日志处理管道
interface LogProcessor {
  process(log: SystemLog): Promise<ProcessedLog>
  enrich(log: SystemLog): Promise<EnrichedLog>
  filter(log: SystemLog): boolean
  transform(log: SystemLog): Promise<TransformedLog>
}

// 日志聚合服务
interface LogAggregationService {
  aggregateByService(timeRange: TimeRange): Promise<ServiceLogStats[]>
  aggregateByLevel(timeRange: TimeRange): Promise<LogLevelStats[]>
  aggregateByUser(timeRange: TimeRange): Promise<UserLogStats[]>
  detectAnomalies(timeRange: TimeRange): Promise<LogAnomaly[]>
  generateReport(reportType: string, timeRange: TimeRange): Promise<LogReport>
}
```

### 3. 合规性管理
```typescript
// 合规规则定义
interface ComplianceRule {
  id: string
  name: string
  description: string
  regulation: 'GDPR' | 'HIPAA' | 'SOX' | 'PCI_DSS' | 'CUSTOM'
  category: string
  conditions: RuleCondition[]
  actions: RuleAction[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

// 规则条件
interface RuleCondition {
  field: string
  operator: 'equals' | 'contains' | 'regex' | 'range' | 'exists'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

// 规则动作
interface RuleAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'escalate'
  parameters: Record<string, any>
}

// 合规检查结果
interface ComplianceCheck {
  id: string
  ruleId: string
  eventId: string
  tenantId: string
  result: 'compliant' | 'non_compliant' | 'warning'
  details: string
  remediation?: string
  checkedAt: Date
}

// 合规性服务
interface ComplianceService {
  createRule(rule: CreateComplianceRuleDto): Promise<ComplianceRule>
  updateRule(id: string, rule: UpdateComplianceRuleDto): Promise<ComplianceRule>
  deleteRule(id: string): Promise<void>
  checkCompliance(event: AuditEvent): Promise<ComplianceCheck[]>
  runComplianceReport(tenantId: string, timeRange: TimeRange): Promise<ComplianceReport>
  getViolations(tenantId: string, options?: QueryOptions): Promise<ComplianceViolation[]>
}
```

### 4. 安全事件分析
```typescript
// 安全事件实体
interface SecurityEvent {
  id: string
  tenantId: string
  eventType: SecurityEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  sourceIp: string
  targetResource: string
  attackVector?: string
  indicators: SecurityIndicator[]
  relatedEvents: string[]
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  assignedTo?: string
  resolvedAt?: Date
  resolution?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// 安全事件类型
enum SecurityEventType {
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  MALWARE_DETECTION = 'malware_detection',
  DDoS_ATTACK = 'ddos_attack',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  ANOMALOUS_ACTIVITY = 'anomalous_activity'
}

// 安全指标
interface SecurityIndicator {
  type: 'ip' | 'domain' | 'hash' | 'user_agent' | 'pattern'
  value: string
  confidence: number
  source: string
}

// 威胁检测引擎
interface ThreatDetectionEngine {
  detectThreats(events: AuditEvent[]): Promise<SecurityEvent[]>
  updateThreatIntelligence(): Promise<void>
  analyzeBehavior(userId: string, timeRange: TimeRange): Promise<BehaviorAnalysis>
  detectAnomalies(data: any[]): Promise<Anomaly[]>
  correlateEvents(events: AuditEvent[]): Promise<CorrelatedEvent[]>
}

// 行为分析结果
interface BehaviorAnalysis {
  userId: string
  normalPatterns: BehaviorPattern[]
  anomalies: BehaviorAnomaly[]
  riskScore: number
  recommendations: string[]
}
```

### 5. 实时监控与告警
```typescript
// 告警规则
interface AlertRule {
  id: string
  name: string
  description: string
  query: string  // PostgreSQL SQL query for standard version
  condition: AlertCondition
  severity: 'info' | 'warning' | 'error' | 'critical'
  channels: NotificationChannel[]
  cooldown: number  // seconds
  isActive: boolean
  tenantId?: string
  createdAt: Date
  updatedAt: Date
}

// 告警条件
interface AlertCondition {
  aggregation: 'count' | 'sum' | 'avg' | 'max' | 'min'
  threshold: number
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'
  timeWindow: number  // minutes
}

// 通知渠道
interface NotificationChannel {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams'
  config: Record<string, any>
}

// 告警实例
interface Alert {
  id: string
  ruleId: string
  tenantId: string
  title: string
  description: string
  severity: string
  status: 'open' | 'acknowledged' | 'resolved'
  triggerValue: number
  threshold: number
  query: string
  rawData: any
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolvedBy?: string
  resolvedAt?: Date
  createdAt: Date
}

// 实时监控服务
interface RealTimeMonitoringService {
  createAlertRule(rule: CreateAlertRuleDto): Promise<AlertRule>
  updateAlertRule(id: string, rule: UpdateAlertRuleDto): Promise<AlertRule>
  deleteAlertRule(id: string): Promise<void>
  evaluateRules(): Promise<Alert[]>
  acknowledgeAlert(alertId: string, userId: string): Promise<void>
  resolveAlert(alertId: string, userId: string, resolution: string): Promise<void>
  getActiveAlerts(tenantId?: string): Promise<Alert[]>
}
```

## 🗄️ 数据库设计

### PostgreSQL 表结构 (审计数据)
```sql
-- 审计事件表
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  session_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  source_ip INET NOT NULL,
  user_agent TEXT,
  location JSONB,
  request_id VARCHAR(255),
  correlation_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  before_data JSONB,
  after_data JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  processing_time INTEGER,
  
  INDEX idx_audit_tenant_time (tenant_id, timestamp),
  INDEX idx_audit_user_time (user_id, timestamp),
  INDEX idx_audit_resource (resource, resource_id),
  INDEX idx_audit_event_type (event_type, timestamp),
  INDEX idx_audit_correlation (correlation_id),
  INDEX idx_audit_severity (severity, timestamp)
);

-- 合规规则表
CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  regulation VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  severity VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_compliance_tenant (tenant_id),
  INDEX idx_compliance_regulation (regulation),
  INDEX idx_compliance_active (is_active)
);

-- 合规检查结果表
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES compliance_rules(id),
  event_id UUID NOT NULL REFERENCES audit_events(id),
  tenant_id UUID NOT NULL,
  result VARCHAR(20) NOT NULL,
  details TEXT,
  remediation TEXT,
  checked_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_compliance_checks_tenant (tenant_id, checked_at),
  INDEX idx_compliance_checks_rule (rule_id, checked_at),
  INDEX idx_compliance_checks_result (result, checked_at)
);

-- 安全事件表
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_ip INET,
  target_resource VARCHAR(255),
  attack_vector VARCHAR(100),
  indicators JSONB DEFAULT '[]',
  related_events JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMP,
  resolution TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_security_tenant_status (tenant_id, status),
  INDEX idx_security_type_severity (event_type, severity),
  INDEX idx_security_assigned (assigned_to),
  INDEX idx_security_created (created_at)
);

-- 告警规则表
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  condition JSONB NOT NULL,
  severity VARCHAR(20) NOT NULL,
  channels JSONB NOT NULL,
  cooldown INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_alert_rules_tenant (tenant_id),
  INDEX idx_alert_rules_active (is_active)
);

-- 告警实例表
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id),
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  trigger_value DECIMAL,
  threshold DECIMAL,
  query TEXT,
  raw_data JSONB,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  resolved_by UUID,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_alerts_tenant_status (tenant_id, status),
  INDEX idx_alerts_rule (rule_id, created_at),
  INDEX idx_alerts_severity (severity, created_at)
);
```

### PostgreSQL 日志表结构 (标准版本)
```sql
-- 系统日志表 (PostgreSQL)
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  service VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  context JSONB,
  exception JSONB,
  request_id VARCHAR(255),
  correlation_id VARCHAR(255),
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  
  INDEX idx_system_logs_service_time (service, timestamp),
  INDEX idx_system_logs_level_time (level, timestamp),
  INDEX idx_system_logs_tenant_time (tenant_id, timestamp),
  INDEX idx_system_logs_correlation (correlation_id)
);

-- 日志统计表 (使用PostgreSQL代替ClickHouse)
CREATE TABLE log_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL,
  hour_bucket TIMESTAMP NOT NULL,
  count INTEGER NOT NULL,
  unique_users INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(service, level, hour_bucket)
);

-- 错误日志聚合表
CREATE TABLE error_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMP NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  date_bucket DATE NOT NULL,
  
  UNIQUE(service, error_type, error_message, date_bucket)
);
```

### Redis 数据结构
```typescript
// 实时监控缓存
interface RedisMonitoringCache {
  // 实时指标
  'metrics:realtime:{service}': {
    requestCount: number
    errorCount: number
    avgResponseTime: number
    timestamp: number
  }
  
  // 告警状态
  'alerts:active': string[]  // alert IDs
  'alert:cooldown:{ruleId}': number  // cooldown timestamp
  
  // 用户会话追踪
  'session:activity:{sessionId}': {
    userId: string
    tenantId: string
    lastActivity: number
    actions: string[]
  }
  
  // 威胁情报缓存
  'threat:ip:{ip}': {
    reputation: number
    lastSeen: number
    sources: string[]
  }
  
  // 异常检测缓存
  'anomaly:user:{userId}': {
    normalPattern: any
    lastUpdate: number
    anomalyScore: number
  }
}
```

## 🔗 API设计

### RESTful API 端点
```typescript
// 审计事件 API
@Controller('audit-events')
export class AuditEventController {
  @Post()
  @ApiOperation({ summary: 'Log audit event' })
  async logEvent(@Body() event: CreateAuditEventDto, @Req() req: AuthenticatedRequest) {
    return this.auditService.logEvent({
      ...event,
      tenantId: req.tenantId,
      userId: req.user?.id
    })
  }

  @Post('batch')
  @ApiOperation({ summary: 'Log multiple audit events' })
  async logBatchEvents(@Body() events: CreateAuditEventDto[], @Req() req: AuthenticatedRequest) {
    return this.auditService.logBatchEvents(
      events.map(event => ({
        ...event,
        tenantId: req.tenantId,
        userId: req.user?.id
      }))
    )
  }

  @Get()
  @ApiOperation({ summary: 'Search audit events' })
  async searchEvents(@Query() query: AuditSearchQueryDto) {
    return this.auditService.searchEvents(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit event by ID' })
  async getEvent(@Param('id') id: string) {
    return this.auditService.getEvent(id)
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get events by user' })
  async getEventsByUser(@Param('userId') userId: string, @Query() query: QueryOptionsDto) {
    return this.auditService.getEventsByUser(userId, query.tenantId, query)
  }

  @Get('resource/:resource/:resourceId')
  @ApiOperation({ summary: 'Get events by resource' })
  async getEventsByResource(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
    @Query() query: QueryOptionsDto
  ) {
    return this.auditService.getEventsByResource(resource, resourceId, query)
  }
}

// 合规性管理 API
@Controller('compliance')
export class ComplianceController {
  @Post('rules')
  @Roles('admin', 'compliance_officer')
  async createRule(@Body() rule: CreateComplianceRuleDto) {
    return this.complianceService.createRule(rule)
  }

  @Get('rules')
  async listRules(@Query() query: ListRulesDto) {
    return this.complianceService.listRules(query)
  }

  @Put('rules/:id')
  @Roles('admin', 'compliance_officer')
  async updateRule(@Param('id') id: string, @Body() rule: UpdateComplianceRuleDto) {
    return this.complianceService.updateRule(id, rule)
  }

  @Delete('rules/:id')
  @Roles('admin')
  async deleteRule(@Param('id') id: string) {
    return this.complianceService.deleteRule(id)
  }

  @Post('check')
  async checkCompliance(@Body() event: AuditEvent) {
    return this.complianceService.checkCompliance(event)
  }

  @Get('reports/:tenantId')
  async getComplianceReport(
    @Param('tenantId') tenantId: string,
    @Query() timeRange: TimeRangeDto
  ) {
    return this.complianceService.runComplianceReport(tenantId, timeRange)
  }

  @Get('violations/:tenantId')
  async getViolations(@Param('tenantId') tenantId: string, @Query() query: QueryOptionsDto) {
    return this.complianceService.getViolations(tenantId, query)
  }
}

// 安全事件 API
@Controller('security-events')
export class SecurityEventController {
  @Get()
  async listSecurityEvents(@Query() query: ListSecurityEventsDto) {
    return this.securityService.listSecurityEvents(query)
  }

  @Get(':id')
  async getSecurityEvent(@Param('id') id: string) {
    return this.securityService.getSecurityEvent(id)
  }

  @Put(':id/status')
  @Roles('security_analyst', 'admin')
  async updateEventStatus(
    @Param('id') id: string,
    @Body() update: UpdateSecurityEventStatusDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.securityService.updateEventStatus(id, update, req.user.id)
  }

  @Post(':id/assign')
  @Roles('security_analyst', 'admin')
  async assignEvent(
    @Param('id') id: string,
    @Body() assignment: AssignSecurityEventDto
  ) {
    return this.securityService.assignEvent(id, assignment.assignedTo)
  }

  @Post('detect')
  async detectThreats(@Body() events: AuditEvent[]) {
    return this.threatDetectionService.detectThreats(events)
  }

  @Get('analytics/behavior/:userId')
  async analyzeBehavior(
    @Param('userId') userId: string,
    @Query() timeRange: TimeRangeDto
  ) {
    return this.threatDetectionService.analyzeBehavior(userId, timeRange)
  }
}

// 告警管理 API
@Controller('alerts')
export class AlertController {
  @Post('rules')
  @Roles('admin', 'operator')
  async createAlertRule(@Body() rule: CreateAlertRuleDto) {
    return this.alertService.createAlertRule(rule)
  }

  @Get('rules')
  async listAlertRules(@Query() query: ListAlertRulesDto) {
    return this.alertService.listAlertRules(query)
  }

  @Put('rules/:id')
  @Roles('admin', 'operator')
  async updateAlertRule(@Param('id') id: string, @Body() rule: UpdateAlertRuleDto) {
    return this.alertService.updateAlertRule(id, rule)
  }

  @Delete('rules/:id')
  @Roles('admin')
  async deleteAlertRule(@Param('id') id: string) {
    return this.alertService.deleteAlertRule(id)
  }

  @Get()
  async getActiveAlerts(@Query() query: GetAlertsDto) {
    return this.alertService.getActiveAlerts(query.tenantId)
  }

  @Post(':id/acknowledge')
  async acknowledgeAlert(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.alertService.acknowledgeAlert(id, req.user.id)
  }

  @Post(':id/resolve')
  async resolveAlert(
    @Param('id') id: string,
    @Body() resolution: ResolveAlertDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.alertService.resolveAlert(id, req.user.id, resolution.resolution)
  }
}
```

### 日志收集 API
```typescript
// 日志收集端点
@Controller('logs')
export class LogCollectionController {
  @Post('ingest')
  @ApiOperation({ summary: 'Ingest system logs' })
  @ApiConsumes('application/json', 'application/x-ndjson')
  async ingestLogs(@Body() logs: SystemLog[]) {
    return this.logCollectionService.ingestLogs(logs)
  }

  @Post('ingest/bulk')
  @ApiOperation({ summary: 'Bulk ingest logs' })
  async bulkIngestLogs(@Body() request: BulkIngestRequest) {
    return this.logCollectionService.bulkIngest(request)
  }

  @Get('search')
  @ApiOperation({ summary: 'Search logs' })
  async searchLogs(@Query() query: LogSearchQuery) {
    return this.logSearchService.search(query)
  }

  @Get('aggregations')
  @ApiOperation({ summary: 'Get log aggregations' })
  async getAggregations(@Query() query: LogAggregationQuery) {
    return this.logAggregationService.aggregate(query)
  }

  @Get('export')
  @ApiOperation({ summary: 'Export logs' })
  async exportLogs(@Query() query: LogExportQuery, @Res() res: Response) {
    const stream = await this.logExportService.export(query)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=logs.json')
    stream.pipe(res)
  }
}
```

## 🔄 服务间交互设计

### 内部API设计原则
- **认证方式**: X-Service-Token内部服务令牌
- **数据格式**: JSON
- **错误处理**: 统一错误码和消息格式
- **性能要求**: 内部API响应时间 < 50ms
- **容错机制**: 审计失败不应影响业务操作

### 1. 审计事件接收接口
```typescript
// 所有服务 → 审计服务 (3008)
// 记录审计事件 (内部API)
POST http://audit-service:3008/internal/events
Headers: X-Service-Token: {内部服务令牌}
Body: AuditEvent

// 批量记录审计事件
POST http://audit-service:3008/internal/events/batch  
Headers: X-Service-Token: {内部服务令牌}
Body: AuditEvent[]
```

### 2. 与认证服务的交互
```typescript
// 审计服务 → 认证服务 (3001)
// 验证操作者身份
POST http://auth-service:3001/internal/auth/verify-token
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Body: { "token": "jwt_token" }
Response: { 
  "valid": true, 
  "payload": JWTPayload, 
  "user": User,
  "sessionId": "session_uuid"
}

// 获取会话信息
GET http://auth-service:3001/internal/auth/sessions/{sessionId}
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Response: {
  "sessionId": "session_uuid",
  "userId": "user_uuid", 
  "tenantId": "tenant_uuid",
  "isActive": true
}
```

### 3. 与用户服务的交互 
```typescript
// 审计服务 → 用户管理服务 (3003)
// 获取用户详细信息
GET http://user-management-service:3003/internal/users/{userId}
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Response: {
  "id": "user_uuid",
  "tenantId": "tenant_uuid",
  "username": "username",
  "email": "user@example.com",
  "status": "active"
}

// 批量获取用户信息
POST http://user-management-service:3003/internal/users/batch-query
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Body: { 
  "userIds": ["user1", "user2"], 
  "tenantId": "tenant_id" 
}
Response: {
  "users": [
    {"id": "user1", "username": "user1", "email": "user1@example.com"},
    {"id": "user2", "username": "user2", "email": "user2@example.com"}
  ],
  "notFound": []
}
```

### 4. 与权限服务的交互
```typescript
// 审计服务 → 权限管理服务 (3002)
// 记录权限变更审计
POST http://rbac-service:3002/internal/audit/permission-change
Headers: X-Service-Token: {内部服务令牌}
Body: {
  "userId": "user_id",
  "changedBy": "admin_id", 
  "changeType": "role_assigned",
  "beforeData": [],
  "afterData": ["admin_role"]
}
```

### 5. 与通知服务的交互
```typescript
// 审计服务 → 通知服务 (3005)
// 发送合规告警通知
POST http://notification-service:3005/internal/notifications/send
Headers: X-Service-Token: {内部服务令牌}
Body: {
  "recipientId": "compliance_officer_id",
  "recipientType": "user",
  "channel": "email", 
  "templateId": "compliance_violation_alert",
  "variables": {
    "violationType": "GDPR_DATA_ACCESS",
    "userId": "violating_user_id",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

### 🎯 事件驱动架构改造

#### 从同步API调用转为事件监听模式

**改造前问题**：
- 依赖其他服务主动调用审计API记录日志
- 紧耦合，审计失败可能影响业务操作
- 无法保证所有操作都被审计

**改造后优势**：
- 自动监听系统事件，确保审计完整性
- 异步处理，不影响业务操作性能
- 支持事件重放和补偿机制

```typescript
// 事件驱动审计服务架构
@Injectable()
export class EventDrivenAuditService {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly auditRepository: AuditRepository,
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}
  
  // 统一事件处理入口
  async handleAuditEvent(event: BaseEvent): Promise<void> {
    try {
      const auditEvent = await this.convertToAuditEvent(event);
      await this.auditRepository.save(auditEvent);
      
      // 检查是否需要合规告警
      await this.checkComplianceViolation(auditEvent);
      
      this.logger.log(`Audit event recorded: ${event.eventType}:${event.eventId}`);
      
    } catch (error) {
      this.logger.error(`Failed to record audit event: ${error.message}`);
      // 审计失败不应影响原业务，但需要记录失败日志
      await this.recordAuditFailure(event, error);
    }
  }
  
  // 将业务事件转换为审计事件
  private async convertToAuditEvent(event: BaseEvent): Promise<AuditEvent> {
    // 获取用户信息（如果有userId）
    let userInfo = null;
    if (event.userId) {
      userInfo = await this.userService.getUserInfo(event.userId);
    }
    
    return {
      id: generateId(),
      tenantId: event.tenantId,
      userId: event.userId,
      sessionId: event.sessionId,
      eventType: this.mapEventTypeToAuditType(event.eventType),
      resource: event.aggregateType?.toLowerCase() || 'unknown',
      resourceId: event.aggregateId,
      action: this.extractActionFromEvent(event),
      outcome: this.determineOutcome(event),
      severity: this.calculateSeverity(event.eventType),
      sourceIp: event.metadata?.sourceIp,
      userAgent: event.metadata?.userAgent,
      requestId: event.requestId,
      correlationId: event.correlationId,
      metadata: {
        originalEvent: event,
        userInfo: userInfo,
        processingTime: Date.now() - new Date(event.timestamp).getTime()
      },
      beforeData: event.metadata?.beforeData,
      afterData: event.eventData,
      timestamp: new Date(event.timestamp),
      processedAt: new Date()
    };
  }
  
  // 事件类型映射
  private mapEventTypeToAuditType(eventType: string): AuditEventType {
    const mappings: Record<string, AuditEventType> = {
      'user.login': AuditEventType.AUTHENTICATION,
      'user.login_failed': AuditEventType.AUTHENTICATION,
      'user.created': AuditEventType.USER_MANAGEMENT,
      'user.updated': AuditEventType.USER_MANAGEMENT,
      'user.deleted': AuditEventType.USER_MANAGEMENT,
      'user.status_changed': AuditEventType.USER_MANAGEMENT,
      'role.assigned': AuditEventType.AUTHORIZATION,
      'role.revoked': AuditEventType.AUTHORIZATION,
      'permission.checked': AuditEventType.AUTHORIZATION,
      'session.revoked': AuditEventType.AUTHENTICATION,
      'password.changed': AuditEventType.SECURITY_EVENT,
      'password.reset': AuditEventType.SECURITY_EVENT
    };
    
    return mappings[eventType] || AuditEventType.SYSTEM_CONFIGURATION;
  }
}

// 专门的事件处理器
@Injectable()
export class AuditEventHandler implements EventHandler {
  constructor(
    private readonly auditService: EventDrivenAuditService
  ) {}
  
  async handle(event: BaseEvent): Promise<void> {
    await this.auditService.handleAuditEvent(event);
  }
}
```

#### 事件订阅配置

```typescript
// 审计服务启动时的事件订阅配置
@Injectable()
export class AuditServiceBootstrap {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly auditEventHandler: AuditEventHandler
  ) {}
  
  async onApplicationBootstrap(): Promise<void> {
    // 订阅所有需要审计的事件类型
    const auditableEvents = [
      // 用户相关事件
      'user.created',
      'user.updated', 
      'user.deleted',
      'user.status_changed',
      'user.password_changed',
      
      // 认证相关事件
      'user.login',
      'user.login_failed',
      'session.created',
      'session.revoked',
      'password.reset',
      
      // 权限相关事件
      'role.assigned',
      'role.revoked',
      'role.created',
      'role.updated',
      'permission.checked',
      
      // 系统配置事件
      'tenant.created',
      'tenant.updated',
      'system.configuration_changed',
      
      // 数据访问事件
      'data.accessed',
      'data.exported',
      'data.imported',
      'data.deleted',
      
      // 安全事件
      'security.violation_detected',
      'security.suspicious_activity',
      'security.policy_changed'
    ];
    
    // 注册事件订阅
    await this.eventBus.subscribeToEvents(
      auditableEvents,
      'audit-service-consumer-group',
      'audit-service-instance-1',
      this.auditEventHandler
    );
    
    console.log(`Audit service subscribed to ${auditableEvents.length} event types`);
  }
}
```

#### 实时审计分析引擎

```typescript
// 实时审计分析和告警
@Injectable()
export class RealTimeAuditAnalyzer {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly redis: Redis
  ) {}
  
  async analyzeAuditEvent(auditEvent: AuditEvent): Promise<void> {
    // 1. 检查异常登录模式
    await this.checkAnomalousLogin(auditEvent);
    
    // 2. 检查权限滥用
    await this.checkPermissionAbuse(auditEvent);
    
    // 3. 检查数据访问异常
    await this.checkDataAccessAnomalies(auditEvent);
    
    // 4. 检查合规性违规
    await this.checkComplianceViolations(auditEvent);
  }
  
  private async checkAnomalousLogin(auditEvent: AuditEvent): Promise<void> {
    if (auditEvent.eventType !== AuditEventType.AUTHENTICATION) return;
    
    const userId = auditEvent.userId;
    if (!userId) return;
    
    // 检查异地登录
    const lastLoginLocation = await this.redis.get(`last_login_location:${userId}`);
    const currentLocation = auditEvent.metadata?.location;
    
    if (lastLoginLocation && currentLocation) {
      const distance = this.calculateDistance(
        JSON.parse(lastLoginLocation),
        currentLocation
      );
      
      // 如果距离超过1000公里且时间间隔小于1小时，触发告警
      if (distance > 1000) {
        const lastLoginTime = await this.redis.get(`last_login_time:${userId}`);
        const timeDiff = Date.now() - parseInt(lastLoginTime || '0');
        
        if (timeDiff < 3600000) { // 1小时
          await this.sendSecurityAlert({
            type: 'anomalous_login',
            userId,
            details: `Suspicious login detected: ${distance}km in ${timeDiff/60000} minutes`,
            auditEventId: auditEvent.id
          });
        }
      }
    }
    
    // 更新最后登录信息
    await this.redis.set(`last_login_location:${userId}`, JSON.stringify(currentLocation));
    await this.redis.set(`last_login_time:${userId}`, Date.now().toString());
  }
  
  private async checkPermissionAbuse(auditEvent: AuditEvent): Promise<void> {
    if (auditEvent.eventType !== AuditEventType.AUTHORIZATION) return;
    
    const userId = auditEvent.userId;
    if (!userId) return;
    
    // 检查短时间内大量权限检查
    const key = `permission_checks:${userId}:${Math.floor(Date.now() / 60000)}`; // 按分钟统计
    const checkCount = await this.redis.incr(key);
    await this.redis.expire(key, 60);
    
    if (checkCount > 100) { // 1分钟内超过100次权限检查
      await this.sendSecurityAlert({
        type: 'permission_abuse',
        userId,
        details: `High frequency permission checks: ${checkCount} in 1 minute`,
        auditEventId: auditEvent.id
      });
    }
  }
  
  private async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    // 发送安全告警事件
    const securityEvent = new SecurityViolationEvent(
      alert.userId,
      {
        violationType: alert.type,
        details: alert.details,
        auditEventId: alert.auditEventId,
        severity: 'high',
        detectedAt: new Date().toISOString()
      },
      auditEvent.tenantId
    );
    
    await this.eventBus.publishEvent(securityEvent);
  }
}

// 安全违规事件定义
class SecurityViolationEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      violationType: string;
      details: string;
      auditEventId: string;
      severity: string;
      detectedAt: string;
    },
    tenantId: string
  ) {
    super(userId, 'SecurityViolation', eventData, {
      source: 'audit-service',
      causedBy: 'security_analysis'
    }, tenantId, userId);
  }
}
```

#### 审计数据流水线

```typescript
// 审计数据处理流水线
@Injectable()
export class AuditDataPipeline {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly auditRepository: AuditRepository,
    private readonly searchIndex: AuditSearchService,
    private readonly dataWarehouse: AuditDataWarehouse
  ) {}
  
  async processAuditEvent(event: BaseEvent): Promise<void> {
    // 并行处理审计数据
    await Promise.allSettled([
      // 1. 存储到主数据库
      this.storeToDatabase(event),
      
      // 2. 索引到搜索引擎 (PostgreSQL全文搜索)
      this.indexForSearch(event),
      
      // 3. 推送到数据仓库 (用于分析)
      this.pushToDataWarehouse(event),
      
      // 4. 实时分析
      this.analyzeInRealTime(event),
      
      // 5. 合规性检查
      this.checkCompliance(event)
    ]);
  }
  
  private async storeToDatabase(event: BaseEvent): Promise<void> {
    const auditEvent = await this.convertToAuditEvent(event);
    await this.auditRepository.save(auditEvent);
  }
  
  private async indexForSearch(event: BaseEvent): Promise<void> {
    // 使用PostgreSQL全文搜索索引
    await this.searchIndex.indexEvent(event);
  }
  
  private async pushToDataWarehouse(event: BaseEvent): Promise<void> {
    // 异步推送到数据仓库进行长期分析
    const warehouseEvent = {
      ...event,
      warehouseTimestamp: new Date().toISOString(),
      partition: this.calculatePartition(event.timestamp)
    };
    
    await this.dataWarehouse.store(warehouseEvent);
  }
}
```

#### 合规性自动检查

```typescript
// GDPR/SOX等合规性自动检查
@Injectable()
export class ComplianceChecker {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService
  ) {}
  
  async checkEventCompliance(auditEvent: AuditEvent): Promise<void> {
    // GDPR合规性检查
    await this.checkGDPRCompliance(auditEvent);
    
    // SOX合规性检查
    await this.checkSOXCompliance(auditEvent);
    
    // 自定义合规规则检查
    await this.checkCustomComplianceRules(auditEvent);
  }
  
  private async checkGDPRCompliance(auditEvent: AuditEvent): Promise<void> {
    // 检查个人数据访问
    if (this.isPersonalDataAccess(auditEvent)) {
      // 验证是否有合法依据
      const hasLegalBasis = await this.verifyLegalBasis(auditEvent);
      
      if (!hasLegalBasis) {
        await this.reportComplianceViolation({
          type: 'GDPR_VIOLATION',
          description: 'Personal data accessed without legal basis',
          auditEventId: auditEvent.id,
          severity: 'critical'
        });
      }
      
      // 检查数据保留期限
      await this.checkDataRetentionPolicy(auditEvent);
    }
  }
  
  private async reportComplianceViolation(violation: ComplianceViolation): Promise<void> {
    const complianceEvent = new ComplianceViolationEvent(
      violation.auditEventId,
      violation,
      auditEvent.tenantId
    );
    
    await this.eventBus.publishEvent(complianceEvent);
  }
}

class ComplianceViolationEvent extends DomainEvent {
  constructor(
    auditEventId: string,
    violationData: ComplianceViolation,
    tenantId: string
  ) {
    super(auditEventId, 'ComplianceViolation', violationData, {
      source: 'audit-service',
      causedBy: 'compliance_check'
    }, tenantId);
  }
}
```

## ⚡ 性能优化

### 数据库性能优化
```sql
-- 分区策略 (按时间分区)
CREATE TABLE audit_events_2024_q1 PARTITION OF audit_events
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- 索引优化
CREATE INDEX CONCURRENTLY idx_audit_tenant_time_partial 
ON audit_events (tenant_id, timestamp) 
WHERE timestamp > NOW() - INTERVAL '30 days';

-- 定期清理过期数据
DELETE FROM audit_events 
WHERE timestamp < NOW() - INTERVAL '3 years';
```

### 缓存策略
```typescript
// Redis缓存热点查询
@Injectable()
export class AuditCacheService {
  private readonly ttl = 3600; // 1小时

  async getCachedUserEvents(userId: string): Promise<AuditEvent[]> {
    const cacheKey = `user:events:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const events = await this.auditService.getEventsByUser(userId);
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(events));
    
    return events;
  }
}
```

### 批量处理优化
```typescript
// 批量写入优化
@Injectable()
export class AuditBatchProcessor {
  private readonly batchSize = 1000;
  private readonly flushInterval = 5000; // 5秒

  async processBatch(events: AuditEvent[]): Promise<void> {
    const chunks = this.chunkArray(events, this.batchSize);
    
    for (const chunk of chunks) {
      await this.repository.insertMany(chunk);
    }
  }
}
```

## 🛡️ 安全措施

### 数据安全
- **数据加密**: 敏感数据AES-256加密存储
- **传输安全**: HTTPS强制，TLS 1.3协议
- **数据脱敏**: 日志中隐藏敏感信息
- **备份安全**: 加密备份，异地存储

### 访问控制
- **身份认证**: JWT令牌验证，支持令牌刷新
- **权限控制**: 基于RBAC的细粒度权限管理
- **API安全**: 请求频率限制，防止暴力攻击
- **输入验证**: 严格的参数验证，防止注入攻击

### 内部服务安全
- **服务认证**: X-Service-Token内部服务认证
- **网络隔离**: Docker网络隔离，最小权限原则
- **密钥管理**: 环境变量管理敏感配置
- **审计日志**: 完整的操作审计链路

### 合规安全
```typescript
// GDPR数据处理审计
@Injectable()
export class GDPRAuditService {
  async logDataAccess(userId: string, dataType: string, purpose: string) {
    await this.auditService.logEvent({
      eventType: AuditEventType.DATA_ACCESS,
      resource: 'personal_data',
      resourceId: userId,
      action: 'read',
      metadata: {
        dataType,
        purpose,
        legalBasis: 'consent',
        retention: '3_years'
      }
    });
  }
}
```

## 🏗️ 核心架构实现

### 微服务集成
```typescript
// 审计装饰器 - 自动记录审计事件
export function Audit(options: AuditOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      let outcome: 'success' | 'failure' | 'partial' = 'success'
      let error: Error | null = null
      let result: any

      try {
        result = await method.apply(this, args)
        return result
      } catch (err) {
        error = err as Error
        outcome = 'failure'
        throw err
      } finally {
        const processingTime = Date.now() - startTime
        
        // 构造审计事件
        const auditEvent: CreateAuditEventDto = {
          eventType: options.eventType,
          resource: options.resource,
          resourceId: options.getResourceId?.(args, result),
          action: options.action || propertyName,
          outcome,
          metadata: {
            ...options.getMetadata?.(args, result),
            error: error?.message,
            processingTime
          }
        }

        // 异步记录审计事件
        setImmediate(() => {
          this.auditService?.logEvent(auditEvent).catch(console.error)
        })
      }
    }
  }
}

// 使用示例
@Injectable()
export class UserService {
  constructor(private auditService: AuditEventService) {}

  @Audit({
    eventType: AuditEventType.USER_MANAGEMENT,
    resource: 'user',
    action: 'create',
    getResourceId: (args, result) => result?.id,
    getMetadata: (args) => ({ email: args[0]?.email })
  })
  async createUser(userData: CreateUserDto): Promise<User> {
    // 用户创建逻辑
    return this.userRepository.create(userData)
  }

  @Audit({
    eventType: AuditEventType.DATA_MODIFICATION,
    resource: 'user',
    action: 'update',
    getResourceId: (args) => args[0],
    getMetadata: (args) => ({ updatedFields: Object.keys(args[1]) })
  })
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    // 用户更新逻辑
    return this.userRepository.update(id, updateData)
  }
}
```

### 日志中间件
```typescript
// 请求日志中间件
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private logger = new Logger(RequestLoggingMiddleware.name)

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()
    const requestId = req.headers['x-request-id'] || uuidv4()
    const correlationId = req.headers['x-correlation-id'] || uuidv4()

    // 设置请求标识
    req['requestId'] = requestId
    req['correlationId'] = correlationId
    res.setHeader('X-Request-ID', requestId)
    res.setHeader('X-Correlation-ID', correlationId)

    // 记录请求开始
    this.logger.log({
      message: 'Request started',
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId,
      correlationId
    })

    // 监听响应结束
    res.on('finish', () => {
      const processingTime = Date.now() - startTime
      
      this.logger.log({
        message: 'Request completed',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        processingTime,
        requestId,
        correlationId
      })

      // 如果是错误响应，记录详细信息
      if (res.statusCode >= 400) {
        this.logger.warn({
          message: 'Request failed',
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          processingTime,
          requestId,
          correlationId
        })
      }
    })

    next()
  }
}
```

## 🐳 部署配置

### Docker 配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3007

CMD ["node", "dist/main.js"]
```

### Docker Compose 标准版本配置
```yaml
# docker-compose.yml (标准版本)
version: '3.8'

networks:
  platform-network:
    driver: bridge
    name: platform-network

services:
  audit-service:
    build: .
    container_name: audit-service
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://platform_user:platform_pass@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379/8  # 使用数据库8
      - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
      - LOG_LEVEL=info
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config:ro
    networks:
      - platform-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3008/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 共享基础设施 (标准版本)
  postgres:
    image: postgres:15-alpine
    container_name: platform-postgres
    environment:
      POSTGRES_DB: platform_db
      POSTGRES_USER: audit_user
      POSTGRES_PASSWORD: audit_pass
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-audit-schema.sql:/docker-entrypoint-initdb.d/10-audit-schema.sql:ro
    networks:
      - platform-network
    ports:
      - "5432:5432"  # 仅开发环境
    mem_limit: 2g
    mem_reservation: 1g
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U audit_user -d platform_db"]
      interval: 30s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: platform-redis
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - platform-network
    ports:
      - "6379:6379"  # 仅开发环境
    mem_limit: 1g
    mem_reservation: 512m
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```


## 🧪 测试策略

### 单元测试
```typescript
describe('AuditEventService', () => {
  let service: AuditEventService;
  let repository: MockRepository<AuditEvent>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditEventService,
        {
          provide: getRepositoryToken(AuditEvent),
          useClass: MockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditEventService>(AuditEventService);
    repository = module.get(getRepositoryToken(AuditEvent));
  });

  it('should log audit event successfully', async () => {
    const eventData = {
      eventType: AuditEventType.USER_MANAGEMENT,
      resource: 'user',
      action: 'create',
      outcome: 'success' as const,
      tenantId: 'tenant-1',
      userId: 'user-1'
    };

    const result = await service.logEvent(eventData);
    
    expect(result).toBeDefined();
    expect(result.eventType).toBe(eventData.eventType);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(eventData));
  });

  it('should handle batch event logging', async () => {
    const events = [
      { eventType: AuditEventType.DATA_ACCESS, resource: 'file', action: 'read' },
      { eventType: AuditEventType.DATA_MODIFICATION, resource: 'user', action: 'update' }
    ];

    const result = await service.logBatchEvents(events);
    
    expect(result).toHaveLength(2);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('should search events with filters', async () => {
    const query = {
      tenantId: 'tenant-1',
      eventType: AuditEventType.USER_MANAGEMENT,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    await service.searchEvents(query);
    
    expect(repository.createQueryBuilder).toHaveBeenCalled();
  });
});
```

### 集成测试
```typescript
describe('AuditService E2E', () => {
  let app: INestApplication;
  let auditService: AuditEventService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    auditService = moduleFixture.get<AuditEventService>(AuditEventService);
    await app.init();
  });

  it('should create and retrieve audit event via API', async () => {
    const eventData = {
      eventType: 'user_management',
      resource: 'user',
      action: 'create',
      outcome: 'success',
      metadata: { email: 'test@example.com' }
    };

    const response = await request(app.getHttpServer())
      .post('/audit-events')
      .set('Authorization', `Bearer ${validJWT}`)
      .send(eventData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.eventType).toBe(eventData.eventType);

    // 验证可以检索到创建的事件
    const getResponse = await request(app.getHttpServer())
      .get(`/audit-events/${response.body.id}`)
      .set('Authorization', `Bearer ${validJWT}`)
      .expect(200);

    expect(getResponse.body.id).toBe(response.body.id);
  });

  it('should integrate with notification service for alerts', async () => {
    // 创建违规事件
    const violationEvent = {
      eventType: 'security_event',
      resource: 'system',
      action: 'unauthorized_access',
      outcome: 'failure',
      severity: 'critical'
    };

    await request(app.getHttpServer())
      .post('/audit-events')
      .set('Authorization', `Bearer ${validJWT}`)
      .send(violationEvent)
      .expect(201);

    // 验证告警是否被触发 (通过mock notification service)
    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'security_alert',
        severity: 'critical'
      })
    );
  });
});
```

### 性能测试
```typescript
describe('Audit Performance Tests', () => {
  it('should handle concurrent event logging', async () => {
    const concurrentRequests = 100;
    const promises = Array.from({ length: concurrentRequests }, (_, i) => 
      auditService.logEvent({
        eventType: AuditEventType.API_CALL,
        resource: 'api',
        action: 'request',
        outcome: 'success',
        metadata: { requestId: `req-${i}` }
      })
    );

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(results).toHaveLength(concurrentRequests);
    expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
  });

  it('should efficiently process large batch events', async () => {
    const batchSize = 1000;
    const events = Array.from({ length: batchSize }, (_, i) => ({
      eventType: AuditEventType.SYSTEM_CONFIGURATION,
      resource: 'config',
      action: 'update',
      outcome: 'success' as const,
      metadata: { configKey: `key-${i}` }
    }));

    const startTime = Date.now();
    await auditService.logBatchEvents(events);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(3000); // 3秒内完成批量处理
  });
});
```

### 负载测试
```bash
# 使用artillery进行负载测试
# audit-load-test.yml
config:
  target: 'http://localhost:3008'
  phases:
    - duration: 60
      arrivalRate: 50  # 每秒50个请求
    - duration: 120
      arrivalRate: 100 # 每秒100个请求

scenarios:
  - name: "Log audit events"
    weight: 80
    flow:
      - post:
          url: "/audit-events"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_JWT }}"
          json:
            eventType: "api_call"
            resource: "test"
            action: "load_test"
            outcome: "success"

  - name: "Search events"
    weight: 20
    flow:
      - get:
          url: "/audit-events"
          qs:
            limit: 10
            eventType: "api_call"
```

### 安全测试
```typescript
describe('Security Tests', () => {
  it('should reject requests without authentication', async () => {
    const eventData = {
      eventType: 'user_management',
      resource: 'user',
      action: 'create'
    };

    await request(app.getHttpServer())
      .post('/audit-events')
      .send(eventData)
      .expect(401);
  });

  it('should sanitize malicious input', async () => {
    const maliciousData = {
      eventType: 'user_management',
      resource: 'user',
      action: '<script>alert("xss")</script>',
      metadata: {
        injection: "'; DROP TABLE audit_events; --"
      }
    };

    const response = await request(app.getHttpServer())
      .post('/audit-events')
      .set('Authorization', `Bearer ${validJWT}`)
      .send(maliciousData)
      .expect(201);

    // 验证恶意内容被清理
    expect(response.body.action).not.toContain('<script>');
    expect(response.body.metadata.injection).not.toContain('DROP TABLE');
  });

  it('should enforce rate limiting', async () => {
    const requests = Array.from({ length: 200 }, () =>
      request(app.getHttpServer())
        .post('/audit-events')
        .set('Authorization', `Bearer ${validJWT}`)
        .send({ eventType: 'test', resource: 'test', action: 'test' })
    );

    const responses = await Promise.allSettled(requests);
    const rateLimitedResponses = responses.filter(
      r => r.status === 'fulfilled' && r.value.status === 429
    );

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

### 测试数据管理
```typescript
// test-data-factory.ts
export class AuditTestDataFactory {
  static createAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
    return {
      id: uuid(),
      tenantId: 'test-tenant',
      userId: 'test-user',
      eventType: AuditEventType.API_CALL,
      resource: 'test-resource',
      action: 'test-action',
      outcome: 'success',
      severity: 'low',
      sourceIp: '127.0.0.1',
      timestamp: new Date(),
      metadata: {},
      ...overrides
    };
  }

  static createBatchEvents(count: number): AuditEvent[] {
    return Array.from({ length: count }, (_, i) =>
      this.createAuditEvent({
        action: `test-action-${i}`,
        metadata: { index: i }
      })
    );
  }
}
```

### 测试覆盖率要求
- **单元测试覆盖率**: ≥ 80%
- **集成测试覆盖率**: ≥ 70%
- **API端点覆盖率**: 100%
- **关键路径覆盖率**: 100%

## 📈 监控和告警

### 关键指标
```typescript
// Prometheus 指标定义
const metrics = {
  // 审计事件指标
  auditEventsTotal: new promClient.Counter({
    name: 'audit_events_total',
    help: 'Total number of audit events',
    labelNames: ['tenant_id', 'event_type', 'outcome']
  }),
  
  // 日志处理指标
  logsProcessed: new promClient.Counter({
    name: 'logs_processed_total',
    help: 'Total number of logs processed',
    labelNames: ['service', 'level']
  }),
  
  // 合规检查指标
  complianceChecks: new promClient.Counter({
    name: 'compliance_checks_total',
    help: 'Total number of compliance checks',
    labelNames: ['regulation', 'result']
  }),
  
  // 安全事件指标
  securityEvents: new promClient.Counter({
    name: 'security_events_total',
    help: 'Total number of security events',
    labelNames: ['event_type', 'severity']
  }),
  
  // 告警指标
  alertsTriggered: new promClient.Counter({
    name: 'alerts_triggered_total',
    help: 'Total number of alerts triggered',
    labelNames: ['rule_name', 'severity']
  }),
  
  // 数据存储指标
  storageSize: new promClient.Gauge({
    name: 'audit_storage_size_bytes',
    help: 'Current audit data storage size',
    labelNames: ['storage_type'] // postgresql, redis
  })
}
```

## 📅 项目规划

### 开发里程碑
- **Week 2**: 审计服务开发（复杂度⭐⭐⭐，开发序号#7）
- **优先级**: 中等（依赖用户服务和认证服务）
- **估算工期**: 5-7个工作日
- **端口**: 3008
- **内存分配**: 512MB (标准版本，考虑日志数据处理需求)
- **存储需求**: 20GB初始磁盘空间（3年审计数据预估）

### 开发顺序 (基于服务间依赖关系)
1. **Day 1-2**: 核心审计事件记录功能 + 内部API接口
2. **Day 3-4**: PostgreSQL全文搜索和查询功能 + 与用户服务集成  
3. **Day 5-6**: 合规性检查和安全事件分析 + 与权限服务集成
4. **Day 7**: 告警规则和实时监控 + 与通知服务集成

### 服务集成计划
- **Phase 1**: 建立基础审计数据收集能力，实现内部API接口
- **Phase 2**: 集成认证和用户服务，增强事件上下文，实现JWT验证
- **Phase 3**: 集成权限服务，实现合规性检查，添加RBAC审计
- **Phase 4**: 集成通知服务，实现实时告警，完成告警通知管道
- **Phase 5**: 与所有11个服务集成审计装饰器，实现全量审计覆盖

### 技术风险评估
- **数据量风险**: PostgreSQL性能在大数据量下的表现（10万用户日均100万条记录）
  - 缓解方案：数据分区、定期归档、索引优化
- **搜索性能**: 全文搜索替代ES的性能对比
  - 缓解方案：PostgreSQL全文索引+Redis缓存热点查询
- **合规复杂性**: GDPR等法规要求的技术实现
  - 缓解方案：提前研究合规要求，分阶段实现
- **服务依赖**: 需要与所有业务服务集成审计功能
  - 缓解方案：提供统一装饰器，简化集成复杂度
- **数据一致性**: 跨服务审计事件的时序和完整性
  - 缓解方案：使用分布式事务ID、请求追踪链路
- **内存限制**: 512MB内存限制下的数据处理能力
  - 缓解方案：流式处理、批量写入、内存池优化

### 依赖关系
- **强依赖**:
  - 用户管理服务(3003): 用户信息补充
  - 认证授权服务(3001): JWT验证和会话信息
  - PostgreSQL: 审计数据存储
  - Redis: 缓存和会话追踪
- **弱依赖**:
  - 权限管理服务(3002): 权限变更审计
  - 通知服务(3005): 告警通知发送
- **并行开发**: 可与监控服务(3007)、任务调度服务(3009)同步开发
- **被依赖服务**: 为合规报告、安全分析、监控告警提供数据
- **外部依赖**: 无外部第三方服务依赖（标准版本简化架构）

## ✅ 开发完成情况总结

### 本地开发环境
```bash
# 1. 克隆项目
git clone <repository-url>
cd audit-service

# 2. 安装依赖
npm install

# 3. 启动依赖服务
docker-compose up -d postgres redis

# 4. 数据库迁移
npx prisma migrate dev

# 5. 启动开发服务器
npm run start:dev

# 7. 运行测试
npm run test
npm run test:e2e
```

### 标准版本服务配置
```typescript
// config/audit.config.ts (标准版本)
export default {
  // 服务配置
  service: {
    name: 'audit-service',
    port: 3008,
    version: '1.0.0',
    memoryLimit: '256MB'
  },
  
  // 数据保留策略 (标准版本)
  retention: {
    auditEvents: 3 * 365, // 3年 (符合大部分合规要求)
    systemLogs: 90,       // 90天
    securityEvents: 2 * 365, // 2年
    alerts: 180           // 180天
  },
  
  // 合规规则 (标准版本)
  compliance: {
    gdpr: {
      enabled: true,
      dataRetention: 3 * 365, // 3年
      rightToErasure: true
    },
    basicCompliance: {
      enabled: true,
      auditAllOperations: true
    }
  },
  
  // 威胁检测 (标准版本)
  threatDetection: {
    enabled: true,
    updateInterval: 3600, // 1小时
    basicRules: true,
    advancedML: false // 企业版功能
  },
  
  // 告警配置 (标准版本)
  alerting: {
    defaultCooldown: 300, // 5分钟
    channels: {
      notification_service: {
        enabled: true,
        endpoint: 'http://notification-service:3005/internal/notifications/send'
      }
    }
  },
  
  // 服务间通信
  services: {
    auth_service: 'http://auth-service:3001',
    user_service: 'http://user-management-service:3003',
    rbac_service: 'http://rbac-service:3002',
    notification_service: 'http://notification-service:3005',
    internal_token: process.env.INTERNAL_SERVICE_TOKEN
  },
  
  // Docker Compose网络配置 (标准版本)
  network: {
    name: 'platform-network',
    driver: 'bridge',
    serviceName: 'audit-service' // Docker Compose服务发现
  },
  
  // 健康检查配置
  healthCheck: {
    path: '/health',
    interval: 30, // 秒
    timeout: 5,   // 秒
    retries: 3
  }
}
```