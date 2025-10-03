/**
 * خدمة إدارة إعدادات النظام
 * تتيح استدعاء وحفظ جميع إعدادات النظام بما في ذلك إعدادات الخرائط
 */

interface GoogleMapsSettings {
  enabled: boolean;
  apiKey: string;
  defaultZoom: number;
  defaultCenter: {
    lat: number;
    lng: number;
  };
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  theme: 'default' | 'dark' | 'silver' | 'retro';
  enableClustering: boolean;
  enableStreetView: boolean;
  enableFullscreen: boolean;
  enableZoomControl: boolean;
  enableMapTypeControl: boolean;
  enableScaleControl: boolean;
  language: string;
  region: string;
  // Location tracking settings
  locationTracking: {
    enabled: boolean;
    requestOnLogin: boolean;
    requestOnClinicRegistration: boolean;
    requestOnOrderCreation: boolean;
    requestOnVisitCreation: boolean;
    requestOnPayment: boolean;
    enableGeofencing: boolean;
    geofenceRadius: number;
    enableRouteTracking: boolean;
    enableActivityLogging: boolean;
    privacyMode: 'strict' | 'balanced' | 'permissive';
  };
  // Geocoding settings
  geocoding: {
    enableReverseGeocoding: boolean;
    cacheResults: boolean;
    enableAddressAutoComplete: boolean;
  };
}

class SystemSettingsService {
  private static instance: SystemSettingsService;
  private mapsSettings: GoogleMapsSettings | null = null;
  private settingsCache: Map<string, any> = new Map();
  private lastFetch = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): SystemSettingsService {
    if (!SystemSettingsService.instance) {
      SystemSettingsService.instance = new SystemSettingsService();
    }
    return SystemSettingsService.instance;
  }

  /**
   * الحصول على إعدادات الخرائط
   */
  async getMapsSettings(): Promise<GoogleMapsSettings> {
    const cacheKey = 'maps_settings';
    const now = Date.now();

    // استخدام الكاش إذا كان حديثاً
    if (this.mapsSettings && (now - this.lastFetch) < this.cacheTimeout) {
      return this.mapsSettings;
    }

    try {
      // محاولة تحميل من localStorage أولاً (للاستجابة السريعة)
      const localSettings = localStorage.getItem(cacheKey);
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        this.mapsSettings = parsed;
      }

      // تحديث من الخادم
      const response = await fetch('/api/system-settings/maps');
      if (response.ok) {
        const serverSettings = await response.json();
        
        // تحويل الإعدادات من تنسيق قاعدة البيانات إلى تنسيق التطبيق
        const mapsSettings = this.transformServerSettingsToClient(serverSettings);
        
        // حفظ في الكاش والذاكرة المحلية
        this.mapsSettings = mapsSettings;
        localStorage.setItem(cacheKey, JSON.stringify(mapsSettings));
        localStorage.setItem('google_maps_api_key', mapsSettings.apiKey || '');
        
        this.lastFetch = now;
        return mapsSettings;
      }
    } catch (error) {
      console.error('Failed to fetch maps settings:', error);
    }

    // إرجاع الإعدادات الافتراضية إذا فشل التحميل
    return this.getDefaultMapsSettings();
  }

  /**
   * الحصول على مفتاح Google Maps API
   */
  async getGoogleMapsApiKey(): Promise<string> {
    const settings = await this.getMapsSettings();
    return settings.apiKey || '';
  }

  /**
   * التحقق من تفعيل الخرائط
   */
  async isMapsEnabled(): Promise<boolean> {
    const settings = await this.getMapsSettings();
    return settings.enabled && !!settings.apiKey;
  }

  /**
   * حفظ إعدادات الخرائط
   */
  async saveMapsSettings(settings: Partial<GoogleMapsSettings>): Promise<boolean> {
    try {
      const response = await fetch('/api/system-settings/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        // تحديث الكاش المحلي
        this.mapsSettings = { ...this.getDefaultMapsSettings(), ...settings };
        localStorage.setItem('maps_settings', JSON.stringify(this.mapsSettings));
        localStorage.setItem('google_maps_api_key', settings.apiKey || '');
        this.lastFetch = Date.now();
        return true;
      }
    } catch (error) {
      console.error('Failed to save maps settings:', error);
    }
    return false;
  }

  /**
   * مسح الكاش وإعادة التحميل
   */
  async refreshSettings(): Promise<GoogleMapsSettings> {
    this.settingsCache.clear();
    this.mapsSettings = null;
    this.lastFetch = 0;
    return this.getMapsSettings();
  }

  /**
   * تحويل إعدادات الخادم إلى تنسيق العميل
   */
  private transformServerSettingsToClient(serverSettings: Record<string, any>): GoogleMapsSettings {
    const defaultSettings = this.getDefaultMapsSettings();
    
    return {
      enabled: serverSettings.google_maps_enabled ?? defaultSettings.enabled,
      apiKey: serverSettings.google_maps_api_key ?? defaultSettings.apiKey,
      defaultZoom: serverSettings.maps_default_zoom ?? defaultSettings.defaultZoom,
      defaultCenter: serverSettings.maps_default_center ?? defaultSettings.defaultCenter,
      mapType: serverSettings.maps_map_type ?? defaultSettings.mapType,
      theme: serverSettings.maps_theme ?? defaultSettings.theme,
      enableClustering: serverSettings.maps_enable_clustering ?? defaultSettings.enableClustering,
      enableStreetView: serverSettings.maps_enable_street_view ?? defaultSettings.enableStreetView,
      enableFullscreen: serverSettings.maps_enable_fullscreen ?? defaultSettings.enableFullscreen,
      enableZoomControl: serverSettings.maps_enable_zoom_control ?? defaultSettings.enableZoomControl,
      enableMapTypeControl: serverSettings.maps_enable_map_type_control ?? defaultSettings.enableMapTypeControl,
      enableScaleControl: serverSettings.maps_enable_scale_control ?? defaultSettings.enableScaleControl,
      language: serverSettings.maps_language ?? defaultSettings.language,
      region: serverSettings.maps_region ?? defaultSettings.region,
      locationTracking: {
        enabled: serverSettings.location_tracking_enabled ?? defaultSettings.locationTracking.enabled,
        requestOnLogin: serverSettings.location_request_on_login ?? defaultSettings.locationTracking.requestOnLogin,
        requestOnClinicRegistration: serverSettings.location_request_on_clinic_registration ?? defaultSettings.locationTracking.requestOnClinicRegistration,
        requestOnOrderCreation: serverSettings.location_request_on_order_creation ?? defaultSettings.locationTracking.requestOnOrderCreation,
        requestOnVisitCreation: serverSettings.location_request_on_visit_creation ?? defaultSettings.locationTracking.requestOnVisitCreation,
        requestOnPayment: serverSettings.location_request_on_payment ?? defaultSettings.locationTracking.requestOnPayment,
        enableGeofencing: serverSettings.location_enable_geofencing ?? defaultSettings.locationTracking.enableGeofencing,
        geofenceRadius: serverSettings.location_geofence_radius ?? defaultSettings.locationTracking.geofenceRadius,
        enableRouteTracking: serverSettings.location_enable_route_tracking ?? defaultSettings.locationTracking.enableRouteTracking,
        enableActivityLogging: serverSettings.location_enable_activity_logging ?? defaultSettings.locationTracking.enableActivityLogging,
        privacyMode: serverSettings.location_privacy_mode ?? defaultSettings.locationTracking.privacyMode,
      },
      geocoding: {
        enableReverseGeocoding: serverSettings.geocoding_enable_reverse ?? defaultSettings.geocoding.enableReverseGeocoding,
        cacheResults: serverSettings.geocoding_cache_results ?? defaultSettings.geocoding.cacheResults,
        enableAddressAutoComplete: serverSettings.geocoding_enable_autocomplete ?? defaultSettings.geocoding.enableAddressAutoComplete,
      }
    };
  }

  /**
   * الحصول على الإعدادات الافتراضية
   */
  private getDefaultMapsSettings(): GoogleMapsSettings {
    return {
      enabled: false,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      defaultZoom: 10,
      defaultCenter: {
        lat: 30.0444, // Cairo coordinates as default
        lng: 31.2357
      },
      mapType: 'roadmap',
      theme: 'default',
      enableClustering: true,
      enableStreetView: true,
      enableFullscreen: true,
      enableZoomControl: true,
      enableMapTypeControl: true,
      enableScaleControl: true,
      language: 'ar',
      region: 'EG',
      locationTracking: {
        enabled: true,
        requestOnLogin: true,
        requestOnClinicRegistration: true,
        requestOnOrderCreation: true,
        requestOnVisitCreation: true,
        requestOnPayment: true,
        enableGeofencing: false,
        geofenceRadius: 1.0, // 1 km
        enableRouteTracking: false,
        enableActivityLogging: true,
        privacyMode: 'balanced'
      },
      geocoding: {
        enableReverseGeocoding: true,
        cacheResults: true,
        enableAddressAutoComplete: true
      }
    };
  }

  /**
   * إعداد Google Maps API script
   */
  async loadGoogleMapsScript(): Promise<boolean> {
    const settings = await this.getMapsSettings();
    
    if (!settings.enabled || !settings.apiKey) {
      return false;
    }

    // التحقق من تحميل المكتبة مسبقاً
    if (window.google && window.google.maps) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${settings.apiKey}&libraries=geometry,places&language=${settings.language}&region=${settings.region}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve(true);
      script.onerror = () => reject(false);
      
      document.head.appendChild(script);
    });
  }

  /**
   * التحقق من صحة مفتاح API
   */
  validateApiKey(apiKey: string): boolean {
    return apiKey.length >= 30 && apiKey.startsWith('AIza');
  }
}

// تصدير instance واحد
export const systemSettingsService = SystemSettingsService.getInstance();
export type { GoogleMapsSettings };