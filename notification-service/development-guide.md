# 消息通知服务开发文档 - 标准版本

## 服务概述

消息通知服务是微服务平台的通信核心，面向**100租户+10万用户**的企业级生产系统，负责多渠道消息推送、模板管理、发送状态追踪等功能，为整个平台提供统一的消息通知能力。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户的消息通知
- **API端点**: 64个端点，10个功能模块
- **复杂度**: ⭐⭐⭐⭐
- **开发优先级**: Week 3
- **服务端口**: 3005
- **消息处理**: 日处理500万条消息，支持多渠道推送
- **可靠性**: 99.9%消息送达率，支持失败重试
- **渠道支持**: 邮件、短信、推送、WebSocket、Webhook
- **部署方式**: Docker Compose + Redis队列

## 技术栈

### 后端技术 (标准版本)
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (主数据库) + Redis 7+ (缓存/队列)
- **ORM**: Prisma ORM
- **消息队列**: Redis Bull Queue (适合标准版本)
- **邮件服务**: NodeMailer + SMTP
- **短信服务**: 阿里云短信 (统一短信服务商)
- **推送服务**: Firebase Cloud Messaging (FCM)
- **WebSocket**: Socket.io

### 监控技术
- **日志**: Winston
- **指标**: Prometheus + Grafana
- **健康检查**: NestJS Health Check

## 核心功能模块

### 1. 消息模板管理
```typescript
// 模板实体定义
interface NotificationTemplate {
  id: string
  name: string
  category: 'email' | 'sms' | 'push' | 'websocket' | 'webhook'
  subject?: string  // 邮件主题
  content: string   // 消息内容(支持变量占位符)
  htmlContent?: string  // HTML邮件内容
  variables: string[]   // 模板变量列表
  tenantId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 模板服务接口
interface TemplateService {
  createTemplate(template: CreateTemplateDto): Promise<NotificationTemplate>
  updateTemplate(id: string, template: UpdateTemplateDto): Promise<NotificationTemplate>
  deleteTemplate(id: string): Promise<void>
  getTemplate(id: string): Promise<NotificationTemplate>
  listTemplates(tenantId: string, category?: string): Promise<NotificationTemplate[]>
  renderTemplate(templateId: string, variables: Record<string, any>): Promise<string>
}
```

### 2. 多渠道消息发送
```typescript
// 消息发送实体
interface NotificationMessage {
  id: string
  templateId?: string
  tenantId: string
  channel: 'email' | 'sms' | 'push' | 'websocket' | 'webhook'
  recipient: string | string[]  // 接收者
  subject?: string
  content: string
  htmlContent?: string
  metadata?: Record<string, any>
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  sentAt?: Date
  deliveredAt?: Date
  failureReason?: string
  retryCount: number
  maxRetries: number
  scheduledAt?: Date  // 定时发送
  createdAt: Date
  updatedAt: Date
}

// 消息发送服务
interface MessageService {
  sendEmail(message: SendEmailDto): Promise<NotificationMessage>
  sendSMS(message: SendSMSDto): Promise<NotificationMessage>
  sendPushNotification(message: SendPushDto): Promise<NotificationMessage>
  sendWebSocketMessage(message: SendWebSocketDto): Promise<NotificationMessage>
  sendWebhook(message: SendWebhookDto): Promise<NotificationMessage>
  scheduleMessage(message: ScheduleMessageDto): Promise<NotificationMessage>
  cancelMessage(messageId: string): Promise<void>
  retryMessage(messageId: string): Promise<NotificationMessage>
}
```

### 3. 消息队列处理
```typescript
// 队列处理器
@Processor('notification-queue')
export class NotificationProcessor {
  @Process('send-email')
  async handleEmailSend(job: Job<SendEmailJob>) {
    // 邮件发送逻辑
  }

  @Process('send-sms')
  async handleSMSSend(job: Job<SendSMSJob>) {
    // 短信发送逻辑
  }

  @Process('send-push')
  async handlePushSend(job: Job<SendPushJob>) {
    // 推送通知发送逻辑
  }

  @Process('retry-failed')
  async handleRetryFailed(job: Job<RetryFailedJob>) {
    // 失败重试逻辑
  }
}

// 队列配置
interface QueueConfig {
  defaultJobOptions: {
    removeOnComplete: 100
    removeOnFail: 50
    attempts: 3
    backoff: {
      type: 'exponential'
      delay: 2000
    }
  }
  rateLimiter: {
    max: 100  // 每分钟最多处理100个任务
    duration: 60000
  }
}
```

### 4. 通知偏好管理
```typescript
// 用户通知偏好
interface NotificationPreference {
  id: string
  userId: string
  tenantId: string
  preferences: {
    email: {
      enabled: boolean
      categories: string[]  // 允许的通知类别
    }
    sms: {
      enabled: boolean
      categories: string[]
    }
    push: {
      enabled: boolean
      categories: string[]
    }
    websocket: {
      enabled: boolean
      categories: string[]
    }
  }
  quietHours?: {
    start: string  // HH:MM格式
    end: string
    timezone: string
  }
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly'
  createdAt: Date
  updatedAt: Date
}

// 偏好管理服务
interface PreferenceService {
  getUserPreference(userId: string, tenantId: string): Promise<NotificationPreference>
  updatePreference(userId: string, preference: UpdatePreferenceDto): Promise<NotificationPreference>
  checkCanSend(userId: string, channel: string, category: string): Promise<boolean>
}
```

## 数据库设计

### PostgreSQL 表结构
```sql
-- 通知模板表
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  content TEXT NOT NULL,
  html_content TEXT,
  variables JSONB DEFAULT '[]',
  tenant_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_templates_tenant_category (tenant_id, category),
  INDEX idx_templates_name (tenant_id, name)
);

-- 通知消息表
CREATE TABLE notification_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  tenant_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  recipient TEXT NOT NULL,
  subject VARCHAR(500),
  content TEXT NOT NULL,
  html_content TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_messages_status (status, scheduled_at),
  INDEX idx_messages_tenant (tenant_id, created_at),
  INDEX idx_messages_recipient (recipient, tenant_id)
);

-- 用户通知偏好表
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  quiet_hours JSONB,
  frequency VARCHAR(50) DEFAULT 'realtime',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, tenant_id),
  INDEX idx_preferences_user (user_id, tenant_id)
);

-- 发送统计表
CREATE TABLE notification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, channel, category, date),
  INDEX idx_stats_tenant_date (tenant_id, date)
);
```

### Redis 数据结构
```typescript
// 消息队列
interface RedisQueues {
  'notification:email': EmailJob[]
  'notification:sms': SMSJob[]
  'notification:push': PushJob[]
  'notification:websocket': WebSocketJob[]
  'notification:webhook': WebhookJob[]
  'notification:retry': RetryJob[]
}

// 缓存结构
interface RedisCache {
  'template:{templateId}': NotificationTemplate  // 模板缓存
  'preference:{userId}:{tenantId}': NotificationPreference  // 偏好缓存
  'rate_limit:{tenantId}:{channel}': number  // 速率限制
  'stats:{tenantId}:{date}': NotificationStats  // 统计缓存
}
```

## API 设计

### RESTful API 端点
```typescript
// 模板管理 API
@Controller('templates')
export class TemplateController {
  @Post()
  @Roles('admin', 'developer')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.templateService.createTemplate(dto)
  }

  @Get()
  async listTemplates(@Query() query: ListTemplatesDto) {
    return this.templateService.listTemplates(query)
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.templateService.getTemplate(id)
  }

  @Put(':id')
  @Roles('admin', 'developer')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.updateTemplate(id, dto)
  }

  @Delete(':id')
  @Roles('admin')
  async deleteTemplate(@Param('id') id: string) {
    return this.templateService.deleteTemplate(id)
  }

  @Post(':id/preview')
  async previewTemplate(@Param('id') id: string, @Body() variables: Record<string, any>) {
    return this.templateService.renderTemplate(id, variables)
  }
}

// 消息发送 API
@Controller('messages')
export class MessageController {
  @Post('send')
  @RateLimit(100, 60) // 每分钟最多100次
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.messageService.sendMessage(dto)
  }

  @Post('send/batch')
  @RateLimit(10, 60) // 批量发送限制更严格
  async sendBatchMessages(@Body() dto: SendBatchMessageDto) {
    return this.messageService.sendBatchMessages(dto)
  }

  @Post('schedule')
  async scheduleMessage(@Body() dto: ScheduleMessageDto) {
    return this.messageService.scheduleMessage(dto)
  }

  @Get(':id')
  async getMessage(@Param('id') id: string) {
    return this.messageService.getMessage(id)
  }

  @Get(':id/status')
  async getMessageStatus(@Param('id') id: string) {
    return this.messageService.getMessageStatus(id)
  }

  @Post(':id/retry')
  async retryMessage(@Param('id') id: string) {
    return this.messageService.retryMessage(id)
  }

  @Delete(':id')
  async cancelMessage(@Param('id') id: string) {
    return this.messageService.cancelMessage(id)
  }
}

// 用户偏好 API
@Controller('preferences')
export class PreferenceController {
  @Get()
  async getUserPreference(@Req() req: AuthenticatedRequest) {
    return this.preferenceService.getUserPreference(req.user.id, req.tenantId)
  }

  @Put()
  async updatePreference(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePreferenceDto) {
    return this.preferenceService.updatePreference(req.user.id, dto)
  }

  @Post('unsubscribe/:token')
  async unsubscribe(@Param('token') token: string) {
    return this.preferenceService.unsubscribeByToken(token)
  }
}
```

### WebSocket 事件
```typescript
// WebSocket 网关
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' }
})
export class NotificationGateway {
  @SubscribeMessage('join_room')
  handleJoinRoom(@MessageBody() data: { userId: string, tenantId: string }) {
    // 用户加入通知房间
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@MessageBody() data: { userId: string, tenantId: string }) {
    // 用户离开通知房间
  }

  // 服务端推送事件
  sendNotificationToUser(userId: string, tenantId: string, notification: any) {
    this.server.to(`${tenantId}:${userId}`).emit('notification', notification)
  }

  sendBroadcastToTenant(tenantId: string, notification: any) {
    this.server.to(`tenant:${tenantId}`).emit('broadcast', notification)
  }
}
```

## 第三方集成

### 邮件服务提供商
```typescript
// 邮件发送适配器
interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<EmailResult>
  verifyConfig(): Promise<boolean>
}

@Injectable()
export class SMTPProvider implements EmailProvider {
  // SMTP邮件发送实现
}

@Injectable()
export class SendGridProvider implements EmailProvider {
  // SendGrid API实现
}

@Injectable()
export class AliCloudEmailProvider implements EmailProvider {
  // 阿里云邮件推送实现
}
```

### 短信服务提供商
```typescript
// 短信发送适配器
interface SMSProvider {
  sendSMS(message: SMSMessage): Promise<SMSResult>
  verifyConfig(): Promise<boolean>
}

@Injectable()
export class AliCloudSMSProvider implements SMSProvider {
  // 阿里云短信服务实现
}

@Injectable()
export class TencentCloudSMSProvider implements SMSProvider {
  // 腾讯云短信服务实现
}

@Injectable()
export class TwilioSMSProvider implements SMSProvider {
  // Twilio短信服务实现
}
```

### 推送服务提供商
```typescript
// 推送通知适配器
interface PushProvider {
  sendPush(message: PushMessage): Promise<PushResult>
  verifyConfig(): Promise<boolean>
}

@Injectable()
export class FCMProvider implements PushProvider {
  // Firebase Cloud Messaging实现
}

@Injectable()
export class APNSProvider implements PushProvider {
  // Apple Push Notification Service实现
}

@Injectable()
export class JPushProvider implements PushProvider {
  // 极光推送实现
}
```

## 配置管理

### 环境变量配置
```typescript
// 配置模式
interface NotificationConfig {
  // 数据库配置
  database: {
    host: string
    port: number
    database: string
    username: string
    password: string
  }
  
  // Redis配置
  redis: {
    host: string
    port: number
    password?: string
    db: number
  }
  
  // 邮件配置
  email: {
    provider: 'smtp' | 'sendgrid' | 'alicloud'
    smtp?: {
      host: string
      port: number
      secure: boolean
      auth: {
        user: string
        pass: string
      }
    }
    sendgrid?: {
      apiKey: string
    }
    alicloud?: {
      accessKeyId: string
      accessKeySecret: string
      region: string
    }
  }
  
  // 短信配置  
  sms: {
    provider: 'alicloud' | 'tencent' | 'twilio'
    alicloud?: {
      accessKeyId: string
      accessKeySecret: string
      signName: string
    }
    tencent?: {
      secretId: string
      secretKey: string
      smsSdkAppId: string
      signName: string
    }
    twilio?: {
      accountSid: string
      authToken: string
      from: string
    }
  }
  
  // 推送配置
  push: {
    fcm?: {
      serverKey: string
      projectId: string
    }
    apns?: {
      keyId: string
      teamId: string
      bundleId: string
      privateKey: string
    }
    jpush?: {
      appKey: string
      masterSecret: string
    }
  }
  
  // 速率限制
  rateLimit: {
    email: {
      perMinute: number
      perHour: number
      perDay: number
    }
    sms: {
      perMinute: number
      perHour: number
      perDay: number
    }
    push: {
      perMinute: number
      perHour: number
      perDay: number
    }
  }
}
```

## 项目规划

### 开发里程碑 (Week 3)

**阶段一：核心功能开发** (Week 3.1-3.3)
- 🎯 里程碑1：完成消息模板管理和邮件通知功能
- 🎯 里程碑2：实现消息队列处理和失败重试机制
- 🎯 里程碑3：完成用户偏好管理和WebSocket实时通知

**阶段二：服务集成** (Week 3.4-3.5)
- 🎯 里程碑4：集成认证服务和权限管理服务
- 🎯 里程碑5：集成审计服务和监控服务

**阶段三：生产优化** (Week 3.6-3.7)
- 🎯 里程碑6：性能优化和压力测试
- 🎯 里程碑7：部署配置和监控告警

### 资源分配

**内存分配 (基于8GB总内存架构)**
- 消息通知服务：768MB (基础运行) + 256MB (队列缓存) = 1024MB
- 处理能力：每分钟处理3000条消息，支持5个并发渠道
- 队列容量：Redis队列最大10000条消息，支持延时发送

**开发优先级**
1. **P0 (必须)**: 邮件通知、模板管理、消息队列
2. **P1 (重要)**: WebSocket通知、用户偏好、失败重试
3. **P2 (一般)**: 短信/推送通知、批量发送、统计分析

### 风险评估

**技术风险**
- ⚠️ **高风险**: 第三方邮件服务商限制和稳定性
- ⚠️ **中风险**: Redis队列性能瓶颈和消息堆积
- ⚠️ **低风险**: WebSocket连接管理和断线重连

**服务依赖风险**
- 🔴 **强依赖**: 认证服务(用户验证)、权限服务(权限检查)
- 🟡 **中依赖**: 审计服务(操作记录)、监控服务(指标统计)
- 🟢 **弱依赖**: 用户服务(用户信息)、租户服务(租户配置)

**缓解策略**
- 实现邮件服务商失败转移机制
- 设置Redis队列监控和自动扩容
- 建立服务降级和熔断保护

## 服务间交互设计

### 内部API接口

```typescript
// 内部服务调用接口
@Controller('internal')
export class InternalNotificationController {
  @Post('notifications/send')
  @UseGuards(ServiceTokenGuard)
  async sendNotification(@Body() dto: InternalSendNotificationDto) {
    // 内部服务发送通知
    return this.notificationService.sendInternal(dto)
  }

  @Post('notifications/batch')
  @UseGuards(ServiceTokenGuard)
  async sendBatchNotifications(@Body() dto: InternalBatchNotificationDto) {
    // 批量发送通知
    return this.notificationService.sendBatchInternal(dto)
  }

  @Get('health')
  async getServiceHealth() {
    // 服务健康检查
    return this.healthService.check()
  }

  @Post('preferences/sync')
  @UseGuards(ServiceTokenGuard)
  async syncUserPreferences(@Body() dto: SyncPreferencesDto) {
    // 同步用户偏好设置
    return this.preferenceService.syncFromUserService(dto)
  }
}
```

### 服务间认证机制

```typescript
// X-Service-Token验证
@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const serviceToken = request.headers['x-service-token']
    
    // 验证内部服务令牌
    return this.validateServiceToken(serviceToken)
  }

  private validateServiceToken(token: string): boolean {
    // 验证逻辑：检查令牌是否有效
    return token === process.env.INTERNAL_SERVICE_TOKEN
  }
}
```

### 统一错误处理

```typescript
// 统一错误响应格式
export class ServiceErrorHandler {
  handleError(error: any): ServiceErrorResponse {
    return {
      success: false,
      errorCode: error.code || 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      serviceName: 'notification-service'
    }
  }
}

// 服务间调用重试机制
@Injectable()
export class ServiceCallService {
  async callWithRetry<T>(
    serviceCall: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await serviceCall()
      } catch (error) {
        if (attempt === maxRetries) throw error
        await this.delay(delay * attempt)
      }
    }
  }
}
```

## 部署方案

### Docker Compose 配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  notification-service:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: notification-service
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/platform
      - REDIS_URL=redis://redis:6379/0
      - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    volumes:
      - ./logs:/app/logs
    networks:
      - platform-network
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 1024M
          cpus: '0.5'
        reservations:
          memory: 768M
          cpus: '0.25'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # 队列处理服务 (独立进程)
  notification-worker:
    build: 
      context: .
      dockerfile: Dockerfile.worker
    container_name: notification-worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/platform
      - REDIS_URL=redis://redis:6379/0
    networks:
      - platform-network
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'
        reservations:
          memory: 256M
          cpus: '0.1'

networks:
  platform-network:
    external: true
```

## 监控告警

### 关键指标
```typescript
// Prometheus 指标定义
const metrics = {
  // 消息发送指标
  messagesSent: new promClient.Counter({
    name: 'notifications_messages_sent_total',
    help: 'Total number of messages sent',
    labelNames: ['tenant_id', 'channel', 'status']
  }),
  
  // 消息处理时间
  messageProcessingDuration: new promClient.Histogram({
    name: 'notifications_message_processing_duration_seconds',
    help: 'Message processing duration',
    labelNames: ['channel', 'template_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),
  
  // 队列长度
  queueLength: new promClient.Gauge({
    name: 'notifications_queue_length',
    help: 'Current queue length',
    labelNames: ['queue_name']
  }),
  
  // 失败率
  failureRate: new promClient.Gauge({
    name: 'notifications_failure_rate',
    help: 'Message failure rate',
    labelNames: ['channel', 'tenant_id']
  })
}
```

### 告警规则
```yaml
# prometheus-alerts.yml
groups:
- name: notification-service
  rules:
  - alert: HighMessageFailureRate
    expr: rate(notifications_messages_sent_total{status="failed"}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High message failure rate detected"
      description: "Message failure rate is {{ $value }} for {{ $labels.channel }}"

  - alert: QueueLengthTooHigh
    expr: notifications_queue_length > 1000
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Notification queue length too high"
      description: "Queue {{ $labels.queue_name }} has {{ $value }} pending messages"

  - alert: MessageProcessingTooSlow
    expr: histogram_quantile(0.95, rate(notifications_message_processing_duration_seconds_bucket[5m])) > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Message processing too slow"
      description: "95th percentile processing time is {{ $value }}s"
```

## 开发指南

### 本地开发环境
```bash
# 1. 克隆项目
git clone <repository-url>
cd notification-service

# 2. 安装依赖
npm install

# 3. 启动依赖服务
docker-compose up -d postgres redis

# 4. 数据库迁移
npx prisma migrate dev

# 5. 启动开发服务器
npm run start:dev

# 6. 运行测试
npm run test
npm run test:e2e
```

### 代码规范
```typescript
// ESLint + Prettier 配置
{
  "extends": [
    "@nestjs",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### 测试策略
```typescript
// 单元测试示例
describe('NotificationService', () => {
  let service: NotificationService
  let mockMessageRepository: jest.Mocked<MessageRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: MessageRepository,
          useValue: {
            save: jest.fn(),
            findById: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<NotificationService>(NotificationService)
    mockMessageRepository = module.get(MessageRepository)
  })

  it('should send email successfully', async () => {
    // 测试邮件发送功能
  })
})

// 集成测试示例
describe('NotificationController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [NotificationModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/messages/send (POST)', () => {
    return request(app.getHttpServer())
      .post('/messages/send')
      .send({
        channel: 'email',
        recipient: 'test@example.com',
        content: 'Test message'
      })
      .expect(201)
  })
})
```

### 快速开始

```bash
# 1. 启动基础设施
docker-compose up -d postgres redis

# 2. 安装依赖
npm install

# 3. 数据库迁移
npx prisma migrate dev

# 4. 启动开发服务器
nx serve notification-service

# 5. 启动队列处理器
npm run start:worker

# 6. 测试API
curl -X POST http://localhost:3005/api/v1/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "channel": "email",
    "recipient": "test@example.com",
    "subject": "Test Notification",
    "content": "This is a test message"
  }'
```

### 环境变量配置

```bash
# .env
NODE_ENV=development
PORT=3005

# 数据库配置
DATABASE_URL=postgresql://user:pass@localhost:5432/platform
REDIS_URL=redis://localhost:6379/0

# 服务间通信
INTERNAL_SERVICE_TOKEN=your-internal-service-token
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-management-service:3003
AUDIT_SERVICE_URL=http://audit-service:3008

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 短信配置 (可选)
ALICLOUD_ACCESS_KEY_ID=your-access-key
ALICLOUD_ACCESS_KEY_SECRET=your-secret-key
ALICLOUD_SMS_SIGN_NAME=your-sign-name

# 推送配置 (可选)
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-project-id

# 速率限制
RATE_LIMIT_EMAIL_PER_MINUTE=100
RATE_LIMIT_SMS_PER_MINUTE=20
RATE_LIMIT_PUSH_PER_MINUTE=200
```

## 生产部署检查清单

### 部署前检查
- [ ] 确认服务器资源：1GB内存，0.5CPU核心
- [ ] 配置所有必需的环境变量
- [ ] 设置邮件服务商账户和API密钥
- [ ] 配置Redis持久化和备份
- [ ] 设置日志轮转和监控告警
- [ ] 验证与其他服务的网络连通性

### 服务启动顺序
1. PostgreSQL, Redis (基础设施)
2. auth-service, user-management-service (依赖服务)
3. notification-service (主服务)
4. notification-worker (队列处理器)

### 监控指标
- 消息发送成功率 > 99%
- 消息处理延迟 < 5秒
- 队列积压消息 < 1000条
- 服务内存使用 < 900MB
- API响应时间P95 < 200ms

---

这个消息通知服务将为整个微服务平台提供强大的多渠道通信能力，支持邮件、短信、推送通知等多种消息发送方式，并提供完善的模板管理、用户偏好、统计分析等功能。通过标准版本的优化设计，确保在100租户+10万用户规模下的稳定运行。