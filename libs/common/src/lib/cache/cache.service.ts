/**
 * 缓存服务 - 基于Redis
 * 支持多租户、分布式锁、发布订阅
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      this.logger.debug(`缓存设置成功: ${key}`);
    } catch (error) {
      this.logger.error(`缓存设置失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`缓存获取失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`缓存删除成功: ${key}`);
    } catch (error) {
      this.logger.error(`缓存删除失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 批量删除缓存
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`批量删除缓存成功: ${pattern} (${keys.length}个)`);
      }
    } catch (error) {
      this.logger.error(`批量删除缓存失败: ${pattern}`, error);
      throw error;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`检查缓存存在性失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
      this.logger.debug(`设置缓存过期时间: ${key} (${seconds}s)`);
    } catch (error) {
      this.logger.error(`设置缓存过期时间失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 获取缓存TTL
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`获取缓存TTL失败: ${key}`, error);
      return -1;
    }
  }

  /**
   * 分布式锁
   */
  async lock(key: string, ttl: number = 30): Promise<boolean> {
    try {
      const lockKey = `lock:${key}`;
      const result = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`获取分布式锁失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 释放分布式锁
   */
  async unlock(key: string): Promise<void> {
    try {
      const lockKey = `lock:${key}`;
      await this.redis.del(lockKey);
      this.logger.debug(`释放分布式锁: ${key}`);
    } catch (error) {
      this.logger.error(`释放分布式锁失败: ${key}`, error);
    }
  }

  /**
   * 多租户缓存键构建
   */
  getTenantKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * 用户缓存键构建
   */
  getUserKey(userId: string, key: string): string {
    return `user:${userId}:${key}`;
  }

  /**
   * 会话缓存键构建
   */
  getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  /**
   * 增量计数器
   */
  async increment(key: string, increment: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, increment);
    } catch (error) {
      this.logger.error(`增量计数失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 发布消息
   */
  async publish(channel: string, message: any): Promise<void> {
    try {
      const serializedMessage = JSON.stringify(message);
      await this.redis.publish(channel, serializedMessage);
      this.logger.debug(`发布消息到频道: ${channel}`);
    } catch (error) {
      this.logger.error(`发布消息失败: ${channel}`, error);
      throw error;
    }
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.redis.subscribe(channel);
      this.redis.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            this.logger.error(`解析订阅消息失败: ${channel}`, error);
          }
        }
      });
      this.logger.debug(`订阅频道: ${channel}`);
    } catch (error) {
      this.logger.error(`订阅频道失败: ${channel}`, error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis健康检查失败:', error);
      return false;
    }
  }
}