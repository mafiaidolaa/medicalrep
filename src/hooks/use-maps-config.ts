"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GoogleMapsConfig {
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
}

const defaultConfig: GoogleMapsConfig = {
  enabled: false,
  apiKey: '',
  defaultZoom: 10,
  defaultCenter: {
    lat: 30.0444, // Cairo coordinates
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
  region: 'EG'
};

export function useMapsConfig() {
  const [config, setConfig] = useState<GoogleMapsConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // تحويل البيانات من API إلى تنسيق المكون
  const mapApiToConfig = useCallback((apiData: Record<string, any>): GoogleMapsConfig => {
    return {
      enabled: apiData.google_maps_enabled ?? defaultConfig.enabled,
      apiKey: apiData.google_maps_api_key ?? defaultConfig.apiKey,
      defaultZoom: parseInt(apiData.maps_default_zoom) || defaultConfig.defaultZoom,
      defaultCenter: typeof apiData.maps_default_center === 'object' 
        ? apiData.maps_default_center 
        : defaultConfig.defaultCenter,
      mapType: apiData.maps_map_type ?? defaultConfig.mapType,
      theme: apiData.maps_theme ?? defaultConfig.theme,
      enableClustering: apiData.maps_enable_clustering ?? defaultConfig.enableClustering,
      enableStreetView: apiData.maps_enable_street_view ?? defaultConfig.enableStreetView,
      enableFullscreen: apiData.maps_enable_fullscreen ?? defaultConfig.enableFullscreen,
      enableZoomControl: apiData.maps_enable_zoom_control ?? defaultConfig.enableZoomControl,
      enableMapTypeControl: apiData.maps_enable_map_type_control ?? defaultConfig.enableMapTypeControl,
      enableScaleControl: apiData.maps_enable_scale_control ?? defaultConfig.enableScaleControl,
      language: apiData.maps_language ?? defaultConfig.language,
      region: apiData.maps_region ?? defaultConfig.region,
    };
  }, []);

  // تحميل الإعدادات من API
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/system-settings/maps');
      
      if (!response.ok) {
        throw new Error('فشل في تحميل إعدادات الخرائط');
      }

      const apiData = await response.json();
      const mappedConfig = mapApiToConfig(apiData);
      setConfig(mappedConfig);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      setError(errorMessage);
      console.error('خطأ في تحميل إعدادات الخرائط:', err);
      
      // استخدام الإعدادات الافتراضية في حالة الخطأ
      setConfig(defaultConfig);
      
    } finally {
      setIsLoading(false);
    }
  }, [mapApiToConfig]);

  // تحديث إعدادة واحدة
  const updateConfigField = useCallback(<K extends keyof GoogleMapsConfig>(
    key: K, 
    value: GoogleMapsConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // التحقق من صحة إعدادات الخرائط
  const validateConfig = useCallback((cfg: GoogleMapsConfig): boolean => {
    if (!cfg.enabled) {
      return true; // إذا كانت معطلة، لا نحتاج للتحقق
    }

    if (!cfg.apiKey || cfg.apiKey.length < 30 || !cfg.apiKey.startsWith('AIza')) {
      return false;
    }

    if (cfg.defaultZoom < 1 || cfg.defaultZoom > 20) {
      return false;
    }

    if (!cfg.defaultCenter || 
        typeof cfg.defaultCenter.lat !== 'number' || 
        typeof cfg.defaultCenter.lng !== 'number') {
      return false;
    }

    return true;
  }, []);

  // الحصول على إعدادات Google Maps Script
  const getMapScriptConfig = useCallback(() => {
    if (!config.enabled || !config.apiKey) {
      return null;
    }

    return {
      apiKey: config.apiKey,
      language: config.language,
      region: config.region,
      libraries: ['places', 'geometry'] as const,
    };
  }, [config]);

  // الحصول على إعدادات خيارات الخريطة
  const getMapOptions = useCallback((): google.maps.MapOptions | null => {
    if (!config.enabled) {
      return null;
    }

    return {
      center: config.defaultCenter,
      zoom: config.defaultZoom,
      mapTypeId: config.mapType,
      
      // UI Controls
      zoomControl: config.enableZoomControl,
      mapTypeControl: config.enableMapTypeControl,
      scaleControl: config.enableScaleControl,
      streetViewControl: config.enableStreetView,
      fullscreenControl: config.enableFullscreen,
      
      // Styling
      styles: getMapStyles(),
    };
  }, [config]);

  // الحصول على أنماط الخريطة حسب الثيم
  const getMapStyles = useCallback((): google.maps.MapTypeStyle[] => {
    switch (config.theme) {
      case 'dark':
        return [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
        ];
      case 'silver':
        return [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
        ];
      case 'retro':
        return [
          { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
        ];
      default:
        return [];
    }
  }, [config.theme]);

  // تحميل الإعدادات عند تحميل المكون
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // إرجاع حالة الخطأ مع رسالة واضحة
  const getErrorMessage = useCallback(() => {
    if (!error) return null;
    
    if (error.includes('Failed to fetch')) {
      return 'فشل في الاتصال بالخادم. تحقق من الاتصال بالإنترنت.';
    }
    
    if (error.includes('401') || error.includes('Unauthorized')) {
      return 'غير مخول لتحميل إعدادات الخرائط.';
    }
    
    if (error.includes('500')) {
      return 'خطأ في الخادم. حاول مرة أخرى لاحقاً.';
    }
    
    return error;
  }, [error]);

  return {
    // الحالة
    config,
    isLoading,
    error: getErrorMessage(),
    isValid: validateConfig(config),
    isEnabled: config.enabled && validateConfig(config),
    
    // الوظائف
    loadConfig,
    updateConfigField,
    validateConfig,
    
    // إعدادات Google Maps
    getMapScriptConfig,
    getMapOptions,
    getMapStyles,
    
    // الإعدادات الافتراضية
    defaultConfig,
  };
}

export type { GoogleMapsConfig };