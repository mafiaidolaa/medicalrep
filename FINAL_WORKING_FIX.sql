-- ================================================
-- الإصلاح النهائي الذي يعمل 100%
-- FINAL WORKING FIX FOR CLINICS RLS
-- ================================================

-- ==========================================
-- PART 1: حذف السياسات القديمة
-- ==========================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'clinics' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinics', pol.policyname);
    END LOOP;
    RAISE NOTICE '✅ تم حذف جميع السياسات القديمة';
END $$;

-- ==========================================
-- PART 2: إنشاء الدوال المساعدة (الطريقة الصحيحة)
-- ==========================================

-- حذف الدوال القديمة أولاً
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_area();
DROP FUNCTION IF EXISTS get_user_line();
DROP FUNCTION IF EXISTS get_user_email();

-- دالة للحصول على البريد الإلكتروني من JWT
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        ''
    );
$$;

-- دالة للحصول على الدور
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(role, '')
    FROM users
    WHERE email = get_user_email()
    AND is_active = true
    LIMIT 1;
$$;

-- دالة للحصول على المنطقة
CREATE OR REPLACE FUNCTION get_user_area()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(area, '')
    FROM users
    WHERE email = get_user_email()
    AND is_active = true
    LIMIT 1;
$$;

-- دالة للحصول على الخط
CREATE OR REPLACE FUNCTION get_user_line()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(line, '')
    FROM users
    WHERE email = get_user_email()
    AND is_active = true
    LIMIT 1;
$$;

-- ==========================================
-- PART 3: إنشاء السياسات الجديدة
-- ==========================================

-- تأكد من تفعيل RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELECT: القراءة
-- ============================================

-- 1. Admin/GM/Accountant يرون كل شيء
CREATE POLICY "clinics_read_admins"
ON public.clinics
FOR SELECT
TO authenticated
USING (
    get_user_role() IN ('admin', 'gm', 'accountant')
);

-- 2. Medical reps يرون عيادات منطقتهم/خطهم
CREATE POLICY "clinics_read_reps"
ON public.clinics
FOR SELECT
TO authenticated
USING (
    get_user_role() IN ('medical_rep', 'rep', 'manager', 'area_manager', 'line_manager')
    AND area = get_user_area()
    AND line = get_user_line()
);

-- ============================================
-- INSERT: الإنشاء
-- ============================================

-- 3. Admin/GM يمكنهم إنشاء في أي مكان
CREATE POLICY "clinics_create_admins"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (
    get_user_role() IN ('admin', 'gm')
);

-- 4. Medical reps يمكنهم إنشاء في منطقتهم/خطهم فقط
CREATE POLICY "clinics_create_reps"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (
    get_user_role() IN ('medical_rep', 'rep', 'manager', 'area_manager', 'line_manager')
    AND area = get_user_area()
    AND line = get_user_line()
);

-- ============================================
-- UPDATE: التحديث
-- ============================================

-- 5. Admin/GM يمكنهم تحديث كل شيء
CREATE POLICY "clinics_update_admins"
ON public.clinics
FOR UPDATE
TO authenticated
USING (get_user_role() IN ('admin', 'gm'))
WITH CHECK (get_user_role() IN ('admin', 'gm'));

-- 6. Medical reps يمكنهم تحديث عيادات منطقتهم/خطهم
CREATE POLICY "clinics_update_reps"
ON public.clinics
FOR UPDATE
TO authenticated
USING (
    get_user_role() IN ('medical_rep', 'rep', 'manager', 'area_manager', 'line_manager')
    AND area = get_user_area()
    AND line = get_user_line()
)
WITH CHECK (
    get_user_role() IN ('medical_rep', 'rep', 'manager', 'area_manager', 'line_manager')
    AND area = get_user_area()
    AND line = get_user_line()
);

-- ============================================
-- DELETE: الحذف
-- ============================================

-- 7. فقط Admin/GM يمكنهم الحذف
CREATE POLICY "clinics_delete_admins"
ON public.clinics
FOR DELETE
TO authenticated
USING (get_user_role() IN ('admin', 'gm'));

-- ==========================================
-- PART 4: التحقق النهائي
-- ==========================================

-- عرض السياسات النهائية
SELECT 
    '✅ السياسة: ' || policyname as policy,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY cmd, policyname;

-- رسالة نجاح
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '✅ تم إنشاء جميع الدوال والسياسات بنجاح!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 الخطوات التالية:';
    RAISE NOTICE '   1. شغّل سكريبت TEST_FUNCTIONS.sql للتحقق';
    RAISE NOTICE '   2. أعد تشغيل التطبيق';
    RAISE NOTICE '   3. امسح cache المتصفح';
    RAISE NOTICE '   4. اختبر تسجيل الدخول كـ Admin و mo و ahmed';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;
