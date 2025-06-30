/**
 * 数据库测试工具
 * 支持事务回滚和数据清理
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '@platform/common';

export class TestDatabase {
  private prisma: PrismaClient;
  private transactions: any[] = [];

  constructor(databaseService?: DatabaseService) {
    this.prisma = databaseService || new PrismaClient();
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<any> {
    const transaction = await this.prisma.$begin();
    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * 回滚所有事务
   */
  async rollbackAll(): Promise<void> {
    for (const transaction of this.transactions) {
      try {
        await transaction.$rollback();
      } catch (error) {
        console.warn('Failed to rollback transaction:', error);
      }
    }
    this.transactions = [];
  }

  /**
   * 清理测试数据
   */
  async cleanup(): Promise<void> {
    const tableNames = [
      'audit_logs',
      'user_sessions',
      'user_roles',
      'role_permissions',
      'permissions',
      'roles',
      'users',
      'tenants',
    ];

    for (const tableName of tableNames) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
      } catch (error) {
        console.warn(`Failed to truncate table ${tableName}:`, error);
      }
    }
  }

  /**
   * 创建测试租户
   */
  async createTestTenant(data?: Partial<any>): Promise<any> {
    return await this.prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
        plan: 'basic',
        settings: {},
        limits: {
          users: 100,
          storage: 1000000000, // 1GB
          apiCalls: 10000,
          bandwidth: 1000000000,
        },
        usage: {
          users: 0,
          storage: 0,
          apiCalls: 0,
          bandwidth: 0,
        },
        billing: {
          billingEmail: 'billing@test.com',
          currency: 'USD',
        },
        createdBy: 'system',
        ...data,
      },
    });
  }

  /**
   * 创建测试用户
   */
  async createTestUser(tenantId: string, data?: Partial<any>): Promise<any> {
    return await this.prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: '$2b$12$mockhashedpassword',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        failedLoginAttempts: 0,
        preferences: {
          timezone: 'UTC',
          locale: 'en',
        },
        tenantId,
        createdBy: 'system',
        ...data,
      },
    });
  }

  /**
   * 创建测试角色
   */
  async createTestRole(tenantId: string, data?: Partial<any>): Promise<any> {
    return await this.prisma.role.create({
      data: {
        name: 'Test Role',
        description: 'A test role',
        isSystem: false,
        isDefault: false,
        tenantId,
        createdBy: 'system',
        ...data,
      },
    });
  }

  /**
   * 创建测试权限
   */
  async createTestPermission(data?: Partial<any>): Promise<any> {
    return await this.prisma.permission.create({
      data: {
        name: 'test:read',
        resource: 'test',
        action: 'read',
        description: 'Read test resources',
        isSystem: false,
        ...data,
      },
    });
  }

  /**
   * 种子数据
   */
  async seedTestData(): Promise<{
    tenant: any;
    user: any;
    role: any;
    permission: any;
  }> {
    const tenant = await this.createTestTenant();
    const user = await this.createTestUser(tenant.id);
    const role = await this.createTestRole(tenant.id);
    const permission = await this.createTestPermission();

    // 关联角色和权限
    await this.prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    // 分配用户角色
    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedBy: 'system',
        assignedAt: new Date(),
      },
    });

    return { tenant, user, role, permission };
  }

  /**
   * 验证数据库状态
   */
  async validateState(expectations: {
    tenantCount?: number;
    userCount?: number;
    roleCount?: number;
    permissionCount?: number;
  }): Promise<boolean> {
    const [tenantCount, userCount, roleCount, permissionCount] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
    ]);

    return (
      (expectations.tenantCount === undefined || tenantCount === expectations.tenantCount) &&
      (expectations.userCount === undefined || userCount === expectations.userCount) &&
      (expectations.roleCount === undefined || roleCount === expectations.roleCount) &&
      (expectations.permissionCount === undefined || permissionCount === expectations.permissionCount)
    );
  }

  /**
   * 获取数据库统计
   */
  async getStats(): Promise<{
    tenants: number;
    users: number;
    roles: number;
    permissions: number;
    sessions: number;
    auditLogs: number;
  }> {
    const [tenants, users, roles, permissions, sessions, auditLogs] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.userSession.count(),
      this.prisma.auditLog.count(),
    ]);

    return { tenants, users, roles, permissions, sessions, auditLogs };
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    await this.rollbackAll();
    await this.prisma.$disconnect();
  }
}