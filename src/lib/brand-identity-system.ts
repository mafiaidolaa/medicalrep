'use client';

/**
 * نظام الهوية البصرية الموحدة
 * يوفر API مركزي لتطبيق الهوية البصرية على جميع المطبوعات والتقارير
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// تعريف الأنواع
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface BrandFonts {
  primary: string;
  secondary: string;
  mono: string;
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  weights: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface LogoSettings {
  main: string;
  icon: string;
  watermark: string;
  favicon: string;
  printHeader: string;
  dimensions: {
    main: { width: number; height: number };
    icon: { width: number; height: number };
    printHeader: { width: number; height: number };
  };
}

export interface PrintTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'report' | 'certificate' | 'statement' | 'contract';
  category: 'financial' | 'operational' | 'customer' | 'administrative';
  enabled: boolean;
  headerHeight: number;
  footerHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  showLogo: boolean;
  showWatermark: boolean;
  logoPosition: 'left' | 'center' | 'right';
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  headerConfig: {
    showCompanyInfo: boolean;
    showDate: boolean;
    showPageNumbers: boolean;
    customFields: Array<{ label: string; value: string; show: boolean }>;
  };
  footerConfig: {
    showContactInfo: boolean;
    showLegalText: boolean;
    customText: string;
  };
  layout: {
    columns: number;
    spacing: number;
    tableStyle: 'modern' | 'classic' | 'minimal';
    borderStyle: 'none' | 'light' | 'medium' | 'heavy';
  };
}

export interface BrandIdentityConfig {
  colors: BrandColors;
  fonts: BrandFonts;
  logos: LogoSettings;
  templates: PrintTemplate[];
  companyInfo: {
    name: string;
    nameEn?: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    taxNumber?: string;
    commercialRegister?: string;
    logo?: string;
  };
  globalSettings: {
    rtlSupport: boolean;
    defaultLanguage: 'ar' | 'en';
    dateFormat: string;
    numberFormat: string;
    currencySymbol: string;
    currencyPosition: 'before' | 'after';
  };
}

// القيم الافتراضية
const DEFAULT_BRAND_CONFIG: BrandIdentityConfig = {
  colors: {
    primary: '#0066CC',
    secondary: '#4A90E2',
    accent: '#FF6B6B',
    background: '#FFFFFF',
    text: '#1A1A1A',
    muted: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  },
  fonts: {
    primary: 'Cairo',
    secondary: 'Roboto',
    mono: 'Fira Code',
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px'
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  logos: {
    main: '/images/logo-main.png',
    icon: '/images/logo-icon.png',
    watermark: '/images/logo-watermark.png',
    favicon: '/images/favicon.ico',
    printHeader: '/images/logo-print.png',
    dimensions: {
      main: { width: 200, height: 60 },
      icon: { width: 32, height: 32 },
      printHeader: { width: 150, height: 45 }
    }
  },
  templates: [],
  companyInfo: {
    name: 'اسم الشركة',
    nameEn: 'Company Name',
    tagline: 'شعار الشركة',
    address: 'عنوان الشركة',
    phone: '+966 50 123 4567',
    email: 'info@company.com',
    website: 'www.company.com',
    taxNumber: '123456789',
    commercialRegister: '123456789'
  },
  globalSettings: {
    rtlSupport: true,
    defaultLanguage: 'ar',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'arabic',
    currencySymbol: 'ريال',
    currencyPosition: 'after'
  }
};

// Context للهوية البصرية
const BrandIdentityContext = createContext<{
  config: BrandIdentityConfig;
  updateConfig: (newConfig: Partial<BrandIdentityConfig>) => Promise<void>;
  applyToElement: (elementId: string, styles: Partial<CSSStyleDeclaration>) => void;
  generateCSS: () => string;
  generatePrintCSS: (templateId: string) => string;
  isLoading: boolean;
} | null>(null);

// Hook لاستخدام الهوية البصرية
export const useBrandIdentity = () => {
  const context = useContext(BrandIdentityContext);
  if (!context) {
    throw new Error('useBrandIdentity must be used within BrandIdentityProvider');
  }
  return context;
};

// Provider للهوية البصرية
export function BrandIdentityProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BrandIdentityConfig>(DEFAULT_BRAND_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  // تحميل الإعدادات من localStorage أو API
  useEffect(() => {
    loadBrandConfig();
  }, []);

  const loadBrandConfig = async () => {
    try {
      setIsLoading(true);
      
      // محاولة التحميل من localStorage أولاً
      const savedConfig = localStorage.getItem('brand-identity-config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_BRAND_CONFIG, ...parsedConfig });
      }
      
      // محاولة التحميل من API (اختياري)
      try {
        const response = await fetch('/api/brand-identity/config');
        if (response.ok) {
          const apiConfig = await response.json();
          setConfig({ ...DEFAULT_BRAND_CONFIG, ...apiConfig });
        }
      } catch (apiError) {
        console.log('لم يتم العثور على API للهوية البصرية، استخدام الإعدادات المحلية');
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات الهوية البصرية:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<BrandIdentityConfig>) => {
    try {
      setIsLoading(true);
      const updatedConfig = { ...config, ...newConfig };
      
      // حفظ في localStorage
      localStorage.setItem('brand-identity-config', JSON.stringify(updatedConfig));
      
      // حفظ في API (اختياري)
      try {
        await fetch('/api/brand-identity/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig)
        });
      } catch (apiError) {
        console.log('لم يتم حفظ الإعدادات في API، تم الحفظ محلياً فقط');
      }
      
      setConfig(updatedConfig);
      
      // تطبيق الإعدادات الجديدة على النظام
      applyGlobalStyles(updatedConfig);
      
    } catch (error) {
      console.error('خطأ في حفظ إعدادات الهوية البصرية:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const applyToElement = (elementId: string, styles: Partial<CSSStyleDeclaration>) => {
    const element = document.getElementById(elementId);
    if (element) {
      Object.assign(element.style, styles);
    }
  };

  const generateCSS = () => {
    const { colors, fonts } = config;
    
    return `
      :root {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-background: ${colors.background};
        --color-text: ${colors.text};
        --color-muted: ${colors.muted};
        --color-border: ${colors.border};
        --color-success: ${colors.success};
        --color-warning: ${colors.warning};
        --color-error: ${colors.error};
        
        --font-primary: '${fonts.primary}', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-secondary: '${fonts.secondary}', Arial, sans-serif;
        --font-mono: '${fonts.mono}', 'Courier New', monospace;
        
        --font-size-xs: ${fonts.sizes.xs};
        --font-size-sm: ${fonts.sizes.sm};
        --font-size-base: ${fonts.sizes.base};
        --font-size-lg: ${fonts.sizes.lg};
        --font-size-xl: ${fonts.sizes.xl};
        --font-size-2xl: ${fonts.sizes['2xl']};
        --font-size-3xl: ${fonts.sizes['3xl']};
        --font-size-4xl: ${fonts.sizes['4xl']};
        --font-size-5xl: ${fonts.sizes['5xl']};
        
        --font-weight-light: ${fonts.weights.light};
        --font-weight-normal: ${fonts.weights.normal};
        --font-weight-medium: ${fonts.weights.medium};
        --font-weight-semibold: ${fonts.weights.semibold};
        --font-weight-bold: ${fonts.weights.bold};
      }
      
      body {
        font-family: var(--font-primary);
        color: var(--color-text);
        background-color: var(--color-background);
      }
      
      .brand-primary { color: var(--color-primary); }
      .brand-secondary { color: var(--color-secondary); }
      .brand-accent { color: var(--color-accent); }
      .brand-success { color: var(--color-success); }
      .brand-warning { color: var(--color-warning); }
      .brand-error { color: var(--color-error); }
      
      .bg-brand-primary { background-color: var(--color-primary); }
      .bg-brand-secondary { background-color: var(--color-secondary); }
      .bg-brand-accent { background-color: var(--color-accent); }
      .bg-brand-success { background-color: var(--color-success); }
      .bg-brand-warning { background-color: var(--color-warning); }
      .bg-brand-error { background-color: var(--color-error); }
      
      .border-brand-primary { border-color: var(--color-primary); }
      .border-brand-secondary { border-color: var(--color-secondary); }
      .border-brand-accent { border-color: var(--color-accent); }
    `;
  };

  const generatePrintCSS = (templateId: string) => {
    const template = config.templates.find(t => t.id === templateId);
    if (!template) return '';
    
    const { colors, fonts, logos, companyInfo } = config;
    
    return `
      @media print {
        @page {
          margin: ${template.margins.top}mm ${template.margins.right}mm ${template.margins.bottom}mm ${template.margins.left}mm;
          size: A4;
        }
        
        body {
          font-family: ${fonts.primary}, Arial, sans-serif;
          font-size: ${fonts.sizes.sm};
          color: ${template.textColor};
          background-color: ${template.backgroundColor};
          line-height: 1.6;
          direction: ${config.globalSettings.rtlSupport ? 'rtl' : 'ltr'};
        }
        
        .print-header {
          height: ${template.headerHeight}px;
          display: flex;
          align-items: center;
          justify-content: ${template.logoPosition === 'center' ? 'center' : 
                             template.logoPosition === 'right' ? 'flex-end' : 'flex-start'};
          border-bottom: 2px solid ${template.accentColor};
          margin-bottom: 20px;
          padding-bottom: 10px;
        }
        
        .print-logo {
          max-height: ${template.headerHeight - 20}px;
          max-width: ${logos.dimensions.printHeader.width}px;
          object-fit: contain;
        }
        
        .print-footer {
          height: ${template.footerHeight}px;
          border-top: 1px solid ${colors.border};
          padding-top: 10px;
          margin-top: 20px;
          font-size: ${fonts.sizes.xs};
          color: ${colors.muted};
          text-align: center;
        }
        
        .company-info {
          font-size: ${fonts.sizes.sm};
          margin-bottom: 15px;
        }
        
        .company-name {
          font-size: ${fonts.sizes.lg};
          font-weight: ${fonts.weights.bold};
          color: ${template.accentColor};
          margin-bottom: 5px;
        }
        
        .document-title {
          font-size: ${fonts.sizes.xl};
          font-weight: ${fonts.weights.bold};
          color: ${template.accentColor};
          text-align: center;
          margin: 20px 0;
          border-bottom: 2px solid ${template.accentColor};
          padding-bottom: 10px;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: ${fonts.sizes.sm};
        }
        
        .data-table th {
          background-color: ${template.accentColor}20;
          color: ${template.accentColor};
          font-weight: ${fonts.weights.semibold};
          padding: 12px 8px;
          text-align: ${config.globalSettings.rtlSupport ? 'right' : 'left'};
          border: 1px solid ${colors.border};
        }
        
        .data-table td {
          padding: 10px 8px;
          border: 1px solid ${colors.border};
          text-align: ${config.globalSettings.rtlSupport ? 'right' : 'left'};
        }
        
        .data-table tr:nth-child(even) {
          background-color: ${colors.background}50;
        }
        
        .total-section {
          background-color: ${template.accentColor}10;
          border: 2px solid ${template.accentColor};
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          text-align: ${config.globalSettings.rtlSupport ? 'right' : 'left'};
        }
        
        .total-label {
          font-weight: ${fonts.weights.semibold};
          color: ${template.accentColor};
          font-size: ${fonts.sizes.base};
        }
        
        .total-amount {
          font-weight: ${fonts.weights.bold};
          font-size: ${fonts.sizes.lg};
          color: ${template.accentColor};
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          opacity: 0.1;
          font-size: 72px;
          font-weight: ${fonts.weights.bold};
          color: ${template.accentColor};
          z-index: -1;
          pointer-events: none;
        }
        
        ${template.showWatermark ? `
          .watermark::before {
            content: "${companyInfo.name}";
          }
        ` : ''}
        
        .page-break {
          page-break-after: always;
        }
        
        .no-print {
          display: none !important;
        }
        
        .print-only {
          display: block !important;
        }
      }
    `;
  };

  const applyGlobalStyles = (config: BrandIdentityConfig) => {
    // إنشاء أو تحديث style element للأنماط العامة
    let styleElement = document.getElementById('brand-identity-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'brand-identity-styles';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = generateCSS();
  };

  // تطبيق الأنماط عند تحميل المكون
  useEffect(() => {
    if (!isLoading) {
      applyGlobalStyles(config);
    }
  }, [config, isLoading]);

  const value = {
    config,
    updateConfig,
    applyToElement,
    generateCSS,
    generatePrintCSS,
    isLoading
  };

  return React.createElement(
    BrandIdentityContext.Provider,
    { value },
    children
  );
}

// مساعدات إضافية
export const formatCurrency = (amount: number, config?: BrandIdentityConfig): string => {
  const settings = config?.globalSettings || DEFAULT_BRAND_CONFIG.globalSettings;
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return settings.currencyPosition === 'before' 
    ? `${settings.currencySymbol} ${formatted}`
    : `${formatted} ${settings.currencySymbol}`;
};

export const formatDate = (date: Date | string, config?: BrandIdentityConfig): string => {
  const settings = config?.globalSettings || DEFAULT_BRAND_CONFIG.globalSettings;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (settings.defaultLanguage === 'ar') {
    return dateObj.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

export const generateReportStyles = (templateId: string, config: BrandIdentityConfig): string => {
  const template = config.templates.find(t => t.id === templateId);
  if (!template) return '';
  
  return `
    .report-container {
      font-family: ${config.fonts.primary}, Arial, sans-serif;
      color: ${template.textColor};
      background-color: ${template.backgroundColor};
      direction: ${config.globalSettings.rtlSupport ? 'rtl' : 'ltr'};
      line-height: 1.6;
      max-width: 100%;
      margin: 0 auto;
      padding: 20px;
    }
    
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${template.accentColor};
    }
    
    .report-title {
      font-size: ${config.fonts.sizes['2xl']};
      font-weight: ${config.fonts.weights.bold};
      color: ${template.accentColor};
      margin: 0;
    }
    
    .report-logo {
      max-height: 60px;
      max-width: 200px;
      object-fit: contain;
    }
    
    .report-section {
      margin: 30px 0;
      padding: 20px;
      border: 1px solid ${config.colors.border};
      border-radius: 8px;
      background-color: ${config.colors.background};
    }
    
    .report-section-title {
      font-size: ${config.fonts.sizes.lg};
      font-weight: ${config.fonts.weights.semibold};
      color: ${template.accentColor};
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid ${config.colors.border};
    }
    
    .report-kpi {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    
    .report-kpi-item {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      background: linear-gradient(135deg, ${template.accentColor}10, ${template.accentColor}05);
      border: 1px solid ${template.accentColor}30;
    }
    
    .report-kpi-value {
      font-size: ${config.fonts.sizes['3xl']};
      font-weight: ${config.fonts.weights.bold};
      color: ${template.accentColor};
      margin-bottom: 5px;
    }
    
    .report-kpi-label {
      font-size: ${config.fonts.sizes.sm};
      color: ${config.colors.muted};
      font-weight: ${config.fonts.weights.medium};
    }
  `;
};