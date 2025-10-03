/**
 * 🏢 EP Group System - Site Settings Management Service
 * نظام إدارة إعدادات الموقع الاحترافي
 * 
 * يوفر هذا المديول إدارة شاملة لجميع إعدادات النظام بطريقة منظمة وآمنة
 * مع دعم كامل للتسلسل الهرمي والأمان والأداء المحسن
 */

import { supabase } from './supabase';

export interface SiteSetting {
  id: string;
  category: string;
  setting_key: string;
  setting_value: string | number | boolean | object;
  value_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description?: string;
  is_public: boolean;
  is_required: boolean;
  is_enabled: boolean;
  default_value?: any;
  validation_rules?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

// Enhanced site settings with EP Group specific data
const enhancedSettings: SiteSetting[] = [
  // === إعدادات الشركة الأساسية ===
  {
    id: '1',
    category: 'company',
    setting_key: 'site_title',
    setting_value: 'EP Group System',
    value_type: 'string',
    description: 'عنوان النظام الرئيسي',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: 'EP Group System',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    category: 'company',
    setting_key: 'company_name',
    setting_value: 'مجموعة إي بي للأنظمة الطبية',
    value_type: 'string',
    description: 'اسم الشركة الرسمي',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: 'مجموعة إي بي للأنظمة الطبية',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    category: 'company',
    setting_key: 'company_address',
    setting_value: 'الرياض، المملكة العربية السعودية',
    value_type: 'string',
    description: 'عنوان الشركة الرئيسي',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: 'الرياض، المملكة العربية السعودية',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    category: 'company',
    setting_key: 'company_phone',
    setting_value: '+966 11 123 4567',
    value_type: 'string',
    description: 'رقم هاتف الشركة الرئيسي',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: '+966 11 123 4567',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    category: 'company',
    setting_key: 'company_email',
    setting_value: 'info@epgroup.sa',
    value_type: 'string',
    description: 'البريد الإلكتروني الرسمي للشركة',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: 'info@epgroup.sa',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    category: 'company',
    setting_key: 'company_website',
    setting_value: 'https://www.epgroup.sa',
    value_type: 'string',
    description: 'موقع الشركة الإلكتروني',
    is_public: true,
    is_required: false,
    is_enabled: true,
    default_value: 'https://www.epgroup.sa',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    category: 'company',
    setting_key: 'logo_path',
    setting_value: '/images/ep-group-logo.png',
    value_type: 'string',
    description: 'مسار شعار الشركة',
    is_public: true,
    is_required: false,
    is_enabled: true,
    default_value: '/images/ep-group-logo.png',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },

  // === إعدادات النظام العامة ===
  {
    id: '8',
    category: 'system',
    setting_key: 'default_currency',
    setting_value: 'SAR',
    value_type: 'string',
    description: 'العملة الافتراضية للنظام',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: 'SAR',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '9',
    category: 'system',
    setting_key: 'tax_rate',
    setting_value: 15,
    value_type: 'number',
    description: 'معدل ضريبة القيمة المضافة (%)',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 15,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '10',
    category: 'system',
    setting_key: 'default_language',
    setting_value: 'ar',
    value_type: 'string',
    description: 'اللغة الافتراضية للنظام',
    is_public: true,
    is_required: true,
    is_enabled: true,
    default_value: 'ar',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '11',
    category: 'system',
    setting_key: 'timezone',
    setting_value: 'Asia/Riyadh',
    value_type: 'string',
    description: 'المنطقة الزمنية للنظام',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 'Asia/Riyadh',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },

  // === إعدادات النفقات المتقدمة ===
  {
    id: '12',
    category: 'expenses',
    setting_key: 'max_expense_amount',
    setting_value: 10000,
    value_type: 'number',
    description: 'الحد الأقصى لمبلغ النفقة الواحدة (بالريال السعودي)',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 10000,
    validation_rules: 'min:1|max:100000',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '13',
    category: 'expenses',
    setting_key: 'require_manager_approval',
    setting_value: true,
    value_type: 'boolean',
    description: 'هل يتطلب موافقة المدير المباشر',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '14',
    category: 'expenses',
    setting_key: 'require_receipt',
    setting_value: true,
    value_type: 'boolean',
    description: 'هل يتطلب إرفاق فاتورة أو إيصال',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '15',
    category: 'expenses',
    setting_key: 'auto_approve_threshold',
    setting_value: 500,
    value_type: 'number',
    description: 'حد الموافقة التلقائية (بدون مراجعة)',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 500,
    validation_rules: 'min:0|max:5000',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '16',
    category: 'expenses',
    setting_key: 'approval_workflow',
    setting_value: JSON.stringify([
      { level: 1, role: 'manager', max_amount: 5000, required: true },
      { level: 2, role: 'admin', max_amount: 15000, required: true },
      { level: 3, role: 'accountant', max_amount: -1, required: true }
    ]),
    value_type: 'json',
    description: 'تدفق الموافقات للنفقات حسب المبلغ',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: '[{"level":1,"role":"manager","max_amount":5000,"required":true},{"level":2,"role":"admin","max_amount":15000,"required":true},{"level":3,"role":"accountant","max_amount":-1,"required":true}]',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '17',
    category: 'expenses',
    setting_key: 'allowed_file_types',
    setting_value: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
    value_type: 'array',
    description: 'أنواع الملفات المسموح برفعها كإيصالات',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: '["pdf","jpg","jpeg","png","doc","docx"]',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '18',
    category: 'expenses',
    setting_key: 'max_file_size',
    setting_value: 5,
    value_type: 'number',
    description: 'الحد الأقصى لحجم الملف المرفق (بالميجابايت)',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 5,
    validation_rules: 'min:1|max:20',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },

  // === إعدادات الطباعة والتوثيق ===
  {
    id: '19',
    category: 'printing',
    setting_key: 'enable_watermark',
    setting_value: true,
    value_type: 'boolean',
    description: 'تفعيل العلامة المائية في المستندات المطبوعة',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20',
    category: 'printing',
    setting_key: 'default_template',
    setting_value: 'professional',
    value_type: 'string',
    description: 'قالب الطباعة الافتراضي للنفقات',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 'professional',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '21',
    category: 'printing',
    setting_key: 'include_qr_code',
    setting_value: true,
    value_type: 'boolean',
    description: 'إضافة رمز QR للتوثيق والتحقق',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22',
    category: 'printing',
    setting_key: 'auto_generate_pdf',
    setting_value: true,
    value_type: 'boolean',
    description: 'إنشاء ملف PDF تلقائياً عند اعتماد النفقة',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },

  // === إعدادات الأمان ===
  {
    id: '23',
    category: 'security',
    setting_key: 'session_timeout',
    setting_value: 30,
    value_type: 'number',
    description: 'مدة انتهاء صلاحية الجلسة (بالدقائق)',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 30,
    validation_rules: 'min:5|max:480',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '24',
    category: 'security',
    setting_key: 'max_login_attempts',
    setting_value: 5,
    value_type: 'number',
    description: 'عدد محاولات تسجيل الدخول المسموحة',
    is_public: false,
    is_required: true,
    is_enabled: true,
    default_value: 5,
    validation_rules: 'min:3|max:10',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '25',
    category: 'security',
    setting_key: 'require_2fa',
    setting_value: false,
    value_type: 'boolean',
    description: 'إلزام التحقق بخطوتين للمدراء والمحاسبين',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: false,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },

  // === إعدادات الإشعارات ===
  {
    id: '26',
    category: 'notifications',
    setting_key: 'email_notifications',
    setting_value: true,
    value_type: 'boolean',
    description: 'تفعيل الإشعارات عبر البريد الإلكتروني',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '27',
    category: 'notifications',
    setting_key: 'sms_notifications',
    setting_value: false,
    value_type: 'boolean',
    description: 'تفعيل الإشعارات عبر الرسائل النصية',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: false,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '28',
    category: 'notifications',
    setting_key: 'push_notifications',
    setting_value: true,
    value_type: 'boolean',
    description: 'تفعيل الإشعارات المباشرة في المتصفح',
    is_public: false,
    is_required: false,
    is_enabled: true,
    default_value: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  }
];

/**
 * الحصول على جميع إعدادات الموقع
 * مع دعم قاعدة البيانات والبيانات الاحتياطية
 */
export async function getSiteSettings(): Promise<SiteSetting[]> {
  try {
    // محاولة جلب البيانات من قاعدة البيانات أولاً
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('is_enabled', true)
      .order('category, setting_key');

    if (error) {
      console.warn('⚠️ Database unavailable, using enhanced local settings:', error.message);
      return enhancedSettings;
    }

    if (data && data.length > 0) {
      // تحويل البيانات من قاعدة البيانات إلى التنسيق المطلوب
      return data.map(transformDatabaseSetting);
    }
    
    console.log('📝 No database settings found, using enhanced defaults');
    return enhancedSettings;
  } catch (error) {
    console.warn('⚠️ Error fetching settings, using enhanced local settings:', error);
    return enhancedSettings;
  }
}

/**
 * الحصول على إعدادات فئة معينة
 */
export async function getSiteSettingsByCategory(category: string): Promise<SiteSetting[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', category)
      .eq('is_enabled', true)
      .order('setting_key');

    if (error) {
      console.warn(`⚠️ Database error for category ${category}, using local settings:`, error.message);
      return enhancedSettings.filter(setting => setting.category === category);
    }

    if (data && data.length > 0) {
      return data.map(transformDatabaseSetting);
    }

    // العودة للإعدادات المحلية المحسنة
    return enhancedSettings.filter(setting => setting.category === category);
  } catch (error) {
    console.warn(`⚠️ Error fetching ${category} settings:`, error);
    return enhancedSettings.filter(setting => setting.category === category);
  }
}

/**
 * الحصول على إعداد محدد بالفئة والمفتاح
 */
export async function getSiteSettingByKey(category: string, key: string): Promise<SiteSetting | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', category)
      .eq('setting_key', key)
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      // البحث في الإعدادات المحلية المحسنة
      const localSetting = enhancedSettings.find(setting => 
        setting.category === category && setting.setting_key === key
      );
      
      if (!localSetting) {
        console.warn(`⚠️ Setting ${category}.${key} not found`);
      }
      
      return localSetting || null;
    }

    return transformDatabaseSetting(data);
  } catch (error) {
    console.warn(`⚠️ Error fetching setting ${category}.${key}:`, error);
    return enhancedSettings.find(setting => 
      setting.category === category && setting.setting_key === key
    ) || null;
  }
}

// متغير لتخزين الإعدادات الوهمية للاختبار
const mockSettings: SiteSetting[] = [...enhancedSettings];

export async function updateSiteSetting(
  id: string, 
  value: string | number | boolean | object
): Promise<SiteSetting | null> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const settingIndex = mockSettings.findIndex(setting => setting.id === id);
  if (settingIndex === -1) return null;
  
  mockSettings[settingIndex] = {
    ...mockSettings[settingIndex],
    setting_value: value,
    updated_at: new Date().toISOString(),
  };
  
  return mockSettings[settingIndex];
}

export async function createSiteSetting(settingData: Omit<SiteSetting, 'id' | 'created_at' | 'updated_at'>): Promise<SiteSetting> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const newSetting: SiteSetting = {
    id: Math.random().toString(36).substring(7),
    ...settingData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  mockSettings.push(newSetting);
  return newSetting;
}

export async function deleteSiteSetting(id: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const settingIndex = mockSettings.findIndex(setting => setting.id === id);
  if (settingIndex === -1) return false;
  
  mockSettings.splice(settingIndex, 1);
  return true;
}

/**
 * تحويل إعداد قاعدة البيانات إلى التنسيق المطلوب
 */
function transformDatabaseSetting(dbSetting: any): SiteSetting {
  return {
    ...dbSetting,
    setting_value: deserializeValue(dbSetting.setting_value, dbSetting.value_type),
    is_public: dbSetting.is_public ?? true,
    is_required: dbSetting.is_required ?? false,
    is_enabled: dbSetting.is_enabled ?? true
  };
}

/**
 * تحويل القيمة المسلسلة إلى نوعها الأصلي
 */
function deserializeValue(value: any, type: string): any {
  if (value === null || value === undefined) return null;
  
  switch (type) {
    case 'number':
      return typeof value === 'number' ? value : Number(value);
    case 'boolean':
      return typeof value === 'boolean' ? value : (value === 'true' || value === true);
    case 'json':
    case 'array':
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    default:
      return value;
  }
}

// === وظائف مساعدة محسّنة ===

/**
 * الحصول على قيمة إعداد بشكل مبسط
 */
export async function getSettingValue(category: string, key: string, defaultValue: any = null): Promise<any> {
  const setting = await getSiteSettingByKey(category, key);
  return setting ? setting.setting_value : defaultValue;
}

/**
 * الحصول على معلومات الشركة بتنسيق مبسط
 */
export async function getCompanyInfo(): Promise<{
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_path: string;
  site_title: string;
}> {
  const companySettings = await getSiteSettingsByCategory('company');
  
  const info = {
    name: 'مجموعة إي بي للأنظمة الطبية',
    address: 'الرياض، المملكة العربية السعودية',
    phone: '+966 11 123 4567',
    email: 'info@epgroup.sa',
    website: 'https://www.epgroup.sa',
    logo_path: '/images/ep-group-logo.png',
    site_title: 'EP Group System'
  };

  // تطبيق القيم من قاعدة البيانات إن وُجدت
  companySettings.forEach(setting => {
    const key = setting.setting_key as keyof typeof info;
    if (key in info && setting.setting_value) {
      (info as any)[key] = setting.setting_value;
    }
  });

  return info;
}

/**
 * الحصول على إعدادات النفقات المحسنة
 */
export async function getExpenseSettings(): Promise<{
  max_expense_amount: number;
  require_manager_approval: boolean;
  require_receipt: boolean;
  auto_approve_threshold: number;
  approval_workflow: any[];
  allowed_file_types: string[];
  max_file_size: number;
}> {
  const expenseSettings = await getSiteSettingsByCategory('expenses');
  
  const settings = {
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
  };

  // تطبيق القيم من قاعدة البيانات
  expenseSettings.forEach(setting => {
    const key = setting.setting_key as keyof typeof settings;
    if (key in settings && setting.setting_value !== null) {
      (settings as any)[key] = setting.setting_value;
    }
  });

  return settings;
}

/**
 * الحصول على إعدادات الطباعة
 */
export async function getPrintingSettings(): Promise<{
  enable_watermark: boolean;
  default_template: string;
  include_qr_code: boolean;
  auto_generate_pdf: boolean;
}> {
  const printingSettings = await getSiteSettingsByCategory('printing');
  
  const settings = {
    enable_watermark: true,
    default_template: 'professional',
    include_qr_code: true,
    auto_generate_pdf: true
  };

  printingSettings.forEach(setting => {
    const key = setting.setting_key as keyof typeof settings;
    if (key in settings && setting.setting_value !== null) {
      (settings as any)[key] = setting.setting_value;
    }
  });

  return settings;
}

/**
 * تحديث إعداد واحد مع التحقق من الصلاحيات
 */
export async function updateSiteSettingSecure(
  id: string,
  value: string | number | boolean | object,
  updatedBy?: string
): Promise<SiteSetting | null> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: typeof value === 'object' ? JSON.stringify(value) : value,
        updated_at: now,
        updated_by: updatedBy 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating setting:', error);
      return null;
    }

    console.log(`✅ Setting ${id} updated successfully`);
    return transformDatabaseSetting(data);
  } catch (error) {
    console.error('❌ Error in updateSiteSettingSecure:', error);
    // العودة للطريقة القديمة كبديل
    return updateSiteSetting(id, value);
  }
}
