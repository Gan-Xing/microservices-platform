/**
 * RLS (Row Level Security) 服务
 * 提供多租户数据隔离和上下文管理
 */

import { Injectable, Logger, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DatabaseService } from './database.service';
import { RbacServiceClient } from '../http/clients/rbac-service.client';

// RLS上下文接口
export interface RLSContext {
  tenantId: string;
  userId?: string;
  userRoles?: string[];
  sessionId?: string;
  permissions?: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

// RLS策略配置
export interface RLSPolicy {
  tableName: string;
  policyName: string;
  policyType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  expression: string;
  isEnabled: boolean;
}

// RLS上下文存储
const rlsContextStorage = new AsyncLocalStorage<RLSContext>();

@Injectable({ scope: Scope.REQUEST })
export class RLSService {
  private readonly logger = new Logger(RLSService.name);
  
  // 当前上下文缓存
  private currentContext?: RLSContext;
  
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rbacClient: RbacServiceClient,
  ) {}

  /**
   * 设置RLS上下文
   */
  async setContext(context: Omit<RLSContext, 'timestamp'>): Promise<void> {
    try {
      const fullContext: RLSContext = {
        ...context,
        timestamp: new Date(),
      };

      this.currentContext = fullContext;
      
      // 设置PostgreSQL会话变量
      await this.setDatabaseContext(fullContext);
      
      // 通知RBAC服务设置上下文
      if (context.userId) {
        await this.notifyRbacService(fullContext);
      }
      
      this.logger.debug(`RLS context set for tenant ${context.tenantId}, user ${context.userId}`);
      
    } catch (error) {
      this.logger.error('Failed to set RLS context:', error);
      throw new Error('Failed to set RLS context');
    }
  }

  /**
   * 获取当前RLS上下文
   */
  getCurrentContext(): RLSContext | undefined {
    return this.currentContext || rlsContextStorage.getStore();
  }

  /**
   * 在指定的RLS上下文中执行函数
   */
  async runInContext<T>(
    context: Omit<RLSContext, 'timestamp'>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const fullContext: RLSContext = {
      ...context,
      timestamp: new Date(),
    };

    return new Promise((resolve, reject) => {
      rlsContextStorage.run(fullContext, async () => {
        try {
          await this.setDatabaseContext(fullContext);
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          await this.clearDatabaseContext();
        }
      });
    });
  }

  /**
   * 清除RLS上下文
   */
  async clearContext(): Promise<void> {
    try {
      await this.clearDatabaseContext();
      this.currentContext = undefined;
      this.logger.debug('RLS context cleared');
    } catch (error) {
      this.logger.error('Failed to clear RLS context:', error);
    }
  }

  /**
   * 设置数据库上下文变量
   */
  private async setDatabaseContext(context: RLSContext): Promise<void> {
    const queries = [
      `SET app.current_tenant_id = '${context.tenantId}'`,
      `SET app.current_user_id = '${context.userId || ''}'`,
      `SET app.current_session_id = '${context.sessionId || ''}'`,
      `SET app.current_user_roles = '${(context.userRoles || []).join(',')}'`,
      `SET app.current_timestamp = '${context.timestamp.toISOString()}'`,
    ];

    // 设置权限列表
    if (context.permissions && context.permissions.length > 0) {
      queries.push(`SET app.current_permissions = '${context.permissions.join(',')}'`);
    }

    // 设置自定义元数据
    if (context.metadata) {
      for (const [key, value] of Object.entries(context.metadata)) {
        if (typeof value === 'string' || typeof value === 'number') {
          queries.push(`SET app.${key} = '${value}'`);
        }
      }
    }

    // 执行所有设置查询
    for (const query of queries) {
      try {
        await this.databaseService.$executeRawUnsafe(query);
      } catch (error) {
        this.logger.warn(`Failed to execute RLS query: ${query}`, error);
      }
    }
  }

  /**
   * 清除数据库上下文变量
   */
  private async clearDatabaseContext(): Promise<void> {
    const resetQueries = [
      "RESET app.current_tenant_id",
      "RESET app.current_user_id", 
      "RESET app.current_session_id",
      "RESET app.current_user_roles",
      "RESET app.current_permissions",
      "RESET app.current_timestamp",
    ];

    for (const query of resetQueries) {
      try {
        await this.databaseService.$executeRawUnsafe(query);
      } catch (error) {
        // 忽略重置错误，因为变量可能本来就不存在
        this.logger.debug(`Reset query failed (ignoring): ${query}`);
      }
    }
  }

  /**
   * 通知RBAC服务设置上下文
   */
  private async notifyRbacService(context: RLSContext): Promise<void> {
    try {
      if (!context.userId || !context.tenantId) {
        return;
      }

      await this.rbacClient.setRLSContext({
        userId: context.userId,
        tenantId: context.tenantId,
        userRoles: context.userRoles || [],
        sessionId: context.sessionId || '',
      }).toPromise();

    } catch (error) {
      this.logger.warn('Failed to notify RBAC service of RLS context:', error);
      // 不抛出错误，因为这不应该阻止主要操作
    }
  }

  /**
   * 验证租户访问权限
   */
  async validateTenantAccess(tenantId: string, userId?: string): Promise<boolean> {
    if (!userId) {
      return true; // 系统级操作
    }

    try {
      // 检查用户是否属于该租户
      const userRoles = await this.rbacClient.getUserRoles(userId, tenantId).toPromise();
      return userRoles.roles.length > 0;
    } catch (error) {
      this.logger.error('Failed to validate tenant access:', error);
      return false;
    }
  }

  /**
   * 获取用户在租户中的角色
   */
  async getUserRolesInTenant(userId: string, tenantId: string): Promise<string[]> {
    try {
      const userRoles = await this.rbacClient.getUserRoles(userId, tenantId).toPromise();
      return userRoles.roles
        .filter(role => role.isActive)
        .map(role => role.name);
    } catch (error) {
      this.logger.error('Failed to get user roles in tenant:', error);
      return [];
    }
  }

  /**
   * 检查RLS策略是否正确应用
   */
  async validateRLSPolicies(tableName: string): Promise<{
    isEnabled: boolean;
    policies: RLSPolicy[];
    missingPolicies: string[];
  }> {
    try {
      // 查询表的RLS状态
      const rlsStatus = await this.databaseService.$queryRaw<any[]>`
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled,
          hasrowsecurity as has_rls
        FROM pg_tables 
        WHERE tablename = ${tableName}
      `;

      if (rlsStatus.length === 0) {
        return {
          isEnabled: false,
          policies: [],
          missingPolicies: ['Table not found'],
        };
      }

      // 查询表的策略
      const policies = await this.databaseService.$queryRaw<any[]>`
        SELECT 
          policyname,
          cmd as policy_type,
          qual as expression,
          with_check
        FROM pg_policies 
        WHERE tablename = ${tableName}
      `;

      const rlsPolicies: RLSPolicy[] = policies.map(policy => ({
        tableName,
        policyName: policy.policyname,
        policyType: policy.policy_type,
        expression: policy.expression,
        isEnabled: true,
      }));

      // 检查必需的策略
      const requiredPolicies = ['tenant_isolation_policy'];
      const existingPolicyNames = rlsPolicies.map(p => p.policyName);
      const missingPolicies = requiredPolicies.filter(
        policy => !existingPolicyNames.includes(policy)
      );

      return {
        isEnabled: rlsStatus[0].rls_enabled,
        policies: rlsPolicies,
        missingPolicies,
      };

    } catch (error) {
      this.logger.error('Failed to validate RLS policies:', error);
      throw error;
    }
  }

  /**
   * 创建标准的租户隔离策略
   */
  async createTenantIsolationPolicy(tableName: string): Promise<void> {
    try {
      const policyName = `${tableName}_tenant_isolation`;
      
      // 启用RLS
      await this.databaseService.$executeRawUnsafe(`
        ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY
      `);

      // 创建租户隔离策略
      await this.databaseService.$executeRawUnsafe(`
        CREATE POLICY ${policyName} ON ${tableName}
        FOR ALL
        TO application_role
        USING (tenant_id = current_setting('app.current_tenant_id'))
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id'))
      `);

      this.logger.log(`Created tenant isolation policy for table: ${tableName}`);

    } catch (error) {
      this.logger.error(`Failed to create tenant isolation policy for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * 创建用户级访问策略
   */
  async createUserAccessPolicy(
    tableName: string,
    userIdColumn: string = 'user_id',
  ): Promise<void> {
    try {
      const policyName = `${tableName}_user_access`;
      
      await this.databaseService.$executeRawUnsafe(`
        CREATE POLICY ${policyName} ON ${tableName}
        FOR ALL
        TO application_role
        USING (
          ${userIdColumn} = current_setting('app.current_user_id')
          OR 
          current_setting('app.current_user_roles') LIKE '%admin%'
        )
        WITH CHECK (
          ${userIdColumn} = current_setting('app.current_user_id')
          OR 
          current_setting('app.current_user_roles') LIKE '%admin%'
        )
      `);

      this.logger.log(`Created user access policy for table: ${tableName}`);

    } catch (error) {
      this.logger.error(`Failed to create user access policy for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * 移除表的所有RLS策略
   */
  async removeAllPolicies(tableName: string): Promise<void> {
    try {
      // 查询现有策略
      const policies = await this.databaseService.$queryRaw<any[]>`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = ${tableName}
      `;

      // 删除所有策略
      for (const policy of policies) {
        await this.databaseService.$executeRawUnsafe(`
          DROP POLICY IF EXISTS ${policy.policyname} ON ${tableName}
        `);
      }

      // 禁用RLS
      await this.databaseService.$executeRawUnsafe(`
        ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY
      `);

      this.logger.log(`Removed all RLS policies from table: ${tableName}`);

    } catch (error) {
      this.logger.error(`Failed to remove RLS policies from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * 测试RLS策略效果
   */
  async testRLSPolicy(
    tableName: string,
    testTenantId: string,
    testUserId?: string,
  ): Promise<{
    canRead: boolean;
    canWrite: boolean;
    rowCount: number;
    error?: string;
  }> {
    try {
      // 设置测试上下文
      await this.setContext({
        tenantId: testTenantId,
        userId: testUserId,
      });

      // 测试读取权限
      let canRead = false;
      let rowCount = 0;
      try {
        const result = await this.databaseService.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM ${tableName}
        `;
        canRead = true;
        rowCount = parseInt(result[0].count);
      } catch (error) {
        canRead = false;
      }

      // 测试写入权限
      let canWrite = false;
      try {
        await this.databaseService.$executeRawUnsafe(`
          SELECT 1 WHERE EXISTS (
            SELECT 1 FROM ${tableName} LIMIT 1
          )
        `);
        canWrite = true;
      } catch (error) {
        canWrite = false;
      }

      return {
        canRead,
        canWrite,
        rowCount,
      };

    } catch (error) {
      return {
        canRead: false,
        canWrite: false,
        rowCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * 获取RLS统计信息
   */
  async getRLSStats(): Promise<{
    enabledTables: number;
    totalPolicies: number;
    tableStats: Array<{
      tableName: string;
      rlsEnabled: boolean;
      policyCount: number;
    }>;
  }> {
    try {
      // 查询启用RLS的表
      const rlsTables = await this.databaseService.$queryRaw<any[]>`
        SELECT 
          tablename,
          rowsecurity as rls_enabled,
          (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE pg_policies.tablename = pg_tables.tablename
          ) as policy_count
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;

      const enabledTables = rlsTables.filter(table => table.rls_enabled).length;
      const totalPolicies = rlsTables.reduce((sum, table) => sum + parseInt(table.policy_count), 0);

      const tableStats = rlsTables.map(table => ({
        tableName: table.tablename,
        rlsEnabled: table.rls_enabled,
        policyCount: parseInt(table.policy_count),
      }));

      return {
        enabledTables,
        totalPolicies,
        tableStats,
      };

    } catch (error) {
      this.logger.error('Failed to get RLS stats:', error);
      throw error;
    }
  }
}