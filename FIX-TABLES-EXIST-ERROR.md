# 🔧 حل مشكلة "relation users already exists"

## 🚨 المشكلة
```
ERROR: 42P07: relation "users" already exists
```

## ✅ الحلول السريعة

### الحل الأول: استخدام pgAdmin (الأسهل)

1. **افتح pgAdmin** 
   - ابحث عن "pgAdmin" في قائمة البدء
   - إذا لم تجده، تحتاج تثبيت PostgreSQL

2. **اتصل بالخادم المحلي**
   - اضغط على "Servers" → "PostgreSQL" → "localhost"

3. **افتح قاعدة البيانات**
   - اضغط بالزر الأيمن على `orders_management`
   - اختر "Query Tool"

4. **احذف جميع الجداول الموجودة (طريقتان)**

   **الطريقة الأولى - حذف شامل (الموصى به)**:
   - افتح ملف `database/complete-reset.sql`
   - انسخ والصق كامل المحتوى في pgAdmin
   - اضغط Execute (F5)

   **الطريقة الثانية - حذف يدوي**:
   ```sql
   -- حذف الجداول الموجودة
   DROP TABLE IF EXISTS stock_transactions CASCADE;
   DROP TABLE IF EXISTS order_history CASCADE;
   DROP TABLE IF EXISTS order_approvals CASCADE;
   DROP TABLE IF EXISTS order_items CASCADE;
   DROP TABLE IF EXISTS orders CASCADE;
   DROP TABLE IF EXISTS user_territory_assignments CASCADE;
   DROP TABLE IF EXISTS clinic_credit_limits CASCADE;
   DROP TABLE IF EXISTS product_stock CASCADE;
   DROP TABLE IF EXISTS products CASCADE;
   DROP TABLE IF EXISTS product_categories CASCADE;
   DROP TABLE IF EXISTS clinics CASCADE;
   DROP TABLE IF EXISTS territories CASCADE;
   DROP TABLE IF EXISTS regions CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   DROP TABLE IF EXISTS system_settings CASCADE;
   DROP TABLE IF EXISTS activity_logs CASCADE;
   DROP TABLE IF EXISTS customers CASCADE;
   DROP TABLE IF EXISTS representatives CASCADE;
   
   -- حذف الأنواع المخصصة
   DROP TYPE IF EXISTS user_role CASCADE;
   DROP TYPE IF EXISTS order_status CASCADE;
   DROP TYPE IF EXISTS payment_type CASCADE;
   DROP TYPE IF EXISTS discount_type CASCADE;
   DROP TYPE IF EXISTS approval_status CASCADE;
   DROP TYPE IF EXISTS transaction_type CASCADE;
   
   SELECT 'Tables dropped successfully!' AS message;
   ```
   - اضغط Execute (F5)

5. **أنشئ الجداول الجديدة**
   - افتح ملف `database/orders-system-postgresql.sql` في محرر نصوص
   - انسخ كامل المحتوى
   - ألصقه في pgAdmin Query Tool
   - اضغط Execute (F5)

6. **تحقق من النجاح**
   - يجب أن ترى رسالة نجاح
   - تحقق من وجود الجداول في Object Browser

---

### الحل الثاني: إذا لم تجد pgAdmin

#### أ. تثبيت PostgreSQL
1. حمل من: https://www.postgresql.org/download/windows/
2. ثبت البرنامج مع pgAdmin
3. اتبع الحل الأول أعلاه

#### ب. استخدام Supabase (بديل سحابي)
1. **سجل في Supabase**: https://supabase.com
2. **أنشئ مشروع جديد**
3. **في SQL Editor**:
   - انسخ والصق محتوى `database/reset-database.sql`
   - اضغط Run
   - انسخ والصق محتوى `database/orders-system-postgresql.sql`  
   - اضغط Run

4. **حدث ملف .env**:
   ```env
   # عطل PostgreSQL المحلي
   # DB_HOST=localhost
   # DB_PORT=5432
   
   # فعل Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

---

### الحل الثالث: Command Line (للمتقدمين)

إذا كنت تعرف مكان PostgreSQL:

```cmd
# ابحث عن PostgreSQL
where /r "C:\" psql.exe

# استخدم المسار الكامل
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d orders_management -c "DROP TABLE IF EXISTS users CASCADE;"

# أو استخدم الملفات
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d orders_management -f database\reset-database.sql
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d orders_management -f database\orders-system-postgresql.sql
```

---

## 🎯 خطوات التحقق

بعد تنفيذ أي من الحلول:

### 1. تحقق من الجداول
```sql
-- في pgAdmin أو أي SQL editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

يجب أن ترى:
- users
- products  
- clinics
- orders
- order_items
- وغيرها...

### 2. تحقق من البيانات التجريبية
```sql
SELECT COUNT(*) FROM users;    -- يجب أن يكون > 0
SELECT COUNT(*) FROM products; -- يجب أن يكون > 0
SELECT COUNT(*) FROM clinics;  -- يجب أن يكون > 0
```

### 3. تشغيل النظام
```bash
npm run dev
```

### 4. اختبار تسجيل الدخول
- انتقل لـ: http://localhost:3000/orders
- سجل دخول بـ: manager@example.com / password123

---

## 🚨 إذا استمرت المشاكل

### تحقق من:
1. **خدمة PostgreSQL تعمل**:
   - افتح Services.msc
   - ابحث عن postgresql وتأكد أنه Running

2. **كلمة مرور صحيحة**:
   - اسم المستخدم: postgres
   - كلمة المرور: التي وضعتها أثناء التثبيت

3. **المنفذ صحيح**:
   - المنفذ الافتراضي: 5432

### احتجت مساعدة إضافية؟
راجع: [TROUBLESHOOT-DATABASE.md](TROUBLESHOOT-DATABASE.md)

---

## 🎉 بعد الحل

بمجرد حل المشكلة:
- النظام جاهز للاستخدام بكامل ميزاته
- جميع الاختبارات ستعمل
- بيانات تجريبية متاحة للتجربة

**🚀 Happy Coding!**