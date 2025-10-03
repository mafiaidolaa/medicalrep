/**
 * 🏢 EP Group System - Professional Expense Printing & Documentation Service
 * خدمة الطباعة والتوثيق الاحترافية للنفقات
 * 
 * يوفر هذا المديول نظاماً متكاملاً للطباعة والتوثيق يشمل:
 * - قوالب طباعة احترافية وإبداعية
 * - إنتاج ملفات PDF عالية الجودة
 * - التوثيق الرقمي والتحقق
 * - رموز QR للتحقق السريع
 * - تصميمات متجاوبة للطباعة
 * - العلامات المائية والأمان
 */

import { ExpenseRequest, ExpenseApproval } from './expense-management-service';
import { getCompanyInfo, getPrintingSettings } from '../site-settings';

// ===== أنواع البيانات للطباعة =====
export interface PrintableExpenseRequest extends ExpenseRequest {
  company_info: CompanyInfo;
  approval_chain: ExpenseApproval[];
  print_settings: PrintSettings;
  verification_data: VerificationData;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_path: string;
  site_title: string;
}

export interface PrintSettings {
  enable_watermark: boolean;
  default_template: string;
  include_qr_code: boolean;
  auto_generate_pdf: boolean;
  paper_size: 'A4' | 'Letter' | 'A5';
  orientation: 'portrait' | 'landscape';
  language: 'ar' | 'en' | 'both';
  color_mode: 'color' | 'grayscale' | 'monochrome';
}

export interface VerificationData {
  qr_code: string;
  verification_hash: string;
  digital_signature: string;
  print_timestamp: string;
  document_id: string;
}

export type PrintTemplate = 
  | 'professional' 
  | 'executive' 
  | 'medical' 
  | 'financial' 
  | 'minimal' 
  | 'detailed';

// ===== كلاس خدمة الطباعة الرئيسي =====
export class ExpensePrintingService {
  private static instance: ExpensePrintingService;

  private constructor() {}

  public static getInstance(): ExpensePrintingService {
    if (!ExpensePrintingService.instance) {
      ExpensePrintingService.instance = new ExpensePrintingService();
    }
    return ExpensePrintingService.instance;
  }

  /**
   * إنشاء مستند طباعة احترافي
   */
  async generatePrintableDocument(
    expenseRequest: ExpenseRequest,
    template: PrintTemplate = 'professional',
    options?: {
      includeApprovals?: boolean;
      includeAttachments?: boolean;
      watermark?: boolean;
      qrCode?: boolean;
    }
  ): Promise<PrintableExpenseRequest> {
    try {
      // الحصول على البيانات المطلوبة
      const [companyInfo, printSettings] = await Promise.all([
        getCompanyInfo(),
        getPrintingSettings()
      ]);

      // إنشاء بيانات التحقق
      const verificationData = this.generateVerificationData(expenseRequest);

      // تجميع البيانات للطباعة
      const printableRequest: PrintableExpenseRequest = {
        ...expenseRequest,
        company_info: companyInfo,
        approval_chain: expenseRequest.approvals || [],
        print_settings: {
          ...printSettings,
          default_template: template,
          enable_watermark: options?.watermark ?? printSettings.enable_watermark,
          include_qr_code: options?.qrCode ?? printSettings.include_qr_code
        },
        verification_data: verificationData
      };

      console.log('✅ Printable document generated successfully');
      return printableRequest;
    } catch (error) {
      console.error('❌ Error generating printable document:', error);
      throw error;
    }
  }

  /**
   * إنتاج HTML للطباعة حسب القالب المحدد
   */
  async generatePrintHTML(
    printableRequest: PrintableExpenseRequest,
    template: PrintTemplate = 'professional'
  ): Promise<string> {
    const baseStyles = this.getBaseStyles();
    const templateStyles = this.getTemplateStyles(template);
    const templateHTML = this.getTemplateHTML(printableRequest, template);

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>طلب نفقة - ${printableRequest.request_number}</title>
        <style>
          ${baseStyles}
          ${templateStyles}
        </style>
      </head>
      <body>
        ${templateHTML}
      </body>
      </html>
    `;
  }

  /**
   * إنشاء ملف PDF
   */
  async generatePDF(
    expenseRequest: ExpenseRequest,
    template: PrintTemplate = 'professional',
    options?: {
      filename?: string;
      includeApprovals?: boolean;
      watermark?: boolean;
      qrCode?: boolean;
    }
  ): Promise<Blob> {
    try {
      const printableRequest = await this.generatePrintableDocument(
        expenseRequest,
        template,
        options
      );
      
      const htmlContent = await this.generatePrintHTML(printableRequest, template);
      
      // استخدام مكتبة HTML إلى PDF (يجب تثبيت puppeteer أو مكتبة مماثلة)
      const pdfBlob = await this.convertHTMLToPDF(htmlContent, {
        format: printableRequest.print_settings.paper_size,
        orientation: printableRequest.print_settings.orientation,
        filename: options?.filename || `expense-${printableRequest.request_number}.pdf`
      });

      console.log('✅ PDF generated successfully');
      return pdfBlob;
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * إنشاء رمز QR للتحقق
   */
  private generateVerificationData(expenseRequest: ExpenseRequest): VerificationData {
    const timestamp = new Date().toISOString();
    const documentId = `EXP-DOC-${expenseRequest.request_number}-${Date.now()}`;
    
    // بيانات للتحقق
    const verificationPayload = {
      requestId: expenseRequest.id,
      requestNumber: expenseRequest.request_number,
      amount: expenseRequest.amount,
      userId: expenseRequest.user_id,
      timestamp,
      documentId
    };

    // إنشاء hash للتحقق
    const verificationHash = this.generateHash(JSON.stringify(verificationPayload));
    
    // URL للتحقق السريع
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify/expense/${expenseRequest.id}?hash=${verificationHash}`;
    
    return {
      qr_code: verificationUrl,
      verification_hash: verificationHash,
      digital_signature: this.generateDigitalSignature(verificationPayload),
      print_timestamp: timestamp,
      document_id: documentId
    };
  }

  /**
   * الأنماط الأساسية للطباعة
   */
  private getBaseStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        direction: rtl;
        line-height: 1.6;
        color: #333;
        background: #fff;
      }

      .document-container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        background: #fff;
        position: relative;
        min-height: 297mm;
      }

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 72px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.05);
        z-index: 0;
        pointer-events: none;
        user-select: none;
      }

      .header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }

      .company-logo {
        width: 120px;
        height: auto;
        object-fit: contain;
      }

      .company-info {
        text-align: center;
      }

      .company-name {
        font-size: 28px;
        font-weight: bold;
        color: #1e40af;
        margin-bottom: 10px;
      }

      .company-details {
        color: #666;
        font-size: 14px;
      }

      .document-title {
        text-align: center;
        font-size: 32px;
        font-weight: bold;
        color: #1e40af;
        margin: 30px 0;
        padding: 20px;
        border: 2px solid #2563eb;
        border-radius: 10px;
        background: linear-gradient(135deg, #eff6ff, #dbeafe);
      }

      .request-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
      }

      .info-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 15px;
      }

      .info-label {
        font-weight: bold;
        color: #475569;
        display: block;
        margin-bottom: 5px;
      }

      .info-value {
        color: #0f172a;
        font-size: 16px;
      }

      .expense-details {
        background: #fff;
        border: 2px solid #2563eb;
        border-radius: 12px;
        padding: 25px;
        margin: 25px 0;
      }

      .amount-display {
        text-align: center;
        font-size: 36px;
        font-weight: bold;
        color: #059669;
        margin: 20px 0;
        padding: 20px;
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border-radius: 10px;
        border: 2px dashed #059669;
      }

      .approval-chain {
        margin: 30px 0;
      }

      .approval-item {
        display: flex;
        align-items: center;
        padding: 15px;
        margin: 10px 0;
        background: #f1f5f9;
        border-radius: 8px;
        border-right: 4px solid #10b981;
      }

      .approval-status {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        margin-left: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
      }

      .status-approved { background: #059669; }
      .status-pending { background: #f59e0b; }
      .status-rejected { background: #dc2626; }

      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 2px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .qr-section {
        text-align: center;
      }

      .qr-code {
        width: 100px;
        height: 100px;
        border: 1px solid #ccc;
        margin-bottom: 10px;
      }

      .verification-info {
        font-size: 11px;
        color: #666;
      }

      .signature-section {
        text-align: center;
        width: 200px;
      }

      .signature-line {
        border-bottom: 1px solid #333;
        margin: 10px 0;
        height: 40px;
      }

      @media print {
        .document-container {
          box-shadow: none;
          margin: 0;
          padding: 15mm;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .no-print {
          display: none !important;
        }
      }
    `;
  }

  /**
   * أنماط القوالب المختلفة
   */
  private getTemplateStyles(template: PrintTemplate): string {
    switch (template) {
      case 'executive':
        return `
          .document-container {
            background: linear-gradient(135deg, #f8fafc, #fff);
          }
          
          .header {
            background: linear-gradient(135deg, #1e40af, #2563eb);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: none;
          }
          
          .company-name {
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          
          .company-details {
            color: rgba(255,255,255,0.9);
          }
        `;

      case 'medical':
        return `
          .header {
            border-color: #059669;
            background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
          }
          
          .document-title {
            color: #059669;
            border-color: #059669;
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          }
          
          .expense-details {
            border-color: #059669;
          }
        `;

      case 'financial':
        return `
          .header {
            border-color: #dc2626;
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
          }
          
          .document-title {
            color: #dc2626;
            border-color: #dc2626;
            background: linear-gradient(135deg, #fef2f2, #fecaca);
          }
          
          .amount-display {
            color: #dc2626;
            border-color: #dc2626;
            background: linear-gradient(135deg, #fef2f2, #fecaca);
          }
        `;

      case 'minimal':
        return `
          .document-container {
            font-family: 'Times New Roman', serif;
            padding: 15mm;
          }
          
          .header {
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
          }
          
          .document-title {
            border: none;
            background: none;
            color: #333;
            font-size: 24px;
          }
          
          .info-card {
            background: none;
            border: 1px solid #ccc;
          }
        `;

      default: // professional
        return `
          .header {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            padding: 25px;
            background: linear-gradient(135deg, #f8fafc, #fff);
          }
          
          .info-card {
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
          }
          
          .info-card:hover {
            transform: translateY(-2px);
          }
        `;
    }
  }

  /**
   * محتوى HTML للقالب
   */
  private getTemplateHTML(printableRequest: PrintableExpenseRequest, template: PrintTemplate): string {
    const { company_info, verification_data, print_settings } = printableRequest;
    
    return `
      <div class="document-container">
        ${print_settings.enable_watermark ? `<div class="watermark">${company_info.name}</div>` : ''}
        
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              ${company_info.logo_path ? `<img src="${company_info.logo_path}" alt="Logo" class="company-logo">` : ''}
            </div>
            <div class="company-info">
              <div class="company-name">${company_info.name}</div>
              <div class="company-details">
                ${company_info.address}<br>
                📞 ${company_info.phone} | 📧 ${company_info.email}<br>
                🌐 ${company_info.website}
              </div>
            </div>
            <div class="document-meta">
              <div style="font-size: 12px; color: #666;">
                تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}<br>
                رقم الوثيقة: ${verification_data.document_id}
              </div>
            </div>
          </div>
        </div>

        <div class="document-title">
          طلب نفقة رقم: ${printableRequest.request_number}
        </div>

        <div class="request-info">
          <div class="info-card">
            <span class="info-label">عنوان الطلب:</span>
            <span class="info-value">${printableRequest.title}</span>
          </div>
          <div class="info-card">
            <span class="info-label">تاريخ النفقة:</span>
            <span class="info-value">${new Date(printableRequest.expense_date).toLocaleDateString('ar-SA')}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الفئة:</span>
            <span class="info-value">${printableRequest.category?.name_ar || 'غير محدد'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الأولوية:</span>
            <span class="info-value">${this.getPriorityText(printableRequest.priority)}</span>
          </div>
          ${printableRequest.location ? `
            <div class="info-card">
              <span class="info-label">المكان:</span>
              <span class="info-value">${printableRequest.location}</span>
            </div>
          ` : ''}
          ${printableRequest.vendor_name ? `
            <div class="info-card">
              <span class="info-label">اسم المورد:</span>
              <span class="info-value">${printableRequest.vendor_name}</span>
            </div>
          ` : ''}
        </div>

        <div class="expense-details">
          <div class="amount-display">
            ${printableRequest.amount.toLocaleString('ar-SA')} ${printableRequest.currency}
            <div style="font-size: 16px; margin-top: 10px; color: #666;">
              (${this.numberToWords(printableRequest.amount)} ${printableRequest.currency === 'SAR' ? 'ريال سعودي' : printableRequest.currency})
            </div>
          </div>
          
          ${printableRequest.description ? `
            <div style="margin: 20px 0;">
              <strong>وصف النفقة:</strong>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 10px;">
                ${printableRequest.description}
              </div>
            </div>
          ` : ''}
          
          ${printableRequest.notes ? `
            <div style="margin: 20px 0;">
              <strong>ملاحظات:</strong>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 10px;">
                ${printableRequest.notes}
              </div>
            </div>
          ` : ''}
        </div>

        ${printableRequest.approval_chain.length > 0 ? `
          <div class="approval-chain">
            <h3 style="margin-bottom: 20px; color: #1e40af;">سلسلة الموافقات</h3>
            ${printableRequest.approval_chain.map(approval => `
              <div class="approval-item">
                <div class="approval-status ${this.getStatusClass(approval.status)}">
                  ${this.getStatusIcon(approval.status)}
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: bold;">${this.getRoleText(approval.approver_role)}</div>
                  <div style="font-size: 14px; color: #666;">
                    ${approval.decision_date ? new Date(approval.decision_date).toLocaleDateString('ar-SA') : 'في الانتظار'}
                  </div>
                  ${approval.comments ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">${approval.comments}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="footer">
          <div class="signature-section">
            <div style="font-weight: bold; margin-bottom: 10px;">توقيع طالب النفقة</div>
            <div class="signature-line"></div>
            <div style="font-size: 12px; color: #666;">التاريخ: ___________</div>
          </div>

          <div style="flex: 1; text-align: center;">
            <div style="font-size: 12px; color: #666; margin: 10px 0;">
              هذا مستند رسمي من ${company_info.name}<br>
              تم إنشاؤه تلقائياً بواسطة النظام في ${new Date(verification_data.print_timestamp).toLocaleString('ar-SA')}
            </div>
          </div>

          ${print_settings.include_qr_code ? `
            <div class="qr-section">
              <div style="font-weight: bold; margin-bottom: 10px;">رمز التحقق</div>
              <div class="qr-code" style="background: url('https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verification_data.qr_code)}') center/contain no-repeat;"></div>
              <div class="verification-info">
                للتحقق من صحة الوثيقة<br>
                Hash: ${verification_data.verification_hash.substring(0, 8)}...
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * تحويل HTML إلى PDF
   */
  private async convertHTMLToPDF(
    htmlContent: string,
    options: {
      format: string;
      orientation: string;
      filename: string;
    }
  ): Promise<Blob> {
    // هذه دالة مؤقتة - في التطبيق الحقيقي نحتاج مكتبة مثل puppeteer
    console.log('🔄 Converting HTML to PDF...');
    
    // إنشاء Blob مؤقت للمثال
    const mockPDFContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 25 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(${options.filename}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n275\n%%EOF`;
    
    return new Blob([mockPDFContent], { type: 'application/pdf' });
  }

  // ===== الدوال المساعدة =====

  private getPriorityText(priority: string): string {
    const priorities = {
      low: 'منخفضة',
      normal: 'عادية', 
      high: 'عالية',
      urgent: 'عاجلة'
    };
    return priorities[priority as keyof typeof priorities] || priority;
  }

  private getStatusClass(status: string): string {
    return `status-${status}`;
  }

  private getStatusIcon(status: string): string {
    const icons = {
      approved: '✓',
      pending: '⏳',
      rejected: '✗',
      delegated: '➤'
    };
    return icons[status as keyof typeof icons] || '?';
  }

  private getRoleText(role: string): string {
    const roles = {
      manager: 'المدير المباشر',
      admin: 'الإدارة العليا',
      accountant: 'المحاسب',
      representative: 'المندوب'
    };
    return roles[role as keyof typeof roles] || role;
  }

  private numberToWords(num: number): string {
    // تحويل الرقم إلى كلمات بالعربية (مبسط)
    if (num === 0) return 'صفر';
    
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    if (num < 10) return ones[num];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (num < 20) {
        const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
        return teens[num - 10];
      }
      return tens[ten] + (one ? ' و' + ones[one] : '');
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      return hundreds[hundred] + (remainder ? ' و' + this.numberToWords(remainder) : '');
    }
    
    // للأرقام الأكبر، إرجاع الرقم كما هو
    return num.toLocaleString('ar-SA');
  }

  private generateHash(input: string): string {
    // دالة hash مبسطة - في التطبيق الحقيقي استخدم crypto
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private generateDigitalSignature(payload: any): string {
    // توقيع رقمي مبسط - في التطبيق الحقيقي استخدم مكتبة تشفير
    const data = JSON.stringify(payload) + process.env.NEXT_PUBLIC_SIGNATURE_SECRET;
    return this.generateHash(data);
  }
}

// ===== تصدير النسخة الافتراضية والوظائف المساعدة =====
export const expensePrintingService = ExpensePrintingService.getInstance();

/**
 * إنشاء مستند طباعة احترافي
 */
export async function generateExpensePrintDocument(
  expenseRequest: ExpenseRequest,
  template: PrintTemplate = 'professional',
  options?: any
): Promise<PrintableExpenseRequest> {
  return await expensePrintingService.generatePrintableDocument(expenseRequest, template, options);
}

/**
 * إنتاج HTML للطباعة
 */
export async function generateExpensePrintHTML(
  expenseRequest: ExpenseRequest,
  template: PrintTemplate = 'professional'
): Promise<string> {
  const printableRequest = await generateExpensePrintDocument(expenseRequest, template);
  return await expensePrintingService.generatePrintHTML(printableRequest, template);
}

/**
 * إنشاء ملف PDF للنفقة
 */
export async function generateExpensePDF(
  expenseRequest: ExpenseRequest,
  template: PrintTemplate = 'professional',
  options?: any
): Promise<Blob> {
  return await expensePrintingService.generatePDF(expenseRequest, template, options);
}

export default ExpensePrintingService;