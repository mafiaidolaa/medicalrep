// إعدادات تسجيل النشاط المحسّنة
export const ACTIVITY_LOG_CONFIG = {
  // تفعيل/إلغاء تسجيل النشاط
  ENABLED: process.env.DISABLE_ACTIVITY_LOG !== 'true',
  
  // تفعيل/إلغاء تسجيل زيارات الصفحات العادية
  LOG_PAGE_VISITS: false, // تم إلغاؤه لتحسين الأداء
  
  // العمليات المهمة فقط التي نريد تسجيلها
  CRITICAL_ACTIVITIES: [
    'login',
    'logout', 
    'visit',
    'order',
    'clinic_register'
  ],
  
  // التحكم في معدل الطلبات
  THROTTLE: {
    // المدة بالدقائق لتجنب تسجيل نفس العملية
    MIDDLEWARE_THROTTLE_MINUTES: 15,
    CLIENT_THROTTLE_MINUTES: 10,
    SERVER_THROTTLE_SECONDS: 5,
    
    // حجم الذاكرة المؤقتة
    MAX_CACHE_SIZE: 100,
    CLEANUP_INTERVAL_MINUTES: 5
  },
  
  // المسارات التي نتخطاها تماماً
  SKIP_PATHS: [
    // ملفات ثابتة
    '/api/',
    '/_next',
    '/favicon.ico',
    '/_vercel',
    '/__next',
    '/sw.js',
    '/manifest.json',
    '/sitemap.xml',
    '/robots.txt',
    '/offline',
    
    // صفحات عادية (لا نسجلها لتحسين الأداء)
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
  ],
  
  // المسارات المهمة فقط التي نريد تسجيلها
  IMPORTANT_PATHS: [
    '/login',
    '/logout',
    '/api/visits',
    '/api/orders',
    '/api/clinics/register',
    '/api/auth/signin',
    '/api/auth/signout'
  ],
  
  // إعدادات البيئة
  DEVELOPMENT: {
    ENABLED: true,
    VERBOSE_LOGGING: true,
    SKIP_SERVER_READY_CHECK: false
  },
  
  PRODUCTION: {
    ENABLED: true,
    VERBOSE_LOGGING: false,
    FAIL_SILENTLY: true
  },
  
  // إعدادات الطلبات
  REQUEST_SETTINGS: {
    TIMEOUT_MS: 1000,
    RETRY_ATTEMPTS: 0, // لا نعيد المحاولة لتجنب البطء
    ASYNC_ONLY: true // كل الطلبات غير متزامنة
  }
};

// دالة مساعدة للتحقق من ضرورة تسجيل المسار
export function shouldLogPath(pathname: string): boolean {
  if (!ACTIVITY_LOG_CONFIG.ENABLED) return false;
  
  // تخطي المسارات المُستبعدة
  const shouldSkip = ACTIVITY_LOG_CONFIG.SKIP_PATHS.some(path => 
    pathname.startsWith(path)
  );
  
  if (shouldSkip) return false;
  
  // فقط المسارات المهمة
  const isImportant = ACTIVITY_LOG_CONFIG.IMPORTANT_PATHS.some(path => 
    pathname.startsWith(path)
  );
  
  return isImportant;
}

// دالة للتحقق من العملية المهمة
export function isCriticalActivity(activityType: string): boolean {
  return ACTIVITY_LOG_CONFIG.CRITICAL_ACTIVITIES.includes(activityType);
}

// دالة للحصول على إعدادات البيئة الحالية
export function getCurrentEnvConfig() {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? ACTIVITY_LOG_CONFIG.DEVELOPMENT : ACTIVITY_LOG_CONFIG.PRODUCTION;
}

// دالة لتوليد مفتاح الـ throttle
export function generateThrottleKey(userId: string, activityType: string, entityId?: string): string {
  return `${userId}-${activityType}-${entityId || 'general'}`;
}

// دالة للتحقق من انتهاء مدة الـ throttle
export function isThrottleExpired(lastTimestamp: number, throttleMs: number): boolean {
  return (Date.now() - lastTimestamp) >= throttleMs;
}