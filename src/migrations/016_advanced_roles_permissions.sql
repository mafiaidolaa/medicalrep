-- Migration: Advanced Roles and Permissions System
-- This migration creates a comprehensive role-based access control system

-- Create departments table (enhanced)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cost_center TEXT,
  budget_limit DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_system_role BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'department', 'own', 'custom')),
  description TEXT,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource, action, scope)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create security_policies table
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('authentication', 'authorization', 'data_access', 'session', 'audit')),
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  applies_to TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  session_id TEXT,
  risk_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced user_profiles table
DO $$ 
BEGIN
  -- Add new columns to existing user_profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'employee_id') THEN
    ALTER TABLE user_profiles ADD COLUMN employee_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'manager_id') THEN
    ALTER TABLE user_profiles ADD COLUMN manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'job_title') THEN
    ALTER TABLE user_profiles ADD COLUMN job_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'level') THEN
    ALTER TABLE user_profiles ADD COLUMN level INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'hire_date') THEN
    ALTER TABLE user_profiles ADD COLUMN hire_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'emergency_contact') THEN
    ALTER TABLE user_profiles ADD COLUMN emergency_contact JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'preferences') THEN
    ALTER TABLE user_profiles ADD COLUMN preferences JSONB DEFAULT '{
      "language": "ar",
      "timezone": "Asia/Riyadh",
      "date_format": "dd/MM/yyyy",
      "currency": "SAR",
      "theme": "light",
      "notifications": {
        "email": true,
        "push": true,
        "sms": false,
        "in_app": true,
        "digest_frequency": "immediate",
        "categories": {
          "expense_approval": true,
          "budget_alerts": true,
          "system_updates": false
        }
      },
      "dashboard_widgets": ["recent_expenses", "pending_approvals", "budget_overview"]
    }'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'security_settings') THEN
    ALTER TABLE user_profiles ADD COLUMN security_settings JSONB DEFAULT '{
      "mfa_enabled": false,
      "mfa_methods": [],
      "login_attempts": 0,
      "trusted_devices": [],
      "security_questions": []
    }'::jsonb;
  END IF;
END $$;

-- Create session_logs table for security tracking
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  device_fingerprint TEXT,
  login_method TEXT DEFAULT 'password',
  login_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  risk_score INTEGER DEFAULT 0,
  suspicious_activities JSONB DEFAULT '[]'::jsonb
);

-- Create trusted_devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, fingerprint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_roles_department_id ON roles(department_id);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system_role);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_department ON user_roles(department_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

CREATE INDEX IF NOT EXISTS idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_active ON session_logs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_session_logs_login_at ON session_logs(login_at);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_active ON trusted_devices(is_active) WHERE is_active = true;

-- Insert default departments
INSERT INTO departments (name, description, is_active) VALUES
('إدارة تقنية المعلومات', 'قسم تقنية المعلومات والبرمجة', true),
('الموارد البشرية', 'إدارة شؤون الموظفين والتوظيف', true),
('المالية والمحاسبة', 'الإدارة المالية والمحاسبية', true),
('التسويق والمبيعات', 'أنشطة التسويق والمبيعات', true),
('العمليات', 'إدارة العمليات التشغيلية', true),
('الإدارة العليا', 'مجلس الإدارة والإدارة التنفيذية', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, display_name, description, level, is_system_role, color, icon) VALUES
('super_admin', 'مدير النظام الرئيسي', 'صلاحيات كاملة لإدارة النظام', 10, true, '#DC2626', 'crown'),
('admin', 'مدير النظام', 'إدارة النظام والمستخدمين', 9, true, '#EA580C', 'shield'),
('manager', 'مدير', 'إدارة الفريق والموافقات', 7, true, '#7C3AED', 'briefcase'),
('supervisor', 'مشرف', 'إشراف على العمليات', 5, true, '#059669', 'eye'),
('senior_employee', 'موظف أول', 'موظف بخبرة عالية', 4, true, '#0EA5E9', 'star'),
('employee', 'موظف', 'موظف عادي', 3, true, '#6B7280', 'user'),
('intern', 'متدرب', 'متدرب أو موظف جديد', 1, true, '#9CA3AF', 'graduation-cap')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  updated_at = now();

-- Insert default permissions
INSERT INTO permissions (resource, action, scope, description) VALUES
-- User management
('users', 'create', 'global', 'إنشاء مستخدمين جدد'),
('users', 'read', 'global', 'عرض بيانات المستخدمين'),
('users', 'read', 'department', 'عرض مستخدمي القسم'),
('users', 'read', 'own', 'عرض البيانات الشخصية'),
('users', 'update', 'global', 'تعديل بيانات المستخدمين'),
('users', 'update', 'department', 'تعديل مستخدمي القسم'),
('users', 'update', 'own', 'تعديل البيانات الشخصية'),
('users', 'delete', 'global', 'حذف المستخدمين'),
('users', 'deactivate', 'global', 'إلغاء تفعيل المستخدمين'),

-- Role management
('roles', 'create', 'global', 'إنشاء أدوار جديدة'),
('roles', 'read', 'global', 'عرض الأدوار'),
('roles', 'update', 'global', 'تعديل الأدوار'),
('roles', 'delete', 'global', 'حذف الأدوار'),
('roles', 'assign', 'global', 'تعيين أدوار للمستخدمين'),
('roles', 'assign', 'department', 'تعيين أدوار داخل القسم'),

-- Department management
('departments', 'create', 'global', 'إنشاء أقسام جديدة'),
('departments', 'read', 'global', 'عرض جميع الأقسام'),
('departments', 'read', 'own', 'عرض القسم الخاص'),
('departments', 'update', 'global', 'تعديل الأقسام'),
('departments', 'update', 'own', 'تعديل القسم الخاص'),
('departments', 'delete', 'global', 'حذف الأقسام'),

-- Expense management
('expenses', 'create', 'own', 'إنشاء مصروفات شخصية'),
('expenses', 'read', 'own', 'عرض المصروفات الشخصية'),
('expenses', 'read', 'department', 'عرض مصروفات القسم'),
('expenses', 'read', 'global', 'عرض جميع المصروفات'),
('expenses', 'update', 'own', 'تعديل المصروفات الشخصية'),
('expenses', 'update', 'department', 'تعديل مصروفات القسم'),
('expenses', 'update', 'global', 'تعديل جميع المصروفات'),
('expenses', 'delete', 'own', 'حذف المصروفات الشخصية'),
('expenses', 'delete', 'department', 'حذف مصروفات القسم'),
('expenses', 'approve', 'department', 'الموافقة على مصروفات القسم'),
('expenses', 'approve', 'global', 'الموافقة على جميع المصروفات'),
('expenses', 'reject', 'department', 'رفض مصروفات القسم'),
('expenses', 'reject', 'global', 'رفض جميع المصروفات'),

-- Report access
('reports', 'read', 'own', 'عرض التقارير الشخصية'),
('reports', 'read', 'department', 'عرض تقارير القسم'),
('reports', 'read', 'global', 'عرض جميع التقارير'),
('reports', 'create', 'department', 'إنشاء تقارير القسم'),
('reports', 'create', 'global', 'إنشاء جميع التقارير'),
('reports', 'export', 'department', 'تصدير تقارير القسم'),
('reports', 'export', 'global', 'تصدير جميع التقارير'),

-- System settings
('settings', 'read', 'global', 'عرض إعدادات النظام'),
('settings', 'update', 'global', 'تعديل إعدادات النظام'),
('settings', 'read', 'own', 'عرض الإعدادات الشخصية'),
('settings', 'update', 'own', 'تعديل الإعدادات الشخصية'),

-- Audit logs
('audit', 'read', 'global', 'عرض سجلات المراجعة'),
('audit', 'read', 'department', 'عرض سجلات القسم'),
('audit', 'export', 'global', 'تصدير سجلات المراجعة'),

-- Notifications
('notifications', 'send', 'global', 'إرسال إشعارات لجميع المستخدمين'),
('notifications', 'send', 'department', 'إرسال إشعارات للقسم'),
('notifications', 'read', 'own', 'قراءة الإشعارات الشخصية'),
('notifications', 'manage', 'own', 'إدارة الإشعارات الشخصية')

ON CONFLICT (resource, action, scope) DO UPDATE SET
  description = EXCLUDED.description;

-- Insert default security policies
INSERT INTO security_policies (name, description, policy_type, rules, is_enabled) VALUES
('password_policy', 'سياسة كلمات المرور', 'authentication', '[
  {
    "condition": "password_length >= 8",
    "action": "allow",
    "parameters": {"min_length": 8}
  },
  {
    "condition": "password_complexity == true",
    "action": "allow",
    "parameters": {"require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_symbols": true}
  },
  {
    "condition": "password_history_check == true",
    "action": "deny",
    "parameters": {"history_count": 5}
  }
]'::jsonb, true),

('session_policy', 'سياسة الجلسات', 'session', '[
  {
    "condition": "session_timeout <= 480",
    "action": "allow",
    "parameters": {"timeout_minutes": 480}
  },
  {
    "condition": "concurrent_sessions > 3",
    "action": "warn",
    "parameters": {"max_sessions": 3}
  },
  {
    "condition": "suspicious_login == true",
    "action": "require_approval",
    "parameters": {"factors": ["location", "device", "time"]}
  }
]'::jsonb, true),

('data_access_policy', 'سياسة الوصول للبيانات', 'data_access', '[
  {
    "condition": "sensitive_data_access == true",
    "action": "log",
    "parameters": {"log_level": "high", "notify_admin": true}
  },
  {
    "condition": "bulk_export > 1000",
    "action": "require_approval",
    "parameters": {"threshold": 1000}
  }
]'::jsonb, true)

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  rules = EXCLUDED.rules,
  updated_at = now();

-- Create view for user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  p.id as permission_id,
  p.resource,
  p.action,
  p.scope,
  p.description,
  p.conditions as permission_conditions,
  rp.conditions as role_conditions,
  ur.is_active,
  ur.department_id as user_department_id,
  ur.expires_at,
  r.level as role_level,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.is_active = true
  AND (ur.expires_at IS NULL OR ur.expires_at > now());

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Departments - admins can manage, managers can view their department
CREATE POLICY "Admins can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can view their department" ON departments
  FOR SELECT USING (
    id IN (
      SELECT department_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Roles - admins can manage, others can view
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can view roles" ON roles
  FOR SELECT USING (true);

-- Permissions - admins can manage, others can view
CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can view permissions" ON permissions
  FOR SELECT USING (true);

-- Role permissions - admins can manage
CREATE POLICY "Admins can manage role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- User roles - admins and managers can manage
CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Managers can manage department user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name = 'manager'
      AND ur.department_id = department_id
    )
  );

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Security policies - admins only
CREATE POLICY "Admins can manage security policies" ON security_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Audit logs - admins can view all, users can view their own
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can view their audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Session logs - users can view their own sessions
CREATE POLICY "Users can view their session logs" ON session_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all session logs" ON session_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true 
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Trusted devices - users can manage their own
CREATE POLICY "Users can manage their trusted devices" ON trusted_devices
  FOR ALL USING (user_id = auth.uid());

-- Create triggers for updating timestamps
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_policies_updated_at BEFORE UPDATE ON security_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create stored functions

-- Function to assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_role_to_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Get the default 'employee' role
  SELECT id INTO default_role_id
  FROM roles 
  WHERE name = 'employee' 
  LIMIT 1;
  
  -- Assign the role if found
  IF default_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, is_active)
    VALUES (NEW.user_id, default_role_id, NEW.user_id, now(), true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to assign default role
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role_to_user();

-- Function to check user permission
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_scope TEXT DEFAULT 'global',
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_permissions_view
    WHERE user_id = p_user_id
      AND resource = p_resource
      AND action = p_action
      AND (scope = p_scope OR scope = 'global')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

-- Function to get user effective permissions
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE (
  resource TEXT,
  action TEXT,
  scope TEXT,
  role_name TEXT,
  role_level INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    upv.resource,
    upv.action,
    upv.scope,
    upv.role_name,
    upv.role_level
  FROM user_permissions_view upv
  WHERE upv.user_id = p_user_id
    AND upv.is_active = true
    AND (upv.expires_at IS NULL OR upv.expires_at > now())
  ORDER BY upv.role_level DESC, upv.resource, upv.action;
END;
$$;

-- Function to clean up expired roles
CREATE OR REPLACE FUNCTION cleanup_expired_roles()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE user_roles 
  SET is_active = false, updated_at = now()
  WHERE expires_at IS NOT NULL 
    AND expires_at <= now() 
    AND is_active = true;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_risk_score INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource,
    new_values,
    risk_score,
    status,
    timestamp
  ) VALUES (
    p_user_id,
    p_event_type,
    'security',
    p_details,
    p_risk_score,
    'success',
    now()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create scheduled job functions (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-roles', '0 0 * * *', 'SELECT cleanup_expired_roles();');

-- Grant permissions to authenticated users
GRANT SELECT ON departments TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON security_policies TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT SELECT ON session_logs TO authenticated;
GRANT ALL ON trusted_devices TO authenticated;
GRANT SELECT ON user_permissions_view TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_effective_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(UUID, TEXT, JSONB, INTEGER) TO authenticated;

-- Insert default role permissions for system roles
DO $$
DECLARE
  super_admin_role_id UUID;
  admin_role_id UUID;
  manager_role_id UUID;
  employee_role_id UUID;
  perm_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO manager_role_id FROM roles WHERE name = 'manager';
  SELECT id INTO employee_role_id FROM roles WHERE name = 'employee';
  
  -- Super admin gets all permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT super_admin_role_id, id
  FROM permissions
  ON CONFLICT DO NOTHING;
  
  -- Admin gets most permissions except some super admin only ones
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_role_id, id
  FROM permissions
  WHERE NOT (resource = 'roles' AND action = 'delete' AND scope = 'global')
  ON CONFLICT DO NOTHING;
  
  -- Manager gets department-level permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT manager_role_id, id
  FROM permissions
  WHERE scope IN ('department', 'own') 
     OR (resource = 'expenses' AND action IN ('approve', 'reject') AND scope = 'department')
     OR (resource = 'reports' AND scope = 'department')
  ON CONFLICT DO NOTHING;
  
  -- Employee gets basic permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT employee_role_id, id
  FROM permissions
  WHERE scope = 'own'
     OR (resource = 'departments' AND action = 'read')
     OR (resource = 'roles' AND action = 'read')
  ON CONFLICT DO NOTHING;
END;
$$;