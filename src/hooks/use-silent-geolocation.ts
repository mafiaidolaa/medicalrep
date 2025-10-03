"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SilentLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  provider: 'gps' | 'network' | 'passive';
  timestamp: number;
  locationName?: string;
  city?: string;
  country?: string;
}

export interface SilentGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  reverseGeocode?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  silent?: boolean; // إذا كان true، لن يتم إظهار أي رسائل
}

export function useSilentGeolocation(options: SilentGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000, // مهلة أطول
    maximumAge = 300000, // 5 دقائق
    reverseGeocode = false,
    retryAttempts = 3,
    retryDelay = 2000,
    silent = true // صامت افتراضياً
  } = options;

  const [data, setData] = useState<SilentLocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  
  const retryCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // فحص الدعم عند التحميل
  useEffect(() => {
    const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    setSupported(isSupported);
  }, []);

  // دالة للحصول على اسم الموقع بهدوء
  const getLocationNameSilently = async (lat: number, lng: number): Promise<{locationName?: string, city?: string, country?: string}> => {
    if (!reverseGeocode) return {};
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // مهلة قصيرة
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ar,en`,
        { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'EP-Group-System/1.0'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          locationName: data.display_name || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          country: data.address?.country || ''
        };
      }
    } catch (error) {
      // فشل صامت - لا نريد أي رسائل
      if (silent) {
        console.debug('Reverse geocoding failed silently:', error);
      }
    }
    
    return {};
  };

  // معالج نجاح الموقع
  const handleSuccess = useCallback(async (position: GeolocationPosition) => {
    try {
      const { latitude, longitude, accuracy } = position.coords;
      
      // تحديد نوع المزود بناءً على دقة الموقع
      let provider: 'gps' | 'network' | 'passive' = 'passive';
      if (accuracy <= 20) {
        provider = 'gps';
      } else if (accuracy <= 100) {
        provider = 'network';
      }

      let locationInfo = {};
      if (reverseGeocode) {
        locationInfo = await getLocationNameSilently(latitude, longitude);
      }

      const locationData: SilentLocationData = {
        latitude,
        longitude,
        accuracy,
        provider,
        timestamp: Date.now(),
        ...locationInfo
      };

      setData(locationData);
      setIsLoading(false);
      setError(null);
      retryCount.current = 0;
      
      if (!silent) {
        console.debug('Location obtained successfully:', locationData);
      }
    } catch (err) {
      if (!silent) {
        console.error('Error processing location:', err);
      }
      setIsLoading(false);
    }
  }, [reverseGeocode, silent]);

  // معالج خطأ الموقع
  const handleError = useCallback((error: GeolocationPositionError) => {
    if (!silent) {
      let errorMessage = 'خطأ غير معروف في الموقع';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'تم رفض الإذن للوصول إلى الموقع';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'الموقع غير متوفر';
          break;
        case error.TIMEOUT:
          errorMessage = 'انتهت مهلة الحصول على الموقع';
          break;
      }
      
      setError(errorMessage);
      console.warn('Geolocation error:', errorMessage);
    } else {
      // في الوضع الصامت، نسجل الخطأ فقط في console.debug
      console.debug('Geolocation failed silently:', error.code, error.message);
      setError(null); // لا نعرض أخطاء في الوضع الصامت
    }

    setIsLoading(false);

    // إعادة المحاولة في الوضع الصامت
    if (silent && retryCount.current < retryAttempts) {
      retryCount.current++;
      timeoutRef.current = setTimeout(() => {
        getCurrentLocationSilently();
      }, retryDelay);
    }
  }, [silent, retryAttempts, retryDelay]);

  // دالة للحصول على الموقع بصمت
  const getCurrentLocationSilently = useCallback(() => {
    if (!supported) {
      if (!silent) {
        setError('الموقع غير مدعوم في هذا المتصفح');
      }
      return;
    }

    setIsLoading(true);
    if (!silent) {
      setError(null);
    }

    // استخدام إعدادات محسنة للحصول على الموقع
    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    try {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } catch (err) {
      if (!silent) {
        console.error('Geolocation API error:', err);
        setError('خطأ في واجهة الموقع');
      }
      setIsLoading(false);
    }
  }, [supported, handleSuccess, handleError, enableHighAccuracy, timeout, maximumAge, silent]);

  // دالة للحصول على الموقع مع خيارات متقدمة و fallback محسّن
  const getLocationWithFallback = useCallback(async (): Promise<SilentLocationData | null> => {
    if (!supported) {
      console.debug('Geolocation not supported, returning default location');
      return getDefaultLocation();
    }

    return new Promise((resolve) => {
      let resolved = false;
      let attempts = 0;
      const maxAttempts = 2;
      
      const resolveWithLocation = async (position: GeolocationPosition) => {
        if (resolved) return;
        resolved = true;
        
        const { latitude, longitude, accuracy } = position.coords;
        
        let provider: 'gps' | 'network' | 'passive' = 'passive';
        if (accuracy <= 20) provider = 'gps';
        else if (accuracy <= 100) provider = 'network';
        
        let locationInfo = {};
        if (reverseGeocode) {
          try {
            locationInfo = await getLocationNameSilently(latitude, longitude);
          } catch (error) {
            console.debug('Reverse geocoding failed silently:', error);
          }
        }
        
        const locationData: SilentLocationData = {
          latitude,
          longitude,
          accuracy,
          provider,
          timestamp: Date.now(),
          ...locationInfo
        };
        
        console.debug('Location obtained successfully:', { accuracy, provider });
        resolve(locationData);
      };
      
      const handleError = (error: GeolocationPositionError) => {
        attempts++;
        console.debug(`Location attempt ${attempts} failed:`, error.code, error.message);
        
        if (attempts < maxAttempts) {
          // جرب مرة أخرى بإعدادات مختلفة
          setTimeout(() => {
            navigator.geolocation.getCurrentPosition(
              resolveWithLocation,
              () => {
                if (!resolved) {
                  resolved = true;
                  console.debug('All location attempts failed, using default');
                  resolve(getDefaultLocation());
                }
              },
              {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 300000
              }
            );
          }, 1000); // تأخير قصير قبل المحاولة التالية
        } else {
          if (!resolved) {
            resolved = true;
            console.debug('All attempts exhausted, using default location');
            resolve(getDefaultLocation());
          }
        }
      };
      
      // محاولة أولى بدقة عالية
      navigator.geolocation.getCurrentPosition(
        resolveWithLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 6000, // مهلة أقصر للمحاولة الأولى
          maximumAge: 60000 // دقيقة واحدة
        }
      );

      // مهلة نهائية إجمالية
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.debug('Final timeout reached, using default location');
          resolve(getDefaultLocation());
        }
      }, 15000); // 15 ثانية إجمالي
    });
  }, [supported, reverseGeocode, getLocationNameSilently]);

  // دالة للحصول على موقع افتراضي
  const getDefaultLocation = (): SilentLocationData => {
    return {
      latitude: 30.0444, // القاهرة
      longitude: 31.2357,
      accuracy: 1000,
      provider: 'passive',
      timestamp: Date.now(),
      locationName: 'القاهرة، جمهورية مصر العربية',
      city: 'القاهرة',
      country: 'مصر'
    };
  };

  // تنظيف المؤقتات
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error: silent ? null : error, // لا نعرض أخطاء في الوضع الصامت
    supported,
    getCurrentLocation: getCurrentLocationSilently,
    getLocationWithFallback,
    isLocationAvailable: !!data,
    lastUpdated: data?.timestamp
  };
}

// Hook مبسط للحصول على الموقع بصمت تام
export function useLocationSilently() {
  return useSilentGeolocation({
    silent: true,
    enableHighAccuracy: true,
    timeout: 10000,
    retryAttempts: 2,
    reverseGeocode: true
  });
}

// Hook للاستخدام مع المكونات التي تحتاج إعلام المستخدم (مثل تسجيل العيادات)
export function useLocationWithNotification() {
  return useSilentGeolocation({
    silent: false,
    enableHighAccuracy: true,
    timeout: 15000,
    retryAttempts: 1,
    reverseGeocode: true
  });
}