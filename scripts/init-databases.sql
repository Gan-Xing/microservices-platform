-- 企业级微服务平台 - 数据库初始化脚本 (标准版本)
-- 单一数据库配置，使用schema隔离不同服务的数据

-- 连接到主数据库
\c platform;

-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 为每个微服务创建独立的schema
CREATE SCHEMA IF NOT EXISTS gateway;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS rbac;
CREATE SCHEMA IF NOT EXISTS tenants;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS monitoring;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS scheduler;
CREATE SCHEMA IF NOT EXISTS message_queue;
CREATE SCHEMA IF NOT EXISTS cache;

-- 为platform_user授予所有schema的权限
GRANT ALL ON SCHEMA gateway TO platform_user;
GRANT ALL ON SCHEMA auth TO platform_user;
GRANT ALL ON SCHEMA users TO platform_user;
GRANT ALL ON SCHEMA rbac TO platform_user;
GRANT ALL ON SCHEMA tenants TO platform_user;
GRANT ALL ON SCHEMA notifications TO platform_user;
GRANT ALL ON SCHEMA files TO platform_user;
GRANT ALL ON SCHEMA monitoring TO platform_user;
GRANT ALL ON SCHEMA audit TO platform_user;
GRANT ALL ON SCHEMA scheduler TO platform_user;
GRANT ALL ON SCHEMA message_queue TO platform_user;
GRANT ALL ON SCHEMA cache TO platform_user;

-- 设置默认权限，确保新创建的表也有正确的权限
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA users GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA rbac GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenants GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA notifications GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA files GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA monitoring GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA scheduler GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA message_queue GRANT ALL ON TABLES TO platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA cache GRANT ALL ON TABLES TO platform_user;

-- 创建基础性能优化配置
-- 为全文搜索优化创建通用函数
CREATE OR REPLACE FUNCTION create_tsvector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;