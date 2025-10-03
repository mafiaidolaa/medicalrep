const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

/**
 * 🚀 إعدادات Next.js محسنة جذرياً للسرعة القصوى
 * - Bundle optimization متقدم
 * - Caching strategies محسنة
 * - Code splitting ذكي
 * - Performance monitoring
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // تحسينات الكومبايلر المتقدمة
  reactStrictMode: !isDev,
  swcMinify: true, // استخدام SWC للضغط (أسرع من Terser)
  
  // تحسينات TypeScript والـ ESLint
  typescript: {
    ignoreBuildErrors: isDev,
  },
  eslint: {
    ignoreDuringBuilds: isDev,
    dirs: ['src'], // فقط المجلدات المطلوبة
  },
  
  // تحسينات تجريبية متقدمة
  experimental: {
    ...(isDev && { 
      disableOptimizedLoading: true,
    }),
    // تحسينات الإنتاج
    ...(!isDev && {
      optimizeCss: true,
      optimizePackageImports: [
        '@radix-ui/react-icons',
        'lucide-react',
        'recharts',
      ],
    }),
    // Server Components محسنة
    serverComponentsExternalPackages: [
      'bcryptjs',
      '@supabase/supabase-js'
    ],
    // تحسين bundling
    bundlePagesRouterDependencies: true,
  },
  
  // تحسينات الصور المتقدمة
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: isDev ? 60 : 31536000, // سنة في الإنتاج
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false, // تفعيل التحسين دائماً
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // تحسين جودة الصور
    quality: isDev ? 50 : 80,
  },
  
  // إعادة كتابة متقدمة
  async rewrites() {
    return [
      // تحسين مسارات الصور
      {
        source: '/uploads/site/loading_icon_:filename',
        destination: '/images/loading-fallback.svg',
      },
      // تحسين API routes
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Headers محسنة للأداء
  async headers() {
    return [
      // API routes caching
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-cache, no-store, must-revalidate' 
              : 'public, max-age=30, stale-while-revalidate=60',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      // Static assets caching محسن
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Fonts caching
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images caching
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
      // Security headers محسنة
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
  
  // Webpack optimization متقدم
  webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
    // تحسينات الإنتاج
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          minRemainingSize: 0,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          enforceSizeThreshold: 50000,
          cacheGroups: {
            default: false,
            vendors: false,
            // React core
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI Libraries
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              priority: 35,
              enforce: true,
            },
            // Charts
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              priority: 30,
              enforce: true,
            },
            // Utilities
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `npm.${packageName.replace('@', '')}`;
              },
              priority: 20,
              minChunks: 2,
            },
            // Common chunks
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      // Tree shaking محسن
      config.optimization.providedExports = true;
      config.optimization.usedExports = true;
      
      // Bundle analyzer في البناء
      if (process.env.ANALYZE === 'true') {
        const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            analyzerPort: 8888,
            openAnalyzer: true,
          })
        );
      }
    }
    
    // تحسينات Development - كاش أقوى
    if (dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.resolve('.next/cache/webpack'),
        buildDependencies: {
          config: [__filename],
        },
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
          '**/.vscode/**',
        ],
        aggregateTimeout: 300,
        poll: false,
      };
      
      // Hot reload محسن
      config.infrastructureLogging = {
        level: 'warn',
      };
    }
    
    // تحسين الـ loaders
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    // تحسين resolve
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
  
  // تحسين on-demand entries
  onDemandEntries: {
    maxInactiveAge: isDev ? 25 * 1000 : 60 * 1000,
    pagesBufferLength: 2,
  },
  
  // تحسين الإخراج
  output: 'standalone',
  distDir: '.next',
  cleanDistDir: true,
  
  // تعطيل headers و telemetry غير المطلوبة
  poweredByHeader: false,
  
  // تحسين compression
  compress: true,
  
  // تحسينات الإنتاج
  ...(isDev ? {} : {
    productionBrowserSourceMaps: false,
    generateEtags: true,
  }),
  
  // إعدادات الـ redirects
  async redirects() {
    return [
      // تحويل المسارات القديمة
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // استبعاد ملفات من الإنتاج
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

module.exports = nextConfig;