# 🔧 إصلاح مشكلة حذف المستخدمين

## 📋 المشكلة
عند محاولة حذف مستخدمين تجريبيين، يظهر الخطأ التالي:
```
Error deleting from users: TypeError: NetworkError when attempting to fetch resource.
```

## 🔍 السبب
السبب الرئيسي للمشكلة هو أحد الأمور التالية:
1. **سياسات Row Level Security (RLS)** في Supabase لا تسمح بحذف المستخدمين
2. استخدام **Anon Key** بدلاً من **Service Role Key** لعمليات الحذف
3. مشاكل في الاتصال بالإنترنت أو جدار حماية

## ✅ الحلول المطبقة

### الحل 1: استخدام API Route مع Service Role Key ⭐ (مُطبّق)

تم إنشاء API route جديد في:
- `src/app/api/users/[id]/route.ts`

هذا الحل يستخدم `Service Role Key` على جانب الخادم لتجاوز سياسات RLS.

**المميزات:**
- ✅ يتجاوز سياسات RLS بشكل آمن
- ✅ يحافظ على الأمان بالتحقق من الصلاحيات
- ✅ لا يحتاج تعديل قاعدة البيانات

تم تعديل وظيفة `deleteUser` في `src/lib/supabase-services.ts` لاستخدام API route أولاً.

### الحل 2: تحديث سياسات RLS (اختياري)

إذا كنت تفضل السماح بالحذف مباشرة من جانب العميل، استخدم ملف SQL:
- `fix-users-rls-policies.sql`

**خطوات التطبيق:**
1. افتح لوحة تحكم Supabase: https://supabase.com/dashboard
2. اذهب إلى **SQL Editor**
3. انسخ محتويات ملف `fix-users-rls-policies.sql`
4. الصق الكود وانقر على **Run**

## 🚀 التجربة

### الخطوة 1: إعادة تشغيل الخادم
```bash
# أوقف الخادم الحالي (Ctrl+C) ثم شغله من جديد
npm run dev
```

### الخطوة 2: اختبار الحذف
1. افتح صفحة المستخدمين
2. حاول حذف مستخدم تجريبي
3. يجب أن يعمل الحذف بنجاح الآن

## 🔐 التحقق من الصلاحيات

API route الجديد يتحقق من:
- ✅ المستخدم مسجل دخول
- ✅ المستخدم لديه دور `admin` أو `manager`
- ✅ الطلب صالح

## 📝 ملاحظات مهمة

1. **Service Role Key موجود في `.env.local`**:
   ```
   SUPABASE_SERVICE_ROLE_KEY="..."
   ```

2. **API route يعمل على جانب الخادم فقط**، مما يحافظ على أمان الـ Service Role Key

3. **Fallback**: إذا فشل API route، سيحاول النظام استخدام الاتصال المباشر بـ Supabase

## 🛠️ استكشاف الأخطاء

### إذا استمرت المشكلة:

#### 1. تحقق من Service Role Key
```bash
# تأكد من وجود المفتاح في .env.local
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY
```

#### 2. تحقق من الاتصال بالإنترنت
```bash
# اختبر الاتصال بـ Supabase
curl https://vxdvcrcbegggilreaoip.supabase.co
```

#### 3. افحص Console الخاص بالمتصفح
- افتح Developer Tools (F12)
- اذهب إلى **Network** tab
- حاول الحذف مرة أخرى
- ابحث عن طلب `/api/users/[id]` وافحص الاستجابة

#### 4. افحص Logs في Supabase Dashboard
- اذهب إلى **Logs** -> **API Logs**
- ابحث عن طلبات DELETE على جدول users
- افحص الأخطاء إن وجدت

## 📞 الدعم

إذا استمرت المشكلة بعد تطبيق جميع الحلول:
1. تحقق من أن الخادم تم إعادة تشغيله
2. امسح cache المتصفح
3. تحقق من سياسات RLS في Supabase Dashboard

---

**آخر تحديث:** 2025-09-29
**الحالة:** ✅ تم تطبيق الإصلاح