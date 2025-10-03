import { activityLogger } from './activity-logger';

// نوع البيانات للموقع الصامت
interface SilentLocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  provider?: 'gps' | 'network' | 'passive';
  locationName?: string;
  city?: string;
  country?: string;
}

// خيارات تتبع الأنشطة الصامتة
interface SilentTrackingOptions {
  enableLocationTracking?: boolean;
  maxLocationWaitTime?: number; // الحد الأقصى للانتظار للحصول على الموقع
  fallbackOnLocationFailure?: boolean; // متابعة حتى لو فشل الحصول على الموقع
}

class SilentActivityTracker {
  private static instance: SilentActivityTracker;
  private locationCache: SilentLocationData | null = null;
  private locationCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  private constructor() {}

  public static getInstance(): SilentActivityTracker {
    if (!SilentActivityTracker.instance) {
      SilentActivityTracker.instance = new SilentActivityTracker();
    }
    return SilentActivityTracker.instance;
  }

  // الحصول على الموقع بصمت تام
  private async getLocationSilently(maxWaitTime: number = 8000): Promise<SilentLocationData | null> {
    // استخدام الكاش إذا كان حديث
    if (this.locationCache && (Date.now() - this.locationCacheTime) < this.CACHE_DURATION) {
      return this.locationCache;
    }

    return new Promise((resolve) => {
      // مهلة زمنية قصيرة لضمان عدم تأخير النظام
      const timeoutId = setTimeout(() => {
        resolve(null);
      }, maxWaitTime);

      if (!navigator?.geolocation) {
        clearTimeout(timeoutId);
        resolve(null);
        return;
      }

      try {
        // محاولة أولى بدقة عالية ومهلة قصيرة
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            clearTimeout(timeoutId);
            
            const { latitude, longitude, accuracy } = position.coords;
            
            // تحديد نوع المزود
            let provider: 'gps' | 'network' | 'passive' = 'passive';
            if (accuracy <= 20) provider = 'gps';
            else if (accuracy <= 100) provider = 'network';

            let locationInfo: any = {};
            
            // محاولة الحصول على اسم الموقع بصمت (مع مهلة قصيرة جداً)
            try {
              const geoResponse = await Promise.race([
                fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=ar,en`,
                  { 
                    headers: { 'User-Agent': 'EP-Group-System/1.0' },
                    signal: AbortSignal.timeout(3000)
                  }
                ),
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
              ]);

              if (geoResponse && geoResponse.ok) {
                const geoData = await geoResponse.json();
                locationInfo = {
                  locationName: geoData.display_name || '',
                  city: geoData.address?.city || geoData.address?.town || '',
                  country: geoData.address?.country || ''
                };
              }
            } catch {
              // فشل صامت في Reverse Geocoding
            }

            const location: SilentLocationData = {
              lat: latitude,
              lng: longitude,
              accuracy,
              provider,
              ...locationInfo
            };

            // حفظ في الكاش
            this.locationCache = location;
            this.locationCacheTime = Date.now();
            
            resolve(location);
          },
          () => {
            // إذا فشلت المحاولة الأولى، جرب بإعدادات أقل دقة
            navigator.geolocation.getCurrentPosition(
              (position) => {
                clearTimeout(timeoutId);
                
                const location: SilentLocationData = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  provider: 'network'
                };

                this.locationCache = location;
                this.locationCacheTime = Date.now();
                resolve(location);
              },
              () => {
                clearTimeout(timeoutId);
                resolve(null);
              },
              {
                enableHighAccuracy: false,
                timeout: Math.min(5000, maxWaitTime - 1000),
                maximumAge: 600000 // 10 دقائق
              }
            );
          },
          {
            enableHighAccuracy: true,
            timeout: Math.min(5000, maxWaitTime - 2000),
            maximumAge: this.CACHE_DURATION
          }
        );
      } catch {
        clearTimeout(timeoutId);
        resolve(null);
      }
    });
  }

  // تسجيل نشاط بصمت مع محاولة الحصول على الموقع
  private async trackActivitySilently(
    activityType: string,
    activityData: any,
    options: SilentTrackingOptions = {}
  ): Promise<void> {
    const {
      enableLocationTracking = true,
      maxLocationWaitTime = 6000,
      fallbackOnLocationFailure = true
    } = options;

    try {
      let locationData: SilentLocationData | null = null;

      // محاولة الحصول على الموقع إذا كان مطلوباً
      if (enableLocationTracking) {
        locationData = await this.getLocationSilently(maxLocationWaitTime);
      }

      // إعداد بيانات النشاط
      const logData = {
        ...activityData,
        latitude: locationData?.lat,
        longitude: locationData?.lng,
        location_accuracy: locationData?.accuracy,
        location_provider: locationData?.provider || 'unknown',
        location_name: locationData?.locationName,
        city: locationData?.city,
        country: locationData?.country
      };

      // تسجيل النشاط (سيتم بصمت حتى لو لم نحصل على الموقع)
      await activityLogger.log(logData);
      
    } catch (error) {
      // فشل صامت - لا نريد إظهار أي رسائل للمستخدم
      console.debug('Silent activity tracking failed:', error);
    }
  }

  // دوال تسجيل الأنشطة المختلفة بصمت

  async trackLogin(userId: string, success: boolean = true, failureReason?: string): Promise<void> {
    await this.trackActivitySilently('login', {
      action: 'user_login',
      entity_type: 'auth',
      entity_id: userId,
      title: success ? 'تسجيل دخول ناجح' : 'محاولة تسجيل دخول فاشلة',
      details: success ? 'تم تسجيل الدخول بنجاح' : `فشل تسجيل الدخول: ${failureReason}`,
      type: 'login',
      is_success: success,
      failure_reason: failureReason
    });
  }

  async trackLogout(userId: string): Promise<void> {
    await this.trackActivitySilently('logout', {
      action: 'user_logout',
      entity_type: 'auth',
      entity_id: userId,
      title: 'تسجيل خروج',
      details: 'تم تسجيل الخروج من النظام',
      type: 'logout'
    });
  }

  async trackVisit(visitId: string, clinicName: string, details?: string): Promise<void> {
    await this.trackActivitySilently('visit', {
      action: 'create_visit',
      entity_type: 'visit',
      entity_id: visitId,
      title: `زيارة: ${clinicName}`,
      details: details || `تم القيام بزيارة لعيادة ${clinicName}`,
      type: 'visit'
    });
  }

  async trackOrder(orderId: string, clinicName: string, amount: number): Promise<void> {
    await this.trackActivitySilently('order', {
      action: 'create_order',
      entity_type: 'order',
      entity_id: orderId,
      title: `طلبية: ${clinicName}`,
      details: `تم إنشاء طلبية لعيادة ${clinicName} بقيمة ${amount} ريال`,
      type: 'order'
    });
  }

  async trackDebtPayment(paymentId: string, clinicName: string, amount: number): Promise<void> {
    await this.trackActivitySilently('debt_payment', {
      action: 'pay_debt',
      entity_type: 'payment',
      entity_id: paymentId,
      title: `دفع دين: ${clinicName}`,
      details: `تم دفع دين لعيادة ${clinicName} بمبلغ ${amount} ريال`,
      type: 'debt_payment'
    });
  }

  async trackExpenseRequest(expenseId: string, description: string, amount: number): Promise<void> {
    await this.trackActivitySilently('expense_request', {
      action: 'request_expense',
      entity_type: 'expense',
      entity_id: expenseId,
      title: `طلب مصاريف: ${description}`,
      details: `تم طلب مصاريف: ${description} بقيمة ${amount} ريال`,
      type: 'expense_request'
    });
  }

  async trackPlan(planId: string, title: string, description?: string): Promise<void> {
    await this.trackActivitySilently('plan', {
      action: 'create_plan',
      entity_type: 'plan',
      entity_id: planId,
      title: `عمل خطة: ${title}`,
      details: description || `تم إنشاء خطة جديدة: ${title}`,
      type: 'plan'
    });
  }

  // دالة خاصة لتسجيل العيادات مع إعلام المستخدم (غير صامتة)
  async trackClinicRegistration(clinicId: string, clinicName: string, showLocationPrompt: boolean = true): Promise<SilentLocationData | null> {
    if (!showLocationPrompt) {
      // إذا لم نرد إظهار رسائل، استخدم النظام الصامت
      await this.trackActivitySilently('clinic_register', {
        action: 'register_clinic',
        entity_type: 'clinic',
        entity_id: clinicId,
        title: `تسجيل عيادة: ${clinicName}`,
        details: `تم تسجيل عيادة جديدة: ${clinicName}`,
        type: 'clinic_register'
      });
      return null;
    }

    // للعيادات مع إعلام المستخدم، نستخدم النظام العادي
    try {
      const location = await this.getLocationSilently(10000); // مهلة أطول للعيادات

      await activityLogger.log({
        action: 'register_clinic',
        entity_type: 'clinic',
        entity_id: clinicId,
        title: `تسجيل عيادة: ${clinicName}`,
        details: `تم تسجيل عيادة جديدة: ${clinicName}`,
        type: 'clinic_register',
        latitude: location?.lat,
        longitude: location?.lng,
        location_accuracy: location?.accuracy,
        location_provider: location?.provider,
        location_name: location?.locationName,
        city: location?.city,
        country: location?.country
      });

      return location;
    } catch (error) {
      // حتى في حالة الخطأ، نسجل النشاط بدون موقع
      await activityLogger.log({
        action: 'register_clinic',
        entity_type: 'clinic',
        entity_id: clinicId,
        title: `تسجيل عيادة: ${clinicName}`,
        details: `تم تسجيل عيادة جديدة: ${clinicName}`,
        type: 'clinic_register'
      });
      
      return null;
    }
  }

  // مسح الكاش (للاستخدام عند تغيير الموقع)
  clearLocationCache(): void {
    this.locationCache = null;
    this.locationCacheTime = 0;
  }

  // فحص إتاحة خدمات الموقع
  isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }
}

// تصدير المثيل الواحد
export const silentActivityTracker = SilentActivityTracker.getInstance();

// دوال مساعدة للاستخدام السهل
export const trackLoginSilently = (userId: string, success: boolean = true, failureReason?: string) =>
  silentActivityTracker.trackLogin(userId, success, failureReason);

export const trackLogoutSilently = (userId: string) =>
  silentActivityTracker.trackLogout(userId);

export const trackVisitSilently = (visitId: string, clinicName: string, details?: string) =>
  silentActivityTracker.trackVisit(visitId, clinicName, details);

export const trackOrderSilently = (orderId: string, clinicName: string, amount: number) =>
  silentActivityTracker.trackOrder(orderId, clinicName, amount);

export const trackDebtPaymentSilently = (paymentId: string, clinicName: string, amount: number) =>
  silentActivityTracker.trackDebtPayment(paymentId, clinicName, amount);

export const trackExpenseRequestSilently = (expenseId: string, description: string, amount: number) =>
  silentActivityTracker.trackExpenseRequest(expenseId, description, amount);

export const trackPlanSilently = (planId: string, title: string, description?: string) =>
  silentActivityTracker.trackPlan(planId, title, description);

export const trackClinicRegistration = (clinicId: string, clinicName: string, showLocationPrompt: boolean = true) =>
  silentActivityTracker.trackClinicRegistration(clinicId, clinicName, showLocationPrompt);

// واجهة تتبع الأنشطة الموحدة للاستخدام في المزودات
export class ActivityTracker {
  static async trackActivity(activityData: {
    type: string;
    title: string;
    details?: string;
    isSuccess?: boolean;
    location?: any;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    try {
      // إرسال البيانات إلى API
      const response = await fetch('/api/activity-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: activityData.type,
          title: activityData.title,
          details: activityData.details || '',
          isSuccess: activityData.isSuccess ?? true,
          entityType: activityData.entityType || activityData.type,
          entityId: activityData.entityId,
          // بيانات الموقع
          lat: activityData.location?.lat,
          lng: activityData.location?.lng,
          locationName: activityData.location?.locationName,
          city: activityData.location?.city,
          country: activityData.location?.country,
          accuracy: activityData.location?.accuracy,
          source: activityData.location?.source || activityData.location?.provider,
          // بيانات الجهاز
          device: activityData.location?.device || detectDevice(),
          browser: activityData.location?.browser || detectBrowser(),
          browserVersion: activityData.location?.browserVersion,
          os: activityData.location?.os || detectOS(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success && !result.throttled) {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (error) {
      // تسجيل الخطأ في وحدة التحكم فقط (صامت)
      console.debug('Activity tracking failed (silent):', error);
    }
  }
}

// دوال مساعدة لكشف معلومات الجهاز
function detectDevice(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
    if (/ipad|tablet/.test(userAgent)) return 'Tablet';
    return 'Mobile';
  }
  return 'Desktop';
}

function detectBrowser(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  return 'Unknown';
}

function detectOS(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}
