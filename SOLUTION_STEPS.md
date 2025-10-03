# 🔧 خطوات حل مشكلة إضافة المستخدمين

## المشكلة الحالية
رسالة خطأ: `"new row violates row-level security policy for table users"`

## ✅ الحل

### الخطوة 1: إعادة تشغيل السيرفر (مهم جداً!)

**لماذا؟** التعديلات على الملفات تحتاج restart كامل للتطبيق

```bash
# أوقف السيرفر الحالي
# اضغط Ctrl+C في terminal

# امسح الكاش
Remove-Item -Recurse -Force .next

# أعد التشغيل
npm run dev
```

### الخطوة 2: اختبر إضافة مستخدم جديد

1. افتح `/users` في المتصفح
2. اضغط "إضافة مستخدم جديد"
3. املأ البيانات:
   - الاسم الكامل: `مستخدم تجريبي`
   - اسم المستخدم: `test_user_new`
   - البريد: `test@example.com`
   - كلمة المرور: `123456`
   - الدور: `مندوب طبي`

4. **افتح Browser Console** (F12)
5. **افتح Terminal** (حيث يعمل Next.js)
6. اضغط "حفظ"

### الخطوة 3: راقب الـ Logs

**في Browser Console يجب أن ترى:**
```
🚀 [CLIENT] Sending POST request to /api/users
📝 [CLIENT] User data: { username: "test_user_new", ... }
📦 [CLIENT] Response status: 201
✅ [CLIENT] User created successfully via API
```

**في Terminal (Next.js) يجب أن ترى:**
```
🚀 POST /api/users - Creating new user
📝 Session: { email: "admin@...", role: "admin" }
👤 User role: admin
📦 Received body: { id: "...", full_name: "...", ... }
🔑 Creating Supabase client with service role
✅ Supabase client created
💾 Inserting user into database...
✅ User created successfully: <user_id>
```

---

## ❌ إذا ظهرت مشاكل

### مشكلة 1: لا يوجد logs في Terminal
**السبب:** الطلب لا يصل للـ API
**الحل:**
- تأكد من Browser Console أن الطلب يرسل
- تحقق من URL: يجب أن يكون `/api/users`
- تأكد من Method: `POST`

### مشكلة 2: `❌ Unauthorized: No session`
**السبب:** لست مسجل دخول أو الجلسة انتهت
**الحل:**
1. سجل خروج
2. سجل دخول مرة أخرى كـ admin
3. جرب مرة أخرى

### مشكلة 3: `❌ Forbidden: User role is not admin/manager`
**السبب:** دورك في النظام ليس admin أو manager
**الحل:**
```sql
-- في Supabase SQL Editor:
UPDATE users 
SET role = 'admin' 
WHERE email = 'your_email@example.com';
```

### مشكلة 4: `❌ Error creating user: new row violates RLS`
**السبب:** Service role key غير صحيح أو غير موجود
**الحل:**
1. افتح `.env.local`
2. تأكد من وجود:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
3. احصل على المفتاح الصحيح من:
   - Supabase Dashboard → Settings → API → `service_role` key
4. انسخه والصقه في `.env.local`
5. **احفظ الملف**
6. **أعد تشغيل السيرفر**

### مشكلة 5: الخطأ لا يزال موجود بعد كل الخطوات
**احتمال:** السياسات في Supabase غير مطبقة صحيحاً
**الحل:**
```sql
-- في Supabase SQL Editor، تحقق من السياسات:
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'users';

-- يجب أن ترى:
-- service_role_bypass_all | ALL | service_role
-- authenticated_users_select | SELECT | authenticated
-- admins_managers_insert | INSERT | authenticated
-- admins_managers_or_self_update | UPDATE | authenticated
-- admins_managers_delete | DELETE | authenticated
```

إذا لم تظهر هذه السياسات، أعد تشغيل `fix-users-comprehensive.sql`

---

## ✅ التأكد من نجاح الحل

بعد إضافة مستخدم جديد:

1. ✅ لا توجد أخطاء في Console
2. ✅ رسالة نجاح "تم إنشاء المستخدم"
3. ✅ المستخدم يظهر في القائمة
4. ✅ عند refresh (F5)، المستخدم لا يزال موجود
5. ✅ يمكنك حذف المستخدم بنجاح

---

## 📞 إذا لم تنجح أي من الحلول

أرسل لي:
1. **كامل output من Browser Console** (بعد محاولة إضافة مستخدم)
2. **كامل output من Next.js Terminal** (من وقت إضافة المستخدم)
3. **screenshot من Supabase SQL Editor** يظهر نتيجة:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'users';
```

---

**آخر تحديث:** 2025-09-30
**الحالة:** ✅ الحل جاهز - يحتاج restart فقط