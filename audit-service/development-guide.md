# 日志审计服务开发文档 - 标准版本

## 服务概述

日志审计服务是微服务平台的合规与安全核心，面向**100租户+10万用户**的企业级生产系统，负责系统日志收集、审计追踪、合规性管理、安全事件分析等功能，为整个平台提供完整的操作记录和安全监控能力。

### 🎯 标准版本定位
- **审计规模**: 支持100租户+10万用户的全量审计
- **日志处理**: 日处理100万条审计记录 (标准版本适用)
- **合规要求**: 支持GDPR、SOX等国际合规标准
- **存储能力**: 支持3年审计数据存储和快速检索
- **部署方式**: Docker Compose + PostgreSQL全文搜索

## 技术栈

### 后端技术 (标准版本)
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (审计数据 + 全文搜索) + Redis 7+ (缓存)
- **搜索引擎**: PostgreSQL全文搜索 (标准版本适用)
- **消息队列**: Redis Streams (标准版本选择)
- **ORM**: Prisma ORM
- **日志处理**: Winston + PostgreSQL存储
- **企业版功能**: ClickHouse + Elasticsearch (企业版保留)

### 分析技术 (标准版本)
- **实时分析**: PostgreSQL窗口函数 + Redis统计
- **批处理**: Node.js定时任务 (适合标准版本)
- **异常检测**: 基于规则的检测 + 统计分析
- **时序数据**: PostgreSQL时序扩展 (无需额外组件)

### 监控技术 (标准版本)
- **日志聚合**: Winston + PostgreSQL (简化日志存储)
- **指标监控**: Prometheus + Grafana
- **链路追踪**: Winston结构化日志 + 请求ID追踪
- **健康检查**: NestJS Health Check
- **企业版功能**: ELK Stack + Jaeger (企业版保留)

## 核心功能模块

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
  query: string  // Elasticsearch query or SQL
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

## 数据库设计

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

### ClickHouse 表结构 (日志分析)
```sql
-- 系统日志表 (ClickHouse)
CREATE TABLE system_logs (
  id String,
  tenant_id String,
  service String,
  level String,
  message String,
  timestamp DateTime,
  context String,  -- JSON string
  exception String,  -- JSON string  
  request_id String,
  correlation_id String,
  user_id String,
  metadata String,  -- JSON string
  date Date MATERIALIZED toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service, level, timestamp)
SETTINGS index_granularity = 8192;

-- 日志统计视图
CREATE MATERIALIZED VIEW log_stats_mv
TO log_stats
AS SELECT
  service,
  level,
  toStartOfHour(timestamp) as hour,
  count() as count,
  uniqExact(user_id) as unique_users
FROM system_logs
GROUP BY service, level, hour;

-- 错误日志聚合表
CREATE TABLE error_aggregations (
  service String,
  error_type String,
  error_message String,
  count UInt64,
  first_seen DateTime,
  last_seen DateTime,
  date Date
) ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (service, error_type, date);
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

## API 设计

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

## 集成方案

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

EXPOSE 3007

CMD ["node", "dist/main.js"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  audit-service:
    build: .
    ports:
      - "3007:3007"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/audit_db
      - REDIS_URL=redis://redis:6379
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - CLICKHOUSE_URL=http://clickhouse:8123
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - postgres
      - redis
      - elasticsearch
      - clickhouse
      - kafka
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: audit_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  clickhouse:
    image: yandex/clickhouse-server:latest
    ports:
      - "8123:8123"
      - "9009:9009"
    volumes:
      - clickhouse_data:/var/lib/clickhouse

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
  clickhouse_data:
```

### Kubernetes 部署
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: audit-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: audit-service
  template:
    metadata:
      labels:
        app: audit-service
    spec:
      containers:
      - name: audit-service
        image: audit-service:latest
        ports:
        - containerPort: 3007
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: ELASTICSEARCH_URL
          valueFrom:
            configMapKeyRef:
              name: audit-config
              key: elasticsearch-url
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
            port: 3007
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3007
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: audit-service
spec:
  selector:
    app: audit-service
  ports:
    - port: 80
      targetPort: 3007
  type: ClusterIP
```

## 监控告警

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
    labelNames: ['storage_type'] // postgresql, elasticsearch, clickhouse
  })
}
```

## 开发指南

### 本地开发环境
```bash
# 1. 克隆项目
git clone <repository-url>
cd audit-service

# 2. 安装依赖
npm install

# 3. 启动依赖服务
docker-compose up -d postgres redis elasticsearch clickhouse kafka

# 4. 数据库迁移
npx prisma migrate dev

# 5. 初始化 ClickHouse 表
npm run clickhouse:init

# 6. 启动开发服务器
npm run start:dev

# 7. 运行测试
npm run test
npm run test:e2e
```

### 配置文件示例
```typescript
// config/audit.config.ts
export default {
  // 数据保留策略
  retention: {
    auditEvents: 7 * 365, // 7年
    systemLogs: 90,       // 90天
    securityEvents: 3 * 365, // 3年
    alerts: 180           // 180天
  },
  
  // 合规规则
  compliance: {
    gdpr: {
      enabled: true,
      dataRetention: 6 * 365, // 6年
      rightToErasure: true
    },
    hipaa: {
      enabled: false,
      auditLogRetention: 6 * 365
    }
  },
  
  // 威胁检测
  threatDetection: {
    enabled: true,
    updateInterval: 3600, // 1小时
    mlModels: {
      anomalyDetection: true,
      behaviorAnalysis: true
    }
  },
  
  // 告警配置
  alerting: {
    defaultCooldown: 300, // 5分钟
    channels: {
      email: {
        enabled: true,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }
      },
      webhook: {
        enabled: true,
        timeout: 5000
      }
    }
  }
}
```

这个日志审计服务将为整个微服务平台提供全面的审计追踪和合规管理能力，确保系统操作的透明性和安全性，满足各种合规要求。