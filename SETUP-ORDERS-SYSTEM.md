# 🚀 دليل إعداد وتشغيل نظام إدارة الطلبات

## 📋 المتطلبات الأساسية

### 1. البرمجيات المطلوبة
- **Node.js** (الإصدار 18 أو أحدث)
- **PostgreSQL** (الإصدار 12 أو أحدث)
- **npm** أو **yarn**

### 2. فحص وجود PostgreSQL
تأكد من وجود PostgreSQL وأنه يعمل:

```bash
# Windows
pg_ctl status

# Linux/Mac
sudo systemctl status postgresql
# أو
brew services list | grep postgresql
```

## ⚙️ خطوات الإعداد

### 1. إعداد قاعدة البيانات

#### أ. إنشاء قاعدة البيانات
```sql
-- اتصل بـ PostgreSQL كمستخدم مشرف
psql -U postgres

-- إنشاء قاعدة البيانات
CREATE DATABASE orders_management WITH ENCODING 'UTF8';

-- إنشاء مستخدم للتطبيق (اختياري ولكن مُنصح به)
CREATE USER orders_app WITH PASSWORD 'secure_password_123';

-- منح الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE orders_management TO orders_app;

-- الخروج من PostgreSQL
\q
```

#### ب. تنفيذ ملف إنشاء الجداول

**إذا كانت الجداول موجودة مسبقاً (خطأ "relation already exists"):**

```bash
# الطريقة السهلة: استخدم الملف الدفعي (Windows)
setup-database.bat

# أو يدوياً: احذف الجداول أولاً
psql -U postgres -d orders_management -f database/reset-database.sql

# ثم أنشئ الجداول الجديدة
psql -U postgres -d orders_management -f database/orders-system-postgresql.sql
```

**للإعداد العادي:**
```bash
# تنفيذ ملف PostgreSQL
psql -d orders_management -f database/orders-system-postgresql.sql

# أو باستخدام مستخدم مخصص
psql -U orders_app -d orders_management -f database/orders-system-postgresql.sql
```

### 2. إعداد متغيرات البيئة

#### أ. إنشاء ملف البيئة
```bash
# نسخ الملف النموذجي
cp .env.example .env

# تحرير الملف
# Windows
notepad .env

# Linux/Mac
nano .env
# أو
code .env
```

#### ب. تعديل الإعدادات المطلوبة
```env
# إعدادات قاعدة البيانات
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orders_management
DB_USER=orders_app
DB_PASSWORD=secure_password_123

# إعدادات Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_key

# مفتاح التطبيق
APP_SECRET=your_app_secret_key

# العملة الافتراضية
DEFAULT_CURRENCY=EGP
```

### 3. تثبيت التبعيات

```bash
# تثبيت تبعيات Node.js
npm install

# أو باستخدام yarn
yarn install
```

### 4. إضافة تبعية PostgreSQL

```bash
# تثبيت pg للاتصال بـ PostgreSQL
npm install pg @types/pg

# تثبيت تبعيات إضافية مطلوبة
npm install bcryptjs @types/bcryptjs
npm install jsonwebtoken @types/jsonwebtoken
```

## 🎯 تشغيل النظام

### 1. وضع التطوير
```bash
# تشغيل خادم التطوير
npm run dev

# أو
yarn dev
```

### 2. الوصول للنظام
- افتح المتصفح وانتقل إلى: `http://localhost:3000`
- صفحة الطلبات المحسنة: `http://localhost:3000/orders`

### 3. بيانات المستخدمين الافتراضية

بعد تنفيذ ملف قاعدة البيانات، ستجد المستخدمين التاليين:

| الدور | البريد الإلكتروني | كلمة المرور | المنطقة/الخط |
|-------|------------------|--------------|---------------|
| مدير | `manager@example.com` | `password123` | الرياض - الخط الأول |
| مندوب طبي | `rep@example.com` | `password123` | الرياض - الخط الأول |
| محاسب | `accountant@example.com` | `password123` | - |
| مشرف | `admin@example.com` | `password123` | - |

⚠️ **تحذير**: يجب تغيير كلمات المرور قبل الاستخدام الفعلي!

## 🧪 اختبار النظام

### 1. تشغيل اختبارات النظام
داخل النظام، انتقل إلى صفحة الطلبات وابحث عن علامة تبويب "اختبار النظام" لتشغيل الاختبارات الشاملة.

### 2. فحص الاتصال بقاعدة البيانات
```bash
# إنشاء ملف فحص بسيط
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'orders_management',
  user: 'orders_app',
  password: 'secure_password_123'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('خطأ في الاتصال:', err);
  } else {
    console.log('نجح الاتصال:', res.rows[0]);
  }
  pool.end();
});
"
```

## 📁 هيكل الملفات الجديدة

```
src/
├── types/orders.ts                           # أنواع البيانات
├── components/orders/
│   ├── index.ts                             # فهرس التصدير
│   ├── new-order-form-enhanced.tsx          # نموذج الطلب المحسن
│   ├── previous-orders-enhanced.tsx         # الطلبات السابقة
│   ├── order-ui-components.tsx              # مكونات الواجهة
│   ├── order-approval-system.tsx            # نظام الاعتماد
│   └── orders-system-test.tsx               # نظام الاختبار
├── hooks/
│   └── use-orders-products-integration.ts   # تكامل المنتجات
├── app/(dashboard)/orders/
│   └── page-enhanced.tsx                    # صفحة الطلبات المحسنة
├── lib/
│   └── database.ts                          # دوال قاعدة البيانات
└── database/
    ├── orders-system-postgresql.sql         # PostgreSQL schema
    └── orders-system-schema.sql             # MySQL schema (للمرجعية)
```

## 🎨 الميزات الجديدة

### 1. نموذج الطلب المحسن
- اختيار العيادة مع تفاصيل الطبيب والحد الائتماني
- إضافة المنتجات من قائمة محدثة
- ثلاث طرق خصم: نسبة مئوية، مبلغ ثابت، ديمو مجاني
- قيود الديمو: 3 منتجات كحد أقصى، قطعة واحدة من كل منتج
- فحص الحد الائتماني تلقائياً

### 2. إدارة الطلبات السابقة
- بحث وفلترة متقدمة
- علامات تبويب حسب الحالة
- إحصائيات فورية
- تصدير البيانات

### 3. نظام الاعتماد
- اعتماد المدير للطلبات الكبيرة (> 1000 ج.م)
- اعتماد المحاسب للدفع الآجل (> 5000 ج.م)
- تتبع تاريخ التغييرات

### 4. إدارة المخزون
- حجز مؤقت للمخزون (30 دقيقة)
- تتبع المعاملات
- إرجاع المخزون عند الإلغاء

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. خطأ في الاتصال بقاعدة البيانات
```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**الحل**: تأكد من تشغيل PostgreSQL:
```bash
# Windows
net start postgresql-x64-13

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

#### 2. خطأ في المصادقة
```bash
Error: password authentication failed
```
**الحل**: تحقق من اسم المستخدم وكلمة المرور في `.env`

#### 3. قاعدة البيانات غير موجودة
```bash
Error: database "orders_management" does not exist
```
**الحل**: أنشئ قاعدة البيانات كما هو موضح أعلاه

#### 4. خطأ في الأذونات
```bash
Error: permission denied for table users
```
**الحل**: امنح الصلاحيات للمستخدم:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orders_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orders_app;
```

#### 5. خطأ الجداول الموجودة مسبقاً
```bash
ERROR: 42P07: relation "users" already exists
```
**الحل**: استخدم ملف إعادة التعيين:
```bash
# Windows: استخدم الملف الدفعي
setup-database.bat

# أو يدوياً
psql -U postgres -d orders_management -f database/reset-database.sql
psql -U postgres -d orders_management -f database/orders-system-postgresql.sql
```

#### 6. PostgreSQL غير متاح في Command Line
```bash
psql : The term 'psql' is not recognized
```
**الحل**: 
- استخدم pgAdmin (واجهة رسومية)
- أو أضف PostgreSQL للمسار:
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\15\bin"
```
- أو استخدم Supabase بدلاً من PostgreSQL المحلي

> 📝 **ملاحظة**: لحل مشاكل قاعدة البيانات بالتفصيل، راجع [TROUBLESHOOT-DATABASE.md](TROUBLESHOOT-DATABASE.md)

## 🔒 أمان الإنتاج

### قبل النشر للإنتاج:

1. **غيّر كلمات المرور الافتراضية**:
```sql
UPDATE users SET password_hash = '$2b$10$your_new_hashed_password';
```

2. **احم متغيرات البيئة**:
```bash
chmod 600 .env
```

3. **أنشئ مستخدم قاعدة بيانات محدود الصلاحيات**

4. **فعّل SSL للقاعدة**

5. **راجع إعدادات الشبكة والأمان**

## 📞 الدعم الفني

### إذا واجهت مشاكل:

1. تحقق من ملفات السجلات (Logs)
2. تأكد من تشغيل جميع الخدمات المطلوبة
3. راجع متغيرات البيئة
4. اختبر الاتصال بقاعدة البيانات منفرداً

### معلومات النظام:
- **الإصدار**: 1.0.0
- **قاعدة البيانات**: PostgreSQL 12+
- **الإطار**: Next.js 14
- **اللغة**: TypeScript

---

🎉 **نظام إدارة الطلبات جاهز للاستخدام!**

للمزيد من المساعدة، راجع الوثائق الفنية في مجلد `docs/` أو تواصل مع فريق التطوير.