"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSimpleActivityLogger } from '@/hooks/use-simple-activity-logger';

/**
 * مكون لتسجيل الأنشطة تلقائياً (مثل تسجيل الدخول)
 * يجب وضعه في layout الرئيسي
 */
export default function AutoActivityLogger() {
  const { data: session, status } = useSession();
  const { logLogin } = useSimpleActivityLogger();

  // تسجيل الدخول تلقائياً عند المصادقة
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('User authenticated, logging activity...');
      
      // تأخير قصير للتأكد من تحميل كل شيء
      const timer = setTimeout(() => {
        logLogin().then((success) => {
          if (success) {
            console.log('✅ Login activity logged successfully');
          } else {
            console.warn('❌ Failed to log login activity');
          }
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [status, session, logLogin]);

  // هذا المكون لا يعرض أي شيء
  return null;
}