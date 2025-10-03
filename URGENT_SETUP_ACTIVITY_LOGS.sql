-- 🚨 URGENT: تطبيق نظام تسجيل الأنشطة فوراً
-- انسخ هذا الكود بالكامل وشغله في Supabase SQL Editor

-- ✅ إنشاء فيو activity_logs للتوافق مع الكود
DROP VIEW IF EXISTS public.activity_logs;
CREATE VIEW public.activity_logs AS 
SELECT * FROM public.activity_log;

-- ✅ إضافة عمود للصفحات المزارة
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS page_path TEXT;

-- ✅ إضافة صلاحيات شاملة
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO anon;
GRANT ALL ON public.activity_log TO authenticated;  
GRANT ALL ON public.activity_log TO anon;

-- ✅ تأكيد أن جميع الأعمدة المطلوبة موجودة
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'unknown';
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS is_success BOOLEAN DEFAULT TRUE;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS real_ip INET;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS lat DECIMAL(10,8);
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS lng DECIMAL(11,8);
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS browser_version TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS attempted_username TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS attempted_password_hash TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ✅ إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_is_success ON activity_log(is_success);
CREATE INDEX IF NOT EXISTS idx_activity_log_ip ON activity_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- ✅ إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_activity_log_updated_at ON activity_log;
CREATE TRIGGER update_activity_log_updated_at
    BEFORE UPDATE ON activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ✅ جعل user_id قابل للقيمة الفارغة للعمليات النظام
ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;

-- ✅ إدخال بيانات تجريبية للاختبار الفوري
INSERT INTO public.activity_log (
    type, title, user_id, action, entity_type, entity_id, 
    details, timestamp, created_at, updated_at, is_success,
    ip_address, device, browser, os
) VALUES 
(
    'system_init', 
    'تم تهيئة نظام تسجيل الأنشطة', 
    NULL, 
    'system_init', 
    'system', 
    'activity_logger',
    'تم تفعيل نظام تسجيل الأنشطة بنجاح - جاهز للعمل',
    NOW(), 
    NOW(), 
    NOW(), 
    true,
    '127.0.0.1',
    'System',
    'System',
    'Server'
) ON CONFLICT DO NOTHING;

-- ✅ التحقق من نجاح الإعداد
SELECT 
    'نظام تسجيل الأنشطة جاهز للعمل! ✅' as status,
    COUNT(*) as total_records 
FROM public.activity_logs;

-- ✅ عرض آخر الأنشطة المُسجلة
SELECT 
    type,
    title,
    timestamp,
    user_id,
    details,
    is_success
FROM public.activity_logs 
ORDER BY timestamp DESC 
LIMIT 5;