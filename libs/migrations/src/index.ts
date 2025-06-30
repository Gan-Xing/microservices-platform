/**
 * @platform/migrations - 企业级微服务平台数据库迁移库
 * 
 * 提供Prisma配置、数据库迁移、种子数据等
 * 支持100租户+10万用户的企业级标准版本
 */

// 迁移脚本
export * from './lib/scripts';

// 数据播种
export * from './lib/seeders';

// 迁移工具
export * from './lib/utils';