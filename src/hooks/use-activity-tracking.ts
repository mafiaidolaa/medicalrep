"use client";

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  silentActivityTracker,
  trackLoginSilently,
  trackLogoutSilently,
  trackVisitSilently,
  trackOrderSilently,
  trackDebtPaymentSilently,
  trackExpenseRequestSilently,
  trackPlanSilently,
  trackClinicRegistration
} from '@/lib/silent-activity-tracker';

export interface ActivityTrackingHook {
  // الأنشطة الصامتة (بدون رسائل للمستخدم)
  trackVisit: (visitId: string, clinicName: string, details?: string) => Promise<void>;
  trackOrder: (orderId: string, clinicName: string, amount: number) => Promise<void>;
  trackDebtPayment: (paymentId: string, clinicName: string, amount: number) => Promise<void>;
  trackExpenseRequest: (expenseId: string, description: string, amount: number) => Promise<void>;
  trackPlan: (planId: string, title: string, description?: string) => Promise<void>;
  
  // الأنشطة مع خيار الإعلام (للعيادات)
  trackClinicRegistration: (clinicId: string, clinicName: string, showLocationPrompt?: boolean) => Promise<any>;
  
  // إدارة الكاش
  clearLocationCache: () => void;
  isLocationSupported: boolean;
}

export function useActivityTracking(): ActivityTrackingHook {
  const { data: session, status } = useSession();

  // ملاحظة: تتبع تسجيل الدخول والخروج أصبح يتم بواسطة ActivityTrackingProvider
  // هذا Hook يركز فقط على الأنشطة الخاصة بالصفحات والعمليات

  // دوال تتبع الأنشطة
  const trackVisit = useCallback(async (visitId: string, clinicName: string, details?: string) => {
    await trackVisitSilently(visitId, clinicName, details);
  }, []);

  const trackOrder = useCallback(async (orderId: string, clinicName: string, amount: number) => {
    await trackOrderSilently(orderId, clinicName, amount);
  }, []);

  const trackDebtPayment = useCallback(async (paymentId: string, clinicName: string, amount: number) => {
    await trackDebtPaymentSilently(paymentId, clinicName, amount);
  }, []);

  const trackExpenseRequest = useCallback(async (expenseId: string, description: string, amount: number) => {
    await trackExpenseRequestSilently(expenseId, description, amount);
  }, []);

  const trackPlan = useCallback(async (planId: string, title: string, description?: string) => {
    await trackPlanSilently(planId, title, description);
  }, []);

  const handleClinicRegistration = useCallback(async (clinicId: string, clinicName: string, showLocationPrompt: boolean = true) => {
    return await trackClinicRegistration(clinicId, clinicName, showLocationPrompt);
  }, []);

  const clearLocationCache = useCallback(() => {
    silentActivityTracker.clearLocationCache();
  }, []);

  const isLocationSupported = silentActivityTracker.isGeolocationSupported();

  return {
    trackVisit,
    trackOrder,
    trackDebtPayment,
    trackExpenseRequest,
    trackPlan,
    trackClinicRegistration: handleClinicRegistration,
    clearLocationCache,
    isLocationSupported
  };
}

// Hook مخصص للصفحات التي تحتاج تتبع تفاعل المستخدم
export function usePageActivityTracking(pageName: string) {
  const { trackPlan } = useActivityTracking();
  const { data: session } = useSession();

  // تتبع زيارة الصفحة (اختياري وصامت)
  useEffect(() => {
    if (session?.user?.id && pageName) {
      // تسجيل صامت لزيارة صفحة مهمة فقط (لن يظهر في السجل العام)
      const importantPages = ['visits', 'orders', 'clinics', 'expenses', 'plans'];
      const isImportantPage = importantPages.some(page => pageName.toLowerCase().includes(page));
      
      if (isImportantPage) {
        console.debug(`User visited important page: ${pageName}`);
      }
    }
  }, [pageName, session]);

  return {
    // يمكن إضافة دوال إضافية هنا حسب الحاجة
    logPageInteraction: (interactionType: string, details?: string) => {
      if (session?.user?.id) {
        console.debug(`Page interaction: ${interactionType}`, details);
      }
    }
  };
}