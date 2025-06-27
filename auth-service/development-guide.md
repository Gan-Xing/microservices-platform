# 认证授权服务开发文档

## 服务定位

面向**100租户+10万用户**的企业级生产系统设计，作为整个微服务平台的安全核心，提供企业级身份认证和权限管理。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户的企业级生产系统
- **API端点**: 60个端点，12个功能模块
- **复杂度**: ⭐⭐
- **开发优先级**: Week 1
- **服务端口**: 3001

## 技术选型（最佳实践）

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (权限数据存储)
- **缓存**: Redis 7+ (会话存储和JWT黑名单)
- **ORM**: Prisma ORM (类型安全的数据访问)
- **认证**: JWT (RS256签名算法)
- **OAuth**: OAuth 2.0 + OIDC (第三方登录)
- **加密**: Node.js Crypto + bcrypt

### 安全技术
- **Token**: JSON Web Token (非对称加密RS256)
- **OAuth**: GitHub/Google/WeChat/QQ OAuth
- **MFA**: TOTP + SMS + Email
- **加密**: AES-256-GCM + RSA-2048
- **密码策略**: 强密码要求 + 历史检查

### 基础设施
- **容器化**: Docker + Docker Compose (推荐，不使用K8S)
- **消息队列**: Redis Streams (认证事件)
- **监控**: Prometheus + Grafana
- **日志**: Winston + PostgreSQL存储

## 完整功能列表

### 核心认证功能
1. **用户认证**
   - 用户名/邮箱/手机号登录
   - 密码强度验证
   - 登录失败锁定
   - 会话管理

2. **JWT Token管理**
   - Access Token签发
   - Refresh Token轮换
   - Token黑名单管理
   - Token过期处理

3. **会话管理**
   - 单点登录(SSO)
   - 多设备登录控制
   - 强制登出
   - 会话超时管理

4. **密码管理**
   - 密码策略配置
   - 密码历史检查
   - 密码重置流程
   - 密码过期提醒

### 高级安全功能
5. **多因素认证（MFA）**
   - TOTP身份验证器
   - 短信验证码
   - 邮箱验证码
   - 备用恢复码

6. **第三方登录（OAuth2）**
   - 微信登录
   - QQ登录
   - GitHub登录
   - Google登录
   - 账号绑定/解绑

7. **安全审计**
   - 登录日志记录
   - 异常登录检测
   - 风险行为分析
   - 安全事件告警

8. **权限管理**
   - 基于角色的访问控制(RBAC)
   - 细粒度权限控制
   - 权限继承
   - 动态权限检查

### 企业级功能
9. **单点登录(SSO)**
   - SAML 2.0支持
   - OIDC协议支持
   - 企业身份提供商集成
   - 跨域认证

10. **设备管理**
    - 设备指纹识别
    - 可信设备管理
    - 设备授权控制
    - 设备黑名单

11. **API安全**
    - API密钥管理
    - 请求签名验证
    - 接口访问控制
    - 频率限制

12. **合规安全**
    - 密码策略合规
    - 访问日志审计
    - 数据加密存储
    - 隐私保护

## API设计（完整版）

### 用户认证API
```typescript
// 用户登录
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfaCode": "123456",
  "deviceInfo": {
    "deviceId": "device-uuid",
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  }
}

// 刷新Token
POST /api/v1/auth/refresh
{
  "refreshToken": "refresh_token_here"
}

// 用户登出
POST /api/v1/auth/logout
Authorization: Bearer {access_token}
{
  "allDevices": false
}

// Token验证
POST /api/v1/auth/verify
{
  "token": "jwt_token_here"
}

// 撤销Token
POST /api/v1/auth/revoke
{
  "token": "jwt_token_here",
  "tokenType": "access" | "refresh"
}
```

### 多因素认证API
```typescript
// 启用MFA
POST /api/v1/auth/mfa/enable
{
  "method": "totp" | "sms" | "email"
}

// 验证MFA设置
POST /api/v1/auth/mfa/verify-setup
{
  "secret": "totp_secret",
  "code": "123456"
}

// MFA验证
POST /api/v1/auth/mfa/verify
{
  "method": "totp" | "sms" | "email",
  "code": "123456",
  "token": "pending_auth_token"
}

// 禁用MFA
POST /api/v1/auth/mfa/disable
{
  "password": "current_password",
  "mfaCode": "123456"
}

// 生成备用码
POST /api/v1/auth/mfa/backup-codes
{
  "password": "current_password"
}
```

### OAuth2集成API
```typescript
// 获取OAuth授权URL
GET /api/v1/auth/oauth/{provider}/authorize
?redirect_uri=https://app.example.com/callback
&state=csrf_token

// OAuth回调处理
POST /api/v1/auth/oauth/{provider}/callback
{
  "code": "authorization_code",
  "state": "csrf_token"
}

// 绑定OAuth账号
POST /api/v1/auth/oauth/{provider}/bind
Authorization: Bearer {access_token}
{
  "code": "authorization_code"
}

// 解绑OAuth账号
DELETE /api/v1/auth/oauth/{provider}/unbind
Authorization: Bearer {access_token}

// 获取已绑定账号
GET /api/v1/auth/oauth/accounts
Authorization: Bearer {access_token}
```

### 权限管理API
```typescript
// 检查权限
POST /api/v1/auth/permissions/check
Authorization: Bearer {access_token}
{
  "resource": "user",
  "action": "read",
  "context": {
    "tenantId": "tenant-uuid",
    "resourceId": "user-uuid"
  }
}

// 获取用户权限
GET /api/v1/auth/permissions/user
Authorization: Bearer {access_token}

// 获取用户角色
GET /api/v1/auth/roles/user
Authorization: Bearer {access_token}

// 权限批量检查
POST /api/v1/auth/permissions/batch-check
Authorization: Bearer {access_token}
{
  "checks": [
    {
      "resource": "user",
      "action": "read"
    },
    {
      "resource": "tenant",
      "action": "manage"
    }
  ]
}
```

### 会话管理API
```typescript
// 获取活跃会话
GET /api/v1/auth/sessions
Authorization: Bearer {access_token}

// 终止会话
DELETE /api/v1/auth/sessions/{sessionId}
Authorization: Bearer {access_token}

// 终止所有会话
DELETE /api/v1/auth/sessions/all
Authorization: Bearer {access_token}

// 获取登录历史
GET /api/v1/auth/login-history
Authorization: Bearer {access_token}
?page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31
```

## 数据库设计

### 用户认证表 (auth_users)
```sql
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- 关联用户服务的用户ID
  tenant_id UUID NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMP DEFAULT NOW(),
  password_expires_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip INET,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  backup_codes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### JWT Token表 (auth_tokens)
```sql
CREATE TABLE auth.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti VARCHAR(255) UNIQUE NOT NULL, -- JWT ID
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  token_type VARCHAR(20) NOT NULL, -- 'access', 'refresh'
  device_id VARCHAR(255),
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  issued_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### OAuth账号表 (oauth_accounts)
```sql
CREATE TABLE auth.oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'github', 'google', 'wechat', 'qq'
  provider_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  provider_name VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  profile_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);
```

### 登录历史表 (login_history)
```sql
CREATE TABLE auth.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  login_method VARCHAR(50) NOT NULL, -- 'password', 'oauth', 'sso'
  provider VARCHAR(50), -- OAuth提供商
  ip_address INET,
  user_agent TEXT,
  device_id VARCHAR(255),
  device_info JSONB,
  location JSONB,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked'
  failure_reason VARCHAR(255),
  mfa_used BOOLEAN DEFAULT FALSE,
  session_duration INTERVAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 权限表 (permissions)
```sql
CREATE TABLE auth.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(50) DEFAULT 'tenant', -- 'global', 'tenant', 'resource'
  conditions JSONB,
  tenant_id UUID, -- NULL表示全局权限
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(code, tenant_id)
);
```

### 角色表 (roles)
```sql
CREATE TABLE auth.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
  parent_role_id UUID REFERENCES auth.roles(id),
  level INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  permissions JSONB, -- 权限代码数组
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(code, tenant_id)
);
```

## JWT Token设计

### Token结构
```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;          // 用户ID
  email: string;        // 用户邮箱
  tenantId: string;     // 租户ID
  roles: string[];      // 用户角色代码
  permissions: string[]; // 用户权限代码
  deviceId?: string;    // 设备ID
  iat: number;          // 签发时间
  exp: number;          // 过期时间
  jti: string;          // Token ID
  iss: string;          // 签发者
  aud: string;          // 受众
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string;          // 用户ID
  tenantId: string;     // 租户ID
  tokenType: 'refresh'; // Token类型
  deviceId?: string;    // 设备ID
  iat: number;          // 签发时间
  exp: number;          // 过期时间
  jti: string;          // Token ID
  iss: string;          // 签发者
}
```

### 密钥管理
```typescript
// JWKS配置
interface JWKSConfig {
  keys: [
    {
      kty: 'RSA',
      use: 'sig',
      kid: 'auth-service-2024-01',
      alg: 'RS256',
      n: '...',    // RSA公钥模数
      e: 'AQAB'    // RSA公钥指数
    }
  ]
}

// 密钥轮换策略
const keyRotationConfig = {
  rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90天
  gracePeriod: 7 * 24 * 60 * 60 * 1000,       // 7天宽限期
  keySize: 2048                                 // RSA密钥长度
};
```

## 安全策略

### 密码策略
```typescript
// 密码强度要求
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    'password', '123456', 'qwerty', 'admin'
  ],
  historyCheck: 5,        // 检查最近5个密码
  expirationDays: 90,     // 密码90天过期
  lockoutThreshold: 5,    // 5次失败后锁定
  lockoutDuration: 30     // 锁定30分钟
};
```

### 会话安全
```typescript
// 会话配置
const sessionConfig = {
  accessTokenTTL: 15 * 60,        // 15分钟
  refreshTokenTTL: 7 * 24 * 60 * 60, // 7天
  maxConcurrentSessions: 5,        // 最大并发会话
  sessionTimeout: 2 * 60 * 60,     // 2小时无活动超时
  rememberMeDuration: 30 * 24 * 60 * 60 // 记住我30天
};
```

### 多因素认证
```typescript
// TOTP配置
const totpConfig = {
  issuer: 'Platform',
  algorithm: 'sha1',
  digits: 6,
  period: 30,
  window: 1
};

// 短信验证配置
const smsConfig = {
  codeLength: 6,
  expiration: 5 * 60,     // 5分钟
  rateLimit: 3,           // 每天最多3次
  provider: 'aliyun'      // 短信服务商
};
```

## 缓存策略

### Redis缓存设计
```typescript
// JWT黑名单缓存
Cache Key: auth:blacklist:{jti}
TTL: Token剩余有效期
Data: 撤销原因和时间

// 用户会话缓存
Cache Key: auth:session:{userId}:{deviceId}
TTL: 会话超时时间
Data: 会话信息和权限

// 登录失败次数缓存
Cache Key: auth:failed_attempts:{email}
TTL: 锁定时间
Data: 失败次数和锁定状态

// MFA验证码缓存
Cache Key: auth:mfa:{userId}:{method}
TTL: 验证码有效期
Data: 验证码和重试次数

// OAuth状态缓存
Cache Key: auth:oauth:state:{state}
TTL: 10分钟
Data: OAuth请求信息

// 权限缓存
Cache Key: auth:permissions:{userId}
TTL: 30分钟
Data: 用户权限列表
```

## 安全措施

### 数据保护
- **密码加密**: bcrypt with salt rounds 12
- **敏感数据加密**: AES-256-GCM
- **传输加密**: TLS 1.3强制
- **数据库加密**: 透明数据加密(TDE)

### 接口安全
- **HTTPS强制**: 生产环境强制HTTPS
- **CORS配置**: 严格的跨域策略
- **请求验证**: 严格的参数验证
- **SQL注入防护**: ORM参数化查询
- **XSS防护**: 输入净化和输出编码

### 监控和检测
```typescript
// 异常登录检测
const securityRules = [
  {
    name: 'unusual_location',
    description: '异常地理位置登录',
    threshold: 1000, // 1000公里
    action: 'require_mfa'
  },
  {
    name: 'brute_force',
    description: '暴力破解攻击',
    threshold: 10,   // 10次失败
    action: 'block_ip'
  },
  {
    name: 'concurrent_sessions',
    description: '异常并发会话',
    threshold: 10,
    action: 'alert_admin'
  }
];
```

## 性能优化

### 数据库优化
```sql
-- 关键索引
CREATE INDEX idx_auth_users_email ON auth.users(email);
CREATE INDEX idx_auth_users_tenant ON auth.users(tenant_id);
CREATE INDEX idx_auth_tokens_jti ON auth.tokens(jti);
CREATE INDEX idx_auth_tokens_user_device ON auth.tokens(user_id, device_id);
CREATE INDEX idx_login_history_user_time ON auth.login_history(user_id, created_at DESC);
CREATE INDEX idx_permissions_code_tenant ON auth.permissions(code, tenant_id);
CREATE INDEX idx_roles_tenant ON auth.roles(tenant_id);

-- 分区表（登录历史）
CREATE TABLE auth.login_history_2024_01 PARTITION OF auth.login_history
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 缓存优化
```typescript
// 权限检查优化
@Injectable()
export class PermissionService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // 1. 检查缓存
    const cacheKey = `auth:permission:${userId}:${resource}:${action}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    // 2. 数据库查询
    const hasPermission = await this.checkPermissionFromDB(
      userId, resource, action
    );

    // 3. 缓存结果
    await this.redis.setex(cacheKey, 300, hasPermission.toString());
    return hasPermission;
  }
}
```

## 部署配置

### Docker配置
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .
RUN npm run build

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

### Docker Compose配置
```yaml
auth-service:
  build: ./apps/auth-service
  ports:
    - "3001:3001"
  environment:
    DATABASE_URL: postgresql://platform:platform123@postgres:5432/platform
    REDIS_URL: redis://redis:6379
    JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
    JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
    JWT_ISSUER: platform-auth
    JWT_AUDIENCE: platform-services
    OAUTH_GITHUB_CLIENT_ID: ${OAUTH_GITHUB_CLIENT_ID}
    OAUTH_GITHUB_CLIENT_SECRET: ${OAUTH_GITHUB_CLIENT_SECRET}
    OAUTH_GOOGLE_CLIENT_ID: ${OAUTH_GOOGLE_CLIENT_ID}
    OAUTH_GOOGLE_CLIENT_SECRET: ${OAUTH_GOOGLE_CLIENT_SECRET}
    SMS_PROVIDER: aliyun
    SMS_ACCESS_KEY: ${SMS_ACCESS_KEY}
    SMS_SECRET_KEY: ${SMS_SECRET_KEY}
    NODE_ENV: production
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  deploy:
    resources:
      limits:
        memory: 512MB
        cpus: '1'
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 环境变量配置
```bash
# .env
# 数据库配置
DATABASE_URL=postgresql://platform:platform123@postgres:5432/platform
REDIS_URL=redis://redis:6379

# JWT配置
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_ISSUER=platform-auth
JWT_AUDIENCE=platform-services
JWT_ACCESS_TOKEN_TTL=900
JWT_REFRESH_TOKEN_TTL=604800

# OAuth配置
OAUTH_GITHUB_CLIENT_ID=your_github_client_id
OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_WECHAT_APP_ID=your_wechat_app_id
OAUTH_WECHAT_APP_SECRET=your_wechat_app_secret

# 短信配置
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=your_sms_access_key
SMS_SECRET_KEY=your_sms_secret_key
SMS_SIGN_NAME=your_sms_sign
SMS_TEMPLATE_CODE=SMS_123456789

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 安全配置
PASSWORD_SALT_ROUNDS=12
MFA_ISSUER=Platform
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```

## 监控和告警

### 健康检查
```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkJWTKeys(),
      this.checkMemory()
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled',
        jwt: checks[2].status === 'fulfilled',
        memory: checks[3].status === 'fulfilled'
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
  private readonly loginAttempts = new Counter({
    name: 'auth_login_attempts_total',
    help: 'Total number of login attempts',
    labelNames: ['tenant_id', 'method', 'status']
  });

  private readonly tokenOperations = new Counter({
    name: 'auth_token_operations_total',
    help: 'Total number of token operations',
    labelNames: ['operation', 'status']
  });

  private readonly mfaVerifications = new Counter({
    name: 'auth_mfa_verifications_total',
    help: 'Total number of MFA verifications',
    labelNames: ['method', 'status']
  });

  private readonly activeSessions = new Gauge({
    name: 'auth_active_sessions_count',
    help: 'Number of active sessions',
    labelNames: ['tenant_id']
  });

  recordLogin(tenantId: string, method: string, status: 'success' | 'failed') {
    this.loginAttempts.inc({ tenant_id: tenantId, method, status });
  }

  recordTokenOperation(operation: string, status: 'success' | 'failed') {
    this.tokenOperations.inc({ operation, status });
  }
}
```

## 测试策略

### 单元测试
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const result = await service.login(credentials);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(service.login(credentials)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### 安全测试
```typescript
// security.e2e-spec.ts
describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('Brute Force Protection', () => {
    it('should lock account after failed attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // 尝试5次错误登录
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(credentials)
          .expect(401);
      }

      // 第6次应该返回账户锁定
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(423); // Locked
    });
  });
});
```

## 部署清单

### 生产环境配置
- **内存需求**: 512MB
- **CPU需求**: 1 core
- **并发连接**: 200
- **数据库连接池**: 30
- **Redis连接池**: 20

### 监控指标
- **响应时间**: P95 < 100ms
- **错误率**: < 0.1%
- **可用性**: > 99.9%
- **吞吐量**: 1000 QPS

### 告警规则
- **登录失败率** > 5%
- **Token验证失败率** > 1%
- **MFA验证失败率** > 10%
- **异常登录检测** 触发
- **内存使用率** > 80%
- **CPU使用率** > 70%

**认证授权服务作为标准版本的安全核心，提供企业级身份认证和权限管理功能，支持100租户+10万用户的生产级安全需求！** 🚀