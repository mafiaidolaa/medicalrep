"use client";

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { locationService, logActivityWithLocation, type LocationData } from '@/lib/location-service';
import { useToast } from '@/hooks/use-toast';

interface LocationSettings {
  locationTracking: {
    enabled: boolean;
    requestOnLogin: boolean;
    requestOnClinicRegistration: boolean;
    requestOnOrderCreation: boolean;
    requestOnVisitCreation: boolean;
    requestOnPayment: boolean;
    enableActivityLogging: boolean;
    privacyMode: 'strict' | 'balanced' | 'permissive';
  };
}

export function useLocationIntegration() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // Get location settings from localStorage with default values
  const getLocationSettings = useCallback((): LocationSettings => {
    if (typeof window === 'undefined') {
      return getDefaultLocationSettings();
    }
    
    try {
      const settings = localStorage.getItem('maps_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        // Merge with defaults to ensure all properties exist
        return {
          locationTracking: {
            ...getDefaultLocationSettings().locationTracking,
            ...parsedSettings.locationTracking
          }
        };
      }
    } catch (error) {
      console.warn('Failed to parse location settings from localStorage:', error);
    }
    
    // Return default settings and save them
    const defaultSettings = getDefaultLocationSettings();
    try {
      localStorage.setItem('maps_settings', JSON.stringify(defaultSettings));
    } catch (error) {
      console.warn('Failed to save default settings to localStorage:', error);
    }
    return defaultSettings;
  }, []);
  
  // Default location settings
  const getDefaultLocationSettings = (): LocationSettings => {
    return {
      locationTracking: {
        enabled: true,
        requestOnLogin: true,
        requestOnClinicRegistration: true,
        requestOnOrderCreation: true,
        requestOnVisitCreation: true,
        requestOnPayment: true,
        enableActivityLogging: true,
        privacyMode: 'balanced'
      }
    };
  };

  // Request location permission with user-friendly dialog
  const requestLocationWithDialog = useCallback(async (
    activity: string, 
    skipIfDenied = false,
    silentMode = false
  ): Promise<LocationData | null> => {
    const permission = locationService.getPermissionState();
    
    if (permission.denied && skipIfDenied) {
      return null;
    }

    if (!permission.granted && !silentMode) {
      toast({
        title: "طلب إذن الوصول للموقع",
        description: `يحتاج التطبيق للوصول إلى موقعك لتسجيل ${activity}. هذا يساعد في تحسين الأمان وتتبع الأنشطة.`,
        duration: 5000,
      });
    }

    try {
      const requestedPermission = await locationService.requestLocationPermission();
      
      if (requestedPermission.granted) {
        const location = await locationService.getCurrentLocation();
        
        if (!silentMode) {
          toast({
            title: "تم الحصول على الموقع",
            description: location?.address || "تم تحديد موقعك بنجاح",
            duration: 3000,
          });
        }
        
        return location;
      } else if (requestedPermission.denied) {
        // فقط إظهار رسالة الرفض إذا لم نكن في الوضع الصامت وكانت هذه المحاولة الأولى
        if (!silentMode && !skipIfDenied) {
          toast({
            title: "تم رفض إذن الموقع",
            description: "يمكنك تفعيله لاحقاً من إعدادات المتصفح لتحسين تجربة الاستخدام.",
            variant: "destructive",
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Location request failed:', error);
      if (!silentMode) {
        toast({
          title: "خطأ في الحصول على الموقع",
          description: "تعذر الحصول على موقعك. يمكنك المتابعة بدون تسجيل الموقع.",
          variant: "destructive",
        });
      }
    }

    return null;
  }, [toast]);

  // Log activity with location based on settings
  const logActivityWithLocationIfEnabled = useCallback(async (
    activityType: 'login' | 'clinic_registration' | 'order' | 'visit' | 'payment',
    details: any,
    forceLocationRequest = false,
    silentMode = false
  ) => {
    if (!session?.user?.id) return;

    const settings = getLocationSettings();
    if (!settings.locationTracking.enabled) {
      console.log('Location tracking is disabled in settings');
      return;
    }

    const shouldRequest = forceLocationRequest || 
      (activityType === 'login' && settings.locationTracking.requestOnLogin) ||
      (activityType === 'clinic_registration' && settings.locationTracking.requestOnClinicRegistration) ||
      (activityType === 'order' && settings.locationTracking.requestOnOrderCreation) ||
      (activityType === 'visit' && settings.locationTracking.requestOnVisitCreation) ||
      (activityType === 'payment' && settings.locationTracking.requestOnPayment);

    if (shouldRequest) {
      const activityNames = {
        login: 'تسجيل الدخول',
        clinic_registration: 'تسجيل العيادة',
        order: 'إنشاء الطلبية',
        visit: 'تسجيل الزيارة',
        payment: 'دفع المبلغ'
      };

      const location = await requestLocationWithDialog(
        activityNames[activityType],
        settings.locationTracking.privacyMode === 'strict',
        silentMode || (activityType === 'login' && settings.locationTracking.privacyMode === 'balanced')
      );
    }

    // Log the activity regardless of location success
    if (settings.locationTracking.enableActivityLogging) {
      try {
        await logActivityWithLocation(activityType, session.user.id, details, shouldRequest);
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    }
  }, [session?.user?.id, getLocationSettings, requestLocationWithDialog]);

  // Handle login location request
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('User authenticated, checking location settings...');
      const settings = getLocationSettings();
      
      console.log('Location settings:', settings);
      
      if (settings.locationTracking.enabled && settings.locationTracking.requestOnLogin) {
        console.log('Location tracking enabled for login, requesting location...');
        // Small delay to ensure UI is ready
        setTimeout(() => {
          logActivityWithLocationIfEnabled('login', {
            userId: session.user.id,
            email: session.user.email,
            timestamp: new Date().toISOString()
          }, false, true); // الوضع الصامت لتسجيل الدخول
        }, 2000); // Increased delay to ensure everything is loaded
      } else {
        console.log('Location tracking disabled or not configured for login');
      }
    }
  }, [status, session, logActivityWithLocationIfEnabled, getLocationSettings]);

  // Clinic registration location handler
  const handleClinicRegistration = useCallback(async (clinicData: any) => {
    await logActivityWithLocationIfEnabled('clinic_registration', {
      clinicId: clinicData.id,
      clinicName: clinicData.name,
      ...clinicData
    }, true); // Force location request for clinic registration

    return clinicData;
  }, [logActivityWithLocationIfEnabled]);

  // Order creation location handler
  const handleOrderCreation = useCallback(async (orderData: any) => {
    await logActivityWithLocationIfEnabled('order', {
      orderId: orderData.id,
      clinicId: orderData.clinicId,
      totalAmount: orderData.totalAmount,
      ...orderData
    });

    return orderData;
  }, [logActivityWithLocationIfEnabled]);

  // Visit creation location handler
  const handleVisitCreation = useCallback(async (visitData: any) => {
    await logActivityWithLocationIfEnabled('visit', {
      visitId: visitData.id,
      clinicId: visitData.clinicId,
      purpose: visitData.purpose,
      ...visitData
    });

    return visitData;
  }, [logActivityWithLocationIfEnabled]);

  // Payment location handler
  const handlePayment = useCallback(async (paymentData: any) => {
    await logActivityWithLocationIfEnabled('payment', {
      paymentId: paymentData.id,
      amount: paymentData.amount,
      method: paymentData.method,
      ...paymentData
    });

    return paymentData;
  }, [logActivityWithLocationIfEnabled]);

  // Get current location manually
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      return await locationService.getCurrentLocation();
    } catch (error) {
      toast({
        title: "خطأ في الحصول على الموقع",
        description: "تعذر الحصول على موقعك الحالي",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Check if location services are available and configured
  const isLocationAvailable = useCallback(() => {
    const settings = getLocationSettings();
    return !!(
      settings?.locationTracking?.enabled &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    );
  }, [getLocationSettings]);

  return {
    // Handlers for different activities
    handleClinicRegistration,
    handleOrderCreation,
    handleVisitCreation,
    handlePayment,
    
    // Utility functions
    getCurrentLocation,
    isLocationAvailable,
    requestLocationWithDialog,
    
    // Direct logging function
    logActivityWithLocation: logActivityWithLocationIfEnabled,
    
    // Location service instance
    locationService
  };
}

// Higher-order component for automatic location integration
export function withLocationIntegration<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  activityType?: 'clinic_registration' | 'order' | 'visit' | 'payment'
) {
  return function LocationIntegratedComponent(props: P) {
    const locationIntegration = useLocationIntegration();
    
    const enhancedProps = {
      ...props,
      locationIntegration,
      // Add specific handler based on activity type
      ...(activityType === 'clinic_registration' && {
        onClinicCreate: locationIntegration.handleClinicRegistration
      }),
      ...(activityType === 'order' && {
        onOrderCreate: locationIntegration.handleOrderCreation
      }),
      ...(activityType === 'visit' && {
        onVisitCreate: locationIntegration.handleVisitCreation
      }),
      ...(activityType === 'payment' && {
        onPayment: locationIntegration.handlePayment
      })
    };
    
    return <WrappedComponent {...enhancedProps} />;
  };
}