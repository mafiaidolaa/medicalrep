# 📍 إدارة المناطق والخطوط - دليل شامل

## 🎯 المفهوم

النظام الآن يستخدم **قاعدة البيانات** (جدول `system_settings`) لتخزين المناطق والخطوط بدلاً من localStorage.

---

## 🔍 الوضع الحالي

### **الخطوة 1: فحص القيم الحالية**

شغّل هذا الملف في SQL Editor:
```sql
check-current-settings.sql
```

**سيظهر لك:**
1. القيم الموجودة في `system_settings`
2. المناطق/الخطوط المستخدمة في جدول `users`
3. المناطق/الخطوط المستخدمة في جدول `clinics`
4. قائمة بجميع المناطق الفريدة
5. قائمة بجميع الخطوط الفريدة

---

## ✅ مزامنة الإعدادات من البيانات الفعلية

### **الخطوة 2: مزامنة القيم**

شغّل هذا الملف:
```sql
sync-settings-from-actual-data.sql
```

**ماذا يفعل:**
- ✅ يستخرج جميع المناطق **الفعلية** من `users` و `clinics`
- ✅ يستخرج جميع الخطوط **الفعلية** من `users` و `clinics`
- ✅ يحدّث `system_settings` بالقيم الحقيقية فقط
- ✅ يزيل أي قيم غير مستخدمة (مثل "الخط الثالث" إذا لم يكن مستخدماً)

---

## 🔧 إضافة منطقة أو خط جديد

### **السيناريو 1: إضافة من SQL مباشرة**

```sql
-- إضافة منطقة جديدة
UPDATE public.system_settings
SET setting_value = setting_value || '["القليوبية"]'::jsonb
WHERE setting_key = 'app_areas';

-- إضافة خط جديد
UPDATE public.system_settings
SET setting_value = setting_value || '["الخط الرابع"]'::jsonb
WHERE setting_key = 'app_lines';

-- التحقق من النتيجة
SELECT setting_key, setting_value 
FROM system_settings 
WHERE setting_key IN ('app_areas', 'app_lines');
```

---

### **السيناريو 2: إضافة من واجهة الإعدادات (للأدمن)**

في صفحة الإعدادات، يمكن للأدمن:

```typescript
// في كود الـ Settings page
const addArea = async (newArea: string) => {
  const currentAreas = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'app_areas')
    .single();
  
  const updatedAreas = [...currentAreas.data.setting_value, newArea];
  
  await supabase
    .from('system_settings')
    .update({ setting_value: updatedAreas })
    .eq('setting_key', 'app_areas');
};

// نفس الشيء للخطوط
const addLine = async (newLine: string) => {
  const currentLines = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'app_lines')
    .single();
  
  const updatedLines = [...currentLines.data.setting_value, newLine];
  
  await supabase
    .from('system_settings')
    .update({ setting_value: updatedLines })
    .eq('setting_key', 'app_lines');
};
```

---

### **السيناريو 3: إضافة تلقائية عند إنشاء مستخدم/عيادة**

إذا أضاف أحد منطقة أو خط جديد لا يوجد في الإعدادات:

```sql
-- Function لإضافة منطقة تلقائياً إذا لم تكن موجودة
CREATE OR REPLACE FUNCTION public.ensure_area_in_settings(area_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_areas JSONB;
BEGIN
  -- Get current areas
  SELECT setting_value INTO current_areas
  FROM public.system_settings
  WHERE setting_key = 'app_areas';
  
  -- Check if area exists
  IF NOT (current_areas @> to_jsonb(ARRAY[area_name])) THEN
    -- Add it
    UPDATE public.system_settings
    SET setting_value = current_areas || to_jsonb(ARRAY[area_name])
    WHERE setting_key = 'app_areas';
    
    RAISE NOTICE 'Added new area to settings: %', area_name;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- نفس الشيء للخطوط
CREATE OR REPLACE FUNCTION public.ensure_line_in_settings(line_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_lines JSONB;
BEGIN
  SELECT setting_value INTO current_lines
  FROM public.system_settings
  WHERE setting_key = 'app_lines';
  
  IF NOT (current_lines @> to_jsonb(ARRAY[line_name])) THEN
    UPDATE public.system_settings
    SET setting_value = current_lines || to_jsonb(ARRAY[line_name])
    WHERE setting_key = 'app_lines';
    
    RAISE NOTICE 'Added new line to settings: %', line_name;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- استخدام الـ Functions
SELECT ensure_area_in_settings('الشرقية');
SELECT ensure_line_in_settings('الخط الخامس');
```

---

## 🔄 المرونة الكاملة

### **النظام الآن:**

1. ✅ **يقرأ** من قاعدة البيانات (لا localStorage)
2. ✅ **يسمح بالإضافة** الديناميكية للمناطق/الخطوط
3. ✅ **يحافظ على التزامن** بين جميع المستخدمين
4. ✅ **يمكن تعديله** من واجهة الإعدادات أو SQL

---

## 🎯 استراتيجية موصى بها

### **للحفاظ على النظافة:**

#### **1. مزامنة دورية**
شغّل `sync-settings-from-actual-data.sql` كل فترة لتنظيف القيم غير المستخدمة

#### **2. التحقق قبل الإضافة**
قبل إضافة مستخدم أو عيادة، تحقق من أن المنطقة/الخط موجودة في الإعدادات

#### **3. واجهة إدارة**
أنشئ صفحة إعدادات للأدمن لإدارة المناطق/الخطوط:
- ✅ عرض القائمة الحالية
- ✅ إضافة جديد
- ✅ حذف غير مستخدم
- ✅ إعادة التسمية

---

## 📊 استعلامات مفيدة

### **1. عرض المناطق/الخطوط الموجودة**
```sql
SELECT 
  setting_key,
  jsonb_array_length(setting_value) as count,
  setting_value
FROM system_settings
WHERE setting_key IN ('app_areas', 'app_lines');
```

### **2. عرض المناطق/الخطوط المستخدمة فعلياً**
```sql
-- المستخدمة في users
SELECT area, line, COUNT(*) as usage_count
FROM users
WHERE area IS NOT NULL AND line IS NOT NULL
GROUP BY area, line
ORDER BY usage_count DESC;

-- المستخدمة في clinics
SELECT area, line, COUNT(*) as usage_count
FROM clinics
WHERE area IS NOT NULL AND line IS NOT NULL
GROUP BY area, line
ORDER BY usage_count DESC;
```

### **3. إيجاد القيم الموجودة في الإعدادات ولكن غير مستخدمة**
```sql
-- Areas not used
SELECT 
  jsonb_array_elements_text(setting_value) as area
FROM system_settings
WHERE setting_key = 'app_areas'
EXCEPT
SELECT DISTINCT area 
FROM (
  SELECT area FROM users
  UNION
  SELECT area FROM clinics
) t
WHERE area IS NOT NULL;

-- Lines not used
SELECT 
  jsonb_array_elements_text(setting_value) as line
FROM system_settings
WHERE setting_key = 'app_lines'
EXCEPT
SELECT DISTINCT line 
FROM (
  SELECT line FROM users
  UNION
  SELECT line FROM clinics
) t
WHERE line IS NOT NULL;
```

### **4. إزالة القيم غير المستخدمة**
```sql
-- Remove unused areas
UPDATE system_settings
SET setting_value = (
  SELECT jsonb_agg(area)
  FROM (
    SELECT jsonb_array_elements_text(setting_value) as area
    FROM system_settings
    WHERE setting_key = 'app_areas'
  ) t
  WHERE area IN (
    SELECT DISTINCT area FROM users WHERE area IS NOT NULL
    UNION
    SELECT DISTINCT area FROM clinics WHERE area IS NOT NULL
  )
)
WHERE setting_key = 'app_areas';

-- Remove unused lines
UPDATE system_settings
SET setting_value = (
  SELECT jsonb_agg(line)
  FROM (
    SELECT jsonb_array_elements_text(setting_value) as line
    FROM system_settings
    WHERE setting_key = 'app_lines'
  ) t
  WHERE line IN (
    SELECT DISTINCT line FROM users WHERE line IS NOT NULL
    UNION
    SELECT DISTINCT line FROM clinics WHERE line IS NOT NULL
  )
)
WHERE setting_key = 'app_lines';
```

---

## ✅ Checklist النهائي

- [ ] شغّل `check-current-settings.sql` للفحص
- [ ] شغّل `sync-settings-from-actual-data.sql` للمزامنة
- [ ] تحقق من أن القيم صحيحة
- [ ] أعد تشغيل السيرفر
- [ ] تحقق من Console يظهر "Loaded from database"
- [ ] اختبر إضافة منطقة/خط جديد
- [ ] تحقق من أن الإضافة ظهرت لجميع المستخدمين

---

## 🎉 النتيجة

الآن لديك نظام:
- ✅ **مرن** - يمكن إضافة/حذف المناطق والخطوط بسهولة
- ✅ **موثوق** - كل شيء في قاعدة البيانات
- ✅ **متزامن** - جميع المستخدمين يرون نفس القيم
- ✅ **قابل للصيانة** - يمكن تنظيفه وإدارته بسهولة
