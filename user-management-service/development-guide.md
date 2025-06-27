# 用户管理服务开发文档

## 服务定位

面向**100租户+10万用户**的企业级生产系统设计，作为整个微服务平台的用户数据基础。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户（每租户平均1000用户）
- **API端点**: 57个端点，10个功能模块
- **复杂度**: ⭐（最简单服务，优先开发）
- **开发优先级**: Week 1
- **服务端口**: 3003

## 技术选型（最佳实践）

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (单实例足够10万用户)
- **缓存**: Redis 7+ (热点数据缓存，可选)
- **ORM**: Prisma ORM (类型安全的数据访问)
- **认证**: JWT (标准认证方案)
- **验证**: Class-validator + Class-transformer
- **加密**: bcrypt (密码) + crypto (敏感数据)

### 基础设施
- **容器化**: Docker + Docker Compose (推荐，不使用K8S)
- **消息队列**: Redis Streams (替代Kafka)
- **监控**: Prometheus + Grafana
- **日志**: Winston + PostgreSQL存储

## 完整功能列表

### 核心功能
1. **用户注册/登录/登出**
   - 邮箱/手机号注册
   - 密码强度校验
   - 防重复注册
   - 账户激活流程

2. **用户信息CRUD**
   - 个人资料管理
   - 头像上传
   - 扩展信息维护
   - 数据导出

3. **密码管理**
   - 密码修改
   - 密码重置
   - 密码强度策略
   - 密码历史记录

4. **用户状态管理**
   - 激活/禁用
   - 暂停/恢复
   - 删除/恢复
   - 状态变更日志

### 生产功能
5. **批量导入/导出**
   - Excel批量导入
   - CSV数据导出
   - 导入结果验证
   - 错误数据处理

6. **用户搜索**
   - PostgreSQL全文搜索
   - 多条件组合查询
   - 分页查询优化
   - 搜索结果缓存

7. **登录日志与安全审计**
   - 登录记录追踪
   - 异常登录检测
   - IP地址记录
   - 设备信息收集

8. **多因素认证（MFA）**
   - TOTP验证
   - 短信验证码
   - 邮箱验证码
   - 备用恢复码

9. **第三方登录（OAuth2）**
   - 微信登录
   - QQ登录
   - GitHub登录
   - Google登录

10. **用户分组管理**
    - 用户组创建
    - 批量分组操作
    - 组权限继承
    - 组织架构管理

### 性能优化
- **数据库索引优化**
- **热点数据Redis缓存**
- **分页查询优化**
- **连接池配置**

## API设计（完整版）

### 用户管理API
```typescript
// 用户注册
POST /api/v1/users/register
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "张",
  "lastName": "三",
  "tenantId": "tenant-uuid"
}

// 用户登录
POST /api/v1/users/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfaCode": "123456"
}

// 获取用户信息
GET /api/v1/users/profile
Authorization: Bearer {jwt_token}

// 更新用户信息
PUT /api/v1/users/profile
{
  "firstName": "张",
  "lastName": "三",
  "phone": "13800138000",
  "avatar": "https://example.com/avatar.jpg"
}

// 修改密码
POST /api/v1/users/change-password
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}

// 重置密码
POST /api/v1/users/reset-password
{
  "email": "user@example.com"
}

// 验证重置码
POST /api/v1/users/verify-reset-code
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewPassword123!"
}
```

### 用户管理API（管理员）
```typescript
// 用户列表查询
GET /api/v1/admin/users?page=1&limit=20&search=张三&status=active

// 用户详情
GET /api/v1/admin/users/{userId}

// 更新用户状态
PATCH /api/v1/admin/users/{userId}/status
{
  "status": "suspended",
  "reason": "违规操作"
}

// 批量导入用户
POST /api/v1/admin/users/batch-import
Content-Type: multipart/form-data
file: users.xlsx

// 导出用户数据
GET /api/v1/admin/users/export?format=csv&tenantId=xxx

// 用户分组管理
POST /api/v1/admin/user-groups
{
  "name": "销售组",
  "description": "销售团队成员",
  "userIds": ["user1", "user2"]
}

// 用户登录日志
GET /api/v1/admin/users/{userId}/login-logs?page=1&limit=10
```

### OAuth2集成API
```typescript
// 获取第三方登录URL
GET /api/v1/oauth/authorize/{provider}?redirect_uri=xxx

// 第三方登录回调
POST /api/v1/oauth/callback/{provider}
{
  "code": "auth_code",
  "state": "csrf_token"
}

// 绑定第三方账号
POST /api/v1/users/bind-oauth
{
  "provider": "wechat",
  "openId": "wx_open_id",
  "unionId": "wx_union_id"
}

// 解绑第三方账号
DELETE /api/v1/users/unbind-oauth/{provider}
```

## 数据库设计

### 用户主表 (users)
```sql
CREATE TABLE users.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  username VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  status user_status_enum DEFAULT 'active',
  email_verified_at TIMESTAMP,
  phone_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(32),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 用户状态枚举
CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended', 'banned', 'deleted');
```

### 用户扩展信息表 (user_profiles)
```sql
CREATE TABLE users.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
  gender VARCHAR(10),
  birthday DATE,
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  language VARCHAR(10) DEFAULT 'zh-CN',
  bio TEXT,
  address JSONB,
  social_links JSONB,
  preferences JSONB,
  custom_fields JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 用户登录日志表 (user_login_logs)
```sql
CREATE TABLE users.user_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  login_type VARCHAR(20) NOT NULL, -- 'password', 'oauth', 'mfa'
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked'
  failure_reason VARCHAR(100),
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 第三方账号绑定表 (user_oauth_accounts)
```sql
CREATE TABLE users.user_oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- 'wechat', 'qq', 'github', 'google'
  provider_id VARCHAR(100) NOT NULL,
  open_id VARCHAR(100),
  union_id VARCHAR(100),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  profile_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);
```

### 用户分组表 (user_groups)
```sql
CREATE TABLE users.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_group_id UUID REFERENCES users.user_groups(id),
  created_by UUID REFERENCES users.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE users.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES users.user_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

## 缓存策略

### Redis缓存设计
```typescript
// 用户信息缓存（热点数据）
Cache Key: user:profile:{userId}
TTL: 1小时
Data: 用户基本信息和扩展信息

// 用户权限缓存
Cache Key: user:permissions:{userId}
TTL: 30分钟
Data: 用户权限列表

// 邮箱验证码缓存
Cache Key: verify_code:email:{email}
TTL: 5分钟
Data: 验证码和重试次数

// 短信验证码缓存
Cache Key: verify_code:sms:{phone}
TTL: 5分钟
Data: 验证码和重试次数

// 密码重置Token缓存
Cache Key: reset_token:{token}
TTL: 1小时
Data: 用户ID和过期时间

// 登录失败次数缓存
Cache Key: login_attempts:{email}
TTL: 1小时
Data: 失败次数和锁定时间
```

## 安全措施

### 数据保护
- **密码加密**: bcrypt with salt rounds 12
- **敏感信息加密**: AES-256-GCM
- **个人信息脱敏**: 日志中隐藏敏感信息
- **SQL注入防护**: Prisma ORM参数化查询
- **XSS防护**: 输入验证和输出编码

### 接口安全
- **JWT Token验证**: RS256签名算法
- **请求频率限制**: 登录接口限制10次/分钟
- **参数验证**: Class-validator严格验证
- **CORS配置**: 限制跨域访问
- **HTTPS强制**: 生产环境强制HTTPS

### 多因素认证
```typescript
// TOTP配置
const totpConfig = {
  name: 'Platform',
  keyLength: 32,
  codeLength: 6,
  window: 1,
  encoding: 'base32'
};

// MFA验证流程
@Post('enable-mfa')
async enableMFA(@CurrentUser() user: User) {
  const secret = authenticator.generateSecret();
  const qrCode = authenticator.keyuri(user.email, 'Platform', secret);
  // 返回二维码供用户扫描
  return { qrCode, secret };
}
```

## 性能优化

### 数据库优化
```sql
-- 关键索引
CREATE INDEX idx_users_email ON users.users(email);
CREATE INDEX idx_users_tenant_id ON users.users(tenant_id);
CREATE INDEX idx_users_status ON users.users(status);
CREATE INDEX idx_users_created_at ON users.users(created_at DESC);
CREATE INDEX idx_users_last_login ON users.users(last_login_at DESC);

-- 复合索引
CREATE INDEX idx_users_tenant_status ON users.users(tenant_id, status);
CREATE INDEX idx_users_search ON users.users USING gin(to_tsvector('simple', first_name || ' ' || last_name || ' ' || email));

-- 登录日志索引
CREATE INDEX idx_login_logs_user_time ON users.user_login_logs(user_id, created_at DESC);
CREATE INDEX idx_login_logs_ip ON users.user_login_logs(ip_address, created_at DESC);
```

### 查询优化
```typescript
// 分页查询优化
async findUsers(query: FindUsersDto): Promise<PaginatedResult<User>> {
  const { page = 1, limit = 20, search, status, tenantId } = query;
  
  const where: Prisma.UserWhereInput = {
    tenantId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [users, total] = await Promise.all([
    this.prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true
      }
    }),
    this.prisma.user.count({ where })
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

## 部署配置

### Docker配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3003

CMD ["node", "dist/main.js"]
```

### Docker Compose配置
```yaml
user-service:
  build: ./apps/user-management-service
  ports:
    - "3003:3003"
  environment:
    DATABASE_URL: postgresql://platform:platform123@postgres:5432/platform
    REDIS_URL: redis://redis:6379
    JWT_SECRET: ${JWT_SECRET}
    SMTP_HOST: ${SMTP_HOST}
    SMTP_PORT: ${SMTP_PORT}
    SMTP_USER: ${SMTP_USER}
    SMTP_PASS: ${SMTP_PASS}
    NODE_ENV: production
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  deploy:
    resources:
      limits:
        memory: 256MB
        cpus: '0.5'
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 环境变量配置
```bash
# .env
DATABASE_URL=postgresql://platform:platform123@postgres:5432/platform
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# SMTP配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OAuth配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 文件上传配置
UPLOAD_MAX_SIZE=10MB
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,gif
UPLOAD_STORAGE=local
UPLOAD_PATH=/app/uploads
```

## 监控和告警

### 健康检查
```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory()
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled',
        memory: checks[2].status === 'fulfilled'
      }
    };
  }
}
```

### Prometheus指标
```typescript
// metrics.service.ts
@Injectable()
export class MetricsService {
  private readonly userRegistrations = new Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['tenant_id', 'status']
  });

  private readonly userLogins = new Counter({
    name: 'user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['tenant_id', 'method', 'status']
  });

  private readonly activeUsers = new Gauge({
    name: 'active_users_count',
    help: 'Number of active users',
    labelNames: ['tenant_id']
  });

  recordRegistration(tenantId: string, status: 'success' | 'failed') {
    this.userRegistrations.inc({ tenant_id: tenantId, status });
  }

  recordLogin(tenantId: string, method: string, status: 'success' | 'failed') {
    this.userLogins.inc({ tenant_id: tenantId, method, status });
  }
}
```

## 测试策略

### 单元测试
```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: '张',
        lastName: '三',
        tenantId: 'tenant-uuid'
      };

      const result = await service.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.passwordHash).not.toBe(userData.password);
    });

    it('should throw error for duplicate email', async () => {
      prisma.user.create.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(service.createUser(userData)).rejects.toThrow(ConflictException);
    });
  });
});
```

### 集成测试
```typescript
// user.controller.e2e-spec.ts
describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  describe('/users/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: '张',
          lastName: '三',
          tenantId: 'tenant-uuid'
        })
        .expect(201)
        .expect(res => {
          expect(res.body.data.email).toBe('test@example.com');
          expect(res.body.data.passwordHash).toBeUndefined();
        });
    });
  });
});
```

## 部署清单

### 生产环境配置
- **内存需求**: 256MB
- **CPU需求**: 0.5 core
- **并发连接**: 100
- **数据库连接池**: 20
- **Redis连接池**: 10

### 监控指标
- **响应时间**: P95 < 100ms
- **错误率**: < 0.1%
- **可用性**: > 99.9%
- **吞吐量**: 500 QPS

### 告警规则
- **内存使用率** > 80%
- **CPU使用率** > 70%
- **响应时间** > 500ms
- **错误率** > 1%
- **数据库连接数** > 80%

**用户管理服务作为标准版本的基础服务，提供完整的用户生命周期管理功能，支持100租户、10万用户的生产级需求！** 🚀