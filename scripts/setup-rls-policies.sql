-- PostgreSQL RLS (Row Level Security) 策略初始化脚本
-- 企业级微服务平台 - 多租户数据隔离

-- ===========================================
-- 1. 创建数据库角色
-- ===========================================

-- 应用角色 (普通应用程序使用)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_role') THEN
        CREATE ROLE application_role;
    END IF;
END
$$;

-- 管理员角色 (系统管理员使用)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role;
    END IF;
END
$$;

-- 服务角色 (微服务间调用使用)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END
$$;

-- 只读角色 (报表和分析使用)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_role') THEN
        CREATE ROLE readonly_role;
    END IF;
END
$$;

-- ===========================================
-- 2. 创建RLS辅助函数
-- ===========================================

-- 获取当前租户ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
    -- 从session变量中获取租户ID
    RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取当前用户ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid AS $$
BEGIN
    -- 从session变量中获取用户ID
    RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取当前用户角色
CREATE OR REPLACE FUNCTION get_current_user_roles()
RETURNS text[] AS $$
BEGIN
    -- 从session变量中获取用户角色列表
    RETURN string_to_array(current_setting('app.current_user_roles', true), ',');
EXCEPTION
    WHEN OTHERS THEN
        RETURN ARRAY[]::text[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否有指定角色
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean AS $$
BEGIN
    RETURN role_name = ANY(get_current_user_roles());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否为系统管理员
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS boolean AS $$
BEGIN
    RETURN has_role('system_admin') OR has_role('super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否为租户管理员
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS boolean AS $$
BEGIN
    RETURN has_role('tenant_admin') OR is_system_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查资源所有权
CREATE OR REPLACE FUNCTION is_resource_owner(resource_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN resource_user_id = get_current_user_id() OR is_system_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. 通用RLS策略创建函数
-- ===========================================

-- 创建租户隔离策略
CREATE OR REPLACE FUNCTION create_tenant_isolation_policy(table_name text)
RETURNS void AS $$
BEGIN
    -- 删除已存在的策略
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', table_name);
    
    -- 创建租户隔离策略
    EXECUTE format('
        CREATE POLICY tenant_isolation_policy ON %I
        FOR ALL
        TO application_role, service_role
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id())
    ', table_name);
    
    RAISE NOTICE 'Created tenant isolation policy for table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- 创建管理员绕过策略
CREATE OR REPLACE FUNCTION create_admin_bypass_policy(table_name text)
RETURNS void AS $$
BEGIN
    -- 删除已存在的策略
    EXECUTE format('DROP POLICY IF EXISTS admin_bypass_policy ON %I', table_name);
    
    -- 创建管理员绕过策略
    EXECUTE format('
        CREATE POLICY admin_bypass_policy ON %I
        FOR ALL
        TO admin_role
        USING (true)
        WITH CHECK (true)
    ', table_name);
    
    RAISE NOTICE 'Created admin bypass policy for table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- 创建用户数据访问策略
CREATE OR REPLACE FUNCTION create_user_data_policy(table_name text, user_id_column text DEFAULT 'user_id')
RETURNS void AS $$
BEGIN
    -- 删除已存在的策略
    EXECUTE format('DROP POLICY IF EXISTS user_data_policy ON %I', table_name);
    
    -- 创建用户数据访问策略
    EXECUTE format('
        CREATE POLICY user_data_policy ON %I
        FOR ALL
        TO application_role
        USING (
            tenant_id = get_current_tenant_id() AND 
            (%I = get_current_user_id() OR is_tenant_admin())
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id() AND 
            %I = get_current_user_id()
        )
    ', table_name, user_id_column, user_id_column);
    
    RAISE NOTICE 'Created user data policy for table: % with user_id column: %', table_name, user_id_column;
END;
$$ LANGUAGE plpgsql;

-- 创建只读策略
CREATE OR REPLACE FUNCTION create_readonly_policy(table_name text)
RETURNS void AS $$
BEGIN
    -- 删除已存在的策略
    EXECUTE format('DROP POLICY IF EXISTS readonly_policy ON %I', table_name);
    
    -- 创建只读策略
    EXECUTE format('
        CREATE POLICY readonly_policy ON %I
        FOR SELECT
        TO readonly_role
        USING (tenant_id = get_current_tenant_id())
    ', table_name);
    
    RAISE NOTICE 'Created readonly policy for table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 4. 批量应用RLS策略函数
-- ===========================================

-- 为表启用RLS并应用标准策略
CREATE OR REPLACE FUNCTION enable_rls_with_policies(
    table_name text,
    enable_tenant_isolation boolean DEFAULT true,
    enable_admin_bypass boolean DEFAULT true,
    enable_user_data_policy boolean DEFAULT false,
    user_id_column text DEFAULT 'user_id',
    enable_readonly boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
    -- 启用RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    RAISE NOTICE 'Enabled RLS for table: %', table_name;
    
    -- 强制对表所有者也启用RLS
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    
    -- 应用租户隔离策略
    IF enable_tenant_isolation THEN
        PERFORM create_tenant_isolation_policy(table_name);
    END IF;
    
    -- 应用管理员绕过策略
    IF enable_admin_bypass THEN
        PERFORM create_admin_bypass_policy(table_name);
    END IF;
    
    -- 应用用户数据策略
    IF enable_user_data_policy THEN
        PERFORM create_user_data_policy(table_name, user_id_column);
    END IF;
    
    -- 应用只读策略
    IF enable_readonly THEN
        PERFORM create_readonly_policy(table_name);
    END IF;
    
    RAISE NOTICE 'Applied RLS policies for table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 5. 为各数据库应用RLS策略
-- ===========================================

-- 连接到API网关数据库
\c gateway_db;

-- Routes表 - 租户隔离
SELECT enable_rls_with_policies(
    'routes',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- API Keys表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'api_keys',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- Request Logs表 - 租户隔离
SELECT enable_rls_with_policies(
    'request_logs',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- 连接到认证数据库
\c auth_db;

-- Users表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'users',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'id',
    enable_readonly := true
);

-- OAuth Accounts表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'oauth_accounts',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- Sessions表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'user_sessions',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- 连接到用户管理数据库
\c users_db;

-- User Profiles表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'user_profiles',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- User Preferences表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'user_preferences',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- Organizations表 - 租户隔离
SELECT enable_rls_with_policies(
    'organizations',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Organization Members表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'organization_members',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- 连接到租户管理数据库
\c tenants_db;

-- Tenants表 - 特殊策略 (只能访问自己的租户)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_self_access_policy ON tenants;
CREATE POLICY tenant_self_access_policy ON tenants
    FOR ALL
    TO application_role, service_role
    USING (id = get_current_tenant_id())
    WITH CHECK (id = get_current_tenant_id());

-- 管理员可以访问所有租户
DROP POLICY IF EXISTS admin_all_tenants_policy ON tenants;
CREATE POLICY admin_all_tenants_policy ON tenants
    FOR ALL
    TO admin_role
    USING (true)
    WITH CHECK (true);

-- Subscriptions表 - 租户隔离
SELECT enable_rls_with_policies(
    'subscriptions',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Usage Stats表 - 租户隔离
SELECT enable_rls_with_policies(
    'usage_stats',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- 连接到RBAC数据库
\c rbac_db;

-- Roles表 - 租户隔离
SELECT enable_rls_with_policies(
    'roles',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Permissions表 - 全局权限可见 + 租户权限隔离
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permission_visibility_policy ON permissions;
CREATE POLICY permission_visibility_policy ON permissions
    FOR ALL
    TO application_role, service_role
    USING (tenant_id IS NULL OR tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id IS NULL OR tenant_id = get_current_tenant_id());

-- 管理员绕过策略
PERFORM create_admin_bypass_policy('permissions');

-- User Roles表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'user_roles',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- Role Permissions表 - 租户隔离
SELECT enable_rls_with_policies(
    'role_permissions',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Temporary Permissions表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'temporary_permissions',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- Permission Delegations表 - 租户隔离 + 特殊访问策略
ALTER TABLE permission_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_delegations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delegation_access_policy ON permission_delegations;
CREATE POLICY delegation_access_policy ON permission_delegations
    FOR ALL
    TO application_role, service_role
    USING (
        tenant_id = get_current_tenant_id() AND 
        (delegator_id = get_current_user_id() OR 
         delegatee_id = get_current_user_id() OR 
         is_tenant_admin())
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() AND 
        delegator_id = get_current_user_id()
    );

-- 管理员绕过策略
PERFORM create_admin_bypass_policy('permission_delegations');

-- 连接到通知数据库
\c notifications_db;

-- Notification Templates表 - 租户隔离
SELECT enable_rls_with_policies(
    'notification_templates',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Notification Messages表 - 租户隔离 + 用户数据访问
ALTER TABLE notification_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_message_policy ON notification_messages;
CREATE POLICY notification_message_policy ON notification_messages
    FOR ALL
    TO application_role, service_role
    USING (
        tenant_id = get_current_tenant_id() AND 
        (recipient = get_current_user_id()::text OR is_tenant_admin())
    )
    WITH CHECK (tenant_id = get_current_tenant_id());

-- 管理员绕过策略
PERFORM create_admin_bypass_policy('notification_messages');

-- Notification Preferences表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'notification_preferences',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- 连接到文件存储数据库
\c files_db;

-- Files表 - 租户隔离 + 用户数据访问
SELECT enable_rls_with_policies(
    'files',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'user_id',
    enable_readonly := true
);

-- File Permissions表 - 租户隔离 + 特殊访问策略
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS file_permission_policy ON file_permissions;
CREATE POLICY file_permission_policy ON file_permissions
    FOR ALL
    TO application_role, service_role
    USING (
        tenant_id = get_current_tenant_id() AND 
        (user_id = get_current_user_id() OR is_tenant_admin())
    )
    WITH CHECK (tenant_id = get_current_tenant_id());

-- 管理员绕过策略
PERFORM create_admin_bypass_policy('file_permissions');

-- File Shares表 - 租户隔离 + 创建者访问
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS file_share_policy ON file_shares;
CREATE POLICY file_share_policy ON file_shares
    FOR ALL
    TO application_role, service_role
    USING (
        -- 通过files表关联获取tenant_id
        EXISTS (
            SELECT 1 FROM files f 
            WHERE f.id = file_shares.file_id 
            AND f.tenant_id = get_current_tenant_id()
            AND (f.user_id = get_current_user_id() OR is_tenant_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM files f 
            WHERE f.id = file_shares.file_id 
            AND f.tenant_id = get_current_tenant_id()
            AND f.user_id = get_current_user_id()
        )
    );

-- 管理员绕过策略
PERFORM create_admin_bypass_policy('file_shares');

-- 连接到审计数据库
\c audit_db;

-- Audit Events表 - 租户隔离
SELECT enable_rls_with_policies(
    'audit_events',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Compliance Rules表 - 租户隔离
SELECT enable_rls_with_policies(
    'compliance_rules',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Security Events表 - 租户隔离
SELECT enable_rls_with_policies(
    'security_events',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- 连接到监控数据库
\c monitoring_db;

-- Health Checks表 - 租户隔离
SELECT enable_rls_with_policies(
    'health_checks',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Alert Rules表 - 租户隔离
SELECT enable_rls_with_policies(
    'alert_rules',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- SLAs表 - 租户隔离
SELECT enable_rls_with_policies(
    'slas',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := false,
    enable_readonly := true
);

-- Dashboards表 - 租户隔离 + 创建者访问
SELECT enable_rls_with_policies(
    'dashboards',
    enable_tenant_isolation := true,
    enable_admin_bypass := true,
    enable_user_data_policy := true,
    user_id_column := 'created_by',
    enable_readonly := true
);

-- ===========================================
-- 6. 授予角色权限
-- ===========================================

-- 为应用角色授予权限
DO $$
DECLARE
    db_name text;
BEGIN
    FOR db_name IN VALUES ('gateway_db'), ('auth_db'), ('users_db'), ('tenants_db'), ('rbac_db'), ('notifications_db'), ('files_db'), ('audit_db'), ('monitoring_db') LOOP
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO application_role', db_name);
        EXECUTE format('GRANT USAGE ON SCHEMA public TO application_role');
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role');
        EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role');
    END LOOP;
END
$$;

-- 为服务角色授予权限 (与应用角色相同)
DO $$
DECLARE
    db_name text;
BEGIN
    FOR db_name IN VALUES ('gateway_db'), ('auth_db'), ('users_db'), ('tenants_db'), ('rbac_db'), ('notifications_db'), ('files_db'), ('audit_db'), ('monitoring_db') LOOP
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO service_role', db_name);
        EXECUTE format('GRANT USAGE ON SCHEMA public TO service_role');
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role');
        EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role');
    END LOOP;
END
$$;

-- 为管理员角色授予所有权限
DO $$
DECLARE
    db_name text;
BEGIN
    FOR db_name IN VALUES ('gateway_db'), ('auth_db'), ('users_db'), ('tenants_db'), ('rbac_db'), ('notifications_db'), ('files_db'), ('audit_db'), ('monitoring_db') LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO admin_role', db_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role');
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_role');
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin_role');
    END LOOP;
END
$$;

-- 为只读角色授予查询权限
DO $$
DECLARE
    db_name text;
BEGIN
    FOR db_name IN VALUES ('gateway_db'), ('auth_db'), ('users_db'), ('tenants_db'), ('rbac_db'), ('notifications_db'), ('files_db'), ('audit_db'), ('monitoring_db') LOOP
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO readonly_role', db_name);
        EXECUTE format('GRANT USAGE ON SCHEMA public TO readonly_role');
        EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role');
    END LOOP;
END
$$;

-- ===========================================
-- 7. 创建RLS策略管理视图
-- ===========================================

-- 切换到主数据库
\c platform_main;

-- 创建RLS策略监控视图
CREATE OR REPLACE VIEW rls_policy_status AS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity,
    (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY schemaname, tablename;

-- 创建详细策略信息视图
CREATE OR REPLACE VIEW rls_policy_details AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY schemaname, tablename, policyname;

-- ===========================================
-- 8. 输出总结信息
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'PostgreSQL RLS策略初始化完成!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '已创建的角色:';
    RAISE NOTICE '- application_role: 应用程序使用';
    RAISE NOTICE '- admin_role: 系统管理员使用';
    RAISE NOTICE '- service_role: 微服务间调用使用';
    RAISE NOTICE '- readonly_role: 只读访问使用';
    RAISE NOTICE '';
    RAISE NOTICE '已应用RLS策略的数据库:';
    RAISE NOTICE '- gateway_db: API网关数据库';
    RAISE NOTICE '- auth_db: 认证数据库';
    RAISE NOTICE '- users_db: 用户管理数据库';
    RAISE NOTICE '- tenants_db: 租户管理数据库';
    RAISE NOTICE '- rbac_db: RBAC权限数据库';
    RAISE NOTICE '- notifications_db: 通知数据库';
    RAISE NOTICE '- files_db: 文件存储数据库';
    RAISE NOTICE '- audit_db: 审计数据库';
    RAISE NOTICE '- monitoring_db: 监控数据库';
    RAISE NOTICE '';
    RAISE NOTICE '策略类型:';
    RAISE NOTICE '- 租户隔离策略: 确保数据按租户隔离';
    RAISE NOTICE '- 用户数据策略: 用户只能访问自己的数据';
    RAISE NOTICE '- 管理员绕过策略: 管理员可以访问所有数据';
    RAISE NOTICE '- 只读策略: 只读角色只能查询数据';
    RAISE NOTICE '';
    RAISE NOTICE '使用方法:';
    RAISE NOTICE '在应用程序中设置session变量:';
    RAISE NOTICE '- SELECT set_config(''app.current_tenant_id'', ''tenant_uuid'', true);';
    RAISE NOTICE '- SELECT set_config(''app.current_user_id'', ''user_uuid'', true);';
    RAISE NOTICE '- SELECT set_config(''app.current_user_roles'', ''role1,role2'', true);';
    RAISE NOTICE '';
    RAISE NOTICE '监控视图:';
    RAISE NOTICE '- rls_policy_status: 查看RLS启用状态';
    RAISE NOTICE '- rls_policy_details: 查看详细策略信息';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS策略初始化完成! 数据库现在具有企业级多租户安全隔离。';
    RAISE NOTICE '===========================================';
END
$$;