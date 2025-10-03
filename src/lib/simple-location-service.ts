interface SimpleLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
}

interface SimpleLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  showToasts?: boolean;
}

class SimpleLocationService {
  private lastLocation: SimpleLocationData | null = null;
  private permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';

  /**
   * طلب إذن الموقع بدون أي رسائل مزعجة
   */
  async requestLocationSilently(options: SimpleLocationOptions = {}): Promise<SimpleLocationData | null> {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 300000,
      showToasts = false
    } = options;

    // التحقق من دعم الجيولوكيشن
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.debug('Geolocation is not supported');
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: SimpleLocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          this.lastLocation = locationData;
          this.permissionStatus = 'granted';
          console.debug('Location obtained silently:', locationData);
          resolve(locationData);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              this.permissionStatus = 'denied';
              console.debug('Location permission denied silently');
              break;
            case error.POSITION_UNAVAILABLE:
              console.debug('Location position unavailable');
              break;
            case error.TIMEOUT:
              console.debug('Location request timeout');
              break;
            default:
              console.debug('Unknown location error:', error.message);
          }
          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );
    });
  }

  /**
   * الحصول على آخر موقع معروف
   */
  getLastLocation(): SimpleLocationData | null {
    return this.lastLocation;
  }

  /**
   * التحقق من حالة الإذن
   */
  getPermissionStatus(): 'granted' | 'denied' | 'prompt' | 'unknown' {
    return this.permissionStatus;
  }

  /**
   * طلب الموقع مع عرض رسائل للمستخدم
   */
  async requestLocationWithToast(showToast: (message: any) => void, activityName: string): Promise<SimpleLocationData | null> {
    // عرض رسالة طلب الإذن
    showToast({
      title: "طلب إذن الموقع",
      description: `السماح بالوصول للموقع سيساعد في تسجيل ${activityName} بدقة أكبر`,
      duration: 3000,
    });

    const location = await this.requestLocationSilently({ showToasts: true });

    if (location) {
      showToast({
        title: "تم الحصول على الموقع بنجاح",
        description: `تم تسجيل موقعك لنشاط: ${activityName}`,
        duration: 2000,
      });
    } else if (this.permissionStatus === 'denied') {
      showToast({
        title: "تم رفض إذن الموقع",
        description: "يمكنك تفعيله من إعدادات المتصفح إذا أردت",
        variant: "destructive" as const,
        duration: 3000,
      });
    }

    return location;
  }
}

// إنشاء instance واحد
export const simpleLocationService = new SimpleLocationService();

/**
 * دالة بسيطة لتسجيل الأنشطة مع الموقع
 */
export async function logSimpleActivity(
  type: string,
  title: string,
  details: any,
  userId?: string,
  requestLocation = false,
  showToast?: (message: any) => void,
  activityDisplayName?: string
): Promise<boolean> {
  // ⚡ Performance: تعطيل Activity Log في Development إذا كان مفعل
  if (process.env.NEXT_PUBLIC_DISABLE_ACTIVITY_LOG === 'true') {
    console.debug('🚫 Activity logging disabled by env variable');
    return true; // نرجع true علشان ماتأثرش على باقي الكود
  }
  
  let location: SimpleLocationData | null = null;

  // محاولة الحصول على الموقع إذا طُلب
  if (requestLocation) {
    if (showToast && activityDisplayName) {
      location = await simpleLocationService.requestLocationWithToast(showToast, activityDisplayName);
    } else {
      location = await simpleLocationService.requestLocationSilently();
    }
  } else {
    // استخدام آخر موقع معروف إذا كان متاحاً
    location = simpleLocationService.getLastLocation();
  }

  // تحضير بيانات النشاط
  const activityData = {
    type,
    title,
    details: typeof details === 'string' ? details : JSON.stringify(details),
    timestamp: new Date().toISOString(),
    user_id: userId || 'anonymous',
    action: type,
    entity_type: type,
    entity_id: details?.id || null,
    is_success: true,
    
    // بيانات الموقع
    lat: location?.latitude || null,
    lng: location?.longitude || null,
    location_accuracy: location?.accuracy || null,
    location_source: 'gps',
    
    // بيانات تقنية بسيطة
    device: getDeviceType(),
    browser: getBrowserName(),
    os: getOSName(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    
    created_at: new Date().toISOString()
  };

  try {
    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData),
    });

    if (response.ok) {
      console.log(`✅ Activity logged successfully: ${type} - ${title}`);
      return true;
    } else {
      console.warn(`❌ Failed to log activity: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

// وظائف مساعدة بسيطة
function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
  }
  return 'Desktop';
}

function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOSName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}