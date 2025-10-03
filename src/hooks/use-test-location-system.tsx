"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';

export function useTestLocationSystem() {
  const { data: session } = useSession();
  const { toast } = useToast();

  // Test function to create sample activities
  const createSampleActivities = async () => {
    if (!session?.user) return;

    const sampleActivities = [
      {
        type: 'login',
        title: 'تسجيل دخول تجريبي',
        details: 'تسجيل دخول للاختبار',
        lat: 24.7136,
        lng: 46.6753,
        locationName: 'الرياض، السعودية',
        city: 'الرياض',
        country: 'السعودية',
        device: 'Desktop',
        browser: 'Chrome',
        os: 'Windows'
      },
      {
        type: 'visit',
        title: 'زيارة عيادة تجريبية',
        details: 'زيارة للعيادة الرئيسية',
        lat: 24.7500,
        lng: 46.7000,
        locationName: 'شمال الرياض، السعودية',
        city: 'الرياض',
        country: 'السعودية',
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS'
      },
      {
        type: 'order',
        title: 'إنشاء طلبية تجريبية',
        details: 'طلبية أدوية للاختبار',
        lat: 24.6800,
        lng: 46.7200,
        locationName: 'شرق الرياض، السعودية',
        city: 'الرياض',
        country: 'السعودية',
        device: 'Tablet',
        browser: 'Firefox',
        os: 'Android'
      }
    ];

    try {
      for (const activity of sampleActivities) {
        const response = await fetch('/api/activity-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(activity),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      toast({
        title: "تم إنشاء البيانات التجريبية",
        description: "تم إضافة 3 أنشطة تجريبية للاختبار",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to create sample activities:', error);
      toast({
        title: "خطأ في إنشاء البيانات التجريبية",
        description: "حدث خطأ أثناء إضافة البيانات",
        variant: "destructive",
      });
    }
  };

  // Test location permission
  const testLocationPermission = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast({
        title: "خدمة الموقع غير متاحة",
        description: "المتصفح لا يدعم خدمة تحديد الموقع",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "جاري طلب إذن الموقع",
        description: "سيظهر لك طلب إذن الوصول للموقع قريباً...",
        duration: 5000,
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          toast({
            title: "تم الحصول على الموقع بنجاح!",
            description: `خط العرض: ${latitude.toFixed(4)}, خط الطول: ${longitude.toFixed(4)}`,
            duration: 5000,
          });

          // Log this location test
          fetch('/api/activity-log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'location_test',
              title: 'اختبار خدمة الموقع',
              details: `تم الحصول على الموقع بدقة ${accuracy} متر`,
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              source: 'gps',
              device: getDeviceType(),
              browser: getBrowserInfo().name,
              os: getOSInfo()
            }),
          }).catch(error => console.error('Failed to log location test:', error));
        },
        (error) => {
          let errorMessage = 'خطأ غير معروف';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'تم رفض إذن الوصول للموقع';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'الموقع غير متاح';
              break;
            case error.TIMEOUT:
              errorMessage = 'انتهت مهلة طلب الموقع';
              break;
          }
          
          toast({
            title: "فشل في الحصول على الموقع",
            description: errorMessage,
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } catch (error) {
      toast({
        title: "خطأ في خدمة الموقع",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  return {
    createSampleActivities,
    testLocationPermission
  };
}

// Helper functions
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'Server';
  
  const userAgent = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return /iPad/i.test(userAgent) ? 'Tablet' : 'Mobile';
  }
  return 'Desktop';
}

function getBrowserInfo(): { name: string; version: string } {
  if (typeof window === 'undefined') return { name: 'Unknown', version: 'Unknown' };
  
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) {
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    return { name: 'Chrome', version: match ? match[1] : 'Unknown' };
  } else if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    return { name: 'Firefox', version: match ? match[1] : 'Unknown' };
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    return { name: 'Safari', version: match ? match[1] : 'Unknown' };
  } else if (userAgent.includes('Edge')) {
    const match = userAgent.match(/Edge\/(\d+\.\d+)/);
    return { name: 'Edge', version: match ? match[1] : 'Unknown' };
  }
  
  return { name: 'Unknown', version: 'Unknown' };
}

function getOSInfo(): string {
  if (typeof window === 'undefined') return 'Unknown';
  
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  
  return 'Unknown';
}