/**
 * 权限缓存服务
 * 提供权限检查结果的缓存管理
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@platform/common';

// 权限缓存条目
export interface PermissionCacheEntry {
  allowed: boolean;
  roles: string[];
  permissions: string[];
  timestamp: number;
  expiresAt: number;
}

// 权限缓存键构建器
export interface PermissionCacheKeyBuilder {
  userId: string;
  tenantId: string;
  resource?: string;
  action?: string;
  resourceId?: string;
  context?: Record<string, any>;
}

// 缓存统计信息
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  lastReset: Date;
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly CACHE_PREFIX = 'permission:';
  private readonly DEFAULT_TTL = 300; // 5分钟
  private readonly MAX_CACHE_SIZE = 10000; // 最大缓存条目数
  
  // 缓存统计
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalKeys: 0,
    lastReset: new Date(),
  };

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取权限检查结果
   */
  async getPermissionResult(
    keyBuilder: PermissionCacheKeyBuilder,
  ): Promise<PermissionCacheEntry | null> {
    try {
      const key = this.buildCacheKey(keyBuilder);
      const cached = await this.cacheService.get<PermissionCacheEntry>(key);
      
      if (cached) {
        // 检查是否过期
        if (Date.now() > cached.expiresAt) {
          await this.cacheService.del(key);
          this.recordMiss();
          return null;
        }
        
        this.recordHit();
        this.logger.debug(`Permission cache hit: ${key}`);
        return cached;
      }
      
      this.recordMiss();
      return null;
    } catch (error) {
      this.logger.error('Failed to get permission from cache:', error);
      this.recordMiss();
      return null;
    }
  }

  /**
   * 缓存权限检查结果
   */
  async cachePermissionResult(
    keyBuilder: PermissionCacheKeyBuilder,
    entry: Omit<PermissionCacheEntry, 'timestamp' | 'expiresAt'>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const key = this.buildCacheKey(keyBuilder);
      const now = Date.now();
      
      const cacheEntry: PermissionCacheEntry = {
        ...entry,
        timestamp: now,
        expiresAt: now + (ttl * 1000),
      };

      await this.cacheService.set(key, cacheEntry, ttl);
      this.stats.totalKeys++;
      
      this.logger.debug(`Permission cached: ${key} (TTL: ${ttl}s)`);
      
      // 检查缓存大小并清理
      await this.checkCacheSize();
    } catch (error) {
      this.logger.error('Failed to cache permission result:', error);
    }
  }

  /**
   * 获取用户角色缓存
   */
  async getUserRoles(userId: string, tenantId: string): Promise<string[] | null> {
    try {
      const key = this.buildUserRoleKey(userId, tenantId);
      const cached = await this.cacheService.get<{
        roles: string[];
        timestamp: number;
        expiresAt: number;
      }>(key);
      
      if (cached && Date.now() <= cached.expiresAt) {
        this.recordHit();
        return cached.roles;
      }
      
      if (cached) {
        await this.cacheService.del(key);
      }
      
      this.recordMiss();
      return null;
    } catch (error) {
      this.logger.error('Failed to get user roles from cache:', error);
      this.recordMiss();
      return null;
    }
  }

  /**
   * 缓存用户角色
   */
  async cacheUserRoles(
    userId: string,
    tenantId: string,
    roles: string[],
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const key = this.buildUserRoleKey(userId, tenantId);
      const now = Date.now();
      
      const cacheEntry = {
        roles,
        timestamp: now,
        expiresAt: now + (ttl * 1000),
      };

      await this.cacheService.set(key, cacheEntry, ttl);
      this.logger.debug(`User roles cached: ${key}`);
    } catch (error) {
      this.logger.error('Failed to cache user roles:', error);
    }
  }

  /**
   * 清除用户相关的所有权限缓存
   */
  async clearUserPermissions(userId: string, tenantId?: string): Promise<void> {
    try {
      const pattern = tenantId
        ? `${this.CACHE_PREFIX}${userId}:${tenantId}:*`
        : `${this.CACHE_PREFIX}${userId}:*`;
      
      await this.cacheService.delPattern(pattern);
      
      // 清除用户角色缓存
      if (tenantId) {
        const roleKey = this.buildUserRoleKey(userId, tenantId);
        await this.cacheService.del(roleKey);
      } else {
        const rolePattern = `user_roles:${userId}:*`;
        await this.cacheService.delPattern(rolePattern);
      }
      
      this.logger.debug(`Cleared permissions for user ${userId} in tenant ${tenantId || 'all'}`);
    } catch (error) {
      this.logger.error('Failed to clear user permissions:', error);
    }
  }

  /**
   * 清除租户相关的所有权限缓存
   */
  async clearTenantPermissions(tenantId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*:${tenantId}:*`;
      await this.cacheService.delPattern(pattern);
      
      // 清除租户角色缓存
      const rolePattern = `user_roles:*:${tenantId}`;
      await this.cacheService.delPattern(rolePattern);
      
      this.logger.debug(`Cleared permissions for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error('Failed to clear tenant permissions:', error);
    }
  }

  /**
   * 清除特定资源的权限缓存
   */
  async clearResourcePermissions(
    resource: string,
    resourceId?: string,
    tenantId?: string,
  ): Promise<void> {
    try {
      let pattern: string;
      
      if (tenantId && resourceId) {
        pattern = `${this.CACHE_PREFIX}*:${tenantId}:${resource}:*:${resourceId}`;
      } else if (tenantId) {
        pattern = `${this.CACHE_PREFIX}*:${tenantId}:${resource}:*`;
      } else if (resourceId) {
        pattern = `${this.CACHE_PREFIX}*:*:${resource}:*:${resourceId}`;
      } else {
        pattern = `${this.CACHE_PREFIX}*:*:${resource}:*`;
      }
      
      await this.cacheService.delPattern(pattern);
      this.logger.debug(`Cleared permissions for resource ${resource}:${resourceId || 'all'}`);
    } catch (error) {
      this.logger.error('Failed to clear resource permissions:', error);
    }
  }

  /**
   * 预热权限缓存
   */
  async warmupCache(
    userId: string,
    tenantId: string,
    commonPermissions: string[],
  ): Promise<void> {
    try {
      this.logger.debug(`Warming up cache for user ${userId} in tenant ${tenantId}`);
      
      // 这里可以预先加载常用权限
      // 实际实现中需要调用RBAC服务获取权限信息
      
      const warmupPromises = commonPermissions.map(async (permission) => {
        const [resource, action] = permission.split(':');
        const keyBuilder: PermissionCacheKeyBuilder = {
          userId,
          tenantId,
          resource,
          action,
        };
        
        // 检查缓存是否已存在
        const existing = await this.getPermissionResult(keyBuilder);
        if (!existing) {
          // 这里需要实际的权限检查逻辑
          // 暂时跳过预热
        }
      });
      
      await Promise.all(warmupPromises);
      this.logger.debug(`Cache warmup completed for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to warmup cache:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  /**
   * 重置缓存统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      lastReset: new Date(),
    };
    this.logger.debug('Cache statistics reset');
  }

  /**
   * 清除所有权限缓存
   */
  async clearAllPermissions(): Promise<void> {
    try {
      await this.cacheService.delPattern(`${this.CACHE_PREFIX}*`);
      await this.cacheService.delPattern('user_roles:*');
      this.stats.totalKeys = 0;
      this.logger.debug('All permission cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear all permissions:', error);
    }
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(keyBuilder: PermissionCacheKeyBuilder): string {
    const parts = [
      this.CACHE_PREFIX,
      keyBuilder.userId,
      keyBuilder.tenantId,
      keyBuilder.resource || 'any',
      keyBuilder.action || 'any',
    ];
    
    if (keyBuilder.resourceId) {
      parts.push(keyBuilder.resourceId);
    }
    
    // 如果有上下文，生成上下文哈希
    if (keyBuilder.context) {
      const contextHash = this.hashContext(keyBuilder.context);
      parts.push(contextHash);
    }
    
    return parts.join(':');
  }

  /**
   * 构建用户角色缓存键
   */
  private buildUserRoleKey(userId: string, tenantId: string): string {
    return `user_roles:${userId}:${tenantId}`;
  }

  /**
   * 生成上下文哈希
   */
  private hashContext(context: Record<string, any>): string {
    const sortedKeys = Object.keys(context).sort();
    const contextString = sortedKeys
      .map(key => `${key}:${context[key]}`)
      .join('|');
    
    // 简单的哈希实现，生产环境应该使用更好的哈希算法
    let hash = 0;
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 记录缓存命中
   */
  private recordHit(): void {
    this.stats.hits++;
  }

  /**
   * 记录缓存未命中
   */
  private recordMiss(): void {
    this.stats.misses++;
  }

  /**
   * 检查缓存大小并清理过期条目
   */
  private async checkCacheSize(): Promise<void> {
    if (this.stats.totalKeys > this.MAX_CACHE_SIZE) {
      this.logger.warn(`Cache size exceeded ${this.MAX_CACHE_SIZE}, clearing expired entries`);
      
      // 这里可以实现更智能的缓存清理策略
      // 比如LRU或基于使用频率的清理
      
      // 简单实现：清理所有过期的条目
      await this.cleanupExpiredEntries();
    }
  }

  /**
   * 清理过期条目
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      // 这里需要实现过期条目的清理逻辑
      // 由于Redis会自动处理TTL，这里主要是更新统计信息
      this.logger.debug('Cleanup expired cache entries');
    } catch (error) {
      this.logger.error('Failed to cleanup expired entries:', error);
    }
  }
}