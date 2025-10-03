-- ================================================
-- إنشاء Indexes لتحسين الأداء
-- CREATE DATABASE INDEXES FOR PERFORMANCE
-- ================================================

-- ==========================================
-- PART 1: Indexes على جدول clinics
-- ==========================================

-- Index على area و line (للفلترة السريعة)
CREATE INDEX IF NOT EXISTS idx_clinics_area_line 
ON clinics(area, line);

-- Index على name (للبحث السريع)
CREATE INDEX IF NOT EXISTS idx_clinics_name 
ON clinics(name);

-- Index على registered_at (للترتيب حسب التاريخ)
CREATE INDEX IF NOT EXISTS idx_clinics_registered_at 
ON clinics(registered_at DESC);

-- Index على status (للفلترة حسب الحالة)
CREATE INDEX IF NOT EXISTS idx_clinics_status 
ON clinics(status)
WHERE status IS NOT NULL;

-- ==========================================
-- PART 2: Indexes على جدول users
-- ==========================================

-- Index على email (للبحث السريع)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Index على username (للبحث السريع)
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

-- Index على role (للفلترة حسب الدور)
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- Index على area و line (للفلترة السريعة)
CREATE INDEX IF NOT EXISTS idx_users_area_line 
ON users(area, line);

-- Index على is_active (للفلترة حسب النشاط)
CREATE INDEX IF NOT EXISTS idx_users_is_active 
ON users(is_active)
WHERE is_active = true;

-- ==========================================
-- PART 3: Indexes على جدول activity_log
-- ==========================================

-- Index على user_id و timestamp (للبحث السريع)
CREATE INDEX IF NOT EXISTS idx_activity_user_time 
ON activity_log(user_id, timestamp DESC);

-- Index على type و timestamp (للفلترة حسب النوع)
CREATE INDEX IF NOT EXISTS idx_activity_type_time 
ON activity_log(type, timestamp DESC);

-- Index على timestamp فقط (للترتيب)
CREATE INDEX IF NOT EXISTS idx_activity_timestamp 
ON activity_log(timestamp DESC);

-- ==========================================
-- PART 4: Indexes على جدول visits
-- ==========================================

-- Index على clinic_id (للبحث حسب العيادة)
CREATE INDEX IF NOT EXISTS idx_visits_clinic 
ON visits(clinic_id);

-- Index على user_id (للبحث حسب المستخدم)
CREATE INDEX IF NOT EXISTS idx_visits_user 
ON visits(user_id);

-- Index على visit_date (للترتيب حسب التاريخ)
CREATE INDEX IF NOT EXISTS idx_visits_date 
ON visits(visit_date DESC);

-- Index مركب على clinic_id و visit_date
CREATE INDEX IF NOT EXISTS idx_visits_clinic_date 
ON visits(clinic_id, visit_date DESC);

-- ==========================================
-- PART 5: Indexes على جدول orders
-- ==========================================

-- Index على clinic_id
CREATE INDEX IF NOT EXISTS idx_orders_clinic 
ON orders(clinic_id);

-- Index على user_id
CREATE INDEX IF NOT EXISTS idx_orders_user 
ON orders(user_id);

-- Index على order_date
CREATE INDEX IF NOT EXISTS idx_orders_date 
ON orders(order_date DESC);

-- Index على status
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- ==========================================
-- PART 6: التحقق من الـ Indexes
-- ==========================================

-- عرض جميع الـ Indexes التي تم إنشاؤها
SELECT 
    '📊 Indexes على جدول ' || tablename as info,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('clinics', 'users', 'activity_log', 'visits', 'orders')
ORDER BY tablename, indexname;

-- ==========================================
-- PART 7: رسالة نجاح
-- ==========================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '✅ تم إنشاء جميع الـ Indexes بنجاح!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 فوائد الـ Indexes:';
    RAISE NOTICE '   - تسريع استعلامات البحث بنسبة 50-90%%';
    RAISE NOTICE '   - تحسين أداء الفلترة والترتيب';
    RAISE NOTICE '   - تقليل وقت الاستجابة للـ API';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ملاحظة:';
    RAISE NOTICE '   - Indexes تأخذ مساحة إضافية في قاعدة البيانات';
    RAISE NOTICE '   - قد تبطئ عمليات INSERT/UPDATE قليلاً';
    RAISE NOTICE '   - لكن الفائدة في SELECT تفوق العيوب';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 الخطوة التالية:';
    RAISE NOTICE '   أعد تشغيل التطبيق واختبر السرعة!';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;
