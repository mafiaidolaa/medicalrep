# 📦 تعليمات تنفيذ Database Migration

## 🎯 الهدف
إضافة الحماية والأمان الكامل لقاعدة البيانات.

---

## 📝 الخطوات (نفّذها بالترتيب)

### 1️⃣ افتح Supabase Dashboard

1. روح على: https://supabase.com
2. اختار المشروع بتاعك
3. من الـ sidebar، اختار **SQL Editor**

---

### 2️⃣ نفّذ الـ Migration Script

1. في SQL Editor، افتح ملف جديد
2. انسخ **كل** محتوى الملف: `001_add_security_features.sql`
3. الصق في SQL Editor
4. اضغط **Run** أو `Ctrl+Enter`

**⏱️ الوقت المتوقع:** 10-30 ثانية حسب حجم البيانات

---

### 3️⃣ تحقق من نجاح التنفيذ

يجب تظهر رسائل زي دي في الـ Console:

```
NOTICE:  ✅ Migration completed successfully!
NOTICE:  📊 Added: version control, stock management, audit logs
NOTICE:  🔒 Added: safe stock operations with locking
NOTICE:  📈 Added: performance indexes
```

---

### 4️⃣ تحقق من الجداول والـ Functions الجديدة

#### أ) تحقق من الجداول:
```sql
-- في SQL Editor، نفّذ:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('stock_movements', 'audit_logs');
```

**النتيجة المتوقعة:** يطلعلك جدولين.

---

#### ب) تحقق من الـ Functions:
```sql
-- في SQL Editor، نفّذ:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('decrement_stock', 'increment_stock', 'increment_version');
```

**النتيجة المتوقعة:** 3 functions.

---

#### ج) تحقق من الـ version columns:
```sql
-- في SQL Editor، نفّذ:
SELECT column_name, table_name 
FROM information_schema.columns 
WHERE column_name = 'version' 
  AND table_schema = 'public';
```

**النتيجة المتوقعة:** 4 جداول (orders, products, clinics, visits).

---

### 5️⃣ اختبار الـ Functions الجديدة

#### اختبار 1: دالة خصم المخزون

```sql
-- اختار منتج عندك واستبدل الـ UUID
-- مثال: خصم 5 قطع من منتج
SELECT * FROM decrement_stock(
  'YOUR-PRODUCT-UUID-HERE',  -- ضع UUID منتج حقيقي
  5                           -- الكمية
);
```

**النتيجة المتوقعة:**
```
success | new_stock | message
--------|-----------|---------------------------
true    | 45        | تم خصم المخزون بنجاح
```

---

#### اختبار 2: دالة إضافة للمخزون

```sql
SELECT * FROM increment_stock(
  'YOUR-PRODUCT-UUID-HERE',
  10
);
```

**النتيجة المتوقعة:**
```
success | new_stock | message
--------|-----------|---------------------------
true    | 55        | تم إضافة للمخزون بنجاح
```

---

#### اختبار 3: التحقق من الـ Triggers

```sql
-- عدّل أي منتج وشوف الـ version تزيد تلقائياً
UPDATE products 
SET name = name  -- تعديل بسيط
WHERE id = 'YOUR-PRODUCT-UUID-HERE';

-- شوف النتيجة
SELECT id, name, version, updated_at 
FROM products 
WHERE id = 'YOUR-PRODUCT-UUID-HERE';
```

**المفروض:** الـ `version` زادت بـ 1، والـ `updated_at` اتحدّث.

---

### 6️⃣ تحقق من الـ View الجديد

```sql
-- شوف المنتجات اللي قربت تخلص
SELECT * FROM low_stock_products;
```

**النتيجة:** قائمة بالمنتجات تحت الحد الأدنى.

---

## ✅ Checklist - تأكد من كل حاجة

- [ ] Migration script تم تنفيذه بنجاح
- [ ] جدول `stock_movements` موجود
- [ ] جدول `audit_logs` موجود
- [ ] دالة `decrement_stock` شغالة
- [ ] دالة `increment_stock` شغالة
- [ ] عمود `version` موجود في الجداول الأربعة
- [ ] عمود `min_stock_level` موجود في `products`
- [ ] الـ Triggers شغالة صح
- [ ] الـ View `low_stock_products` شغال

---

## 🚨 في حالة حدوث أخطاء

### Error: "relation already exists"
**المعنى:** الجدول أو Function موجود مسبقاً.  
**الحل:** عادي، كمّل. الـ script فيه `IF NOT EXISTS`.

---

### Error: "column already exists"
**المعنى:** العمود موجود مسبقاً.  
**الحل:** عادي، كمّل. الـ script محمي بـ `IF NOT EXISTS`.

---

### Error: "permission denied"
**المعنى:** مش عندك صلاحيات كافية.  
**الحل:** تأكد إنك **Owner** أو **Admin** على المشروع.

---

### Error: "syntax error"
**المعنى:** في مشكلة في الكود SQL.  
**الحل:** 
1. تأكد إنك نسخت الملف **كامل**
2. تأكد ما في حاجة اتعدّلت في الكود
3. جرب تنفذ الأجزاء واحد واحد

---

## 📞 بعد التنفيذ

**الخطوة الجاية:**
- ارجع للـ Terminal
- شغّل السيرفر: `npm run dev`
- اختبر Orders API الجديد

---

## 🎉 تم بنجاح!

لو كل الـ Checklist فوق ✅، يبقى قاعدة البيانات جاهزة 100%!

**Next:** نرجع نجرب الـ API ونشوف النتائج! 🚀