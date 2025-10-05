"use client";

import {
  loadCachedLocation,
  saveCachedLocation,
  loadCachedPermission,
  saveCachedPermission,
  isFresh as isFreshCache
} from '@/lib/location-cache';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
  city?: string;
  country?: string;
  source: 'gps' | 'network' | 'manual';
}

export interface LocationPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
}

export interface LocationServiceConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  enableAddressGeocoding: boolean;
}

class LocationService {
  private config: LocationServiceConfig = {
    enableHighAccuracy: false, // تسريع فائق!
    timeout: 10000, // 10 ثوان لمنح الوقت الكافي للأجهزة البطيئة
    maximumAge: 600000, // 10 دقائق
    enableAddressGeocoding: false // تعطيل لتسريع الأداء
  };

  private watchId: number | null = null;
  private lastKnownLocation: LocationData | null = null;
  private inFlightRequest: Promise<LocationData | null> | null = null;
  private permissionState: LocationPermissionState = {
    granted: false,
    denied: false,
    prompt: true
  };

  constructor() {
    // Hydrate from cache if available
    try {
      const cached = loadCachedLocation();
      if (cached) {
        this.lastKnownLocation = {
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy,
          timestamp: cached.timestamp,
          source: 'network'
        };
      }
      const cachedPerm = loadCachedPermission();
      if (cachedPerm) {
        this.permissionState = {
          granted: cachedPerm === 'granted',
          denied: cachedPerm === 'denied',
          prompt: cachedPerm === 'prompt'
        };
      }
    } catch {
      // ignore hydration errors
    }
  }

  /**
   * طلب إذن الوصول للموقع من المستخدم
   */
  async requestLocationPermission(): Promise<LocationPermissionState> {
    if (typeof window === 'undefined') {
      return { granted: false, denied: true, prompt: false, error: 'Window not available' };
    }

    if (!navigator.geolocation) {
      this.permissionState = { granted: false, denied: true, prompt: false, error: 'Geolocation not supported' };
      return this.permissionState;
    }

    try {
      // Check current permission state
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        switch (permission.state) {
          case 'granted':
            this.permissionState = { granted: true, denied: false, prompt: false };
            saveCachedPermission('granted');
            break;
          case 'denied':
            this.permissionState = { granted: false, denied: true, prompt: false };
            saveCachedPermission('denied');
            break;
          case 'prompt':
            this.permissionState = { granted: false, denied: false, prompt: true };
            saveCachedPermission('prompt');
            break;
        }
      }

      // If already granted, return
      if (this.permissionState.granted) {
        return this.permissionState;
      }

      // If denied, return
      if (this.permissionState.denied) {
        return this.permissionState;
      }

      // Request permission by attempting to get current position
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.permissionState = { granted: true, denied: false, prompt: false };
            saveCachedPermission('granted');
            this.lastKnownLocation = this.parsePosition(position);
            resolve(this.permissionState);
          },
          (error) => {
            let errorMessage = 'Unknown error';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'تم رفض إذن الوصول للموقع';
                this.permissionState = { granted: false, denied: true, prompt: false, error: errorMessage };
                saveCachedPermission('denied');
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'الموقع غير متاح';
                this.permissionState = { granted: false, denied: false, prompt: true, error: errorMessage };
                break;
              case error.TIMEOUT:
                errorMessage = 'انتهت مهلة طلب الموقع';
                this.permissionState = { granted: false, denied: false, prompt: true, error: errorMessage };
                break;
            }
            resolve(this.permissionState);
          },
          this.config
        );
      });

    } catch (error) {
      this.permissionState = { 
        granted: false, 
        denied: true, 
        prompt: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      return this.permissionState;
    }
  }

  /**
   * الحصول على الموقع الحالي مع fallback strategies
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    // Ensure geolocation is available (secure context + browser support)
    this.ensureGeolocationAvailable();

    // Check persistent cache first
    const cached = loadCachedLocation();
    if (cached && isFreshCache(cached, this.config.maximumAge)) {
      this.lastKnownLocation = {
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy,
        timestamp: cached.timestamp,
        source: 'network'
      };
      console.debug('💾 استخدام موقع محفوظ (من التخزين)');
      return this.lastKnownLocation;
    }

    // Use in-memory cache if still fresh
    if (this.lastKnownLocation && this.isLocationFresh(this.lastKnownLocation)) {
      console.debug('💾 استخدام موقع محفوظ');
      return this.lastKnownLocation;
    }

    // Deduplicate concurrent requests
    if (this.inFlightRequest) {
      return this.inFlightRequest;
    }

    // Always attempt to get a real location (no skipping or default fallbacks here)
    this.inFlightRequest = this.tryGetLocationWithFallback()
      .finally(() => {
        this.inFlightRequest = null;
      });
    return await this.inFlightRequest;
  }

  /**
   * محاولة الحصول على الموقع مع استراتيجيات متعددة
   */
  private async tryGetLocationWithFallback(): Promise<LocationData | null> {
    // Strategy 0: If we have any cached location (fresh or stale), keep it as a last-resort fallback
    const staleOrFresh = this.lastKnownLocation;

    // Strategy 1: Quick low-accuracy attempt (fast networks/devices) - reduce timeout to prevent blocking
    try {
      const quick = await this.getLocationWithConfig({
        enableHighAccuracy: false,
        timeout: 3000, // Reduced from 6000 to prevent long waits
        maximumAge: 30000, // Accept cached positions up to 30 seconds old
      });
      console.log('✅ حصلنا على الموقع بسرعة (Low accuracy)');
      return quick;
    } catch (e1) {
      console.debug('⌛ فشلت المحاولة السريعة (Low accuracy) - متوقع في بعض الأجهزة');
    }

    // Skip heavy strategies if we have a cached location to avoid timeout errors
    if (staleOrFresh) {
      // Try one quick high-accuracy attempt, but don't wait too long
      try {
        const precise = await this.getLocationWithConfig({
          enableHighAccuracy: true,
          timeout: 5000, // Reduced from 20000 to prevent timeout
          maximumAge: 60000, // Accept cached positions up to 1 minute old
        });
        console.log('✅ حصلنا على موقع محدث بدقة عالية');
        return precise;
      } catch (e2) {
        console.debug('⌛ استخدام الموقع المحفوظ بدلاً من الانتظار');
      }
    } else {
      // No cached location - try harder but still with reasonable timeouts
      try {
        const raced = await this.getFirstFixWithWatch(5000, false);
        console.log('✅ حصلنا على الموقع عبر watchPosition');
        return raced;
      } catch (e2) {
        console.debug('⌛ فشلت محاولة watchPosition');
      }

      // Last attempt with high accuracy but short timeout
      try {
        const precise = await this.getLocationWithConfig({
          enableHighAccuracy: true,
          timeout: 8000, // Reasonable timeout
          maximumAge: 60000,
        });
        console.log('✅ حصلنا على الموقع (High accuracy)');
        return precise;
      } catch (e3) {
        console.debug('⌛ فشلت المحاولة عالية الدقة');
      }
    }

    // Final fallback: return stale cached location if available, otherwise use a safe default location
    if (staleOrFresh) {
      console.warn('⚠️ إرجاع آخر موقع معروف (قديم) لعدم القدرة على تحديد الموقع الآن');
      return staleOrFresh;
    }

    // Use a safe default (القاهرة) instead of throwing to avoid breaking UX
    const fallback = this.getDefaultLocation();
    this.lastKnownLocation = fallback;
    console.warn('⚠️ تعذر الحصول على الموقع بعد عدة محاولات — استخدام موقع افتراضي مؤقتاً');
    return fallback;
  }

  /**
   * الحصول على الموقع بإعدادات محددة
   */
  private getLocationWithConfig(config: PositionOptions): Promise<LocationData> {
    this.ensureGeolocationAvailable();
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = this.parsePosition(position);
          this.lastKnownLocation = locationData;
          try { saveCachedLocation({ latitude: locationData.latitude, longitude: locationData.longitude, accuracy: locationData.accuracy, timestamp: locationData.timestamp }); } catch {}

          // Geocode address if enabled (but don't let it block the response)
          if (this.config.enableAddressGeocoding) {
            this.geocodeLocationAsync(locationData);
          }

          resolve(locationData);
        },
        (error) => {
          let errorMessage = (error as any)?.message || 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              // Don't log timeout as error - it's expected in many cases
              errorMessage = 'Location acquisition timed out - using fallback';
              console.debug('Location timeout (expected in some cases)');
              break;
          }
          reject(new Error(errorMessage));
        },
        config
      );
    });
  }

  /**
   * تشغيل geocoding بشكل غير متزامن (لا يعيق الاستجابة)
   */
  private async geocodeLocationAsync(locationData: LocationData) {
    try {
      const address = await this.reverseGeocode(locationData.latitude, locationData.longitude);
      if (this.lastKnownLocation && 
          this.lastKnownLocation.latitude === locationData.latitude &&
          this.lastKnownLocation.longitude === locationData.longitude) {
        this.lastKnownLocation.address = address.address;
        this.lastKnownLocation.city = address.city;
        this.lastKnownLocation.country = address.country;
      }
    } catch (error) {
      console.warn('Background geocoding failed:', error);
    }
  }

  /**
   * التحقق من صحة الموقع المحفوظ
   */
  private isLocationFresh(location: LocationData): boolean {
    const age = Date.now() - location.timestamp;
    return age < this.config.maximumAge;
  }

  /**
   * Ensure geolocation can be used in this context
   */
  private ensureGeolocationAvailable() {
    if (typeof window === 'undefined') {
      throw new Error('Geolocation is not available: window is undefined');
    }
    if (!('isSecureContext' in window) || window.isSecureContext === false) {
      // Geolocation typically requires HTTPS or localhost
      console.warn('Geolocation may be blocked because the context is not secure (HTTPS required)');
    }
    if (!navigator.geolocation) {
      throw new Error('Geolocation API is not supported in this browser');
    }
  }

  /**
   * Race watchPosition to get the first position fix, then clear the watcher
   */
  private getFirstFixWithWatch(timeoutMs: number, highAccuracy: boolean): Promise<LocationData> {
    this.ensureGeolocationAvailable();
    return new Promise((resolve, reject) => {
      let finished = false;
      const opts: PositionOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: this.config.maximumAge,
      };
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (finished) return;
          finished = true;
          navigator.geolocation.clearWatch(watchId);
          const data = this.parsePosition(position);
          this.lastKnownLocation = data;
          try { saveCachedLocation({ latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, timestamp: data.timestamp }); } catch {}
          resolve(data);
        },
        (error) => {
          if (finished) return;
          finished = true;
          navigator.geolocation.clearWatch(watchId);
          let errorMessage = (error as any)?.message || 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = (error as any)?.message || 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        opts
      );

      // Safety timeout in case watchPosition never fires error callback
      const guard = setTimeout(() => {
        if (finished) return;
        finished = true;
        navigator.geolocation.clearWatch(watchId);
        reject(new Error('Location request timed out (watchPosition)'));
      }, timeoutMs + 1000);

      // Clear guard if promise settles
      const cleanup = () => clearTimeout(guard);
      // Attach cleanup
      Promise.resolve().then(() => {
        // noop, just to ensure microtask queue processes
      });
    });
  }

  /**
   * الحصول على موقع افتراضي (القاهرة، مصر)
   */
  private getDefaultLocation(): LocationData {
    return {
      latitude: 30.0444,
      longitude: 31.2357,
      accuracy: 1000,
      timestamp: Date.now(),
      source: 'manual',
      address: 'القاهرة، جمهورية مصر العربية',
      city: 'القاهرة',
      country: 'مصر'
    };
  }

  /**
   * مراقبة تغييرات الموقع
   */
  watchLocation(callback: (location: LocationData) => void): () => void {
    if (!this.permissionState.granted) {
      throw new Error('Location permission not granted');
    }

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData = this.parsePosition(position);
        this.lastKnownLocation = locationData;
        try { saveCachedLocation({ latitude: locationData.latitude, longitude: locationData.longitude, accuracy: locationData.accuracy, timestamp: locationData.timestamp }); } catch {}

        // Geocode address if enabled and different from last known
        if (this.config.enableAddressGeocoding) {
          try {
            const address = await this.reverseGeocode(locationData.latitude, locationData.longitude);
            locationData.address = address.address;
            locationData.city = address.city;
            locationData.country = address.country;
          } catch (error) {
            console.warn('Geocoding failed:', error);
          }
        }

        callback(locationData);
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      this.config
    );

    // Return cleanup function
    return () => this.stopWatching();
  }

  /**
   * إيقاف مراقبة الموقع
   */
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * الحصول على آخر موقع معروف
   */
  getLastKnownLocation(): LocationData | null {
    if (!this.lastKnownLocation) {
      const cached = loadCachedLocation();
      if (cached) {
        this.lastKnownLocation = {
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy,
          timestamp: cached.timestamp,
          source: 'network'
        };
      }
    }
    return this.lastKnownLocation;
  }

  /**
   * تحديث إعدادات الخدمة
   */
  updateConfig(config: Partial<LocationServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * الحصول على حالة الإذن الحالية
   */
  getPermissionState(): LocationPermissionState {
    return this.permissionState;
  }

  /**
   * تحويل كائن الموقع إلى البيانات المطلوبة
   */
  private parsePosition(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      source: position.coords.accuracy && position.coords.accuracy < 100 ? 'gps' : 'network'
    };
  }

  /**
   * تحويل الإحداثيات إلى عنوان (يتطلب Google Maps API)
   */
  private async reverseGeocode(lat: number, lng: number): Promise<{
    address: string;
    city: string;
    country: string;
  }> {
    // Always read API key from system settings (single source of truth)
    const { systemSettingsService } = await import('@/lib/system-settings-service');
    const apiKey = await systemSettingsService.getGoogleMapsApiKey();
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=ar`
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error('No results from geocoding API');
    }

    const result = data.results[0];
    const components = result.address_components;
    
    let city = '';
    let country = '';
    
    components.forEach((component: any) => {
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
      }
    });

    return {
      address: result.formatted_address,
      city: city || 'غير محدد',
      country: country || 'غير محدد'
    };
  }

  /**
   * حساب المسافة بين نقطتين (بالكيلومتر)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * التحقق من وجود المستخدم داخل منطقة جغرافية معينة
   */
  isWithinGeofence(
    userLat: number, 
    userLng: number, 
    centerLat: number, 
    centerLng: number, 
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(userLat, userLng, centerLat, centerLng);
    return distance <= radiusKm;
  }
}

// Singleton instance
export const locationService = new LocationService();

// Activity logging with location
export interface ActivityWithLocation {
  id: string;
  type: 'login' | 'clinic_registration' | 'order' | 'visit' | 'payment';
  userId: string;
  location?: LocationData;
  timestamp: number;
  details: any;
}

/**
 * تسجيل نشاط مع الموقع في قاعدة البيانات
 */
export async function logActivityWithLocation(
  type: ActivityWithLocation['type'],
  userId: string,
  details: any,
  forceLocationRequest = false
): Promise<string> {
  const activityId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let location: LocationData | null = null;
  
  try {
    // Get current location if permissions are granted or force requested
    if (locationService.getPermissionState().granted || forceLocationRequest) {
      location = await locationService.getCurrentLocation();
    } else {
      // Use last known location if available
      location = locationService.getLastKnownLocation();
    }
  } catch (error) {
    console.warn('Could not get location for activity:', error);
  }

  try {
    // تحضير بيانات النشاط
    const activityData = {
      type,
      title: getActivityTitle(type),
      details: JSON.stringify(details),
      entityType: getEntityType(type),
      entityId: details?.id?.toString() || null,
      lat: location?.latitude || null,
      lng: location?.longitude || null,
      locationName: location?.address || null,
      city: location?.city || null,
      country: location?.country || null,
      accuracy: location?.accuracy || null,
      source: location?.source || null,
      device: getDeviceInfo().device,
      browser: getDeviceInfo().browser,
      browserVersion: getDeviceInfo().browserVersion,
      os: getDeviceInfo().os,
      riskScore: 0
    };
    
    // إرسال لقاعدة البيانات
    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData),
    });
    
    if (!response.ok) {
      // Don't escalate as an error — fall back gracefully to local storage
      console.warn(`Activity log API responded with status ${response.status}; logging locally as fallback.`);
      await logActivityLocally(type, userId, details, location);
      return activityId;
    }
    
    const result = await response.json();
    console.log('Activity logged to database successfully:', result);
    return activityId;
  } catch (error) {
    // Downgrade to warning to avoid noisy console errors in production
    console.warn('Failed to log activity to database (using local fallback):', error);
    // في حالة الفشل، نحفظ محلياً كنسخة احتياطية
    await logActivityLocally(type, userId, details, location);
    return activityId;
  }
}

/**
 * حفظ النشاط محلياً كنسخة احتياطية
 */
async function logActivityLocally(
  type: string,
  userId: string,
  details: any,
  location: LocationData | null
): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    
    const activity: ActivityWithLocation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as ActivityWithLocation['type'],
      userId,
      location: location || undefined,
      timestamp: Date.now(),
      details
    };
    
    const existingActivities = JSON.parse(localStorage.getItem('location_activities_fallback') || '[]');
    existingActivities.unshift(activity);
    
    // الاحتفاظ بآخر 100 سجل فقط للنسخة الاحتياطية
    if (existingActivities.length > 100) {
      existingActivities.splice(100);
    }
    
    localStorage.setItem('location_activities_fallback', JSON.stringify(existingActivities));
    console.log('Activity logged locally as fallback:', activity);
  } catch (error) {
    console.error('Failed to log activity locally:', error);
  }
}

/**
 * الحصول على عنوان النشاط
 */
function getActivityTitle(activityType: string): string {
  const titles: Record<string, string> = {
    'login': 'تسجيل دخول',
    'clinic_registration': 'تسجيل عيادة جديدة',
    'order': 'إنشاء طلبية جديدة',
    'visit': 'زيارة عيادة',
    'payment': 'عملية دفع'
  };
  return titles[activityType] || 'نشاط غير محدد';
}

/**
 * الحصول على نوع الكيان
 */
function getEntityType(activityType: string): string {
  const entityTypes: Record<string, string> = {
    'login': 'user',
    'clinic_registration': 'clinic',
    'order': 'order',
    'visit': 'visit',
    'payment': 'payment'
  };
  return entityTypes[activityType] || activityType;
}

/**
 * الحصول على معلومات الجهاز
 */
function getDeviceInfo(): {
  device: string;
  browser: string;
  browserVersion: string;
  os: string;
} {
  if (typeof window === 'undefined') {
    return {
      device: 'Server',
      browser: 'Unknown',
      browserVersion: 'Unknown',
      os: 'Unknown'
    };
  }
  
  const userAgent = navigator.userAgent;
  
  // تحديد نوع الجهاز
  let device = 'Desktop';
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    device = /iPad/i.test(userAgent) ? 'Tablet' : 'Mobile';
  }
  
  // تحديد المتصفح
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
    const match = userAgent.match(/Edge\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  
  // تحديد نظام التشغيل
  let os = 'Unknown';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS')) {
    os = 'iOS';
  }
  
  return { device, browser, browserVersion, os };
}

/**
 * الحصول على الأنشطة مع المواقع من قاعدة البيانات
 */
export async function getActivitiesWithLocation(options?: {
  limit?: number;
  offset?: number;
  type?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  hasLocation?: boolean;
}): Promise<ActivityWithLocation[]> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.type) params.append('type', options.type);
    if (options?.userId) params.append('userId', options.userId);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.hasLocation !== undefined) params.append('hasLocation', options.hasLocation.toString());
    
    const response = await fetch(`/api/activity-log?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch activities from database:', error);
    // في حالة الفشل، استخدام البيانات المحفوظة محلياً
    if (typeof window !== 'undefined') {
      const fallbackData = JSON.parse(localStorage.getItem('location_activities_fallback') || '[]');
      return fallbackData;
    }
    return [];
  }
}
