const fs = require('fs');
const path = require('path');

console.log('🖼️ تحسين الصور والأصول الثابتة\n');

// فحص مجلد public للصور
function analyzePublicAssets() {
  const publicPath = './public';
  
  if (!fs.existsSync(publicPath)) {
    console.log('❌ مجلد public غير موجود');
    return;
  }
  
  console.log('🔍 فحص الأصول في مجلد public...\n');
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
  const assets = [];
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
          const sizeKB = (stat.size / 1024).toFixed(1);
          assets.push({
            path: filePath.replace('./public/', '/'),
            size: stat.size,
            sizeKB,
            extension: ext
          });
        }
      }
    });
  }
  
  scanDirectory(publicPath);
  
  // تحليل النتائج
  console.log(`📊 تم العثور على ${assets.length} ملف صورة:`);
  console.log('');
  
  assets.sort((a, b) => b.size - a.size);
  
  let totalSize = 0;
  let largeImages = [];
  
  assets.forEach(asset => {
    totalSize += asset.size;
    console.log(`📄 ${asset.path} - ${asset.sizeKB}KB`);
    
    if (asset.size > 100000) { // أكبر من 100KB
      largeImages.push(asset);
    }
  });
  
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`\n📦 إجمالي حجم الصور: ${totalSizeMB}MB`);
  
  if (largeImages.length > 0) {
    console.log(`\n⚠️  صور كبيرة تحتاج تحسين (${largeImages.length}):`);
    largeImages.forEach(img => {
      console.log(`🔴 ${img.path} - ${img.sizeKB}KB`);
    });
  } else {
    console.log('\n✅ جميع الصور بأحجام مقبولة');
  }
}

// إنشاء إعدادات تحسين الصور
function createImageOptimizationConfig() {
  const config = `// إعدادات تحسين الصور لـ Next.js
// استخدم هذا في next.config.js

const imageOptimizations = {
  images: {
    // تحسين الأحجام
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // تحسين التنسيقات  
    formats: ['image/webp', 'image/avif'],
    
    // تحسين الجودة
    quality: 75,
    
    // Cache optimization
    minimumCacheTTL: 60 * 60 * 24 * 7, // أسبوع
    
    // Domains للصور الخارجية
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    
    // تحسين Loading
    loader: 'default',
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  }
};

module.exports = imageOptimizations;`;

  fs.writeFileSync('./image-optimization.config.js', config);
  console.log('✅ تم إنشاء إعدادات تحسين الصور: image-optimization.config.js');
}

// إنشاء مكون Image محسن
function createOptimizedImageComponent() {
  const component = `import Image from 'next/image';
import { useState } from 'react';

// مكون صورة محسن مع fallback
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height, 
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={\`flex items-center justify-center bg-gray-200 \${className}\`}>
        <span className="text-gray-500 text-sm">صورة غير متاحة</span>
      </div>
    );
  }

  return (
    <div className={\`relative overflow-hidden \${className}\`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={\`transition-opacity duration-300 \${
          isLoading ? 'opacity-0' : 'opacity-100'
        }\`}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

// مكون Avatar محسن
export const OptimizedAvatar = ({ 
  src, 
  alt, 
  size = 40,
  className = '' 
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}) => {
  return (
    <OptimizedImage
      src={src || '/default-avatar.png'}
      alt={alt}
      width={size}
      height={size}
      className={\`rounded-full \${className}\`}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAABBQEBAQEBAQAAAAAAAAAEAQIDBQAGByARIv/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltC"
    />
  );
};

export default OptimizedImage;`;

  if (!fs.existsSync('./src/components/ui')) {
    fs.mkdirSync('./src/components/ui', { recursive: true });
  }
  
  fs.writeFileSync('./src/components/ui/optimized-image.tsx', component);
  console.log('✅ تم إنشاء مكون الصور المحسن: src/components/ui/optimized-image.tsx');
}

// إنشاء دليل تحسين الأصول
function createAssetsGuide() {
  const guide = `# 🖼️ دليل تحسين الصور والأصول

## تحسين الصور:

### 1. استخدام Next.js Image:
\`\`\`jsx
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
\`\`\`

### 2. تحسين أحجام الصور:
- **للصور الكبيرة:** استخدم WebP أو AVIF
- **للأيقونات:** استخدم SVG  
- **للصور الصغيرة:** PNG محسن
- **للصور الفوتوغرافية:** JPEG بجودة 75-85%

### 3. استخدام placeholder:
\`\`\`jsx
<Image
  src="/image.jpg"
  placeholder="blur" 
  blurDataURL="data:image/jpeg;base64,..."
/>
\`\`\`

## تحسين الأصول:

### 1. ضغط الصور:
\`\`\`bash
# تثبيت أدوات الضغط
npm install -D imagemin imagemin-mozjpeg imagemin-pngquant

# ضغط الصور تلقائياً
npm run optimize:images
\`\`\`

### 2. تحسين SVG:
\`\`\`bash
# تحسين ملفات SVG
npx svgo public/**/*.svg
\`\`\`

### 3. تحسين الخطوط:
\`\`\`jsx
// استخدام نخت محسن
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})
\`\`\`

## نصائح الأداء:

1. **استخدم priority للصور المهمة**
2. **اضبط sizes بشكل صحيح** 
3. **استخدم lazy loading للصور غير المرئية**
4. **احفظ الصور بالحجم المناسب**
5. **استخدم CDN للصور الكبيرة**

## الأوامر المفيدة:

\`\`\`bash
# فحص حجم الأصول
npm run analyze:assets

# ضغط الصور  
npm run compress:images

# تحسين SVG
npm run optimize:svg
\`\`\`
`;

  fs.writeFileSync('./ASSETS_OPTIMIZATION.md', guide);
  console.log('✅ تم إنشاء دليل تحسين الأصول: ASSETS_OPTIMIZATION.md');
}

// تشغيل تحسين الأصول
function runAssetsOptimization() {
  console.log('🚀 بدء تحسين الأصول...\n');
  
  analyzePublicAssets();
  console.log('');
  
  createImageOptimizationConfig();
  createOptimizedImageComponent(); 
  createAssetsGuide();
  
  console.log('\n🎉 تم تحسين الأصول!');
  console.log('\n📋 الخطوات التالية:');
  console.log('1. راجع ملف ASSETS_OPTIMIZATION.md');
  console.log('2. استخدم OptimizedImage بدلاً من img'); 
  console.log('3. طبق إعدادات image-optimization.config.js');
}

runAssetsOptimization();