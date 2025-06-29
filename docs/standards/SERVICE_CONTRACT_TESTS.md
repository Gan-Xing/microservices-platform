# 🧪 服务间接口契约测试套件

## 📋 测试目标

验证所有已修复的服务间接口调用的正确性，确保：
1. 调用方期望与提供方实际完全匹配
2. 完整的业务流程端到端正常运行
3. 错误处理机制统一有效
4. 性能要求达到预期标准

## 🔧 测试环境设置

### Docker Compose 测试环境
```yaml
# test-environment.yml
version: '3.8'
services:
  # 基础设施
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: platform_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"
      
  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
      
  # 核心服务
  auth-service:
    build: ./auth-service
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://test_user:test_pass@postgres:5432/platform_test
      REDIS_URL: redis://redis:6379
      INTERNAL_SERVICE_TOKEN: test-service-token
    depends_on:
      - postgres
      - redis
      
  user-management-service:
    build: ./user-management-service  
    ports:
      - "3003:3000"
    environment:
      DATABASE_URL: postgresql://test_user:test_pass@postgres:5432/platform_test
      INTERNAL_SERVICE_TOKEN: test-service-token
    depends_on:
      - postgres
      
  rbac-service:
    build: ./rbac-service
    ports:
      - "3002:3000"
    environment:
      DATABASE_URL: postgresql://test_user:test_pass@postgres:5432/platform_test
      REDIS_URL: redis://redis:6379/2
      INTERNAL_SERVICE_TOKEN: test-service-token
    depends_on:
      - postgres
      - redis
      
  audit-service:
    build: ./audit-service
    ports:
      - "3008:3000"
    environment:
      DATABASE_URL: postgresql://test_user:test_pass@postgres:5432/platform_test
      INTERNAL_SERVICE_TOKEN: test-service-token
      AUTH_SERVICE_URL: http://auth-service:3000
      USER_SERVICE_URL: http://user-management-service:3000
    depends_on:
      - postgres
      - auth-service
      - user-management-service
```

### 测试数据初始化
```sql
-- 测试租户
INSERT INTO tenants (id, name, slug, status) VALUES 
('test-tenant-1', 'Test Tenant 1', 'test-tenant-1', 'active');

-- 测试角色
INSERT INTO roles (id, tenant_id, name, display_name, type) VALUES 
('role-member', 'test-tenant-1', 'member', '普通成员', 'tenant'),
('role-admin', 'test-tenant-1', 'admin', '管理员', 'tenant');

-- 测试权限
INSERT INTO permissions (id, tenant_id, name, resource, action) VALUES 
('perm-user-read', 'test-tenant-1', 'user:read', 'user', 'read'),
('perm-user-write', 'test-tenant-1', 'user:write', 'user', 'write');

-- 角色权限关联
INSERT INTO role_permissions (role_id, permission_id, tenant_id, granted_by) VALUES 
('role-member', 'perm-user-read', 'test-tenant-1', 'system'),
('role-admin', 'perm-user-read', 'test-tenant-1', 'system'),
('role-admin', 'perm-user-write', 'test-tenant-1', 'system');
```

## 🧪 核心接口契约测试

### 测试套件 1: 认证服务接口契约
```typescript
describe('认证服务接口契约测试', () => {
  
  test('Token验证接口 - 应与调用方期望匹配', async () => {
    // 模拟审计服务调用认证服务验证Token
    const response = await request
      .post('http://localhost:3001/internal/auth/verify-token')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'audit-service')
      .set('X-Request-ID', 'test-request-123')
      .send({ token: 'valid-jwt-token' })
      .expect(200)
      
    // 验证响应格式与期望匹配
    expect(response.body).toHaveProperty('valid', true)
    expect(response.body).toHaveProperty('payload')
    expect(response.body).toHaveProperty('user')
    expect(response.body).toHaveProperty('sessionId')
    expect(response.body).toHaveProperty('expiresAt')
  })
  
  test('会话查询接口 - 应与调用方期望匹配', async () => {
    // 先创建一个会话
    const loginResponse = await request
      .post('http://localhost:3001/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'test-tenant-1'
      })
      
    const sessionId = loginResponse.body.sessionId
    
    // 模拟审计服务查询会话信息
    const response = await request
      .get(`http://localhost:3001/internal/auth/sessions/${sessionId}`)
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'audit-service')
      .set('X-Request-ID', 'test-request-124')
      .expect(200)
      
    // 验证响应格式
    expect(response.body).toHaveProperty('sessionId', sessionId)
    expect(response.body).toHaveProperty('userId')
    expect(response.body).toHaveProperty('tenantId')
    expect(response.body).toHaveProperty('isActive', true)
  })
  
  test('会话撤销接口 - 应与用户服务调用匹配', async () => {
    // 模拟用户服务调用认证服务撤销会话
    const response = await request
      .post('http://localhost:3001/internal/auth/revoke-user-sessions')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'user-management-service')
      .set('X-Request-ID', 'test-request-125')
      .send({
        userId: 'test-user-1',
        reason: 'user_deleted'
      })
      .expect(200)
      
    // 验证响应格式
    expect(response.body).toHaveProperty('revoked')
    expect(response.body).toHaveProperty('sessions')
    expect(Array.isArray(response.body.sessions)).toBe(true)
  })
})
```

### 测试套件 2: RBAC服务接口契约
```typescript
describe('RBAC服务接口契约测试', () => {
  
  test('权限检查接口 - 应与所有调用方期望匹配', async () => {
    // 模拟任意服务调用RBAC服务检查权限
    const response = await request
      .post('http://localhost:3002/internal/permissions/check')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'api-gateway-service')
      .set('X-Request-ID', 'test-request-126')
      .send({
        userId: 'test-user-1',
        tenantId: 'test-tenant-1',
        resource: 'user',
        action: 'read',
        context: {
          resourceId: 'target-user-id',
          sourceIp: '192.168.1.1'
        }
      })
      .expect(200)
      
    // 验证响应格式
    expect(response.body).toHaveProperty('allowed')
    expect(response.body).toHaveProperty('reason')
    expect(response.body).toHaveProperty('appliedRoles')
    expect(response.body).toHaveProperty('appliedPermissions')
  })
  
  test('用户角色分配接口 - 路径应正确', async () => {
    // 模拟用户服务调用RBAC服务分配默认角色
    const response = await request
      .post('http://localhost:3002/internal/users/test-user-1/assign-default-role')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'user-management-service')
      .set('X-Request-ID', 'test-request-127')
      .send({
        tenantId: 'test-tenant-1',
        userType: 'member'
      })
      .expect(200)
      
    // 验证角色分配成功
    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('assignedRoles')
  })
  
  test('用户角色撤销接口 - 新增接口应可用', async () => {
    // 测试新增的角色撤销接口
    const response = await request
      .delete('http://localhost:3002/internal/users/test-user-1/roles/role-member')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'admin-service')
      .set('X-Request-ID', 'test-request-128')
      .send({
        tenantId: 'test-tenant-1',
        revokedBy: 'admin-user-1'
      })
      .expect(200)
      
    // 验证角色撤销成功
    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('revokedRole')
  })
})
```

### 测试套件 3: 用户服务接口契约
```typescript
describe('用户服务接口契约测试', () => {
  
  test('用户创建接口 - 新增接口应可用', async () => {
    // 模拟认证服务调用用户服务创建用户
    const response = await request
      .post('http://localhost:3003/internal/users')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'auth-service')
      .set('X-Request-ID', 'test-request-129')
      .send({
        email: 'newuser@example.com',
        password: 'hashed-password',
        tenantId: 'test-tenant-1',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser'
      })
      .expect(201)
      
    // 验证用户创建成功
    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('tenantId', 'test-tenant-1')
    expect(response.body).toHaveProperty('email', 'newuser@example.com')
    expect(response.body).toHaveProperty('status', 'active')
  })
  
  test('批量用户查询接口 - 应与调用方期望匹配', async () => {
    // 模拟审计服务调用用户服务批量查询用户
    const response = await request
      .post('http://localhost:3003/internal/users/batch-query')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'audit-service')
      .set('X-Request-ID', 'test-request-130')
      .send({
        userIds: ['test-user-1', 'test-user-2', 'non-existent-user'],
        tenantId: 'test-tenant-1'
      })
      .expect(200)
      
    // 验证响应格式
    expect(response.body).toHaveProperty('users')
    expect(response.body).toHaveProperty('notFound')
    expect(Array.isArray(response.body.users)).toBe(true)
    expect(Array.isArray(response.body.notFound)).toBe(true)
    expect(response.body.notFound).toContain('non-existent-user')
  })
  
  test('用户凭据验证接口 - 应与认证服务调用匹配', async () => {
    // 模拟认证服务调用用户服务验证凭据
    const response = await request
      .post('http://localhost:3003/internal/users/validate-credentials')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'auth-service')
      .set('X-Request-ID', 'test-request-131')
      .send({
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'test-tenant-1'
      })
      .expect(200)
      
    // 验证响应格式
    expect(response.body).toHaveProperty('valid')
    expect(response.body).toHaveProperty('user')
    if (response.body.valid) {
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user).toHaveProperty('email')
      expect(response.body.user).toHaveProperty('status')
    }
  })
})
```

## 🔄 端到端业务流程测试

### 完整用户注册流程测试
```typescript
describe('端到端用户注册流程测试', () => {
  
  test('完整的用户注册和权限分配流程', async () => {
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'Password123!'
    
    // Step 1: 用户注册
    const registerResponse = await request
      .post('http://localhost:3001/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        tenantId: 'test-tenant-1',
        firstName: 'Test',
        lastName: 'User'
      })
      .expect(201)
      
    expect(registerResponse.body).toHaveProperty('user')
    expect(registerResponse.body).toHaveProperty('token')
    
    const userId = registerResponse.body.user.id
    const token = registerResponse.body.token
    
    // Step 2: 验证用户在用户服务中创建成功
    const userResponse = await request
      .get(`http://localhost:3003/internal/users/${userId}`)
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'test-request-132')
      .expect(200)
      
    expect(userResponse.body).toHaveProperty('email', testEmail)
    expect(userResponse.body).toHaveProperty('status', 'active')
    
    // Step 3: 验证默认角色已分配
    const rolesResponse = await request
      .get(`http://localhost:3002/internal/users/${userId}/roles`)
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'test-request-133')
      .query({ tenantId: 'test-tenant-1' })
      .expect(200)
      
    expect(rolesResponse.body).toHaveProperty('roles')
    expect(rolesResponse.body.roles.length).toBeGreaterThan(0)
    expect(rolesResponse.body.roles.some(role => role.name === 'member')).toBe(true)
    
    // Step 4: 验证权限检查正常工作
    const permissionResponse = await request
      .post('http://localhost:3002/internal/permissions/check')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'test-request-134')
      .send({
        userId: userId,
        tenantId: 'test-tenant-1',
        resource: 'user',
        action: 'read'
      })
      .expect(200)
      
    expect(permissionResponse.body).toHaveProperty('allowed', true)
    expect(permissionResponse.body.appliedRoles).toContain('member')
    
    // Step 5: 验证Token验证正常工作
    const tokenResponse = await request
      .post('http://localhost:3001/internal/auth/verify-token')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'test-request-135')
      .send({ token: token })
      .expect(200)
      
    expect(tokenResponse.body).toHaveProperty('valid', true)
    expect(tokenResponse.body.user).toHaveProperty('id', userId)
  })
})
```

### 完整用户登录流程测试
```typescript
describe('端到端用户登录流程测试', () => {
  
  test('完整的用户登录和权限验证流程', async () => {
    // Step 1: 用户登录
    const loginResponse = await request
      .post('http://localhost:3001/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'test-tenant-1'
      })
      .expect(200)
      
    expect(loginResponse.body).toHaveProperty('token')
    expect(loginResponse.body).toHaveProperty('user')
    
    const token = loginResponse.body.token
    const userId = loginResponse.body.user.id
    
    // Step 2: 模拟API网关验证Token
    const gatewayTokenCheck = await request
      .post('http://localhost:3001/internal/auth/verify-token')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'api-gateway-service')
      .set('X-Request-ID', 'test-request-136')
      .send({ token: token })
      .expect(200)
      
    expect(gatewayTokenCheck.body).toHaveProperty('valid', true)
    expect(gatewayTokenCheck.body).toHaveProperty('sessionId')
    
    // Step 3: 模拟业务服务检查用户权限
    const permissionCheck = await request
      .post('http://localhost:3002/internal/permissions/check')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'user-management-service')
      .set('X-Request-ID', 'test-request-137')
      .send({
        userId: userId,
        tenantId: 'test-tenant-1',
        resource: 'user',
        action: 'read',
        context: {
          sourceIp: '192.168.1.100',
          userAgent: 'Test Client'
        }
      })
      .expect(200)
      
    expect(permissionCheck.body).toHaveProperty('allowed', true)
    
    // Step 4: 验证审计日志记录
    // 这里需要等待一段时间让异步审计处理完成
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 查询审计日志验证登录事件被记录
    const auditResponse = await request
      .get('http://localhost:3008/api/v1/audit/events')
      .set('Authorization', `Bearer ${token}`)
      .query({
        userId: userId,
        eventType: 'auth.login_success',
        limit: 1
      })
      .expect(200)
      
    expect(auditResponse.body.events.length).toBeGreaterThan(0)
    expect(auditResponse.body.events[0]).toHaveProperty('eventType', 'auth.login_success')
  })
})
```

## 📊 性能基准测试

### 响应时间基准测试
```typescript
describe('服务响应时间基准测试', () => {
  
  test('认证服务Token验证 - 应 < 20ms', async () => {
    const startTime = Date.now()
    
    await request
      .post('http://localhost:3001/internal/auth/verify-token')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'perf-test-1')
      .send({ token: 'valid-jwt-token' })
      .expect(200)
      
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(20) // 认证服务核心层要求 < 20ms
  })
  
  test('RBAC服务权限检查 - 应 < 15ms', async () => {
    const startTime = Date.now()
    
    await request
      .post('http://localhost:3002/internal/permissions/check')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'perf-test-2')
      .send({
        userId: 'test-user-1',
        tenantId: 'test-tenant-1',
        resource: 'user',
        action: 'read'
      })
      .expect(200)
      
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(15) // RBAC服务核心层要求 < 15ms
  })
  
  test('用户服务查询 - 应 < 40ms', async () => {
    const startTime = Date.now()
    
    await request
      .get('http://localhost:3003/internal/users/test-user-1')
      .set('X-Service-Token', 'test-service-token')
      .set('X-Service-Name', 'test-client')
      .set('X-Request-ID', 'perf-test-3')
      .expect(200)
      
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(40) // 用户服务业务层要求 < 40ms
  })
})
```

### 并发负载测试
```typescript
describe('并发负载测试', () => {
  
  test('权限检查并发测试 - 100个并发请求', async () => {
    const promises = []
    
    for (let i = 0; i < 100; i++) {
      promises.push(
        request
          .post('http://localhost:3002/internal/permissions/check')
          .set('X-Service-Token', 'test-service-token')
          .set('X-Service-Name', 'load-test-client')
          .set('X-Request-ID', `load-test-${i}`)
          .send({
            userId: `test-user-${i % 10}`,
            tenantId: 'test-tenant-1',
            resource: 'user',
            action: 'read'
          })
      )
    }
    
    const startTime = Date.now()
    const results = await Promise.allSettled(promises)
    const duration = Date.now() - startTime
    
    // 验证成功率 > 99%
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const successRate = successCount / 100
    expect(successRate).toBeGreaterThan(0.99)
    
    // 验证总时间合理 (100个请求在合理时间内完成)
    expect(duration).toBeLessThan(5000) // 5秒内完成
  })
})
```

## 🎯 测试执行和报告

### 运行测试
```bash
# 启动测试环境
docker-compose -f test-environment.yml up -d

# 等待服务启动
sleep 30

# 运行接口契约测试
npm run test:contracts

# 运行端到端测试  
npm run test:e2e

# 运行性能测试
npm run test:performance

# 清理测试环境
docker-compose -f test-environment.yml down
```

### 测试报告格式
```typescript
interface TestReport {
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    successRate: number
    executionTime: number
  }
  contractTests: {
    authService: TestSuiteResult
    rbacService: TestSuiteResult
    userService: TestSuiteResult
  }
  e2eTests: {
    userRegistration: TestResult
    userLogin: TestResult
    permissionFlow: TestResult
  }
  performanceTests: {
    responseTime: PerformanceResult
    concurrency: PerformanceResult
    throughput: PerformanceResult
  }
  issues: TestIssue[]
}
```

## ✅ 验收标准

### 功能验收
- [ ] 所有接口契约测试通过率 100%
- [ ] 端到端业务流程测试通过
- [ ] 错误处理测试覆盖所有错误场景
- [ ] 服务间调用链路完整无断点

### 性能验收
- [ ] 认证服务响应时间 P95 < 20ms
- [ ] RBAC服务响应时间 P95 < 15ms
- [ ] 用户服务响应时间 P95 < 40ms
- [ ] 并发100请求成功率 > 99%

### 可靠性验收
- [ ] 服务间调用错误自动重试
- [ ] 链路追踪信息完整传递
- [ ] 审计日志正常记录所有关键操作
- [ ] 服务健康检查正常响应

---

**总结**: 这个全面的测试套件将验证所有已修复的接口契约的正确性，确保微服务间的调用关系完全匹配，为生产环境部署提供可靠的质量保证。