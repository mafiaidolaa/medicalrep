-- ================================================
-- الحل النهائي: تعطيل RLS لأن النظام لا يستخدم Supabase Auth
-- FINAL SOLUTION: DISABLE RLS
-- ================================================

-- ==========================================
-- PART 1: حذف جميع السياسات
-- ==========================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'clinics' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinics', pol.policyname);
    END LOOP;
    RAISE NOTICE '✅ تم حذف جميع السياسات';
END $$;

-- ==========================================
-- PART 2: حذف جميع الدوال المساعدة
-- ==========================================

DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_area();
DROP FUNCTION IF EXISTS get_user_line();
DROP FUNCTION IF EXISTS get_user_email();

-- ==========================================
-- PART 3: تعطيل RLS على جدول العيادات
-- ==========================================

ALTER TABLE public.clinics DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- PART 4: التحقق من الحالة
-- ==========================================

-- التحقق من أن RLS معطل
SELECT 
    '✅ حالة RLS على جدول clinics' as info,
    relname as table_name,
    CASE 
        WHEN relrowsecurity = false THEN '✅ معطل (DISABLED)'
        ELSE '❌ مفعل (ENABLED)'
    END as rls_status
FROM pg_class
WHERE relname = 'clinics';

-- التحقق من عدم وجود سياسات
SELECT 
    '📋 عدد السياسات المتبقية' as info,
    COUNT(*) as policies_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ لا توجد سياسات'
        ELSE '⚠️ يوجد سياسات متبقية'
    END as status
FROM pg_policies 
WHERE tablename = 'clinics';

-- ==========================================
-- PART 5: رسالة نجاح
-- ==========================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '✅ تم تعطيل RLS بنجاح!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 ملاحظات مهمة:';
    RAISE NOTICE '   1. RLS الآن معطل على جدول clinics';
    RAISE NOTICE '   2. جميع المستخدمين يمكنهم رؤية جميع العيادات من قاعدة البيانات مباشرة';
    RAISE NOTICE '   3. يجب التحكم في الصلاحيات من API Routes';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ تأكد من:';
    RAISE NOTICE '   - استخدام SUPABASE_SERVICE_ROLE_KEY في ملف .env.local';
    RAISE NOTICE '   - API routes تفحص صلاحيات المستخدم قبل إرجاع البيانات';
    RAISE NOTICE '';
    RAISE NOTICE '📋 الخطوات التالية:';
    RAISE NOTICE '   1. تحقق من ملف .env.local';
    RAISE NOTICE '   2. أعد تشغيل التطبيق';
    RAISE NOTICE '   3. اختبر تسجيل الدخول كـ Admin و mo';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;
