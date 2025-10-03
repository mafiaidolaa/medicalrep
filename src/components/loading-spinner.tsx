
"use client";

import Image from 'next/image';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// أنواع الأنيميشن المتاحة
type AnimationType = 'spin' | 'pulse' | 'bounce' | 'wave' | 'dots' | 'scale' | 'fade';
type AnimationSpeed = 'slow' | 'normal' | 'fast';

interface LoadingSpinnerProps {
  // خيارات التخصيص
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animation?: AnimationType;
  speed?: AnimationSpeed;
  color?: string;
  message?: string;
  showLogo?: boolean;
  showTitle?: boolean;
  className?: string;
  // خيارات التخطيط
  fullScreen?: boolean;
  background?: string;
}

// مكونات الأنيميشن المختلفة
const AnimationComponents = {
  spin: ({ className, color }: { className?: string; color?: string }) => (
    <svg
      className={cn("animate-spin", className)}
      style={{ color }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
  
  pulse: ({ className, color }: { className?: string; color?: string }) => (
    <div className={cn("relative", className)}>
      <div 
        className="w-8 h-8 rounded-full animate-pulse"
        style={{ backgroundColor: color || 'currentColor' }}
      />
      <div 
        className="absolute inset-0 w-8 h-8 rounded-full animate-ping opacity-30"
        style={{ backgroundColor: color || 'currentColor' }}
      />
    </div>
  ),
  
  bounce: ({ className, color }: { className?: string; color?: string }) => (
    <div className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ 
            backgroundColor: color || 'currentColor',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  ),
  
  wave: ({ className, color }: { className?: string; color?: string }) => (
    <div className={cn("flex items-end gap-1", className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-current rounded-full animate-pulse"
          style={{
            height: `${12 + (i % 3) * 8}px`,
            color: color || 'currentColor',
            animationDelay: `${i * 0.2}s`,
            animationDuration: '0.8s'
          }}
        />
      ))}
    </div>
  ),
  
  dots: ({ className, color }: { className?: string; color?: string }) => (
    <div className={cn("flex gap-2", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full opacity-60"
          style={{
            backgroundColor: color || 'currentColor',
            animation: `pulse 1.4s ease-in-out ${i * 0.16}s infinite both`
          }}
        />
      ))}
    </div>
  ),
  
  scale: ({ className, color }: { className?: string; color?: string }) => (
    <div 
      className={cn("w-8 h-8 rounded-full animate-ping", className)}
      style={{ backgroundColor: color || 'currentColor' }}
    />
  ),
  
  fade: ({ className, color }: { className?: string; color?: string }) => (
    <div 
      className={cn("w-8 h-8 rounded-full animate-pulse", className)}
      style={{ backgroundColor: color || 'currentColor' }}
    />
  )
};

export function LoadingSpinner({
  size = 'md',
  animation,
  speed,
  color,
  message,
  showLogo = true,
  showTitle = true,
  className,
  fullScreen = true,
  background
}: LoadingSpinnerProps = {}) {
  const siteSettings = useSiteSettingsValue();
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const [showFallback, setShowFallback] = useState(false);
  
  // استخراج الإعدادات من قاعدة البيانات أو استخدام القيم المُمررة
  const resolvedSettings = useMemo(() => {
    return {
      animation: animation || (siteSettings?.preloader_animation_type as AnimationType) || 'spin',
      speed: speed || (siteSettings?.preloader_animation_speed as AnimationSpeed) || 'normal',
      color: color || siteSettings?.preloader_animation_color || siteSettings?.primary_color || '#0066cc',
      message: message || siteSettings?.preloader_loading_message || 'جاري التحميل...',
      showLogo: showLogo && (siteSettings?.preloader_show_logo ?? true),
      showTitle: showTitle && (siteSettings?.preloader_show_app_name ?? true),
      background: background || siteSettings?.preloader_background_color || '',
      logoSize: siteSettings?.preloader_logo_size || (size === 'sm' ? 48 : size === 'lg' ? 80 : 64)
    };
  }, [siteSettings, animation, speed, color, message, showLogo, showTitle, background, size]);
  
  // إعدادات الحجم
  const sizeClasses = {
    sm: { container: 'gap-2', logo: 'w-12 h-12', text: 'text-lg', spinner: 'h-4 w-4' },
    md: { container: 'gap-4', logo: 'w-16 h-16', text: 'text-2xl', spinner: 'h-5 w-5' },
    lg: { container: 'gap-6', logo: 'w-20 h-20', text: 'text-3xl', spinner: 'h-6 w-6' },
    xl: { container: 'gap-8', logo: 'w-24 h-24', text: 'text-4xl', spinner: 'h-8 w-8' }
  };
  
  // إعدادات السرعة
  const speedClasses = {
    slow: 'duration-1000',
    normal: 'duration-700',
    fast: 'duration-500'
  };
  
  useEffect(() => {
    // تحديد الشعار المناسب للتحميل
    let selectedLogo = '';
    
    // أولوية الشعارات: 1. شعار التحميل 2. الرئيسي 3. الأيقونة 4. من localStorage 5. افتراضي
    if (siteSettings?.loading_icon_path && siteSettings.loading_icon_path !== '') {
      selectedLogo = siteSettings.loading_icon_path;
    } else if (siteSettings?.logo_path && siteSettings.logo_path !== '') {
      selectedLogo = siteSettings.logo_path;
    } else if (siteSettings?.icon_path && siteSettings.icon_path !== '') {
      selectedLogo = siteSettings.icon_path;
    } else {
      // البحث في localStorage كخيار احتياطي
      const savedLogos = localStorage.getItem('brand-logos');
      if (savedLogos) {
        try {
          const logos = JSON.parse(savedLogos);
          selectedLogo = logos.main?.url || logos.icon?.url || '';
        } catch (e) {
          console.warn('خطأ في قراءة الشعارات من localStorage:', e);
        }
      }
    }
    
    // تحديث الشعار إذا وُجد
    if (selectedLogo && selectedLogo !== logoUrl) {
      setLogoUrl(selectedLogo);
      setShowFallback(false);
    }
  }, [siteSettings, logoUrl]);
  
  const AnimationComponent = AnimationComponents[resolvedSettings.animation];
  
  const containerClasses = cn(
    "flex flex-col items-center justify-center",
    fullScreen ? "min-h-screen" : "min-h-[400px]",
    sizeClasses[size].container,
    speedClasses[resolvedSettings.speed],
    className
  );
  
  const containerStyle = resolvedSettings.background ? {
    backgroundColor: resolvedSettings.background,
    color: siteSettings?.preloader_text_color || 'inherit'
  } : undefined;
  
  return (
    <div className={containerClasses} style={containerStyle}>
      <div className="flex flex-col items-center gap-inherit">
        {/* الشعار */}
        {resolvedSettings.showLogo && (
          <div className="relative mb-2" style={{ width: resolvedSettings.logoSize, height: resolvedSettings.logoSize }}>
            {!showFallback ? (
              <Image 
                src={logoUrl} 
                alt="شعار النظام" 
                width={resolvedSettings.logoSize} 
                height={resolvedSettings.logoSize} 
                className={cn(
                  "object-contain rounded-lg shadow-sm transition-transform",
                  siteSettings?.preloader_logo_animation && "hover:scale-110"
                )} 
                onError={() => setShowFallback(true)}
              />
            ) : (
              <div 
                className="bg-primary/10 rounded-lg flex items-center justify-center border-2 border-primary/20 transition-all hover:bg-primary/20"
                style={{ width: resolvedSettings.logoSize, height: resolvedSettings.logoSize }}
              >
                <span 
                  className="font-bold text-primary"
                  style={{ fontSize: `${resolvedSettings.logoSize * 0.3}px` }}
                >
                  {siteSettings?.site_title?.substring(0, 2)?.toUpperCase() || 'EP'}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* عنوان التطبيق */}
        {resolvedSettings.showTitle && (
          <h1 
            className={cn("font-bold tracking-tight transition-colors", sizeClasses[size].text)}
            style={{ color: siteSettings?.preloader_text_color || 'inherit' }}
          >
            {siteSettings?.site_title || 'نظام إدارة الشركة'}
          </h1>
        )}
        
        {/* العنوان الفرعي المخصص */}
        {siteSettings?.preloader_custom_subtitle && (
          <p 
            className="text-sm opacity-80 max-w-md text-center"
            style={{ color: siteSettings?.preloader_text_color || 'inherit' }}
          >
            {siteSettings.preloader_custom_subtitle}
          </p>
        )}
        
        {/* الأنيميشن ورسالة التحميل */}
        <div className="flex items-center gap-3 text-muted-foreground transition-colors">
          <AnimationComponent 
            className={sizeClasses[size].spinner} 
            color={resolvedSettings.color}
          />
          <span 
            style={{ color: siteSettings?.preloader_text_color || 'inherit' }}
            className="transition-colors"
          >
            {resolvedSettings.message}
          </span>
        </div>
        
        {/* شريط التقدم إذا كان مفعلاً */}
        {siteSettings?.preloader_show_progress && (
          <div className="w-64 bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
            <div 
              className="h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                backgroundColor: resolvedSettings.color,
                width: '60%',
                animation: 'progress 2s ease-in-out infinite'
              }}
            />
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0% { width: 10%; }
          50% { width: 80%; }
          100% { width: 60%; }
        }
      `}</style>
    </div>
  );
}

// Hook مخصص لإدارة LoadingSpinner المحسن
export function useLoadingSpinner() {
  const siteSettings = useSiteSettingsValue();
  
  const getSpinnerSettings = useMemo(() => {
    return {
      animation: (siteSettings?.preloader_animation_type as AnimationType) || 'spin',
      speed: (siteSettings?.preloader_animation_speed as AnimationSpeed) || 'normal',
      color: siteSettings?.preloader_animation_color || siteSettings?.primary_color || '#0066cc',
      message: siteSettings?.preloader_loading_message || 'جاري التحميل...',
      showLogo: siteSettings?.preloader_show_logo ?? true,
      showTitle: siteSettings?.preloader_show_app_name ?? true,
      background: siteSettings?.preloader_background_color || '',
      logoSize: siteSettings?.preloader_logo_size || 64,
      isEnabled: siteSettings?.preloader_enabled ?? true
    };
  }, [siteSettings]);
  
  return {
    settings: getSpinnerSettings,
    siteSettings,
    LoadingComponent: (props: Partial<LoadingSpinnerProps>) => (
      <LoadingSpinner {...getSpinnerSettings} {...props} />
    )
  };
}

// مكون مصغر للاستخدام السريع في Suspense
export const QuickLoadingSpinner = ({ message = "Loading..." }: { message?: string }) => {
  const { settings } = useLoadingSpinner();
  return (
    <LoadingSpinner
      size="md"
      animation={settings.animation}
      color={settings.color}
      message={message || settings.message}
      showLogo={false}
      showTitle={false}
      fullScreen={false}
      className="py-8"
    />
  );
};
