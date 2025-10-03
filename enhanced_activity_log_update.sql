-- Enhanced Activity Log System Update Script
-- تحديث نظام سجل الأنشطة المهمة مع تتبع الموقع الجغرافي المحسن

-- إضافة أعمدة جديدة لدعم الموقع الجغرافي المحسن
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC,
ADD COLUMN IF NOT EXISTS location_provider VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- إضافة أعمدة لتتبع أفضل للمعلومات التقنية
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS os_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS screen_resolution VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- إنشاء فهارس محسنة للبحث السريع في الأنشطة المهمة
CREATE INDEX IF NOT EXISTS idx_activity_log_important_types 
ON public.activity_log(type) 
WHERE type IN ('login', 'logout', 'visit', 'clinic_register', 'order', 'debt_payment', 'expense_request', 'plan');

-- فهرس للأنشطة التي تحتوي على معلومات موقع
CREATE INDEX IF NOT EXISTS idx_activity_log_with_location 
ON public.activity_log(lat, lng) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- فهرس للبحث بالتاريخ والنوع معاً
CREATE INDEX IF NOT EXISTS idx_activity_log_date_type 
ON public.activity_log(timestamp DESC, type);

-- فهرس للبحث بالمستخدم والنوع
CREATE INDEX IF NOT EXISTS idx_activity_log_user_type 
ON public.activity_log(user_id, type);

-- إنشاء view للأنشطة المهمة فقط
CREATE OR REPLACE VIEW public.important_activities AS
SELECT 
    *,
    CASE 
        WHEN lat IS NOT NULL AND lng IS NOT NULL THEN true
        ELSE false
    END as has_location,
    CASE 
        WHEN type = 'login' THEN 'تسجيل دخول'
        WHEN type = 'logout' THEN 'تسجيل خروج'
        WHEN type = 'visit' THEN 'عمل زيارة'
        WHEN type = 'clinic_register' THEN 'إضافة عيادة'
        WHEN type = 'order' THEN 'عمل طلبية'
        WHEN type = 'debt_payment' THEN 'دفع دين على عيادة'
        WHEN type = 'expense_request' THEN 'طلب مصاريف'
        WHEN type = 'plan' THEN 'عمل خطة'
        ELSE type
    END as type_display_name
FROM public.activity_log
WHERE type IN ('login', 'logout', 'visit', 'clinic_register', 'order', 'debt_payment', 'expense_request', 'plan');

-- دالة للحصول على إحصائيات الأنشطة المهمة
CREATE OR REPLACE FUNCTION public.get_important_activities_stats(
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL,
    user_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_activities BIGINT,
    successful_activities BIGINT,
    failed_activities BIGINT,
    activities_with_location BIGINT,
    login_activities BIGINT,
    visit_activities BIGINT,
    order_activities BIGINT,
    clinic_activities BIGINT,
    payment_activities BIGINT,
    expense_activities BIGINT,
    plan_activities BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE is_success IS NOT FALSE) as successful_activities,
        COUNT(*) FILTER (WHERE is_success = FALSE) as failed_activities,
        COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) as activities_with_location,
        COUNT(*) FILTER (WHERE type IN ('login', 'logout')) as login_activities,
        COUNT(*) FILTER (WHERE type = 'visit') as visit_activities,
        COUNT(*) FILTER (WHERE type = 'order') as order_activities,
        COUNT(*) FILTER (WHERE type = 'clinic_register') as clinic_activities,
        COUNT(*) FILTER (WHERE type = 'debt_payment') as payment_activities,
        COUNT(*) FILTER (WHERE type = 'expense_request') as expense_activities,
        COUNT(*) FILTER (WHERE type = 'plan') as plan_activities
    FROM public.important_activities
    WHERE 
        (start_date IS NULL OR timestamp >= start_date) AND
        (end_date IS NULL OR timestamp <= end_date) AND
        (user_filter IS NULL OR user_id = user_filter);
END;
$$ LANGUAGE plpgsql;

-- دالة لتنظيف الأنشطة القديمة (الاحتفاظ بالمهمة فقط)
CREATE OR REPLACE FUNCTION public.cleanup_old_activities(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- حذف الأنشطة القديمة غير المهمة
    DELETE FROM public.activity_log 
    WHERE 
        timestamp < (NOW() - INTERVAL '1 day' * days_to_keep)
        AND type NOT IN ('login', 'logout', 'visit', 'clinic_register', 'order', 'debt_payment', 'expense_request', 'plan');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- تسجيل عملية التنظيف
    INSERT INTO public.activity_log (
        user_id, action, entity_type, entity_id, title, details, type, timestamp, created_at
    ) VALUES (
        'system', 'cleanup_old_activities', 'system', 'maintenance', 
        'تنظيف الأنشطة القديمة', 
        'تم حذف ' || deleted_count || ' نشاط قديم غير مهم',
        'other', NOW(), NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION public.update_activity_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activity_log_timestamp ON public.activity_log;
CREATE TRIGGER trigger_update_activity_log_timestamp
    BEFORE UPDATE ON public.activity_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_activity_log_timestamp();

-- إضافة تعليقات على الجدول والأعمدة الجديدة
COMMENT ON TABLE public.activity_log IS 'سجل الأنشطة المهمة في النظام مع تتبع الموقع الجغرافي';
COMMENT ON COLUMN public.activity_log.location_accuracy IS 'دقة الموقع بالأمتار';
COMMENT ON COLUMN public.activity_log.location_provider IS 'مصدر الموقع: gps, network, passive';
COMMENT ON COLUMN public.activity_log.full_address IS 'العنوان الكامل للموقع';
COMMENT ON COLUMN public.activity_log.postal_code IS 'الرمز البريدي';
COMMENT ON COLUMN public.activity_log.region IS 'المنطقة أو المحافظة';
COMMENT ON COLUMN public.activity_log.browser_version IS 'إصدار المتصفح';
COMMENT ON COLUMN public.activity_log.os_version IS 'إصدار نظام التشغيل';
COMMENT ON COLUMN public.activity_log.screen_resolution IS 'دقة الشاشة';
COMMENT ON COLUMN public.activity_log.timezone IS 'المنطقة الزمنية للمستخدم';

-- إنشاء صلاحيات للـ views والـ functions الجديدة
GRANT SELECT ON public.important_activities TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_important_activities_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_activities TO authenticated;

-- إضافة Row Level Security للـ view الجديد
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- سياسة للمستخدمين العاديين - يمكنهم رؤية أنشطتهم فقط
CREATE POLICY user_own_activities ON public.activity_log
    FOR SELECT USING (
        auth.uid()::text = user_id OR
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

-- سياسة للإدراج - يمكن للمستخدمين إدراج أنشطتهم
CREATE POLICY user_insert_activities ON public.activity_log
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id OR
        user_id = 'system'
    );

-- إنشاء مؤشرات أداء للنشاطات المهمة
CREATE OR REPLACE VIEW public.activity_performance_metrics AS
SELECT 
    type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_success IS NOT FALSE) as success_count,
    COUNT(*) FILTER (WHERE is_success = FALSE) as failure_count,
    ROUND(
        (COUNT(*) FILTER (WHERE is_success IS NOT FALSE)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as success_rate,
    COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) as with_location_count,
    AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
    DATE_TRUNC('day', timestamp) as activity_date
FROM public.important_activities
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY type, DATE_TRUNC('day', timestamp)
ORDER BY activity_date DESC, type;

GRANT SELECT ON public.activity_performance_metrics TO authenticated;

-- إنشاء فهرس لتحسين أداء البحث الجغرافي
CREATE INDEX IF NOT EXISTS idx_activity_log_location_spatial 
ON public.activity_log USING GIST (
    ll_to_earth(lat, lng)
) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- دالة للبحث عن الأنشطة في منطقة جغرافية معينة
CREATE OR REPLACE FUNCTION public.get_activities_in_radius(
    center_lat DECIMAL,
    center_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10,
    activity_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    type TEXT,
    user_id TEXT,
    timestamp TIMESTAMP,
    lat DECIMAL,
    lng DECIMAL,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.type,
        a.user_id,
        a.timestamp,
        a.lat,
        a.lng,
        ROUND(
            (earth_distance(
                ll_to_earth(center_lat, center_lng),
                ll_to_earth(a.lat, a.lng)
            ) / 1000)::NUMERIC, 
            2
        ) as distance_km
    FROM public.important_activities a
    WHERE 
        a.lat IS NOT NULL 
        AND a.lng IS NOT NULL
        AND earth_distance(
            ll_to_earth(center_lat, center_lng),
            ll_to_earth(a.lat, a.lng)
        ) <= (radius_km * 1000)
        AND (activity_types IS NULL OR a.type = ANY(activity_types))
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_activities_in_radius TO authenticated;

-- تسجيل تطبيق التحديث
INSERT INTO public.activity_log (
    user_id, action, entity_type, entity_id, title, details, type, timestamp, created_at
) VALUES (
    'system', 'database_update', 'system', 'enhanced_activity_log', 
    'تحديث قاعدة البيانات للأنشطة المهمة', 
    'تم تطبيق التحديثات لدعم الأنشطة المحدودة والموقع الجغرافي المحسن',
    'other', NOW(), NOW()
);

-- عرض ملخص التحديثات
SELECT 
    'تم تطبيق تحديثات قاعدة البيانات للأنشطة المهمة بنجاح!' as status,
    COUNT(*) as total_important_activities
FROM public.important_activities;