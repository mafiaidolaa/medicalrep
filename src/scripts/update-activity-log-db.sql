-- تحديث قاعدة البيانات لنظام تتبع الأنشطة المتطور
-- EP Group System - Activity Log Database Update

-- إضافة حقول الموقع الجغرافي
ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_accuracy INTEGER,
ADD COLUMN IF NOT EXISTS location_source VARCHAR(50);

-- إضافة حقول تقنية متقدمة
ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS real_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS os VARCHAR(100),
ADD COLUMN IF NOT EXISTS device VARCHAR(50),
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_location ON activity_log(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_ip ON activity_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_log_success ON activity_log(is_success);

-- إنشاء مشاهدة (View) محسنة لسهولة الاستعلام
CREATE OR REPLACE VIEW activity_log_with_user_details AS
SELECT 
    al.*,
    u.full_name as user_name,
    u.username as user_username,
    u.role as user_role,
    u.email as user_email,
    CASE 
        WHEN al.lat IS NOT NULL AND al.lng IS NOT NULL THEN true 
        ELSE false 
    END as has_location,
    CASE 
        WHEN al.risk_score >= 70 THEN 'high'
        WHEN al.risk_score >= 40 THEN 'medium'
        ELSE 'low'
    END as risk_level
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.timestamp DESC;

-- إنشاء مشاهدة للإحصائيات
CREATE OR REPLACE VIEW activity_log_stats AS
SELECT 
    DATE(timestamp) as activity_date,
    type as activity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_success = true THEN 1 END) as success_count,
    COUNT(CASE WHEN is_success = false THEN 1 END) as failure_count,
    COUNT(CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 1 END) as with_location_count,
    AVG(risk_score) as avg_risk_score,
    COUNT(DISTINCT user_id) as unique_users
FROM activity_log
GROUP BY DATE(timestamp), type
ORDER BY activity_date DESC, activity_type;

-- إنشاء مشاهدة للأنشطة المهمة فقط
CREATE OR REPLACE VIEW important_activities AS
SELECT *
FROM activity_log_with_user_details
WHERE type IN ('login', 'logout', 'visit', 'clinic_register', 'order', 'debt_payment', 'expense_request', 'plan')
ORDER BY timestamp DESC;

-- إنشاء دالة لحساب المسافة بين نقطتين GPS
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    -- استخدام صيغة Haversine لحساب المسافة بالكيلومتر
    RETURN 6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
    ));
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لتنظيف السجلات القديمة (اختياري)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(keep_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- حذف السجلات الأقل أهمية التي تزيد عن المدة المحددة
    DELETE FROM activity_log 
    WHERE timestamp < NOW() - INTERVAL '1 day' * keep_days
    AND type NOT IN ('login', 'logout', 'clinic_register', 'failed_login')
    AND risk_score < 50;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لحساب مخاطر تلقائي (اختياري)
CREATE OR REPLACE FUNCTION calculate_risk_score()
RETURNS TRIGGER AS $$
BEGIN
    -- حساب مخاطر بسيط بناءً على عوامل مختلفة
    NEW.risk_score := 0;
    
    -- زيادة المخاطر للأنشطة الفاشلة
    IF NEW.is_success = false THEN
        NEW.risk_score := NEW.risk_score + 30;
    END IF;
    
    -- زيادة المخاطر للأنشطة من IPs غير معتادة
    IF NEW.ip_address != '127.0.0.1' AND NEW.ip_address NOT LIKE '192.168.%' AND NEW.ip_address NOT LIKE '10.%' THEN
        NEW.risk_score := NEW.risk_score + 10;
    END IF;
    
    -- زيادة المخاطر للأنشطة بدون موقع GPS
    IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
        NEW.risk_score := NEW.risk_score + 5;
    END IF;
    
    -- تحديد أقصى قيمة 100
    IF NEW.risk_score > 100 THEN
        NEW.risk_score := 100;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS calculate_risk_trigger ON activity_log;
CREATE TRIGGER calculate_risk_trigger
    BEFORE INSERT ON activity_log
    FOR EACH ROW
    EXECUTE FUNCTION calculate_risk_score();

-- إدراج بيانات تجريبية (اختياري - فقط للاختبار)
/*
INSERT INTO activity_log (
    type, title, details, user_id, timestamp, action, entity_type, is_success,
    lat, lng, location_name, city, country, location_source,
    ip_address, real_ip, user_agent, device, browser, os, risk_score
) VALUES 
(
    'login',
    'تسجيل دخول تجريبي',
    'تم تسجيل الدخول بنجاح من المتصفح',
    '12345678-1234-1234-1234-123456789012',
    NOW(),
    'login',
    'session',
    true,
    24.7136,
    46.6753,
    'الرياض، المملكة العربية السعودية',
    'الرياض',
    'المملكة العربية السعودية',
    'GPS',
    '192.168.1.100',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Desktop',
    'Chrome',
    'Windows',
    5
);
*/

-- تعليقات الصيانة
COMMENT ON TABLE activity_log IS 'جدول سجل الأنشطة المحدث مع دعم المواقع الجغرافية';
COMMENT ON COLUMN activity_log.lat IS 'خط العرض GPS';
COMMENT ON COLUMN activity_log.lng IS 'خط الطول GPS';
COMMENT ON COLUMN activity_log.location_name IS 'اسم الموقع الصديق للمستخدم';
COMMENT ON COLUMN activity_log.location_accuracy IS 'دقة الموقع بالمتر';
COMMENT ON COLUMN activity_log.location_source IS 'مصدر بيانات الموقع (GPS/Network/IP)';
COMMENT ON COLUMN activity_log.risk_score IS 'درجة المخاطر (0-100)';

-- إنهاء السكريبت
COMMIT;