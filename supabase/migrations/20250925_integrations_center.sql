-- إنشاء جدول التكاملات والخدمات الخارجية
-- Integrations Center Database Schema

-- إنشاء جدول لتجميع التكاملات
CREATE TABLE IF NOT EXISTS integration_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(50) DEFAULT 'bg-blue-500',
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول للخدمات والتكاملات
CREATE TABLE IF NOT EXISTS service_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES integration_categories(id) ON DELETE CASCADE,
    service_key VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    provider_name VARCHAR(255),
    service_type VARCHAR(50) NOT NULL, -- 'payment', 'maps', 'sms', 'email', 'notification', 'analytics', 'storage'
    icon VARCHAR(100),
    status VARCHAR(20) DEFAULT 'inactive', -- 'active', 'inactive', 'testing', 'error'
    is_enabled BOOLEAN DEFAULT false,
    requires_api_key BOOLEAN DEFAULT true,
    requires_secret BOOLEAN DEFAULT false,
    api_endpoint VARCHAR(500),
    documentation_url VARCHAR(500),
    pricing_info TEXT,
    features JSONB DEFAULT '[]',
    supported_regions JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- إنشاء جدول لمفاتيح وإعدادات التكامل (مشفرة)
CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES service_integrations(id) ON DELETE CASCADE,
    credential_type VARCHAR(100) NOT NULL, -- 'api_key', 'secret_key', 'access_token', 'webhook_url', 'config'
    encrypted_value TEXT, -- القيمة المشفرة
    is_production BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(service_id, credential_type, is_production)
);

-- إنشاء جدول لإعدادات التكامل الإضافية
CREATE TABLE IF NOT EXISTS integration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES service_integrations(id) ON DELETE CASCADE,
    setting_key VARCHAR(200) NOT NULL,
    setting_value JSONB,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'array'
    is_required BOOLEAN DEFAULT false,
    description TEXT,
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, setting_key)
);

-- إنشاء جدول لمراقبة حالة وأداء التكاملات
CREATE TABLE IF NOT EXISTS integration_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES service_integrations(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- 'api_health', 'quota_usage', 'rate_limit', 'error_rate'
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical', 'unknown'
    response_time_ms INTEGER,
    success_rate DECIMAL(5,2),
    quota_used INTEGER DEFAULT 0,
    quota_limit INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج البيانات الأساسية للتصنيفات
INSERT INTO integration_categories (name, display_name, description, icon, color, sort_order) VALUES
('payment', 'خدمات الدفع الإلكتروني', 'تكامل مع بوابات الدفع المختلفة مثل فوري وفودافون كاش والتحويل البنكي', 'CreditCard', 'bg-green-500', 1),
('maps', 'الخرائط والمواقع', 'تكامل مع خدمات الخرائط مثل Google Maps وOpenStreetMap', 'Map', 'bg-blue-500', 2),
('notifications', 'الإشعارات والتنبيهات', 'خدمات إرسال الإشعارات عبر SMS، البريد الإلكتروني، وواتساب', 'Bell', 'bg-orange-500', 3),
('storage', 'التخزين السحابي', 'خدمات التخزين السحابي مثل AWS S3, Google Drive', 'Cloud', 'bg-purple-500', 4),
('analytics', 'التحليلات والإحصائيات', 'خدمات التحليل مثل Google Analytics وFacebook Pixel', 'BarChart3', 'bg-indigo-500', 5),
('social', 'وسائل التواصل الاجتماعي', 'تكامل مع منصات التواصل الاجتماعي', 'Share2', 'bg-pink-500', 6),
('backup', 'النسخ الاحتياطية', 'خدمات النسخ الاحتياطي التلقائي', 'Archive', 'bg-gray-500', 7)
ON CONFLICT (name) DO NOTHING;

-- إدراج الخدمات الأساسية
INSERT INTO service_integrations (
    category_id, service_key, display_name, description, provider_name, service_type, 
    icon, requires_api_key, requires_secret, api_endpoint, documentation_url, features, sort_order
) VALUES
-- خدمات الدفع
((SELECT id FROM integration_categories WHERE name = 'payment'), 'fawry', 'فوري للدفع الإلكتروني', 'خدمة الدفع الإلكتروني الأكثر انتشاراً في مصر', 'Fawry', 'payment', 'CreditCard', true, true, 'https://www.fawrystaging.com/ECommerceWeb/Fawry', 'https://developer.fawry.com/', '["payment_gateway", "mobile_wallet", "installments"]', 1),
((SELECT id FROM integration_categories WHERE name = 'payment'), 'vodafone_cash', 'فودافون كاش', 'محفظة فودافون الرقمية للدفع', 'Vodafone Egypt', 'payment', 'Smartphone', true, true, 'https://api-preprod.vodafone.com.eg', 'https://developer.vodafone.com.eg/', '["mobile_wallet", "instant_transfer"]', 2),
((SELECT id FROM integration_categories WHERE name = 'payment'), 'bank_transfer', 'التحويل البنكي', 'خدمة التحويل البنكي المباشر', 'Egyptian Banks', 'payment', 'Building2', true, false, null, null, '["bank_transfer", "instapay"]', 3),

-- خدمات الخرائط
((SELECT id FROM integration_categories WHERE name = 'maps'), 'google_maps', 'خرائط جوجل', 'خدمة الخرائط والتوجيه من Google', 'Google', 'maps', 'Map', true, false, 'https://maps.googleapis.com/maps/api', 'https://developers.google.com/maps', '["maps", "directions", "places", "geocoding"]', 1),
((SELECT id FROM integration_categories WHERE name = 'maps'), 'openstreetmap', 'OpenStreetMap', 'خرائط مفتوحة المصدر مجانية', 'OpenStreetMap', 'maps', 'MapPin', false, false, 'https://nominatim.openstreetmap.org/', 'https://wiki.openstreetmap.org/', '["free_maps", "open_source"]', 2),

-- خدمات الإشعارات
((SELECT id FROM integration_categories WHERE name = 'notifications'), 'sms_gateway', 'بوابة الرسائل النصية', 'إرسال الرسائل النصية للعملاء', 'Local SMS Provider', 'sms', 'MessageSquare', true, true, null, null, '["sms", "bulk_sms", "otp"]', 1),
((SELECT id FROM integration_categories WHERE name = 'notifications'), 'email_service', 'خدمة البريد الإلكتروني', 'إرسال رسائل البريد الإلكتروني', 'SMTP Provider', 'email', 'Mail', true, true, null, null, '["transactional_email", "bulk_email"]', 2),
((SELECT id FROM integration_categories WHERE name = 'notifications'), 'whatsapp_business', 'واتساب للأعمال', 'إرسال رسائل واتساب للعملاء', 'Meta', 'messaging', 'MessageCircle', true, true, 'https://graph.facebook.com/', 'https://developers.facebook.com/docs/whatsapp/', '["whatsapp", "rich_media", "templates"]', 3),

-- خدمات التخزين
((SELECT id FROM integration_categories WHERE name = 'storage'), 'aws_s3', 'Amazon S3', 'خدمة التخزين السحابي من أمازون', 'Amazon Web Services', 'storage', 'Cloud', true, true, 'https://s3.amazonaws.com/', 'https://docs.aws.amazon.com/s3/', '["object_storage", "cdn", "backup"]', 1),
((SELECT id FROM integration_categories WHERE name = 'storage'), 'google_drive', 'جوجل درايف', 'خدمة التخزين السحابي من جوجل', 'Google', 'storage', 'HardDrive', true, true, 'https://www.googleapis.com/drive/v3/', 'https://developers.google.com/drive', '["file_storage", "sharing", "collaboration"]', 2)

ON CONFLICT (service_key) DO NOTHING;

-- إدراج إعدادات افتراضية في جدول system_settings للتكاملات
INSERT INTO system_settings (category, setting_key, setting_value, description) VALUES
('integrations', 'security_encryption_enabled', '{"enabled": true}', 'تفعيل تشفير مفاتيح API والمعلومات الحساسة'),
('integrations', 'api_rate_limiting', '{"enabled": true, "default_limit": 1000, "window_minutes": 60}', 'إعدادات تحديد معدل استخدام API'),
('integrations', 'monitoring_enabled', '{"enabled": true, "check_interval_minutes": 5}', 'تفعيل مراقبة حالة التكاملات'),
('integrations', 'auto_retry_failed_requests', '{"enabled": true, "max_retries": 3, "retry_delay_seconds": 30}', 'إعادة المحاولة التلقائية للطلبات الفاشلة'),
('integrations', 'sandbox_mode', '{"enabled": false}', 'وضع الاختبار للتكاملات (Sandbox)'),
('integrations', 'webhook_timeout_seconds', '{"timeout": 30}', 'مهلة انتظار استجابة Webhooks'),
('integrations', 'log_retention_days', '{"days": 30}', 'مدة الاحتفاظ بسجلات التكاملات')
ON CONFLICT (category, setting_key) DO NOTHING;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_service_integrations_category ON service_integrations(category_id);
CREATE INDEX IF NOT EXISTS idx_service_integrations_status ON service_integrations(status);
CREATE INDEX IF NOT EXISTS idx_service_integrations_type ON service_integrations(service_type);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_service ON integration_credentials(service_id);
CREATE INDEX IF NOT EXISTS idx_integration_settings_service ON integration_settings(service_id);
CREATE INDEX IF NOT EXISTS idx_integration_monitoring_service ON integration_monitoring(service_id);
CREATE INDEX IF NOT EXISTS idx_integration_monitoring_checked_at ON integration_monitoring(checked_at);

-- إضافة triggers لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER integration_categories_updated_at
    BEFORE UPDATE ON integration_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_updated_at();

CREATE TRIGGER service_integrations_updated_at
    BEFORE UPDATE ON service_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_updated_at();

CREATE TRIGGER integration_credentials_updated_at
    BEFORE UPDATE ON integration_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_updated_at();

CREATE TRIGGER integration_settings_updated_at
    BEFORE UPDATE ON integration_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_updated_at();