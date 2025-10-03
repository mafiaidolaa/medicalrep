"use client";

import { useCallback } from 'react';
import { useSilentGeolocation, useLocationWithNotification } from '@/hooks/use-silent-geolocation';
import { useToast } from '@/hooks/use-toast';

export interface ControlledGeolocationOptions {
  mode: 'silent' | 'notification' | 'controlled';
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
  showPermissionRequest?: boolean;
  customErrorMessage?: string;
  customSuccessMessage?: string;
}

/**
 * Hook محسن للتحكم في رسائل الموقع حسب السياق
 * 
 * @param options خيارات التحكم في عرض الرسائل
 */
export function useControlledGeolocation(options: ControlledGeolocationOptions) {
  const { toast } = useToast();
  
  const {
    mode,
    showSuccessMessage = true,
    showErrorMessage = true,
    showPermissionRequest = true,
    customErrorMessage,
    customSuccessMessage
  } = options;

  // استخدام hooks مختلفة حسب الوضع
  const silentHook = useSilentGeolocation({ silent: true });
  const notificationHook = useLocationWithNotification();

  // اختيار المعالج المناسب حسب الوضع
  const activeHook = mode === 'silent' ? silentHook : notificationHook;

  const getLocationWithControlledMessages = useCallback(async () => {
    if (mode === 'silent') {
      // في الوضع الصامت، نحصل على الموقع بدون رسائل
      return await silentHook.getLocationWithFallback();
    }

    if (mode === 'notification') {
      // في وضع الإشعارات، نستخدم hook العادي
      notificationHook.getCurrentLocation();
      return notificationHook.data;
    }

    // في الوضع المتحكم به، نحن نتحكم في الرسائل
    if (mode === 'controlled') {
      try {
        // نحاول الحصول على الموقع بصمت أولاً
        const location = await silentHook.getLocationWithFallback();
        
        if (location && showSuccessMessage) {
          toast({
            title: customSuccessMessage || "تم تحديد الموقع بنجاح",
            description: location.locationName || "تم الحصول على موقعك الحالي",
            duration: 3000,
          });
        }
        
        return location;
      } catch (error) {
        if (showErrorMessage) {
          toast({
            title: "تعذر تحديد الموقع",
            description: customErrorMessage || "لا يمكن الوصول إلى خدمات الموقع حالياً",
            variant: "destructive",
            duration: 4000,
          });
        }
        return null;
      }
    }

    return null;
  }, [
    mode,
    silentHook,
    notificationHook,
    showSuccessMessage,
    showErrorMessage,
    customSuccessMessage,
    customErrorMessage,
    toast
  ]);

  const requestPermissionWithControlledMessage = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (showErrorMessage) {
        toast({
          title: "الموقع غير مدعوم",
          description: "متصفحك لا يدعم خدمات الموقع",
          variant: "destructive",
        });
      }
      return null;
    }

    if (showPermissionRequest) {
      toast({
        title: "طلب إذن الموقع",
        description: "يرجى السماح للتطبيق بالوصول إلى موقعك",
        duration: 4000,
      });
    }

    return await getLocationWithControlledMessages();
  }, [getLocationWithControlledMessages, showPermissionRequest, showErrorMessage, toast]);

  return {
    // بيانات الموقع
    data: activeHook.data,
    isLoading: activeHook.isLoading,
    error: mode === 'silent' ? null : activeHook.error,
    supported: activeHook.supported,
    
    // دوال التحكم
    getCurrentLocation: getLocationWithControlledMessages,
    requestPermission: requestPermissionWithControlledMessage,
    
    // معلومات إضافية
    isLocationAvailable: activeHook.isLocationAvailable,
    lastUpdated: activeHook.lastUpdated,
    mode
  };
}

// Hooks مخصصة للاستخدام الشائع

/**
 * Hook للحصول على الموقع بصمت تام (للخلفية)
 */
export function useBackgroundLocation() {
  return useControlledGeolocation({
    mode: 'silent',
    showSuccessMessage: false,
    showErrorMessage: false,
    showPermissionRequest: false
  });
}

/**
 * Hook للحصول على الموقع مع رسائل مخصصة (لتسجيل العيادات)
 */
export function useClinicRegistrationLocation() {
  return useControlledGeolocation({
    mode: 'controlled',
    showSuccessMessage: true,
    showErrorMessage: true,
    showPermissionRequest: true,
    customSuccessMessage: "تم تحديد موقع العيادة بنجاح",
    customErrorMessage: "تعذر تحديد موقع العيادة. يمكنك إدخال الموقع يدوياً"
  });
}

/**
 * Hook للحصول على الموقع عند تسجيل الدخول (صامت بالغالب)
 */
export function useLoginLocation() {
  return useControlledGeolocation({
    mode: 'silent',
    showSuccessMessage: false,
    showErrorMessage: false,
    showPermissionRequest: false
  });
}

/**
 * Hook للحصول على الموقع مع رسائل كاملة (للعمليات المهمة)
 */
export function useInteractiveLocation(customMessages?: {
  successMessage?: string;
  errorMessage?: string;
}) {
  return useControlledGeolocation({
    mode: 'controlled',
    showSuccessMessage: true,
    showErrorMessage: true,
    showPermissionRequest: true,
    customSuccessMessage: customMessages?.successMessage,
    customErrorMessage: customMessages?.errorMessage
  });
}