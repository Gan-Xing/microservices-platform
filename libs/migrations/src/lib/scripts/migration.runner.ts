/**
 * 数据库迁移执行器
 * 支持版本控制、回滚、验证
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { SystemSeed } from '../seeds/system.seed';

export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name);
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 执行所有迁移
   */
  async runMigrations(): Promise<void> {
    this.logger.log('开始执行数据库迁移...');

    try {
      // 1. 检查数据库连接
      await this.checkConnection();

      // 2. 执行Prisma迁移
      await this.runPrismaMigrations();

      // 3. 执行自定义迁移
      await this.runCustomMigrations();

      // 4. 验证迁移结果
      await this.validateMigrations();

      this.logger.log('数据库迁移执行完成');
    } catch (error) {
      this.logger.error('数据库迁移执行失败:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库
   */
  async initializeDatabase(): Promise<void> {
    this.logger.log('开始初始化数据库...');

    try {
      // 1. 执行迁移
      await this.runMigrations();

      // 2. 执行种子数据
      await this.runSeeds();

      this.logger.log('数据库初始化完成');
    } catch (error) {
      this.logger.error('数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 执行种子数据
   */
  async runSeeds(): Promise<void> {
    this.logger.log('开始执行种子数据...');

    const systemSeed = new SystemSeed(this.prisma);
    await systemSeed.run();

    this.logger.log('种子数据执行完成');
  }

  /**
   * 重置数据库
   */
  async resetDatabase(): Promise<void> {
    this.logger.log('开始重置数据库...');

    try {
      // 1. 清理种子数据
      const systemSeed = new SystemSeed(this.prisma);
      await systemSeed.cleanup();

      // 2. 重新初始化
      await this.initializeDatabase();

      this.logger.log('数据库重置完成');
    } catch (error) {
      this.logger.error('数据库重置失败:', error);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkConnection(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('数据库连接正常');
    } catch (error) {
      this.logger.error('数据库连接失败:', error);
      throw new Error('无法连接到数据库');
    }
  }

  /**
   * 执行Prisma迁移
   */
  private async runPrismaMigrations(): Promise<void> {
    // 注意：在生产环境中，应该使用 prisma migrate 命令
    // 这里只是演示如何在代码中处理迁移
    this.logger.log('Prisma迁移应该通过命令行执行: npx prisma migrate deploy');
  }

  /**
   * 执行自定义迁移
   */
  private async runCustomMigrations(): Promise<void> {
    this.logger.log('执行自定义迁移...');

    // 创建迁移记录表（如果不存在）
    await this.createMigrationTable();

    // 获取已执行的迁移
    const executedMigrations = await this.getExecutedMigrations();

    // 获取待执行的迁移
    const pendingMigrations = await this.getPendingMigrations(executedMigrations);

    // 执行待执行的迁移
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    this.logger.log(`执行了 ${pendingMigrations.length} 个自定义迁移`);
  }

  /**
   * 创建迁移记录表
   */
  private async createMigrationTable(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * 获取已执行的迁移
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<{ name: string }[]>(`
        SELECT name FROM _migrations ORDER BY executed_at
      `);
      return results.map(r => r.name);
    } catch (error) {
      // 如果表不存在，返回空数组
      return [];
    }
  }

  /**
   * 获取待执行的迁移
   */
  private async getPendingMigrations(executed: string[]): Promise<Migration[]> {
    const allMigrations = this.getAllMigrations();
    return allMigrations.filter(m => !executed.includes(m.name));
  }

  /**
   * 获取所有迁移定义
   */
  private getAllMigrations(): Migration[] {
    return [
      {
        name: '001_create_tenant_indexes',
        description: '创建租户相关索引',
        up: async () => {
          await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
          `);
        },
        down: async () => {
          await this.prisma.$executeRawUnsafe(`
            DROP INDEX IF EXISTS idx_users_tenant_id;
            DROP INDEX IF EXISTS idx_users_email;
            DROP INDEX IF EXISTS idx_users_status;
            DROP INDEX IF EXISTS idx_user_sessions_user_id;
            DROP INDEX IF EXISTS idx_user_sessions_expires_at;
            DROP INDEX IF EXISTS idx_audit_logs_tenant_id;
            DROP INDEX IF EXISTS idx_audit_logs_user_id;
            DROP INDEX IF EXISTS idx_audit_logs_created_at;
          `);
        },
      },
      {
        name: '002_optimize_queries',
        description: '优化查询性能',
        up: async () => {
          await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
            CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
            CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON files(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
          `);
        },
        down: async () => {
          await this.prisma.$executeRawUnsafe(`
            DROP INDEX IF EXISTS idx_roles_tenant_id;
            DROP INDEX IF EXISTS idx_role_permissions_role_id;
            DROP INDEX IF EXISTS idx_user_roles_user_id;
            DROP INDEX IF EXISTS idx_files_tenant_id;
            DROP INDEX IF EXISTS idx_files_uploaded_by;
          `);
        },
      },
    ];
  }

  /**
   * 执行单个迁移
   */
  private async executeMigration(migration: Migration): Promise<void> {
    this.logger.log(`执行迁移: ${migration.name}`);

    try {
      await migration.up();
      
      // 记录迁移已执行
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO _migrations (name) VALUES ('${migration.name}')
      `);

      this.logger.log(`迁移完成: ${migration.name}`);
    } catch (error) {
      this.logger.error(`迁移失败: ${migration.name}`, error);
      throw error;
    }
  }

  /**
   * 验证迁移结果
   */
  private async validateMigrations(): Promise<void> {
    this.logger.log('验证迁移结果...');

    try {
      // 检查关键表是否存在
      const tables = ['tenants', 'users', 'roles', 'permissions', 'user_roles', 'role_permissions'];
      
      for (const table of tables) {
        const result = await this.prisma.$queryRawUnsafe<{ count: number }[]>(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_name = '${table}'
        `);
        
        if (result[0].count === 0) {
          throw new Error(`表 ${table} 不存在`);
        }
      }

      this.logger.log('迁移结果验证通过');
    } catch (error) {
      this.logger.error('迁移结果验证失败:', error);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

interface Migration {
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}