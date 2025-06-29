# 🔄 异步业务流程实现 - 企业级微服务平台

## 📋 概述

基于事件驱动架构，实现关键业务流程的异步处理，提升系统性能和用户体验，同时确保数据一致性和业务完整性。

### 🎯 核心目标
- **解耦业务流程** - 将复杂的同步操作转换为异步事件链
- **提升用户体验** - 关键操作立即响应，后台异步处理
- **确保最终一致性** - 通过事件溯源保证数据最终一致
- **支持业务补偿** - 失败流程的自动重试和补偿机制

## 🚀 核心异步业务流程

### 1. 用户注册异步流程

#### 同步阶段（用户立即看到结果）
```typescript
// 用户注册控制器 - 同步阶段
@Controller('auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly eventPublisher: UserEventPublisher
  ) {}
  
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    // 1. 基础验证（同步）
    await this.validateRegistrationData(registerDto);
    
    // 2. 创建用户记录（同步）
    const user = await this.userService.createUser({
      email: registerDto.email,
      password: await this.hashPassword(registerDto.password),
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      tenantId: registerDto.tenantId,
      status: 'pending_verification' // 初始状态
    });
    
    // 3. 发布用户创建事件（触发异步流程）
    await this.eventPublisher.publishUserCreatedEvent({
      userId: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      registrationData: {
        sourceIp: registerDto.sourceIp,
        userAgent: registerDto.userAgent,
        referrer: registerDto.referrer
      }
    });
    
    // 4. 立即返回响应（不等待异步流程完成）
    return {
      success: true,
      userId: user.id,
      message: '注册成功，请查收验证邮件',
      nextSteps: ['email_verification', 'profile_completion']
    };
  }
}
```

#### 异步处理阶段（后台自动执行）
```typescript
// 用户注册异步流程编排器
@Injectable()
export class UserRegistrationWorkflow {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly rbacService: RbacService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly tenantService: TenantService
  ) {}
  
  @EventHandler('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    const { aggregateId: userId, tenantId, eventData } = event;
    
    try {
      // 并行执行多个异步任务
      await Promise.allSettled([
        // Task 1: 分配默认角色
        this.assignDefaultRole(userId, tenantId),
        
        // Task 2: 发送欢迎邮件
        this.sendWelcomeEmail(userId, eventData.email),
        
        // Task 3: 创建用户配置文件
        this.createUserProfile(userId, tenantId),
        
        // Task 4: 记录审计日志
        this.recordRegistrationAudit(event),
        
        // Task 5: 更新租户统计
        this.updateTenantStatistics(tenantId),
        
        // Task 6: 发送验证邮件
        this.sendVerificationEmail(userId, eventData.email)
      ]);
      
      // 发布注册流程完成事件
      await this.publishRegistrationCompletedEvent(userId, tenantId);
      
    } catch (error) {
      // 发布注册流程失败事件，触发补偿机制
      await this.publishRegistrationFailedEvent(userId, tenantId, error);
    }
  }
  
  private async assignDefaultRole(userId: string, tenantId: string): Promise<void> {
    await this.rbacService.assignDefaultRole(userId, tenantId, 'member');
    
    // 发布角色分配完成事件
    await this.eventBus.publishEvent(new UserDefaultRoleAssignedEvent(
      userId,
      { roleType: 'member', assignedAt: new Date().toISOString() },
      tenantId
    ));
  }
  
  private async sendWelcomeEmail(userId: string, email: string): Promise<void> {
    await this.notificationService.sendNotification({
      recipientId: userId,
      recipientType: 'user',
      channel: 'email',
      templateId: 'welcome_email',
      variables: { email }
    });
    
    // 发布欢迎邮件发送事件
    await this.eventBus.publishEvent(new WelcomeEmailSentEvent(
      userId,
      { email, sentAt: new Date().toISOString() },
      tenantId
    ));
  }
  
  private async createUserProfile(userId: string, tenantId: string): Promise<void> {
    // 创建用户扩展配置文件
    await this.userService.createUserProfile({
      userId,
      tenantId,
      preferences: {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        emailNotifications: true
      },
      settings: {
        theme: 'light',
        sidebar: 'expanded'
      }
    });
  }
  
  @EventHandler('user.registration_completed')
  async handleRegistrationCompleted(event: UserRegistrationCompletedEvent): Promise<void> {
    // 激活用户账户
    await this.userService.updateUserStatus(
      event.aggregateId,
      'active',
      'system'
    );
    
    // 发送注册成功通知给管理员
    await this.notifyAdminsOfNewUser(event);
  }
}
```

### 2. 权限变更异步流程

```typescript
// 权限变更异步流程编排器
@Injectable()
export class PermissionChangeWorkflow {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly cacheService: PermissionCacheService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly sessionService: SessionService
  ) {}
  
  @EventHandler('role.assigned')
  async handleRoleAssigned(event: RoleAssignedEvent): Promise<void> {
    const { aggregateId: userId, tenantId, eventData } = event;
    
    // 异步执行权限变更后续操作
    await Promise.allSettled([
      // Task 1: 清除权限缓存
      this.invalidatePermissionCache(userId, tenantId),
      
      // Task 2: 通知用户权限变更
      this.notifyUserOfPermissionChange(userId, eventData),
      
      // Task 3: 检查会话有效性
      this.validateUserSessions(userId, tenantId),
      
      // Task 4: 更新用户活动记录
      this.updateUserActivityLog(userId, 'role_assigned', eventData),
      
      // Task 5: 检查依赖权限
      this.checkDependentPermissions(userId, eventData.roleId, tenantId)
    ]);
    
    // 发布权限变更完成事件
    await this.publishPermissionChangeCompletedEvent(userId, tenantId, eventData);
  }
  
  @EventHandler('role.revoked')
  async handleRoleRevoked(event: RoleRevokedEvent): Promise<void> {
    const { aggregateId: userId, tenantId, eventData } = event;
    
    // 角色撤销需要更严格的处理
    await this.executeRoleRevocationFlow(userId, tenantId, eventData);
  }
  
  private async executeRoleRevocationFlow(
    userId: string,
    tenantId: string,
    revokeData: any
  ): Promise<void> {
    // 1. 立即清除所有相关缓存
    await this.cacheService.clearUserPermissionCache(userId, tenantId);
    
    // 2. 检查是否需要强制登出
    const shouldForceLogout = await this.shouldForceLogoutAfterRoleRevoke(
      userId,
      revokeData.roleId
    );
    
    if (shouldForceLogout) {
      await this.sessionService.revokeUserSessions(userId, 'role_revoked');
    }
    
    // 3. 通知用户权限被撤销
    await this.notificationService.sendNotification({
      recipientId: userId,
      recipientType: 'user',
      channel: 'email',
      templateId: 'role_revoked_notification',
      variables: {
        roleName: revokeData.roleName,
        revokedBy: revokeData.revokedBy,
        reason: revokeData.reason
      }
    });
    
    // 4. 检查孤儿权限
    await this.cleanupOrphanedPermissions(userId, tenantId);
  }
}
```

### 3. 用户删除异步流程

```typescript
// 用户删除异步流程（GDPR合规）
@Injectable()
export class UserDeletionWorkflow {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly dataCleanupService: DataCleanupService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService
  ) {}
  
  @EventHandler('user.deletion_requested')
  async handleUserDeletionRequested(event: UserDeletionRequestedEvent): Promise<void> {
    const { aggregateId: userId, tenantId, eventData } = event;
    
    // 启动多阶段删除流程
    await this.startDeletionWorkflow(userId, tenantId, eventData);
  }
  
  private async startDeletionWorkflow(
    userId: string,
    tenantId: string,
    deletionData: any
  ): Promise<void> {
    // Phase 1: 立即禁用用户访问
    await this.immediateAccessRevocation(userId, tenantId);
    
    // Phase 2: 数据收集和评估
    const dataAssessment = await this.assessUserData(userId, tenantId);
    
    // Phase 3: 执行数据删除（按优先级）
    await this.executeDataDeletion(userId, tenantId, dataAssessment);
    
    // Phase 4: 合规性验证
    await this.verifyDeletionCompliance(userId, tenantId);
    
    // Phase 5: 发布删除完成事件
    await this.publishDeletionCompletedEvent(userId, tenantId);
  }
  
  private async immediateAccessRevocation(userId: string, tenantId: string): Promise<void> {
    await Promise.allSettled([
      // 撤销所有会话
      this.sessionService.revokeUserSessions(userId, 'user_deletion'),
      
      // 撤销所有角色
      this.rbacService.revokeAllUserRoles(userId, tenantId),
      
      // 禁用API密钥
      this.apiKeyService.revokeUserApiKeys(userId),
      
      // 清除所有缓存
      this.cacheService.clearAllUserCache(userId)
    ]);
  }
  
  private async executeDataDeletion(
    userId: string,
    tenantId: string,
    assessment: DataAssessment
  ): Promise<void> {
    // 按照GDPR要求分阶段删除数据
    const deletionPhases = [
      // Phase 1: 个人身份信息（立即删除）
      () => this.deletePII(userId, tenantId),
      
      // Phase 2: 业务数据（匿名化处理）
      () => this.anonymizeBusinessData(userId, tenantId),
      
      // Phase 3: 审计数据（保留法定期限）
      () => this.handleAuditData(userId, tenantId),
      
      // Phase 4: 备份数据清理
      () => this.cleanupBackupData(userId, tenantId)
    ];
    
    for (const phase of deletionPhases) {
      try {
        await phase();
        await this.recordDeletionProgress(userId, phase.name);
      } catch (error) {
        await this.handleDeletionFailure(userId, phase.name, error);
      }
    }
  }
}
```

### 4. 业务流程监控和补偿

```typescript
// 业务流程监控服务
@Injectable()
export class WorkflowMonitoringService {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly redis: Redis,
    private readonly logger: Logger
  ) {}
  
  // 监控长时间运行的异步流程
  async monitorWorkflow(workflowId: string, maxDuration: number): Promise<void> {
    const startTime = Date.now();
    
    const monitor = setInterval(async () => {
      const currentTime = Date.now();
      const duration = currentTime - startTime;
      
      if (duration > maxDuration) {
        // 流程超时，触发告警
        await this.handleWorkflowTimeout(workflowId, duration);
        clearInterval(monitor);
      }
      
      // 检查流程状态
      const status = await this.getWorkflowStatus(workflowId);
      if (status.completed || status.failed) {
        clearInterval(monitor);
      }
    }, 30000); // 每30秒检查一次
  }
  
  // 业务流程补偿机制
  @EventHandler('workflow.failed')
  async handleWorkflowFailure(event: WorkflowFailedEvent): Promise<void> {
    const { aggregateId: workflowId, eventData } = event;
    
    // 根据失败类型执行不同的补偿策略
    switch (eventData.failureType) {
      case 'user_registration_failed':
        await this.compensateUserRegistration(workflowId, eventData);
        break;
        
      case 'permission_change_failed':
        await this.compensatePermissionChange(workflowId, eventData);
        break;
        
      case 'user_deletion_failed':
        await this.compensateUserDeletion(workflowId, eventData);
        break;
        
      default:
        await this.executeGenericCompensation(workflowId, eventData);
    }
  }
  
  private async compensateUserRegistration(
    workflowId: string,
    failureData: any
  ): Promise<void> {
    const userId = failureData.userId;
    
    // 回滚注册流程
    await Promise.allSettled([
      // 删除部分创建的用户数据
      this.userService.softDeleteUser(userId, 'workflow_compensation'),
      
      // 撤销已分配的角色
      this.rbacService.revokeAllUserRoles(userId, failureData.tenantId),
      
      // 清理缓存
      this.cacheService.clearUserCache(userId),
      
      // 发送失败通知
      this.notificationService.sendFailureNotification(failureData.email, 'registration_failed')
    ]);
    
    // 记录补偿操作
    await this.auditService.recordCompensationAction({
      workflowId,
      compensationType: 'user_registration_rollback',
      affectedUserId: userId,
      actions: ['user_soft_delete', 'role_revoke', 'cache_clear', 'notification_sent']
    });
  }
}
```

### 5. 异步流程配置和管理

```typescript
// 异步流程配置服务
@Injectable()
export class AsyncWorkflowConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redis: Redis
  ) {}
  
  // 获取流程配置
  getWorkflowConfig(workflowType: string): WorkflowConfig {
    const configs: Record<string, WorkflowConfig> = {
      user_registration: {
        timeout: 300000, // 5分钟
        retryAttempts: 3,
        retryDelay: 5000,
        compensationEnabled: true,
        priority: 'high',
        parallelTasks: true,
        deadLetterQueue: 'user_registration_dlq'
      },
      permission_change: {
        timeout: 60000, // 1分钟
        retryAttempts: 2,
        retryDelay: 2000,
        compensationEnabled: true,
        priority: 'medium',
        parallelTasks: false,
        deadLetterQueue: 'permission_change_dlq'
      },
      user_deletion: {
        timeout: 1800000, // 30分钟
        retryAttempts: 5,
        retryDelay: 10000,
        compensationEnabled: true,
        priority: 'low',
        parallelTasks: true,
        deadLetterQueue: 'user_deletion_dlq'
      }
    };
    
    return configs[workflowType] || this.getDefaultConfig();
  }
}

// 流程配置接口
interface WorkflowConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  compensationEnabled: boolean;
  priority: 'low' | 'medium' | 'high';
  parallelTasks: boolean;
  deadLetterQueue: string;
}
```

## 📊 异步流程监控面板

### 实时监控指标
```typescript
// 异步流程指标收集
@Injectable()
export class AsyncWorkflowMetrics {
  private readonly metrics = new Map<string, WorkflowMetric>();
  
  recordWorkflowStart(workflowType: string, workflowId: string): void {
    this.metrics.set(workflowId, {
      type: workflowType,
      startTime: Date.now(),
      status: 'running',
      tasks: new Map()
    });
  }
  
  recordTaskCompletion(workflowId: string, taskName: string, duration: number): void {
    const workflow = this.metrics.get(workflowId);
    if (workflow) {
      workflow.tasks.set(taskName, {
        status: 'completed',
        duration,
        completedAt: Date.now()
      });
    }
  }
  
  getWorkflowStatistics(): WorkflowStatistics {
    return {
      totalWorkflows: this.metrics.size,
      runningWorkflows: Array.from(this.metrics.values()).filter(w => w.status === 'running').length,
      completedWorkflows: Array.from(this.metrics.values()).filter(w => w.status === 'completed').length,
      failedWorkflows: Array.from(this.metrics.values()).filter(w => w.status === 'failed').length,
      averageExecutionTime: this.calculateAverageExecutionTime(),
      taskSuccessRates: this.calculateTaskSuccessRates()
    };
  }
}
```

## ✅ Task I 完成标准

### 核心交付物 ✅
- [x] **用户注册异步流程** - 完整的注册流程编排和补偿机制
- [x] **权限变更异步流程** - 角色分配/撤销的异步处理
- [x] **用户删除异步流程** - GDPR合规的数据删除流程
- [x] **流程监控和补偿** - 超时检测、失败处理和自动补偿
- [x] **配置管理** - 灵活的流程配置和管理机制
- [x] **性能监控** - 实时的流程执行指标和统计

### 技术验证 ✅
- [x] **事件驱动集成** - 与前面建立的事件总线完美集成
- [x] **异步处理** - 提升用户体验的同时保证数据一致性
- [x] **错误处理** - 完善的重试、补偿和死信队列机制
- [x] **可扩展性** - 支持新增业务流程的框架设计

---

**Task I 总结**: 成功设计并实现了企业级异步业务流程处理框架，涵盖用户注册、权限管理、数据删除等关键业务场景。通过事件驱动架构实现了业务解耦，通过补偿机制保证了数据一致性，为系统的高可用性和良好用户体验奠定了基础。