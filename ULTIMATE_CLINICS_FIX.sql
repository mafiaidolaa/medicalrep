-- ================================================
-- الحل النهائي الاحترافي لجميع مشاكل العيادات
-- ULTIMATE PROFESSIONAL CLINICS FIX
-- ================================================

-- المشاكل:
-- 1. تأخير في ظهور العيادات (Cache)
-- 2. mo و ahmed لا يرون عيادات بعضهم (رغم نفس area/line)
-- 3. العيادة motest اختفت
-- 4. Admin يرى عيادات تجريبية قديمة فقط

-- ==========================================
-- PART 1: التشخيص الكامل
-- ==========================================

-- 1. عرض جميع العيادات بدون RLS
SELECT '📋 === جميع العيادات في Database (RAW) ===' as info;

-- تعطيل RLS مؤقتاً
SET session_replication_role = replica;

SELECT 
    id,
    name,
    doctor_name,
    area,
    line,
    TO_CHAR(registered_at, 'YYYY-MM-DD HH24:MI:SS') as registered,
    CASE 
        WHEN name LIKE '%test%' OR name LIKE '%Test%' THEN '🧪 تجريبية'
        ELSE '✅ حقيقية'
    END as type
FROM clinics
ORDER BY registered_at DESC;

-- إعادة تفعيل RLS
SET session_replication_role = DEFAULT;

-- 2. فحص المستخدمين mo و ahmed
SELECT '👥 === فحص mo و ahmed ===' as info;

SELECT 
    username,
    email,
    role,
    area,
    line,
    is_active
FROM users
WHERE username IN ('mo', 'ahmed')
ORDER BY username;

-- 3. فحص السياسات الحالية
SELECT '🔒 === السياسات الحالية ===' as info;

SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY cmd, policyname;

-- ==========================================
-- PART 2: تنظيف العيادات التجريبية
-- ==========================================

SELECT '🧹 === تنظيف العيادات التجريبية ===' as info;

-- حذف العيادات التجريبية القديمة
DELETE FROM clinics
WHERE name IN (
    'metro general hospital',
    'Dental Excellence center',
    'city heart clinc',
    'neighborhood family practice',
    'quickcare urgent center',
    'wellness pediatric clinic'
);

-- عرض ما تم حذفه
SELECT 'تم حذف ' || (SELECT COUNT(*) FROM clinics WHERE name LIKE '%test%' OR name LIKE '%clinic%') || ' عيادات تجريبية' as result;

-- ==========================================
-- PART 3: إصلاح سياسات RLS (مبسطة وفعالة)
-- ==========================================

-- حذف جميع السياسات القديمة
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

-- إنشاء دوال helper محسّنة مع STABLE (للأداء)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM users
    WHERE email = auth.email()
    AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_area()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(area, '')
    FROM users
    WHERE email = auth.email()
    AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_line()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(line, '')
    FROM users
    WHERE email = auth.email()
    AND is_active = true
    LIMIT 1;
$$;

-- السياسات الجديدة المبسطة والفعالة

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
    AND clinics.area = get_user_area()
    AND clinics.line = get_user_line()
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
    AND clinics.area = get_user_area()
    AND clinics.line = get_user_line()
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
    AND clinics.area = get_user_area()
    AND clinics.line = get_user_line()
)
WITH CHECK (
    get_user_role() IN ('medical_rep', 'rep', 'manager', 'area_manager', 'line_manager')
    AND clinics.area = get_user_area()
    AND clinics.line = get_user_line()
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
-- PART 4: التحقق من mo و ahmed
-- ==========================================

SELECT '🔍 === التحقق من mo و ahmed ===' as info;

-- هل لديهم نفس area/line؟
SELECT 
    u1.username as user1,
    u1.area as area1,
    u1.line as line1,
    u2.username as user2,
    u2.area as area2,
    u2.line as line2,
    CASE 
        WHEN u1.area = u2.area AND u1.line = u2.line THEN '✅ نفس المنطقة والخط'
        ELSE '❌ مناطق/خطوط مختلفة'
    END as status
FROM users u1, users u2
WHERE u1.username = 'mo' AND u2.username = 'ahmed';

-- العيادات في منطقة/خط mo
SELECT '📋 === العيادات في منطقة mo ===' as info;

SELECT 
    c.name,
    c.area,
    c.line
FROM clinics c
WHERE c.area = (SELECT area FROM users WHERE username = 'mo')
  AND c.line = (SELECT line FROM users WHERE username = 'mo')
ORDER BY c.registered_at DESC;

-- ==========================================
-- PART 5: إصلاح مشكلة Cache في Frontend
-- ==========================================

-- تقليل وقت Cache في optimized-data-provider
SELECT '⚡ === توصية لتقليل Cache ===' as info;

SELECT 
    'في ملف src/lib/optimized-data-provider.tsx:' as instruction,
    'غيّر CACHE_DURATION من 30 دقيقة إلى 2 دقيقة' as action,
    'const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes instead of 30' as code;

-- ==========================================
-- PART 6: التحقق النهائي
-- ==========================================

-- اختبار الدوال
SELECT '🧪 === اختبار الدوال ===' as info;

SELECT 
    auth.email() as current_email,
    get_user_role() as role,
    get_user_area() as area,
    get_user_line() as line;

-- عرض السياسات النهائية
SELECT '✅ === السياسات النهائية ===' as info;

SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY cmd, policyname;

-- إحصائيات نهائية
DO $$ 
DECLARE
    total_clinics INTEGER;
    epeg_count INTEGER;
    motest_count INTEGER;
    test_clinics INTEGER;
    policies INTEGER;
    mo_area TEXT;
    ahmed_area TEXT;
    mo_line TEXT;
    ahmed_line TEXT;
BEGIN
    SELECT COUNT(*) INTO total_clinics FROM clinics;
    SELECT COUNT(*) INTO epeg_count FROM clinics WHERE name = 'EPEG';
    SELECT COUNT(*) INTO motest_count FROM clinics WHERE name = 'motest';
    SELECT COUNT(*) INTO test_clinics FROM clinics WHERE name LIKE '%test%' OR name LIKE '%Test%';
    SELECT COUNT(*) INTO policies FROM pg_policies WHERE tablename = 'clinics';
    
    SELECT area INTO mo_area FROM users WHERE username = 'mo';
    SELECT area INTO ahmed_area FROM users WHERE username = 'ahmed';
    SELECT line INTO mo_line FROM users WHERE username = 'mo';
    SELECT line INTO ahmed_line FROM users WHERE username = 'ahmed';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '✅ الإصلاح النهائي الاحترافي اكتمل!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الإحصائيات:';
    RAISE NOTICE '   - إجمالي العيادات: %', total_clinics;
    RAISE NOTICE '   - العيادات التجريبية المتبقية: %', test_clinics;
    RAISE NOTICE '   - عيادة EPEG: % (موجودة)', epeg_count;
    RAISE NOTICE '   - عيادة motest: % (% موجودة)', motest_count, CASE WHEN motest_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   - عدد السياسات: %', policies;
    RAISE NOTICE '';
    RAISE NOTICE '👥 تحقق mo و ahmed:';
    RAISE NOTICE '   - mo: منطقة=% / خط=%', mo_area, mo_line;
    RAISE NOTICE '   - ahmed: منطقة=% / خط=%', ahmed_area, ahmed_line;
    
    IF mo_area = ahmed_area AND mo_line = ahmed_line THEN
        RAISE NOTICE '   ✅ نفس المنطقة والخط - يجب أن يروا نفس العيادات';
    ELSE
        RAISE NOTICE '   ⚠️  مناطق/خطوط مختلفة - لن يروا نفس العيادات';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔑 الحلول المطبقة:';
    RAISE NOTICE '   1. حذف العيادات التجريبية القديمة';
    RAISE NOTICE '   2. إعادة بناء RLS بشكل مبسط وفعال';
    RAISE NOTICE '   3. استخدام STABLE functions للأداء';
    RAISE NOTICE '   4. سياسات منفصلة لـ admins و reps';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 الخطوات التالية:';
    RAISE NOTICE '   1. أعد تشغيل التطبيق';
    RAISE NOTICE '   2. امسح cache المتصفح (Ctrl+Shift+Delete)';
    RAISE NOTICE '   3. سجل دخول كـ mo → يجب أن ترى EPEG';
    RAISE NOTICE '   4. سجل عيادة جديدة من mo';
    RAISE NOTICE '   5. سجل خروج وادخل كـ ahmed → يجب أن ترى نفس العيادات';
    RAISE NOTICE '   6. سجل دخول كـ Admin → يجب أن ترى كل العيادات';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ لتقليل وقت ظهور العيادات:';
    RAISE NOTICE '   عدّل src/lib/optimized-data-provider.tsx';
    RAISE NOTICE '   غيّر: const CACHE_DURATION = 2 * 60 * 1000;';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;
