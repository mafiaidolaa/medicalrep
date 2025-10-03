"use client";

import { useState, useCallback, useEffect } from 'react';
import { PrintSettings, DEFAULT_PRINT_SETTINGS, generateCustomStyles, getTemplateById } from '@/lib/print-templates/print-templates';

export interface PrintableData {
  title: string;
  subtitle?: string;
  content: any[];
  metadata?: {
    createdBy?: string;
    createdAt?: Date;
    department?: string;
    category?: string;
    tags?: string[];
  };
  customData?: Record<string, any>;
}

export interface UseAdvancedPrintOptions {
  defaultSettings?: PrintSettings;
  storageKey?: string;
  onPrintStart?: () => void;
  onPrintSuccess?: () => void;
  onPrintError?: (error: Error) => void;
}

export function useAdvancedPrint(options: UseAdvancedPrintOptions = {}) {
  const {
    defaultSettings = DEFAULT_PRINT_SETTINGS,
    storageKey = 'epgroup-print-settings',
    onPrintStart,
    onPrintSuccess,
    onPrintError
  } = options;

  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrintedData, setLastPrintedData] = useState<PrintableData | null>(null);

  // تحميل الإعدادات المحفوظة
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          setSettings({ ...defaultSettings, ...parsedSettings });
        }
      }
    } catch (error) {
      console.warn('فشل في تحميل إعدادات الطباعة:', error);
    }
  }, [storageKey, defaultSettings]);

  // حفظ الإعدادات
  const saveSettings = useCallback((newSettings: PrintSettings) => {
    try {
      setSettings(newSettings);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('فشل في حفظ إعدادات الطباعة:', error);
    }
  }, [storageKey]);

  // إنشاء محتوى HTML للطباعة
  const generatePrintHTML = useCallback((data: PrintableData, customSettings?: PrintSettings): string => {
    const currentSettings = customSettings || settings;
    const template = getTemplateById(currentSettings.template);
    
    if (!template) {
      throw new Error('القالب المحدد غير موجود');
    }

    const styles = generateCustomStyles(template, currentSettings);
    const templateClass = template.id === 'official' ? 'ep' : 
                         template.id === 'elegant' ? 'elegant' : 'modern';

    // تحويل البيانات إلى HTML
    const renderContent = (content: any[]): string => {
      return content.map(item => {
        if (item.type === 'section') {
          return `
            <div class="${templateClass}-section">
              <h2 class="${templateClass}-section-title">${item.title || ''}</h2>
              ${item.content ? renderContent(item.content) : ''}
            </div>
          `;
        } else if (item.type === 'table') {
          return `
            <div class="${templateClass}-section">
              ${item.title ? `<h2 class="${templateClass}-section-title">${item.title}</h2>` : ''}
              <table class="${templateClass}-table">
                <thead>
                  <tr>
                    ${item.headers?.map((header: string) => `<th>${header}</th>`).join('') || ''}
                  </tr>
                </thead>
                <tbody>
                  ${item.rows?.map((row: string[]) => `
                    <tr>
                      ${row.map((cell, index) => `<td class="${index === 0 ? 'number-cell' : ''}">${cell}</td>`).join('')}
                    </tr>
                  `).join('') || ''}
                </tbody>
              </table>
            </div>
          `;
        } else if (item.type === 'card') {
          return `
            <div class="${templateClass}-card">
              ${item.title ? `
                <div class="${templateClass === 'ep' ? 'ep-card-header' : ''}">
                  <h3 class="${templateClass === 'ep' ? 'ep-card-title' : ''}">${item.title}</h3>
                  ${item.badge ? `<span class="${templateClass}-badge ${templateClass === 'ep' ? 'ep-badge-info' : templateClass === 'elegant' ? 'elegant-badge' : 'modern-badge'}">${item.badge}</span>` : ''}
                </div>
              ` : ''}
              <div class="${templateClass === 'ep' ? 'ep-card-content' : ''}">
                ${item.content || ''}
              </div>
            </div>
          `;
        } else if (item.type === 'info-grid' && templateClass === 'ep') {
          return `
            <div class="ep-info-grid">
              ${item.items?.map((gridItem: any) => `
                <div class="ep-info-item">
                  <div class="ep-info-icon">${gridItem.icon || '📊'}</div>
                  <div class="ep-info-content">
                    <div class="label">${gridItem.label}</div>
                    <div class="value">${gridItem.value}</div>
                  </div>
                </div>
              `).join('') || ''}
            </div>
          `;
        } else if (item.type === 'text') {
          return `<p class="${templateClass === 'elegant' ? 'elegant-paragraph' : ''}">${item.content}</p>`;
        } else {
          // عامل افتراضي للبيانات البسيطة
          return `<div>${JSON.stringify(item)}</div>`;
        }
      }).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html dir="${template.settings.rtl ? 'rtl' : 'ltr'}" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title} - ${currentSettings.companyInfo?.name || 'EP Group System'}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-content">
            <!-- Header -->
            ${template.settings.headerFooter ? `
              <div class="${templateClass}-header">
                ${template.id === 'official' ? `
                  <div class="ep-logo">${currentSettings.logoUrl ? `<img src="${currentSettings.logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:contain;"/>` : 'EP'}</div>
                ` : ''}
                <h1>${data.title}</h1>
                ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ''}
                ${template.id === 'elegant' ? '<div class="elegant-ornament"></div>' : ''}
                ${currentSettings.customHeader ? `<div class="custom-header">${currentSettings.customHeader}</div>` : ''}
              </div>
            ` : ''}

            <!-- Body -->
            <div class="${templateClass}-body">
              ${renderContent(data.content)}
              
              <!-- Metadata Section -->
              ${data.metadata ? `
                <div class="${templateClass}-section">
                  <h2 class="${templateClass}-section-title">معلومات التقرير</h2>
                  ${templateClass === 'ep' ? `
                    <div class="ep-info-grid">
                      ${data.metadata.createdBy ? `
                        <div class="ep-info-item">
                          <div class="ep-info-icon">👤</div>
                          <div class="ep-info-content">
                            <div class="label">أنشأ بواسطة</div>
                            <div class="value">${data.metadata.createdBy}</div>
                          </div>
                        </div>
                      ` : ''}
                      ${data.metadata.department ? `
                        <div class="ep-info-item">
                          <div class="ep-info-icon">🏢</div>
                          <div class="ep-info-content">
                            <div class="label">القسم</div>
                            <div class="value">${data.metadata.department}</div>
                          </div>
                        </div>
                      ` : ''}
                      ${data.metadata.category ? `
                        <div class="ep-info-item">
                          <div class="ep-info-icon">📂</div>
                          <div class="ep-info-content">
                            <div class="label">الفئة</div>
                            <div class="value">${data.metadata.category}</div>
                          </div>
                        </div>
                      ` : ''}
                      ${currentSettings.includeTimestamp ? `
                        <div class="ep-info-item">
                          <div class="ep-info-icon">⏰</div>
                          <div class="ep-info-content">
                            <div class="label">تاريخ الطباعة</div>
                            <div class="value">${new Date().toLocaleString('ar-EG')}</div>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  ` : `
                    <div>
                      ${data.metadata.createdBy ? `<p><strong>أنشأ بواسطة:</strong> ${data.metadata.createdBy}</p>` : ''}
                      ${data.metadata.department ? `<p><strong>القسم:</strong> ${data.metadata.department}</p>` : ''}
                      ${data.metadata.category ? `<p><strong>الفئة:</strong> ${data.metadata.category}</p>` : ''}
                      ${currentSettings.includeTimestamp ? `<p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleString('ar-EG')}</p>` : ''}
                    </div>
                  `}
                </div>
              ` : ''}
            </div>

            <!-- Footer -->
            ${template.settings.headerFooter ? `
              <div class="${templateClass}-footer">
                ${template.id === 'elegant' ? '<div class="elegant-footer-ornament"></div>' : ''}
                <div class="${templateClass === 'ep' ? 'ep-footer-content' : templateClass === 'elegant' ? 'elegant-footer-content' : ''}">
                  <div class="${templateClass === 'ep' ? 'ep-footer-brand' : ''}">${currentSettings.companyInfo?.name || 'EP Group System'}</div>
                  ${currentSettings.includeTimestamp ? `<div class="${templateClass === 'ep' ? 'ep-footer-info' : ''}">تم إنشاء التقرير: ${new Date().toLocaleString('ar-EG')}</div>` : ''}
                  ${currentSettings.companyInfo?.phone || currentSettings.companyInfo?.email || currentSettings.companyInfo?.website ? `
                    <div class="${templateClass === 'ep' ? 'ep-footer-contact' : ''}">
                      ${currentSettings.companyInfo.phone ? `<span>📞 ${currentSettings.companyInfo.phone}</span>` : ''}
                      ${currentSettings.companyInfo.email ? `<span>📧 ${currentSettings.companyInfo.email}</span>` : ''}
                      ${currentSettings.companyInfo.website ? `<span>🌐 ${currentSettings.companyInfo.website}</span>` : ''}
                    </div>
                  ` : ''}
                  ${currentSettings.customFooter ? `<div class="custom-footer">${currentSettings.customFooter}</div>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          ${currentSettings.includePageNumbers ? '<div class="page-number"></div>' : ''}
        </div>
      </body>
      </html>
    `;

    return html;
  }, [settings]);

  // طباعة مباشرة
  const print = useCallback(async (data: PrintableData, customSettings?: PrintSettings) => {
    try {
      setIsLoading(true);
      onPrintStart?.();

      const html = generatePrintHTML(data, customSettings);
      
      // إنشاء نافذة جديدة للطباعة
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        throw new Error('تم حظر النوافذ المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      }

      printWindow.document.write(html);
      printWindow.document.close();
      
      // انتظار تحميل المحتوى ثم الطباعة
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setLastPrintedData(data);
          onPrintSuccess?.();
        }, 500);
      };

    } catch (error) {
      console.error('خطأ في الطباعة:', error);
      onPrintError?.(error instanceof Error ? error : new Error('خطأ غير معروف في الطباعة'));
    } finally {
      setIsLoading(false);
    }
  }, [generatePrintHTML, onPrintStart, onPrintSuccess, onPrintError]);

  // معاينة في نافذة جديدة
  const preview = useCallback((data: PrintableData, customSettings?: PrintSettings) => {
    try {
      const html = generatePrintHTML(data, customSettings);
      const previewWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');
      
      if (!previewWindow) {
        throw new Error('تم حظر النوافذ المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      }

      previewWindow.document.write(html);
      previewWindow.document.close();
      previewWindow.focus();
      
    } catch (error) {
      console.error('خطأ في المعاينة:', error);
      onPrintError?.(error instanceof Error ? error : new Error('خطأ غير معروف في المعاينة'));
    }
  }, [generatePrintHTML, onPrintError]);

  // تصدير PDF (باستخدام print to PDF في المتصفح)
  const exportToPDF = useCallback(async (data: PrintableData, customSettings?: PrintSettings) => {
    try {
      setIsLoading(true);
      const html = generatePrintHTML(data, customSettings);
      
      const pdfWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!pdfWindow) {
        throw new Error('تم حظر النوافذ المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      }

      pdfWindow.document.write(html);
      pdfWindow.document.close();
      
      pdfWindow.onload = () => {
        pdfWindow.focus();
        setTimeout(() => {
          // تعليمات للمستخدم
          alert('لحفظ الملف كـ PDF:\n1. اضغط Ctrl+P (أو Cmd+P على Mac)\n2. اختر "حفظ كـ PDF" من قائمة الطابعات\n3. اضغط "حفظ"');
          pdfWindow.print();
        }, 500);
      };
      
      setLastPrintedData(data);
      
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      onPrintError?.(error instanceof Error ? error : new Error('خطأ غير معروف في تصدير PDF'));
    } finally {
      setIsLoading(false);
    }
  }, [generatePrintHTML, onPrintError]);

  // إعادة طباعة آخر بيانات
  const reprintLast = useCallback(() => {
    if (lastPrintedData) {
      print(lastPrintedData);
    } else {
      console.warn('لا توجد بيانات سابقة للطباعة');
    }
  }, [lastPrintedData, print]);

  // تنظيف البيانات المطبوعة الأخيرة
  const clearLastPrinted = useCallback(() => {
    setLastPrintedData(null);
  }, []);

  // إعادة تعيين الإعدادات للقيم الافتراضية
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('فشل في حذف الإعدادات المحفوظة:', error);
    }
  }, [defaultSettings, storageKey]);

  return {
    // الحالة
    settings,
    isLoading,
    lastPrintedData,
    
    // الوظائف الأساسية
    print,
    preview,
    exportToPDF,
    generatePrintHTML,
    
    // إدارة الإعدادات
    saveSettings,
    resetSettings,
    
    // وظائف إضافية
    reprintLast,
    clearLastPrinted,
  };
}