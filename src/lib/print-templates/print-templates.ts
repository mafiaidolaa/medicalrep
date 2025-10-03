/**
 * مكتبة تنسيقات الطباعة المتقدمة - EP Group System
 * نظام احترافي للطباعة وتصدير PDF مع تصاميم متقدمة وهوية بصرية
 */

export interface PrintTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'report' | 'invoice' | 'document' | 'list' | 'form';
  preview: string; // Base64 encoded preview image
  settings: PrintTemplateSettings;
  styles: PrintTemplateStyles;
}

export interface PrintTemplateSettings {
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  headerFooter: boolean;
  watermark: boolean;
  rtl: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
}

export interface PrintTemplateStyles {
  header: string;
  body: string;
  footer: string;
  table: string;
  card: string;
  badge: string;
}

// نمط EP Group الرسمي - النمط الافتراضي
export const OFFICIAL_TEMPLATE: PrintTemplate = {
  id: 'official',
  name: 'EP Group Official',
  nameAr: 'النمط الرسمي لمجموعة EP',
  description: 'Professional official template with EP Group branding',
  descriptionAr: 'النمط الرسمي الاحترافي مع هوية مجموعة EP البصرية',
  category: 'document',
  preview: '', // سيتم إضافة الصورة لاحقاً
  settings: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 15, bottom: 20, left: 15 },
    headerFooter: true,
    watermark: true,
    rtl: true,
    colors: {
      primary: '#2563EB',
      secondary: '#1E40AF',
      accent: '#3B82F6',
      text: '#1F2937',
      background: '#FFFFFF'
    }
  },
  styles: {
    header: `
      .ep-header {
        background: linear-gradient(135deg, #2563EB, #1E40AF);
        color: white;
        padding: 25px;
        text-align: center;
        border-radius: 12px 12px 0 0;
        box-shadow: 0 8px 32px rgba(37, 99, 235, 0.15);
        position: relative;
        overflow: hidden;
      }
      .ep-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDEwVjMwTTEwIDIwSDMwIiBzdHJva2U9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==');
        opacity: 0.1;
        animation: pattern-move 20s linear infinite;
      }
      .ep-header h1 {
        font-size: 32px;
        font-weight: bold;
        margin: 0 0 8px 0;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .ep-header .subtitle {
        font-size: 16px;
        opacity: 0.9;
        font-weight: 300;
      }
      .ep-logo {
        position: absolute;
        left: 25px;
        top: 25px;
        width: 50px;
        height: 50px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
      }
      @keyframes pattern-move {
        0% { transform: translateX(0) translateY(0); }
        100% { transform: translateX(-40px) translateY(-40px); }
      }
    `,
    body: `
      .ep-body {
        padding: 30px 25px;
        font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
        line-height: 1.8;
        color: #1F2937;
        background: #FFFFFF;
      }
      .ep-section {
        margin-bottom: 25px;
        background: #F8FAFC;
        border-left: 4px solid #2563EB;
        padding: 20px;
        border-radius: 0 8px 8px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .ep-section-title {
        color: #2563EB;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ep-section-title::before {
        content: '▶';
        font-size: 14px;
      }
      .ep-info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }
      .ep-info-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: white;
        border-radius: 8px;
        border: 1px solid #E5E7EB;
        transition: all 0.3s ease;
      }
      .ep-info-item:hover {
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        border-color: #2563EB;
      }
      .ep-info-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #EBF4FF, #DBEAFE);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #2563EB;
        font-weight: bold;
      }
      .ep-info-content .label {
        font-size: 12px;
        color: #6B7280;
        font-weight: 500;
        margin-bottom: 2px;
      }
      .ep-info-content .value {
        font-size: 14px;
        color: #1F2937;
        font-weight: 600;
      }
    `,
    footer: `
      .ep-footer {
        background: #1F2937;
        color: #D1D5DB;
        padding: 20px 25px;
        text-align: center;
        border-radius: 0 0 12px 12px;
        position: relative;
        overflow: hidden;
      }
      .ep-footer::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #2563EB, #1E40AF, #3B82F6);
      }
      .ep-footer-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
      }
      .ep-footer-brand {
        font-size: 16px;
        font-weight: 600;
        color: #FFFFFF;
      }
      .ep-footer-info {
        font-size: 12px;
        opacity: 0.8;
      }
      .ep-footer-contact {
        display: flex;
        gap: 20px;
        font-size: 12px;
        flex-wrap: wrap;
      }
      .ep-footer-contact span {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      @media print {
        .ep-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
        }
      }
    `,
    table: `
      .ep-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      }
      .ep-table th {
        background: linear-gradient(135deg, #2563EB, #1E40AF);
        color: white;
        padding: 15px 12px;
        text-align: right;
        font-weight: 600;
        font-size: 14px;
        border-bottom: 2px solid #1E40AF;
        position: relative;
      }
      .ep-table th::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #3B82F6, #2563EB);
      }
      .ep-table td {
        padding: 12px;
        border-bottom: 1px solid #F3F4F6;
        font-size: 13px;
        color: #374151;
        transition: background-color 0.2s ease;
      }
      .ep-table tr:nth-child(even) {
        background: #F9FAFB;
      }
      .ep-table tr:hover {
        background: #EBF4FF;
      }
      .ep-table tr:last-child td {
        border-bottom: none;
      }
      .ep-table .number-cell {
        text-align: center;
        font-weight: 600;
        color: #2563EB;
      }
      .ep-table .status-cell {
        text-align: center;
      }
      .ep-table .amount-cell {
        text-align: left;
        font-weight: 600;
        color: #059669;
        direction: ltr;
      }
    `,
    card: `
      .ep-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin: 15px 0;
        border: 1px solid #E5E7EB;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .ep-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #2563EB, #3B82F6);
      }
      .ep-card:hover {
        box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
        border-color: #2563EB;
      }
      .ep-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 12px;
        border-bottom: 1px solid #F3F4F6;
      }
      .ep-card-title {
        font-size: 18px;
        font-weight: 600;
        color: #1F2937;
        margin: 0;
      }
      .ep-card-badge {
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 20px;
        font-weight: 500;
      }
      .ep-card-content {
        color: #374151;
        line-height: 1.6;
      }
    `,
    badge: `
      .ep-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border: 1px solid transparent;
        transition: all 0.3s ease;
      }
      .ep-badge-success {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      .ep-badge-warning {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: white;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
      }
      .ep-badge-danger {
        background: linear-gradient(135deg, #EF4444, #DC2626);
        color: white;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      }
      .ep-badge-info {
        background: linear-gradient(135deg, #3B82F6, #2563EB);
        color: white;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      }
      .ep-badge-outline {
        background: transparent;
        border: 2px solid #E5E7EB;
        color: #6B7280;
      }
      .ep-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.7;
      }
    `
  }
};

// نمط كلاسيكي أنيق
export const ELEGANT_TEMPLATE: PrintTemplate = {
  id: 'elegant',
  name: 'Elegant Classic',
  nameAr: 'الكلاسيكي الأنيق',
  description: 'Sophisticated classic design with elegant typography',
  descriptionAr: 'تصميم كلاسيكي راقي مع طباعة أنيقة',
  category: 'document',
  preview: '',
  settings: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 25, right: 20, bottom: 25, left: 20 },
    headerFooter: true,
    watermark: false,
    rtl: true,
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#6B7280',
      text: '#111827',
      background: '#FFFEF7'
    }
  },
  styles: {
    header: `
      .elegant-header {
        background: #FFFEF7;
        border-bottom: 3px solid #1F2937;
        padding: 30px 0;
        text-align: center;
        position: relative;
      }
      .elegant-header::after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 100px;
        height: 3px;
        background: linear-gradient(90deg, transparent, #1F2937, transparent);
      }
      .elegant-header h1 {
        font-family: 'Georgia', serif;
        font-size: 36px;
        font-weight: 300;
        color: #1F2937;
        margin: 0 0 10px 0;
        letter-spacing: 2px;
      }
      .elegant-header .subtitle {
        font-size: 16px;
        color: #6B7280;
        font-style: italic;
        font-weight: 300;
      }
      .elegant-ornament {
        width: 80px;
        height: 20px;
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 20"><path d="M0 10h25l5-5 5 5h10l5-5 5 5h25" stroke="%23374151" stroke-width="1" fill="none"/></svg>');
        margin: 15px auto;
      }
    `,
    body: `
      .elegant-body {
        padding: 40px 30px;
        font-family: 'Georgia', serif;
        line-height: 1.9;
        color: #111827;
        background: #FFFEF7;
      }
      .elegant-section {
        margin-bottom: 35px;
        position: relative;
      }
      .elegant-section-title {
        font-size: 24px;
        font-weight: 400;
        color: #1F2937;
        margin-bottom: 20px;
        text-align: center;
        position: relative;
        padding-bottom: 10px;
      }
      .elegant-section-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 1px;
        background: #374151;
      }
      .elegant-paragraph {
        font-size: 15px;
        margin-bottom: 15px;
        text-align: justify;
        text-indent: 20px;
      }
      .elegant-quote {
        border-left: 4px solid #6B7280;
        padding: 20px 25px;
        margin: 25px 0;
        background: #F9FAFB;
        font-style: italic;
        position: relative;
      }
      .elegant-quote::before {
        content: '"';
        font-size: 60px;
        color: #D1D5DB;
        position: absolute;
        top: -10px;
        right: 10px;
        font-family: serif;
      }
    `,
    footer: `
      .elegant-footer {
        border-top: 1px solid #E5E7EB;
        padding: 25px 30px;
        text-align: center;
        background: #FFFEF7;
        font-family: 'Georgia', serif;
      }
      .elegant-footer-ornament {
        width: 100px;
        height: 20px;
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><path d="M10 10h20l10-5 10 5h20l10-5 10 5h20" stroke="%236B7280" stroke-width="1" fill="none"/></svg>');
        margin: 0 auto 15px;
      }
      .elegant-footer-content {
        font-size: 13px;
        color: #6B7280;
        line-height: 1.6;
      }
    `,
    table: `
      .elegant-table {
        width: 100%;
        border-collapse: collapse;
        margin: 25px 0;
        font-family: 'Georgia', serif;
        border: 2px solid #E5E7EB;
      }
      .elegant-table th {
        background: #F9FAFB;
        padding: 15px 12px;
        text-align: right;
        font-weight: 500;
        font-size: 14px;
        border-bottom: 2px solid #E5E7EB;
        color: #374151;
      }
      .elegant-table td {
        padding: 12px;
        border-bottom: 1px solid #F3F4F6;
        font-size: 13px;
        color: #111827;
      }
      .elegant-table tr:nth-child(even) {
        background: #FEFEFE;
      }
    `,
    card: `
      .elegant-card {
        border: 2px solid #E5E7EB;
        padding: 25px;
        margin: 20px 0;
        background: #FFFEF7;
        position: relative;
      }
      .elegant-card::before,
      .elegant-card::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid #6B7280;
      }
      .elegant-card::before {
        top: -2px;
        right: -2px;
        border-bottom: none;
        border-left: none;
      }
      .elegant-card::after {
        bottom: -2px;
        left: -2px;
        border-top: none;
        border-right: none;
      }
    `,
    badge: `
      .elegant-badge {
        display: inline-block;
        padding: 5px 15px;
        border: 1px solid #374151;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #374151;
        background: #FFFEF7;
      }
    `
  }
};

// نمط حديث وبسيط
export const MODERN_MINIMAL_TEMPLATE: PrintTemplate = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  nameAr: 'الحديث البسيط',
  description: 'Clean modern design with minimal elements',
  descriptionAr: 'تصميم حديث نظيف مع عناصر بسيطة',
  category: 'document',
  preview: '',
  settings: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerFooter: true,
    watermark: false,
    rtl: true,
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666',
      text: '#1A1A1A',
      background: '#FFFFFF'
    }
  },
  styles: {
    header: `
      .modern-header {
        background: #FFFFFF;
        border-bottom: 1px solid #000000;
        padding: 20px 0;
        text-align: right;
      }
      .modern-header h1 {
        font-family: 'Helvetica Neue', 'Arial', sans-serif;
        font-size: 32px;
        font-weight: 100;
        color: #000000;
        margin: 0;
        letter-spacing: -1px;
      }
      .modern-header .subtitle {
        font-size: 14px;
        color: #666666;
        font-weight: 300;
        margin-top: 5px;
      }
    `,
    body: `
      .modern-body {
        padding: 30px 0;
        font-family: 'Helvetica Neue', 'Arial', sans-serif;
        line-height: 1.6;
        color: #1A1A1A;
        background: #FFFFFF;
      }
      .modern-section {
        margin-bottom: 30px;
      }
      .modern-section-title {
        font-size: 18px;
        font-weight: 300;
        color: #000000;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .modern-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin: 20px 0;
      }
    `,
    footer: `
      .modern-footer {
        border-top: 1px solid #000000;
        padding: 20px 0;
        text-align: center;
        background: #FFFFFF;
        font-family: 'Helvetica Neue', 'Arial', sans-serif;
        font-size: 12px;
        color: #666666;
        font-weight: 300;
      }
    `,
    table: `
      .modern-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        border: 1px solid #000000;
      }
      .modern-table th {
        background: #000000;
        color: #FFFFFF;
        padding: 12px 10px;
        text-align: right;
        font-weight: 300;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .modern-table td {
        padding: 10px;
        border-bottom: 1px solid #E5E5E5;
        font-size: 12px;
        color: #1A1A1A;
      }
    `,
    card: `
      .modern-card {
        border: 1px solid #E5E5E5;
        padding: 20px;
        margin: 15px 0;
        background: #FFFFFF;
      }
    `,
    badge: `
      .modern-badge {
        display: inline-block;
        padding: 3px 8px;
        border: 1px solid #000000;
        font-size: 10px;
        font-weight: 300;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000000;
        background: #FFFFFF;
      }
    `
  }
};

// قائمة جميع القوالب المتاحة
export const PRINT_TEMPLATES: PrintTemplate[] = [
  OFFICIAL_TEMPLATE,
  ELEGANT_TEMPLATE,
  MODERN_MINIMAL_TEMPLATE
];

// الحصول على قالب بواسطة المعرف
export const getTemplateById = (id: string): PrintTemplate | undefined => {
  return PRINT_TEMPLATES.find(template => template.id === id);
};

// الحصول على القوالب حسب الفئة
export const getTemplatesByCategory = (category: PrintTemplate['category']): PrintTemplate[] => {
  return PRINT_TEMPLATES.filter(template => template.category === category);
};

// إعدادات الطباعة العامة
export interface PrintSettings {
  template: string;
  customStyles?: string;
  includeTimestamp: boolean;
  includeWatermark: boolean;
  includePageNumbers: boolean;
  customHeader?: string;
  customFooter?: string;
  logoUrl?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

// الإعدادات الافتراضية
export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  template: 'official',
  includeTimestamp: true,
  includeWatermark: true,
  includePageNumbers: true,
  companyInfo: {
    name: 'EP Group System',
    address: '',
    phone: '',
    email: '',
    website: 'www.epgroup.com'
  }
};

// دالة توليد الأنماط المخصصة
export const generateCustomStyles = (template: PrintTemplate, settings: PrintSettings): string => {
  const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Cairo', 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
      direction: ${template.settings.rtl ? 'rtl' : 'ltr'};
      background: ${template.settings.colors.background};
      color: ${template.settings.colors.text};
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    
    .print-container {
      max-width: 100%;
      margin: 0 auto;
      background: ${template.settings.colors.background};
      min-height: 100vh;
      position: relative;
    }
    
    ${template.settings.watermark && settings.includeWatermark ? `
      .print-container::before {
        content: '${settings.companyInfo?.name || 'EP Group'}';
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80px;
        color: rgba(37, 99, 235, 0.05);
        font-weight: bold;
        z-index: 0;
        pointer-events: none;
      }
    ` : ''}
    
    .print-content {
      position: relative;
      z-index: 1;
    }
    
    ${template.styles.header}
    ${template.styles.body}
    ${template.styles.footer}
    ${template.styles.table}
    ${template.styles.card}
    ${template.styles.badge}
    
    ${settings.includePageNumbers ? `
      @media print {
        .page-number {
          position: fixed;
          bottom: 10mm;
          right: 10mm;
          font-size: 10px;
          color: #666666;
        }
        .page-number::after {
          content: counter(page);
        }
      }
    ` : ''}
    
    @media print {
      body {
        margin: 0;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .print-container {
        margin: 0;
        box-shadow: none;
        border: none;
        background: white !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .avoid-break {
        page-break-inside: avoid;
      }
      
      @page {
        size: ${template.settings.pageSize};
        margin: ${template.settings.margins.top}mm ${template.settings.margins.right}mm ${template.settings.margins.bottom}mm ${template.settings.margins.left}mm;
      }
    }
    
    ${settings.customStyles || ''}
  `;
  
  return baseStyles;
};