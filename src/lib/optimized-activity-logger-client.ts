"use client";

type CriticalActivityType = 'login' | 'logout' | 'visit' | 'order' | 'clinic_register';

interface BaseActivityPayload {
  title: string;
  details?: string;
  entityType?: string;
  entityId?: string;
  isSuccess?: boolean;
  failureReason?: string;
}

// نظام تحكم قوي في معدل الطلبات - client side
const recentClientLogs = new Map<string, number>();
const CLIENT_THROTTLE_MS = 10 * 60 * 1000; // 10 دقائق
const MAX_CLIENT_CACHE = 50;

function cleanupClientCache() {
  const now = Date.now();
  const cutoff = now - CLIENT_THROTTLE_MS;
  
  for (const [key, timestamp] of recentClientLogs.entries()) {
    if (timestamp < cutoff) {
      recentClientLogs.delete(key);
    }
  }
  
  if (recentClientLogs.size > MAX_CLIENT_CACHE) {
    const entries = Array.from(recentClientLogs.entries());
    entries.sort((a, b) => b[1] - a[1]);
    recentClientLogs.clear();
    entries.slice(0, Math.floor(MAX_CLIENT_CACHE * 0.7)).forEach(([key, ts]) => {
      recentClientLogs.set(key, ts);
    });
  }
}

// تشغيل التنظيف كل 5 دقائق
setInterval(cleanupClientCache, 5 * 60 * 1000);

// دالة محسّنة لتسجيل العمليات المهمة فقط
export const logCriticalActivity = async (type: CriticalActivityType, payload: BaseActivityPayload): Promise<boolean> => {
  try {
    // التحقق من الـ throttling
    const logKey = `${type}-${payload.entityId || 'unknown'}`;
    const now = Date.now();
    const lastLog = recentClientLogs.get(logKey);
    
    if (lastLog && (now - lastLog) < CLIENT_THROTTLE_MS) {
      // تم تسجيل هذه العملية مؤخراً - تخطي بصمت
      return true;
    }
    
    // تسجيل وقت هذه العملية
    recentClientLogs.set(logKey, now);
    
    // تنظيف الذاكرة إذا لزم الأمر
    if (recentClientLogs.size > MAX_CLIENT_CACHE) {
      cleanupClientCache();
    }
    
    // إرسال البيانات بشكل غير متزامن مع timeout قصير
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        title: payload.title,
        details: payload.details || '',
        entityType: payload.entityType || type,
        entityId: payload.entityId || 'unknown',
        isSuccess: payload.isSuccess ?? true,
        failureReason: payload.failureReason,
        timestamp: new Date().toISOString(),
        ingestSource: 'optimized_client'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const result = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Critical activity logged: ${type} - ${payload.title}`);
      }
      return true;
    }
    
    return false;
    
  } catch (error) {
    // فشل صامت - لا نعطل تجربة المستخدم
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to log critical activity:', error);
    }
    return false;
  }
};

// دوال محسّنة للعمليات المهمة فقط
export const logCriticalLogin = async (user: { id: string; name: string }, isSuccess: boolean = true) => {
  if (!isSuccess) return false; // نسجل النجاح فقط
  
  return logCriticalActivity('login', {
    title: `تسجيل دخول - ${user.name}`,
    details: 'تم تسجيل الدخول بنجاح',
    entityType: 'auth',
    entityId: user.id,
    isSuccess: true
  });
};

export const logCriticalLogout = async (user: { id: string; name: string }) => {
  return logCriticalActivity('logout', {
    title: `تسجيل خروج - ${user.name}`,
    details: 'تم تسجيل الخروج',
    entityType: 'auth',
    entityId: user.id,
    isSuccess: true
  });
};

export const logCriticalVisit = async (clinic: { id: string; name: string }) => {
  return logCriticalActivity('visit', {
    title: `زيارة - ${clinic.name}`,
    details: 'تم القيام بزيارة',
    entityType: 'visit',
    entityId: clinic.id,
    isSuccess: true
  });
};

export const logCriticalOrder = async (clinic: { id: string; name: string }, orderId: string, totalAmount?: number) => {
  return logCriticalActivity('order', {
    title: `طلبية - ${clinic.name}`,
    details: totalAmount ? `طلبية بقيمة ${totalAmount} جنيه` : 'تم إنشاء طلبية',
    entityType: 'order',
    entityId: orderId,
    isSuccess: true
  });
};

export const logCriticalClinicRegistration = async (clinic: { id: string; name: string }) => {
  return logCriticalActivity('clinic_register', {
    title: `تسجيل عيادة - ${clinic.name}`,
    details: 'تم تسجيل عيادة جديدة',
    entityType: 'clinic',
    entityId: clinic.id,
    isSuccess: true
  });
};

// دالة مساعدة للتحقق من إمكانية التسجيل (للاستخدام في التطبيق)
export const canLogActivity = (type: CriticalActivityType, entityId?: string): boolean => {
  const logKey = `${type}-${entityId || 'unknown'}`;
  const lastLog = recentClientLogs.get(logKey);
  return !lastLog || (Date.now() - lastLog) >= CLIENT_THROTTLE_MS;
};

// دالة لمسح الذاكرة المؤقتة (للاستخدام عند تسجيل الخروج مثلاً)
export const clearActivityCache = () => {
  recentClientLogs.clear();
};

// معلومات إحصائية (للمطورين)
export const getActivityCacheStats = () => {
  return {
    cacheSize: recentClientLogs.size,
    maxCacheSize: MAX_CLIENT_CACHE,
    throttleMinutes: CLIENT_THROTTLE_MS / (60 * 1000),
    entries: Array.from(recentClientLogs.entries()).map(([key, timestamp]) => ({
      key,
      timestamp: new Date(timestamp).toISOString(),
      minutesAgo: Math.floor((Date.now() - timestamp) / (60 * 1000))
    }))
  };
};