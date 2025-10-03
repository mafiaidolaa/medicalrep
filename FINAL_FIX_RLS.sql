-- ================================================
-- الحل النهائي الشامل لمشكلة RLS والعيادات
-- FINAL COMPREHENSIVE RLS FIX
-- ================================================

-- المشاكل المحددة:
-- 1. Admin لا يرى أي عيادات
-- 2. العيادات الجديدة تختفي بعد Refresh
-- 3. auth.uid() لا يتطابق مع user IDs

-- الحل: استخدام email بدلاً من ID للمطابقة

-- ==========================================
-- PART 1: التشخيص - فهم المشكلة
-- ==========================================

-- 1. فحص auth.uid() vs users.id
SELECT 
    '🔍 فحص المطابقة بين auth.uid() و users.id:' as info;

SELECT 
    auth.uid() as current_auth_uid,
    (SELECT id FROM users WHERE email = auth.email()) as user_id_from_email,
    auth.email() as current_email;

-- 2. عرض جميع العيادات في DB (بغض النظر عن RLS)
SELECT 
    '📋 جميع العيادات في قاعدة البيانات (بدون RLS):' as info;

-- تعطيل RLS مؤقتاً لعرض كل شيء
SET session_replication_role = replica;

SELECT 
    id,
    name,
    doctor_name,
    area,
    line,
    TO_CHAR(registered_at, 'YYYY-MM-DD HH24:MI:SS') as registered
FROM clinics
ORDER BY registered_at DESC;

-- إعادة تفعيل RLS
SET session_replication_role = DEFAULT;

-- 3. عرض المستخدمين وطريقة المصادقة
SELECT 
    '👥 المستخدمون وطريقة المصادقة:' as info;

SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.role,
    u.area,
    u.line,
    u.is_active,
    CASE 
        WHEN a.id IS NOT NULL THEN '✅ له حساب Auth'
        ELSE '❌ ليس له حساب Auth'
    END as has_auth_account
FROM users u
LEFT JOIN auth.users a ON a.email = u.email
ORDER BY u.role, u.username;

-- ==========================================
-- PART 2: الحل - إعادة بناء RLS بالكامل
-- ==========================================

-- خطوة 1: حذف جميع السياسات القديمة
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Clinics
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'clinics' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinics', pol.policyname);
    END LOOP;
    
    -- Orders
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
    END LOOP;
    
    -- Visits
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'visits' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.visits', pol.policyname);
    END LOOP;
    
    -- Collections
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'collections' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.collections', pol.policyname);
    END LOOP;
    
    -- Expenses
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'expenses' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.expenses', pol.policyname);
    END LOOP;
    
    RAISE NOTICE '✅ تم حذف جميع السياسات القديمة';
END $$;

-- خطوة 2: إنشاء دالة helper للحصول على user من email
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE email = auth.email()
    AND is_active = true
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'none');
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_area()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_area TEXT;
BEGIN
    SELECT area INTO user_area
    FROM users
    WHERE email = auth.email()
    AND is_active = true
    LIMIT 1;
    
    RETURN COALESCE(user_area, '');
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_line()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_line TEXT;
BEGIN
    SELECT line INTO user_line
    FROM users
    WHERE email = auth.email()
    AND is_active = true
    LIMIT 1;
    
    RETURN COALESCE(user_line, '');
END;
$$;

-- خطوة 3: السياسات الجديدة باستخدام email-based matching

-- ===============================
-- جدول CLINICS
-- ===============================

-- SELECT: Admin/GM/Accountant يرون الكل
CREATE POLICY "clinics_select_admin"
ON public.clinics
FOR SELECT
TO authenticated
USING (
    get_current_user_role() IN ('admin', 'gm', 'accountant')
);

-- SELECT: Users يرون منطقتهم/خطهم
CREATE POLICY "clinics_select_user"
ON public.clinics
FOR SELECT
TO authenticated
USING (
    get_current_user_role() NOT IN ('admin', 'gm', 'accountant')
    AND area = get_current_user_area()
    AND line = get_current_user_line()
);

-- INSERT: Admin/GM في أي مكان
CREATE POLICY "clinics_insert_admin"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() IN ('admin', 'gm')
);

-- INSERT: Users في منطقتهم/خطهم
CREATE POLICY "clinics_insert_user"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() NOT IN ('admin', 'gm')
    AND area = get_current_user_area()
    AND line = get_current_user_line()
);

-- UPDATE: Admin/GM كل شيء
CREATE POLICY "clinics_update_admin"
ON public.clinics
FOR UPDATE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'))
WITH CHECK (get_current_user_role() IN ('admin', 'gm'));

-- UPDATE: Users منطقتهم/خطهم
CREATE POLICY "clinics_update_user"
ON public.clinics
FOR UPDATE
TO authenticated
USING (
    get_current_user_role() NOT IN ('admin', 'gm')
    AND area = get_current_user_area()
    AND line = get_current_user_line()
)
WITH CHECK (
    get_current_user_role() NOT IN ('admin', 'gm')
    AND area = get_current_user_area()
    AND line = get_current_user_line()
);

-- DELETE: Admin/GM فقط
CREATE POLICY "clinics_delete_admin"
ON public.clinics
FOR DELETE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

-- ===============================
-- جدول ORDERS - نفس المنطق
-- ===============================

CREATE POLICY "orders_select_admin"
ON public.orders FOR SELECT TO authenticated
USING (get_current_user_role() IN ('admin', 'gm', 'accountant'));

CREATE POLICY "orders_insert_all"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (auth.email() IS NOT NULL);

CREATE POLICY "orders_update_admin"
ON public.orders FOR UPDATE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

CREATE POLICY "orders_delete_admin"
ON public.orders FOR DELETE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

-- ===============================
-- جدول VISITS - نفس المنطق
-- ===============================

CREATE POLICY "visits_select_admin"
ON public.visits FOR SELECT TO authenticated
USING (get_current_user_role() IN ('admin', 'gm', 'accountant'));

CREATE POLICY "visits_insert_all"
ON public.visits FOR INSERT TO authenticated
WITH CHECK (auth.email() IS NOT NULL);

CREATE POLICY "visits_update_admin"
ON public.visits FOR UPDATE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

CREATE POLICY "visits_delete_admin"
ON public.visits FOR DELETE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

-- ===============================
-- جدول COLLECTIONS - نفس المنطق
-- ===============================

CREATE POLICY "collections_select_admin"
ON public.collections FOR SELECT TO authenticated
USING (get_current_user_role() IN ('admin', 'gm', 'accountant'));

CREATE POLICY "collections_insert_all"
ON public.collections FOR INSERT TO authenticated
WITH CHECK (auth.email() IS NOT NULL);

CREATE POLICY "collections_update_admin"
ON public.collections FOR UPDATE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm', 'accountant'));

CREATE POLICY "collections_delete_admin"
ON public.collections FOR DELETE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

-- ===============================
-- جدول EXPENSES - نفس المنطق
-- ===============================

CREATE POLICY "expenses_select_admin"
ON public.expenses FOR SELECT TO authenticated
USING (get_current_user_role() IN ('admin', 'gm', 'accountant'));

CREATE POLICY "expenses_insert_all"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.email() IS NOT NULL);

CREATE POLICY "expenses_update_admin"
ON public.expenses FOR UPDATE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm', 'accountant'));

CREATE POLICY "expenses_delete_admin"
ON public.expenses FOR DELETE TO authenticated
USING (get_current_user_role() IN ('admin', 'gm'));

-- ==========================================
-- PART 3: التحقق من الإصلاح
-- ==========================================

-- اختبار الدوال الجديدة
SELECT 
    '🧪 اختبار الدوال الجديدة:' as info;

SELECT 
    auth.email() as current_email,
    get_current_user_role() as role,
    get_current_user_area() as area,
    get_current_user_line() as line;

-- عرض السياسات الجديدة
SELECT 
    '✅ السياسات الجديدة لـ Clinics:' as info;

SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY cmd, policyname;

-- إحصائيات
DO $$ 
DECLARE
    clinic_count INTEGER;
    policy_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO clinic_count FROM clinics;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'clinics';
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' AND is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ============================================='  ;
    RAISE NOTICE '✅ الإصلاح النهائي اكتمل!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الإحصائيات:';
    RAISE NOTICE '   - عدد العيادات: %', clinic_count;
    RAISE NOTICE '   - عدد السياسات: %', policy_count;
    RAISE NOTICE '   - عدد Admins: %', admin_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 الحل المستخدم:';
    RAISE NOTICE '   استخدام EMAIL بدلاً من ID للمطابقة';
    RAISE NOTICE '   دوال Helper: get_current_user_role/area/line()';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 الخطوات التالية:';
    RAISE NOTICE '   1. أعد تشغيل التطبيق';
    RAISE NOTICE '   2. امسح cache المتصفح (Ctrl+Shift+Delete)';
    RAISE NOTICE '   3. سجل دخول كـ Admin';
    RAISE NOTICE '   4. يجب أن ترى جميع العيادات!';
    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
END $$;
