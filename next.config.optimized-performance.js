const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // تحسينات الكومبايلر
  reactStrictMode: !isDev,
  
  // تحسين TypeScript في التطوير
  typescript: {
    ignoreBuildErrors: isDev,
  },
  eslint: {
    ignoreDuringBuilds: isDev,
  },
  
  // تحسينات تجريبية لتسريع التطوير
  experimental: {
    ...(isDev && { 
      disableOptimizedLoading: true,
      // تحسين SWC
      swcMinify: true,
    }),
  },
  
  // تحسين الصور
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: isDev ? 60 : 86400, // كاش أقصر في التطوير
    unoptimized: isDev,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // إعادة كتابة مسار صورة التحميل المفقودة
  async rewrites() {
    return [
      {
        source: '/uploads/site/loading_icon_:rest*',
        destination: '/images/loading-fallback.svg',
      },
    ];
  },
  
  // Headers للكاش
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-cache, no-store, must-revalidate' 
              : 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // تحسين Webpack - أداء أفضل
  webpack: (config, { buildId, dev, isServer }) => {
    // تحسين الإنتاج
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // مكتبات React
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
            },
            // مكتبات UI
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `npm.${packageName.replace('@', '')}`;
              },
              priority: 30,
            },
          },
        },
      };
    }
    
    // تحسين Development - كاش أقوى
    if (dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.resolve('.next/cache/webpack'),
        buildDependencies: {
          config: [__filename],
        },
        // كاش أطول
        maxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع
      };
      
      // تقليل التحقق من الملفات
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
        ],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    
    return config;
  },
  
  // إعدادات Turbopack المحسنة
  turbopack: {
    resolveAlias: {
      // Aliases إذا احتجت
    },
  },
  
  // تعطيل header
  poweredByHeader: false,
  
  // تفعيل compression
  compress: true,
  
  // تحسين on-demand entries - أسرع
  onDemandEntries: {
    maxInactiveAge: isDev ? 15 * 1000 : 25 * 1000, // 15 ثانية في التطوير
    pagesBufferLength: 2,
  },
  
  // تحسين الإخراج
  output: 'standalone',
  
  // استبعاد ملفات من الإنتاج
  ...(isDev ? {} : {
    productionBrowserSourceMaps: false,
  }),
};

module.exports = nextConfig;