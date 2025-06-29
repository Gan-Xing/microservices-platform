# API参数命名标准化技术方案

## 📊 当前状况分析

### 参数使用统计
- **{id}**: 367个端点 (占主导地位)
- **{userId}**: 7个端点
- **{roleId}**: 3个端点  
- **{permissionId}**: 2个端点
- **{domainId}**: 3个端点
- **{subscriptionId}**: 2个端点
- **{policyId}**: 2个端点
- **{methodId}**: 2个端点
- **{keyId}**: 2个端点
- **{jobId}**: 2个端点
- **{groupId}**: 1个端点
- **{resourceId}**: 1个端点
- **{paymentId}**: 1个端点
- **{integrationId}**: 1个端点

## 🚨 当前问题识别

### 1. 命名规范不统一
- **混合使用camelCase和简单形式**: {userId} vs {id}
- **语义不清晰**: 同样的资源在不同上下文中使用不同的参数名
- **可读性差**: 多层嵌套路径中参数含义模糊

### 2. 典型问题示例

```http
# 不一致的问题
DELETE /api/v1/rbac/users/{id}/roles/{roleId}        # 混合命名
DELETE /api/v1/tenants/{id}/users/{userId}           # 混合命名
DELETE /api/v1/users/{id}/groups/{groupId}           # 混合命名

# 语义不清晰
GET /api/v1/rbac/check/{userId}/{resource}           # userId vs id
GET /api/v1/tenants/{id}/users/{userId}/roles        # 双重id混乱
```

## 🎯 标准化目标

### 核心原则
1. **语义明确**: 参数名应明确表示所操作的资源类型
2. **一致性**: 相同资源在所有端点中使用相同的参数命名
3. **可读性**: 路径参数应具有自解释性
4. **向后兼容**: 提供平滑的迁移策略

## 📋 统一命名标准

### 1. 基础资源ID命名规范

```http
# 标准格式: {resource-name-id}
{user-id}        # 用户ID
{role-id}        # 角色ID  
{permission-id}  # 权限ID
{tenant-id}      # 租户ID
{group-id}       # 组ID
{job-id}         # 任务ID
{key-id}         # 密钥ID
{domain-id}      # 域名ID
{payment-id}     # 支付ID
{policy-id}      # 策略ID
{subscription-id} # 订阅ID
{integration-id} # 集成ID
{resource-id}    # 资源ID
{method-id}      # 方法ID
```

### 2. 特殊情况处理

```http
# 主资源在其自己的端点中可以使用 {id}
GET /api/v1/users/{id}                    # ✅ 清晰的上下文
PUT /api/v1/users/{id}                    # ✅ 清晰的上下文

# 关联资源必须使用完整命名
DELETE /api/v1/users/{user-id}/roles/{role-id}        # ✅ 明确语义
GET /api/v1/tenants/{tenant-id}/users/{user-id}       # ✅ 明确语义
```

## 🔧 修正方案

### Phase 1: 关键端点修正 (高优先级)

#### 1.1 RBAC服务修正
```http
# 修正前 → 修正后
DELETE /api/v1/rbac/users/{id}/roles/{roleId}
→ DELETE /api/v1/rbac/users/{user-id}/roles/{role-id}

DELETE /api/v1/rbac/roles/{id}/permissions/{permissionId}  
→ DELETE /api/v1/rbac/roles/{role-id}/permissions/{permission-id}

GET /api/v1/rbac/check/{userId}/{resource}
→ GET /api/v1/rbac/check/{user-id}/{resource}

GET /api/v1/rbac/temporal/permissions/{userId}
→ GET /api/v1/rbac/temporal/permissions/{user-id}

GET /api/v1/rbac/inheritance/effective/{userId}
→ GET /api/v1/rbac/inheritance/effective/{user-id}
```

#### 1.2 用户管理服务修正
```http
# 修正前 → 修正后
DELETE /api/v1/users/{id}/groups/{groupId}
→ DELETE /api/v1/users/{user-id}/groups/{group-id}

DELETE /api/v1/users/{id}/roles/{roleId}
→ DELETE /api/v1/users/{user-id}/roles/{role-id}

DELETE /api/v1/users/{id}/permissions/{permissionId}
→ DELETE /api/v1/users/{user-id}/permissions/{permission-id}

GET /api/v1/users/batch/jobs/{jobId}
→ GET /api/v1/users/batch/jobs/{job-id}
```

#### 1.3 多租户管理服务修正
```http
# 修正前 → 修正后
DELETE /api/v1/tenants/{id}/users/{userId}
→ DELETE /api/v1/tenants/{tenant-id}/users/{user-id}

GET /api/v1/tenants/{id}/users/{userId}/roles
→ GET /api/v1/tenants/{tenant-id}/users/{user-id}/roles

POST /api/v1/tenants/{id}/users/{userId}/roles
→ POST /api/v1/tenants/{tenant-id}/users/{user-id}/roles

DELETE /api/v1/tenants/{id}/users/{userId}/roles/{roleId}
→ DELETE /api/v1/tenants/{tenant-id}/users/{user-id}/roles/{role-id}

DELETE /api/v1/tenants/{id}/domains/{domainId}
→ DELETE /api/v1/tenants/{tenant-id}/domains/{domain-id}

DELETE /api/v1/tenants/{id}/api-keys/{keyId}
→ DELETE /api/v1/tenants/{tenant-id}/api-keys/{key-id}

POST /api/v1/tenants/{id}/domains/{domainId}/verify
→ POST /api/v1/tenants/{tenant-id}/domains/{domain-id}/verify

GET /api/v1/tenants/{id}/domains/{domainId}/ssl
→ GET /api/v1/tenants/{tenant-id}/domains/{domain-id}/ssl

POST /api/v1/tenants/{id}/api-keys/{keyId}/rotate
→ POST /api/v1/tenants/{tenant-id}/api-keys/{key-id}/rotate

GET /api/v1/tenants/{id}/payments/{paymentId}
→ GET /api/v1/tenants/{tenant-id}/payments/{payment-id}

PUT /api/v1/tenants/{id}/payment-methods/{methodId}
→ PUT /api/v1/tenants/{tenant-id}/payment-methods/{method-id}

DELETE /api/v1/tenants/{id}/payment-methods/{methodId}
→ DELETE /api/v1/tenants/{tenant-id}/payment-methods/{method-id}

DELETE /api/v1/tenants/{id}/subscriptions/{subscriptionId}
→ DELETE /api/v1/tenants/{tenant-id}/subscriptions/{subscription-id}

PATCH /api/v1/tenants/{id}/subscriptions/{subscriptionId}/status
→ PATCH /api/v1/tenants/{tenant-id}/subscriptions/{subscription-id}/status

DELETE /api/v1/tenants/{id}/resources/{resourceId}
→ DELETE /api/v1/tenants/{tenant-id}/resources/{resource-id}

PUT /api/v1/tenants/{id}/rls/policies/{policyId}
→ PUT /api/v1/tenants/{tenant-id}/rls/policies/{policy-id}

DELETE /api/v1/tenants/{id}/rls/policies/{policyId}
→ DELETE /api/v1/tenants/{tenant-id}/rls/policies/{policy-id}

DELETE /api/v1/tenants/{id}/integrations/{integrationId}
→ DELETE /api/v1/tenants/{tenant-id}/integrations/{integration-id}
```

#### 1.4 任务调度服务修正
```http
# 修正前 → 修正后
GET /api/v1/scheduler/jobs/{jobId}/executions
→ GET /api/v1/scheduler/jobs/{job-id}/executions
```

### Phase 2: 保持现状的端点 (低优先级)

对于主资源的基本CRUD操作，保持使用 `{id}` 的简洁形式：

```http
# 保持不变 - 上下文清晰
GET /api/v1/users/{id}
PUT /api/v1/users/{id}  
DELETE /api/v1/users/{id}
GET /api/v1/roles/{id}
PUT /api/v1/roles/{id}
DELETE /api/v1/roles/{id}
GET /api/v1/tenants/{id}
PUT /api/v1/tenants/{id}
DELETE /api/v1/tenants/{id}
```

## 🔄 向后兼容策略

### 1. API版本管理
```http
# 新版本 (v2) 使用标准化命名
POST /api/v2/rbac/users/{user-id}/roles/{role-id}

# 旧版本 (v1) 保持兼容，但标记为 deprecated
POST /api/v1/rbac/users/{id}/roles/{roleId}  # @deprecated
```

### 2. 双参数支持策略
在过渡期，同时支持新旧两种参数格式：

```typescript
// Controller层实现示例
@Delete('users/:userId/roles/:roleId')
@Delete('users/:user-id/roles/:role-id')  // 新标准
async removeUserRole(
  @Param('userId') userId?: string,
  @Param('user-id') newUserId?: string,
  @Param('roleId') roleId?: string, 
  @Param('role-id') newRoleId?: string
) {
  const finalUserId = newUserId || userId;
  const finalRoleId = newRoleId || roleId;
  // 业务逻辑...
}
```

### 3. 客户端迁移指导
```typescript
// 提供迁移助手
class ApiMigrationHelper {
  static convertLegacyParams(legacyPath: string): string {
    return legacyPath
      .replace(/{roleId}/g, '{role-id}')
      .replace(/{userId}/g, '{user-id}')
      .replace(/{permissionId}/g, '{permission-id}')
      // ... 更多替换规则
  }
}
```

## 📈 实施计划

### 时间线 (2周)
- **Week 1**: Phase 1 关键端点修正 (37个端点)
- **Week 2**: 测试、文档更新、向后兼容性验证

### 风险评估
- **破坏性变更风险**: 🔴 高 (影响现有客户端)
- **实施复杂度**: 🟡 中等 (需要同时维护新旧格式)
- **测试覆盖度**: 🟢 低风险 (参数级别改动)

### 成功指标
- ✅ 所有API参数命名符合统一标准
- ✅ 向后兼容性得到保证
- ✅ API文档完全更新
- ✅ 客户端SDK更新完成

## 🛠️ 技术实施细节

### 1. OpenAPI规范更新
```yaml
# 新的参数定义标准
parameters:
  user-id:
    name: user-id
    in: path
    required: true
    schema:
      type: string
      format: uuid
    description: 用户唯一标识符
  role-id:
    name: role-id  
    in: path
    required: true
    schema:
      type: string
      format: uuid
    description: 角色唯一标识符
```

### 2. 验证规则
```typescript
// 参数验证装饰器
@IsValidResourceId('user-id', 'role-id', 'permission-id')
class RoleAssignmentDto {
  @IsUUID()
  'user-id': string;
  
  @IsUUID() 
  'role-id': string;
}
```

### 3. 自动化测试
```typescript
describe('API Parameter Naming Standards', () => {
  it('should use kebab-case for multi-word resource IDs', () => {
    const routes = extractRoutes();
    routes.forEach(route => {
      const params = extractParams(route.path);
      params.forEach(param => {
        if (param.includes('Id')) {
          expect(param).toMatch(/^[a-z]+-[a-z]+$/);
        }
      });
    });
  });
});
```

## 💡 最佳实践建议

### 1. 新端点开发规范
- 总是使用 kebab-case 格式: `{resource-name-id}`
- 避免简写: `{user-id}` 优于 `{uid}`
- 保持语义明确: `{tenant-id}` 优于 `{id}`

### 2. 文档规范
- API文档中必须明确参数含义
- 提供参数格式示例
- 标注deprecated参数的替代方案

### 3. 代码审查检查点
- [ ] 新API端点是否遵循命名标准？
- [ ] 是否提供了向后兼容支持？
- [ ] 相关文档是否已更新？
- [ ] 测试用例是否覆盖新旧参数格式？

---

## 📞 联系与支持

如需进一步讨论或实施支持，请联系架构团队。

**预估工作量**: 12-16工时  
**影响范围**: 37个API端点  
**建议优先级**: 🔴 高 (影响API一致性和可维护性)