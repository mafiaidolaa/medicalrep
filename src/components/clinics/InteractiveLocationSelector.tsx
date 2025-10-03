"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Crosshair, 
  Loader2, 
  AlertTriangle, 
  Search, 
  Navigation, 
  Target,
  Map,
  Satellite,
  Layers
} from 'lucide-react';
import { systemSettingsService } from '@/lib/system-settings-service';
import { simpleLocationService } from '@/lib/simple-location-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { loadGoogleMapsAPI, forceReloadGoogleMapsAPI, getGoogleMapsLoaderError } from '@/lib/google-maps-loader';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
  source?: 'gps' | 'manual' | 'search' | 'map_click';
}

interface InteractiveLocationSelectorProps {
  value?: LocationData;
  onChange?: (location: LocationData) => void;
  height?: string;
  showCurrentLocation?: boolean;
  enableMapClick?: boolean;
  className?: string;
}

// مكون البحث بالعنوان مع Auto Complete
const AddressSearch: React.FC<{
  onLocationSelect: (location: LocationData) => void;
  disabled?: boolean;
}> = ({ onLocationSelect, disabled }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // البحث في العناوين باستخدام Google Geocoding API (مبسط ومضمون)
  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // التحقق من تفعيل الخرائط
      const isEnabled = await systemSettingsService.isMapsEnabled();
      if (!isEnabled) {
        toast({
          title: "خطأ في البحث",
          description: "خدمة الخرائط غير مفعلة أو مفتاح API مفقود",
          variant: "destructive"
        });
        return;
      }

      // استخدام Google Geocoding API للبحث بالعنوان
      const apiKey = await systemSettingsService.getGoogleMapsApiKey();
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(query)}` +
        `&language=ar` +
        `&region=EG` +
        `&key=${apiKey}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setSuggestions(data.results.slice(0, 5)); // أول 5 نتائج فقط
        } else {
          setSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Address search error:', error);
      toast({
        title: "خطأ في البحث",
        description: "فشل في البحث عن العناوين. يرجى المحاولة لاحقاً",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  // معالج تغيير النص مع التأخير
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  // اختيار عنوان من الاقتراحات
  const selectAddress = (result: any) => {
    const location = result.geometry.location;
    setSearchQuery(result.formatted_address);
    setShowSuggestions(false);
    setSuggestions([]);

    onLocationSelect({
      lat: location.lat,
      lng: location.lng,
      address: result.formatted_address,
      source: 'search'
    });

    toast({
      title: "تم تحديد الموقع",
      description: "تم تحديد الموقع من البحث بنجاح",
    });
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن عنوان أو معلم مشهور..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            disabled={disabled}
            className="pr-10"
            onFocus={() => setShowSuggestions(true)}
          />
          {isSearching && (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => searchAddresses(searchQuery)}
          disabled={disabled || isSearching || !searchQuery}
        >
          بحث
        </Button>
      </div>

      {/* قائمة الاقتراحات */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map((result, index) => (
            <button
              key={index}
              className="w-full text-right px-3 py-2 hover:bg-muted border-b last:border-b-0 focus:bg-muted focus:outline-none"
              onClick={() => selectAddress(result)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{result.formatted_address}</p>
                  {result.types && result.types.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {result.types.slice(0, 2).join(' • ')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* زر لإغلاق الاقتراحات عند النقر خارجها */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};

export default function InteractiveLocationSelector({ 
  value, 
  onChange, 
  height = "400px",
  showCurrentLocation = true,
  enableMapClick = true,
  className 
}: InteractiveLocationSelectorProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

  const lat = value?.lat || 30.0444;  // القاهرة كقيمة افتراضية
  const lng = value?.lng || 31.2357;
  const address = value?.address || '';

  // تحديث الموقع
  const updateLocation = useCallback((newLocation: LocationData) => {
    onChange?.(newLocation);
  }, [onChange]);

  // تحميل خريطة Google Maps باستخدام singleton loader
  const loadGoogleMaps = useCallback(async (forceReload: boolean = false) => {
    try {
      console.log('InteractiveLocationSelector: Starting Google Maps loading process', { forceReload, retryAttempt });
      
      const isEnabled = await systemSettingsService.isMapsEnabled();
      if (!isEnabled) {
        console.log('InteractiveLocationSelector: Maps service is not enabled');
        setError('خدمة الخرائط غير مفعلة أو مفتاح API مفقود');
        return;
      }

      const apiKey = await systemSettingsService.getGoogleMapsApiKey();
      if (!apiKey) {
        console.log('InteractiveLocationSelector: API key not available');
        setError('مفتاح Google Maps API غير متوفر');
        return;
      }

      const config = {
        apiKey,
        libraries: ['places', 'geometry'],
        language: 'ar',
        region: 'EG'
      };

      console.log('InteractiveLocationSelector: Loading Google Maps API with singleton loader', { forceReload });
      
      if (forceReload) {
        // استخدام القوة لإعادة التحميل إذا فشل التحميل العادي
        await forceReloadGoogleMapsAPI(config);
      } else {
        // استخدام الـ singleton loader لمنع تحميل متعدد
        await loadGoogleMapsAPI(config);
      }
      
      console.log('InteractiveLocationSelector: Checking Google Maps API availability:', {
        hasGoogle: !!window.google,
        hasMaps: !!window.google?.maps,
        hasMap: !!window.google?.maps?.Map,
        hasMarker: !!window.google?.maps?.Marker,
        hasInfoWindow: !!window.google?.maps?.InfoWindow
      });
      
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('InteractiveLocationSelector: Google Maps API fully loaded and ready');
        setIsMapLoaded(true);
        setError(null);
        setRetryAttempt(0); // Reset retry count on success
      } else {
        throw new Error('Google Maps API not fully available after loading');
      }
    } catch (err) {
      console.error('InteractiveLocationSelector: Error loading Google Maps:', err);
      const loaderError = getGoogleMapsLoaderError();
      
      // Try force reload if this is the first attempt and we haven't tried it yet
      if (retryAttempt === 0 && !forceReload) {
        console.log('InteractiveLocationSelector: First attempt failed, trying force reload');
        setRetryAttempt(1);
        return loadGoogleMaps(true);
      }
      
      // If both attempts failed, show error
      const errorMessage = loaderError || (err instanceof Error ? err.message : 'خطأ غير معروف');
      setError(`خطأ في تحميل خريطة Google Maps: ${errorMessage}`);
      setRetryAttempt(0);
    }
  }, [retryAttempt]);

  // إعداد الخريطة
  const initializeMap = useCallback(async () => {
    console.log('InteractiveLocationSelector: initializeMap called with:', {
      hasMapRef: !!mapRef.current,
      hasWindow: !!window.google,
      isMapLoaded,
      hasMapConstructor: !!window.google?.maps?.Map
    });
    
    if (!mapRef.current) {
      console.log('InteractiveLocationSelector: Map ref not available');
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error('InteractiveLocationSelector: Google Maps API not fully loaded');
      setError('Google Maps API لم يتم تحميله بشكل صحيح - يرجى إعادة المحاولة');
      return;
    }

    // انتظار قصير لضمان اكتمال تحميل الـ API
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      console.log('InteractiveLocationSelector: Getting map settings');
      const mapSettings = await systemSettingsService.getMapsSettings();
      
      console.log('InteractiveLocationSelector: Creating map options');
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: 15,
        mapTypeId: mapType,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        fullscreenControl: true,
        streetViewControl: true,
        gestureHandling: 'auto',
        clickableIcons: true,
        styles: mapSettings.theme === 'dark' ? getDarkMapStyles() : undefined
      };

      console.log('InteractiveLocationSelector: Creating Google Maps instance');
      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);
      console.log('InteractiveLocationSelector: Map instance created successfully');
      
      // تطبيق المستمعين والعلامات فقط بعد إنشاء الخريطة بنجاح
      addMapListeners();
      updateMapMarker();
      
    } catch (error) {
      console.error('InteractiveLocationSelector: Error creating map instance:', error);
      setError(`خطأ في إنشاء الخريطة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      return;
    }
  }, [lat, lng, mapType, isMapLoaded]);

  // إضافة مستمعي الخريطة
  const addMapListeners = useCallback(() => {
    if (!mapInstanceRef.current || !enableMapClick) return;

    console.log('InteractiveLocationSelector: Adding map listeners');
    
    // إضافة مستمع للنقر على الخريطة
    mapInstanceRef.current.addListener('click', async (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const clickedLat = event.latLng.lat();
        const clickedLng = event.latLng.lng();

        console.log('InteractiveLocationSelector: Map clicked at:', clickedLat, clickedLng);

        // محاولة الحصول على العنوان من الإحداثيات
        try {
          const apiKey = await systemSettingsService.getGoogleMapsApiKey();
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${clickedLat},${clickedLng}&language=ar&key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            const addressFromCoords = data.results?.[0]?.formatted_address || '';
            
            updateLocation({
              lat: clickedLat,
              lng: clickedLng,
              address: addressFromCoords,
              source: 'map_click'
            });

            toast({
              title: "تم تحديد الموقع",
              description: "تم تحديد الموقع من الخريطة بنجاح",
            });
          }
        } catch (error) {
          console.warn('InteractiveLocationSelector: Error getting address from coordinates:', error);
          // في حالة فشل الحصول على العنوان، نحفظ الإحداثيات فقط
          updateLocation({
            lat: clickedLat,
            lng: clickedLng,
            source: 'map_click'
          });
        }
      }
    });
  }, [enableMapClick, updateLocation, toast]);

  // تحديث علامة الموقع على الخريطة
  const updateMapMarker = useCallback(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return;

    // إزالة العلامة السابقة
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    try {
      // إضافة علامة جديدة مع تحقق من صحة mapInstanceRef
      if (mapInstanceRef.current && typeof window.google.maps.Marker === 'function') {
        markerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: 'موقع العيادة',
          draggable: true,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });

        // إضافة مستمع لسحب العلامة
        markerRef.current.addListener('dragend', async (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();

            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&language=ar&key=${await systemSettingsService.getGoogleMapsApiKey()}`
              );
              
              if (response.ok) {
                const data = await response.json();
                const newAddress = data.results?.[0]?.formatted_address || '';
                
                updateLocation({
                  lat: newLat,
                  lng: newLng,
                  address: newAddress,
                  source: 'manual'
                });
              }
            } catch (error) {
              updateLocation({
                lat: newLat,
                lng: newLng,
                source: 'manual'
              });
            }
          }
        });

        // إضافة نافذة معلومات
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="text-align: right; direction: rtl; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937;">موقع العيادة</h3>
              ${address ? `<p style="margin: 4px 0; color: #6b7280;">${address}</p>` : ''}
              <div style="font-size: 12px; color: #9ca3af;">
                <div>خط العرض: ${lat.toFixed(6)}</div>
                <div>خط الطول: ${lng.toFixed(6)}</div>
              </div>
              <div style="margin-top: 8px; font-size: 11px; color: #10b981;">
                يمكنك سحب العلامة لتغيير الموقع
              </div>
            </div>
          `
        });

        markerRef.current.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, markerRef.current);
        });

        // توسيط الخريطة على الموقع الجديد
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
        }
      }
    } catch (error) {
      console.error('Error creating marker:', error);
    }
  }, [lat, lng, address, updateLocation]);

  // تحديد الموقع الحالي وإظهاره - بدون طلب تلقائي
  const detectAndShowCurrentLocation = useCallback(async () => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      console.log('InteractiveLocationSelector: Map not ready for location detection');
      return;
    }

    try {
      console.log('InteractiveLocationSelector: Starting location detection');
      
      // طلب الموقع مع رسائل للمستخدم
      const location = await simpleLocationService.requestLocationWithToast(toast, 'تحديد موقع العيادة');
      
      if (location && mapInstanceRef.current) {
        console.log('InteractiveLocationSelector: Location detected successfully:', location);
        
        const currentLoc: LocationData = {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
          source: 'gps'
        };

        setCurrentLocation(currentLoc);

        // إزالة العلامة السابقة
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setMap(null);
        }

        // إضافة علامة الموقع الحالي
        currentLocationMarkerRef.current = new google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: mapInstanceRef.current,
          title: 'موقعك الحالي',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });

        // إضافة نافذة معلومات للموقع الحالي
        const currentLocationInfo = new google.maps.InfoWindow({
          content: `
            <div style="text-align: right; direction: rtl;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937;">موقعك الحالي</h3>
              <div style="font-size: 12px; color: #6b7280;">
                الدقة: ${location.accuracy ? Math.round(location.accuracy) + ' متر' : 'غير محدد'}
              </div>
            </div>
          `
        });

        currentLocationMarkerRef.current.addListener('click', () => {
          currentLocationInfo.open(mapInstanceRef.current, currentLocationMarkerRef.current);
        });
        
        // تحريك الخريطة للموقع المكتشف
        mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
        mapInstanceRef.current.setZoom(16);
        
      } else {
        console.log('InteractiveLocationSelector: Location detection failed or cancelled');
      }
    } catch (error) {
      console.error('InteractiveLocationSelector: Error detecting location:', error);
    }
  }, [toast]);

  // تحديد الموقع الحالي يدوياً
  const detectCurrentLocation = async () => {
    if (isDetecting || isRequestingLocation) {
      console.log('InteractiveLocationSelector: Already detecting location, skipping');
      return;
    }

    setIsDetecting(true);
    setIsRequestingLocation(true);
    setError(null);

    try {
      console.log('InteractiveLocationSelector: Manual location detection requested');
      const location = await simpleLocationService.requestLocationWithToast(toast, 'تحديد موقع العيادة');
      
      if (location) {
        console.log('InteractiveLocationSelector: Manual location detection successful:', location);
        
        // محاولة الحصول على العنوان
        try {
          const apiKey = await systemSettingsService.getGoogleMapsApiKey();
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&language=ar&key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            const detectedAddress = data.results?.[0]?.formatted_address || '';
            
            updateLocation({
              lat: location.latitude,
              lng: location.longitude,
              address: detectedAddress,
              accuracy: location.accuracy,
              source: 'gps'
            });
          }
        } catch (error) {
          console.warn('InteractiveLocationSelector: Error getting address for detected location:', error);
          updateLocation({
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy,
            source: 'gps'
          });
        }

        toast({
          title: "تم تحديد الموقع",
          description: "تم تحديد موقعك الحالي بنجاح",
        });
      } else {
        console.log('InteractiveLocationSelector: Manual location detection failed or denied');
        setError('فشل في تحديد الموقع الحالي. تأكد من تفعيل GPS والسماح للموقع.');
      }
    } catch (error) {
      console.error('InteractiveLocationSelector: Error in manual location detection:', error);
      setError('حدث خطأ في تحديد الموقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDetecting(false);
      setIsRequestingLocation(false);
    }
  };

  // الحصول على أنماط الخريطة المظلمة
  const getDarkMapStyles = (): google.maps.MapTypeStyle[] => [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
    // يمكن إضافة المزيد من الأنماط حسب الحاجة
  ];

  // تحميل الخريطة عند بداية التحميل
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  // مرجع للتأكد من عدم التهيئة المتعددة
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  // إعداد الخريطة عند التحميل
  useEffect(() => {
    if (isMapLoaded && !isMapInitialized) {
      console.log('InteractiveLocationSelector: Starting map initialization');
      setIsMapInitialized(true);
      initializeMap().catch(error => {
        console.error('InteractiveLocationSelector: Map initialization failed:', error);
        setIsMapInitialized(false); // إعادة تعيين للمحاولة مرة أخرى
      });
    }
  }, [isMapLoaded, isMapInitialized, initializeMap]);

  // تحديث علامة الموقع عند تغيير القيم
  useEffect(() => {
    if (isMapInitialized && mapInstanceRef.current) {
      updateMapMarker();
    }
  }, [lat, lng, address, isMapInitialized, updateMapMarker]);

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            خطأ في تحميل الخريطة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button 
              onClick={() => loadGoogleMaps(false)} 
              variant="outline"
              disabled={retryAttempt > 0}
            >
              {retryAttempt > 0 ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}
            </Button>
            <Button 
              onClick={() => loadGoogleMaps(true)} 
              variant="outline"
              disabled={retryAttempt > 0}
            >
              {retryAttempt > 0 ? 'جاري إعادة التحميل...' : 'إعادة تحميل قسرية'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          تحديد الموقع الجغرافي التفاعلي
        </CardTitle>
        <CardDescription>
          حدد موقع العيادة باستخدام الخريطة التفاعلية أو البحث بالعنوان
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* البحث بالعنوان */}
        <div className="space-y-2">
          <Label>البحث بالعنوان</Label>
          <AddressSearch 
            onLocationSelect={updateLocation}
            disabled={!isMapInitialized}
          />
          <p className="text-xs text-muted-foreground">
            ابحث عن العنوان أو معلم مشهور لتحديد الموقع تلقائياً
          </p>
        </div>

        {/* أزرار التحكم */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={detectCurrentLocation}
            disabled={isDetecting || isRequestingLocation || !isMapInitialized}
            className="flex items-center gap-2"
          >
            {(isDetecting || isRequestingLocation) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحديد...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                تحديد موقعي الحالي
              </>
            )}
          </Button>

          <div className="flex gap-1">
            <Button
              type="button"
              variant={mapType === 'roadmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMapType('roadmap');
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setMapTypeId('roadmap');
                }
              }}
              disabled={!isMapInitialized}
            >
              <Map className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={mapType === 'satellite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMapType('satellite');
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setMapTypeId('satellite');
                }
              }}
              disabled={!isMapInitialized}
            >
              <Satellite className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={mapType === 'hybrid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMapType('hybrid');
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setMapTypeId('hybrid');
                }
              }}
              disabled={!isMapInitialized}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* حاوية الخريطة */}
        <div className="relative">
          {!isMapInitialized && (
            <div 
              className="flex items-center justify-center bg-muted rounded-lg"
              style={{ height }}
            >
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {!isMapLoaded ? 'جاري تحميل Google Maps API...' : 'جاري إعداد الخريطة التفاعلية...'}
                </p>
              </div>
            </div>
          )}
          
          <div
            ref={mapRef}
            style={{ 
              height, 
              display: isMapInitialized ? 'block' : 'none',
              transition: 'opacity 0.3s ease-in-out',
              opacity: isMapInitialized ? 1 : 0
            }}
            className="rounded-lg border"
          />

          {/* شارة معلومات الموقع */}
          {isMapInitialized && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-md border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">الإحداثيات</Label>
                    <div className="font-mono">
                      <div>خط العرض: {lat.toFixed(6)}</div>
                      <div>خط الطول: {lng.toFixed(6)}</div>
                    </div>
                  </div>
                  
                  {address && (
                    <div>
                      <Label className="text-xs text-muted-foreground">العنوان</Label>
                      <div className="text-sm break-words">{address}</div>
                    </div>
                  )}
                </div>
                
                {value?.source && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {value.source === 'gps' && (
                        <>
                          <Navigation className="h-3 w-3 mr-1" />
                          GPS
                        </>
                      )}
                      {value.source === 'search' && (
                        <>
                          <Search className="h-3 w-3 mr-1" />
                          بحث
                        </>
                      )}
                      {value.source === 'manual' && (
                        <>
                          <Target className="h-3 w-3 mr-1" />
                          يدوي
                        </>
                      )}
                      {value.source === 'map_click' && (
                        <>
                          <MapPin className="h-3 w-3 mr-1" />
                          نقرة خريطة
                        </>
                      )}
                    </Badge>
                    
                    {value.accuracy && (
                      <Badge variant="secondary" className="text-xs">
                        دقة: ±{Math.round(value.accuracy)}م
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* إدخال الإحداثيات يدوياً */}
        <div className="space-y-3">
          <Label>إدخال الإحداثيات يدوياً</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-lat" className="text-sm">خط العرض (Latitude)</Label>
              <Input
                id="manual-lat"
                type="number"
                step="any"
                placeholder="30.0444"
                value={lat}
                onChange={(e) => {
                  const newLat = parseFloat(e.target.value) || 0;
                  updateLocation({
                    lat: newLat,
                    lng,
                    address,
                    source: 'manual'
                  });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manual-lng" className="text-sm">خط الطول (Longitude)</Label>
              <Input
                id="manual-lng"
                type="number"
                step="any"
                placeholder="31.2357"
                value={lng}
                onChange={(e) => {
                  const newLng = parseFloat(e.target.value) || 0;
                  updateLocation({
                    lat,
                    lng: newLng,
                    address,
                    source: 'manual'
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* نصائح للمستخدم */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">نصائح لتحديد الموقع بدقة:</h4>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>استخدم البحث بالعنوان للوصول السريع للموقع المطلوب</li>
            <li>انقر على الخريطة مباشرة لتحديد موقع دقيق</li>
            <li>اسحب العلامة الحمراء لتعديل الموقع بدقة</li>
            <li>استخدم "تحديد موقعي الحالي" إذا كنت في موقع العيادة</li>
            <li>تأكد من تفعيل GPS لأفضل دقة في تحديد الموقع</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}