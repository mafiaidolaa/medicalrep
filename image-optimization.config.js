// إعدادات تحسين الصور لـ Next.js
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

module.exports = imageOptimizations;