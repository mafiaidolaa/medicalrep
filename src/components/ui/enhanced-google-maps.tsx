"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { locationService, type LocationData } from '@/lib/location-service';
import { systemSettingsService } from '@/lib/system-settings-service';
import { MapPin, Navigation, Plus, Filter, Layers, Route, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  type: 'clinic' | 'user' | 'visit' | 'order' | 'activity' | 'payment' | 'failed_activity';
  data?: any;
  icon?: string;
  color?: string;
}

interface EnhancedGoogleMapsProps {
  height?: string;
  width?: string;
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (position: { lat: number; lng: number }) => void;
  showCurrentLocation?: boolean;
  showControls?: boolean;
  clustered?: boolean;
  interactive?: boolean;
  className?: string;
}

export function EnhancedGoogleMaps({
  height = "400px",
  width = "100%",
  markers = [],
  center,
  zoom = 10,
  onMarkerClick,
  onMapClick,
  showCurrentLocation = true,
  showControls = true,
  clustered = true,
  interactive = true,
  className = ""
}: EnhancedGoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerClustererRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const { toast } = useToast();

  // Load Google Maps API
  const loadGoogleMaps = useCallback(async () => {
    try {
      // التحقق من تفعيل الخرائط
      const isEnabled = await systemSettingsService.isMapsEnabled();
      if (!isEnabled) {
        setError('Google Maps is not enabled or API key is missing');
        return;
      }

      // استخدام الخدمة المحدثة لتحميل السكريبت
      const loaded = await systemSettingsService.loadGoogleMapsScript();
      if (loaded) {
        setIsLoaded(true);
      } else {
        setError('Failed to load Google Maps API');
      }
    } catch (err) {
      console.error('Error loading Google Maps:', err);
      setError('Error loading Google Maps API');
    }
  }, []);

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !window.google || !isLoaded) return;

    // الحصول على الإعدادات من الخدمة
    const mapSettings = await systemSettingsService.getMapsSettings();
    
    const mapOptions: google.maps.MapOptions = {
      center: center || mapSettings.defaultCenter || { lat: 30.0444, lng: 31.2357 },
      zoom: zoom || mapSettings.defaultZoom || 10,
      mapTypeId: mapSettings.mapType || 'roadmap',
      disableDefaultUI: !showControls,
      zoomControl: showControls && mapSettings.enableZoomControl !== false,
      mapTypeControl: showControls && mapSettings.enableMapTypeControl !== false,
      scaleControl: showControls && mapSettings.enableScaleControl !== false,
      fullscreenControl: showControls && mapSettings.enableFullscreen !== false,
      streetViewControl: showControls && mapSettings.enableStreetView !== false,
      gestureHandling: interactive ? 'auto' : 'none',
      styles: getMapStyles(mapSettings.theme || 'default')
    };

    mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

    // Add click listener
    if (onMapClick) {
      mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          onMapClick({
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          });
        }
      });
    }

    // Get and show current location if enabled
    if (showCurrentLocation) {
      getCurrentLocationAndShow();
    }

    // Add markers
    addMarkers();
  }, [isLoaded, center, zoom, markers, onMapClick, showCurrentLocation, showControls, interactive]);

  // Get map styles based on theme
  const getMapStyles = (theme: string): google.maps.MapTypeStyle[] => {
    const styles: { [key: string]: google.maps.MapTypeStyle[] } = {
      default: [],
      dark: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#263c3f' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6b9a76' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#38414e' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#212a37' }]
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b3' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#746855' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1f2835' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#f3d19c' }]
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#2f3948' }]
        },
        {
          featureType: 'transit.station',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#515c6d' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#17263c' }]
        }
      ],
      silver: [
        {
          elementType: 'geometry',
          stylers: [{ color: '#f5f5f5' }]
        },
        {
          elementType: 'labels.icon',
          stylers: [{ visibility: 'off' }]
        },
        {
          elementType: 'labels.text.fill',
          stylers: [{ color: '#616161' }]
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#f5f5f5' }]
        },
        {
          featureType: 'administrative.land_parcel',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#bdbdbd' }]
        },
        {
          featureType: 'poi',
          elementType: 'geometry',
          stylers: [{ color: '#eeeeee' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#757575' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#e5e5e5' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9e9e9e' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#ffffff' }]
        },
        {
          featureType: 'road.arterial',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#757575' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#dadada' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#616161' }]
        },
        {
          featureType: 'road.local',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9e9e9e' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'geometry',
          stylers: [{ color: '#e5e5e5' }]
        },
        {
          featureType: 'transit.station',
          elementType: 'geometry',
          stylers: [{ color: '#eeeeee' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#c9c9c9' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9e9e9e' }]
        }
      ],
      retro: [
        {
          elementType: 'geometry',
          stylers: [{ color: '#ebe3cd' }]
        },
        {
          elementType: 'labels.text.fill',
          stylers: [{ color: '#523735' }]
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#f5f1e6' }]
        },
        {
          featureType: 'administrative',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#c9b2a6' }]
        },
        {
          featureType: 'administrative.land_parcel',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#dcd2be' }]
        },
        {
          featureType: 'administrative.land_parcel',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#ae9e90' }]
        },
        {
          featureType: 'landscape.natural',
          elementType: 'geometry',
          stylers: [{ color: '#dfd2ae' }]
        },
        {
          featureType: 'poi',
          elementType: 'geometry',
          stylers: [{ color: '#dfd2ae' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#93817c' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry.fill',
          stylers: [{ color: '#a5b076' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#447530' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#f5f1e6' }]
        },
        {
          featureType: 'road.arterial',
          elementType: 'geometry',
          stylers: [{ color: '#fdfcf8' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#f8c967' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#e9bc62' }]
        },
        {
          featureType: 'road.highway.controlled_access',
          elementType: 'geometry',
          stylers: [{ color: '#e98d58' }]
        },
        {
          featureType: 'road.highway.controlled_access',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#db8555' }]
        },
        {
          featureType: 'road.local',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#806b63' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'geometry',
          stylers: [{ color: '#dfd2ae' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#8f7d77' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#ebe3cd' }]
        },
        {
          featureType: 'transit.station',
          elementType: 'geometry',
          stylers: [{ color: '#dfd2ae' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry.fill',
          stylers: [{ color: '#b9d3c2' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#92998d' }]
        }
      ]
    };

    return styles[theme] || styles.default;
  };

  // Get current location and show on map
  const getCurrentLocationAndShow = useCallback(async () => {
    try {
      const location = await locationService.getCurrentLocation();
      if (location && mapInstanceRef.current) {
        setCurrentLocation(location);
        
        // Create or update current location marker
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setMap(null);
        }

        currentLocationMarkerRef.current = new google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: mapInstanceRef.current,
          title: 'موقعك الحالي',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285f4',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="text-align: right; direction: rtl;">
              <h3>موقعك الحالي</h3>
              ${location.address ? `<p>${location.address}</p>` : ''}
              <p>الدقة: ${location.accuracy ? Math.round(location.accuracy) + ' متر' : 'غير محدد'}</p>
            </div>
          `
        });

        currentLocationMarkerRef.current.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, currentLocationMarkerRef.current);
        });
      }
    } catch (error) {
      console.warn('Could not get current location:', error);
    }
  }, []);

  // Add markers to map
  const addMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear existing clusterer
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }

    // Add new markers
    const newMarkers = markers.map(markerData => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map: mapInstanceRef.current,
        title: markerData.title,
        icon: getMarkerIcon(markerData.type, markerData.color)
      });

      // Add click listener
      if (onMarkerClick) {
        marker.addListener('click', () => onMarkerClick(markerData));
      }

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(markerData)
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      return marker;
    });

    markersRef.current = newMarkers;

    // Add clustering if enabled and MarkerClusterer is available
    if (clustered && newMarkers.length > 0 && (window as any).MarkerClusterer) {
      markerClustererRef.current = new (window as any).MarkerClusterer(
        mapInstanceRef.current,
        newMarkers,
        {
          imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
        }
      );
    }
  }, [markers, onMarkerClick, clustered]);

  // Get marker icon based on type
  const getMarkerIcon = (type: string, color?: string) => {
    const colors = {
      clinic: '#10b981',
      user: '#3b82f6',
      visit: '#f59e0b',
      order: '#8b5cf6',
      activity: '#ef4444',
      payment: '#22c55e',
      failed_activity: '#dc2626'
    };

    const selectedColor = color || colors[type as keyof typeof colors] || '#6b7280';
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: selectedColor,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#ffffff'
    };
  };

  // Create info window content
  const createInfoWindowContent = (marker: MapMarker) => {
    const typeNames = {
      clinic: 'عيادة',
      user: 'مستخدم',
      visit: 'زيارة',
      order: 'طلبية',
      activity: 'نشاط',
      payment: 'دفع',
      failed_activity: 'نشاط فاشل'
    };

    return `
      <div style="text-align: right; direction: rtl; min-width: 200px;">
        <h3>${marker.title}</h3>
        <p><strong>النوع:</strong> ${typeNames[marker.type as keyof typeof typeNames] || marker.type}</p>
        ${marker.data?.address ? `<p><strong>العنوان:</strong> ${marker.data.address}</p>` : ''}
        ${marker.data?.description ? `<p>${marker.data.description}</p>` : ''}
      </div>
    `;
  };

  // Center map on current location
  const centerOnCurrentLocation = useCallback(async () => {
    try {
      const location = await locationService.getCurrentLocation();
      if (location && mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
        mapInstanceRef.current.setZoom(15);
        
        toast({
          title: "تم توسيط الخريطة",
          description: "تم توسيط الخريطة على موقعك الحالي"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الموقع",
        description: "تعذر الحصول على موقعك الحالي",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Load Google Maps on mount
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  // Initialize map when loaded
  useEffect(() => {
    if (isLoaded) {
      initializeMap();
    }
  }, [isLoaded, initializeMap]);

  // Update markers when they change
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      addMarkers();
    }
  }, [markers, isLoaded, addMarkers]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">خطأ في تحميل الخريطة</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadGoogleMaps} variant="outline">
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0 relative">
        {/* Map Controls */}
        {showControls && (
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={centerOnCurrentLocation}
              className="shadow-md"
            >
              <Navigation className="h-4 w-4" />
            </Button>
            
            {markers.length > 0 && (
              <Badge variant="secondary" className="shadow-md">
                {markers.length} موقع
              </Badge>
            )}
          </div>
        )}

        {/* Map Container */}
        <div
          ref={mapRef}
          style={{ height, width }}
          className="rounded-lg"
        />

        {/* Current Location Info */}
        {currentLocation && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <div className="flex-1 text-sm">
                <p className="font-medium">موقعك الحالي</p>
                {currentLocation.address && (
                  <p className="text-muted-foreground truncate">{currentLocation.address}</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {currentLocation.accuracy ? `±${Math.round(currentLocation.accuracy)}م` : 'دقة غير محددة'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedGoogleMaps;