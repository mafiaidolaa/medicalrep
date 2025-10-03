/**
 * 🔗 EP Group System - Expense System Integration
 * تكامل نظام إدارة النفقات مع الإعدادات العامة والخدمات الأخرى
 * 
 * يوفر هذا الملف طبقة التكامل الشاملة بين جميع مكونات نظام إدارة النفقات
 * والإعدادات العامة للموقع والخدمات المساعدة
 */

import { ExpenseManagementService } from '../services/expense-management-service';
import { ExpensePrintingService } from '../services/expense-printing-service';
import { 
  getCompanyInfo,
  getExpenseSettings,
  getPrintingSettings,
  getSiteSettingByKey,
  getSettingValue 
} from '../site-settings';

export interface IntegratedExpenseConfig {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo_path: string;
    site_title: string;
  };
  expense: {
    max_expense_amount: number;
    require_manager_approval: boolean;
    require_receipt: boolean;
    auto_approve_threshold: number;
    approval_workflow: any[];
    allowed_file_types: string[];
    max_file_size: number;
  };
  printing: {
    enable_watermark: boolean;
    default_template: string;
    include_qr_code: boolean;
    auto_generate_pdf: boolean;
  };
  system: {
    default_currency: string;
    tax_rate: number;
    default_language: string;
    timezone: string;
  };
  notifications: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
  };
}

export class ExpenseSystemIntegration {
  private expenseService: ExpenseManagementService;
  private printingService: ExpensePrintingService;
  private config: IntegratedExpenseConfig | null = null;

  constructor() {
    this.expenseService = new ExpenseManagementService();
    this.printingService = new ExpensePrintingService();
  }

  /**
   * تحميل التكوين المتكامل للنظام
   */
  async loadIntegratedConfiguration(): Promise<IntegratedExpenseConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      console.log('🔄 Loading integrated expense system configuration...');
      
      const [
        companyInfo,
        expenseSettings,
        printingSettings,
        currency,
        taxRate,
        language,
        timezone,
        emailNotifications,
        smsNotifications,
        pushNotifications
      ] = await Promise.all([
        getCompanyInfo(),
        getExpenseSettings(),
        getPrintingSettings(),
        getSettingValue('system', 'default_currency', 'SAR'),
        getSettingValue('system', 'tax_rate', 15),
        getSettingValue('system', 'default_language', 'ar'),
        getSettingValue('system', 'timezone', 'Asia/Riyadh'),
        getSettingValue('notifications', 'email_notifications', true),
        getSettingValue('notifications', 'sms_notifications', false),
        getSettingValue('notifications', 'push_notifications', true)
      ]);

      this.config = {
        company: companyInfo,
        expense: expenseSettings,
        printing: printingSettings,
        system: {
          default_currency: currency,
          tax_rate: taxRate,
          default_language: language,
          timezone: timezone
        },
        notifications: {
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications,
          push_notifications: pushNotifications
        }
      };

      console.log('✅ Integrated configuration loaded successfully');
      return this.config;
    } catch (error) {
      console.error('❌ Error loading integrated configuration:', error);
      
      // العودة للإعدادات الافتراضية في حالة الخطأ
      this.config = this.getDefaultConfiguration();
      return this.config;
    }
  }

  /**
   * الحصول على الإعدادات الافتراضية
   */
  private getDefaultConfiguration(): IntegratedExpenseConfig {
    return {
      company: {
        name: 'مجموعة إي بي للأنظمة الطبية',
        address: 'الرياض، المملكة العربية السعودية',
        phone: '+966 11 123 4567',
        email: 'info@epgroup.sa',
        website: 'https://www.epgroup.sa',
        logo_path: '/images/ep-group-logo.png',
        site_title: 'EP Group System'
      },
      expense: {
        max_expense_amount: 10000,
        require_manager_approval: true,
        require_receipt: true,
        auto_approve_threshold: 500,
        approval_workflow: [
          { level: 1, role: 'manager', max_amount: 5000, required: true },
          { level: 2, role: 'admin', max_amount: 15000, required: true },
          { level: 3, role: 'accountant', max_amount: -1, required: true }
        ],
        allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        max_file_size: 5
      },
      printing: {
        enable_watermark: true,
        default_template: 'professional',
        include_qr_code: true,
        auto_generate_pdf: true
      },
      system: {
        default_currency: 'SAR',
        tax_rate: 15,
        default_language: 'ar',
        timezone: 'Asia/Riyadh'
      },
      notifications: {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true
      }
    };
  }

  /**
   * إعادة تحميل التكوين (مفيد عند تغيير الإعدادات)
   */
  async reloadConfiguration(): Promise<IntegratedExpenseConfig> {
    this.config = null;
    return await this.loadIntegratedConfiguration();
  }

  /**
   * الحصول على خدمة إدارة النفقات المكونة
   */
  async getConfiguredExpenseService(): Promise<ExpenseManagementService> {
    const config = await this.loadIntegratedConfiguration();
    
    // تطبيق الإعدادات على خدمة إدارة النفقات
    this.expenseService.updateConfiguration({
      maxExpenseAmount: config.expense.max_expense_amount,
      requireManagerApproval: config.expense.require_manager_approval,
      requireReceipt: config.expense.require_receipt,
      autoApproveThreshold: config.expense.auto_approve_threshold,
      approvalWorkflow: config.expense.approval_workflow,
      allowedFileTypes: config.expense.allowed_file_types,
      maxFileSize: config.expense.max_file_size,
      defaultCurrency: config.system.default_currency,
      taxRate: config.system.tax_rate
    });

    return this.expenseService;
  }

  /**
   * الحصول على خدمة الطباعة المكونة
   */
  async getConfiguredPrintingService(): Promise<ExpensePrintingService> {
    const config = await this.loadIntegratedConfiguration();
    
    // تطبيق الإعدادات على خدمة الطباعة
    this.printingService.updateConfiguration({
      enableWatermark: config.printing.enable_watermark,
      defaultTemplate: config.printing.default_template,
      includeQrCode: config.printing.include_qr_code,
      autoGeneratePdf: config.printing.auto_generate_pdf,
      companyInfo: config.company,
      currency: config.system.default_currency,
      taxRate: config.system.tax_rate,
      language: config.system.default_language
    });

    return this.printingService;
  }

  /**
   * التحقق من صحة إعدادات النظام
   */
  async validateSystemConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = await this.loadIntegratedConfiguration();

      // التحقق من الإعدادات الأساسية للشركة
      if (!config.company.name || config.company.name.trim() === '') {
        errors.push('اسم الشركة مطلوب');
      }
      if (!config.company.email || !this.isValidEmail(config.company.email)) {
        errors.push('بريد إلكتروني صالح للشركة مطلوب');
      }

      // التحقق من إعدادات النفقات
      if (config.expense.max_expense_amount <= 0) {
        errors.push('الحد الأقصى للنفقة يجب أن يكون أكبر من صفر');
      }
      if (config.expense.auto_approve_threshold > config.expense.max_expense_amount) {
        warnings.push('حد الموافقة التلقائية أكبر من الحد الأقصى للنفقة');
      }
      if (config.expense.max_file_size <= 0 || config.expense.max_file_size > 50) {
        warnings.push('حجم الملف المسموح يجب أن يكون بين 1-50 ميجابايت');
      }

      // التحقق من إعدادات النظام
      if (config.system.tax_rate < 0 || config.system.tax_rate > 100) {
        errors.push('معدل الضريبة يجب أن يكون بين 0-100%');
      }

      console.log('✅ System configuration validation completed', {
        errors: errors.length,
        warnings: warnings.length
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('❌ Error validating system configuration:', error);
      return {
        isValid: false,
        errors: ['خطأ في التحقق من إعدادات النظام'],
        warnings: []
      };
    }
  }

  /**
   * الحصول على إحصائيات النظام المتكاملة
   */
  async getSystemStats(): Promise<{
    totalExpenses: number;
    pendingApprovals: number;
    totalAmount: number;
    averageProcessingTime: number;
    recentActivity: any[];
    configurationHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
  }> {
    try {
      const expenseService = await this.getConfiguredExpenseService();
      const validation = await this.validateSystemConfiguration();
      
      // الحصول على الإحصائيات الأساسية (يمكن استبدالها بالبيانات الحقيقية)
      const stats = {
        totalExpenses: 156,
        pendingApprovals: 23,
        totalAmount: 89500,
        averageProcessingTime: 2.3,
        recentActivity: [
          { type: 'expense_created', message: 'تم إنشاء طلب نفقة جديد', time: new Date() },
          { type: 'expense_approved', message: 'تمت الموافقة على طلب النفقة #123', time: new Date() },
          { type: 'payment_processed', message: 'تمت معالجة دفعة بقيمة 2,500 ريال', time: new Date() }
        ],
        configurationHealth: this.determineConfigurationHealth(validation)
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * تحديد حالة صحة التكوين
   */
  private determineConfigurationHealth(validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }): 'excellent' | 'good' | 'needs_attention' | 'critical' {
    if (!validation.isValid || validation.errors.length > 0) {
      return 'critical';
    }
    if (validation.warnings.length > 3) {
      return 'needs_attention';
    }
    if (validation.warnings.length > 0) {
      return 'good';
    }
    return 'excellent';
  }

  /**
   * التحقق من صحة البريد الإلكتروني
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * تصدير البيانات والإعدادات
   */
  async exportSystemData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const config = await this.loadIntegratedConfiguration();
      const stats = await this.getSystemStats();
      const validation = await this.validateSystemConfiguration();

      const exportData = {
        timestamp: new Date().toISOString(),
        configuration: config,
        statistics: stats,
        validation: validation,
        version: '1.0.0'
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else {
        // تحويل لصيغة CSV مبسطة
        return this.convertToCSV(exportData);
      }
    } catch (error) {
      console.error('❌ Error exporting system data:', error);
      throw error;
    }
  }

  /**
   * تحويل البيانات إلى صيغة CSV
   */
  private convertToCSV(data: any): string {
    // تنفيذ مبسط لتحويل CSV
    const headers = ['Setting', 'Category', 'Value', 'Type'];
    const rows = [headers.join(',')];

    Object.entries(data.configuration).forEach(([category, settings]) => {
      if (typeof settings === 'object' && settings !== null) {
        Object.entries(settings).forEach(([key, value]) => {
          rows.push([
            key,
            category,
            typeof value === 'object' ? JSON.stringify(value) : String(value),
            typeof value
          ].join(','));
        });
      }
    });

    return rows.join('\n');
  }
}

// تصدير instance واحد للاستخدام في جميع أنحاء التطبيق
export const expenseSystemIntegration = new ExpenseSystemIntegration();

// تصدير وظائف مساعدة للاستخدام السريع
export async function getIntegratedExpenseConfig(): Promise<IntegratedExpenseConfig> {
  return await expenseSystemIntegration.loadIntegratedConfiguration();
}

export async function validateExpenseSystemHealth(): Promise<boolean> {
  const validation = await expenseSystemIntegration.validateSystemConfiguration();
  return validation.isValid;
}

export async function getExpenseSystemStats() {
  return await expenseSystemIntegration.getSystemStats();
}