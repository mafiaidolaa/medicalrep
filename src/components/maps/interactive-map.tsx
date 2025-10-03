"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Filter, 
  Layers,
  Crosshair,
  Route,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useMaps } from '@/contexts/maps-context';
import { useDataProvider } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'clinic' | 'area' | 'user' | 'visit';
  metadata?: {
    address?: string;
    phone?: string;
    doctorName?: string;
    status?: string;
    area?: string;
    line?: string;
  };
}

interface InteractiveMapProps {
  locations?: MapLocation[];
  showFilters?: boolean;
  showSearch?: boolean;
  showDirections?: boolean;
  allowLocationAdd?: boolean;
  height?: string;
  className?: string;
  onLocationSelect?: (location: MapLocation) => void;
  onLocationAdd?: (lat: number, lng: number, address?: string) => void;
}

const LOCATION_ICONS = {
  clinic: '🏥',
  area: '🏙️',
  user: '👤',
  visit: '📍',
};

const LOCATION_COLORS = {
  clinic: '#0ea5e9',
  area: '#10b981',
  user: '#f59e0b',
  visit: '#ef4444',
};

export default function InteractiveMap({
  locations = [],
  showFilters = true,
  showSearch = true,
  showDirections = false,
  allowLocationAdd = false,
  height = "500px",
  className = "",
  onLocationSelect,
  onLocationAdd,
}: InteractiveMapProps) {
  const maps = useMaps();
  const { clinics, users } = useDataProvider();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<MapLocation[]>(locations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLayerControls, setShowLayerControls] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    clinic: true,
    area: true,
    user: true,
    visit: true,
  });

  // تحديث المواقع المصفاة
  useEffect(() => {
    let filtered = locations;

    if (searchTerm) {
      filtered = filtered.filter(location => 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.metadata?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.metadata?.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(location => location.type === selectedType);
    }

    // تطبيق فلاتر الطبقات
    filtered = filtered.filter(location => visibleLayers[location.type] !== false);

    setFilteredLocations(filtered);
  }, [locations, searchTerm, selectedType, visibleLayers]);

  // تحميل خريطة جوجل
  const loadGoogleMaps = useCallback(async () => {
    if (!maps.isEnabled || maps.isLoading) return;

    if (window.google && window.google.maps) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${maps.config.apiKey}&libraries=places,geometry&language=${maps.config.language}&region=${maps.config.region}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => setIsMapLoaded(true);
    script.onerror = () => {
      toast({
        title: "خطأ في تحميل الخريطة",
        description: "فشل في تحميل خرائط جوجل",
        variant: "destructive",
      });
    };

    document.head.appendChild(script);
  }, [maps.isEnabled, maps.isLoading, maps.config.apiKey, maps.config.language, maps.config.region, toast]);

  // تهيئة الخريطة
  const initializeMap = useCallback(() => {
    if (!isMapLoaded || !mapRef.current || !window.google) return;

    const mapOptions: google.maps.MapOptions = {
      center: maps.config.defaultCenter,
      zoom: maps.config.defaultZoom,
      mapTypeId: maps.config.mapType as google.maps.MapTypeId,
      
      // أدوات التحكم
      zoomControl: maps.config.enableZoomControl,
      mapTypeControl: maps.config.enableMapTypeControl,
      scaleControl: maps.config.enableScaleControl,
      streetViewControl: maps.config.enableStreetView,
      fullscreenControl: maps.config.enableFullscreen,
      
      // تسهيل الاستخدام
      gestureHandling: 'cooperative',
      
      // ستايل
      styles: getMapStyles(),
    };

    mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

    // إضافة مستمع للنقر على الخريطة
    if (allowLocationAdd) {
      mapInstanceRef.current.addListener('click', async (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          
          // تحويل الإحداثيات إلى عنوان
          const address = await maps.services.reverseGeocode(lat, lng);
          onLocationAdd?.(lat, lng, address || undefined);
        }
      });
    }

    updateMapMarkers();
  }, [isMapLoaded, maps.config, allowLocationAdd, maps.services, onLocationAdd]);

  // تحديث العلامات على الخريطة
  const updateMapMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return;

    // إزالة العلامات الموجودة
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // إضافة علامات جديدة
    filteredLocations.forEach(location => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: mapInstanceRef.current,
        title: location.name,
        icon: {
          url: `data:image/svg+xml;base64,${btoa(createMarkerSVG(location.type))}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32),
        },
      });

      // إضافة نافذة المعلومات
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(location),
      });

      marker.addListener('click', () => {
        // إغلاق جميع النوافذ المفتوحة
        markersRef.current.forEach(m => {
          const existingInfoWindow = (m as any).infoWindow;
          if (existingInfoWindow) {
            existingInfoWindow.close();
          }
        });
        
        // فتح النافذة الحالية
        infoWindow.open(mapInstanceRef.current, marker);
        onLocationSelect?.(location);
      });

      (marker as any).infoWindow = infoWindow;
      markersRef.current.push(marker);
    });

    // تعديل الرؤية لتشمل جميع العلامات
    if (filteredLocations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredLocations.forEach(location => {
        bounds.extend({ lat: location.lat, lng: location.lng });
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [filteredLocations, onLocationSelect]);

  // الحصول على ستايل الخريطة
  const getMapStyles = useCallback((): google.maps.MapTypeStyle[] => {
    switch (maps.config.theme) {
      case 'dark':
        return [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        ];
      case 'silver':
        return [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        ];
      case 'retro':
        return [
          { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
        ];
      default:
        return [];
    }
  }, [maps.config.theme]);

  // إنشاء SVG للعلامة
  const createMarkerSVG = (type: string) => {
    const color = LOCATION_COLORS[type as keyof typeof LOCATION_COLORS] || '#6b7280';
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M16 4 L16 20 L12 16 M16 20 L20 16" stroke="white" stroke-width="2" fill="none"/>
        <text x="16" y="16" text-anchor="middle" fill="white" font-size="12">${LOCATION_ICONS[type as keyof typeof LOCATION_ICONS] || '📍'}</text>
      </svg>
    `;
  };

  // إنشاء محتوى نافذة المعلومات
  const createInfoWindowContent = (location: MapLocation) => {
    const { metadata } = location;
    return `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: ${LOCATION_COLORS[location.type]}; font-size: 16px; font-weight: bold;">
          ${LOCATION_ICONS[location.type]} ${location.name}
        </h3>
        ${metadata?.address ? `<p style="margin: 4px 0; color: #666;"><strong>العنوان:</strong> ${metadata.address}</p>` : ''}
        ${metadata?.doctorName ? `<p style="margin: 4px 0; color: #666;"><strong>الطبيب:</strong> ${metadata.doctorName}</p>` : ''}
        ${metadata?.phone ? `<p style="margin: 4px 0; color: #666;"><strong>الهاتف:</strong> ${metadata.phone}</p>` : ''}
        ${metadata?.area ? `<p style="margin: 4px 0; color: #666;"><strong>المنطقة:</strong> ${metadata.area}</p>` : ''}
        ${metadata?.line ? `<p style="margin: 4px 0; color: #666;"><strong>الخط:</strong> ${metadata.line}</p>` : ''}
        <div style="margin-top: 8px; text-align: right;">
          <span style="background: ${LOCATION_COLORS[location.type]}22; color: ${LOCATION_COLORS[location.type]}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
            ${location.type === 'clinic' ? 'عيادة' : location.type === 'area' ? 'منطقة' : location.type === 'user' ? 'مستخدم' : 'زيارة'}
          </span>
        </div>
      </div>
    `;
  };

  // الحصول على الموقع الحالي للمستخدم
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "الموقع غير مدعوم",
        description: "المتصفح لا يدعم تحديد الموقع",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(15);
        }

        toast({
          title: "تم تحديد موقعك",
          description: "تم توسيط الخريطة على موقعك الحالي",
        });
      },
      (error) => {
        toast({
          title: "خطأ في تحديد الموقع",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  }, [toast]);

  // تأثيرات التحميل
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  useEffect(() => {
    if (isMapLoaded) {
      initializeMap();
    }
  }, [isMapLoaded, initializeMap]);

  useEffect(() => {
    if (isMapLoaded && mapInstanceRef.current) {
      updateMapMarkers();
    }
  }, [isMapLoaded, updateMapMarkers]);

  // تبديل رؤية الطبقة
  const toggleLayer = (type: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // إذا لم تكن الخرائط مفعلة
  if (!maps.isEnabled) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          خرائط جوجل غير مفعلة. يرجى تفعيلها من الإعدادات.
        </AlertDescription>
      </Alert>
    );
  }

  // حالة التحميل
  if (maps.isLoading || !isMapLoaded) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            خريطة تفاعلية
            <Badge variant="secondary">{filteredLocations.length} موقع</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* أزرار التحكم */}
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="flex items-center gap-1"
            >
              <Crosshair className="h-4 w-4" />
              موقعي
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLayerControls(!showLayerControls)}
              className="flex items-center gap-1"
            >
              <Layers className="h-4 w-4" />
              الطبقات
            </Button>
          </div>
        </CardTitle>

        {/* أدوات البحث والتصفية */}
        {(showSearch || showFilters) && (
          <div className="flex flex-wrap items-center gap-3">
            {showSearch && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المواقع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {showFilters && (
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="نوع الموقع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="clinic">العيادات</SelectItem>
                  <SelectItem value="area">المناطق</SelectItem>
                  <SelectItem value="user">المستخدمين</SelectItem>
                  <SelectItem value="visit">الزيارات</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* أدوات التحكم في الطبقات */}
        {showLayerControls && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            {Object.entries(LOCATION_ICONS).map(([type, icon]) => (
              <Button
                key={type}
                variant={visibleLayers[type] ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLayer(type)}
                className="flex items-center gap-1"
              >
                {visibleLayers[type] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {icon} {type === 'clinic' ? 'العيادات' : type === 'area' ? 'المناطق' : type === 'user' ? 'المستخدمين' : 'الزيارات'}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* الخريطة */}
        <div 
          ref={mapRef}
          style={{ height, width: '100%' }}
          className="rounded-lg overflow-hidden border"
        />
        
        {/* معلومات إضافية */}
        {allowLocationAdd && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            انقر على الخريطة لإضافة موقع جديد
          </p>
        )}
      </CardContent>
    </Card>
  );
}