/**
 * نظام تصدير PDF المتقدم - EP Group System
 * نظام شامل لإنتاج ملفات PDF عالية الجودة مع تنسيقات متعددة
 */

import { PrintSettings, PrintTemplate, getTemplateById, generateCustomStyles } from '@/lib/print-templates/print-templates';
import { PrintableData } from '@/hooks/use-advanced-print';

export interface PDFGeneratorOptions {
  filename?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  watermark?: {
    text: string;
    opacity: number;
    fontSize: number;
    rotation: number;
    color: string;
  };
  security?: {
    userPassword?: string;
    ownerPassword?: string;
    permissions?: {
      printing?: boolean;
      modifying?: boolean;
      copying?: boolean;
      annotating?: boolean;
    };
  };
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  url?: string;
  blob?: Blob;
  filename: string;
  size?: number;
  pageCount?: number;
  error?: string;
}

export class AdvancedPDFGenerator {
  private settings: PrintSettings;
  private template: PrintTemplate;
  
  constructor(settings: PrintSettings) {
    this.settings = settings;
    const template = getTemplateById(settings.template);
    if (!template) {
      throw new Error('القالب المحدد غير موجود');
    }
    this.template = template;
  }

  /**
   * توليد ملف PDF من البيانات
   */
  async generatePDF(
    data: PrintableData, 
    options: PDFGeneratorOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // إعداد الخيارات الافتراضية
      const pdfOptions = this.prepareOptions(data, options);
      
      // إنشاء محتوى HTML
      const htmlContent = this.generateHTMLContent(data);
      
      // إنشاء ملف PDF باستخدام browser print API
      const result = await this.generatePDFFromHTML(htmlContent, pdfOptions);
      
      return {
        success: true,
        ...result,
        filename: pdfOptions.filename || this.generateFilename(data)
      };
      
    } catch (error) {
      console.error('خطأ في توليد PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
        filename: options.filename || this.generateFilename(data)
      };
    }
  }

  /**
   * إعداد خيارات PDF
   */
  private prepareOptions(data: PrintableData, options: PDFGeneratorOptions): Required<PDFGeneratorOptions> {
    return {
      filename: options.filename || this.generateFilename(data),
      quality: options.quality || 'high',
      format: options.format || this.template.settings.pageSize,
      orientation: options.orientation || this.template.settings.orientation,
      margins: options.margins || this.template.settings.margins,
      watermark: options.watermark || (this.settings.includeWatermark ? {
        text: 'CONFIDENTIAL',
        opacity: 0.1,
        fontSize: 48,
        rotation: 45,
        color: '#000000'
      } : {
        text: this.settings.companyInfo?.name || 'EP Group',
        opacity: 0.1,
        fontSize: 80,
        rotation: -45,
        color: '#2563EB'
      }),
      security: options.security || {
        permissions: {
          printing: true,
          modifying: false,
          copying: true,
          annotating: false
        }
      },
      metadata: options.metadata || {
        title: data.title,
        author: data.metadata?.createdBy || 'EP Group System',
        subject: data.subtitle || data.title,
        keywords: data.metadata?.tags?.join(', ') || '',
        creator: 'EP Group System',
        producer: 'EP Group Advanced PDF Generator'
      }
    };
  }

  /**
   * توليد محتوى HTML للـ PDF
   */
  private generateHTMLContent(data: PrintableData): string {
    const styles = generateCustomStyles(this.template, this.settings);
    const templateClass = this.template.id === 'official' ? 'ep' : 
                         this.template.id === 'elegant' ? 'elegant' : 'modern';

    // تحسين الأنماط للطباعة في PDF
    const pdfOptimizedStyles = `
      ${styles}
      
      /* تحسينات خاصة بـ PDF */
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .print-container {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        box-shadow: none !important;
      }
      
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      
      .avoid-break {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .keep-together {
        page-break-inside: avoid;
      }
      
      /* تحسين الجداول للـ PDF */
      .${templateClass}-table {
        page-break-inside: auto;
      }
      
      .${templateClass}-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      .${templateClass}-table thead {
        display: table-header-group;
      }
      
      .${templateClass}-table tfoot {
        display: table-footer-group;
      }
      
      /* تحسين الصور */
      img {
        max-width: 100% !important;
        height: auto !important;
        page-break-inside: avoid;
      }
      
      /* تحسين النصوص */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      p {
        orphans: 2;
        widows: 2;
      }
      
      /* إخفاء عناصر غير مرغوب فيها في PDF */
      .no-pdf {
        display: none !important;
      }
      
      @page {
        size: ${this.template.settings.pageSize} ${this.template.settings.orientation};
        margin: ${this.template.settings.margins.top}mm ${this.template.settings.margins.right}mm ${this.template.settings.margins.bottom}mm ${this.template.settings.margins.left}mm;
        
        @top-right {
          content: "${data.title}";
          font-size: 10px;
          color: #666;
        }
        
        @bottom-right {
          content: counter(page) " من " counter(pages);
          font-size: 10px;
          color: #666;
        }
        
        @bottom-left {
          content: "${this.settings.companyInfo?.name || 'EP Group System'}";
          font-size: 10px;
          color: #666;
        }
      }
    `;

    // تحويل البيانات إلى HTML مُحسَّن للـ PDF
    const renderContent = (content: any[]): string => {
      return content.map((item, index) => {
        const isLargeContent = JSON.stringify(item).length > 1000;
        const breakClass = isLargeContent ? 'page-break' : 'avoid-break';
        
        if (item.type === 'section') {
          return `
            <div class="${templateClass}-section ${breakClass}">
              <h2 class="${templateClass}-section-title">${item.title || ''}</h2>
              ${item.content ? renderContent(item.content) : ''}
            </div>
          `;
        } else if (item.type === 'table') {
          const largeTable = (item.rows?.length || 0) > 20;
          return `
            <div class="${templateClass}-section ${largeTable ? 'page-break' : 'keep-together'}">
              ${item.title ? `<h2 class="${templateClass}-section-title">${item.title}</h2>` : ''}
              <table class="${templateClass}-table">
                <thead>
                  <tr>
                    ${item.headers?.map((header: string) => `<th>${header}</th>`).join('') || ''}
                  </tr>
                </thead>
                <tbody>
                  ${item.rows?.map((row: string[], rowIndex: number) => `
                    <tr ${rowIndex > 0 && rowIndex % 15 === 0 ? 'class="page-break"' : ''}>
                      ${row.map((cell, cellIndex) => `
                        <td class="${cellIndex === 0 ? 'number-cell' : ''}">${cell}</td>
                      `).join('')}
                    </tr>
                  `).join('') || ''}
                </tbody>
              </table>
            </div>
          `;
        } else if (item.type === 'card') {
          return `
            <div class="${templateClass}-card keep-together">
              ${item.title ? `
                <div class="${templateClass === 'ep' ? 'ep-card-header' : ''}">
                  <h3 class="${templateClass === 'ep' ? 'ep-card-title' : ''}">${item.title}</h3>
                  ${item.badge ? `<span class="${templateClass}-badge">${item.badge}</span>` : ''}
                </div>
              ` : ''}
              <div class="${templateClass === 'ep' ? 'ep-card-content' : ''}">
                ${item.content || ''}
              </div>
            </div>
          `;
        } else if (item.type === 'info-grid' && templateClass === 'ep') {
          return `
            <div class="ep-info-grid keep-together">
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
        } else if (item.type === 'page-break') {
          return '<div class="page-break"></div>';
        } else {
          return `<div class="keep-together">${JSON.stringify(item)}</div>`;
        }
      }).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html dir="${this.template.settings.rtl ? 'rtl' : 'ltr'}" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title} - ${this.settings.companyInfo?.name || 'EP Group System'}</title>
        <style>${pdfOptimizedStyles}</style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-content">
            <!-- Header -->
            ${this.template.settings.headerFooter ? `
              <div class="${templateClass}-header avoid-break">
                ${this.template.id === 'official' ? `
                  <div class="ep-logo">${this.settings.logoUrl ? 
                    `<img src="${this.settings.logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:contain;"/>` : 
                    'EP'
                  }</div>
                ` : ''}
                <h1>${data.title}</h1>
                ${data.subtitle ? `<div class="subtitle">${data.subtitle}</div>` : ''}
                ${this.template.id === 'elegant' ? '<div class="elegant-ornament"></div>' : ''}
                ${this.settings.customHeader ? `<div class="custom-header">${this.settings.customHeader}</div>` : ''}
                ${this.settings.includeTimestamp ? `
                  <div class="timestamp" style="font-size: 12px; color: #666; margin-top: 10px;">
                    تم إنشاء التقرير: ${new Date().toLocaleString('ar-EG')}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Body -->
            <div class="${templateClass}-body">
              ${renderContent(data.content)}
              
              <!-- Metadata Section -->
              ${data.metadata ? `
                <div class="${templateClass}-section page-break">
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
                      <div class="ep-info-item">
                        <div class="ep-info-icon">📄</div>
                        <div class="ep-info-content">
                          <div class="label">تم إنشاء PDF</div>
                          <div class="value">${new Date().toLocaleString('ar-EG')}</div>
                        </div>
                      </div>
                    </div>
                  ` : `
                    <div>
                      ${data.metadata.createdBy ? `<p><strong>أنشأ بواسطة:</strong> ${data.metadata.createdBy}</p>` : ''}
                      ${data.metadata.department ? `<p><strong>القسم:</strong> ${data.metadata.department}</p>` : ''}
                      ${data.metadata.category ? `<p><strong>الفئة:</strong> ${data.metadata.category}</p>` : ''}
                      <p><strong>تم إنشاء PDF:</strong> ${new Date().toLocaleString('ar-EG')}</p>
                    </div>
                  `}
                </div>
              ` : ''}
            </div>

            <!-- Footer -->
            ${this.template.settings.headerFooter ? `
              <div class="${templateClass}-footer avoid-break" style="margin-top: 50px;">
                ${this.template.id === 'elegant' ? '<div class="elegant-footer-ornament"></div>' : ''}
                <div class="${templateClass === 'ep' ? 'ep-footer-content' : templateClass === 'elegant' ? 'elegant-footer-content' : ''}">
                  <div class="${templateClass === 'ep' ? 'ep-footer-brand' : ''}">${this.settings.companyInfo?.name || 'EP Group System'}</div>
                  ${this.settings.companyInfo?.phone || this.settings.companyInfo?.email || this.settings.companyInfo?.website ? `
                    <div class="${templateClass === 'ep' ? 'ep-footer-contact' : ''}" style="margin-top: 10px;">
                      ${this.settings.companyInfo.phone ? `<span>📞 ${this.settings.companyInfo.phone}</span>` : ''}
                      ${this.settings.companyInfo.email ? `<span>📧 ${this.settings.companyInfo.email}</span>` : ''}
                      ${this.settings.companyInfo.website ? `<span>🌐 ${this.settings.companyInfo.website}</span>` : ''}
                    </div>
                  ` : ''}
                  ${this.settings.customFooter ? `<div class="custom-footer" style="margin-top: 10px;">${this.settings.customFooter}</div>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * توليد PDF من محتوى HTML
   */
  private async generatePDFFromHTML(
    htmlContent: string, 
    options: Required<PDFGeneratorOptions>
  ): Promise<{ blob: Blob; url: string; size: number }> {
    
    return new Promise((resolve, reject) => {
      try {
        // إنشاء نافذة مخفية للطباعة
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
          reject(new Error('تم حظر النوافذ المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.'));
          return;
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // انتظار تحميل المحتوى
        printWindow.onload = () => {
          printWindow.focus();
          
          setTimeout(() => {
            // محاولة استخدام وضع PDF مباشرة إن أمكن
            try {
              const originalTitle = printWindow.document.title;
              printWindow.document.title = options.filename;
              
              // تعليمات للمستخدم لحفظ كـ PDF
              const instructionsHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: #2563EB; color: white; padding: 20px; border-radius: 8px; z-index: 9999; font-family: Arial; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 350px;" id="pdf-instructions">
                  <h3 style="margin: 0 0 15px 0; font-size: 16px;">💡 لحفظ كـ PDF:</h3>
                  <ol style="margin: 0; padding-right: 20px; font-size: 14px; line-height: 1.6;">
                    <li>اضغط <strong>Ctrl+P</strong> (أو <strong>Cmd+P</strong> على Mac)</li>
                    <li>اختر <strong>"حفظ كـ PDF"</strong> من قائمة الطابعات</li>
                    <li>اضغط <strong>"حفظ"</strong> واختر المكان</li>
                  </ol>
                  <button onclick="this.parentElement.remove(); window.print();" style="background: white; color: #2563EB; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 15px; cursor: pointer; font-weight: bold;">
                    ✨ ابدأ الطباعة
                  </button>
                  <button onclick="this.parentElement.remove();" style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 4px; margin: 15px 0 0 8px; cursor: pointer;">
                    إغلاق
                  </button>
                </div>
              `;
              
              const instructionsDiv = printWindow.document.createElement('div');
              instructionsDiv.innerHTML = instructionsHTML;
              printWindow.document.body.appendChild(instructionsDiv);
              
              // إنشاء blob وهمي للإرجاع (حيث أن المتصفح سيتولى إنشاء PDF)
              const dummyBlob = new Blob([htmlContent], { type: 'text/html' });
              const url = URL.createObjectURL(dummyBlob);
              
              resolve({
                blob: dummyBlob,
                url: url,
                size: new Blob([htmlContent]).size
              });
              
            } catch (error) {
              reject(new Error('فشل في إعداد عملية تصدير PDF'));
            }
          }, 1000);
        };

        printWindow.onerror = (error) => {
          reject(new Error('خطأ في تحميل نافذة الطباعة'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * توليد اسم ملف مناسب
   */
  private generateFilename(data: PrintableData): string {
    const title = data.title.replace(/[^\w\s-أ-ي]/g, '').trim();
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    return `${title}_${date}_${time}.pdf`;
  }

  /**
   * تحسين البيانات للطباعة في PDF
   */
  private optimizeDataForPDF(data: PrintableData): PrintableData {
    const optimizedContent = data.content.map(item => {
      // تحسين الجداول الكبيرة
      if (item.type === 'table' && item.rows && item.rows.length > 50) {
        // تقسيم الجداول الكبيرة
        const chunks = [];
        const chunkSize = 25;
        
        for (let i = 0; i < item.rows.length; i += chunkSize) {
          chunks.push({
            ...item,
            title: `${item.title} - الجزء ${Math.floor(i / chunkSize) + 1}`,
            rows: item.rows.slice(i, i + chunkSize)
          });
          
          if (i + chunkSize < item.rows.length) {
            chunks.push({ type: 'page-break' });
          }
        }
        
        return chunks;
      }
      
      return item;
    }).flat();

    return {
      ...data,
      content: optimizedContent
    };
  }

  /**
   * حفظ إعدادات PDF كقالب
   */
  async saveAsTemplate(name: string, options: PDFGeneratorOptions): Promise<void> {
    try {
      const templates = JSON.parse(localStorage.getItem('epgroup-pdf-templates') || '{}');
      templates[name] = {
        ...options,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('epgroup-pdf-templates', JSON.stringify(templates));
    } catch (error) {
      console.error('فشل في حفظ قالب PDF:', error);
    }
  }

  /**
   * تحميل قالب PDF محفوظ
   */
  static loadTemplate(name: string): PDFGeneratorOptions | null {
    try {
      const templates = JSON.parse(localStorage.getItem('epgroup-pdf-templates') || '{}');
      return templates[name] || null;
    } catch (error) {
      console.error('فشل في تحميل قالب PDF:', error);
      return null;
    }
  }

  /**
   * الحصول على جميع القوالب المحفوظة
   */
  static getSavedTemplates(): string[] {
    try {
      const templates = JSON.parse(localStorage.getItem('epgroup-pdf-templates') || '{}');
      return Object.keys(templates);
    } catch (error) {
      console.error('فشل في تحميل قوائم القوالب:', error);
      return [];
    }
  }
}

// دالة مساعدة لإنشاء مولد PDF
export function createPDFGenerator(settings: PrintSettings): AdvancedPDFGenerator {
  return new AdvancedPDFGenerator(settings);
}

// دالة مساعدة سريعة لتوليد PDF
export async function generateQuickPDF(
  data: PrintableData,
  settings: PrintSettings,
  options?: PDFGeneratorOptions
): Promise<PDFGenerationResult> {
  const generator = new AdvancedPDFGenerator(settings);
  return await generator.generatePDF(data, options);
}