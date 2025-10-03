"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMapsConfig } from '@/hooks/use-maps-config';
import { useToast } from '@/hooks/use-toast';

interface MapsContextType {
  // إعدادات الخرائط
  config: {
    enabled: boolean;
    apiKey: string;
    defaultCenter: { lat: number; lng: number };
    defaultZoom: number;
    mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    theme: 'default' | 'dark' | 'silver' | 'retro';
    language: string;
    region: string;
    enableClustering: boolean;
    enableStreetView: boolean;
    enableFullscreen: boolean;
    enableZoomControl: boolean;
    enableMapTypeControl: boolean;
    enableScaleControl: boolean;
  };
  
  // حالة النظام
  isLoading: boolean;
  isEnabled: boolean;
  error: string | null;
  
  // خدمات الخرائط
  services: {
    geocode: (address: string) => Promise<{ lat: number; lng: number; address: string } | null>;
    reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
    calculateDistance: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => Promise<number>;
    getDirections: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => Promise<any>;
  };
  
  // إدارة الحالة
  updateConfig: (updates: Partial<MapsContextType['config']>) => Promise<void>;
  refreshConfig: () => Promise<void>;
  validateApiKey: (key: string) => Promise<boolean>;
  
  // إدارة المواقع
  locations: {
    addLocation: (location: { id: string; name: string; lat: number; lng: number; type: string }) => void;
    removeLocation: (id: string) => void;
    getLocationsByType: (type: string) => Array<{ id: string; name: string; lat: number; lng: number; type: string }>;
    getAllLocations: () => Array<{ id: string; name: string; lat: number; lng: number; type: string }>;
  };
}

const defaultConfig = {
  enabled: false,
  apiKey: '',
  defaultCenter: { lat: 30.0444, lng: 31.2357 }, // القاهرة
  defaultZoom: 10,
  mapType: 'roadmap' as const,
  theme: 'default' as const,
  language: 'ar',
  region: 'EG',
  enableClustering: true,
  enableStreetView: true,
  enableFullscreen: true,
  enableZoomControl: true,
  enableMapTypeControl: true,
  enableScaleControl: true,
};

const MapsContext = createContext<MapsContextType | null>(null);

interface MapsProviderProps {
  children: React.ReactNode;
}

export function MapsProvider({ children }: MapsProviderProps) {
  const mapsConfig = useMapsConfig();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
  }>>([]);

  // خدمات الخرائط
  const geocode = useCallback(async (address: string) => {
    if (!mapsConfig.config.enabled || !mapsConfig.config.apiKey) {
      console.warn('Maps not enabled or API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsConfig.config.apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }, [mapsConfig.config.enabled, mapsConfig.config.apiKey]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!mapsConfig.config.enabled || !mapsConfig.config.apiKey) {
      console.warn('Maps not enabled or API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsConfig.config.apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        return data.results[0].formatted_address;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }, [mapsConfig.config.enabled, mapsConfig.config.apiKey]);

  const calculateDistance = useCallback(async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (!mapsConfig.config.enabled || !mapsConfig.config.apiKey) {
      console.warn('Maps not enabled or API key not configured');
      return 0;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.lat},${from.lng}&destinations=${to.lat},${to.lng}&units=metric&key=${mapsConfig.config.apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.rows?.length > 0 && data.rows[0].elements?.length > 0) {
        const element = data.rows[0].elements[0];
        if (element.status === 'OK') {
          return element.distance.value; // in meters
        }
      }
      return 0;
    } catch (error) {
      console.error('Distance calculation error:', error);
      return 0;
    }
  }, [mapsConfig.config.enabled, mapsConfig.config.apiKey]);

  const getDirections = useCallback(async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (!mapsConfig.config.enabled || !mapsConfig.config.apiKey) {
      console.warn('Maps not enabled or API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${mapsConfig.config.apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        return data;
      }
      return null;
    } catch (error) {
      console.error('Directions error:', error);
      return null;
    }
  }, [mapsConfig.config.enabled, mapsConfig.config.apiKey]);

  // إدارة الحالة
  const updateConfig = useCallback(async (updates: Partial<MapsContextType['config']>) => {
    try {
      // تحديث الإعدادات عبر API
      const response = await fetch('/api/system-settings/maps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await mapsConfig.loadConfig();
        toast({
          title: "تم تحديث إعدادات الخرائط",
          description: "تم حفظ التغييرات بنجاح",
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update maps config:', error);
      toast({
        title: "خطأ في التحديث",
        description: "فشل في حفظ إعدادات الخرائط",
        variant: "destructive",
      });
    }
  }, [mapsConfig, toast]);

  const refreshConfig = useCallback(async () => {
    await mapsConfig.loadConfig();
  }, [mapsConfig]);

  const validateApiKey = useCallback(async (key: string) => {
    if (!key || key.length < 30 || !key.startsWith('AIza')) {
      return false;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=Cairo,Egypt&key=${key}`
      );
      const data = await response.json();
      return data.status === 'OK';
    } catch {
      return false;
    }
  }, []);

  // إدارة المواقع
  const locationServices = {
    addLocation: useCallback((location: { id: string; name: string; lat: number; lng: number; type: string }) => {
      setLocations(prev => {
        const existing = prev.find(l => l.id === location.id);
        if (existing) {
          return prev.map(l => l.id === location.id ? location : l);
        }
        return [...prev, location];
      });
    }, []),

    removeLocation: useCallback((id: string) => {
      setLocations(prev => prev.filter(l => l.id !== id));
    }, []),

    getLocationsByType: useCallback((type: string) => {
      return locations.filter(l => l.type === type);
    }, [locations]),

    getAllLocations: useCallback(() => {
      return locations;
    }, [locations]),
  };

  const contextValue: MapsContextType = {
    config: mapsConfig.config,
    isLoading: mapsConfig.isLoading,
    isEnabled: mapsConfig.config.enabled,
    error: mapsConfig.error,
    services: {
      geocode,
      reverseGeocode,
      calculateDistance,
      getDirections,
    },
    updateConfig,
    refreshConfig,
    validateApiKey,
    locations: locationServices,
  };

  return (
    <MapsContext.Provider value={contextValue}>
      {children}
    </MapsContext.Provider>
  );
}

export function useMaps() {
  const context = useContext(MapsContext);
  if (!context) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
}

// Hook محدد للخدمات الجغرافية
export function useGeolocation() {
  const maps = useMaps();
  
  return {
    geocode: maps.services.geocode,
    reverseGeocode: maps.services.reverseGeocode,
    calculateDistance: maps.services.calculateDistance,
    getDirections: maps.services.getDirections,
    isAvailable: maps.isEnabled && !maps.isLoading && !maps.error,
  };
}

// Hook محدد لإدارة المواقع
export function useLocationManager() {
  const maps = useMaps();
  
  return {
    ...maps.locations,
    isAvailable: maps.isEnabled && !maps.isLoading && !maps.error,
  };
}