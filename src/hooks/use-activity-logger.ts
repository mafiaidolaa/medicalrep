"use client";

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import {
  logActivity,
  logLogin,
  logLogout,
  logVisit,
  logOrder,
  logCollection,
  logClinicRegistration,
  logUserCreate,
  logUserUpdate,
  logUserDelete
} from '@/lib/activity-logger-client';

export function useActivityLogger() {
  const { data: session } = useSession();
  const { toast } = useToast();

  // Generic activity logger with error handling
  const logWithErrorHandling = useCallback(async (
    logFunction: () => Promise<any>,
    successMessage?: string,
    errorMessage?: string
  ) => {
    try {
      await logFunction();
      if (successMessage) {
        toast({
          title: "تم تسجيل النشاط",
          description: successMessage,
        });
      }
    } catch (error) {
      console.error('Activity logging error:', error);
      if (errorMessage) {
        toast({
          variant: "destructive",
          title: "خطأ في تسجيل النشاط",
          description: errorMessage,
        });
      }
    }
  }, [toast]);

  // Specialized logging functions
  const logUserLogin = useCallback(async (isSuccess: boolean = true) => {
    if (!session?.user) return;
    
    await logWithErrorHandling(
      () => logLogin({
        id: session.user.id as string,
        name: session.user.fullName as string,
        role: session.user.role as string
      }, isSuccess),
      isSuccess ? "تم تسجيل عملية الدخول بنجاح" : undefined
    );
  }, [session, logWithErrorHandling]);

  const logUserLogout = useCallback(async () => {
    if (!session?.user) return;
    
    await logWithErrorHandling(
      () => logLogout({
        id: session.user.id as string,
        name: session.user.fullName as string,
        role: session.user.role as string
      }),
      "تم تسجيل عملية الخروج بنجاح"
    );
  }, [session, logWithErrorHandling]);

  const logClinicVisit = useCallback(async (
    clinic: { id: string; name: string }, 
    details?: string
  ) => {
    await logWithErrorHandling(
      () => logVisit(clinic, details),
      `تم تسجيل الزيارة لـ ${clinic.name}`
    );
  }, [logWithErrorHandling]);

  const logNewOrder = useCallback(async (
    clinic: { id: string; name: string },
    orderId: string,
    details?: string
  ) => {
    await logWithErrorHandling(
      () => logOrder(clinic, orderId, details),
      `تم تسجيل الطلب الجديد لـ ${clinic.name}`
    );
  }, [logWithErrorHandling]);

  const logPaymentCollection = useCallback(async (
    clinic: { id: string; name: string },
    amount: number,
    details?: string
  ) => {
    await logWithErrorHandling(
      () => logCollection(clinic, amount, details),
      `تم تسجيل تحصيل ${amount} جنيه من ${clinic.name}`
    );
  }, [logWithErrorHandling]);

  const logNewClinicRegistration = useCallback(async (
    clinic: { id: string; name: string }
  ) => {
    await logWithErrorHandling(
      () => logClinicRegistration(clinic),
      `تم تسجيل العيادة الجديدة: ${clinic.name}`
    );
  }, [logWithErrorHandling]);

  const logNewUser = useCallback(async (
    newUser: { id: string; name: string }
  ) => {
    await logWithErrorHandling(
      () => logUserCreate(newUser),
      `تم إنشاء المستخدم الجديد: ${newUser.name}`
    );
  }, [logWithErrorHandling]);

  const logUserUpdateAction = useCallback(async (
    user: { id: string; name: string },
    changes?: any
  ) => {
    await logWithErrorHandling(
      () => logUserUpdate(user, changes),
      `تم تحديث بيانات المستخدم: ${user.name}`
    );
  }, [logWithErrorHandling]);

  const logUserDeleteAction = useCallback(async (
    user: { id: string; name: string }
  ) => {
    await logWithErrorHandling(
      () => logUserDelete(user),
      `تم حذف المستخدم: ${user.name}`
    );
  }, [logWithErrorHandling]);

  // Generic activity logger
  const logGenericActivity = useCallback(async (
    type: string,
    title: string,
    details?: string,
    entityType?: string,
    entityId?: string,
    successMessage?: string
  ) => {
    await logWithErrorHandling(
      () => logActivity(type as any, {
        title,
        details,
        entityType,
        entityId,
        isSuccess: true
      }),
      successMessage || `تم تسجيل النشاط: ${title}`
    );
  }, [logWithErrorHandling]);

  return {
    logUserLogin,
    logUserLogout,
    logClinicVisit,
    logNewOrder,
    logPaymentCollection,
    logNewClinicRegistration,
    logNewUser,
    logUserUpdateAction,
    logUserDeleteAction,
    logGenericActivity,
    isAuthenticated: !!session?.user
  };
}