# 🖼️ دليل تحسين الصور والأصول

## تحسين الصور:

### 1. استخدام Next.js Image:
```jsx
// ❌ سيء
<img src="/image.jpg" alt="صورة" />

// ✅ جيد  
<Image 
  src="/image.jpg" 
  alt="صورة"
  width={500}
  height={300}
  priority={true}
/>
```

### 2. تحسين أحجام الصور:
- **للصور الكبيرة:** استخدم WebP أو AVIF
- **للأيقونات:** استخدم SVG  
- **للصور الصغيرة:** PNG محسن
- **للصور الفوتوغرافية:** JPEG بجودة 75-85%

### 3. استخدام placeholder:
```jsx
<Image
  src="/image.jpg"
  placeholder="blur" 
  blurDataURL="data:image/jpeg;base64,..."
/>
```

## تحسين الأصول:

### 1. ضغط الصور:
```bash
# تثبيت أدوات الضغط
npm install -D imagemin imagemin-mozjpeg imagemin-pngquant

# ضغط الصور تلقائياً
npm run optimize:images
```

### 2. تحسين SVG:
```bash
# تحسين ملفات SVG
npx svgo public/**/*.svg
```

### 3. تحسين الخطوط:
```jsx
// استخدام نخت محسن
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})
```

## نصائح الأداء:

1. **استخدم priority للصور المهمة**
2. **اضبط sizes بشكل صحيح** 
3. **استخدم lazy loading للصور غير المرئية**
4. **احفظ الصور بالحجم المناسب**
5. **استخدم CDN للصور الكبيرة**

## الأوامر المفيدة:

```bash
# فحص حجم الأصول
npm run analyze:assets

# ضغط الصور  
npm run compress:images

# تحسين SVG
npm run optimize:svg
```
