# 🎨 دليل استخدام LoadingSpinner المحسن

## 📋 نظرة عامة

يوفر النظام مكونات متعددة لعرض Loading Spinners بتصاميم وخيارات متنوعة:

1. **`LoadingSpinner`** - المكون الأساسي المحسن
2. **`EnhancedLoadingSpinner`** - المكون المتقدم لشاشة البداية
3. **`QuickLoadingSpinner`** - المكون السريع للاستخدام في Suspense
4. **`AdvancedTemplatePreloader`** - المكون للنماذج الجاهزة المتقدمة

## 🚀 الاستخدام الأساسي

### LoadingSpinner المحسن

```typescript
import { LoadingSpinner, useLoadingSpinner } from '@/components/loading-spinner';

// الاستخدام البسيط
function MyPage() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return <div>المحتوى</div>;
}

// مع خيارات مخصصة
function CustomLoading() {
  return (
    <LoadingSpinner
      size="lg"
      animation="wave"
      speed="fast"
      color="#667eea"
      message="جاري تحميل البيانات..."
      showLogo={true}
      showTitle={true}
      fullScreen={false}
      className="my-4"
    />
  );
}

// استخدام Hook المخصص
function SmartLoading() {
  const { settings, LoadingComponent } = useLoadingSpinner();
  
  return (
    <LoadingComponent 
      message="رسالة مخصصة"
      size="sm"
    />
  );
}
```

### EnhancedLoadingSpinner للشاشة الرئيسية

```typescript
import { EnhancedLoadingSpinner } from '@/components/enhanced-loading-spinner';

// في layout.tsx أو التطبيق الرئيسي
<Suspense fallback={<EnhancedLoadingSpinner />}>
  <AuthProvider>
    {children}
  </AuthProvider>
</Suspense>

// مع callback مخصص
function MainApp() {
  const [loading, setLoading] = useState(true);
  
  return (
    <>
      {loading && (
        <EnhancedLoadingSpinner 
          onComplete={() => setLoading(false)}
          overrideSettings={{
            animation_type: 'pulse',
            show_progress: true
          }}
        />
      )}
      {!loading && <AppContent />}
    </>
  );
}
```

### QuickLoadingSpinner للاستخدام السريع

```typescript
import { QuickLoadingSpinner } from '@/components/loading-spinner';

// في lazy wrappers أو Suspense
<Suspense fallback={<QuickLoadingSpinner message="تحميل المحتوى..." />}>
  <LazyComponent />
</Suspense>

// في lazy-wrapper.tsx
export const LoadingSpinner = QuickLoadingSpinner;
```

## ⚙️ الخيارات والإعدادات

### LoadingSpinner Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | حجم المكون |
| `animation` | `AnimationType` | من الإعدادات | نوع الأنيميشن |
| `speed` | `'slow' \| 'normal' \| 'fast'` | من الإعدادات | سرعة الأنيميشن |
| `color` | `string` | من الإعدادات | لون الأنيميشن |
| `message` | `string` | من الإعدادات | رسالة التحميل |
| `showLogo` | `boolean` | `true` | عرض الشعار |
| `showTitle` | `boolean` | `true` | عرض عنوان التطبيق |
| `fullScreen` | `boolean` | `true` | عرض بكامل الشاشة |
| `background` | `string` | من الإعدادات | لون الخلفية |
| `className` | `string` | - | CSS classes إضافية |

### أنواع الأنيميشن المتاحة

1. **`spin`** - دوران كلاسيكي ⭕
2. **`pulse`** - نبضة مع ping effect 💫
3. **`bounce`** - نقاط قافزة ⚽
4. **`wave`** - موجة متحركة 🌊
5. **`dots`** - نقاط متتالية ⚫
6. **`scale`** - تكبير وتصغير 📏
7. **`fade`** - تلاشي وظهور 👻

### أحجام المتاحة

- **`sm`** - صغير (48px logo, h-4 spinner)
- **`md`** - متوسط (64px logo, h-5 spinner) - افتراضي
- **`lg`** - كبير (80px logo, h-6 spinner)
- **`xl`** - كبير جداً (96px logo, h-8 spinner)

## 🔧 التكامل مع الإعدادات

النظام يقرأ الإعدادات تلقائياً من:

### إعدادات قاعدة البيانات

```typescript
// الحقول المستخدمة من site_settings
preloader_enabled: boolean
preloader_animation_type: AnimationType
preloader_animation_speed: AnimationSpeed
preloader_animation_color: string
preloader_logo_size: number
preloader_show_logo: boolean
preloader_show_app_name: boolean
preloader_logo_animation: boolean
preloader_loading_message: string
preloader_custom_subtitle: string
preloader_background_color: string
preloader_text_color: string
preloader_blur_background: boolean
preloader_show_progress: boolean
preloader_min_display_time: number
preloader_fade_out_duration: number
preloader_active_template: string
```

### ترتيب أولوية الشعارات

1. `loading_icon_path` - شعار التحميل المخصص
2. `logo_path` - الشعار الرئيسي
3. `icon_path` - أيقونة النظام
4. `localStorage['brand-logos']` - الشعارات المحفوظة محلياً
5. الشعار الافتراضي `/logo.png`

## 🎨 النماذج المتقدمة

### استخدام النماذج الجاهزة

```typescript
import { AdvancedTemplatePreloader } from '@/components/advanced-template-preloader';
import { getTemplateById } from '@/components/preloader-templates';

function App() {
  const template = getTemplateById('modern');
  
  return (
    <AdvancedTemplatePreloader
      isVisible={true}
      template={template!}
      onComplete={() => console.log('تم التحميل')}
    />
  );
}
```

### النماذج المتاحة

1. **🌟 العصري المتطور** (`modern`) - تدرجات لونية وأنيميشن موجي
2. **🪟 الزجاجي الشفاف** (`glassy`) - تأثير Glassmorphism
3. **💼 المهني الراقي** (`professional`) - تصميم مؤسسي
4. **👻 الشبحي الشفاف** (`transparent`) - شفافية كاملة
5. **⚡ النيون المشع** (`neon`) - تأثيرات نيون مشعة
6. **🌸 الأنيق البسيط** (`elegant`) - بساطة راقية
7. **🚀 المستقبلي المتطور** (`futuristic`) - تأثيرات ثلاثية الأبعاد

## 🛠️ صفحات الاختبار

### Preloader Studio (`/preloader-studio`)

صفحة متقدمة لاختبار جميع النماذج مع:
- معاينة مباشرة لجميع النماذج
- تطبيق النماذج على النظام
- بحث وتصفية
- إدارة المفضلة
- لوحة إعدادات شاملة

### Test Preloader (`/test-preloader`)

صفحة بسيطة لاختبار الإعدادات المختلفة مع:
- تجربة إعدادات محددة مسبقاً
- اختبار النظام المحسن
- لوحة تحكم أساسية

## 🎯 أفضل الممارسات

### 1. الاستخدام في الصفحات

```typescript
// ❌ خطأ - استخدام مباشر في كل مرة
function Page() {
  const [loading, setLoading] = useState(true);
  return loading ? (
    <div className="min-h-screen flex items-center justify-center">
      <svg className="animate-spin...">...</svg>
    </div>
  ) : <Content />;
}

// ✅ صحيح - استخدام المكون المحسن
function Page() {
  const [loading, setLoading] = useState(true);
  return loading ? (
    <LoadingSpinner 
      fullScreen={true}
      message="جاري تحميل الصفحة..."
    />
  ) : <Content />;
}
```

### 2. في Suspense Boundaries

```typescript
// ✅ صحيح - استخدام QuickLoadingSpinner
<Suspense fallback={<QuickLoadingSpinner message="تحميل..." />}>
  <LazyComponent />
</Suspense>

// أو استخدام المكون المحسن
<Suspense fallback={
  <LoadingSpinner 
    size="sm" 
    fullScreen={false} 
    showLogo={false}
    showTitle={false}
  />
}>
  <LazyComponent />
</Suspense>
```

### 3. في Layout الرئيسي

```typescript
// ✅ الطريقة المثلى للـ layout
<Suspense fallback={<EnhancedLoadingSpinner />}>
  <AuthProvider>
    {children}
  </AuthProvider>
</Suspense>
```

### 4. للتحميل المشروط

```typescript
function DataPage() {
  const { settings, LoadingComponent } = useLoadingSpinner();
  const { data, loading, error } = useQuery('data');
  
  if (loading) return <LoadingComponent message="جاري تحميل البيانات..." />;
  if (error) return <ErrorComponent />;
  return <DataDisplay data={data} />;
}
```

## 🔍 استكشاف الأخطاء

### المشاكل الشائعة

1. **الشعار لا يظهر**
   - تحقق من مسار الشعار في الإعدادات
   - تأكد من وجود الملف
   - راجع console للأخطاء

2. **الأنيميشن لا تعمل**
   - تأكد من تضمين CSS المناسب
   - تحقق من إعدادات animation_type
   - راجع Browser DevTools

3. **الإعدادات لا تطبق**
   - تأكد من حفظ الإعدادات في قاعدة البيانات
   - تحقق من Site Settings Context
   - راجع Network tab للطلبات

### تسجيل Debug

```typescript
// تفعيل التسجيل في development
if (process.env.NODE_ENV === 'development') {
  console.log('LoadingSpinner settings:', settings);
}
```

## 📚 مراجع إضافية

- [AdvancedPreloader Documentation](../advanced-preloader/README.md)
- [Preloader Templates Guide](../preloader-templates/README.md)
- [Site Settings Context](../../contexts/README.md)

## 🆕 التحديثات الأخيرة

### الإصدار الحالي (2024)

- ✅ تحسين LoadingSpinner الأصلي
- ✅ إضافة دعم أنواع أنيميشن متقدمة
- ✅ تكامل مع إعدادات قاعدة البيانات
- ✅ Hook مخصص للإدارة السهلة
- ✅ مكون سريع للـ Suspense
- ✅ دعم النماذج الجاهزة
- ✅ صفحات اختبار متقدمة

### الميزات القادمة

- 🔄 المزيد من النماذج
- 🔄 تأثيرات أنيميشن إضافية
- 🔄 دعم PWA للتحميل
- 🔄 تحسينات الأداء