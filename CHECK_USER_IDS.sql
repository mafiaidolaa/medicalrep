-- ================================================
-- التحقق من User IDs
-- CHECK USER IDS MATCH
-- ================================================

-- عرض جميع المستخدمين مع IDs
SELECT 
    '👥 المستخدمين في جدول users' as info,
    id,
    username,
    email,
    role,
    area,
    line,
    is_active
FROM users
ORDER BY username;

-- عرض المستخدمين في auth.users (Supabase Auth)
SELECT 
    '🔐 المستخدمين في Supabase Auth' as info,
    id,
    email,
    created_at
FROM auth.users
ORDER BY email;

-- التحقق من التطابق بين الجدولين
SELECT 
    '🔍 التحقق من التطابق' as info,
    u.username,
    u.email as users_email,
    au.email as auth_email,
    u.id as users_id,
    au.id as auth_id,
    CASE 
        WHEN u.id = au.id THEN '✅ متطابق'
        ELSE '❌ غير متطابق'
    END as status
FROM users u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY u.username;

-- رسالة ختامية
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 ملاحظات:';
    RAISE NOTICE '   - إذا كانت IDs غير متطابقة، يجب تحديث جدول users';
    RAISE NOTICE '   - إذا كانت auth.users فارغة، يجب إنشاء المستخدمين في Supabase Auth';
    RAISE NOTICE '';
END $$;
