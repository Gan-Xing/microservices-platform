/**
 * 数据库服务 - 基于Prisma ORM
 * 支持多租户、事务、连接池管理
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    });

    // 监听数据库事件
    this.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
      }
    });

    this.$on('error', (e) => {
      this.logger.error('Database error:', e);
    });

    this.$on('warn', (e) => {
      this.logger.warn('Database warning:', e);
    });

    this.$on('info', (e) => {
      this.logger.log('Database info:', e);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('数据库连接成功');
    } catch (error) {
      this.logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('数据库连接已关闭');
  }

  /**
   * 执行事务
   */
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return await this.$transaction(fn);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('数据库健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): string {
    return 'connected'; // Prisma doesn't expose connection status directly
  }

  /**
   * 多租户查询装饰器
   * 自动添加 tenantId 过滤条件
   */
  withTenant<T extends Record<string, any>>(
    tenantId: string,
    query: T,
  ): T & { where: { tenantId: string } } {
    return {
      ...query,
      where: {
        ...query.where,
        tenantId,
      },
    };
  }

  /**
   * 软删除查询装饰器
   * 自动过滤已删除的记录
   */
  withoutDeleted<T extends Record<string, any>>(query: T): T {
    return {
      ...query,
      where: {
        ...query.where,
        deletedAt: null,
      },
    };
  }

  /**
   * 分页查询辅助方法
   */
  async paginate<T>(
    model: any,
    args: {
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.findMany({
        ...args,
        skip,
        take: limit,
      }),
      model.count({
        where: args.where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}