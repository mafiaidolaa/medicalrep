-- ================================================
-- إعداد نظام الصور الكامل
-- COMPLETE AVATAR SYSTEM SETUP
-- ================================================

-- ==========================================
-- PART 1: إضافة عمود avatar_url إلى جدول users
-- ==========================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_avatar_url 
ON users(avatar_url)
WHERE avatar_url IS NOT NULL;

SELECT 'تم إضافة عمود avatar_url إلى جدول users ✅' as status;

-- ==========================================
-- PART 2: إنشاء Storage Bucket (يجب أن يتم يدوياً)
-- ==========================================

-- ملاحظة: يجب إنشاء bucket في Supabase Dashboard
-- اسم الـ bucket: user-avatars
-- اجعله Public ✅

SELECT 'يجب إنشاء bucket "user-avatars" في Supabase Dashboard' as note;

-- ==========================================
-- PART 3: RLS Policies على Storage
-- ==========================================

-- السماح لأي شخص برؤية الصور (Public Read)
CREATE POLICY IF NOT EXISTS "Public read access on avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-avatars');

-- السماح للمستخدمين المسجلين برفع صور
CREATE POLICY IF NOT EXISTS "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

-- السماح للمستخدمين بتحديث صورهم
CREATE POLICY IF NOT EXISTS "Users can update their avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');

-- السماح بحذف الصور
CREATE POLICY IF NOT EXISTS "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

SELECT 'تم إنشاء RLS policies على Storage ✅' as status;

-- ==========================================
-- PART 4: التحقق من الإعداد
-- ==========================================

-- التحقق من عمود avatar_url
SELECT 
    'جدول users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'avatar_url';

-- التحقق من Storage Policies
SELECT 
    'Storage Policies' as info,
    policyname,
    tablename
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- ==========================================
-- PART 5: إحصائيات
-- ==========================================

DO $$ 
DECLARE
    users_count INTEGER;
    users_with_avatar INTEGER;
    users_without_avatar INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO users_with_avatar FROM users WHERE avatar_url IS NOT NULL;
    users_without_avatar := users_count - users_with_avatar;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '✅ إعداد نظام الصور اكتمل!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الإحصائيات:';
    RAISE NOTICE '   - إجمالي المستخدمين: %', users_count;
    RAISE NOTICE '   - لديهم صور: %', users_with_avatar;
    RAISE NOTICE '   - بدون صور: %', users_without_avatar;
    RAISE NOTICE '';
    RAISE NOTICE '📋 الخطوات المتبقية:';
    RAISE NOTICE '   1. تأكد من إنشاء bucket "user-avatars" في Supabase';
    RAISE NOTICE '   2. اجعل الـ bucket Public';
    RAISE NOTICE '   3. أضف Components في التطبيق';
    RAISE NOTICE '   4. اختبر رفع الصور';
    RAISE NOTICE '';
    RAISE NOTICE '📂 الملفات المطلوبة:';
    RAISE NOTICE '   - src/components/ui/user-avatar.tsx';
    RAISE NOTICE '   - src/components/ui/image-upload.tsx';
    RAISE NOTICE '   - src/app/api/upload/avatar/route.ts';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;
