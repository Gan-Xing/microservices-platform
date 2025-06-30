/**
 * 系统种子数据
 * 初始化企业级平台基础数据
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

export class SystemSeed {
  private readonly logger = new Logger(SystemSeed.name);
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 执行所有种子数据
   */
  async run(): Promise<void> {
    this.logger.log('开始初始化系统种子数据...');

    try {
      await this.createSystemPermissions();
      await this.createSystemRoles();
      await this.createDefaultTenant();
      await this.createSystemAdmin();
      
      this.logger.log('系统种子数据初始化完成');
    } catch (error) {
      this.logger.error('系统种子数据初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建系统权限
   */
  private async createSystemPermissions(): Promise<void> {
    this.logger.log('创建系统权限...');

    const permissions = [
      // 用户管理权限
      { name: 'users:create', resource: 'users', action: 'create', description: '创建用户' },
      { name: 'users:read', resource: 'users', action: 'read', description: '查看用户' },
      { name: 'users:update', resource: 'users', action: 'update', description: '更新用户' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: '删除用户' },
      { name: 'users:manage', resource: 'users', action: 'manage', description: '管理用户' },

      // 租户管理权限
      { name: 'tenants:create', resource: 'tenants', action: 'create', description: '创建租户' },
      { name: 'tenants:read', resource: 'tenants', action: 'read', description: '查看租户' },
      { name: 'tenants:update', resource: 'tenants', action: 'update', description: '更新租户' },
      { name: 'tenants:delete', resource: 'tenants', action: 'delete', description: '删除租户' },
      { name: 'tenants:manage', resource: 'tenants', action: 'manage', description: '管理租户' },

      // 角色管理权限
      { name: 'roles:create', resource: 'roles', action: 'create', description: '创建角色' },
      { name: 'roles:read', resource: 'roles', action: 'read', description: '查看角色' },
      { name: 'roles:update', resource: 'roles', action: 'update', description: '更新角色' },
      { name: 'roles:delete', resource: 'roles', action: 'delete', description: '删除角色' },
      { name: 'roles:assign', resource: 'roles', action: 'assign', description: '分配角色' },

      // 权限管理权限
      { name: 'permissions:create', resource: 'permissions', action: 'create', description: '创建权限' },
      { name: 'permissions:read', resource: 'permissions', action: 'read', description: '查看权限' },
      { name: 'permissions:update', resource: 'permissions', action: 'update', description: '更新权限' },
      { name: 'permissions:delete', resource: 'permissions', action: 'delete', description: '删除权限' },

      // 文件管理权限
      { name: 'files:upload', resource: 'files', action: 'upload', description: '上传文件' },
      { name: 'files:download', resource: 'files', action: 'download', description: '下载文件' },
      { name: 'files:delete', resource: 'files', action: 'delete', description: '删除文件' },
      { name: 'files:manage', resource: 'files', action: 'manage', description: '管理文件' },

      // 通知管理权限
      { name: 'notifications:send', resource: 'notifications', action: 'send', description: '发送通知' },
      { name: 'notifications:read', resource: 'notifications', action: 'read', description: '查看通知' },
      { name: 'notifications:manage', resource: 'notifications', action: 'manage', description: '管理通知' },

      // 审计日志权限
      { name: 'audit:read', resource: 'audit', action: 'read', description: '查看审计日志' },
      { name: 'audit:export', resource: 'audit', action: 'export', description: '导出审计日志' },

      // 监控权限
      { name: 'monitoring:read', resource: 'monitoring', action: 'read', description: '查看监控数据' },
      { name: 'monitoring:manage', resource: 'monitoring', action: 'manage', description: '管理监控' },

      // 系统管理权限
      { name: 'system:admin', resource: 'system', action: 'admin', description: '系统管理员' },
      { name: 'system:config', resource: 'system', action: 'config', description: '系统配置' },
      { name: 'system:health', resource: 'system', action: 'health', description: '系统健康检查' },
    ];

    for (const permission of permissions) {
      await this.prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: {
          ...permission,
          isSystem: true,
        },
      });
    }

    this.logger.log(`创建了 ${permissions.length} 个系统权限`);
  }

  /**
   * 创建系统角色
   */
  private async createSystemRoles(): Promise<void> {
    this.logger.log('创建系统角色...');

    // 超级管理员角色
    const superAdminRole = await this.prisma.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: {
        name: 'super_admin',
        description: '超级管理员 - 拥有所有权限',
        isSystem: true,
        isDefault: false,
        tenantId: null, // 全局角色
        createdBy: 'system',
      },
    });

    // 为超级管理员分配所有权限
    const allPermissions = await this.prisma.permission.findMany({
      where: { isSystem: true },
    });

    for (const permission of allPermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });
    }

    // 租户管理员角色
    const tenantAdminPermissions = [
      'users:manage', 'roles:create', 'roles:read', 'roles:update', 'roles:assign',
      'files:manage', 'notifications:manage', 'audit:read',
    ];

    const tenantAdminRole = await this.prisma.role.upsert({
      where: { name: 'tenant_admin' },
      update: {},
      create: {
        name: 'tenant_admin',
        description: '租户管理员 - 管理租户内所有资源',
        isSystem: true,
        isDefault: false,
        tenantId: null, // 模板角色
        createdBy: 'system',
      },
    });

    for (const permissionName of tenantAdminPermissions) {
      const permission = await this.prisma.permission.findUnique({
        where: { name: permissionName },
      });
      if (permission) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: tenantAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: tenantAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 普通用户角色
    const userPermissions = [
      'users:read', 'files:upload', 'files:download', 'notifications:read',
    ];

    const userRole = await this.prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: {
        name: 'user',
        description: '普通用户 - 基本权限',
        isSystem: true,
        isDefault: true,
        tenantId: null, // 模板角色
        createdBy: 'system',
      },
    });

    for (const permissionName of userPermissions) {
      const permission = await this.prisma.permission.findUnique({
        where: { name: permissionName },
      });
      if (permission) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: userRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: userRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    this.logger.log('系统角色创建完成');
  }

  /**
   * 创建默认租户
   */
  private async createDefaultTenant(): Promise<void> {
    this.logger.log('创建默认租户...');

    await this.prisma.tenant.upsert({
      where: { slug: 'system' },
      update: {},
      create: {
        name: '系统租户',
        slug: 'system',
        status: 'active',
        plan: 'enterprise',
        settings: {
          branding: {
            primaryColor: '#1976d2',
            secondaryColor: '#424242',
          },
          features: {
            sso: true,
            twoFactorAuth: true,
            apiAccess: true,
            webhooks: true,
            customBranding: true,
            advancedAnalytics: true,
            bulkOperations: true,
            dataExport: true,
            auditLogs: true,
            teamManagement: true,
          },
          security: {
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSymbols: true,
              preventReuse: 5,
              maxAge: 90,
            },
            sessionTimeout: 480, // 8 hours
            ipWhitelist: [],
            allowedDomains: [],
            requireEmailVerification: true,
            requirePhoneVerification: false,
            enableAuditLogging: true,
            dataRetentionPeriod: 2555, // 7 years
          },
        },
        limits: {
          users: 10000,
          storage: 107374182400, // 100GB
          apiCalls: 1000000,
          bandwidth: 1073741824000, // 1TB
          fileUploads: 100000,
          emailNotifications: 100000,
          smsNotifications: 10000,
          customDomains: 10,
          apiKeys: 100,
          webhooks: 50,
        },
        usage: {
          users: 0,
          storage: 0,
          apiCalls: 0,
          bandwidth: 0,
          fileUploads: 0,
          emailNotifications: 0,
          smsNotifications: 0,
          customDomains: 0,
          apiKeys: 0,
          webhooks: 0,
          lastUpdated: new Date(),
          period: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
        billing: {
          billingEmail: 'admin@microservices-platform.com',
          currency: 'USD',
        },
        createdBy: 'system',
      },
    });

    this.logger.log('默认租户创建完成');
  }

  /**
   * 创建系统管理员
   */
  private async createSystemAdmin(): Promise<void> {
    this.logger.log('创建系统管理员...');

    const systemTenant = await this.prisma.tenant.findUnique({
      where: { slug: 'system' },
    });

    if (!systemTenant) {
      throw new Error('系统租户不存在');
    }

    const adminUser = await this.prisma.user.upsert({
      where: { email: 'admin@microservices-platform.com' },
      update: {},
      create: {
        email: 'admin@microservices-platform.com',
        username: 'admin',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaQJFrjbJ7LKJUjKOZJKJZZJ.', // password: admin123!
        firstName: 'System',
        lastName: 'Administrator',
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        failedLoginAttempts: 0,
        preferences: {
          timezone: 'UTC',
          locale: 'en',
          theme: 'light',
          notifications: {
            email: true,
            sms: false,
            push: true,
            marketing: false,
          },
        },
        tenantId: systemTenant.id,
        createdBy: 'system',
      },
    });

    // 分配超级管理员角色
    const superAdminRole = await this.prisma.role.findUnique({
      where: { name: 'super_admin' },
    });

    if (superAdminRole) {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
          assignedBy: 'system',
          assignedAt: new Date(),
        },
      });
    }

    this.logger.log('系统管理员创建完成');
  }

  /**
   * 清理所有数据
   */
  async cleanup(): Promise<void> {
    this.logger.log('清理种子数据...');

    const tables = [
      'audit_logs',
      'user_sessions',
      'user_roles',
      'role_permissions',
      'permissions',
      'roles',
      'users',
      'tenants',
    ];

    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }

    this.logger.log('种子数据清理完成');
  }
}