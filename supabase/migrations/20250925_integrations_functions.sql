-- دوال SQL إضافية لنظام التكاملات
-- Additional SQL functions for integrations system

-- دالة لتحديث معداد استخدام بيانات الاعتماد
CREATE OR REPLACE FUNCTION increment_credential_usage(
    p_service_id UUID,
    p_credential_type TEXT,
    p_is_production BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE integration_credentials 
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE 
        service_id = p_service_id 
        AND credential_type = p_credential_type 
        AND is_production = p_is_production;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء تقرير حالة التكاملات
CREATE OR REPLACE FUNCTION get_integrations_health_report()
RETURNS TABLE (
    service_name TEXT,
    provider_name TEXT,
    status TEXT,
    last_check TIMESTAMP WITH TIME ZONE,
    avg_response_time NUMERIC,
    success_rate NUMERIC,
    error_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.display_name::TEXT,
        si.provider_name::TEXT,
        si.status::TEXT,
        MAX(im.checked_at) as last_check,
        ROUND(AVG(im.response_time_ms), 2) as avg_response_time,
        ROUND(AVG(im.success_rate), 2) as success_rate,
        SUM(im.error_count) as error_count
    FROM service_integrations si
    LEFT JOIN integration_monitoring im ON si.id = im.service_id
    WHERE si.is_enabled = true
    GROUP BY si.id, si.display_name, si.provider_name, si.status
    ORDER BY si.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتنظيف سجلات المراقبة القديمة
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    retention_days INTEGER;
BEGIN
    -- الحصول على مدة الاحتفاظ من الإعدادات
    SELECT COALESCE((setting_value->>'days')::INTEGER, 30) INTO retention_days
    FROM system_settings 
    WHERE category = 'integrations' 
      AND setting_key = 'log_retention_days';
    
    -- حذف السجلات القديمة
    DELETE FROM integration_monitoring 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- تسجيل العملية
    INSERT INTO integration_monitoring (
        service_id, 
        check_type, 
        status, 
        details,
        checked_at
    )
    SELECT 
        si.id,
        'maintenance',
        'healthy',
        jsonb_build_object(
            'action', 'cleanup',
            'deleted_records', deleted_count,
            'retention_days', retention_days
        ),
        NOW()
    FROM service_integrations si 
    WHERE si.service_key = 'system_maintenance'
    LIMIT 1;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على إحصائيات الاستخدام لخدمة معينة
CREATE OR REPLACE FUNCTION get_service_usage_stats(
    p_service_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    avg_response_time NUMERIC,
    peak_usage_hour INTEGER,
    last_success TIMESTAMP WITH TIME ZONE,
    last_failure TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE im.status = 'healthy') as successful_requests,
        COUNT(*) FILTER (WHERE im.status IN ('critical', 'error')) as failed_requests,
        ROUND(AVG(im.response_time_ms), 2) as avg_response_time,
        EXTRACT(HOUR FROM im.checked_at)::INTEGER as peak_usage_hour,
        MAX(im.checked_at) FILTER (WHERE im.status = 'healthy') as last_success,
        MAX(im.checked_at) FILTER (WHERE im.status IN ('critical', 'error')) as last_failure
    FROM integration_monitoring im
    WHERE 
        im.service_id = p_service_id
        AND im.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY EXTRACT(HOUR FROM im.checked_at)
    ORDER BY total_requests DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء تنبيهات تلقائية للتكاملات المعطلة
CREATE OR REPLACE FUNCTION check_integrations_health()
RETURNS VOID AS $$
DECLARE
    unhealthy_service RECORD;
    alert_settings JSONB;
BEGIN
    -- الحصول على إعدادات التنبيهات
    SELECT setting_value INTO alert_settings
    FROM system_settings 
    WHERE category = 'integrations' 
      AND setting_key = 'monitoring_enabled';
    
    -- التحقق فقط إذا كانت المراقبة مفعلة
    IF alert_settings->>'enabled' = 'true' THEN
        -- البحث عن خدمات غير سليمة
        FOR unhealthy_service IN
            SELECT 
                si.id,
                si.display_name,
                si.provider_name,
                si.status,
                COUNT(im.*) as error_count,
                MAX(im.checked_at) as last_check
            FROM service_integrations si
            LEFT JOIN integration_monitoring im ON si.id = im.service_id 
                AND im.status IN ('critical', 'error')
                AND im.created_at >= NOW() - INTERVAL '1 hour'
            WHERE si.is_enabled = true
            GROUP BY si.id, si.display_name, si.provider_name, si.status
            HAVING COUNT(im.*) > 3 -- أكثر من 3 أخطاء في الساعة الأخيرة
        LOOP
            -- تسجيل تنبيه
            INSERT INTO integration_monitoring (
                service_id, 
                check_type, 
                status, 
                details,
                checked_at
            ) VALUES (
                unhealthy_service.id,
                'alert',
                'critical',
                jsonb_build_object(
                    'alert_type', 'high_error_rate',
                    'service_name', unhealthy_service.display_name,
                    'error_count', unhealthy_service.error_count,
                    'time_window', '1 hour'
                ),
                NOW()
            );
            
            -- يمكن إضافة إرسال إشعارات هنا (SMS, Email, etc.)
            
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتشفير البيانات الحساسة (بديل بسيط)
CREATE OR REPLACE FUNCTION simple_encrypt(
    p_plaintext TEXT,
    p_key TEXT DEFAULT 'ep_group_integration_key_2025'
)
RETURNS TEXT AS $$
BEGIN
    -- تشفير بسيط باستخدام pgcrypto (يجب تفعيل الإضافة)
    -- هذا مثال أساسي، في الإنتاج يفضل استخدام تشفير أقوى
    RETURN encode(
        encrypt(
            p_plaintext::bytea, 
            p_key::bytea, 
            'aes'
        ), 
        'base64'
    );
EXCEPTION WHEN OTHERS THEN
    -- في حالة عدم توفر pgcrypto، إرجاع النص كما هو (للاختبار فقط)
    RETURN p_plaintext;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لفك تشفير البيانات
CREATE OR REPLACE FUNCTION simple_decrypt(
    p_ciphertext TEXT,
    p_key TEXT DEFAULT 'ep_group_integration_key_2025'
)
RETURNS TEXT AS $$
BEGIN
    RETURN decrypt(
        decode(p_ciphertext, 'base64'), 
        p_key::bytea, 
        'aes'
    )::TEXT;
EXCEPTION WHEN OTHERS THEN
    -- في حالة عدم توفر pgcrypto، إرجاع النص كما هو
    RETURN p_ciphertext;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- جدولة تنظيف السجلات القديمة (يومياً)
-- سيتم تفعيل هذا بواسطة cron job خارجي أو من التطبيق

-- إضافة فهارس إضافية لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_integration_monitoring_status_time 
ON integration_monitoring(status, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_service_type 
ON integration_credentials(service_id, credential_type);

-- إضافة constraint للتأكد من صحة البيانات
ALTER TABLE integration_credentials 
ADD CONSTRAINT check_credential_type 
CHECK (credential_type IN ('api_key', 'secret_key', 'access_token', 'webhook_url', 'config'));

ALTER TABLE integration_monitoring 
ADD CONSTRAINT check_monitoring_status 
CHECK (status IN ('healthy', 'warning', 'critical', 'unknown'));

ALTER TABLE service_integrations 
ADD CONSTRAINT check_service_status 
CHECK (status IN ('active', 'inactive', 'testing', 'error'));

-- تعليقات على الجداول والحقول للوثائق
COMMENT ON TABLE integration_categories IS 'تصنيفات خدمات التكامل (الدفع، الخرائط، الإشعارات، إلخ)';
COMMENT ON TABLE service_integrations IS 'خدمات التكامل المتاحة مع تفاصيلها ومتطلباتها';
COMMENT ON TABLE integration_credentials IS 'بيانات الاعتماد المشفرة لكل خدمة تكامل';
COMMENT ON TABLE integration_settings IS 'إعدادات إضافية قابلة للتخصيص لكل خدمة';
COMMENT ON TABLE integration_monitoring IS 'سجلات مراقبة حالة وأداء التكاملات';

COMMENT ON COLUMN integration_credentials.encrypted_value IS 'القيمة المشفرة لبيانات الاعتماد (JSON)';
COMMENT ON COLUMN integration_monitoring.details IS 'تفاصيل إضافية عن فحص التكامل (JSON)';
COMMENT ON COLUMN service_integrations.features IS 'قائمة بالمميزات المتاحة (JSON Array)';
COMMENT ON COLUMN service_integrations.supported_regions IS 'المناطق المدعومة (JSON Array)';

-- إنشاء views مفيدة
CREATE OR REPLACE VIEW active_integrations AS
SELECT 
    si.*,
    ic.display_name as category_name,
    ic.color as category_color,
    (
        SELECT COUNT(*) 
        FROM integration_credentials cred 
        WHERE cred.service_id = si.id
    ) as credentials_count,
    (
        SELECT im.status 
        FROM integration_monitoring im 
        WHERE im.service_id = si.id 
        ORDER BY im.checked_at DESC 
        LIMIT 1
    ) as last_health_status
FROM service_integrations si
JOIN integration_categories ic ON si.category_id = ic.id
WHERE si.is_enabled = true;

COMMENT ON VIEW active_integrations IS 'عرض مبسط للتكاملات النشطة مع معلومات إضافية مفيدة';

-- منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION increment_credential_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_integrations_health_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_usage_stats TO authenticated;
GRANT SELECT ON active_integrations TO authenticated;