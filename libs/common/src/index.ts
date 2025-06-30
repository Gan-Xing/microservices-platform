/**
 * @platform/common - 企业级微服务平台通用服务库
 * 
 * 提供数据库、缓存、消息、日志、安全等通用服务
 * 支持100租户+10万用户的企业级标准版本
 */

// 数据库工具
export * from './lib/database';

// 缓存工具
export * from './lib/cache';

// 消息传递
export * from './lib/messaging';

// 日志服务
export * from './lib/logging';

// 安全工具
export * from './lib/security';

// 监控工具
export * from './lib/monitoring';

// 通知工具
export * from './lib/notification';

// 存储工具
export * from './lib/storage';

// 验证工具
export * from './lib/validation';

// HTTP工具
export * from './lib/http';