"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SiteSettings {
  id: number;
  site_title: string;
  site_description: string;
  logo_path: string;
  icon_path: string;
  favicon_path: string;
  loading_icon_path: string;
  primary_color: string;
  secondary_color: string;
  meta_keywords: string;
  meta_author: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_website: string;
  company_currency?: string;
  system_language: string;
  rtl_support: boolean;
  // Print customization (optional)
  print_show_branding?: boolean; // toggle branded header/footer
  print_paper_size?: 'A4' | 'Letter';
  print_margin_mm?: number; // uniform margin in millimeters
  print_review_style?: 'compact' | 'detailed'; // review summary detail level for print
  // Advanced print options
  print_margin_top_mm?: number;
  print_margin_right_mm?: number;
  print_margin_bottom_mm?: number;
  print_margin_left_mm?: number;
  print_custom_header_text?: string;
  print_show_page_numbers?: boolean;
  print_watermark_text?: string;
  print_watermark_opacity?: number;
  // New: PDF branding controls
  print_logo_width_mm?: number; // width for logo in PDFs
  print_header_template?: 'standard' | 'minimal';
  print_footer_template?: 'standard' | 'minimal';
  
  // Preloader settings
  preloader_enabled?: boolean;
  preloader_logo_size?: number;
  preloader_show_logo?: boolean;
  preloader_logo_animation?: boolean;
  preloader_loading_message?: string;
  preloader_show_app_name?: boolean;
  preloader_custom_subtitle?: string;
  preloader_animation_type?: 'spin' | 'pulse' | 'bounce' | 'dots' | 'progress' | 'wave' | 'fade' | 'scale';
  preloader_animation_speed?: 'slow' | 'normal' | 'fast';
  preloader_animation_color?: string;
  preloader_background_color?: string;
  preloader_text_color?: string;
  preloader_blur_background?: boolean;
  preloader_show_progress?: boolean;
  preloader_min_display_time?: number;
  preloader_fade_out_duration?: number;
  
  // Active template
  preloader_active_template?: string; // ID النموذج النشط
  
  // Brand identity settings
  brand_colors?: string; // JSON string of brand colors
  brand_fonts?: string;  // JSON string of brand fonts
}

interface SiteSettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SiteSettings>) => Promise<void>;
  updateLogo: (logoType: 'main' | 'favicon' | 'loading', logoData: string) => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

// Default settings fallback
const defaultSettings: SiteSettings = {
  id: 1,
  site_title: 'EP Group System',
  site_description: 'نظام إدارة متطور للشركات والمؤسسات',
  logo_path: '/logo.svg',
  icon_path: '/logo.png',
  favicon_path: '/favicon.ico',
  loading_icon_path: '/logo.svg',
  primary_color: '#0066cc',
  secondary_color: '#6c757d',
  meta_keywords: 'EP Group, نظام إدارة, إدارة العيادات, إدارة المستودعات',
  meta_author: 'EP Group',
  company_phone: '+966123456789',
  company_email: 'info@epgroup.com',
  company_address: 'الرياض، المملكة العربية السعودية',
  company_website: 'https://www.epgroup.com',
  company_currency: 'EGP',
  system_language: 'ar',
  rtl_support: true,
  // Print defaults
  print_show_branding: true,
  print_paper_size: 'A4',
  print_margin_mm: 12,
  print_review_style: 'detailed',
  print_margin_top_mm: undefined,
  print_margin_right_mm: undefined,
  print_margin_bottom_mm: undefined,
  print_margin_left_mm: undefined,
  print_custom_header_text: '',
  print_show_page_numbers: true,
  print_watermark_text: '',
  print_watermark_opacity: 0.06,
  
  // Preloader defaults
  preloader_enabled: true,
  preloader_logo_size: 80,
  preloader_show_logo: true,
  preloader_logo_animation: true,
  preloader_loading_message: 'جاري التحميل...',
  preloader_show_app_name: true,
  preloader_custom_subtitle: '',
  preloader_animation_type: 'spin',
  preloader_animation_speed: 'normal',
  preloader_animation_color: '#0066cc',
  preloader_background_color: '',
  preloader_text_color: '',
  preloader_blur_background: false,
  preloader_show_progress: false,
  preloader_min_display_time: 1000,
  preloader_fade_out_duration: 300,
  
  // Active template default
  preloader_active_template: 'modern', // النموذج الافتراضي
};

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setError(null);
      
      // تحقق من الكاش أولاً
      const cachedSettings = sessionStorage.getItem('site_settings');
      const cacheTime = sessionStorage.getItem('site_settings_time');
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      if (cachedSettings && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
        const cached = JSON.parse(cachedSettings);
        setSettings(cached);
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/site-settings', {
        next: { revalidate: 300 } // Cache for 5 minutes
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch settings`);
      }
      
      const result = await response.json();

      if (result.success && result.data) {
        setSettings(result.data);
        // حفظ في الكاش
        sessionStorage.setItem('site_settings', JSON.stringify(result.data));
        sessionStorage.setItem('site_settings_time', now.toString());
      } else {
        setError('Failed to fetch site settings');
        setSettings(defaultSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching site settings');
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // فقط لو لم يتم التحميل بعد
    if (settings === null && loading) {
      fetchSettings();
    }
  }, []);

  // Apply settings to document head when settings are loaded
  useEffect(() => {
    if (settings && typeof document !== 'undefined') {
      // Update favicon
      let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = settings.favicon_path;

      // Update document title
      document.title = settings.site_title;

      // Update or create meta description
      let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = settings.site_description;

      // Update or create meta keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = settings.meta_keywords;

      // Update or create meta author
      let metaAuthor = document.querySelector('meta[name="author"]') as HTMLMetaElement;
      if (!metaAuthor) {
        metaAuthor = document.createElement('meta');
        metaAuthor.name = 'author';
        document.head.appendChild(metaAuthor);
      }
      metaAuthor.content = settings.meta_author;

      // Update CSS custom properties for colors
      const root = document.documentElement;
      root.style.setProperty('--site-primary-color', settings.primary_color);
      root.style.setProperty('--site-secondary-color', settings.secondary_color);
    }
  }, [settings]);

  const refreshSettings = async () => {
    await fetchSettings();
  };

  const updateSettings = async (updates: Partial<SiteSettings>) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Updating settings:', updates);
      
      const response = await fetch('/api/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📊 API Result:', result);
      
      if (result.success) {
        // تحديث الحالة المحلية
        const newSettings = settings ? { ...settings, ...updates } : { ...defaultSettings, ...updates };
        setSettings(newSettings);
        
        // تطبيق التغييرات فوراً على النظام
        applySettingsToSystem(newSettings);
        
        console.log('✅ Settings updated successfully');
      } else {
        const errorMessage = result.error || 'فشل في تحديث الإعدادات';
        console.error('❌ API Error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      console.error('❌ خطأ في تحديث الإعدادات:', errorMessage, error);
      setError(errorMessage);
      
      // In development, provide more detailed error information
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error object:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateLogo = async (logoType: 'main' | 'favicon' | 'loading', logoData: string) => {
    const logoUpdates: Partial<SiteSettings> = {};
    
    switch (logoType) {
      case 'main':
        logoUpdates.logo_path = logoData;
        break;
      case 'favicon':
        logoUpdates.favicon_path = logoData;
        break;
      case 'loading':
        logoUpdates.loading_icon_path = logoData;
        break;
    }
    
    await updateSettings(logoUpdates);
  };

  // وظيفة تطبيق الإعدادات على النظام فوراً
  const applySettingsToSystem = (settingsData: SiteSettings) => {
    if (typeof document !== 'undefined') {
      // تحديث favicon
      let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = settingsData.favicon_path;

      // تحديث document title
      document.title = settingsData.site_title;

      // تحديث CSS custom properties
      const root = document.documentElement;
      root.style.setProperty('--site-primary-color', settingsData.primary_color);
      root.style.setProperty('--site-secondary-color', settingsData.secondary_color);
      root.style.setProperty('--site-logo-main', `url('${settingsData.logo_path}')`);
      root.style.setProperty('--site-logo-favicon', `url('${settingsData.favicon_path}')`);
      root.style.setProperty('--site-logo-loading', `url('${settingsData.loading_icon_path}')`);
      
      // إرسال حدث مخصص للتحديث الفوري
      const logoChangeEvent = new CustomEvent('siteSettingsChange', {
        detail: { settings: settingsData }
      });
      window.dispatchEvent(logoChangeEvent);
    }
  };

  const value: SiteSettingsContextType = {
    settings: settings || defaultSettings,
    loading,
    error,
    refreshSettings,
    updateSettings,
    updateLogo,
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}

// Hook to get only the settings (with fallback)
export function useSiteSettingsValue() {
  const { settings } = useSiteSettings();
  return settings || defaultSettings;
}

// Hook to get actions for updating settings
export function useSiteSettingsActions() {
  const { updateSettings, updateLogo, refreshSettings } = useSiteSettings();
  return { updateSettings, updateLogo, refreshSettings };
}
