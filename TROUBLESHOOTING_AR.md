# 🔧 دليل حل المشاكل - EP Group System

## 📋 ملخص المشاكل المكتشفة

### 🔴 مشكلة رئيسية: فشل إضافة المنتج (خطأ 500)

**الأعراض:**
- عند محاولة إضافة منتج جديد، تظهر رسالة: "فشل إضافة المنتج ،، تعذر حفظ المنتج حاول مره اخرى"
- Server يرجع خطأ 500
- نفس المشكلة تحدث عند حذف منتج

**السبب:**
مشكلة في صلاحيات Row Level Security (RLS) في Supabase - الصلاحيات لا تسمح للمستخدم بإضافة أو حذف منتجات.

---

## ✅ الحلول المقترحة

### الحل 1: إصلاح صلاحيات قاعدة البيانات (الأهم)

**الخطوات:**

1. **افتح Supabase Dashboard:**
   - اذهب إلى: https://supabase.com/dashboard
   - افتح مشروعك: `vxdvcrcbegggilreaoip`
   - اختر **SQL Editor** من القائمة الجانبية

2. **نفذ السكريبت:**
   - افتح الملف: `fix-products-permissions.sql`
   - انسخ المحتوى بالكامل
   - الصقه في SQL Editor
   - اضغط **Run**

3. **تحقق من النتائج:**
   - يجب أن ترى رسالة: `Script completed successfully!`
   - تحقق من الصلاحيات في قسم **Authentication > Policies**

**ما يفعله السكريبت:**
- يتأكد من وجود جداول `products` و `product_details`
- يحذف السياسات القديمة
- يضيف سياسات جديدة تسمح للـ admin/manager/gm بإضافة وحذف منتجات
- يضيف فهارس لتحسين الأداء

---

### الحل 2: تحسين الأداء

**المشكلة:**
- بطء شديد في تحميل الصفحات (بعض الصفحات تستغرق 15+ ثانية!)
- API calls بطيئة جداً

**الخطوات:**

#### أ. استخدام ملف next.config.js محسّن

```bash
# انسخ الملف المحسّن
copy next.config.optimized-performance.js next.config.js

# أو يدوياً:
# احذف next.config.js القديم
# أعد تسمية next.config.optimized-performance.js إلى next.config.js
```

#### ب. أعد تشغيل السيرفر

```bash
# أوقف السيرفر الحالي (Ctrl+C)
# امسح الكاش
rmdir /s /q .next

# شغل السيرفر من جديد
npm run dev:basic
```

**التحسينات المطبقة:**
- ✅ تحسين Webpack caching
- ✅ تقليل watch files overhead
- ✅ إضافة split chunks للمكتبات
- ✅ تحسين on-demand entries
- ✅ إضافة headers للكاش

---

### الحل 3: رسائل خطأ أفضل

**تم تحديث:** `src/app/api/products/route.ts`

**التحسينات:**
- ✅ إضافة validation للبيانات المدخلة
- ✅ رسائل خطأ بالعربية أكثر وضوحاً
- ✅ إضافة console.log لتتبع المشاكل
- ✅ عرض error code و hint من قاعدة البيانات

**الآن ستحصل على رسائل مثل:**
```json
{
  "error": "فشل إضافة المنتج",
  "details": "خطأ في قاعدة البيانات: permission denied for table products",
  "hint": "تحقق من صلاحيات المستخدم أو اتصل بالمطور",
  "code": "42501"
}
```

---

## 🔍 تفاصيل مشاكل الأداء

### الصفحات الأبطأ (من السجلات):

| الصفحة | الوقت | الملاحظة |
|--------|-------|----------|
| `/offline` | 31.8s | أبطأ صفحة! |
| `/settings` | 18.4s | بطيئة جداً |
| `/orders` | 15.9s | بطيئة |
| `/notifications` | 11.7s | بطيئة |
| `/accounts` | 7.6s | بطيئة متوسطة |

### أسباب البطء المحتملة:

1. **Turbopack في التطوير:**
   - قد يكون أبطأ من Webpack في بعض الحالات
   - يجب المقارنة بين الاثنين

2. **استعلامات قاعدة البيانات:**
   - ربما هناك N+1 queries
   - عدم وجود فهارس كافية

3. **صور مفقودة:**
   ```
   GET /uploads/site/loading_icon_1759142644817.png 404
   ```
   هذا يسبب تأخير في كل صفحة

---

## 🎯 خطوات الاختبار

### بعد تطبيق الإصلاحات:

1. **اختبر إضافة منتج:**
   ```
   - افتح صفحة المنتجات
   - اضغط "إضافة منتج"
   - املأ البيانات
   - احفظ
   ```
   ✅ يجب أن تنجح العملية بدون خطأ 500

2. **اختبر حذف منتج:**
   - اختر منتج موجود
   - اضغط حذف
   ✅ يجب أن يُحذف بنجاح

3. **قس الأداء:**
   - افتح Developer Tools > Network
   - سجل وقت تحميل الصفحات
   - قارن مع الأرقام السابقة

---

## 🚨 إذا استمرت المشاكل

### تحقق من الـ Console Logs:

```bash
# شغل السيرفر وراقب الرسائل
npm run dev:basic

# ابحث عن:
[Products API] Attempting to insert product: ...
[Products API] Insert error: ...
```

### تحقق من Supabase:

1. **افتح Supabase Logs:**
   - Dashboard > Logs
   - ابحث عن أخطاء API

2. **تحقق من الصلاحيات:**
   - Dashboard > Authentication > Policies
   - تأكد من وجود policies للـ products

3. **تحقق من المستخدم الحالي:**
   ```sql
   SELECT id, email, role FROM users WHERE email = 'admin@clinicconnect.com';
   ```
   تأكد أن `role` = `admin`

---

## 📞 معلومات إضافية

### Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vxdvcrcbegggilreaoip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... ✅ موجود
```

### Next.js Version:
- **الإصدار:** 15.5.4
- **Runtime:** Turbopack
- **Node Memory:** 4GB (NODE_OPTIONS=--max-old-space-size=4096)

### ملفات التكوين المتاحة:
- `next.config.js` (الحالي)
- `next.config.optimized-performance.js` (المحسّن - استخدمه!)
- `fix-products-permissions.sql` (لإصلاح الصلاحيات - نفذه!)

---

## ✨ توصيات إضافية

1. **أضف فهارس إضافية:**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   ```

2. **راقب استخدام الذاكرة:**
   ```bash
   # فعّل مراقبة الذاكرة
   set ENABLE_MEMORY_MONITORING=true
   npm run dev:basic
   ```

3. **استخدم React Query للكاش:**
   - ضع في اعتبارك استخدام `@tanstack/react-query` للكاش
   - سيقلل من عدد الطلبات للـ API

4. **استبدل الصورة المفقودة:**
   - أنشئ ملف: `public/images/loading-fallback.svg`
   - أو حدّث المسار في الكود

---

## 🎯 النتيجة المتوقعة بعد الإصلاحات:

✅ **إضافة المنتجات:** تعمل بدون أخطاء  
✅ **حذف المنتجات:** يعمل بدون أخطاء  
⚡ **الأداء:** تحسّن بنسبة 30-50%  
📝 **رسائل الخطأ:** أوضح وأكثر فائدة  

---

**آخر تحديث:** 2025-09-30  
**الإصدار:** 1.0