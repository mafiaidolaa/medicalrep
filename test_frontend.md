# اختبار الواجهة الأمامية - Frontend Testing
## Testing Areas & Lines Loading from Database

---

## 🧪 الاختبارات المطلوبة

### 1. اختبار تحميل الإعدادات عند بدء التطبيق

#### الخطوات:
1. افتح التطبيق في المتصفح
2. افتح Developer Console (F12)
3. ابحث عن هذه الرسائل:

```
🔄 Loading areas and lines from database...
✅ Loaded areas from database: ["القاهرة", "الجيزة", ...]
✅ Loaded lines from database: ["الخط الأول", "الخط الثاني", ...]
```

#### النتيجة المتوقعة:
- ✅ يجب أن تظهر المناطق والخطوط من قاعدة البيانات
- ✅ لا أخطاء في console
- ✅ القوائم المنسدلة في صفحة تسجيل العيادات تحتوي على البيانات

---

### 2. اختبار في صفحة تسجيل العيادات

#### الخطوات:
1. اذهب إلى `/clinics/register`
2. افحص القائمة المنسدلة "المنطقة" (Area)
3. افحص القائمة المنسدلة "الخط" (Line)

#### النتيجة المتوقعة:
```
القائمة المنسدلة للمنطقة تحتوي على:
✅ القاهرة
✅ الجيزة
✅ الاسكندرية
✅ الدقهلية
✅ الشرقية
✅ المنوفية

القائمة المنسدلة للخط تحتوي على:
✅ الخط الأول
✅ الخط الثاني
✅ الخط الثالث
✅ الخط الرابع
```

---

### 3. اختبار في صفحة الإعدادات (Settings)

#### الخطوات:
1. سجل دخول كـ Admin
2. اذهب إلى `/settings`
3. ابحث عن قسم المناطق والخطوط

#### النتيجة المتوقعة:
- ✅ يجب أن تظهر المناطق والخطوط الحالية
- ✅ يمكن إضافة منطقة/خط جديد (Admin فقط)
- ✅ يمكن حذف منطقة/خط (Admin فقط)

---

### 4. اختبار استمرارية البيانات (Persistence)

#### الخطوات:
1. أعد تحميل الصفحة (F5 أو Ctrl+R)
2. أغلق المتصفح وافتحه مرة أخرى
3. امسح Cache (Ctrl+Shift+Delete)
4. افتح التطبيق في نافذة خفية (Incognito)

#### النتيجة المتوقعة:
- ✅ في جميع الحالات، يجب أن تظهر المناطق والخطوط
- ✅ البيانات تُحمّل من قاعدة البيانات وليس من localStorage

---

### 5. اختبار تحديث الإعدادات (Admin Only)

#### الخطوات:
1. سجل دخول كـ Admin
2. اذهب إلى `/settings`
3. أضف منطقة جديدة مثل "القليوبية"
4. أعد تحميل الصفحة

#### النتيجة المتوقعة:
- ✅ المنطقة الجديدة محفوظة
- ✅ تظهر في القائمة المنسدلة في صفحة تسجيل العيادات

---

## 🔧 اختبارات Developer Console

### اختبار مباشر في Console

افتح Developer Console واكتب:

```javascript
// Test 1: Check if areas and lines are loaded
const { areas, lines } = window.__NEXT_DATA__?.props?.pageProps || {};
console.log('Areas:', areas);
console.log('Lines:', lines);

// Test 2: Try to fetch from Supabase directly
// (افترض أن supabase client متاح)
const { data, error } = await supabase
  .from('system_settings')
  .select('setting_key, setting_value, is_public')
  .in('setting_key', ['app_areas', 'app_lines']);

console.log('From DB:', data);
console.log('Error:', error);

// Test 3: Check if data provider has the data
// (في صفحة تستخدم useDataProvider)
// const { areas, lines } = useDataProvider();
```

---

## 📊 Checklist النهائي

### Database ✅
- [ ] Migration تم تطبيقه بنجاح
- [ ] حقل `is_public` موجود في جدول `system_settings`
- [ ] Areas & Lines محفوظة مع `is_public = true`
- [ ] RLS policy "Public can read public settings" موجودة
- [ ] دالة `get_public_settings()` تعمل

### Frontend 🎨
- [ ] المناطق والخطوط تظهر في `/clinics/register`
- [ ] القوائم المنسدلة تحتوي على البيانات الصحيحة
- [ ] Console logs تظهر نجاح التحميل
- [ ] لا توجد أخطاء في console
- [ ] البيانات تستمر بعد إعادة التحميل

### Security 🔒
- [ ] المستخدمون العاديون يمكنهم قراءة Areas/Lines
- [ ] فقط Admins يمكنهم تعديل الإعدادات
- [ ] RLS يمنع الوصول غير المصرح به

### Performance ⚡
- [ ] تحميل البيانات سريع (< 500ms)
- [ ] Cache يعمل بشكل صحيح
- [ ] لا توجد طلبات API زائدة

---

## 🐛 مشاكل محتملة وحلولها

### المشكلة: المناطق والخطوط لا تظهر

**السبب المحتمل 1:** RLS policy لا تسمح بالقراءة

**الحل:**
```sql
-- في Supabase SQL Editor
-- تأكد من وجود هذه السياسة:
SELECT * FROM pg_policies 
WHERE tablename = 'system_settings' 
  AND policyname = 'Public can read public settings';

-- إذا لم تكن موجودة، أعد تشغيل Migration
```

**السبب المحتمل 2:** البيانات غير موجودة في DB

**الحل:**
```sql
-- تحقق من وجود البيانات:
SELECT * FROM system_settings 
WHERE setting_key IN ('app_areas', 'app_lines');

-- إذا لم تكن موجودة، أدخلها يدويًا:
INSERT INTO system_settings (category, setting_key, setting_value, is_public, is_enabled)
VALUES 
  ('general', 'app_areas', '["القاهرة", "الجيزة", "الاسكندرية"]'::jsonb, true, true),
  ('general', 'app_lines', '["الخط الأول", "الخط الثاني"]'::jsonb, true, true)
ON CONFLICT (category, setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value, is_public = true;
```

**السبب المحتمل 3:** الكود لم يتم تحديثه

**الحل:**
```bash
# أعد تشغيل Dev Server
npm run dev

# أو امسح cache وأعد البناء
rm -rf .next
npm run build
npm run dev
```

---

### المشكلة: Console يظهر أخطاء RLS

**Error Example:**
```
Error: new row violates row-level security policy for table "system_settings"
```

**الحل:**
```sql
-- تحقق من سياسات الإدخال والتحديث
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'system_settings' 
  AND cmd IN ('INSERT', 'UPDATE');

-- يجب أن يكون هناك سياسات للـ Admin
-- "Only admins can insert system settings"
-- "Only admins can update system settings"
```

---

### المشكلة: البيانات لا تُحفظ بعد التعديل

**السبب:** المستخدم ليس Admin

**الحل:**
```sql
-- تحقق من صلاحيات المستخدم الحالي
SELECT id, username, role FROM users WHERE id = auth.uid();

-- يجب أن يكون role = 'admin' لتعديل settings
```

---

## 📸 Screenshots المتوقعة

### 1. Developer Console عند بدء التطبيق
```
🔄 Loading areas and lines from database...
✅ Loaded areas from database: Array(6) ["القاهرة", "الجيزة", "الاسكندرية", "الدقهلية", "الشرقية", "المنوفية"]
✅ Loaded lines from database: Array(4) ["الخط الأول", "الخط الثاني", "الخط الثالث", "الخط الرابع"]
```

### 2. القوائم المنسدلة في Clinics Registration
```
[Dropdown: المنطقة]
  - القاهرة
  - الجيزة
  - الاسكندرية
  - الدقهلية
  - الشرقية
  - المنوفية

[Dropdown: الخط]
  - الخط الأول
  - الخط الثاني
  - الخط الثالث
  - الخط الرابع
```

---

## ✅ الخلاصة

إذا نجحت جميع الاختبارات أعلاه، فهذا يعني:

1. ✅ Migration تم تطبيقه بنجاح
2. ✅ Areas & Lines محفوظة في Database
3. ✅ RLS يعمل بشكل صحيح
4. ✅ Frontend يحمّل البيانات من DB
5. ✅ النظام جاهز للاستخدام!

**الخطوة التالية:** ابدأ في اختبار بقية الوظائف (Orders, Visits, etc.) باستخدام Checklist في `IMPLEMENTATION_GUIDE.md`

---

**تاريخ الإنشاء:** 2025-01-01
**الإصدار:** 1.0
