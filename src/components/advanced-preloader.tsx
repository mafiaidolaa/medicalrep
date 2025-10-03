"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { cn } from '@/lib/utils';

// تعريف أنواع الأنيميشن المتاحة
export type PreloaderAnimationType = 
  | 'spin' 
  | 'pulse' 
  | 'bounce' 
  | 'dots'
  | 'progress'
  | 'wave'
  | 'fade'
  | 'scale';

// تعريف إعدادات الـ preloader
export interface PreloaderSettings {
  // إعدادات اللوجو
  logo_url?: string;
  logo_size?: number; // بالبيكسل
  show_logo?: boolean;
  logo_animation?: boolean;
  
  // إعدادات النص والرسالة
  loading_message?: string;
  show_app_name?: boolean;
  custom_subtitle?: string;
  
  // إعدادات الأنيميشن
  animation_type?: PreloaderAnimationType;
  animation_speed?: 'slow' | 'normal' | 'fast';
  animation_color?: string;
  
  // إعدادات التصميم
  background_color?: string;
  text_color?: string;
  blur_background?: boolean;
  show_progress?: boolean;
  
  // إعدادات التوقيت
  min_display_time?: number; // بالميلي ثانية
  fade_out_duration?: number; // مدة الاختفاء التدريجي
}

// الإعدادات الافتراضية
const defaultPreloaderSettings: PreloaderSettings = {
  logo_size: 80,
  show_logo: true,
  logo_animation: true,
  loading_message: 'جاري التحميل...',
  show_app_name: true,
  custom_subtitle: '',
  animation_type: 'spin',
  animation_speed: 'normal',
  animation_color: '#0066cc',
  background_color: '',
  text_color: '',
  blur_background: false,
  show_progress: false,
  min_display_time: 1000,
  fade_out_duration: 300
};

// مكونات الأنيميشن المختلفة
const AnimationComponents = {
  spin: ({ color, speed }: { color: string; speed: string }) => (
    <svg
      className={cn(
        'h-6 w-6',
        speed === 'slow' && 'animate-spin-slow',
        speed === 'normal' && 'animate-spin',
        speed === 'fast' && 'animate-spin-fast'
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
  
  pulse: ({ color, speed }: { color: string; speed: string }) => (
    <div
      className={cn(
        'h-6 w-6 rounded-full',
        speed === 'slow' && 'animate-pulse-slow',
        speed === 'normal' && 'animate-pulse',
        speed === 'fast' && 'animate-pulse-fast'
      )}
      style={{ backgroundColor: color }}
    />
  ),
  
  bounce: ({ color, speed }: { color: string; speed: string }) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'h-3 w-3 rounded-full',
            speed === 'slow' && 'animate-bounce-slow',
            speed === 'normal' && 'animate-bounce',
            speed === 'fast' && 'animate-bounce-fast'
          )}
          style={{ 
            backgroundColor: color,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  ),
  
  dots: ({ color, speed }: { color: string; speed: string }) => (
    <div className="flex space-x-1 rtl:space-x-reverse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'h-2 w-2 rounded-full animate-pulse',
            speed === 'slow' && 'animate-pulse-slow',
            speed === 'normal' && 'animate-pulse',
            speed === 'fast' && 'animate-pulse-fast'
          )}
          style={{ 
            backgroundColor: color,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
    </div>
  ),
  
  progress: ({ color, speed }: { color: string; speed: string }) => (
    <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full',
          speed === 'slow' && 'animate-progress-slow',
          speed === 'normal' && 'animate-progress',
          speed === 'fast' && 'animate-progress-fast'
        )}
        style={{ backgroundColor: color }}
      />
    </div>
  ),
  
  wave: ({ color, speed }: { color: string; speed: string }) => (
    <div className="flex items-center space-x-1 rtl:space-x-reverse">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1 bg-current rounded-full',
            speed === 'slow' && 'animate-wave-slow',
            speed === 'normal' && 'animate-wave',
            speed === 'fast' && 'animate-wave-fast'
          )}
          style={{ 
            color: color,
            height: `${12 + Math.sin(i * 0.5) * 4}px`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  ),
  
  fade: ({ color, speed }: { color: string; speed: string }) => (
    <div
      className={cn(
        'h-6 w-6 rounded-full',
        speed === 'slow' && 'animate-fade-slow',
        speed === 'normal' && 'animate-fade',
        speed === 'fast' && 'animate-fade-fast'
      )}
      style={{ backgroundColor: color }}
    />
  ),
  
  scale: ({ color, speed }: { color: string; speed: string }) => (
    <div
      className={cn(
        'h-6 w-6 rounded-full',
        speed === 'slow' && 'animate-scale-slow',
        speed === 'normal' && 'animate-scale',
        speed === 'fast' && 'animate-scale-fast'
      )}
      style={{ backgroundColor: color }}
    />
  )
};

interface AdvancedPreloaderProps {
  isVisible?: boolean;
  onComplete?: () => void;
  settings?: Partial<PreloaderSettings>;
  className?: string;
}

export function AdvancedPreloader({ 
  isVisible = true, 
  onComplete, 
  settings: customSettings,
  className 
}: AdvancedPreloaderProps) {
  const siteSettings = useSiteSettingsValue();
  const [isShowing, setIsShowing] = useState(isVisible);
  const [logoError, setLogoError] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // دمج الإعدادات من مصادر متعددة
  const settings = {
    ...defaultPreloaderSettings,
    ...customSettings,
    // استخدام إعدادات النظام إذا كانت متوفرة
    logo_url: customSettings?.logo_url || siteSettings?.loading_icon_path || siteSettings?.logo_path || siteSettings?.icon_path,
    loading_message: customSettings?.loading_message || 'جاري التحميل...',
    animation_color: customSettings?.animation_color || siteSettings?.primary_color || '#0066cc',
    background_color: customSettings?.background_color || '',
    text_color: customSettings?.text_color || ''
  };
  
  // محاكاة تقدم التحميل إذا كان مفعل
  useEffect(() => {
    if (!settings.show_progress || !isShowing) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [isShowing, settings.show_progress]);
  
  // إدارة إخفاء المكون
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        setIsShowing(false);
        onComplete?.();
      }, settings.fade_out_duration);
      
      return () => clearTimeout(timer);
    } else {
      setIsShowing(true);
    }
  }, [isVisible, settings.fade_out_duration, onComplete]);
  
  // الحد الأدنى لوقت العرض
  useEffect(() => {
    if (isVisible && settings.min_display_time) {
      const timer = setTimeout(() => {
        // يمكن إضافة منطق إضافي هنا
      }, settings.min_display_time);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, settings.min_display_time]);
  
  if (!isShowing) return null;
  
  const AnimationComponent = AnimationComponents[settings.animation_type || 'spin'];
  
  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300',
        settings.blur_background && 'backdrop-blur-sm',
        !isVisible && 'opacity-0',
        className
      )}
      style={{
        backgroundColor: settings.background_color || 'hsl(var(--background))',
        color: settings.text_color || 'hsl(var(--foreground))'
      }}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        {/* اللوجو */}
        {settings.show_logo && settings.logo_url && (
          <div 
            className={cn(
              'relative flex-shrink-0',
              settings.logo_animation && 'animate-pulse'
            )}
            style={{
              width: settings.logo_size,
              height: settings.logo_size
            }}
          >
            {!logoError ? (
              <Image
                src={settings.logo_url}
                alt="شعار النظام"
                width={settings.logo_size}
                height={settings.logo_size}
                className={cn(
                  'object-contain rounded-lg',
                  settings.logo_animation && 'animate-pulse'
                )}
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              // شعار بديل في حالة فشل تحميل الصورة
              <div 
                className="bg-primary/10 rounded-lg flex items-center justify-center border-2 border-primary/20"
                style={{
                  width: settings.logo_size,
                  height: settings.logo_size
                }}
              >
                <span 
                  className="font-bold text-primary"
                  style={{ fontSize: `${settings.logo_size! * 0.3}px` }}
                >
                  {siteSettings?.site_title?.substring(0, 2)?.toUpperCase() || 'EP'}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* اسم التطبيق */}
        {settings.show_app_name && (
          <h1 className="text-3xl font-bold tracking-tight">
            {siteSettings?.site_title || 'نظام إدارة الشركة'}
          </h1>
        )}
        
        {/* العنوان الفرعي المخصص */}
        {settings.custom_subtitle && (
          <p className="text-lg text-muted-foreground max-w-md">
            {settings.custom_subtitle}
          </p>
        )}
        
        {/* شريط التقدم */}
        {settings.show_progress && (
          <div className="w-64 space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>
        )}
        
        {/* رسالة التحميل مع الأنيميشن */}
        <div className="flex items-center gap-3">
          <AnimationComponent 
            color={settings.animation_color!}
            speed={settings.animation_speed!}
          />
          <span className="text-lg font-medium">
            {settings.loading_message}
          </span>
        </div>
      </div>
      
      {/* مؤشر إضافي في الأسفل */}
      <div className="absolute bottom-8 text-sm text-muted-foreground">
        {siteSettings?.site_description && (
          <p className="max-w-md text-center">
            {siteSettings.site_description}
          </p>
        )}
      </div>
    </div>
  );
}

// Hook مخصص لإدارة الـ preloader
export function useAdvancedPreloader(initialSettings?: Partial<PreloaderSettings>) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(initialSettings || {});
  
  const showPreloader = () => setIsLoading(true);
  const hidePreloader = () => setIsLoading(false);
  const updateSettings = (newSettings: Partial<PreloaderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  return {
    isLoading,
    settings,
    showPreloader,
    hidePreloader,
    updateSettings
  };
}