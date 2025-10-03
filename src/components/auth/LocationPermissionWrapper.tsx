"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Shield, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { loadCachedLocation, loadCachedPermission, isFresh as isFreshCache } from '@/lib/location-cache';
import { locationService } from '@/lib/location-service';

interface LocationPermissionWrapperProps {
  children: React.ReactNode;
  onLocationGranted?: (location: { lat: number; lng: number; accuracy?: number }) => void;
  onLocationDenied?: () => void;
  skipPermission?: boolean;
}

type PermissionState = 'pending' | 'requesting' | 'granted' | 'denied' | 'skipped';

export default function LocationPermissionWrapper({ 
  children, 
  onLocationGranted, 
  onLocationDenied,
  skipPermission = false 
}: LocationPermissionWrapperProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('pending');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChildren, setShowChildren] = useState(true); // إظهار المحتوى فوراً

  // طلب إذن الموقع بصمت في الخلفية مع استخدام الكاش لتجنب التكرار
  useEffect(() => {
    if (skipPermission) {
      return;
    }

    try {
      const cachedPerm = loadCachedPermission();
      const cachedLoc = loadCachedLocation();
      // إذا كان لدينا موقع محفوظ حديثاً (<= 10 دقائق) نستخدمه فوراً
      if (cachedLoc && isFreshCache(cachedLoc, 10 * 60 * 1000)) {
        const locationData = { lat: cachedLoc.latitude, lng: cachedLoc.longitude, accuracy: cachedLoc.accuracy };
        setLocation(locationData);
        setPermissionState('granted');
        onLocationGranted?.(locationData);
        return; // لا نطلب الموقع مرة أخرى
      }
      // إذا كان الإذن مرفوض مسبقاً، لا نسبب أي نوافذ منبثقة
      if (cachedPerm === 'denied') {
        setPermissionState('denied');
        onLocationDenied?.();
        return;
      }
    } catch {
      // ignore cache read errors
    }

    // تأخير بسيط ثم طلب الإذن بصمت (مرة واحدة فقط، وسيتم فك الاشتباك داخل الخدمة)
    const timer = setTimeout(() => {
      requestLocationSilently();
    }, 1000);

    return () => clearTimeout(timer);
  }, [skipPermission]);

  // طلب إذن الموقع بصمت بدون إزعاج المستخدم
  const requestLocationSilently = async () => {
    if (!navigator.geolocation) {
      setPermissionState('denied');
      onLocationDenied?.();
      return;
    }

    try {
      // محاولة الحصول على الموقع بصمت
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        // الإذن مُمنوح مسبقاً، احصل على الموقع مباشرة
        getCurrentLocationSilently();
      } else if (permission.state === 'prompt') {
        // الإذن غير محدد، اطلبه بصمت
        getCurrentLocationSilently();
      } else {
        // مرفوض، لكن لا تظهر رسالة
        setPermissionState('denied');
        onLocationDenied?.();
      }
    } catch (err) {
      // في حالة عدم دعم permissions API، جرب الحصول على الموقع مباشرة
      getCurrentLocationSilently();
    }
  };

  // الحصول على الموقع بصمت (مع الاعتماد على الخدمة المركزية لمنع التكرار)
  const getCurrentLocationSilently = async () => {
    try {
      const data = await locationService.getCurrentLocation();
      if (data) {
        const locationData = { lat: data.latitude, lng: data.longitude, accuracy: data.accuracy };
        setLocation(locationData);
        setPermissionState('granted');
        onLocationGranted?.(locationData);
        return;
      }
      // إذا لم نتمكن من الحصول على موقع حقيقي، اعتبرها مرفوضة صامتاً
      setPermissionState('denied');
      onLocationDenied?.();
    } catch {
      setPermissionState('denied');
      onLocationDenied?.();
    }
  };

  const checkExistingPermission = async () => {
    if (!navigator.geolocation) {
      setPermissionState('denied');
      setError('متصفحك لا يدعم تحديد الموقع');
      onLocationDenied?.();
      return;
    }

    try {
      // التحقق من حالة الإذن الحالية
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        // الإذن مُمنوح، احصل على الموقع مباشرة
        requestLocation();
      } else if (permission.state === 'denied') {
        setPermissionState('denied');
        setError('تم رفض إذن الموقع مسبقاً. يرجى السماح بالوصول للموقع من إعدادات المتصفح.');
        onLocationDenied?.();
      } else {
        // الإذن غير محدد، اعرض شاشة الطلب
        setPermissionState('pending');
      }
    } catch (err) {
      // المتصفح لا يدعم permissions API، جرب طلب الموقع مباشرة
      setPermissionState('pending');
    }
  };

  const requestLocation = async () => {
    setPermissionState('requesting');
    setError(null);

    try {
      // طلب عبر الخدمة المركزية (ستتعامل مع الإذن والتخزين)
      const data = await locationService.getCurrentLocation();
      if (data) {
        const locationData = { lat: data.latitude, lng: data.longitude, accuracy: data.accuracy };
        setLocation(locationData);
        setPermissionState('granted');
        setShowChildren(true);
        onLocationGranted?.(locationData);
        return;
      }
      setPermissionState('denied');
      onLocationDenied?.();
    } catch (e: any) {
      const errorMessage = e?.message || 'فشل في تحديد الموقع';
      setError(errorMessage);
      setPermissionState('denied');
      onLocationDenied?.();
    }
  };

  const handleRequestPermission = () => {
    requestLocation();
  };

  const handleSkip = () => {
    setPermissionState('skipped');
    setShowChildren(true);
    onLocationDenied?.();
  };

  // عرض المحتوى فوراً - طلب الموقع يتم في الخلفية بصمت
  return <>{children}</>;
}
