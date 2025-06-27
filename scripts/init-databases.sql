-- 企业级微服务平台 - 数据库初始化脚本
-- 为每个微服务创建独立的数据库

-- 创建数据库
CREATE DATABASE gateway_db;
CREATE DATABASE auth_db;
CREATE DATABASE users_db;
CREATE DATABASE tenants_db;
CREATE DATABASE notifications_db;
CREATE DATABASE files_db;
CREATE DATABASE audit_db;
CREATE DATABASE monitoring_db;

-- 为每个数据库授权
GRANT ALL PRIVILEGES ON DATABASE gateway_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE auth_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE users_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE tenants_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE notifications_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE files_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE audit_db TO platform_user;
GRANT ALL PRIVILEGES ON DATABASE monitoring_db TO platform_user;

-- 连接到每个数据库并创建必要的扩展
\c gateway_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c auth_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c users_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c tenants_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c notifications_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c files_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c audit_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c monitoring_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";