"use client";

import React, { useState } from 'react';
import { MapPin, ExternalLink, Navigation, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LocationDisplayProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  city?: string;
  country?: string;
  accuracy?: number;
  provider?: string;
  className?: string;
  variant?: 'inline' | 'card' | 'badge';
  showAccuracy?: boolean;
}

export function LocationDisplay({ 
  latitude, 
  longitude, 
  locationName,
  city, 
  country, 
  accuracy,
  provider,
  className = '',
  variant = 'inline',
  showAccuracy = true 
}: LocationDisplayProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // التحقق من وجود بيانات الموقع
  const hasCoordinates = latitude && longitude;
  const hasLocationInfo = locationName || city || country;

  if (!hasCoordinates && !hasLocationInfo) {
    return (
      <span className={`text-muted-foreground text-xs ${className}`}>
        لا توجد معلومات موقع
      </span>
    );
  }

  // إنشاء رابط خرائط Google
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps?q=${latitude},${longitude}&z=15`
    : locationName 
      ? `https://www.google.com/maps/search/${encodeURIComponent(locationName)}`
      : null;

  // تحديد دقة الموقع
  const getAccuracyText = (acc?: number) => {
    if (!acc) return 'غير محدد';
    if (acc < 5) return 'عالية جداً';
    if (acc < 20) return 'عالية';
    if (acc < 100) return 'متوسطة';
    return 'منخفضة';
  };

  // تحديد نوع المزود
  const getProviderText = (prov?: string) => {
    switch (prov) {
      case 'gps': return 'GPS';
      case 'network': return 'شبكة';
      case 'passive': return 'سلبي';
      default: return 'غير محدد';
    }
  };

  // عرض أنيق للموقع
  const LocationContent = () => (
    <div className="space-y-3">
      {/* الإحداثيات */}
      {hasCoordinates && (
        <div className="flex items-center gap-2 text-sm">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="font-mono">
            {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
          </span>
        </div>
      )}

      {/* اسم الموقع */}
      {locationName && (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{locationName}</span>
        </div>
      )}

      {/* المدينة والدولة */}
      {(city || country) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4" /> {/* مساحة فارغة للمحاذاة */}
          <span>
            {city && country ? `${city}, ${country}` : city || country}
          </span>
        </div>
      )}

      {/* دقة الموقع والمزود */}
      {showAccuracy && (accuracy || provider) && (
        <div className="flex items-center gap-3 pt-2 border-t">
          {accuracy && (
            <Badge variant="secondary" className="text-xs">
              دقة: {getAccuracyText(accuracy)} ({accuracy}م)
            </Badge>
          )}
          {provider && (
            <Badge variant="outline" className="text-xs">
              المصدر: {getProviderText(provider)}
            </Badge>
          )}
        </div>
      )}

      {/* رابط خرائط Google */}
      {googleMapsUrl && (
        <div className="pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={() => window.open(googleMapsUrl, '_blank')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            عرض على خرائط Google
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );

  // عرض مضغوط كـ Badge
  if (variant === 'badge') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Badge variant="outline" className={`cursor-pointer hover:bg-accent ${className}`}>
            <MapPin className="h-3 w-3 mr-1" />
            {hasCoordinates ? 'موقع GPS' : 'موقع'}
            <Eye className="h-3 w-3 ml-1" />
          </Badge>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              معلومات الموقع
            </DialogTitle>
          </DialogHeader>
          <LocationContent />
        </DialogContent>
      </Dialog>
    );
  }

  // عرض ككارت
  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            معلومات الموقع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationContent />
        </CardContent>
      </Card>
    );
  }

  // عرض مضغوط inline (افتراضي)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {hasCoordinates && (
          <span className="text-sm font-mono">
            {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
          </span>
        )}
        {locationName && (
          <div className="text-xs text-muted-foreground truncate">
            {locationName}
          </div>
        )}
        {!hasCoordinates && (city || country) && (
          <div className="text-sm">
            {city && country ? `${city}, ${country}` : city || country}
          </div>
        )}
      </div>
      {googleMapsUrl && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={() => window.open(googleMapsUrl, '_blank')}
          title="عرض على خرائط Google"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// مكون مساعد لعرض المسافة بين موقعين
interface DistanceDisplayProps {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
  label?: string;
}

export function DistanceDisplay({ lat1, lng1, lat2, lng2, label = "المسافة" }: DistanceDisplayProps) {
  // حساب المسافة باستخدام صيغة Haversine
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومترات
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  const distanceText = distance < 1 
    ? `${(distance * 1000).toFixed(0)} متر`
    : `${distance.toFixed(1)} كم`;

  return (
    <Badge variant="secondary" className="text-xs">
      <Navigation className="h-3 w-3 mr-1" />
      {label}: {distanceText}
    </Badge>
  );
}