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

## 部署方案

### Docker 配置
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: notification-service:latest
        ports:
        - containerPort: 3005
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3005
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3005
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: notification-service
spec:
  selector:
    app: notification-service
  ports:
    - port: 80
      targetPort: 3005
  type: ClusterIP
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

这个消息通知服务将为整个微服务平台提供强大的多渠道通信能力，支持邮件、短信、推送通知等多种消息发送方式，并提供完善的模板管理、用户偏好、统计分析等功能。