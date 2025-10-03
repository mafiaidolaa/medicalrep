// Middleware محسن للأداء والأمان
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// قائمة المسارات المحمية
const protectedPaths = [
  '/accounting',
  '/activity-log', 
  '/clinics',
  '/orders',
  '/plans',
  '/reports',
  '/settings',
  '/stock',
  '/users',
  '/visits'
];

// قائمة المسارات العامة
const publicPaths = [
  '/login',
  '/register', 
  '/forgot-password',
  '/reset-password'
];

// قائمة الموارد الثابتة
const staticAssets = [
  '/_next/static/',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/sw-enhanced.js',
  '/icons/',
  '/images/',
  '/api/health'
];

export async function middleware(request: NextRequest) {
  // Allow skipping middleware during local development for stability
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_MIDDLEWARE === 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Critical: never interfere with NextAuth endpoints
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // إضافة headers للأمان والأداء
  addSecurityHeaders(response);
  addPerformanceHeaders(response, pathname);
  
  // معالجة الموارد الثابتة
  if (isStaticAsset(pathname)) {
    return addStaticAssetHeaders(response);
  }

  // معالجة API routes
  if (pathname.startsWith('/api/')) {
    return addAPIHeaders(response);
  }

  // معالجة المسارات العامة
  if (isPublicPath(pathname)) {
    return addPublicPathHeaders(response);
  }

  // معالجة المسارات المحمية مع تحقق مصادقة خفيف
  if (isProtectedPath(pathname)) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return addProtectedPathHeaders(response);
  }

  // إعادة توجيه المستخدم المصادق عليه بعيداً عن /login
  if (pathname === '/login') {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch { /* ignore */ }
  }

  // إضافة headers عامة للصفحات
  return addPageHeaders(response);
}

// فحص إذا كان المسار من الموارد الثابتة
function isStaticAsset(pathname: string): boolean {
  return staticAssets.some(asset => pathname.startsWith(asset));
}

// فحص إذا كان المسار عام
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

// فحص إذا كان المسار محمي
function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(path => pathname.startsWith(path));
}

// إضافة headers الأمان
function addSecurityHeaders(response: NextResponse): void {
  // الحماية من XSS
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // منع MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // منع Clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Content Security Policy مبسط
  // Allow broader connections in development to avoid blocking local APIs/HMR (e.g., http/ws)
  const isDev = process.env.NODE_ENV !== 'production';
  const connectSrc = isDev
    ? "connect-src 'self' http: https: ws: wss:"
    : "connect-src 'self' https: wss:";

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      connectSrc,
      "frame-src 'self' https://maps.google.com",
    ].join('; ')
  );
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
}

// إضافة headers الأداء
function addPerformanceHeaders(response: NextResponse, pathname: string): void {
  // إضافة Server Timing للتطوير
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Server-Timing', `middleware;dur=${Date.now()}`);
  }
  
  // Early Hints للموارد المهمة
  if (pathname === '/') {
    response.headers.set(
      'Link',
      [
        '</manifest.json>; rel=preload; as=fetch',
        '<https://fonts.googleapis.com>; rel=preconnect',
        '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
      ].join(', ')
    );
  }
}

// إضافة headers للموارد الثابتة
function addStaticAssetHeaders(response: NextResponse): NextResponse {
  // Cache طويل للموارد الثابتة
  response.headers.set(
    'Cache-Control',
    'public, max-age=31536000, immutable'
  );
  
  // Compression
  response.headers.set('Vary', 'Accept-Encoding');
  
  return response;
}

// إضافة headers لـ API routes
function addAPIHeaders(response: NextResponse): NextResponse {
  // منع caching للAPI routes
  response.headers.set(
    'Cache-Control',
    'no-cache, no-store, max-age=0, must-revalidate'
  );
  
  // CORS headers (حسب الحاجة)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

// إضافة headers للمسارات العامة
function addPublicPathHeaders(response: NextResponse): NextResponse {
  // Cache قصير للصفحات العامة
  response.headers.set(
    'Cache-Control',
    'public, max-age=300, s-maxage=600'
  );
  
  return response;
}

// إضافة headers للمسارات المحمية
function addProtectedPathHeaders(response: NextResponse): NextResponse {
  // عدم cache للصفحات المحمية
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, max-age=0, must-revalidate'
  );
  
  // إضافة header للحماية الإضافية
  response.headers.set('X-Protected-Route', 'true');
  
  return response;
}

// إضافة headers عامة للصفحات
function addPageHeaders(response: NextResponse): NextResponse {
  // Cache متوسط للصفحات العادية
  response.headers.set(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
  );
  
  // إضافة Vary headers للتحسين
  response.headers.set('Vary', 'Accept-Encoding, Accept, User-Agent');
  
  return response;
}

// تكوين Matcher
export const config = {
  matcher: [
    // استثناء جميع مسارات الـ API وملفات Next الثابتة والملفات الشائعة
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};

// تصدير دوال مساعدة للاستخدام في مكان آخر
export { 
  isStaticAsset,
  isPublicPath,
  isProtectedPath 
};