-- إنشاء نظام إدارة الثيمات والمظهر
-- Themes Management System Database Schema

-- إنشاء جدول للثيمات المحفوظة
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',
    is_default BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false, -- ثيمات النظام لا يمكن حذفها
    is_active BOOLEAN DEFAULT false,
    preview_image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(name)
);

-- إنشاء جدول لإعدادات الثيمات
CREATE TABLE IF NOT EXISTS theme_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'colors', 'typography', 'layout', 'components'
    setting_key VARCHAR(200) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'color', 'number', 'boolean', 'json'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(theme_id, category, setting_key)
);

-- إنشاء جدول للألوان المحفوظة
CREATE TABLE IF NOT EXISTS color_palettes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    colors JSONB NOT NULL, -- مصفوفة الألوان
    is_system BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- إنشاء جدول لإعدادات التخصيص الشخصي
CREATE TABLE IF NOT EXISTS user_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id),
    custom_settings JSONB DEFAULT '{}', -- إعدادات مخصصة للمستخدم
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- مستخدم واحد = تخصيص واحد
);

-- إدراج الثيمات الافتراضية
INSERT INTO themes (name, display_name, description, is_default, is_system, is_active) VALUES
('default-light', 'الوضع النهاري الافتراضي', 'الثيم الافتراضي بألوان فاتحة ومريحة للعين', true, true, true),
('default-dark', 'الوضع الليلي الافتراضي', 'ثيم داكن مريح للعين في الإضاءة المنخفضة', false, true, false),
('modern-blue', 'أزرق عصري', 'ثيم أزرق أنيق ومعاصر للأعمال', false, true, false),
('warm-earth', 'الأرض الدافئة', 'ألوان أرضية دافئة ومريحة', false, true, false),
('professional-gray', 'رمادي مهني', 'ثيم رمادي كلاسيكي للبيئة المهنية', false, true, false),
('vibrant-purple', 'بنفسجي نابض', 'ثيم بنفسجي حيوي وجذاب', false, true, false)
ON CONFLICT (name) DO NOTHING;

-- إدراج إعدادات الثيم الافتراضي (النهاري)
INSERT INTO theme_settings (theme_id, category, setting_key, setting_value, setting_type, description) 
SELECT 
    t.id,
    category,
    setting_key,
    setting_value,
    setting_type,
    description
FROM themes t, (VALUES
    -- ألوان أساسية
    ('colors', 'primary', '#3b82f6', 'color', 'اللون الأساسي للواجهة'),
    ('colors', 'secondary', '#64748b', 'color', 'اللون الثانوي'),
    ('colors', 'accent', '#06b6d4', 'color', 'لون التمييز'),
    ('colors', 'background', '#ffffff', 'color', 'لون الخلفية الرئيسي'),
    ('colors', 'foreground', '#0f172a', 'color', 'لون النص الرئيسي'),
    ('colors', 'muted', '#f1f5f9', 'color', 'لون الخلفية المكتومة'),
    ('colors', 'muted_foreground', '#64748b', 'color', 'لون النص المكتوم'),
    ('colors', 'border', '#e2e8f0', 'color', 'لون الحدود'),
    ('colors', 'input', '#ffffff', 'color', 'لون خلفية الإدخال'),
    ('colors', 'ring', '#3b82f6', 'color', 'لون التركيز'),
    
    -- ألوان الحالة
    ('colors', 'success', '#10b981', 'color', 'لون النجاح'),
    ('colors', 'warning', '#f59e0b', 'color', 'لون التحذير'),
    ('colors', 'error', '#ef4444', 'color', 'لون الخطأ'),
    ('colors', 'info', '#3b82f6', 'color', 'لون المعلومات'),
    
    -- الخطوط
    ('typography', 'font_family_sans', 'Inter, ui-sans-serif, system-ui', 'string', 'خط البيانات الأساسي'),
    ('typography', 'font_family_serif', 'ui-serif, Georgia', 'string', 'خط البيانات المقوس'),
    ('typography', 'font_family_mono', 'ui-monospace, SFMono-Regular', 'string', 'خط البيانات أحادي المسافة'),
    ('typography', 'font_size_base', '16px', 'string', 'حجم الخط الأساسي'),
    ('typography', 'font_size_sm', '14px', 'string', 'حجم الخط الصغير'),
    ('typography', 'font_size_lg', '18px', 'string', 'حجم الخط الكبير'),
    ('typography', 'font_size_xl', '20px', 'string', 'حجم الخط الكبير جداً'),
    ('typography', 'line_height_base', '1.5', 'number', 'ارتفاع السطر الأساسي'),
    ('typography', 'letter_spacing', '0', 'string', 'تباعد الأحرف'),
    
    -- التخطيط
    ('layout', 'border_radius', '0.375rem', 'string', 'نصف قطر الحدود'),
    ('layout', 'border_radius_sm', '0.125rem', 'string', 'نصف قطر الحدود الصغير'),
    ('layout', 'border_radius_lg', '0.5rem', 'string', 'نصف قطر الحدود الكبير'),
    ('layout', 'spacing_unit', '1rem', 'string', 'وحدة التباعد الأساسية'),
    ('layout', 'container_max_width', '1200px', 'string', 'أقصى عرض للحاوية'),
    ('layout', 'sidebar_width', '280px', 'string', 'عرض الشريط الجانبي'),
    ('layout', 'header_height', '64px', 'string', 'ارتفاع الرأس'),
    
    -- المكونات
    ('components', 'button_height', '40px', 'string', 'ارتفاع الأزرار'),
    ('components', 'input_height', '40px', 'string', 'ارتفاع حقول الإدخال'),
    ('components', 'card_padding', '1.5rem', 'string', 'حشو البطاقات'),
    ('components', 'shadow_sm', '0 1px 2px 0 rgb(0 0 0 / 0.05)', 'string', 'ظل صغير'),
    ('components', 'shadow_md', '0 4px 6px -1px rgb(0 0 0 / 0.1)', 'string', 'ظل متوسط'),
    ('components', 'shadow_lg', '0 10px 15px -3px rgb(0 0 0 / 0.1)', 'string', 'ظل كبير'),
    
    -- إعدادات متقدمة
    ('advanced', 'animation_duration', '150ms', 'string', 'مدة الرسوم المتحركة'),
    ('advanced', 'transition_timing', 'cubic-bezier(0.4, 0, 0.2, 1)', 'string', 'توقيت الانتقالات'),
    ('advanced', 'enable_animations', 'true', 'boolean', 'تفعيل الرسوم المتحركة'),
    ('advanced', 'enable_shadows', 'true', 'boolean', 'تفعيل الظلال'),
    ('advanced', 'enable_blur_effects', 'true', 'boolean', 'تفعيل تأثيرات الضبابية')
) AS settings(category, setting_key, setting_value, setting_type, description)
WHERE t.name = 'default-light';

-- إدراج إعدادات الثيم المظلم
INSERT INTO theme_settings (theme_id, category, setting_key, setting_value, setting_type, description) 
SELECT 
    t.id,
    category,
    setting_key,
    setting_value,
    setting_type,
    description
FROM themes t, (VALUES
    -- ألوان أساسية للوضع المظلم
    ('colors', 'primary', '#60a5fa', 'color', 'اللون الأساسي للواجهة'),
    ('colors', 'secondary', '#94a3b8', 'color', 'اللون الثانوي'),
    ('colors', 'accent', '#22d3ee', 'color', 'لون التمييز'),
    ('colors', 'background', '#0f172a', 'color', 'لون الخلفية الرئيسي'),
    ('colors', 'foreground', '#f8fafc', 'color', 'لون النص الرئيسي'),
    ('colors', 'muted', '#1e293b', 'color', 'لون الخلفية المكتومة'),
    ('colors', 'muted_foreground', '#94a3b8', 'color', 'لون النص المكتوم'),
    ('colors', 'border', '#334155', 'color', 'لون الحدود'),
    ('colors', 'input', '#1e293b', 'color', 'لون خلفية الإدخال'),
    ('colors', 'ring', '#60a5fa', 'color', 'لون التركيز'),
    
    -- ألوان الحالة للوضع المظلم
    ('colors', 'success', '#34d399', 'color', 'لون النجاح'),
    ('colors', 'warning', '#fbbf24', 'color', 'لون التحذير'),
    ('colors', 'error', '#f87171', 'color', 'لون الخطأ'),
    ('colors', 'info', '#60a5fa', 'color', 'لون المعلومات')
) AS settings(category, setting_key, setting_value, setting_type, description)
WHERE t.name = 'default-dark';

-- إدراج باليتات الألوان المحفوظة
INSERT INTO color_palettes (name, description, colors, is_system) VALUES
('modern-blue', 'باليت أزرق عصري', '["#3b82f6", "#1e40af", "#60a5fa", "#93c5fd", "#dbeafe"]', true),
('warm-orange', 'باليت برتقالي دافئ', '["#ea580c", "#c2410c", "#fb923c", "#fdba74", "#fed7aa"]', true),
('fresh-green', 'باليت أخضر منعش', '["#059669", "#047857", "#34d399", "#6ee7b7", "#a7f3d0"]', true),
('elegant-purple', 'باليت بنفسجي أنيق', '["#7c3aed", "#5b21b6", "#a78bfa", "#c4b5fd", "#e9d5ff"]', true),
('neutral-gray', 'باليت رمادي محايد', '["#4b5563", "#374151", "#6b7280", "#9ca3af", "#d1d5db"]', true),
('vibrant-pink', 'باليت وردي نابض', '["#db2777", "#be185d", "#f472b6", "#f9a8d4", "#fce7f3"]', true)
ON CONFLICT DO NOTHING;

-- إدراج إعدادات افتراضية في system_settings
INSERT INTO system_settings (category, setting_key, setting_value, description) VALUES
('themes', 'allow_custom_themes', '{"enabled": true}', 'السماح للمستخدمين بإنشاء ثيمات مخصصة'),
('themes', 'max_custom_themes_per_user', '{"limit": 10}', 'الحد الأقصى للثيمات المخصصة لكل مستخدم'),
('themes', 'enable_theme_sharing', '{"enabled": false}', 'تفعيل مشاركة الثيمات بين المستخدمين'),
('themes', 'auto_dark_mode', '{"enabled": true, "schedule": "system"}', 'التبديل التلقائي للوضع المظلم'),
('themes', 'theme_cache_duration', '{"hours": 24}', 'مدة تخزين الثيمات في الذاكرة المؤقتة'),
('themes', 'enable_theme_animations', '{"enabled": true}', 'تفعيل رسوم متحركة عند تغيير الثيمات')
ON CONFLICT (category, setting_key) DO NOTHING;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_themes_active ON themes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_themes_system ON themes(is_system);
CREATE INDEX IF NOT EXISTS idx_theme_settings_theme_category ON theme_settings(theme_id, category);
CREATE INDEX IF NOT EXISTS idx_user_customizations_user ON user_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_color_palettes_system ON color_palettes(is_system);

-- إضافة triggers لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER themes_updated_at
    BEFORE UPDATE ON themes
    FOR EACH ROW
    EXECUTE FUNCTION update_themes_updated_at();

CREATE TRIGGER theme_settings_updated_at
    BEFORE UPDATE ON theme_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_themes_updated_at();

CREATE TRIGGER color_palettes_updated_at
    BEFORE UPDATE ON color_palettes
    FOR EACH ROW
    EXECUTE FUNCTION update_themes_updated_at();

CREATE TRIGGER user_customizations_updated_at
    BEFORE UPDATE ON user_customizations
    FOR EACH ROW
    EXECUTE FUNCTION update_themes_updated_at();

-- دوال مساعدة لإدارة الثيمات

-- دالة لتفعيل ثيم معين للمستخدم
CREATE OR REPLACE FUNCTION activate_theme_for_user(
    p_user_id UUID,
    p_theme_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- إدراج أو تحديث تخصيص المستخدم
    INSERT INTO user_customizations (user_id, theme_id, is_active)
    VALUES (p_user_id, p_theme_id, true)
    ON CONFLICT (user_id)
    DO UPDATE SET 
        theme_id = EXCLUDED.theme_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على ثيم المستخدم النشط
CREATE OR REPLACE FUNCTION get_active_user_theme(p_user_id UUID)
RETURNS TABLE (
    theme_id UUID,
    theme_name VARCHAR,
    theme_display_name VARCHAR,
    custom_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uc.theme_id, default_theme.id) as theme_id,
        COALESCE(t.name, default_theme.name) as theme_name,
        COALESCE(t.display_name, default_theme.display_name) as theme_display_name,
        COALESCE(uc.custom_settings, '{}'::JSONB) as custom_settings
    FROM (
        SELECT id, name, display_name 
        FROM themes 
        WHERE is_default = true 
        LIMIT 1
    ) default_theme
    LEFT JOIN user_customizations uc ON uc.user_id = p_user_id AND uc.is_active = true
    LEFT JOIN themes t ON t.id = uc.theme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء ثيم مخصص
CREATE OR REPLACE FUNCTION create_custom_theme(
    p_name VARCHAR,
    p_display_name VARCHAR,
    p_description TEXT,
    p_settings JSONB,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_theme_id UUID;
    setting_record RECORD;
BEGIN
    -- إنشاء الثيم الجديد
    INSERT INTO themes (name, display_name, description, is_default, is_system, created_by)
    VALUES (p_name, p_display_name, p_description, false, false, p_user_id)
    RETURNING id INTO new_theme_id;
    
    -- إضافة الإعدادات
    FOR setting_record IN 
        SELECT * FROM jsonb_each_text(p_settings)
    LOOP
        INSERT INTO theme_settings (theme_id, category, setting_key, setting_value, setting_type)
        VALUES (
            new_theme_id, 
            split_part(setting_record.key, '.', 1), -- استخراج التصنيف
            split_part(setting_record.key, '.', 2), -- استخراج المفتاح
            setting_record.value,
            CASE 
                WHEN setting_record.value ~ '^#[0-9A-Fa-f]{6}$' THEN 'color'
                WHEN setting_record.value ~ '^[0-9]+(\.[0-9]+)?$' THEN 'number'
                WHEN setting_record.value IN ('true', 'false') THEN 'boolean'
                ELSE 'string'
            END
        );
    END LOOP;
    
    RETURN new_theme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات المناسبة
GRANT SELECT ON themes TO authenticated;
GRANT SELECT ON theme_settings TO authenticated;
GRANT SELECT ON color_palettes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_customizations TO authenticated;
GRANT EXECUTE ON FUNCTION activate_theme_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_user_theme TO authenticated;
GRANT EXECUTE ON FUNCTION create_custom_theme TO authenticated;

-- تعليقات وثائقية
COMMENT ON TABLE themes IS 'الثيمات المتاحة في النظام';
COMMENT ON TABLE theme_settings IS 'إعدادات تفصيلية لكل ثيم (ألوان، خطوط، تخطيط)';
COMMENT ON TABLE color_palettes IS 'باليتات الألوان المحفوظة للاستخدام السريع';
COMMENT ON TABLE user_customizations IS 'تخصيصات المستخدمين الشخصية للثيمات';

COMMENT ON COLUMN theme_settings.setting_value IS 'قيمة الإعداد (نص، لون، رقم، إلخ)';
COMMENT ON COLUMN color_palettes.colors IS 'مصفوفة الألوان بصيغة JSON';
COMMENT ON COLUMN user_customizations.custom_settings IS 'إعدادات مخصصة إضافية للمستخدم (JSON)';