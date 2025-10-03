# دليل تطبيق تسجيل النشاط الشامل

## الحالة الحالية

### ✅ ما تم تنفيذه:
1. **نظام طلب إذن الموقع عند تسجيل الدخول** - مكتمل
2. **تسجيل عمليات تسجيل الدخول مع الموقع** - مكتمل
3. **تسجيل عمليات تسجيل العيادات** - مكتمل
4. **إصلاح جدول activity_log** - يحتاج لتشغيل SQL Script

### ❌ ما يحتاج للتنفيذ:

## العمليات المطلوب تسجيلها

### 1. تسجيل الدخول والخروج
- ✅ **تسجيل الدخول**: مكتمل مع الموقع
- ❌ **تسجيل الخروج**: موجود في الكود لكن قد يحتاج تحسين

### 2. إدارة العيادات
- ✅ **إضافة عيادة جديدة**: مكتمل
- ❌ **تحديث بيانات عيادة**: غير مطبق
- ❌ **حذف عيادة**: غير مطبق

### 3. الطلبات (Orders)
- ❌ **إنشاء طلب جديد**: غير مطبق
- ❌ **تحديث حالة طلب**: غير مطبق
- ❌ **إلغاء طلب**: غير مطبق

### 4. الزيارات (Visits)  
- ❌ **تسجيل زيارة جديدة**: غير مطبق
- ❌ **تحديث بيانات زيارة**: غير مطبق

### 5. المصروفات (Expenses)
- ❌ **إنشاء طلب مصروفات**: غير مطبق
- ❌ **الموافقة على مصروفات**: غير مطبق
- ❌ **رفض مصروفات**: غير مطبق

### 6. السداد والتحصيل
- ❌ **تسجيل سداد**: غير مطبق
- ❌ **تسجيل تحصيل**: غير مطبق

### 7. إدارة المستخدمين
- ❌ **إضافة مستخدم جديد**: غير مطبق
- ❌ **تحديث بيانات مستخدم**: غير مطبق
- ❌ **حذف مستخدم**: غير مطبق

## خطة التنفيذ

### المرحلة 1: إصلاح قاعدة البيانات
```sql
-- تشغيل السكريبت الذي تم إنشاؤه
-- fix-activity-log-schema.sql
```

### المرحلة 2: تحسين تسجيل النشاط الأساسي
```typescript
// إضافة تسجيل النشاط في العمليات التالية:

// 1. تسجيل الخروج
await logActivity('logout', {
  title: `تسجيل خروج - ${user.fullName}`,
  details: 'تم تسجيل الخروج بنجاح',
  entityType: 'authentication',
  entityId: user.id
});

// 2. الطلبات
await logActivity('order_create', {
  title: `طلب جديد - ${clinic.name}`,
  details: `تم إنشاء طلب بقيمة ${totalAmount} جنيه`,
  entityType: 'order',
  entityId: orderId
});

// 3. الزيارات
await logActivity('visit', {
  title: `زيارة - ${clinic.name}`,
  details: 'تم تسجيل زيارة جديدة',
  entityType: 'visit',
  entityId: visitId
});

// 4. المصروفات
await logActivity('expense_request', {
  title: `طلب مصروفات - ${amount} جنيه`,
  details: `طلب مصروفات: ${description}`,
  entityType: 'expense',
  entityId: expenseId
});

// 5. السداد
await logActivity('payment', {
  title: `سداد - ${clinic.name}`,
  details: `تم سداد مبلغ ${amount} جنيه`,
  entityType: 'payment',
  entityId: paymentId
});
```

### المرحلة 3: تحسين عرض سجل النشاط
- إضافة فلاتر حسب نوع النشاط
- عرض معلومات الموقع بشكل أفضل
- إضافة رسوم بيانية للنشاط

## نماذج التنفيذ

### إضافة تسجيل النشاط لعملية جديدة

```typescript
// في بداية الملف
import { logActivity } from '@/lib/activity-logger-client';

// داخل دالة العملية
const createOrder = async (orderData) => {
  try {
    // تنفيذ العملية
    const newOrder = await saveOrder(orderData);
    
    // تسجيل النشاط
    await logActivity('order_create', {
      title: `طلب جديد - ${orderData.clinicName}`,
      details: `تم إنشاء طلب #${newOrder.id} بقيمة ${newOrder.totalAmount} جنيه`,
      entityType: 'order',
      entityId: newOrder.id,
      isSuccess: true
    });
    
    return newOrder;
  } catch (error) {
    // تسجيل الفشل
    await logActivity('order_create', {
      title: `فشل إنشاء طلب - ${orderData.clinicName}`,
      details: `خطأ: ${error.message}`,
      entityType: 'order',
      entityId: 'failed',
      isSuccess: false
    });
    
    throw error;
  }
};
```

## المتطلبات الفنية

### 1. قاعدة البيانات
- تشغيل سكريبت `fix-activity-log-schema.sql`
- التأكد من وجود جميع الأعمدة المطلوبة

### 2. أنواع النشاط المدعومة
```typescript
type ActivityType = 
  | 'login' 
  | 'logout' 
  | 'visit' 
  | 'clinic_register'
  | 'clinic_update'
  | 'clinic_delete'
  | 'order_create'
  | 'order_update'
  | 'order_cancel'
  | 'expense_request'
  | 'expense_approve'
  | 'expense_reject'
  | 'payment_create'
  | 'collection_create'
  | 'user_create'
  | 'user_update'
  | 'user_delete';
```

### 3. فلاتر سجل النشاط
- حسب نوع النشاط
- حسب المستخدم
- حسب التاريخ
- حسب وجود الموقع
- حسب حالة النجاح/الفشل

## الأولويات

### عالية الأولوية (ينفذ فوراً)
1. إصلاح قاعدة البيانات (SQL Script)
2. تسجيل الطلبات الجديدة
3. تسجيل الزيارات
4. تسجيل تسجيل الخروج

### متوسطة الأولوية
1. تسجيل المصروفات
2. تسجيل السداد والتحصيل
3. تحسين عرض سجل النشاط

### منخفضة الأولوية
1. تسجيل إدارة المستخدمين
2. إضافة رسوم بيانية
3. إضافة تقارير تفصيلية

## خطوات التنفيذ المباشرة

1. **تشغيل السكريبت**: `fix-activity-log-schema.sql` في Supabase
2. **اختبار تسجيل الدخول**: للتأكد من عدم وجود أخطاء
3. **إضافة تسجيل النشاط للطلبات**
4. **إضافة تسجيل النشاط للزيارات**
5. **اختبار جميع العمليات**

## مراقبة الأداء

- تتبع حجم جدول activity_log
- إضافة آلية تنظيف السجلات القديمة
- مراقبة أداء استعلامات سجل النشاط