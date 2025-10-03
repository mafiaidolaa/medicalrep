-- نظام إعدادات شامل لإدارة جميع جوانب النظام
-- System Settings Management for Complete Control

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'maps', 'activity_logging', 'security', 'general', etc.
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(category, setting_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_enabled ON system_settings(is_enabled);

-- Insert default settings
INSERT INTO system_settings (category, setting_key, setting_value, description, is_enabled) VALUES

-- Google Maps Settings
('maps', 'google_maps_enabled', '{"enabled": true}', 'تفعيل/تعطيل خرائط جوجل في النظام', true),
('maps', 'google_maps_api_key', '{"api_key": ""}', 'مفتاح API لخرائط جوجل', true),
('maps', 'maps_default_zoom', '{"zoom": 15}', 'مستوى التكبير الافتراضي للخرائط', true),
('maps', 'maps_default_center', '{"lat": 30.0444, "lng": 31.2357}', 'الموقع المركزي الافتراضي للخرائط (القاهرة)', true),
('maps', 'maps_theme', '{"theme": "roadmap"}', 'نوع عرض الخريطة: roadmap, satellite, hybrid, terrain', true),
('maps', 'location_tracking', '{"enabled": true, "high_accuracy": true}', 'إعدادات تتبع الموقع', true),
('maps', 'location_services', '{"geocoding": true, "reverse_geocoding": true, "distance_calculation": true}', 'خدمات الموقع المتاحة', true),

-- Activity Logging Settings  
('activity_logging', 'system_enabled', '{"enabled": true}', 'تفعيل/تعطيل نظام تسجيل الأنشطة', true),
('activity_logging', 'login_tracking', '{"enabled": true, "track_failed_attempts": true}', 'تسجيل محاولات تسجيل الدخول', true),
('activity_logging', 'location_logging', '{"enabled": true, "require_permission": true}', 'تسجيل مواقع المستخدمين', true),
('activity_logging', 'device_tracking', '{"enabled": true, "detailed_info": true}', 'تسجيل معلومات الأجهزة', true),
('activity_logging', 'business_activities', '{"visits": true, "orders": true, "collections": true, "clinics": true}', 'تسجيل الأنشطة التجارية', true),
('activity_logging', 'security_monitoring', '{"risk_scoring": true, "suspicious_activity_detection": true, "auto_alerts": true}', 'مراقبة الأمان المتقدمة', true),
('activity_logging', 'data_retention', '{"days": 365, "auto_cleanup": true}', 'مدة الاحتفاظ بسجلات الأنشطة', true),

-- Security Settings
('security', 'password_policy', '{"min_length": 8, "require_uppercase": true, "require_numbers": true, "require_symbols": false}', 'سياسة كلمات المرور', true),
('security', 'session_management', '{"timeout_minutes": 480, "max_concurrent_sessions": 3}', 'إدارة الجلسات', true),
('security', 'ip_restrictions', '{"enabled": false, "allowed_ips": [], "blocked_ips": []}', 'قيود عناوين IP', false),
('security', 'two_factor_auth', '{"enabled": false, "required_for_admins": false}', 'المصادقة الثنائية', false),
('security', 'login_attempts', '{"max_attempts": 5, "lockout_duration_minutes": 30}', 'محاولات تسجيل الدخول', true),

-- System General Settings
('general', 'system_name', '{"name": "EP Group System", "version": "2.0.0"}', 'اسم النظام والإصدار', true),
('general', 'company_info', '{"name": "EP Group", "address": "", "phone": "", "email": ""}', 'معلومات الشركة', true),
('general', 'language_settings', '{"default_language": "ar", "supported_languages": ["ar", "en"], "rtl_support": true}', 'إعدادات اللغة', true),
('general', 'theme_settings', '{"default_theme": "light", "allow_user_themes": true, "custom_colors": {}}', 'إعدادات المظهر', true),
('general', 'notification_settings', '{"email_notifications": true, "sms_notifications": false, "push_notifications": true}', 'إعدادات الإشعارات', true),
('general', 'backup_settings', '{"auto_backup": true, "backup_frequency": "daily", "retention_days": 30}', 'إعدادات النسخ الاحتياطي', true),

-- User Management Settings
('users', 'registration_settings', '{"allow_self_registration": false, "email_verification": true, "admin_approval": true}', 'إعدادات تسجيل المستخدمين', true),
('users', 'role_permissions', '{"admin": ["*"], "manager": ["read", "write", "manage_team"], "medical_rep": ["read", "write_own"], "accountant": ["read", "financial"]}', 'صلاحيات الأدوار', true),
('users', 'user_limits', '{"max_users": 1000, "max_medical_reps": 500, "max_managers": 50}', 'حدود المستخدمين', true),

-- Business Settings
('business', 'visit_settings', '{"require_location": true, "require_photo": false, "visit_duration_tracking": true}', 'إعدادات الزيارات', true),
('business', 'order_settings', '{"require_approval": true, "auto_calculate_totals": true, "inventory_tracking": true}', 'إعدادات الطلبات', true),
('business', 'collection_settings', '{"require_receipt": true, "multiple_payment_methods": true, "auto_debt_calculation": true}', 'إعدادات التحصيل', true),
('business', 'clinic_settings', '{"require_verification": true, "auto_assign_reps": true, "classification_system": true}', 'إعدادات العيادات', true),

-- Integration Settings
('integrations', 'external_apis', '{"opencage_api_key": "", "ipinfo_api_key": "", "sms_provider_key": ""}', 'مفاتيح APIs الخارجية', true),
('integrations', 'third_party_services', '{"google_analytics": false, "whatsapp_business": false, "email_provider": "local"}', 'الخدمات الخارجية', true),

-- Performance Settings
('performance', 'caching_settings', '{"redis_enabled": false, "cache_duration_minutes": 60, "auto_cache_clear": true}', 'إعدادات التخزين المؤقت', true),
('performance', 'database_settings', '{"connection_pool_size": 20, "query_timeout_seconds": 30, "auto_vacuum": true}', 'إعدادات قاعدة البيانات', true)

ON CONFLICT (category, setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage system settings
CREATE POLICY "Only admins can view system settings" ON system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update system settings" ON system_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can insert system settings" ON system_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete system settings" ON system_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Create function to get setting value
CREATE OR REPLACE FUNCTION get_system_setting(category_name TEXT, key_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT setting_value INTO result
    FROM system_settings
    WHERE category = category_name 
    AND setting_key = key_name 
    AND is_enabled = true;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Create function to update setting
CREATE OR REPLACE FUNCTION update_system_setting(category_name TEXT, key_name TEXT, new_value JSONB, user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE system_settings 
    SET 
        setting_value = new_value,
        updated_at = NOW(),
        updated_by = COALESCE(user_id, auth.uid()::text::uuid)
    WHERE category = category_name AND setting_key = key_name;
    
    RETURN FOUND;
END;
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();

-- Create helpful views
CREATE OR REPLACE VIEW system_settings_by_category AS
SELECT 
    category,
    setting_key,
    setting_value,
    description,
    is_enabled,
    updated_at
FROM system_settings
ORDER BY category, setting_key;

-- Comments for documentation
COMMENT ON TABLE system_settings IS 'نظام إدارة إعدادات شامل يوفر تحكماً كاملاً في جميع جوانب النظام';
COMMENT ON COLUMN system_settings.category IS 'تصنيف الإعداد: maps, activity_logging, security, etc.';
COMMENT ON COLUMN system_settings.setting_key IS 'مفتاح الإعداد الفريد ضمن التصنيف';
COMMENT ON COLUMN system_settings.setting_value IS 'قيمة الإعداد بصيغة JSON مرنة';
COMMENT ON FUNCTION get_system_setting IS 'دالة للحصول على قيمة إعداد معين';
COMMENT ON FUNCTION update_system_setting IS 'دالة لتحديث قيمة إعداد معين';