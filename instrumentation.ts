// ملف مراقبة الأداء - Next.js 15 Instrumentation
export async function register() {
  // تسجيل أدوات مراقبة الأداء
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // مراقبة الخادم
    console.log('[Instrumentation] Server instrumentation loaded');
    
    // يمكن إضافة مراقبة مخصصة هنا
    // مثال: تتبع أداء قاعدة البيانات، API calls، إلخ
    
    // تسجيل بدء التطبيق
    console.log('[Performance] Application started:', new Date().toISOString());
    
    // مراقبة استخدام الذاكرة - محسنة للتطوير
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_MEMORY_MONITORING === 'true') {
      let memoryCheckCount = 0;
      setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const currentMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        // Log only every 5th check (every 2.5 minutes) or if memory usage is high
        if (memoryCheckCount % 5 === 0 || currentMB > 100) {
          console.log('[Performance] Memory Usage:', {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
            heapUsed: currentMB + 'MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          });
        }
        memoryCheckCount++;
      }, 30000); // كل 30 ثانية لكن يسجل كل 5 مرات أو عند استخدام عالي للذاكرة
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // مراقبة Edge Runtime
    console.log('[Instrumentation] Edge runtime instrumentation loaded');
  }
}

// دالة لتتبع الأداء المخصص
export function trackPerformance(name: string, startTime: number) {
  const duration = Date.now() - startTime;
  console.log(`[Performance] ${name}: ${duration}ms`);
  
  // يمكن إرسال البيانات لخدمة مراقبة خارجية
  if (process.env.NODE_ENV === 'production') {
    // إرسال للخدمة المخصصة أو Analytics
    // مثال: sendToAnalytics({ name, duration });
  }
}

// دالة لتتبع أخطاء الأداء
export function trackError(error: Error, context?: string) {
  console.error(`[Performance Error] ${context || 'Unknown'}:`, error);
  
  if (process.env.NODE_ENV === 'production') {
    // إرسال التقرير لخدمة مراقبة الأخطاء
    // مثال: sendErrorReport({ error, context });
  }
}