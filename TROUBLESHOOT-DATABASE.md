# 🔧 حل مشاكل قاعدة البيانات - نظام إدارة الطلبات

## 🚨 المشكلة الحالية: "relation users already exists"

هذا الخطأ يعني أن الجداول موجودة مسبقاً في قاعدة البيانات. إليك الحلول:

---

## 🎯 الحلول السريعة

### الحل الأول: استخدام الملف الدفعي (الأسهل)
```bash
# شغل الملف الدفعي من مجلد المشروع
./setup-database.bat

# أو من Command Prompt
setup-database.bat
```

### الحل الثاني: إعادة تعيين يدوية
```bash
# 1. إعادة تعيين قاعدة البيانات
psql -U postgres -d orders_management -f database/reset-database.sql

# 2. إنشاء الجداول من جديد
psql -U postgres -d orders_management -f database/orders-system-postgresql.sql
```

### الحل الثالث: إنشاء قاعدة بيانات جديدة
```sql
-- في psql أو pgAdmin
DROP DATABASE IF EXISTS orders_management;
CREATE DATABASE orders_management WITH ENCODING 'UTF8';
```

---

## 💻 حلول بديلة للويندوز

### إذا كان PostgreSQL غير متاح في Command Line:

#### أ. استخدام pgAdmin (واجهة رسومية)
1. افتح pgAdmin
2. اتصل بالخادم المحلي
3. انقر بالزر الأيمن على Databases → Create → Database
4. اسم قاعدة البيانات: `orders_management`
5. انقر بالزر الأيمن على قاعدة البيانات → Query Tool
6. انسخ والصق محتوى `database/reset-database.sql`
7. اضغط Execute
8. انسخ والصق محتوى `database/orders-system-postgresql.sql`
9. اضغط Execute

#### ب. إضافة PostgreSQL للـ PATH
```powershell
# في PowerShell (كمدير)
$env:PATH += ";C:\Program Files\PostgreSQL\15\bin"

# أو أضفه بشكل دائم في متغيرات البيئة
```

#### ج. استخدام مسار PostgreSQL الكامل
```cmd
# استبدل رقم الإصدار حسب التثبيت لديك
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d orders_management -f database\reset-database.sql
```

---

## 🔍 التشخيص والفحص

### فحص PostgreSQL
```bash
# تحقق من تشغيل الخدمة
net start | findstr postgresql

# تحقق من المنفذ
netstat -an | findstr 5432

# اختبار الاتصال
psql -U postgres -c "SELECT version();"
```

### فحص قاعدة البيانات
```sql
-- عرض الجداول الموجودة
\dt

-- عرض معلومات قاعدة البيانات
SELECT datname FROM pg_database WHERE datname = 'orders_management';

-- عرض المستخدمين
\du
```

---

## 🗂️ خطوات مُنظمة حسب الحالة

### الحالة 1: PostgreSQL مثبت وقاعدة البيانات موجودة
```bash
# خطوة 1: إعادة تعيين
psql -U postgres -d orders_management -f database/reset-database.sql

# خطوة 2: إنشاء الجداول
psql -U postgres -d orders_management -f database/orders-system-postgresql.sql

# خطوة 3: التحقق
psql -U postgres -d orders_management -c "\dt"
```

### الحالة 2: PostgreSQL غير متاح في Command Line
```bash
# ابحث عن مجلد PostgreSQL
dir "C:\Program Files\PostgreSQL*" /AD

# استخدم المسار الكامل
"C:\Program Files\PostgreSQL\15\bin\psql.exe" --version
```

### الحالة 3: استخدام Supabase بدلاً من PostgreSQL المحلي
```bash
# 1. إعداد متغيرات البيئة في .env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# 2. تعطيل PostgreSQL المحلي في .env
# DB_HOST=localhost
# DB_PORT=5432

# 3. في Supabase Dashboard → SQL Editor
# نسخ والصق محتوى reset-database.sql ثم orders-system-postgresql.sql
```

---

## ⚠️ مشاكل شائعة أخرى وحلولها

### خطأ: "password authentication failed"
```bash
# الحل: تعديل ملف pg_hba.conf
# غيّر METHOD من md5 إلى trust لـ localhost
# أو استخدم pgAdmin لتغيير كلمة مرور المستخدم
```

### خطأ: "could not connect to server"
```bash
# تأكد من تشغيل PostgreSQL service
net start postgresql-x64-15

# أو من Services.msc
# ابحث عن postgresql وتأكد أنه يعمل
```

### خطأ: "database does not exist"
```sql
-- إنشاء قاعدة البيانات أولاً
CREATE DATABASE orders_management WITH ENCODING 'UTF8';
```

---

## 🎯 الطريقة المُوصى بها لنظام التشغيل Windows

### 1. تثبيت PostgreSQL إذا لم يكن مثبت
- حمل من: https://www.postgresql.org/download/windows/
- اتبع خطوات التثبيت
- تذكر كلمة مرور مستخدم postgres

### 2. استخدام pgAdmin (الأسهل)
- يأتي مع PostgreSQL
- واجهة رسومية سهلة
- لا يحتاج Command Line

### 3. أو إعداد Command Line
```powershell
# إضافة PostgreSQL للمسار
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Program Files\PostgreSQL\15\bin", [EnvironmentVariableTarget]::Machine)
```

---

## ✅ التحقق من النجاح

### بعد تنفيذ الـ SQL:
```sql
-- يجب أن ترى هذه الجداول
\dt

-- يجب أن ترى بيانات تجريبية
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM clinics;
```

### في التطبيق:
1. شغل `npm run dev`
2. انتقل لـ `http://localhost:3000/orders`
3. سجل دخول بـ `manager@example.com` / `password123`
4. تأكد من ظهور البيانات والواجهات

---

## 📞 الدعم الإضافي

### إذا استمرت المشاكل:
1. **راجع ملف الـ logs**: ابحث عن ملفات PostgreSQL log
2. **تحقق من الأذونات**: تأكد من أن المستخدم له صلاحيات
3. **استخدم Supabase**: بديل سحابي أسهل
4. **اتصل بفريق الدعم**: مع تفاصيل الخطأ الكامل

### معلومات مفيدة لفريق الدعم:
- إصدار Windows
- إصدار PostgreSQL (إن وجد)
- نص الخطأ كاملاً
- الخطوات التي اتبعتها

---

**🎉 بمجرد حل مشكلة قاعدة البيانات، النظام جاهز للعمل بكامل ميزاته المتقدمة!**