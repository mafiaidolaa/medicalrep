# 🎯 نظام سجل الأنشطة المهمة المحسن مع تتبع الموقع الجغرافي

## نظرة عامة

تم تطوير وتحسين نظام سجل الأنشطة ليركز على **الأنشطة المهمة فقط** مع إضافة **تتبع الموقع الجغرافي المتقدم** وتصميم عصري أنيق.

## 🚀 الميزات الجديدة

### ✅ الأنشطة المرغوبة فقط
- 🔐 **تسجيل الدخول والخروج**
- 🏥 **عمل زيارة**
- 🏢 **إضافة عيادة**
- 📋 **عمل طلبية/أوردر**
- 💰 **دفع دين على عيادة**
- 💸 **طلب مصاريف**
- 📊 **عمل خطة**

### 📍 تتبع الموقع الجغرافي المتقدم
- **إحداثيات GPS دقيقة** (خط الطول والعرض)
- **دقة الموقع** (بالأمتار)
- **مصدر الموقع** (GPS، شبكة، سلبي)
- **اسم الموقع** التلقائي باستخدام Reverse Geocoding
- **المدينة والدولة**
- **روابط مباشرة لخرائط Google**

### 🎨 التصميم العصري والأنيق
- **ألوان متدرجة** للأيقونات
- **أيقونات معبرة** لكل نوع نشاط
- **عرض تفاعلي** للموقع الجغرافي
- **تصميم متجاوب** مع جميع الأجهزة

## 📁 الملفات المضافة والمحدثة

### 🆕 ملفات جديدة
```
src/
├── components/activity-log/
│   └── location-display.tsx          # مكون عرض الموقع الجغرافي
├── hooks/
│   └── use-geolocation.ts            # Hook للتعامل مع الموقع الجغرافي
└── enhanced_activity_log_update.sql  # سكريبت تحديث قاعدة البيانات
```

### 🔄 ملفات محدثة
```
src/
├── lib/
│   └── activity-logger.ts            # محسن لدعم الموقع الجغرافي
└── app/(app)/activity-log/
    └── enhanced-activity-log-page.tsx # محدث للأنشطة المهمة والتصميم الجديد
```

## 🛠️ التثبيت والإعداد

### 1. تحديث قاعدة البيانات
```bash
# تطبيق سكريبت التحديث على قاعدة البيانات
psql -h your-host -d your-database -f enhanced_activity_log_update.sql
```

### 2. تحديث Dependencies (إن لزم الأمر)
```bash
npm install
# أو
yarn install
```

## 🎯 الاستخدام

### 📝 تسجيل الأنشطة مع الموقع

#### تسجيل زيارة بموقع GPS
```typescript
import { logVisitWithLocation } from '@/lib/activity-logger';

// الحصول على الموقع الحالي
const location = {
  lat: 24.7136,
  lng: 46.6753,
  accuracy: 12
};

await logVisitWithLocation(
  'visit-123', 
  'عيادة الدكتور أحمد', 
  location
);
```

#### تسجيل طلبية مع الموقع
```typescript
import { logOrderWithLocation } from '@/lib/activity-logger';

await logOrderWithLocation(
  'order-456',
  'عيادة المركز الطبي',
  5000, // المبلغ
  location
);
```

#### تسجيل دفع دين
```typescript
import { logDebtPayment } from '@/lib/activity-logger';

await logDebtPayment(
  'payment-789',
  'عيادة الأسنان الحديثة',
  2500, // المبلغ
  location
);
```

#### طلب مصاريف
```typescript
import { logExpenseRequest } from '@/lib/activity-logger';

await logExpenseRequest(
  'expense-321',
  'بنزين ومواصلات',
  150, // المبلغ
  location
);
```

#### عمل خطة
```typescript
import { logPlan } from '@/lib/activity-logger';

await logPlan(
  'plan-654',
  'خطة زيارات الأسبوع القادم',
  'زيارة 5 عيادات في منطقة الرياض',
  location
);
```

### 🗺️ استخدام مكون عرض الموقع

```typescript
import { LocationDisplay } from '@/components/activity-log/location-display';

// عرض مبسط
<LocationDisplay 
  latitude={24.7136}
  longitude={46.6753}
  variant="inline"
/>

// عرض ككارت مع تفاصيل
<LocationDisplay 
  latitude={24.7136}
  longitude={46.6753}
  locationName="الرياض، المملكة العربية السعودية"
  city="الرياض"
  country="السعودية"
  accuracy={12}
  provider="gps"
  variant="card"
  showAccuracy={true}
/>

// عرض كـ Badge قابل للنقر
<LocationDisplay 
  latitude={24.7136}
  longitude={46.6753}
  variant="badge"
/>
```

### 🧭 استخدام Hook الموقع الجغرافي

```typescript
import { useCurrentLocation } from '@/hooks/use-geolocation';

function MyComponent() {
  const { data, loading, error, getCurrentLocation } = useCurrentLocation({
    enableHighAccuracy: true,
    reverseGeocode: true
  });

  if (loading) return <div>جارِ الحصول على الموقع...</div>;
  if (error) return <div>خطأ: {error}</div>;
  
  return (
    <div>
      {data ? (
        <p>موقعك: {data.latitude}, {data.longitude}</p>
      ) : (
        <button onClick={getCurrentLocation}>
          احصل على موقعي
        </button>
      )}
    </div>
  );
}
```

## 📊 استعلامات قاعدة البيانات المفيدة

### عرض الأنشطة المهمة فقط
```sql
SELECT * FROM public.important_activities 
ORDER BY timestamp DESC;
```

### إحصائيات الأنشطة
```sql
SELECT * FROM public.get_important_activities_stats();
```

### الأنشطة في منطقة جغرافية معينة
```sql
SELECT * FROM public.get_activities_in_radius(
    24.7136,  -- خط العرض
    46.6753,  -- خط الطول
    10,       -- المسافة بالكيلومترات
    ARRAY['visit', 'order']::TEXT[]  -- أنواع الأنشطة (اختياري)
);
```

### مقاييس الأداء
```sql
SELECT * FROM public.activity_performance_metrics;
```

## 🎨 تخصيص التصميم

### تخصيص الألوان
```typescript
// في الملف: enhanced-activity-log-page.tsx
const typeToColor: { [key: string]: string } = {
  login: 'bg-gradient-to-r from-green-500 to-emerald-600',
  logout: 'bg-gradient-to-r from-blue-500 to-blue-600',
  visit: 'bg-gradient-to-r from-purple-500 to-violet-600',
  // ... يمكن تخصيص المزيد
};
```

### إضافة أيقونات جديدة
```typescript
import { NewIcon } from 'lucide-react';

const typeToIcon: { [key: string]: React.ElementType } = {
  login: Key,
  visit: Briefcase,
  new_activity: NewIcon,  // أيقونة جديدة
  // ...
};
```

## 📤 التصدير والطباعة

### طباعة تقرير مخصص
```typescript
const printableData: PrintableData = {
  title: 'تقرير الأنشطة المهمة',
  subtitle: 'تقرير شامل مع معلومات الموقع',
  // ... باقي البيانات
};

// طباعة
print(printableData);

// تصدير PDF
exportToPDF(printableData);
```

## 🔧 استكشاف الأخطاء

### مشاكل الموقع الجغرافي
```typescript
// التحقق من دعم الموقع
if ('geolocation' in navigator) {
  // مدعوم
} else {
  console.error('الموقع الجغرافي غير مدعوم');
}

// معالجة أخطاء الإذن
navigator.geolocation.getCurrentPosition(
  (position) => {
    // نجح
  },
  (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        console.error('تم رفض الإذن');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('الموقع غير متوفر');
        break;
    }
  }
);
```

### مشاكل قاعدة البيانات
```sql
-- فحص الفهارس
SELECT * FROM pg_indexes 
WHERE tablename = 'activity_log';

-- فحص الـ Views
SELECT * FROM pg_views 
WHERE viewname LIKE '%activity%';

-- فحص الإحصائيات
SELECT schemaname, tablename, n_tup_ins, n_tup_upd 
FROM pg_stat_user_tables 
WHERE tablename = 'activity_log';
```

## 🚀 الأداء والتحسينات

### الفهارس المضافة
- `idx_activity_log_important_types` - للأنشطة المهمة
- `idx_activity_log_with_location` - للأنشطة التي تحتوي على موقع
- `idx_activity_log_date_type` - للبحث بالتاريخ والنوع
- `idx_activity_log_location_spatial` - للبحث الجغرافي المكاني

### تنظيف البيانات
```sql
-- حذف الأنشطة القديمة غير المهمة (أقدم من 90 يوم)
SELECT public.cleanup_old_activities(90);
```

## 📚 المراجع والموارد

- [Lucide React Icons](https://lucide.dev/)
- [OpenStreetMap Nominatim API](https://nominatim.org/)
- [PostgreSQL PostGIS](https://postgis.net/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 المساهمة

للمساهمة في تطوير النظام:

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 🎉 الخلاصة

تم تطوير نظام سجل الأنشطة المهمة ليوفر:

- ✅ **تركيز على الأنشطة المهمة فقط**
- 📍 **تتبع دقيق للموقع الجغرافي**
- 🎨 **تصميم عصري وأنيق**
- 📊 **تقارير شاملة ومفصلة**
- 🖨️ **نظام طباعة متطور**
- 🚀 **أداء محسن**

النظام الآن جاهز للاستخدام ويوفر تجربة محسنة لتتبع ومراقبة الأنشطة المهمة في النظام! 🎊