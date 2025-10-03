"use client";

import { useMemo } from 'react';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { AdvancedPreloader, PreloaderSettings } from '@/components/advanced-preloader';
import { AdvancedTemplatePreloader } from '@/components/advanced-template-preloader';
import { getTemplateById } from '@/components/preloader-templates';

interface EnhancedLoadingSpinnerProps {
  className?: string;
  onComplete?: () => void;
  overrideSettings?: Partial<PreloaderSettings>;
}

export function EnhancedLoadingSpinner({ 
  className, 
  onComplete, 
  overrideSettings 
}: EnhancedLoadingSpinnerProps) {
  const siteSettings = useSiteSettingsValue();
  
  // تحويل إعدادات النظام إلى إعدادات الـ Preloader
  const preloaderSettings: PreloaderSettings = useMemo(() => {
    const baseSettings: PreloaderSettings = {
      // إعدادات الشعار
      logo_url: siteSettings?.loading_icon_path || siteSettings?.logo_path || siteSettings?.icon_path,
      logo_size: siteSettings?.preloader_logo_size || 80,
      show_logo: siteSettings?.preloader_show_logo ?? true,
      logo_animation: siteSettings?.preloader_logo_animation ?? true,
      
      // إعدادات النصوص
      loading_message: siteSettings?.preloader_loading_message || 'جاري التحميل...',
      show_app_name: siteSettings?.preloader_show_app_name ?? true,
      custom_subtitle: siteSettings?.preloader_custom_subtitle || '',
      
      // إعدادات الأنيميشن
      animation_type: (siteSettings?.preloader_animation_type as any) || 'spin',
      animation_speed: (siteSettings?.preloader_animation_speed as any) || 'normal',
      animation_color: siteSettings?.preloader_animation_color || siteSettings?.primary_color || '#0066cc',
      
      // إعدادات التصميم
      background_color: siteSettings?.preloader_background_color || '',
      text_color: siteSettings?.preloader_text_color || '',
      blur_background: siteSettings?.preloader_blur_background ?? false,
      show_progress: siteSettings?.preloader_show_progress ?? false,
      
      // إعدادات التوقيت
      min_display_time: siteSettings?.preloader_min_display_time || 1000,
      fade_out_duration: siteSettings?.preloader_fade_out_duration || 300,
    };
    
    // دمج الإعدادات المخصصة إن وجدت
    return { ...baseSettings, ...overrideSettings };
  }, [siteSettings, overrideSettings]);
  
  // التحقق من تفعيل الـ Preloader
  const isEnabled = siteSettings?.preloader_enabled ?? true;
  
  // التحقق من النموذج النشط
  const activeTemplate = siteSettings?.preloader_active_template;
  const template = activeTemplate ? getTemplateById(activeTemplate) : null;
  
  if (!isEnabled) {
    // إذا كان الـ Preloader معطل، لا نعرض شيء
    return null;
  }
  
  // استخدام النموذج المتقدم إذا كان متاح
  if (template) {
    return (
      <AdvancedTemplatePreloader
        isVisible={true}
        template={template}
        onComplete={onComplete}
        className={className}
      />
    );
  }
  
  // العودة للـ Preloader التقليدي كـ fallback
  return (
    <AdvancedPreloader
      isVisible={true}
      settings={preloaderSettings}
      onComplete={onComplete}
      className={className}
    />
  );
}

// Hook مخصص لإدارة الـ Preloader المحسن
export function useEnhancedPreloader() {
  const siteSettings = useSiteSettingsValue();
  
  const isEnabled = useMemo(() => {
    return siteSettings?.preloader_enabled ?? true;
  }, [siteSettings?.preloader_enabled]);
  
  const getPreloaderSettings = useMemo((): PreloaderSettings => {
    return {
      logo_url: siteSettings?.loading_icon_path || siteSettings?.logo_path || siteSettings?.icon_path,
      logo_size: siteSettings?.preloader_logo_size || 80,
      show_logo: siteSettings?.preloader_show_logo ?? true,
      logo_animation: siteSettings?.preloader_logo_animation ?? true,
      loading_message: siteSettings?.preloader_loading_message || 'جاري التحميل...',
      show_app_name: siteSettings?.preloader_show_app_name ?? true,
      custom_subtitle: siteSettings?.preloader_custom_subtitle || '',
      animation_type: (siteSettings?.preloader_animation_type as any) || 'spin',
      animation_speed: (siteSettings?.preloader_animation_speed as any) || 'normal',
      animation_color: siteSettings?.preloader_animation_color || siteSettings?.primary_color || '#0066cc',
      background_color: siteSettings?.preloader_background_color || '',
      text_color: siteSettings?.preloader_text_color || '',
      blur_background: siteSettings?.preloader_blur_background ?? false,
      show_progress: siteSettings?.preloader_show_progress ?? false,
      min_display_time: siteSettings?.preloader_min_display_time || 1000,
      fade_out_duration: siteSettings?.preloader_fade_out_duration || 300,
    };
  }, [siteSettings]);
  
  return {
    isEnabled,
    settings: getPreloaderSettings,
    siteSettings
  };
}