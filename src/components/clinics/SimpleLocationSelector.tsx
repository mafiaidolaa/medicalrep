"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Crosshair, Loader2, AlertTriangle } from 'lucide-react';
import { simpleLocationService } from '@/lib/simple-location-service';
import { systemSettingsService } from '@/lib/system-settings-service';
import { useToast } from '@/hooks/use-toast';

interface SimpleLocationSelectorProps {
  value?: { lat: number; lng: number; address?: string };
  onChange?: (location: { lat: number; lng: number; address?: string }) => void;
}

export default function SimpleLocationSelector({ value, onChange }: SimpleLocationSelectorProps) {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  const lat = value?.lat || 30.0444;
  const lng = value?.lng || 31.2357;
  const address = value?.address || '';

  const handleLocationChange = useCallback((newLat: number, newLng: number, newAddress?: string) => {
    onChange?.({
      lat: newLat,
      lng: newLng,
      address: newAddress || address
    });
  }, [onChange, address]);

  const detectCurrentLocation = async () => {
    setIsDetecting(true);
    setError(null);
    setStatusMessage('جاري طلب إذن الموقع وتحديد موقعك...');

    try {
      const location = await simpleLocationService.requestLocationWithToast(toast, 'تسجيل العيادة');
      
      if (location) {
        handleLocationChange(location.latitude, location.longitude);
        setStatusMessage('تم تحديد الموقع بنجاح!');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        const status = simpleLocationService.getPermissionStatus();
        if (status === 'denied') {
          setError('تم رفض إذن الموقع. يمكنك إدخال الإحداثيات يدوياً.');
        } else {
          setError('فشل في تحديد الموقع. يمكنك إدخال الإحداثيات يدوياً.');
        }
      }
    } catch (error) {
      setError('حدث خطأ في تحديد الموقع. يرجى المحاولة مرة أخرى.');
      console.error('Location detection error:', error);
    } finally {
      setIsDetecting(false);
      setStatusMessage(null);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-background/80 border border-border shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          تحديد الموقع الجغرافي
        </CardTitle>
        <CardDescription>
          حدد موقع العيادة باستخدام GPS أو أدخل الإحداثيات يدوياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* زر تحديد الموقع الحالي */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            استخدم GPS لتحديد موقعك الحالي تلقائياً
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={detectCurrentLocation}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                جاري التحديد...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4 mr-2" />
                تحديد موقعي
              </>
            )}
          </Button>
        </div>

        {/* رسالة الحالة */}
        {statusMessage && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        {/* رسالة الخطأ */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* إدخال الإحداثيات يدوياً */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">خط العرض (Latitude)</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="30.0444"
              value={lat}
              onChange={(e) => handleLocationChange(
                parseFloat(e.target.value) || 0, 
                lng, 
                address
              )}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="longitude">خط الطول (Longitude)</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="31.2357"
              value={lng}
              onChange={(e) => handleLocationChange(
                lat, 
                parseFloat(e.target.value) || 0, 
                address
              )}
            />
          </div>
        </div>

        {/* عرض الإحداثيات الحالية */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">الموقع المحدد:</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>خط العرض: {lat.toFixed(6)}</div>
            <div>خط الطول: {lng.toFixed(6)}</div>
            {address && (
              <div className="mt-1">
                <strong>العنوان:</strong> {address}
              </div>
            )}
          </div>
        </div>

        {/* نصائح وتحذيرات للمستخدم */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-800 space-y-1">
            <div><strong>نصائح لتحسين دقة تحديد الموقع:</strong></div>
            <div>• تأكد من تفعيل GPS في جهازك</div>
            <div>• تأكد من وجودك في مكان مفتوح (ليس داخل مبنى)</div>
            <div>• في حالة انتهاء الوقت, يمكنك إدخال الإحداثيات يدوياً</div>
            <div>• للحصول على إحداثيات دقيقة: افتح Google Maps ← انقر بزر اليمين على الموقع ← انسخ الإحداثيات</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}