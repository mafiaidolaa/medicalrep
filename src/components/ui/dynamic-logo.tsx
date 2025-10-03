"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DynamicLogoProps {
  type?: 'main' | 'icon' | 'watermark' | 'favicon' | 'printHeader';
  className?: string;
  fallbackSrc?: string;
  alt?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function DynamicLogo({
  type = 'main',
  className,
  fallbackSrc = '/images/default-logo.png',
  alt = 'شعار التطبيق',
  width,
  height,
  style,
  onClick,
  ...props
}: DynamicLogoProps) {
  const [logoSrc, setLogoSrc] = useState<string>(fallbackSrc);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // تحميل الشعار المحفوظ من localStorage
    const loadSavedLogo = () => {
      try {
        // محاولة الحصول على الشعار من localStorage
        const savedLogos = localStorage.getItem('brand-logos');
        if (savedLogos) {
          const logos = JSON.parse(savedLogos);
          if (logos[type]?.url) {
            setLogoSrc(logos[type].url);
            setLoading(false);
            return;
          }
        }

        // محاولة الحصول على الشعار من localStorage المخصص
        const savedLogo = localStorage.getItem(`brand-logo-${type}`);
        if (savedLogo) {
          setLogoSrc(savedLogo);
          setLoading(false);
          return;
        }

        // استخدام الشعار الافتراضي
        setLogoSrc(fallbackSrc);
        setLoading(false);
      } catch (error) {
        console.error('خطأ في تحميل الشعار:', error);
        setLogoSrc(fallbackSrc);
        setLoading(false);
      }
    };

    // تحميل الشعار عند تشغيل المكون
    loadSavedLogo();

    // الاستماع لتغييرات الشعار
    const handleLogoChange = (event: CustomEvent) => {
      const { logoType, logoUrl } = event.detail;
      if (logoType === type) {
        setLogoSrc(logoUrl);
      }
    };

    const handleLogoRemove = (event: CustomEvent) => {
      const { logoType } = event.detail;
      if (logoType === type) {
        setLogoSrc(fallbackSrc);
      }
    };

    // إضافة مستمعي الأحداث
    window.addEventListener('logoChange', handleLogoChange as EventListener);
    window.addEventListener('logoRemove', handleLogoRemove as EventListener);

    // تنظيف المستمعين عند إلغاء تركيب المكون
    return () => {
      window.removeEventListener('logoChange', handleLogoChange as EventListener);
      window.removeEventListener('logoRemove', handleLogoRemove as EventListener);
    };
  }, [type, fallbackSrc]);

  // معالجة خطأ تحميل الصورة
  const handleError = () => {
    console.warn(`فشل في تحميل شعار ${type}, استخدام الشعار الافتراضي`);
    setLogoSrc(fallbackSrc);
  };

  // تحديد الأبعاد الافتراضية حسب نوع الشعار
  const getDefaultDimensions = () => {
    switch (type) {
      case 'main':
        return { width: width || 200, height: height || 60 };
      case 'icon':
        return { width: width || 32, height: height || 32 };
      case 'watermark':
        return { width: width || 100, height: height || 100 };
      case 'printHeader':
        return { width: width || 150, height: height || 45 };
      default:
        return { width: width || 100, height: height || 50 };
    }
  };

  const dimensions = getDefaultDimensions();

  if (loading) {
    // مكون تحميل بسيط
    return (
      <div
        className={cn(
          'animate-pulse bg-gray-200 rounded',
          `dynamic-logo-${type}`,
          className
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={cn(
        'object-contain logo-transition',
        `dynamic-logo-${type}`,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style,
      }}
      onError={handleError}
      onClick={onClick}
      data-logo-type={type}
      {...props}
    />
  );
}

// مكون مخصص للشعار في الـ sidebar
export function SidebarLogo({ 
  className, 
  companyName = 'اسم الشركة',
  ...props 
}: Omit<DynamicLogoProps, 'type'> & { companyName?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DynamicLogo
        type="main"
        width={32}
        height={32}
        className="shrink-0"
        {...props}
      />
      <span className="font-semibold text-sm truncate">
        {companyName}
      </span>
    </div>
  );
}

// مكون مخصص لأيقونة التطبيق
export function AppIcon({ 
  className,
  size = 24,
  ...props 
}: Omit<DynamicLogoProps, 'type' | 'width' | 'height'> & { size?: number }) {
  return (
    <DynamicLogo
      type="icon"
      width={size}
      height={size}
      className={cn('rounded', className)}
      data-app-icon="true"
      {...props}
    />
  );
}

// مكون مخصص للعلامة المائية
export function WatermarkLogo({ 
  className,
  opacity = 0.1,
  ...props 
}: Omit<DynamicLogoProps, 'type'> & { opacity?: number }) {
  return (
    <div 
      className={cn(
        'fixed inset-0 pointer-events-none z-[-1] flex items-center justify-center',
        className
      )}
      style={{ opacity }}
    >
      <DynamicLogo
        type="watermark"
        width={300}
        height={300}
        className="rotate-45 select-none"
        {...props}
      />
    </div>
  );
}