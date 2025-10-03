// إعدادات التطوير المؤقتة
// EP Group System - Dev Configuration

export const DEV_CONFIG = {
  // تعطيل بعض الميزات في التطوير لتسريع النظام
  DISABLE_AUTH_IN_DEV: process.env.NODE_ENV === 'development',
  ENABLE_MOCK_DATA: process.env.NODE_ENV === 'development',
  SKIP_SLOW_CHECKS: process.env.NODE_ENV === 'development',
  
  // إعدادات الأداء
  CACHE_TIMEOUT: process.env.NODE_ENV === 'development' ? 1000 : 60000, // 1 ثانية في التطوير
  DEBOUNCE_DELAY: 300,
  
  // إعدادات API
  API_TIMEOUT: 5000, // 5 ثواني
  RETRY_ATTEMPTS: 2,
  
  // Mock user للتطوير
  MOCK_USER: {
    id: 'dev-user-123',
    username: 'dev-user',
    full_name: 'مطور النظام',
    role: 'admin',
    email: 'dev@epgroup.com'
  }
};

// دالة مساعدة للتحقق من بيئة التطوير
export const isDev = () => process.env.NODE_ENV === 'development';

// دالة للحصول على مستخدم وهمي في التطوير
export const getDevUser = () => {
  if (isDev()) {
    return DEV_CONFIG.MOCK_USER;
  }
  return null;
};

// دالة للتحقق من التأخير المناسب
export const getDebounceDelay = () => DEV_CONFIG.DEBOUNCE_DELAY;

// دالة للحصول على timeout API
export const getApiTimeout = () => DEV_CONFIG.API_TIMEOUT;