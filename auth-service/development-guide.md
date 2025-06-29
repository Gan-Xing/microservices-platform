# 认证授权服务开发文档

## 🎯 服务概述

面向**100租户+10万用户**的企业级生产系统设计，作为整个微服务平台的安全核心，提供企业级身份认证和权限管理。

### 🎯 标准版本定位
- **用户规模**: 支持100租户+10万用户的企业级生产系统
- **API端点**: 60个端点，12个功能模块
- **复杂度**: ⭐⭐
- **开发优先级**: Week 1
- **服务端口**: 3001

## 🛠️ 技术栈

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

### 基础设施（标准版本优化）
- **容器化**: Docker + Docker Compose（不使用Kubernetes）
- **消息队列**: Redis Streams（认证事件，替代Kafka）
- **监控**: Prometheus + Grafana（标准版本监控栈）
- **日志**: Winston + PostgreSQL存储（不使用Elasticsearch）
- **服务发现**: Docker Compose内置网络（不使用Consul）
- **配置管理**: 环境变量 + Docker Compose（不使用配置中心）

## 📋 完整功能列表

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

## 🔗 API设计

### 🎯 StandardApiResponse标准响应格式实施

认证服务已完成StandardApiResponse标准响应格式实施，所有60个API端点均采用统一响应格式，确保与平台其他服务的一致性。

#### 标准成功响应格式
```typescript
interface AuthServiceResponse<T> {
  success: true;
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    version: string;
    service: 'auth-service';
  };
}
```

#### 标准错误响应格式
```typescript
interface AuthServiceErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    requestId: string;
    timestamp: string;
    service: 'auth-service';
    retryable: boolean;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    duration: number;
    version: string;
    service: 'auth-service';
  };
}
```

#### 认证特有错误代码
```typescript
export enum AuthServiceErrorCodes {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',
  MFA_SETUP_REQUIRED = 'MFA_SETUP_REQUIRED',
  OAUTH_ERROR = 'OAUTH_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_REUSE = 'PASSWORD_REUSE'
}
```

### 用户认证API

#### 用户登录
```typescript
// 请求
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

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "tenantId": "tenant-uuid",
      "roles": ["member"],
      "permissions": ["user.read", "user.update"]
    },
    "sessionId": "session-uuid",
    "mfaRequired": false,
    "deviceTrusted": true
  },
  "metadata": {
    "requestId": "req_12345",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 125,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - 认证失败 (StandardApiResponse)
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "用户名或密码错误",
    "details": {
      "attemptsRemaining": 3,
      "lockoutTime": null
    },
    "field": "credentials",
    "requestId": "req_12346",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": true
  },
  "metadata": {
    "requestId": "req_12346",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 45,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - 需要MFA验证
{
  "success": false,
  "data": null,
  "error": {
    "code": "MFA_REQUIRED",
    "message": "需要多因素认证",
    "details": {
      "availableMethods": ["totp", "sms"],
      "pendingToken": "pending_auth_token_xxx"
    },
    "requestId": "req_12347",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": false
  },
  "metadata": {
    "requestId": "req_12347",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 89,
    "version": "1.0",
    "service": "auth-service"
  }
}

#### 刷新Token
```typescript
// 请求
POST /api/v1/auth/refresh
{
  "refreshToken": "refresh_token_here"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "sessionId": "session-uuid"
  },
  "metadata": {
    "requestId": "req_12348",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 25,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - Token无效
{
  "success": false,
  "data": null,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "刷新令牌无效或已过期",
    "details": {
      "tokenExpired": true,
      "requiresReauth": true
    },
    "field": "refreshToken",
    "requestId": "req_12349",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": false
  },
  "metadata": {
    "requestId": "req_12349",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 15,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 用户登出
```typescript
// 请求
POST /api/v1/auth/logout
Authorization: Bearer {access_token}
{
  "allDevices": false
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "message": "登出成功",
    "revokedSessions": 1,
    "revokedTokens": 2
  },
  "metadata": {
    "requestId": "req_12350",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 35,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### Token验证
```typescript
// 请求
POST /api/v1/auth/verify
{
  "token": "jwt_token_here"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "valid": true,
    "payload": {
      "sub": "user-uuid",
      "email": "user@example.com",
      "tenantId": "tenant-uuid",
      "roles": ["member"],
      "permissions": ["user.read", "user.update"],
      "exp": 1704114000,
      "iat": 1704113100
    },
    "sessionId": "session-uuid",
    "expiresAt": "2024-01-01T10:15:00Z"
  },
  "metadata": {
    "requestId": "req_12351",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 5,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - Token无效
{
  "success": false,
  "data": null,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "令牌无效或已过期",
    "details": {
      "reason": "signature_invalid"
    },
    "field": "token",
    "requestId": "req_12352",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": false
  },
  "metadata": {
    "requestId": "req_12352",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 3,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 撤销Token
```typescript
// 请求
POST /api/v1/auth/revoke
{
  "token": "jwt_token_here",
  "tokenType": "access" | "refresh"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "revoked": true,
    "tokenId": "jti-12345",
    "revokedAt": "2024-01-01T10:00:00Z"
  },
  "metadata": {
    "requestId": "req_12353",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 12,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

### 多因素认证API

#### 启用MFA
```typescript
// 请求
POST /api/v1/auth/mfa/enable
{
  "method": "totp" | "sms" | "email"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "method": "totp",
    "setupRequired": true,
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backupCodes": ["12345678", "87654321"],
    "setupUrl": "otpauth://totp/Platform:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Platform"
  },
  "metadata": {
    "requestId": "req_12354",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 45,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 验证MFA设置
```typescript
// 请求
POST /api/v1/auth/mfa/verify-setup
{
  "secret": "totp_secret",
  "code": "123456"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "verified": true,
    "enabled": true,
    "method": "totp",
    "backupCodes": ["12345678", "87654321"]
  },
  "metadata": {
    "requestId": "req_12355",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 25,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - MFA代码无效
{
  "success": false,
  "data": null,
  "error": {
    "code": "MFA_INVALID",
    "message": "多因素认证代码无效",
    "details": {
      "attemptsRemaining": 2,
      "lockoutTime": null
    },
    "field": "code",
    "requestId": "req_12356",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": true
  },
  "metadata": {
    "requestId": "req_12356",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 15,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### MFA验证
```typescript
// 请求
POST /api/v1/auth/mfa/verify
{
  "method": "totp" | "sms" | "email",
  "code": "123456",
  "token": "pending_auth_token"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "sessionId": "session-uuid"
  },
  "metadata": {
    "requestId": "req_12357",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 35,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 禁用MFA
```typescript
// 请求
POST /api/v1/auth/mfa/disable
{
  "password": "current_password",
  "mfaCode": "123456"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "disabled": true,
    "method": "totp",
    "disabledAt": "2024-01-01T10:00:00Z"
  },
  "metadata": {
    "requestId": "req_12358",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 25,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 生成备用码
```typescript
// 请求
POST /api/v1/auth/mfa/backup-codes
{
  "password": "current_password"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "backupCodes": [
      "12345678",
      "87654321",
      "13579246",
      "24681357",
      "98765432",
      "11223344",
      "55667788",
      "99887766"
    ],
    "generatedAt": "2024-01-01T10:00:00Z",
    "note": "请妥善保存这些备用代码，每个代码只能使用一次"
  },
  "metadata": {
    "requestId": "req_12359",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 15,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

### OAuth2集成API

#### 获取OAuth授权URL
```typescript
// 请求
GET /api/v1/auth/oauth/{provider}/authorize
?redirect_uri=https://app.example.com/callback
&state=csrf_token

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "authUrl": "https://github.com/login/oauth/authorize?client_id=xxx&redirect_uri=xxx&state=xxx&scope=user:email",
    "state": "csrf_token_xxx",
    "expiresIn": 600,
    "provider": "github"
  },
  "metadata": {
    "requestId": "req_12360",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 8,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### OAuth回调处理
```typescript
// 请求
POST /api/v1/auth/oauth/{provider}/callback
{
  "code": "authorization_code",
  "state": "csrf_token"
}

// 成功响应 - 新用户注册 (StandardApiResponse)
{
  "success": true,
  "data": {
    "isNewUser": true,
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "provider": "github",
      "tenantId": "tenant-uuid"
    },
    "sessionId": "session-uuid"
  },
  "metadata": {
    "requestId": "req_12361",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 150,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - OAuth错误
{
  "success": false,
  "data": null,
  "error": {
    "code": "OAUTH_ERROR",
    "message": "OAuth授权失败",
    "details": {
      "provider": "github",
      "reason": "access_denied",
      "description": "用户拒绝授权"
    },
    "requestId": "req_12362",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": true
  },
  "metadata": {
    "requestId": "req_12362",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 45,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 绑定OAuth账号
```typescript
// 请求
POST /api/v1/auth/oauth/{provider}/bind
Authorization: Bearer {access_token}
{
  "code": "authorization_code"
}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "bound": true,
    "provider": "github",
    "providerId": "github_user_123",
    "providerEmail": "user@github.com",
    "providerName": "John Doe",
    "boundAt": "2024-01-01T10:00:00Z"
  },
  "metadata": {
    "requestId": "req_12363",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 85,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 解绑OAuth账号
```typescript
// 请求
DELETE /api/v1/auth/oauth/{provider}/unbind
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "unbound": true,
    "provider": "github",
    "unboundAt": "2024-01-01T10:00:00Z"
  },
  "metadata": {
    "requestId": "req_12364",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 25,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 获取已绑定账号
```typescript
// 请求
GET /api/v1/auth/oauth/accounts
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": [
    {
      "provider": "github",
      "providerId": "github_user_123",
      "providerEmail": "user@github.com",
      "providerName": "John Doe",
      "boundAt": "2024-01-01T09:00:00Z",
      "isActive": true
    },
    {
      "provider": "google",
      "providerId": "google_user_456",
      "providerEmail": "user@gmail.com",
      "providerName": "John Doe",
      "boundAt": "2024-01-01T08:00:00Z",
      "isActive": true
    }
  ],
  "metadata": {
    "requestId": "req_12365",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 15,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

### 权限管理API

#### 检查权限
```typescript
// 请求
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

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "hasPermission": true,
    "permission": {
      "resource": "user",
      "action": "read",
      "scope": "tenant"
    },
    "context": {
      "tenantId": "tenant-uuid",
      "resourceId": "user-uuid"
    },
    "checkTime": "2024-01-01T10:00:00Z"
  },
  "metadata": {
    "requestId": "req_12366",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 8,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - 权限被拒绝
{
  "success": false,
  "data": null,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "权限不足",
    "details": {
      "resource": "user",
      "action": "read",
      "reason": "insufficient_role"
    },
    "requestId": "req_12367",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": false
  },
  "metadata": {
    "requestId": "req_12367",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 5,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 获取用户权限
```typescript
// 请求
GET /api/v1/auth/permissions/user
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "permissions": [
      {
        "code": "user.read",
        "name": "查看用户",
        "resource": "user",
        "action": "read",
        "scope": "tenant"
      },
      {
        "code": "user.update",
        "name": "更新用户",
        "resource": "user",
        "action": "update",
        "scope": "tenant"
      }
    ],
    "totalCount": 2,
    "lastUpdated": "2024-01-01T09:00:00Z"
  },
  "metadata": {
    "requestId": "req_12368",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 12,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 获取用户角色
```typescript
// 请求
GET /api/v1/auth/roles/user
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "roles": [
      {
        "code": "member",
        "name": "普通成员",
        "level": 1,
        "permissions": ["user.read", "user.update"],
        "assignedAt": "2024-01-01T08:00:00Z"
      }
    ],
    "totalCount": 1,
    "effectivePermissions": ["user.read", "user.update"]
  },
  "metadata": {
    "requestId": "req_12369",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 10,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 权限批量检查
```typescript
// 请求
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

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "results": [
      {
        "resource": "user",
        "action": "read",
        "hasPermission": true
      },
      {
        "resource": "tenant",
        "action": "manage",
        "hasPermission": false,
        "reason": "insufficient_role"
      }
    ],
    "summary": {
      "total": 2,
      "granted": 1,
      "denied": 1
    }
  },
  "metadata": {
    "requestId": "req_12370",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 15,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

### 会话管理API

#### 获取活跃会话
```typescript
// 请求
GET /api/v1/auth/sessions
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": [
    {
      "sessionId": "session-uuid-1",
      "deviceId": "device-uuid-1",
      "deviceInfo": {
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "platform": "Web",
        "browser": "Chrome 120.0"
      },
      "location": {
        "ip": "192.168.1.100",
        "country": "中国",
        "city": "北京"
      },
      "createdAt": "2024-01-01T09:00:00Z",
      "lastActiveAt": "2024-01-01T10:00:00Z",
      "expiresAt": "2024-01-01T17:00:00Z",
      "isCurrent": true,
      "isActive": true
    },
    {
      "sessionId": "session-uuid-2",
      "deviceId": "device-uuid-2",
      "deviceInfo": {
        "userAgent": "MyApp/1.0 (iPhone; iOS 17.0)",
        "platform": "iOS",
        "browser": "Mobile App"
      },
      "location": {
        "ip": "192.168.1.101",
        "country": "中国",
        "city": "上海"
      },
      "createdAt": "2024-01-01T08:00:00Z",
      "lastActiveAt": "2024-01-01T09:30:00Z",
      "expiresAt": "2024-01-01T16:00:00Z",
      "isCurrent": false,
      "isActive": true
    }
  ],
  "metadata": {
    "requestId": "req_12371",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 18,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 终止会话
```typescript
// 请求
DELETE /api/v1/auth/sessions/{sessionId}
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "terminated": true,
    "sessionId": "session-uuid-2",
    "terminatedAt": "2024-01-01T10:00:00Z",
    "reason": "user_request"
  },
  "metadata": {
    "requestId": "req_12372",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 12,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 终止所有会话
```typescript
// 请求
DELETE /api/v1/auth/sessions/all
Authorization: Bearer {access_token}

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "terminatedCount": 5,
    "terminatedSessions": [
      "session-uuid-1",
      "session-uuid-2",
      "session-uuid-3",
      "session-uuid-4",
      "session-uuid-5"
    ],
    "terminatedAt": "2024-01-01T10:00:00Z",
    "reason": "user_request_all",
    "note": "当前会话将在此响应后失效"
  },
  "metadata": {
    "requestId": "req_12373",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 35,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

#### 获取登录历史
```typescript
// 请求
GET /api/v1/auth/login-history
Authorization: Bearer {access_token}
?page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31

// 成功响应 (StandardApiResponse) - 分页格式
{
  "success": true,
  "data": [
    {
      "id": "history-uuid-1",
      "loginMethod": "password",
      "provider": null,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "deviceId": "device-uuid-1",
      "deviceInfo": {
        "platform": "Web",
        "browser": "Chrome 120.0"
      },
      "location": {
        "country": "中国",
        "city": "北京"
      },
      "status": "success",
      "mfaUsed": true,
      "sessionDuration": "2h 30m",
      "createdAt": "2024-01-01T09:00:00Z"
    },
    {
      "id": "history-uuid-2",
      "loginMethod": "oauth",
      "provider": "github",
      "ipAddress": "192.168.1.101",
      "userAgent": "MyApp/1.0 (iPhone; iOS 17.0)",
      "deviceId": "device-uuid-2",
      "deviceInfo": {
        "platform": "iOS",
        "browser": "Mobile App"
      },
      "location": {
        "country": "中国",
        "city": "上海"
      },
      "status": "success",
      "mfaUsed": false,
      "sessionDuration": "1h 45m",
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "requestId": "req_12374",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 25,
    "version": "1.0",
    "service": "auth-service"
  }
}
```

## 🗄️ 数据库设计

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

## 🏗️ 核心架构实现

### JWT Token设计

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

### 安全策略

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

### 缓存策略

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

### StandardApiResponse技术组件

基于P3-1用户管理服务的成功实施经验，认证服务采用相同的技术架构：

#### 响应拦截器 (AuthResponseInterceptor)
```typescript
// apps/auth-service/src/common/interceptors/auth-response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class AuthResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    
    return next.handle().pipe(
      map(data => {
        const duration = Date.now() - startTime;
        
        // 针对认证服务的安全考虑，某些响应需要特殊处理
        const sanitizedData = this.sanitizeAuthData(data, request.path);
        
        return {
          success: true,
          data: sanitizedData,
          ...(data?.pagination && { pagination: data.pagination }),
          metadata: {
            requestId: request.headers['x-request-id'] || this.generateRequestId(),
            timestamp: new Date().toISOString(),
            duration,
            version: '1.0',
            service: 'auth-service'
          }
        };
      })
    );
  }
  
  private sanitizeAuthData(data: any, path: string): any {
    // 敏感路径的特殊处理
    if (path.includes('/mfa/') && data?.secret) {
      // MFA设置时隐藏敏感信息
      return {
        ...data,
        secret: data.secret ? '***HIDDEN***' : undefined
      };
    }
    
    // Token响应的安全处理
    if (data?.refreshToken) {
      return {
        ...data,
        refreshToken: this.maskToken(data.refreshToken)
      };
    }
    
    return data;
  }
  
  private maskToken(token: string): string {
    if (!token || token.length < 20) return token;
    return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
  }
  
  private generateRequestId(): string {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

#### 统一异常过滤器 (AuthHttpExceptionFilter)
```typescript
// apps/auth-service/src/common/filters/auth-http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AuthHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const { status, errorResponse } = this.processException(exception, request);
    
    // 记录安全相关的错误
    if (this.isSecurityRelated(request.path, status)) {
      this.logger.warn('Security-related error', {
        path: request.path,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        status,
        error: errorResponse.error?.code
      });
    }
    
    response.status(status).json(errorResponse);
  }
  
  private processException(exception: unknown, request: Request) {
    const requestId = request.headers['x-request-id'] || this.generateRequestId();
    const timestamp = new Date().toISOString();
    
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      return {
        status,
        errorResponse: {
          success: false,
          data: null,
          error: {
            code: this.getErrorCode(status, exceptionResponse),
            message: this.getErrorMessage(exceptionResponse),
            details: this.getErrorDetails(exceptionResponse),
            field: this.getErrorField(exceptionResponse),
            requestId,
            timestamp,
            service: 'auth-service',
            retryable: this.isRetryable(status)
          },
          metadata: {
            requestId,
            timestamp,
            duration: 0,
            version: '1.0',
            service: 'auth-service'
          }
        }
      };
    }
    
    // 未知错误的处理
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '服务器内部错误',
          requestId,
          timestamp,
          service: 'auth-service',
          retryable: false
        },
        metadata: {
          requestId,
          timestamp,
          duration: 0,
          version: '1.0',
          service: 'auth-service'
        }
      }
    };
  }
  
  private isSecurityRelated(path: string, status: number): boolean {
    const securityPaths = ['/auth/login', '/auth/mfa/', '/auth/oauth/'];
    const securityStatuses = [401, 403, 429];
    
    return securityPaths.some(p => path.includes(p)) || 
           securityStatuses.includes(status);
  }
  
  private getErrorCode(status: number, response: any): string {
    if (typeof response === 'object' && response.error?.code) {
      return response.error.code;
    }
    
    // 认证服务特有的错误码映射
    const authErrorCodes = {
      401: 'UNAUTHORIZED',
      403: 'PERMISSION_DENIED',
      423: 'ACCOUNT_LOCKED',
      429: 'RATE_LIMIT_EXCEEDED'
    };
    
    return authErrorCodes[status] || 'HTTP_' + status;
  }
  
  private isRetryable(status: number): boolean {
    // 认证服务的重试策略
    const retryableStatuses = [429, 502, 503, 504];
    const nonRetryableAuthStatuses = [401, 403, 423]; // 认证失败不应重试
    
    if (nonRetryableAuthStatuses.includes(status)) {
      return false;
    }
    
    return retryableStatuses.includes(status);
  }
}
```

#### 认证验证管道集成
```typescript
// apps/auth-service/src/common/pipes/auth-validation.pipe.ts
import { Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { UnifiedValidationPipe } from '@platform/shared';

@Injectable()
export class AuthValidationPipe extends UnifiedValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true
    });
  }
  
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response = error.getResponse() as any;
        
        // 为认证服务添加特殊的验证错误处理
        if (this.isPasswordField(response)) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'WEAK_PASSWORD',
              message: '密码强度不足',
              details: response.error?.details,
              field: 'password',
              service: 'auth-service',
              retryable: true
            }
          });
        }
        
        if (this.isMfaField(response)) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'MFA_INVALID',
              message: '多因素认证代码无效',
              details: response.error?.details,
              field: 'mfaCode',
              service: 'auth-service',
              retryable: true
            }
          });
        }
      }
      
      throw error;
    }
  }
  
  private isPasswordField(response: any): boolean {
    return response?.error?.details?.validationErrors?.password;
  }
  
  private isMfaField(response: any): boolean {
    return response?.error?.details?.validationErrors?.mfaCode;
  }
}
```

#### 主应用模块集成配置
```typescript
// apps/auth-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AuthResponseInterceptor } from './common/interceptors/auth-response.interceptor';
import { AuthHttpExceptionFilter } from './common/filters/auth-http-exception.filter';
import { AuthValidationPipe } from './common/pipes/auth-validation.pipe';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AuthHttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: AuthValidationPipe,
    },
  ],
})
export class AppModule {}
```

## 🛡️ 安全措施

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

### 认证响应安全特殊处理

#### 敏感信息保护
1. **Token掩码**: 长Token在日志和响应中自动掩码处理
2. **敏感字段隐藏**: MFA密钥等敏感信息不在响应中暴露
3. **错误信息过滤**: 不泄露系统内部信息，避免信息泄露攻击
4. **审计日志**: 安全相关错误自动记录，支持安全事件追踪

#### 安全日志策略
- **安全路径监控**: 自动识别 `/auth/login`, `/auth/mfa/`, `/auth/oauth/` 等敏感路径
- **状态码监控**: 特别关注 401, 403, 429 等安全相关状态码
- **IP地址记录**: 记录客户端IP和User-Agent用于安全分析
- **异步日志**: 安全日志异步记录，避免影响响应性能

#### 性能影响最小化
- **缓存优化**: 错误代码映射缓存，避免重复计算
- **异步处理**: 安全日志异步记录，不阻塞主要业务流程
- **轻量级验证**: 最小化验证开销，平衡安全性和性能

## ⚡ 性能优化

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

## 📅 项目规划

### 开发时间线
- **Week 1**: 认证授权服务（端口3001）
- **开发优先级**: 第2位（仅次于用户管理服务）
- **复杂度评级**: ⭐⭐ (中等复杂度)
- **预计开发时间**: 3-4天

### 开发里程碑

#### 第1天: 基础JWT认证
- [ ] JWT Token生成和验证
- [ ] 用户登录和登出API
- [ ] Redis会话存储
- [ ] 基础安全防护

#### 第2天: 高级认证功能
- [ ] 密码策略和加密
- [ ] 账户锁定和解锁
- [ ] 登录历史记录
- [ ] Token黑名单管理

#### 第3天: OAuth和MFA
- [ ] OAuth 2.0集成（GitHub/Google）
- [ ] 多因素认证（TOTP/SMS）
- [ ] 设备管理和信任
- [ ] 权限集成

#### 第4天: 企业级功能
- [ ] 会话管理和并发控制
- [ ] 安全审计日志
- [ ] 性能优化和缓存
- [ ] 监控集成

### 资源分配
- **内存配置**: 512MB (标准版本8GB总内存的6.25%)
- **CPU配置**: 1 core
- **数据库连接**: 30个连接
- **Redis连接**: 20个连接
- **并发支持**: 200个并发连接

### 风险评估

#### 技术风险
1. **JWT密钥管理风险** - 中等
   - 影响: 密钥泄露可能导致token伪造
   - 缓解: 使用非对称加密RS256，定期轮换密钥

2. **OAuth集成复杂性** - 中等
   - 影响: 第三方服务依赖，可能影响可用性
   - 缓解: 优雅降级，提供本地认证备选方案

3. **高并发认证压力** - 低
   - 影响: 认证服务性能瓶颈
   - 缓解: Redis缓存，数据库连接池优化

#### 依赖风险
1. **用户管理服务依赖** - 低
   - 必须在用户管理服务之后开发
   - 需要用户管理服务的内部API

2. **权限管理服务交互** - 中等
   - 需要权限验证API
   - 建议并行开发，通过mock进行解耦

### 服务间集成计划

#### Phase 1: 独立功能开发（Day 1-2）
- JWT认证核心功能
- 用户登录登出
- 密码管理
- 会话存储

#### Phase 2: 服务间集成（Day 3）
- 与用户管理服务集成
- 与权限管理服务集成
- 与审计服务集成

#### Phase 3: 高级功能集成（Day 4）
- OAuth第三方登录
- 多因素认证
- 企业级安全功能
- 监控和告警集成

## 🔄 服务间交互设计

### 内部API端点（微服务间通信）

#### 为其他服务提供的内部API

##### JWT Token验证 (内部API)
```typescript
// 请求
POST /internal/auth/verify-token
Headers: X-Service-Token: {内部服务令牌}
Body: { "token": "jwt_token_here" }

// 成功响应 (StandardApiResponse)
{
  "success": true,
  "data": {
    "valid": true,
    "payload": {
      "sub": "user-uuid",
      "email": "user@example.com",
      "tenantId": "tenant-uuid",
      "roles": ["member"],
      "permissions": ["user.read", "user.update"],
      "exp": 1704114000,
      "iat": 1704113100
    },
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "tenantId": "tenant-uuid"
    },
    "sessionId": "session_uuid",
    "expiresAt": "2024-01-01T10:15:00Z",
    "isActive": true
  },
  "metadata": {
    "requestId": "req_internal_001",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 3,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 错误响应 - Token无效
{
  "success": false,
  "data": null,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "令牌无效或已过期",
    "details": {
      "reason": "expired",
      "expiredAt": "2024-01-01T09:45:00Z"
    },
    "requestId": "req_internal_002",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "auth-service",
    "retryable": false
  },
  "metadata": {
    "requestId": "req_internal_002",
    "timestamp": "2024-01-01T10:00:00Z",
    "duration": 2,
    "version": "1.0",
    "service": "auth-service"
  }
}

// 会话信息查询 - 审计服务等调用
GET /internal/auth/sessions/{sessionId}
Headers: X-Service-Token: {内部服务令牌}
Response: {
  "sessionId": "session_uuid",
  "userId": "user_uuid", 
  "tenantId": "tenant_uuid",
  "createdAt": "2024-01-01T09:00:00Z",
  "expiresAt": "2024-01-01T10:00:00Z",
  "isActive": true
}

// 会话撤销 - 用户管理服务调用
POST /internal/auth/revoke-user-sessions
Headers: X-Service-Token: {内部服务令牌}
Body: { "userId": "uuid", "reason": "user_deleted" }
Response: { "revoked": 5, "sessions": ["session_ids"] }

// 批量Token验证 - API网关调用
POST /internal/auth/verify-tokens-batch
Headers: X-Service-Token: {内部服务令牌}
Body: { "tokens": ["token1", "token2"] }
Response: { "results": [{"token": "token1", "valid": true, "sessionId": "session_id"}] }
```

#### 调用其他服务的API
```typescript
// 调用用户管理服务 - 获取用户信息
GET http://user-management-service:3003/internal/users/{userId}
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}

// 调用用户管理服务 - 验证用户凭据
POST http://user-management-service:3003/internal/users/validate-credentials
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Body: { "email": "user@example.com", "password": "hashed_password", "tenantId": "tenant_id" }

// 调用审计服务 - 记录认证事件
POST http://audit-service:3008/internal/events
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Body: {
  "tenantId": "tenant_id",
  "userId": "user_id", 
  "serviceId": "auth-service",
  "eventType": "auth.login_success",
  "resource": "session",
  "action": "create",
  "outcome": "success",
  "timestamp": "2024-01-01T10:00:00Z",
  "sourceIp": "192.168.1.1",
  "metadata": { "loginMethod": "password" }
}

// 调用通知服务 - 发送安全通知
POST http://notification-service:3005/internal/notifications/send
Headers: X-Service-Token: {内部服务令牌}, X-Request-ID: {requestId}
Body: {
  "recipientId": "user_id",
  "recipientType": "user", 
  "channel": "email",
  "templateId": "security_alert",
  "variables": { "loginTime": "2024-01-01T10:00:00Z", "sourceIp": "192.168.1.1" }
}
```

### 服务发现和通信
```typescript
// Docker Compose网络配置
services:
  auth-service:
    networks:
      - platform-network
    environment:
      - USER_SERVICE_URL=http://user-management-service:3003
      - RBAC_SERVICE_URL=http://rbac-service:3002
      - AUDIT_SERVICE_URL=http://audit-service:3008
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
```

### 🎯 事件驱动架构集成

#### 认证服务事件发布能力
```typescript
// 认证服务事件发布器
@Injectable()
export class AuthEventPublisher {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly logger: Logger
  ) {}
  
  // 用户登录成功事件
  async publishUserLoginEvent(loginData: {
    userId: string;
    sessionId: string;
    sourceIp: string;
    userAgent: string;
    tenantId: string;
    loginMethod: string;
  }): Promise<void> {
    const event = new UserLoginEvent(
      loginData.userId,
      {
        sessionId: loginData.sessionId,
        sourceIp: loginData.sourceIp,
        userAgent: loginData.userAgent,
        loginMethod: loginData.loginMethod
      },
      loginData.tenantId
    );
    
    await this.eventBus.publishEvent(event);
    this.logger.log(`User login event published: ${loginData.userId}`);
  }
  
  // 用户登录失败事件
  async publishUserLoginFailedEvent(failureData: {
    email: string;
    sourceIp: string;
    userAgent: string;
    tenantId: string;
    failureReason: string;
  }): Promise<void> {
    const event = new UserLoginFailedEvent(
      'anonymous',
      {
        email: failureData.email,
        sourceIp: failureData.sourceIp,
        userAgent: failureData.userAgent,
        failureReason: failureData.failureReason,
        timestamp: new Date().toISOString()
      },
      failureData.tenantId
    );
    
    await this.eventBus.publishEvent(event);
  }
  
  // 会话撤销事件
  async publishSessionRevokedEvent(revokeData: {
    userId: string;
    sessionIds: string[];
    revokedBy: string;
    reason: string;
    tenantId: string;
  }): Promise<void> {
    const event = new SessionRevokedEvent(
      revokeData.sessionIds[0], // 主会话ID
      {
        userId: revokeData.userId,
        revokedBy: revokeData.revokedBy,
        reason: revokeData.reason,
        affectedSessions: revokeData.sessionIds
      },
      revokeData.tenantId
    );
    
    await this.eventBus.publishEvent(event);
  }
  
  // 密码重置事件
  async publishPasswordResetEvent(resetData: {
    userId: string;
    email: string;
    resetBy: string;
    tenantId: string;
  }): Promise<void> {
    const event = new PasswordResetEvent(
      resetData.userId,
      {
        email: resetData.email,
        resetBy: resetData.resetBy,
        resetTime: new Date().toISOString()
      },
      resetData.tenantId
    );
    
    await this.eventBus.publishEvent(event);
  }
}

// 认证相关事件定义
class UserLoginEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      sessionId: string;
      sourceIp: string;
      userAgent: string;
      loginMethod: string;
    },
    tenantId: string
  ) {
    super(userId, 'Session', eventData, {
      source: 'auth-service',
      causedBy: 'user_login_success'
    }, tenantId, userId);
  }
}

class UserLoginFailedEvent extends DomainEvent {
  constructor(
    attemptId: string,
    eventData: {
      email: string;
      sourceIp: string;
      userAgent: string;
      failureReason: string;
      timestamp: string;
    },
    tenantId: string
  ) {
    super(attemptId, 'LoginAttempt', eventData, {
      source: 'auth-service',
      causedBy: 'user_login_failed'
    }, tenantId);
  }
}

class SessionRevokedEvent extends DomainEvent {
  constructor(
    sessionId: string,
    eventData: {
      userId: string;
      revokedBy: string;
      reason: string;
      affectedSessions: string[];
    },
    tenantId: string
  ) {
    super(sessionId, 'Session', eventData, {
      source: 'auth-service',
      causedBy: 'session_revocation'
    }, tenantId, eventData.userId);
  }
}

class PasswordResetEvent extends DomainEvent {
  constructor(
    userId: string,
    eventData: {
      email: string;
      resetBy: string;
      resetTime: string;
    },
    tenantId: string
  ) {
    super(userId, 'User', eventData, {
      source: 'auth-service',
      causedBy: 'password_reset'
    }, tenantId, userId);
  }
}
```

#### 集成到认证服务
```typescript
// 认证服务主类集成
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly eventPublisher: AuthEventPublisher
  ) {}
  
  async login(loginDto: LoginDto, request: Request): Promise<LoginResponse> {
    try {
      // 1. 验证用户凭据
      const user = await this.validateUserCredentials(
        loginDto.email,
        loginDto.password,
        loginDto.tenantId
      );
      
      // 2. 创建会话
      const session = await this.sessionService.createSession({
        userId: user.id,
        tenantId: user.tenantId,
        sourceIp: request.ip,
        userAgent: request.headers['user-agent']
      });
      
      // 3. 发布登录成功事件
      await this.eventPublisher.publishUserLoginEvent({
        userId: user.id,
        sessionId: session.id,
        sourceIp: request.ip,
        userAgent: request.headers['user-agent'],
        tenantId: user.tenantId,
        loginMethod: 'password'
      });
      
      return {
        token: session.token,
        user: user,
        sessionId: session.id
      };
      
    } catch (error) {
      // 发布登录失败事件
      await this.eventPublisher.publishUserLoginFailedEvent({
        email: loginDto.email,
        sourceIp: request.ip,
        userAgent: request.headers['user-agent'],
        tenantId: loginDto.tenantId,
        failureReason: error.message
      });
      
      throw error;
    }
  }
  
  async revokeUserSessions(revokeDto: RevokeSessionsDto): Promise<RevokeSessionsResponse> {
    // 1. 撤销会话
    const revokedSessions = await this.sessionService.revokeUserSessions(
      revokeDto.userId,
      revokeDto.reason
    );
    
    // 2. 发布会话撤销事件
    await this.eventPublisher.publishSessionRevokedEvent({
      userId: revokeDto.userId,
      sessionIds: revokedSessions.map(s => s.id),
      revokedBy: revokeDto.revokedBy || 'system',
      reason: revokeDto.reason,
      tenantId: revokedSessions[0]?.tenantId
    });
    
    return {
      revoked: revokedSessions.length,
      sessions: revokedSessions
    };
  }
}
```

#### 事件订阅处理
```typescript
// 认证服务事件处理器
@Injectable()
export class AuthEventHandler implements EventHandler {
  constructor(
    private readonly sessionService: SessionService,
    private readonly logger: Logger
  ) {}
  
  async handle(event: BaseEvent): Promise<void> {
    switch (event.eventType) {
      case 'user.status_changed':
        await this.handleUserStatusChanged(event as UserStatusChangedEvent);
        break;
        
      case 'user.deleted':
        await this.handleUserDeleted(event as UserDeletedEvent);
        break;
        
      default:
        this.logger.warn(`Unhandled event type: ${event.eventType}`);
    }
  }
  
  private async handleUserStatusChanged(event: UserStatusChangedEvent): Promise<void> {
    const { aggregateId: userId, eventData } = event;
    
    // 如果用户被禁用，撤销所有会话
    if (eventData.newStatus === 'suspended' || eventData.newStatus === 'inactive') {
      await this.sessionService.revokeUserSessions(userId, 'user_status_changed');
      this.logger.log(`Revoked sessions for user ${userId} due to status change`);
    }
  }
  
  private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    const { aggregateId: userId } = event;
    
    // 用户删除时撤销所有会话
    await this.sessionService.revokeUserSessions(userId, 'user_deleted');
    this.logger.log(`Revoked sessions for deleted user ${userId}`);
  }
}

// 在应用启动时注册事件订阅
@Injectable()
export class AuthServiceBootstrap {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly eventHandler: AuthEventHandler
  ) {}
  
  async onApplicationBootstrap(): Promise<void> {
    // 订阅用户相关事件
    await this.eventBus.subscribeToEvents(
      ['user.status_changed', 'user.deleted'],
      'auth-service-consumer-group',
      'auth-service-instance-1',
      this.eventHandler
    );
    
    console.log('Auth service event subscriptions registered');
  }
}
```

#### 事件发布性能优化
```typescript
// 批量事件发布
@Injectable()
export class BatchAuthEventPublisher {
  private eventQueue: BaseEvent[] = [];
  private batchSize = 10;
  private flushInterval = 1000; // 1秒
  
  constructor(
    private readonly eventBus: EventBusService
  ) {
    // 定期刷新事件队列
    setInterval(() => this.flushEvents(), this.flushInterval);
  }
  
  async queueEvent(event: BaseEvent): Promise<void> {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }
  }
  
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    await this.eventBus.publishEvents(events);
  }
}
```

### 统一错误处理
```typescript
// 服务间通信错误格式
interface ServiceError {
  code: string;           // ERROR_CODE_CONSTANT
  message: string;        // 错误描述
  service: string;        // 来源服务
  timestamp: string;      // 时间戳
  traceId?: string;      // 追踪ID
  details?: any;         // 详细信息
}

// 重试机制配置
const retryConfig = {
  retries: 3,
  retryDelay: 1000,     // 1秒
  timeout: 5000,        // 5秒超时
  circuitBreaker: true   // 启用熔断器
};
```

## 🐳 部署配置

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

### Docker Compose配置（标准版本优化）
```yaml
auth-service:
  build: ./apps/auth-service
  ports:
    - "3001:3001"
  environment:
    # 数据库配置 (共享PostgreSQL实例)
    DATABASE_URL: postgresql://platform_user:platform_pass@postgres:5432/platform
    REDIS_URL: redis://redis:6379/1
    NODE_ENV: production
    SERVICE_NAME: auth-service
    SERVICE_PORT: 3001
    INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
    
    # JWT配置 (RS256非对称加密)
    JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
    JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
    JWT_ISSUER: platform-auth
    JWT_AUDIENCE: platform-services
    JWT_ACCESS_TOKEN_TTL: 900      # 15分钟
    JWT_REFRESH_TOKEN_TTL: 604800  # 7天
    
    # 内部服务通信
    INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
    USER_SERVICE_URL: http://user-management-service:3003
    RBAC_SERVICE_URL: http://rbac-service:3002
    AUDIT_SERVICE_URL: http://audit-service:3008
    NOTIFICATION_SERVICE_URL: http://notification-service:3005
    
    # OAuth配置 (标准版本支持)
    OAUTH_GITHUB_CLIENT_ID: ${OAUTH_GITHUB_CLIENT_ID}
    OAUTH_GITHUB_CLIENT_SECRET: ${OAUTH_GITHUB_CLIENT_SECRET}
    OAUTH_GOOGLE_CLIENT_ID: ${OAUTH_GOOGLE_CLIENT_ID}
    OAUTH_GOOGLE_CLIENT_SECRET: ${OAUTH_GOOGLE_CLIENT_SECRET}
    
    # 安全配置
    PASSWORD_SALT_ROUNDS: 12
    MFA_ISSUER: Platform
    RATE_LIMIT_TTL: 60
    RATE_LIMIT_LIMIT: 100
    
    # 标准版本配置
    MAX_CONCURRENT_SESSIONS: 5
    SESSION_TIMEOUT: 7200          # 2小时
    FAILED_LOGIN_THRESHOLD: 5      # 5次失败锁定
    LOCKOUT_DURATION: 1800         # 30分钟锁定
    
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
      reservations:
        memory: 256M
        cpus: '0.25'
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
    
  deploy:
    resources:
      limits:
        memory: 512MB              # 标准版本内存分配
        cpus: '1.0'
      reservations:
        memory: 256MB
        cpus: '0.5'
        
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
    
  restart: unless-stopped
  
  # 标准版本日志配置
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### 网络配置
```yaml
networks:
  platform-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
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

## 📈 监控和告警

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

## 🧪 测试策略

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

### 部署清单

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

## ✅ 开发完成情况总结

### 三个开发阶段完成情况

#### ✅ 需求分析阶段 (100%完成)
- ✅ 业务需求收集：12个功能模块明确定义
- ✅ 技术需求分析：100租户+10万用户性能指标
- ✅ 用户故事编写：通过60个API端点体现
- ✅ 验收标准定义：P95<100ms，99.9%可用性
- ✅ 架构设计文档：完整的安全架构设计

#### ✅ 项目规划阶段 (100%完成)
- ✅ 项目计划制定：4天开发计划，明确里程碑
- ✅ 里程碑设置：Day1-4阶段性目标清晰
- ✅ 资源分配：512MB内存，1CPU，30DB连接
- ✅ 风险评估：技术和依赖风险分析完成
- ✅ 技术栈选择：符合标准版本PostgreSQL+Redis

#### ✅ 架构设计阶段 (100%完成)
- ✅ 系统架构设计：完整的微服务架构和交互设计
- ✅ 数据库设计：6个核心表结构设计
- ✅ API设计：60个外部+4个内部API端点
- ✅ 安全架构设计：企业级安全策略和防护
- ✅ 性能规划：针对10万用户的性能优化

### 主要改进点

#### 1. 新增项目规划部分
- 📈 **开发时间线**: 4天开发计划，Week 1优先级
- 🎯 **里程碑管理**: Day1-4具体开发目标
- 💾 **资源配置**: 512MB内存，标准版本优化
- ⚠️ **风险评估**: JWT密钥、OAuth集成、高并发风险

#### 2. 强化服务间交互
- 🔗 **内部API**: 4个关键内部端点定义
- 📞 **服务调用**: 与4个核心服务的交互设计
- 🌐 **网络配置**: Docker Compose网络和服务发现
- 🛡️ **错误处理**: 统一错误格式和重试机制

#### 3. 优化标准版本配置
- 🐳 **Docker优化**: 内存限制、健康检查、日志配置
- 🔧 **环境变量**: 完整的生产环境配置
- 📊 **性能调优**: 连接池、会话管理、安全参数
- 🚀 **部署优化**: 网络配置、依赖管理、重启策略
