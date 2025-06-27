# 任务调度服务开发文档 - 标准版本

## 服务概述

任务调度服务是微服务平台的核心基础设施，面向**100租户+10万用户**的企业级生产系统，负责定时任务管理、周期调度、任务流编排和资源管理，为整个平台提供可靠的异步任务执行能力。

### 🎯 标准版本定位
- **任务规模**: 支持100租户，每天执行100万个定时任务
- **调度精度**: 秒级调度精度，支持复杂Cron表达式
- **可靠性**: 99.9%任务执行成功率，支持失败重试
- **并发能力**: 支持1000个并发任务执行
- **部署方式**: Docker Compose + Redis分布式锁

## 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (任务元数据) + Redis 7+ (任务队列)
- **ORM**: Prisma ORM
- **调度引擎**: Node-cron + BullMQ
- **分布式协调**: Redis 分布式锁

### 调度技术 (标准版本)
- **Cron解析**: node-cron + cron-parser
- **队列管理**: BullMQ + Redis (适合标准版本)
- **任务持久化**: PostgreSQL
- **监控**: Prometheus + Custom Metrics
- **日志**: Winston + 结构化日志

## 核心功能模块

### 1. 任务定义管理
```typescript
// 任务定义接口
POST   /api/v1/scheduler/jobs                    // 创建定时任务
GET    /api/v1/scheduler/jobs                    // 获取任务列表
GET    /api/v1/scheduler/jobs/{id}               // 获取任务详情
PUT    /api/v1/scheduler/jobs/{id}               // 更新任务定义
DELETE /api/v1/scheduler/jobs/{id}               // 删除任务
POST   /api/v1/scheduler/jobs/{id}/validate      // 验证任务配置
```

### 2. 任务执行控制
```typescript
// 任务执行操作
POST   /api/v1/scheduler/jobs/{id}/trigger       // 手动触发任务
POST   /api/v1/scheduler/jobs/{id}/pause         // 暂停任务
POST   /api/v1/scheduler/jobs/{id}/resume        // 恢复任务
POST   /api/v1/scheduler/jobs/{id}/stop          // 停止任务
POST   /api/v1/scheduler/executions/{id}/cancel  // 取消执行
```

### 3. 执行历史查询
```typescript
// 执行历史管理
GET    /api/v1/scheduler/executions              // 获取执行历史
GET    /api/v1/scheduler/executions/{id}         // 获取执行详情
GET    /api/v1/scheduler/jobs/{id}/executions    // 获取任务执行历史
GET    /api/v1/scheduler/executions/stats        // 获取执行统计
```

### 4. 调度监控
```typescript
// 调度监控接口
GET    /api/v1/scheduler/status                  // 获取调度器状态
GET    /api/v1/scheduler/metrics                 // 获取性能指标
GET    /api/v1/scheduler/queues                  // 获取队列状态
GET    /api/v1/scheduler/workers                 // 获取工作进程状态
```

## 数据库设计

### 任务定义表 (scheduled_jobs)
```sql
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  job_type VARCHAR(50) NOT NULL, -- 'http', 'function', 'command'
  
  -- 任务配置
  config JSONB NOT NULL, -- 任务执行配置
  retry_config JSONB, -- 重试配置
  timeout_seconds INTEGER DEFAULT 300,
  max_concurrent INTEGER DEFAULT 1,
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'inactive'
  priority INTEGER DEFAULT 0,
  
  -- 执行限制
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_executions INTEGER,
  execution_count INTEGER DEFAULT 0,
  
  -- 元数据
  tenant_id UUID NOT NULL,
  created_by UUID NOT NULL,
  tags JSONB DEFAULT '[]',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_execution_at TIMESTAMP,
  next_execution_at TIMESTAMP
);
```

### 任务执行表 (job_executions)
```sql
CREATE TABLE job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  
  -- 执行信息
  execution_id VARCHAR(100) UNIQUE NOT NULL, -- BullMQ job ID
  trigger_type VARCHAR(20) NOT NULL, -- 'scheduled', 'manual', 'retry'
  triggered_by UUID,
  
  -- 状态跟踪
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  progress INTEGER DEFAULT 0, -- 0-100
  
  -- 时间记录
  scheduled_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- 结果数据
  result JSONB,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- 资源使用
  worker_id VARCHAR(100),
  memory_peak_mb INTEGER,
  cpu_time_ms INTEGER,
  
  -- 元数据
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 调度锁表 (scheduler_locks)
```sql
CREATE TABLE scheduler_locks (
  lock_key VARCHAR(200) PRIMARY KEY,
  locked_by VARCHAR(100) NOT NULL,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}'
);
```

## 任务调度架构

### 分布式调度设计
```mermaid
graph TB
    CronTrigger[Cron触发器] --> LockManager[分布式锁管理器]
    LockManager --> JobQueue[任务队列]
    JobQueue --> Worker1[Worker节点1]
    JobQueue --> Worker2[Worker节点2]
    JobQueue --> Worker3[Worker节点N]
    
    Worker1 --> JobExecutor[任务执行器]
    Worker2 --> JobExecutor
    Worker3 --> JobExecutor
    
    JobExecutor --> HTTPJob[HTTP任务]
    JobExecutor --> FunctionJob[函数任务]
    JobExecutor --> CommandJob[命令任务]
    
    JobExecutor --> ResultHandler[结果处理器]
    ResultHandler --> Database[(PostgreSQL)]
    ResultHandler --> Monitoring[监控系统]
```

### 任务执行流程
```mermaid
sequenceDiagram
    participant Cron as Cron调度器
    participant Lock as 分布式锁
    participant Queue as 任务队列
    participant Worker as 工作进程
    participant DB as 数据库
    
    Cron->>Lock: 请求调度锁
    Lock-->>Cron: 获取锁成功
    Cron->>Queue: 添加任务到队列
    Queue->>Worker: 分派任务
    Worker->>DB: 更新执行状态为running
    Worker->>Worker: 执行任务逻辑
    Worker->>DB: 保存执行结果
    Worker->>Queue: 确认任务完成
    Lock-->>Cron: 释放调度锁
```

## 任务类型设计

### HTTP任务类型
```typescript
interface HttpJobConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  expectedStatusCode?: number;
  retryOnStatusCodes?: number[];
}

@Injectable()
export class HttpJobExecutor {
  async execute(config: HttpJobConfig): Promise<JobResult> {
    const response = await this.httpService.request({
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.body,
      timeout: config.timeout || 30000
    });
    
    return {
      success: response.status === (config.expectedStatusCode || 200),
      result: response.data,
      metadata: {
        statusCode: response.status,
        headers: response.headers
      }
    };
  }
}
```

### 函数任务类型
```typescript
interface FunctionJobConfig {
  modulePath: string;
  functionName: string;
  parameters?: any;
  timeout?: number;
}

@Injectable()
export class FunctionJobExecutor {
  async execute(config: FunctionJobConfig): Promise<JobResult> {
    const module = await import(config.modulePath);
    const func = module[config.functionName];
    
    if (typeof func !== 'function') {
      throw new Error(`Function ${config.functionName} not found`);
    }
    
    const result = await Promise.race([
      func(config.parameters),
      this.createTimeout(config.timeout || 300000)
    ]);
    
    return {
      success: true,
      result: result
    };
  }
}
```

### 命令任务类型
```typescript
interface CommandJobConfig {
  command: string;
  args?: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

@Injectable()
export class CommandJobExecutor {
  async execute(config: CommandJobConfig): Promise<JobResult> {
    const child = spawn(config.command, config.args, {
      cwd: config.workingDirectory,
      env: { ...process.env, ...config.environment },
      stdio: 'pipe'
    });
    
    const result = await this.waitForCompletion(child, config.timeout);
    
    return {
      success: result.exitCode === 0,
      result: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      }
    };
  }
}
```

## Cron表达式解析

### 表达式格式支持
```typescript
// 标准Cron格式: 秒 分 时 日 月 周
// 示例表达式
const examples = [
  '0 */5 * * * *',      // 每5分钟执行
  '0 0 2 * * *',        // 每天凌晨2点执行
  '0 0 9 * * 1-5',      // 工作日上午9点执行
  '0 0/30 9-17 * * *',  // 工作时间每30分钟执行
  '0 0 0 1 * *',        // 每月1号午夜执行
];

@Injectable()
export class CronParser {
  parseExpression(expression: string): CronTime {
    const parsed = cronParser.parseExpression(expression);
    return {
      next: () => parsed.next().toDate(),
      prev: () => parsed.prev().toDate(),
      hasNext: () => parsed.hasNext(),
      iterate: (count: number) => 
        Array.from({ length: count }, () => parsed.next().toDate())
    };
  }
  
  validateExpression(expression: string): boolean {
    try {
      cronParser.parseExpression(expression);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 时区处理
```typescript
@Injectable()
export class TimezoneHandler {
  convertToTimezone(date: Date, timezone: string): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  }
  
  getNextExecution(cronExpression: string, timezone: string): Date {
    const parser = cronParser.parseExpression(cronExpression, {
      tz: timezone
    });
    return parser.next().toDate();
  }
}
```

## 重试和错误处理

### 重试策略配置
```typescript
interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  retryOnErrorTypes?: string[];
  maxRetryDelayMs?: number;
}

@Injectable()
export class RetryManager {
  async executeWithRetry<T>(
    job: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await job();
      } catch (error) {
        lastError = error;
        
        if (attempt === config.maxRetries) {
          break;
        }
        
        if (!this.shouldRetry(error, config)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, config);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.retryDelayMs;
    
    if (config.exponentialBackoff) {
      delay *= Math.pow(2, attempt);
    }
    
    return Math.min(delay, config.maxRetryDelayMs || Infinity);
  }
}
```

### 错误分类处理
```typescript
enum JobErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  USER_ERROR = 'USER_ERROR'
}

@Injectable()
export class ErrorClassifier {
  classifyError(error: Error): JobErrorType {
    if (error.name === 'TimeoutError') {
      return JobErrorType.TIMEOUT;
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      return JobErrorType.NETWORK_ERROR;
    }
    
    // 其他分类逻辑
    return JobErrorType.SYSTEM_ERROR;
  }
  
  shouldRetry(errorType: JobErrorType): boolean {
    const retryableErrors = [
      JobErrorType.TIMEOUT,
      JobErrorType.NETWORK_ERROR,
      JobErrorType.SYSTEM_ERROR
    ];
    
    return retryableErrors.includes(errorType);
  }
}
```

## 分布式锁实现

### Redis分布式锁
```typescript
@Injectable()
export class DistributedLockService {
  constructor(private readonly redis: Redis) {}
  
  async acquireLock(
    key: string, 
    ttlMs: number = 30000,
    identifier?: string
  ): Promise<string | null> {
    const lockId = identifier || uuidv4();
    const lockKey = `lock:${key}`;
    
    const result = await this.redis.set(
      lockKey, 
      lockId, 
      'PX', 
      ttlMs, 
      'NX'
    );
    
    return result === 'OK' ? lockId : null;
  }
  
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      script, 
      1, 
      `lock:${key}`, 
      lockId
    );
    
    return result === 1;
  }
  
  async extendLock(key: string, lockId: string, ttlMs: number): Promise<boolean> {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("PEXPIRE", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      script,
      1,
      `lock:${key}`,
      lockId,
      ttlMs.toString()
    );
    
    return result === 1;
  }
}
```

### 调度锁管理
```typescript
@Injectable()
export class SchedulerLockManager {
  async withLock<T>(
    jobId: string,
    operation: () => Promise<T>,
    ttlMs: number = 30000
  ): Promise<T> {
    const lockKey = `scheduler:job:${jobId}`;
    const lockId = await this.lockService.acquireLock(lockKey, ttlMs);
    
    if (!lockId) {
      throw new Error(`Failed to acquire lock for job ${jobId}`);
    }
    
    try {
      return await operation();
    } finally {
      await this.lockService.releaseLock(lockKey, lockId);
    }
  }
}
```

## 监控指标

### 业务指标
```typescript
interface SchedulerMetrics {
  // 任务统计
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  
  // 执行统计
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  
  // 性能指标
  averageExecutionTime: number;
  queueLength: number;
  activeWorkers: number;
  
  // 错误率
  errorRate: number;
  timeoutRate: number;
  retryRate: number;
}

@Injectable()
export class MetricsCollector {
  @Cron('*/30 * * * * *') // 每30秒收集一次
  async collectMetrics(): Promise<void> {
    const metrics = await this.calculateMetrics();
    
    // 发送到监控系统
    this.prometheusService.setGauge('scheduler_total_jobs', metrics.totalJobs);
    this.prometheusService.setGauge('scheduler_queue_length', metrics.queueLength);
    this.prometheusService.setGauge('scheduler_error_rate', metrics.errorRate);
    
    // 发送到数据库
    await this.metricsRepository.save(metrics);
  }
}
```

### 性能监控
```typescript
// Prometheus指标定义
const schedulerMetrics = {
  jobExecutions: new Counter({
    name: 'scheduler_job_executions_total',
    help: 'Total number of job executions',
    labelNames: ['job_type', 'status', 'tenant_id']
  }),
  
  executionDuration: new Histogram({
    name: 'scheduler_execution_duration_seconds',
    help: 'Job execution duration in seconds',
    labelNames: ['job_type', 'tenant_id'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300]
  }),
  
  queueSize: new Gauge({
    name: 'scheduler_queue_size',
    help: 'Current size of job queue',
    labelNames: ['queue_name']
  })
};
```

## API设计规范

### 任务创建请求
```typescript
interface CreateJobRequest {
  name: string;
  description?: string;
  cronExpression: string;
  timezone?: string;
  jobType: 'http' | 'function' | 'command';
  config: HttpJobConfig | FunctionJobConfig | CommandJobConfig;
  retryConfig?: RetryConfig;
  timeout?: number;
  priority?: number;
  startDate?: string;
  endDate?: string;
  maxExecutions?: number;
  tags?: string[];
}

interface JobResponse {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'inactive';
  cronExpression: string;
  nextExecutionAt: string;
  lastExecutionAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### 错误响应格式
```typescript
enum SchedulerErrorCode {
  INVALID_CRON_EXPRESSION = 'INVALID_CRON_EXPRESSION',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_ALREADY_RUNNING = 'JOB_ALREADY_RUNNING',
  INVALID_JOB_CONFIG = 'INVALID_JOB_CONFIG',
  LOCK_ACQUISITION_FAILED = 'LOCK_ACQUISITION_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

interface SchedulerErrorResponse {
  error: {
    code: SchedulerErrorCode;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

## 部署配置

### 环境变量
```env
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/scheduler
REDIS_URL=redis://localhost:6379

# 调度配置
SCHEDULER_WORKER_COUNT=5
SCHEDULER_MAX_CONCURRENT_JOBS=100
SCHEDULER_JOB_TIMEOUT_MS=300000
SCHEDULER_LOCK_TTL_MS=30000

# 队列配置
BULL_REDIS_HOST=localhost
BULL_REDIS_PORT=6379
BULL_REDIS_DB=1

# 监控配置
METRICS_ENABLED=true
PROMETHEUS_PORT=9464
LOG_LEVEL=info
```

### Docker配置
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3009 9464

CMD ["node", "dist/main.js"]
```

## 测试策略

### 单元测试
```typescript
describe('CronParser', () => {
  it('should parse valid cron expression', () => {
    const parser = new CronParser();
    const result = parser.parseExpression('0 */5 * * * *');
    expect(result).toBeDefined();
  });
  
  it('should reject invalid cron expression', () => {
    const parser = new CronParser();
    expect(() => parser.parseExpression('invalid')).toThrow();
  });
});

describe('DistributedLockService', () => {
  it('should acquire and release lock successfully', async () => {
    const lockId = await lockService.acquireLock('test-key', 5000);
    expect(lockId).toBeTruthy();
    
    const released = await lockService.releaseLock('test-key', lockId);
    expect(released).toBe(true);
  });
});
```

### 集成测试
```typescript
describe('Job Execution', () => {
  it('should execute HTTP job successfully', async () => {
    const job = await createTestJob({
      type: 'http',
      config: {
        url: 'https://httpbin.org/get',
        method: 'GET'
      }
    });
    
    const execution = await triggerJob(job.id);
    await waitForCompletion(execution.id);
    
    const result = await getExecution(execution.id);
    expect(result.status).toBe('completed');
    expect(result.result.success).toBe(true);
  });
});
```

## 性能优化

### 数据库优化
```sql
-- 关键索引
CREATE INDEX idx_scheduled_jobs_next_execution ON scheduled_jobs(next_execution_at) WHERE status = 'active';
CREATE INDEX idx_job_executions_job_id_created ON job_executions(job_id, created_at DESC);
CREATE INDEX idx_job_executions_status_tenant ON job_executions(status, tenant_id);

-- 分区表（按月分区）
CREATE TABLE job_executions_y2024m01 PARTITION OF job_executions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 缓存策略
```typescript
// 任务配置缓存
Cache Key: scheduler:job_config:{jobId}
TTL: 1小时

// 执行统计缓存
Cache Key: scheduler:stats:{tenantId}:{date}
TTL: 24小时

// 下次执行时间缓存
Cache Key: scheduler:next_execution:{jobId}
TTL: 根据任务频率动态设置
```

## 项目规划

### 开发里程碑 (Week 3)

**阶段一：核心调度功能** (Week 3.1-3.3)
- 🎯 里程碑1：完成任务定义管理和执行控制系统
- 🎯 里程碑2：实现Cron表达式解析和分布式锁管理
- 🎯 里程碑3：集成BullMQ队列和重试机制

**阶段二：服务集成** (Week 3.4-3.5)
- 🎯 里程碑4：集成认证服务和权限管理服务
- 🎯 里程碑5：集成审计服务和监控服务

**阶段三：生产优化** (Week 3.6-3.7)
- 🎯 里程碑6：性能优化和压力测试
- 🎯 里程碑7：部署配置和监控告警

### 资源分配

**内存分配 (基于8GB总内存架构)**
- 任务调度服务：640MB (基础运行) + 384MB (队列缓存) = 1024MB
- 处理能力：支持1000个并发任务，每天100万个任务
- 队列容量：BullMQ队列最大20000个任务，支持延时执行

**开发优先级**
1. **P0 (必须)**: 任务定义、Cron调度、任务执行
2. **P1 (重要)**: 分布式锁、BullMQ队列、重试机制
3. **P2 (一般)**: 执行历史、性能监控、高级调度策略

### 风险评估

**技术风险**
- ⚠️ **高风险**: 分布式锁竞争和调度器脑裂问题
- ⚠️ **中风险**: BullMQ队列性能瓶颈和任务积压
- ⚠️ **低风险**: Cron表达式解析错误和时区处理

**服务依赖风险**
- 🔴 **强依赖**: 认证服务(任务授权)、权限服务(权限检查)
- 🟡 **中依赖**: 审计服务(任务审计)、监控服务(性能指标)
- 🟢 **弱依赖**: 通知服务(任务状态通知)、用户服务(用户信息)

**缓解策略**
- 实现分布式锁的超时和自动释放机制
- 设置BullMQ队列监控和自动扩容
- 建立任务降级和容错保护

## 服务间交互设计

### 内部API接口

```typescript
// 内部服务调用接口
@Controller('internal')
export class InternalSchedulerController {
  @Post('jobs/create')
  @UseGuards(ServiceTokenGuard)
  async createInternalJob(@Body() dto: InternalCreateJobDto) {
    // 内部服务创建任务
    return this.schedulerService.createInternalJob(dto)
  }

  @Post('jobs/{jobId}/trigger')
  @UseGuards(ServiceTokenGuard)
  async triggerJob(@Param('jobId') jobId: string, @Body() dto: TriggerJobDto) {
    // 手动触发任务
    return this.schedulerService.triggerJob(jobId, dto)
  }

  @Get('jobs/{jobId}/status')
  @UseGuards(ServiceTokenGuard)
  async getJobStatus(@Param('jobId') jobId: string) {
    // 获取任务状态
    return this.schedulerService.getJobStatus(jobId)
  }

  @Post('jobs/batch-create')
  @UseGuards(ServiceTokenGuard)
  async createBatchJobs(@Body() dto: BatchCreateJobsDto) {
    // 批量创建任务
    return this.schedulerService.createBatchJobs(dto)
  }

  @Get('health')
  async getServiceHealth() {
    // 服务健康检查
    return this.healthService.check()
  }

  @Post('jobs/{jobId}/pause')
  @UseGuards(ServiceTokenGuard)
  async pauseJob(@Param('jobId') jobId: string) {
    // 暂停任务
    return this.schedulerService.pauseJob(jobId)
  }

  @Post('jobs/{jobId}/resume')
  @UseGuards(ServiceTokenGuard)
  async resumeJob(@Param('jobId') jobId: string) {
    // 恢复任务
    return this.schedulerService.resumeJob(jobId)
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
export class SchedulerErrorHandler {
  handleError(error: any): ServiceErrorResponse {
    return {
      success: false,
      errorCode: error.code || 'SCHEDULER_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      serviceName: 'scheduler-service'
    }
  }
}

// 任务执行重试机制
@Injectable()
export class JobRetryService {
  async executeWithRetry(
    jobId: string,
    jobFunction: () => Promise<any>,
    retryConfig: RetryConfig
  ): Promise<JobResult> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await jobFunction()
        return {
          success: true,
          result: result,
          attempt: attempt + 1
        }
      } catch (error) {
        lastError = error
        
        if (attempt === retryConfig.maxRetries) {
          break
        }
        
        // 计算重试延迟
        const delay = this.calculateDelay(attempt, retryConfig)
        await this.delay(delay)
        
        // 记录重试日志
        await this.auditService.logJobRetry(jobId, attempt + 1, error.message)
      }
    }
    
    return {
      success: false,
      error: lastError.message,
      attempt: retryConfig.maxRetries + 1
    }
  }
}
```

## 部署配置

### Docker Compose 配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  scheduler-service:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: scheduler-service
    ports:
      - "3009:3009"
      - "9464:9464"  # Prometheus metrics
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/platform
      - REDIS_URL=redis://redis:6379/3
      - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
      - AUTH_SERVICE_URL=http://auth-service:3001
      - RBAC_SERVICE_URL=http://rbac-service:3002
      - AUDIT_SERVICE_URL=http://audit-service:3008
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
      - SCHEDULER_WORKER_COUNT=5
      - SCHEDULER_MAX_CONCURRENT_JOBS=1000
      - SCHEDULER_JOB_TIMEOUT_MS=300000
      - SCHEDULER_LOCK_TTL_MS=30000
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
          cpus: '0.75'
        reservations:
          memory: 640M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3009/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # 任务执行器 (独立进程)
  scheduler-worker:
    build: 
      context: .
      dockerfile: Dockerfile.worker
    container_name: scheduler-worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/platform
      - REDIS_URL=redis://redis:6379/3
      - WORKER_CONCURRENCY=10
      - JOB_TIMEOUT=300000
    networks:
      - platform-network
    depends_on:
      - postgres
      - redis
      - scheduler-service
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    scale: 2  # 运行2个worker实例

networks:
  platform-network:
    external: true
```

### 快速开始

```bash
# 1. 启动基础设施
docker-compose up -d postgres redis

# 2. 安装依赖
npm install

# 3. 数据库迁移
npx prisma migrate dev

# 4. 初始化调度器
npm run seed:scheduler

# 5. 启动开发服务器
nx serve scheduler-service

# 6. 启动工作进程
npm run start:worker

# 7. 测试任务创建API
curl -X POST http://localhost:3009/api/v1/scheduler/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Job",
    "cronExpression": "0 */5 * * * *",
    "jobType": "http",
    "config": {
      "url": "https://httpbin.org/get",
      "method": "GET"
    }
  }'
```

### 环境变量配置

```bash
# .env
NODE_ENV=development
PORT=3009

# 数据库配置
DATABASE_URL=postgresql://user:pass@localhost:5432/platform
REDIS_URL=redis://localhost:6379/3

# 服务间通信
INTERNAL_SERVICE_TOKEN=your-internal-service-token
AUTH_SERVICE_URL=http://auth-service:3001
RBAC_SERVICE_URL=http://rbac-service:3002
AUDIT_SERVICE_URL=http://audit-service:3008
NOTIFICATION_SERVICE_URL=http://notification-service:3005

# 调度器配置
SCHEDULER_WORKER_COUNT=5
SCHEDULER_MAX_CONCURRENT_JOBS=1000
SCHEDULER_JOB_TIMEOUT_MS=300000
SCHEDULER_LOCK_TTL_MS=30000

# BullMQ配置
BULL_REDIS_HOST=localhost
BULL_REDIS_PORT=6379
BULL_REDIS_DB=3
BULL_MAX_STALLED_COUNT=3
BULL_STALLED_INTERVAL=30000

# 监控配置
METRICS_ENABLED=true
PROMETHEUS_PORT=9464
LOG_LEVEL=info

# 任务限制
MAX_JOBS_PER_TENANT=1000
MAX_EXECUTIONS_PER_HOUR=10000
JOB_EXECUTION_TIMEOUT=600000
```

## 生产部署检查清单

### 部署前检查
- [ ] 确认服务器资源：1024MB内存，0.75CPU核心
- [ ] 配置所有必需的环境变量
- [ ] 设置Redis持久化和备份
- [ ] 配置BullMQ队列参数
- [ ] 设置任务执行日志轮转
- [ ] 验证与其他服务的网络连通性
- [ ] 测试分布式锁正常工作

### 服务启动顺序
1. PostgreSQL, Redis (基础设施)
2. auth-service, rbac-service (依赖服务)
3. scheduler-service (主服务)
4. scheduler-worker (工作进程)

### 监控指标
- 任务执行成功率 > 99.9%
- 任务调度延迟 < 10秒
- 队列积压任务 < 5000个
- 服务内存使用 < 900MB
- API响应时间P95 < 100ms
- 分布式锁获取成功率 > 95%

### 安全考虑

#### 任务隔离
- 租户级别的任务隔离
- 资源使用限制
- 执行时间限制
- 并发数限制

#### 权限控制
- 任务创建权限验证
- 执行结果访问控制
- 敏感配置加密存储
- 审计日志记录

---

这个任务调度服务为整个微服务平台提供强大的定时任务执行能力，支持100租户+10万用户的企业级任务调度，提供可靠、高性能、可扩展的定时任务执行能力，满足企业级应用的各种调度需求。通过标准版本的优化设计，确保在Week 3内完成开发和部署。