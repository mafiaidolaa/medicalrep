"use client";

import React, { useEffect, createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { trackLoginSilently, trackLogoutSilently } from '@/lib/silent-activity-tracker';

interface ActivityTrackingContextValue {
  isTracking: boolean;
}

const ActivityTrackingContext = createContext<ActivityTrackingContextValue>({
  isTracking: false
});

export const useActivityTrackingContext = () => useContext(ActivityTrackingContext);

interface ActivityTrackingProviderProps {
  children: React.ReactNode;
}

export function ActivityTrackingProvider({ children }: ActivityTrackingProviderProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    let hasLoggedIn = false;

    // تتبع تسجيل الدخول بصمت
    if (status === 'authenticated' && session?.user?.id && !hasLoggedIn) {
      hasLoggedIn = true;
      
      // تأخير قصير للتأكد من تحميل النظام
      setTimeout(() => {
        trackLoginSilently(session.user.id, true)
          .then(() => {
            console.debug('Login tracked silently for user:', session.user.id);
          })
          .catch((error) => {
            console.debug('Failed to track login silently:', error);
          });
      }, 1000);
    }

    // تتبع تسجيل الخروج عند إغلاق الصفحة/التطبيق
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (session?.user?.id) {
        // استخدام navigator.sendBeacon للإرسال الموثوق
        const logoutData = JSON.stringify({
          userId: session.user.id,
          timestamp: new Date().toISOString(),
          type: 'logout'
        });

        if ('sendBeacon' in navigator) {
          navigator.sendBeacon('/api/activity-log/logout', logoutData);
        }
      }
    };

    const handlePageHide = () => {
      if (session?.user?.id) {
        // محاولة تسجيل الخروج بصمت
        trackLogoutSilently(session.user.id).catch(() => {
          // فشل صامت
        });
      }
    };

    // إضافة المستمعين
    if (status === 'authenticated') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [session, status]);

  return (
    <ActivityTrackingContext.Provider value={{ isTracking: status === 'authenticated' }}>
      {children}
    </ActivityTrackingContext.Provider>
  );
}