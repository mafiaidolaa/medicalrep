"use client";

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { logSimpleActivity } from '@/lib/simple-location-service';
import { systemSettingsService } from '@/lib/system-settings-service';

export function useSimpleActivityLogger() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const logActivity = useCallback(async (
    type: string,
    title: string,
    details: any,
    options: {
      requestLocation?: boolean;
      showLocationToast?: boolean;
      activityDisplayName?: string;
    } = {}
  ): Promise<boolean> => {
    const {
      requestLocation = false,
      showLocationToast = false,
      activityDisplayName
    } = options;

    const userId = session?.user?.id;
    
    return await logSimpleActivity(
      type,
      title,
      details,
      userId,
      requestLocation,
      showLocationToast ? toast : undefined,
      activityDisplayName
    );
  }, [session?.user?.id, toast]);

  // دوال محددة لكل نوع نشاط
  const logLogin = useCallback(async () => {
    // التحقق من إعدادات تتبع الموقع
    const settings = await systemSettingsService.getMapsSettings();
    const shouldRequestLocation = settings.locationTracking.enabled && settings.locationTracking.requestOnLogin;

    return await logActivity(
      'login',
      'تسجيل دخول',
      {
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      },
      {
        requestLocation: shouldRequestLocation,
        showLocationToast: false // بدون رسائل مزعجة
      }
    );
  }, [logActivity, session]);

  const logLogout = useCallback(async () => {
    return await logActivity(
      'logout',
      'تسجيل خروج',
      {
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      }
    );
  }, [logActivity, session]);

  const logClinicRegistration = useCallback(async (clinicData: any) => {
    // التحقق من إعدادات تتبع الموقع
    const settings = await systemSettingsService.getMapsSettings();
    const shouldRequestLocation = settings.locationTracking.enabled && settings.locationTracking.requestOnClinicRegistration;

    return await logActivity(
      'clinic_register',
      'تسجيل عيادة جديدة',
      {
        clinicName: clinicData.name,
        address: clinicData.address,
        phone: clinicData.phone,
        ...clinicData
      },
      {
        requestLocation: shouldRequestLocation,
        showLocationToast: shouldRequestLocation,
        activityDisplayName: 'تسجيل العيادة'
      }
    );
  }, [logActivity]);

  const logVisit = useCallback(async (visitData: any) => {
    // التحقق من إعدادات تتبع الموقع
    const settings = await systemSettingsService.getMapsSettings();
    const shouldRequestLocation = settings.locationTracking.enabled && settings.locationTracking.requestOnVisitCreation;

    return await logActivity(
      'visit',
      'زيارة عيادة',
      {
        clinicId: visitData.clinicId,
        clinicName: visitData.clinicName,
        purpose: visitData.purpose,
        ...visitData
      },
      {
        requestLocation: shouldRequestLocation,
        showLocationToast: shouldRequestLocation,
        activityDisplayName: 'الزيارة'
      }
    );
  }, [logActivity]);

  const logOrder = useCallback(async (orderData: any) => {
    // التحقق من إعدادات تتبع الموقع
    const settings = await systemSettingsService.getMapsSettings();
    const shouldRequestLocation = settings.locationTracking.enabled && settings.locationTracking.requestOnOrderCreation;

    return await logActivity(
      'order',
      'إنشاء طلبية جديدة',
      {
        clinicId: orderData.clinicId,
        totalAmount: orderData.totalAmount,
        items: orderData.items,
        ...orderData
      },
      {
        requestLocation: shouldRequestLocation,
        showLocationToast: false // عادة لا نحتاج toast للطلبيات
      }
    );
  }, [logActivity]);

  const logPayment = useCallback(async (paymentData: any) => {
    // التحقق من إعدادات تتبع الموقع
    const settings = await systemSettingsService.getMapsSettings();
    const shouldRequestLocation = settings.locationTracking.enabled && settings.locationTracking.requestOnPayment;

    return await logActivity(
      'debt_payment',
      'دفع دين',
      {
        amount: paymentData.amount,
        method: paymentData.method,
        clinicId: paymentData.clinicId,
        ...paymentData
      },
      {
        requestLocation: shouldRequestLocation,
        showLocationToast: shouldRequestLocation,
        activityDisplayName: 'عملية الدفع'
      }
    );
  }, [logActivity]);

  const logExpenseRequest = useCallback(async (expenseData: any) => {
    return await logActivity(
      'expense_request',
      'طلب مصروف',
      {
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
        ...expenseData
      },
      {
        requestLocation: true,
        showLocationToast: false
      }
    );
  }, [logActivity]);

  const logPlan = useCallback(async (planData: any) => {
    return await logActivity(
      'plan',
      'إنشاء خطة',
      {
        title: planData.title,
        period: planData.period,
        goals: planData.goals,
        ...planData
      },
      {
        requestLocation: false, // الخطط عادة لا تحتاج موقع
        showLocationToast: false
      }
    );
  }, [logActivity]);

  return {
    // الدالة العامة
    logActivity,
    
    // الدوال المحددة
    logLogin,
    logLogout,
    logClinicRegistration,
    logVisit,
    logOrder,
    logPayment,
    logExpenseRequest,
    logPlan
  };
}