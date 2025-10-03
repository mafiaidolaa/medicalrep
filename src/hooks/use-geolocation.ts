"use client";

import { useState, useEffect, useCallback } from 'react';

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  provider: 'gps' | 'network' | 'passive';
  timestamp: number;
  locationName?: string;
  city?: string;
  country?: string;
}

export interface GeolocationState {
  data: GeolocationData | null;
  loading: boolean;
  error: string | null;
  supported: boolean;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
  autoRequest?: boolean;
  reverseGeocode?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    watch = false,
    autoRequest = false,
    reverseGeocode = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    data: null,
    loading: false,
    error: null,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  // دالة للحصول على اسم الموقع من الإحداثيات
  const getLocationName = async (lat: number, lng: number): Promise<{locationName?: string, city?: string, country?: string}> => {
    if (!reverseGeocode) return {};
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ar,en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          locationName: data.display_name || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          country: data.address?.country || ''
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
    
    return {};
  };

  // معالج نجاح الموقع
  const handleSuccess = useCallback(async (position: GeolocationPosition) => {
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
      setState(prev => ({ ...prev, loading: true, error: null }));
      locationInfo = await getLocationName(latitude, longitude);
    }

    const data: GeolocationData = {
      latitude,
      longitude,
      accuracy,
      provider,
      timestamp: Date.now(),
      ...locationInfo
    };

    setState({
      data,
      loading: false,
      error: null,
      supported: true
    });
  }, [reverseGeocode]);

  // معالج خطأ الموقع
  const handleError = useCallback((error: GeolocationPositionError) => {
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

    setState(prev => ({
      ...prev,
      loading: false,
      error: errorMessage
    }));
  }, []);

  // دالة للحصول على الموقع الحالي
  const getCurrentLocation = useCallback(() => {
    if (!state.supported) {
      setState(prev => ({
        ...prev,
        error: 'الموقع غير مدعوم في هذا المتصفح'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  }, [state.supported, handleSuccess, handleError, enableHighAccuracy, timeout, maximumAge]);

  // دالة لبدء مراقبة الموقع
  const startWatching = useCallback(() => {
    if (!state.supported || watchId !== null) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    setWatchId(id);
  }, [state.supported, watchId, handleSuccess, handleError, enableHighAccuracy, timeout, maximumAge]);

  // دالة لإيقاف مراقبة الموقع
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [watchId]);

  // دالة لمسح البيانات
  const clearLocation = useCallback(() => {
    setState(prev => ({
      ...prev,
      data: null,
      loading: false,
      error: null
    }));
  }, []);

  // تأثير لبدء الطلب التلقائي
  useEffect(() => {
    if (autoRequest) {
      if (watch) {
        startWatching();
      } else {
        getCurrentLocation();
      }
    }
  }, [autoRequest, watch, getCurrentLocation, startWatching]);

  // تأثير لتنظيف المراقبة
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    ...state,
    getCurrentLocation,
    startWatching,
    stopWatching,
    clearLocation,
    isWatching: watchId !== null
  };
}

// Hook مبسط للحصول على الموقع مرة واحدة
export function useCurrentLocation(options: Omit<UseGeolocationOptions, 'watch' | 'autoRequest'> = {}) {
  return useGeolocation({
    ...options,
    watch: false,
    autoRequest: true
  });
}

// Hook للمراقبة المستمرة للموقع
export function useLocationWatcher(options: Omit<UseGeolocationOptions, 'watch' | 'autoRequest'> = {}) {
  return useGeolocation({
    ...options,
    watch: true,
    autoRequest: true
  });
}