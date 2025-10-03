const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

/**
 * 🔧 إصلاح شامل لمشاكل Next.js الحرجة
 * - إزالة إعدادات Turbopack الخاطئة
 * - إصلاح React Server Components
 * - تحسين الأداء الجذري
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // تحسينات الكومبايلر الأساسية
  reactStrictMode: false, // تعطيل مؤقت لحل مشاكل Turbopack
  
  // إصلاح TypeScript والـ ESLint
  typescript: {
    ignoreBuildErrors: isDev,
  },
  eslint: {
    ignoreDuringBuilds: isDev,
    dirs: ['src'],
  },
  
  // تحسينات تجريبية آمنة فقط
  experimental: {
    // إزالة إعدادات Turbopack المشكلة
    ...(isDev && { 
      disableOptimizedLoading: true,
    }),
  },
  
  // External packages (تم نقلها من experimental)
  serverExternalPackages: [
    'bcryptjs',
    '@supabase/supabase-js'
  ],
  
  // إعدادات الصور الآمنة
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: isDev ? 60 : 86400,
    unoptimized: isDev, // تعطيل optimization في التطوير
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Headers أساسية فقط
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-cache, no-store, must-revalidate' 
              : 'public, max-age=30, stale-while-revalidate=60',
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
  
  // Webpack تحسينات آمنة فقط
  webpack: (config, { dev, isServer }) => {
    // إصلاح مشكلة module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // تحسين Development cache
    if (dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.resolve('.next/cache/webpack'),
        buildDependencies: {
          config: [__filename],
        },
      };
      
      // تقليل watch files
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
        ],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    
    // إضافة alias للتحسين
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
  
  // إعدادات أساسية
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  
  // تحسين on-demand entries
  onDemandEntries: {
    maxInactiveAge: isDev ? 25 * 1000 : 60 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;