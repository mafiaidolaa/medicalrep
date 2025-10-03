import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// قائمة المسارات العامة التي لا تحتاج مصادقة
const PUBLIC_PATHS = ['/login', '/offline'];

// نظام التخزين المؤقت لمنع الطلبات المتكررة
const recentLogs = new Map<string, number>();
const THROTTLE_MINUTES = 15; // لا نسجل نفس العملية إلا كل 15 دقيقة
const THROTTLE_MS = THROTTLE_MINUTES * 60 * 1000;
const MAX_CACHE_SIZE = 100;

// تنظيف ذاكرة التخزين المؤقت
function cleanupThrottleCache() {
  const now = Date.now();
  const cutoff = now - THROTTLE_MS;
  
  for (const [key, timestamp] of recentLogs.entries()) {
    if (timestamp < cutoff) {
      recentLogs.delete(key);
    }
  }
  
  // تقليل حجم الذاكرة إذا كانت كبيرة
  if (recentLogs.size > MAX_CACHE_SIZE) {
    const entries = Array.from(recentLogs.entries());
    entries.sort((a, b) => b[1] - a[1]); // الأحدث أولاً
    recentLogs.clear();
    entries.slice(0, MAX_CACHE_SIZE * 0.7).forEach(([key, ts]) => {
      recentLogs.set(key, ts);
    });
  }
}

// تشغيل التنظيف كل 5 دقائق
setInterval(cleanupThrottleCache, 5 * 60 * 1000);

// قائمة المسارات التي يجب تخطيها من middleware
const STATIC_PATHS = [
  '/_next',
  '/favicon',
  '/logo',
  '/static',
  '/images',
  '/api/', // Skip all API routes
  '/api/auth', // NextAuth endpoints (redundant but explicit)
  '/api/activity-log', // Skip logging requests themselves
];

// قائمة المسارات التي لا نريد تسجيلها في activity log (محسّنة جداً)
const SKIP_LOGGING_PATHS = [
  '/api/',
  '/offline',
  '/_next',
  '/favicon.ico',
  '/_vercel',
  '/__next',
  '/sw.js',
  '/manifest.json',
  '/sitemap.xml',
  '/robots.txt',
  // تخطي جميع الصفحات العادية - نسجل فقط العمليات المهمة
  '/accounting',
  '/orders',
  '/visits',
  '/reports',
  '/users',
  '/settings',
  '/activity-log',
  '/dashboard',
  '/stock',
  '/plans',
  '/notifications',
  '/clinics',
  '/maps'
];

// فقط المسارات التي نريد تسجيلها - العمليات المهمة فقط
const IMPORTANT_LOGGING_PATHS = [
  '/login',
  '/logout',
  // العمليات المهمة جداً فقط
  '/api/visits',
  '/api/orders',
  '/api/clinics/register',
  '/api/auth/signin',
  '/api/auth/signout'
];

// دالة للتحقق من صحة الجلسة
function isValidSession(token: any): boolean {
  if (!token) return false;
  
  // التحقق من وجود البيانات الأساسية
  if (!token.id || !token.role || !token.username) return false;
  
  // التحقق من انتهاء الجلسة
  const now = Math.floor(Date.now() / 1000);
  if (token.exp && token.exp < now) return false;
  
  return true;
}

export async function middleware(request: NextRequest) {
  // Optional: disable this duplicate middleware to reduce overhead in development
  if (process.env.NEXT_PUBLIC_DISABLE_SRC_MIDDLEWARE === 'true') {
    return NextResponse.next();
  }
  const { pathname } = request.nextUrl;

  // تخطي الملفات الثابتة و API routes
  if (
    STATIC_PATHS.some(path => pathname.startsWith(path)) ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // السماح بالمسارات العامة
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  
  // جلب الـ token للتحقق من المصادقة
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  
  // التحقق من صحة الجلسة
  const hasValidSession = isValidSession(token);
  
  // إعادة توجيه المستخدمين غير المصادق عليهم
  if (!hasValidSession && !isPublicPath) {
    console.log(`🚫 Unauthorized access attempt to: ${pathname}`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // إعادة توجيه المستخدمين المصادق عليهم من صفحة تسجيل الدخول
  if (hasValidSession && pathname === '/login') {
    console.log(`✅ Authenticated user redirected from login to dashboard`);
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // إنشاء استجابة مع headers أمنية
  const response = NextResponse.next();
  
  // إضافة Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  
  // إضافة معلومات الجلسة للـ headers (للاستخدام في client)
  if (hasValidSession) {
    response.headers.set('X-User-Authenticated', 'true');
    response.headers.set('X-User-Role', token?.role || 'unknown');
  }

  // تسجيل العمليات المهمة فقط (محسّن جداً)
  if (hasValidSession && !isPublicPath) {
    // السماح بتعطيل تسجيل النشاط عبر متغيرات البيئة
    if (process.env.DISABLE_ACTIVITY_LOG === 'true' || process.env.NEXT_PUBLIC_DISABLE_ACTIVITY_LOG === 'true') {
      return response;
    }
    
    // ✅ تخطي جميع الصفحات العادية - نسجل فقط العمليات المهمة جداً
    const shouldSkip = SKIP_LOGGING_PATHS.some(path => pathname.startsWith(path));
    const isImportantPath = IMPORTANT_LOGGING_PATHS.some(path => pathname.startsWith(path));
    
    if (shouldSkip || !isImportantPath) {
      return response;
    }

    // ✅ نظام التحكم في معدل الطلبات القوي
    const userId = token?.id || 'anonymous';
    const logKey = `${userId}-${pathname}`;
    const now = Date.now();
    const lastLog = recentLogs.get(logKey);
    
    if (lastLog && (now - lastLog) < THROTTLE_MS) {
      // تم تسجيل هذه العملية مؤخراً - تخطي بصمت
      return response;
    }
    
    // تسجيل وقت هذه العملية
    recentLogs.set(logKey, now);
    
    // تنظيف الذاكرة إذا لزم الأمر
    if (recentLogs.size > MAX_CACHE_SIZE) {
      cleanupThrottleCache();
    }

    // ✅ تسجيل مُحسّن للعمليات المهمة فقط
    const logImportantActivity = async () => {
      try {
        // تخطي في بيئة التطوير إذا لم يكن الخادم جاهزاً
        if (process.env.NODE_ENV === 'development') {
          const isServerReady = request.headers.get('cache-control') !== 'no-cache';
          if (!isServerReady) {
            return;
          }
        }

        // بيانات الأنشطة المهمة فقط
        const activityType = pathname.includes('/login') ? 'login' : 
                           pathname.includes('/logout') ? 'logout' :
                           pathname.includes('/visits') ? 'visit' :
                           pathname.includes('/orders') ? 'order' :
                           pathname.includes('/clinics') ? 'clinic_register' : 'other';
        
        const activityData = {
          type: activityType,
          title: `${activityType === 'login' ? 'تسجيل دخول' : 
                   activityType === 'logout' ? 'تسجيل خروج' : 
                   activityType === 'visit' ? 'زيارة' :
                   activityType === 'order' ? 'طلبية' :
                   activityType === 'clinic_register' ? 'تسجيل عيادة' : 
                   'عملية مهمة'}`,
          details: `تم تنفيذ العملية: ${pathname}`,
          entityType: activityType,
          entityId: pathname,
          isSuccess: true,
          timestamp: new Date().toISOString()
        };

        // إرسال البيانات بشكل غير متزامن مع timeout قصير
        const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800); // timeout قصير
        
        fetch(`${baseUrl}/api/activity-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify(activityData),
          signal: controller.signal
        }).then(() => clearTimeout(timeoutId))
          .catch(() => clearTimeout(timeoutId)); // فشل صامت

      } catch {
        // فشل صامت - لا نعطل تجربة المستخدم
      }
    };

    // تشغيل التسجيل في الخلفية بدون انتظار
    logImportantActivity();
  }

  return response;
}

export const config = {
  /*
   * Match all request paths except for API routes and static files
   * This ensures authentication is checked on all non-API routes only
   */
  matcher: [
    /*
     * Match all request paths except:
     * - api (all API routes, including /api/auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, other common static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
};
