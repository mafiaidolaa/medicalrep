// إعدادات محسنة خصيصاً لـ AWS Free Tier (t2.micro: 1 vCPU, 1GB RAM)

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ========================================
  // 🚀 تحسينات AWS Free Tier المتخصصة
  // ========================================
  
  // إعدادات أساسية محسنة للسيرفر
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  
  // تحسينات الذاكرة - حاسمة للـ 1GB RAM
  compiler: {
    removeConsole: true, // إزالة console.log في الإنتاج
    styledComponents: false, // تعطيل إذا لم نستخدمها
  },
  
  // تحسينات تجريبية للأداء
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons', 
      'date-fns',
      'clsx'
    ],
    // تحسين خاص للسيرفر
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // تحسين الصور - مخفض للـ Free Tier
  images: {
    formats: ['image/webp'], // WebP فقط لتوفير المعالجة
    deviceSizes: [640, 828, 1200], // أحجام مخفضة
    imageSizes: [32, 64, 128], // أحجام أقل
    minimumCacheTTL: 86400,
    quality: 75, // جودة متوازنة
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // تحسينات Webpack مُخصصة للـ Free Tier
  webpack: (config, { buildId, dev, isServer, webpack }) => {
    if (!dev) {
      // تحسين شديد للذاكرة
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
        
        // Bundle splitting محسن للـ 1GB RAM
        splitChunks: {
          chunks: 'all',
          minSize: 30000,
          maxSize: 150000, // أصغر chunks للـ Free Tier
          maxAsyncRequests: 5, // مخفض
          maxInitialRequests: 3, // مخفض
          cacheGroups: {
            // Vendors مُحسن
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              maxSize: 200000, // حد أقصى للـ vendors
            },
            // Common code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              maxSize: 100000,
            },
            // CSS مُنفصل
            styles: {
              name: 'styles',
              type: 'css/mini-extract',
              chunks: 'all',
              priority: 20,
            }
          },
        },
      };
      
      // تحسين إضافي للإنتاج
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
          'process.env.AWS_FREE_TIER': JSON.stringify('true'),
        })
      );
    }
    
    // تحسين Resolve للسرعة
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
      },
      // تسريع البحث
      symlinks: false,
      cacheWithContext: false,
    };
    
    // تحسين للـ Server-side
    if (isServer) {
      config.externals = ['canvas', 'jsdom', ...config.externals];
    }
    
    return config;
  },
  
  // Headers محسنة للـ CDN والكاش
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          
          // Performance headers للـ Free Tier
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        // API caching مُحسن
        source: '/api/((?!auth|admin).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=600' },
        ],
      },
      {
        // Static assets - كاش طويل
        source: '/(_next/static|images|icons)/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  
  // Redirects محسنة
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // تحسين Pages - مُخفض للـ Free Tier
  onDemandEntries: {
    maxInactiveAge: 30 * 1000, // 30 ثانية فقط
    pagesBufferLength: 2, // صفحتين فقط في الذاكرة
  },
  
  // إعدادات Production
  output: 'standalone',
  trailingSlash: false,
  
  // تحسين TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint مُعطل في البناء لتوفير الذاكرة
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;