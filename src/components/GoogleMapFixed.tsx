"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Settings, Crosshair, MapPin } from 'lucide-react';
import Link from 'next/link';
import { loadGoogleMapsAPI } from '@/lib/google-maps-loader';

interface GoogleMapFixedProps {
  apiKey?: string;
  initialLat?: number;
  initialLng?: number;
  height?: string;
  className?: string;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  autoDetectLocation?: boolean;
  showSettingsLink?: boolean;
  useSystemSettings?: boolean;
}

interface MapState {
  loaded: boolean;
  error: string | null;
  selectedLocation: { lat: number; lng: number } | null;
  address: string;
  detectingLocation: boolean;
}

declare global {
  interface Window {
    googleFixed?: any; // Renamed to avoid conflict with global
    initGoogleMap: () => void;
  }
}

export default function GoogleMapFixed({
  apiKey = '',
  initialLat = 30.0444,
  initialLng = 31.2357,
  height = '400px',
  className = '',
  onLocationSelect,
  autoDetectLocation = false,
  showSettingsLink = true,
  useSystemSettings = false,
}: GoogleMapFixedProps) {
  const [mapState, setMapState] = useState<MapState>({
    loaded: false,
    error: null,
    selectedLocation: null,
    address: '',
    detectingLocation: false,
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  // Load Google Maps script using singleton loader
  const loadGoogleMaps = useCallback(async () => {
    if (!apiKey) {
      setMapState(prev => ({ ...prev, error: 'لا يوجد مفتاح API صالح لخرائط جوجل' }));
      return;
    }

    if (scriptLoadedRef.current || window.google) {
      setMapState(prev => ({ ...prev, loaded: true }));
      return;
    }

    try {
      // Use singleton loader to prevent multiple script insertions
      await loadGoogleMapsAPI({
        apiKey,
        libraries: ['places'],
        language: 'ar'
      });

      scriptLoadedRef.current = true;
      setMapState(prev => ({ ...prev, loaded: true, error: null }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحميل خرائط جوجل';
      setMapState(prev => ({ 
        ...prev, 
        error: errorMessage
      }));
    }
  }, [apiKey]);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapState.loaded || !window.google || !mapRef.current) return;

    const initialLocation = mapState.selectedLocation || { lat: initialLat, lng: initialLng };

    const mapOptions = {
      center: initialLocation,
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    };

    // Create map
    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    // Create marker
    const marker = new window.google.maps.Marker({
      position: initialLocation,
      map: map,
      draggable: true,
      title: 'موقع العيادة'
    });
    markerRef.current = marker;

    // Handle marker drag
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        const lat = position.lat();
        const lng = position.lng();
        
        setMapState(prev => ({ 
          ...prev, 
          selectedLocation: { lat, lng }
        }));

        // Reverse geocode
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            setMapState(prev => ({ ...prev, address }));
            onLocationSelect?.(lat, lng, address);
          } else {
            onLocationSelect?.(lat, lng);
          }
        });
      }
    });

    // Handle map click
    map.addListener('click', (event: any) => {
      const position = event.latLng;
      if (position) {
        const lat = position.lat();
        const lng = position.lng();
        
        marker.setPosition({ lat, lng });
        setMapState(prev => ({ 
          ...prev, 
          selectedLocation: { lat, lng }
        }));

        // Reverse geocode
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            setMapState(prev => ({ ...prev, address }));
            onLocationSelect?.(lat, lng, address);
          } else {
            onLocationSelect?.(lat, lng);
          }
        });
      }
    });

  }, [mapState.loaded, initialLat, initialLng, onLocationSelect]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapState(prev => ({ 
        ...prev, 
        error: 'المتصفح لا يدعم تحديد الموقع التلقائي' 
      }));
      return;
    }

    setMapState(prev => ({ ...prev, detectingLocation: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        setMapState(prev => ({ 
          ...prev, 
          selectedLocation: { lat: latitude, lng: longitude },
          detectingLocation: false 
        }));

        if (mapInstanceRef.current && markerRef.current) {
          const newPosition = { lat: latitude, lng: longitude };
          mapInstanceRef.current.setCenter(newPosition);
          markerRef.current.setPosition(newPosition);
        }

        // Reverse geocode
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              setMapState(prev => ({ ...prev, address }));
              onLocationSelect?.(latitude, longitude, address);
            } else {
              onLocationSelect?.(latitude, longitude);
            }
          });
        } else {
          onLocationSelect?.(latitude, longitude);
        }
      },
      (error) => {
        setMapState(prev => ({ 
          ...prev, 
          detectingLocation: false,
          error: `خطأ في تحديد الموقع: ${error.message}` 
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onLocationSelect]);

  // Load Google Maps on mount
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  // Initialize map when loaded
  useEffect(() => {
    if (mapState.loaded) {
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [mapState.loaded, initializeMap]);

  // Auto-detect location
  useEffect(() => {
    if (mapState.loaded && autoDetectLocation && !mapState.selectedLocation) {
      const timer = setTimeout(() => {
        getCurrentLocation();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mapState.loaded, autoDetectLocation, mapState.selectedLocation, getCurrentLocation]);

  // Error state
  if (mapState.error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong className="text-red-700">خطأ في خرائط جوجل:</strong>
                  <p className="mt-1">{mapState.error}</p>
                </div>
                
                <div>
                  <strong className="text-sm text-red-700">الحلول المقترحة:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-red-600">
                    <li>تحقق من صحة مفتاح Google Maps API</li>
                    <li>تأكد من تفعيل Google Maps JavaScript API</li>
                    <li>راجع قيود مفتاح API والأذونات</li>
                    <li>تحقق من عدم تجاوز حدود استخدام API</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (!mapState.loaded) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-muted-foreground font-medium">جاري تحميل خرائط جوجل...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  يتم تحميل الخريطة التفاعلية
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map loaded successfully
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">انقر على الخريطة أو اسحب العلامة لتحديد الموقع</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={mapState.detectingLocation}
            >
              {mapState.detectingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Crosshair className="h-4 w-4 mr-2" />
              )}
              تحديد موقعي
            </Button>
          </div>

          {/* Map container */}
          <div 
            ref={mapRef}
            className="w-full rounded-lg border"
            style={{ height }}
          />

          {/* Address display */}
          {mapState.address && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>العنوان:</strong> {mapState.address}
            </div>
          )}

          {/* Coordinates display */}
          {mapState.selectedLocation && (
            <div className="text-xs text-muted-foreground">
              الإحداثيات: {mapState.selectedLocation.lat.toFixed(6)}, {mapState.selectedLocation.lng.toFixed(6)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}