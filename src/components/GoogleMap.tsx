"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Crosshair, AlertTriangle, Loader2, Settings, CheckCircle } from 'lucide-react';
import { useMapsConfig } from '@/hooks/use-maps-config';
import Link from 'next/link';
import { loadGoogleMapsAPI } from '@/lib/google-maps-loader';

interface GoogleMapProps {
  // يمكن تخطي apiKey لاستخدام إعدادات النظام
  apiKey?: string;
  initialLat?: number;
  initialLng?: number;
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  autoDetectLocation?: boolean;
  height?: string;
  className?: string;
  // خيارات إضافية
  showSettingsLink?: boolean;
  useSystemSettings?: boolean;
}

interface MapState {
  loaded: boolean;
  error: string | null;
  currentLocation: { lat: number; lng: number } | null;
  selectedLocation: { lat: number; lng: number } | null;
  address: string | null;
  detectingLocation: boolean;
}

export default function GoogleMap({
  apiKey,
  initialLat,
  initialLng,
  zoom,
  onLocationSelect,
  autoDetectLocation = false,
  height = "400px",
  className = "",
  showSettingsLink = true,
  useSystemSettings = true
}: GoogleMapProps) {
  // تحميل إعدادات الخرائط من النظام
  const mapsConfig = useMapsConfig();
  
  // استخدام إعدادات النظام أو القيم الممررة
  const finalApiKey = useSystemSettings ? mapsConfig.config.apiKey : (apiKey || mapsConfig.config.apiKey);
  const finalLat = initialLat ?? mapsConfig.config.defaultCenter.lat;
  const finalLng = initialLng ?? mapsConfig.config.defaultCenter.lng;
  const finalZoom = zoom ?? mapsConfig.config.defaultZoom;
  const [mapState, setMapState] = useState<MapState>({
    loaded: false,
    error: null,
    currentLocation: null,
    selectedLocation: { lat: finalLat, lng: finalLng },
    address: null,
    detectingLocation: false
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  // Validate API Key
  const validateApiKey = useCallback(async (key: string) => {
    if (!key) {
      setMapState(prev => ({ ...prev, error: 'مطلوب مفتاح Google Maps API' }));
      return false;
    }
    
    try {
      // Test API key with a simple request
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Cairo&key=${key}`);
      const data = await response.json();
      
      if (data.status === 'REQUEST_DENIED') {
        setMapState(prev => ({ ...prev, error: 'Invalid API Key or API access denied' }));
        return false;
      }
      
      return true;
    } catch (error) {
      setMapState(prev => ({ ...prev, error: 'Unable to validate API key' }));
      return false;
    }
  }, []);

  // Load Google Maps script using singleton loader
  const loadGoogleMaps = useCallback(async () => {
    // تحقق من حالة إعدادات النظام
    if (useSystemSettings && mapsConfig.isLoading) {
      return; // انتظر حتى تحميل الإعدادات
    }
    
    if (useSystemSettings && !mapsConfig.isEnabled) {
      setMapState(prev => ({ ...prev, error: 'خرائط جوجل غير مفعلة في إعدادات النظام' }));
      return;
    }

    if (!finalApiKey) {
      setMapState(prev => ({ ...prev, error: 'مطلوب مفتاح Google Maps API' }));
      return;
    }

    // Check if API key is valid first
    const isValid = await validateApiKey(finalApiKey);
    if (!isValid) return;

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapState(prev => ({ ...prev, loaded: true, error: null }));
      return;
    }

    try {
      // Use singleton loader to prevent multiple script insertions
      const libraries = ['places', 'geometry'];
      const language = useSystemSettings ? mapsConfig.config.language : 'ar';
      const region = useSystemSettings ? mapsConfig.config.region : 'EG';
      
      await loadGoogleMapsAPI({
        apiKey: finalApiKey,
        libraries,
        language,
        region
      });
      
      // Update state on successful load
      setMapState(prev => ({ ...prev, loaded: true, error: null }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Google Maps';
      setMapState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [finalApiKey, validateApiKey, useSystemSettings, mapsConfig.isLoading, mapsConfig.isEnabled, mapsConfig.config.language, mapsConfig.config.region]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapState(prev => ({ ...prev, error: 'Geolocation is not supported by this browser' }));
      return;
    }

    setMapState(prev => ({ ...prev, detectingLocation: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setMapState(prev => ({ 
          ...prev, 
          currentLocation: location,
          selectedLocation: location,
          detectingLocation: false
        }));

        // Update map and marker if loaded
        if (map && marker) {
          map.setCenter(location);
          marker.setPosition(location);
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              setMapState(prev => ({ ...prev, address }));
              onLocationSelect?.(location.lat, location.lng, address);
            }
          });
        }
      },
      (error) => {
        setMapState(prev => ({ 
          ...prev, 
          detectingLocation: false,
          error: `Location error: ${error.message}` 
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [map, marker, onLocationSelect]);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapState.loaded || !window.google) return;

    const mapElement = document.getElementById('google-map');
    if (!mapElement) return;

    const initialLocation = mapState.selectedLocation || { lat: finalLat, lng: finalLng };

    // استخدام إعدادات النظام للخريطة
    const mapOptions = useSystemSettings && mapsConfig.getMapOptions() 
      ? { ...mapsConfig.getMapOptions(), center: initialLocation }
      : {
          center: initialLocation,
          zoom: finalZoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        };

    // Create map
    const newMap = new google.maps.Map(mapElement, mapOptions);

    // Create marker
    const newMarker = new google.maps.Marker({
      position: initialLocation,
      map: newMap,
      draggable: true,
      title: 'Clinic Location'
    });

    // Handle marker drag
    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        const lat = position.lat();
        const lng = position.lng();
        
        setMapState(prev => ({ 
          ...prev, 
          selectedLocation: { lat, lng }
        }));

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            setMapState(prev => ({ ...prev, address }));
            onLocationSelect?.(lat, lng, address);
          }
        });
      }
    });

    // Handle map click
    newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
      const position = event.latLng;
      if (position) {
        const lat = position.lat();
        const lng = position.lng();
        
        newMarker.setPosition({ lat, lng });
        setMapState(prev => ({ 
          ...prev, 
          selectedLocation: { lat, lng }
        }));

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            setMapState(prev => ({ ...prev, address }));
            onLocationSelect?.(lat, lng, address);
          }
        });
      }
    });

    setMap(newMap);
    setMarker(newMarker);

    // Auto-detect location if enabled
    if (autoDetectLocation) {
      getCurrentLocation();
    }
  }, [mapState.loaded, mapState.selectedLocation, finalLat, finalLng, finalZoom, onLocationSelect, autoDetectLocation, getCurrentLocation, useSystemSettings, mapsConfig.getMapOptions]);

  // Load Google Maps on mount
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  // Initialize map when loaded
  useEffect(() => {
    if (mapState.loaded) {
      initializeMap();
    }
  }, [mapState.loaded, initializeMap]);

  // عرض رسالة خطأ محسنة
  if (mapState.error || (useSystemSettings && mapsConfig.error)) {
    const errorMessage = mapState.error || mapsConfig.error;
    const isConfigError = useSystemSettings && (!mapsConfig.isEnabled || !mapsConfig.config.apiKey);
    
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong className="text-red-700">خطأ في خرائط جوجل:</strong>
                  <p className="mt-1">{errorMessage}</p>
                </div>
                
                {isConfigError && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 mb-3">
                      <strong>يبدو أن خرائط جوجل غير معدة بشكل صحيح:</strong>
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {mapsConfig.config.enabled ? (
                            <><CheckCircle className="h-3 w-3 ml-1" /> مفعل</>
                          ) : (
                            <><AlertTriangle className="h-3 w-3 ml-1" /> معطل</>
                          )}
                        </Badge>
                        <p className="text-xs text-red-700">
                          API Key: {mapsConfig.config.apiKey ? 'موجود' : 'غير موجود'}
                        </p>
                      </div>
                      {showSettingsLink && (
                        <Link href="/settings?category=integrations&tab=maps">
                          <Button size="sm" variant="outline" className="bg-white hover:bg-red-50">
                            <Settings className="h-4 w-4 ml-2" />
                            إعدادات الخرائط
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                
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

  // عرض حالة التحميل
  if (!mapState.loaded || (useSystemSettings && mapsConfig.isLoading)) {
    const loadingMessage = useSystemSettings && mapsConfig.isLoading 
      ? 'جاري تحميل إعدادات الخرائط...'
      : 'جاري تحميل خرائط جوجل...';
      
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-muted-foreground font-medium">{loadingMessage}</p>
                {useSystemSettings && (
                  <p className="text-xs text-muted-foreground mt-1">
                    يتم تحميل الإعدادات من قاعدة البيانات
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Map Container */}
          <div 
            id="google-map" 
            style={{ height }}
            className="w-full rounded-t-lg"
          />
          
          {/* Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={getCurrentLocation}
              disabled={mapState.detectingLocation}
              className="shadow-lg"
            >
              {mapState.detectingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Location Info */}
          {mapState.selectedLocation && (
            <div className="p-4 bg-muted/50 border-t">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">الموقع المحدد:</div>
                    <div className="text-xs text-muted-foreground">
                      {mapState.selectedLocation.lat.toFixed(6)}, {mapState.selectedLocation.lng.toFixed(6)}
                    </div>
                    {mapState.address && (
                      <div className="text-sm mt-1">{mapState.address}</div>
                    )}
                    {!mapState.address && (
                      <div className="text-xs text-muted-foreground mt-1">
                        انقر أو اسحب العلامة لاختيار موقع
                      </div>
                    )}
                  </div>
                </div>
                
                {/* معلومات إعدادات الخريطة */}
                {useSystemSettings && (
                  <div className="flex items-center justify-between pt-2 border-t border-muted">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Settings className="h-3 w-3" />
                      <span>تعمل بإعدادات النظام</span>
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {mapsConfig.config.mapType} - {mapsConfig.config.language.toUpperCase()}
                      </Badge>
                    </div>
                    {showSettingsLink && (
                      <Link href="/settings?category=integrations&tab=maps">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Settings className="h-3 w-3 ml-1" />
                          إعدادات
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}