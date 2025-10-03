// @ts-nocheck
import { supabase } from '../supabase';

// Types for dynamic forms
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 
        'select' | 'multiselect' | 'radio' | 'checkbox' | 'textarea' | 'file' | 'location' | 'currency';
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: string; // Custom validation function code
  };
  options?: { value: string; label: string; icon?: string }[]; // For select, radio, etc.
  conditionalDisplay?: {
    dependsOn: string; // Field name
    condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  };
  defaultValue?: any;
  autoFill?: string; // Auto-fill from profile/preferences
  order: number;
}

export interface DynamicForm {
  id: string;
  name: string;
  title: string;
  description?: string;
  category_id: string;
  category_name: string;
  fields: FormField[];
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  title: string;
  description?: string;
  category_id: string;
  category_name: string;
  icon?: string;
  color?: string;
  usage_count: number;
  is_popular: boolean;
  is_featured: boolean;
  tags: string[];
  
  // Pre-filled data
  template_data: {
    description?: string;
    amount?: number;
    merchant_name?: string;
    notes?: string;
    time?: string;
    location?: string;
    common_fields?: Record<string, any>;
  };
  
  // Quick actions
  quick_actions?: {
    duplicate: boolean;
    recurring: boolean;
    auto_categorize: boolean;
  };
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  expense_item_id: string;
  user_id: string;
  data: Record<string, any>;
  validation_errors?: string[];
  auto_filled_fields: string[];
  completion_time_seconds: number;
  created_at: string;
}

export interface FormAnalytics {
  form_id: string;
  total_submissions: number;
  average_completion_time: number;
  field_completion_rates: Record<string, number>;
  common_validation_errors: { field: string; error: string; count: number }[];
  abandonment_rate: number;
  user_satisfaction_score: number;
}

class DynamicFormsService {
  // Get dynamic forms by category
  async getFormsByCategory(categoryId: string): Promise<DynamicForm[]> {
    try {
      const { data, error } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get forms by category failed:', error);
      return [];
    }
  }

  // Get default form for category
  async getDefaultForm(categoryId: string): Promise<DynamicForm | null> {
    try {
      const { data, error } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Get default form failed:', error);
      return null;
    }
  }

  // Create dynamic form
  async createDynamicForm(form: Omit<DynamicForm, 'id' | 'created_at' | 'updated_at'>): Promise<DynamicForm | null> {
    try {
      const { data, error } = await supabase
        .from('dynamic_forms')
        .insert(form)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create dynamic form failed:', error);
      return null;
    }
  }

  // Update dynamic form
  async updateDynamicForm(formId: string, updates: Partial<DynamicForm>): Promise<DynamicForm | null> {
    try {
      const { data, error } = await supabase
        .from('dynamic_forms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update dynamic form failed:', error);
      return null;
    }
  }

  // Generate form based on category and user preferences
  async generateSmartForm(categoryId: string, userId: string): Promise<DynamicForm | null> {
    try {
      // Get category details
      const { data: category } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (!category) return null;

      // Get user's previous submissions for this category
      const { data: previousSubmissions } = await supabase
        .from('form_submissions')
        .select('data')
        .eq('user_id', userId)
        .limit(10)
        .order('created_at', { ascending: false });

      // Analyze common fields and generate smart form
      const commonFields = this.analyzeCommonFields(previousSubmissions || []);
      const smartFields = this.generateSmartFields(category, commonFields);

      const smartForm: Omit<DynamicForm, 'id' | 'created_at' | 'updated_at'> = {
        name: `smart_form_${category.name}`,
        title: `نموذج ذكي - ${category.name}`,
        description: `نموذج مُحسَّن بناءً على استخداماتك السابقة`,
        category_id: categoryId,
        category_name: category.name,
        fields: smartFields,
        is_active: true,
        is_default: false,
        version: 1,
        created_by: userId,
      };

      return await this.createDynamicForm(smartForm);
    } catch (error) {
      console.error('Generate smart form failed:', error);
      return null;
    }
  }

  // Analyze common fields from submissions
  private analyzeCommonFields(submissions: { data: Record<string, any> }[]): Record<string, any> {
    const fieldFrequency: Record<string, { count: number; values: any[] }> = {};

    submissions.forEach(submission => {
      Object.entries(submission.data).forEach(([field, value]) => {
        if (!fieldFrequency[field]) {
          fieldFrequency[field] = { count: 0, values: [] };
        }
        fieldFrequency[field].count++;
        if (value) fieldFrequency[field].values.push(value);
      });
    });

    // Return fields that appear in more than 50% of submissions
    const commonFields: Record<string, any> = {};
    Object.entries(fieldFrequency).forEach(([field, data]) => {
      if (data.count / submissions.length > 0.5) {
        commonFields[field] = {
          frequency: data.count / submissions.length,
          commonValues: [...new Set(data.values)].slice(0, 5), // Top 5 unique values
        };
      }
    });

    return commonFields;
  }

  // Generate smart fields based on category and user patterns
  private generateSmartFields(category: any, commonFields: Record<string, any>): FormField[] {
    const baseFields: FormField[] = [
      {
        id: 'description',
        name: 'description',
        label: 'وصف المصروف',
        type: 'text',
        required: true,
        placeholder: `مثال: ${this.getDescriptionExample(category.name)}`,
        order: 1,
        autoFill: commonFields.description ? 'common_values' : undefined,
      },
      {
        id: 'amount',
        name: 'amount',
        label: 'المبلغ',
        type: 'currency',
        required: true,
        validation: {
          min: 1,
          max: category.max_amount || 10000,
        },
        order: 2,
      },
    ];

    // Add category-specific fields
    const categoryFields = this.getCategorySpecificFields(category);
    
    // Add common fields from user history
    const userSpecificFields = this.generateUserSpecificFields(commonFields);

    return [...baseFields, ...categoryFields, ...userSpecificFields]
      .sort((a, b) => a.order - b.order);
  }

  // Get category-specific fields
  private getCategorySpecificFields(category: any): FormField[] {
    const fields: FormField[] = [];

    switch (category.name.toLowerCase()) {
      case 'transport':
      case 'تنقل':
        fields.push(
          {
            id: 'origin',
            name: 'origin',
            label: 'من',
            type: 'location',
            required: true,
            order: 3,
          },
          {
            id: 'destination',
            name: 'destination',
            label: 'إلى',
            type: 'location',
            required: true,
            order: 4,
          },
          {
            id: 'transport_type',
            name: 'transport_type',
            label: 'نوع التنقل',
            type: 'select',
            options: [
              { value: 'taxi', label: 'تاكسي' },
              { value: 'uber', label: 'أوبر' },
              { value: 'careem', label: 'كريم' },
              { value: 'bus', label: 'باص' },
              { value: 'metro', label: 'مترو' },
              { value: 'fuel', label: 'وقود' },
            ],
            required: true,
            order: 5,
          }
        );
        break;

      case 'hospitality':
      case 'ضيافة':
        fields.push(
          {
            id: 'guest_count',
            name: 'guest_count',
            label: 'عدد الضيوف',
            type: 'number',
            required: true,
            validation: { min: 1, max: 50 },
            order: 3,
          },
          {
            id: 'meal_type',
            name: 'meal_type',
            label: 'نوع الوجبة',
            type: 'select',
            options: [
              { value: 'breakfast', label: 'إفطار' },
              { value: 'lunch', label: 'غداء' },
              { value: 'dinner', label: 'عشاء' },
              { value: 'snacks', label: 'وجبات خفيفة' },
              { value: 'drinks', label: 'مشروبات' },
            ],
            order: 4,
          },
          {
            id: 'business_purpose',
            name: 'business_purpose',
            label: 'الغرض التجاري',
            type: 'textarea',
            required: true,
            placeholder: 'اجتماع عمل مع العميل...',
            order: 5,
          }
        );
        break;

      case 'communications':
      case 'إتصالات':
        fields.push(
          {
            id: 'communication_type',
            name: 'communication_type',
            label: 'نوع الخدمة',
            type: 'select',
            options: [
              { value: 'mobile', label: 'خدمة جوال' },
              { value: 'internet', label: 'إنترنت' },
              { value: 'landline', label: 'خط أرضي' },
              { value: 'international', label: 'مكالمات دولية' },
            ],
            required: true,
            order: 3,
          },
          {
            id: 'service_period',
            name: 'service_period',
            label: 'فترة الخدمة',
            type: 'text',
            placeholder: 'يناير 2024',
            required: true,
            order: 4,
          }
        );
        break;

      case 'marketing':
      case 'دعاية':
        fields.push(
          {
            id: 'campaign_name',
            name: 'campaign_name',
            label: 'اسم الحملة',
            type: 'text',
            required: true,
            order: 3,
          },
          {
            id: 'marketing_channel',
            name: 'marketing_channel',
            label: 'قناة التسويق',
            type: 'select',
            options: [
              { value: 'social_media', label: 'وسائل التواصل الاجتماعي' },
              { value: 'print', label: 'مطبوعات' },
              { value: 'digital', label: 'تسويق رقمي' },
              { value: 'radio', label: 'إذاعة' },
              { value: 'tv', label: 'تلفزيون' },
              { value: 'outdoor', label: 'إعلانات خارجية' },
            ],
            required: true,
            order: 4,
          },
          {
            id: 'target_audience',
            name: 'target_audience',
            label: 'الجمهور المستهدف',
            type: 'text',
            placeholder: 'الشباب 18-35',
            order: 5,
          }
        );
        break;

      default:
        // Generic fields for other categories
        fields.push(
          {
            id: 'merchant_name',
            name: 'merchant_name',
            label: 'اسم التاجر/المتجر',
            type: 'text',
            required: false,
            order: 3,
          },
          {
            id: 'receipt_number',
            name: 'receipt_number',
            label: 'رقم الإيصال',
            type: 'text',
            required: false,
            order: 4,
          }
        );
        break;
    }

    return fields;
  }

  // Generate user-specific fields based on history
  private generateUserSpecificFields(commonFields: Record<string, any>): FormField[] {
    const fields: FormField[] = [];
    let order = 100; // Start after category fields

    Object.entries(commonFields).forEach(([fieldName, data]) => {
      if (!['description', 'amount', 'merchant_name', 'receipt_number'].includes(fieldName)) {
        fields.push({
          id: fieldName,
          name: fieldName,
          label: this.generateFieldLabel(fieldName),
          type: this.inferFieldType(data.commonValues),
          required: false,
          options: data.commonValues.length > 1 ? 
            data.commonValues.map((value: any) => ({ value, label: value })) : undefined,
          order: order++,
          autoFill: 'user_history',
        });
      }
    });

    return fields;
  }

  // Generate field label from field name
  private generateFieldLabel(fieldName: string): string {
    const labelMap: Record<string, string> = {
      'meeting_purpose': 'غرض الاجتماع',
      'project_code': 'رمز المشروع',
      'department_code': 'رمز القسم',
      'client_name': 'اسم العميل',
      'vendor_name': 'اسم المورد',
      'invoice_number': 'رقم الفاتورة',
      'payment_method': 'طريقة الدفع',
    };

    return labelMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  }

  // Infer field type from common values
  private inferFieldType(values: any[]): FormField['type'] {
    if (!values.length) return 'text';

    const firstValue = values[0];
    
    if (typeof firstValue === 'number') return 'number';
    if (typeof firstValue === 'boolean') return 'checkbox';
    
    // Check if it looks like a date
    if (typeof firstValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstValue)) {
      return 'date';
    }
    
    // Check if it looks like an email
    if (typeof firstValue === 'string' && firstValue.includes('@')) {
      return 'email';
    }
    
    // If multiple distinct values, make it a select
    if (values.length > 2 && values.length < 10) {
      return 'select';
    }
    
    return 'text';
  }

  // Get description example for category
  private getDescriptionExample(categoryName: string): string {
    const examples: Record<string, string> = {
      'transport': 'رحلة عمل من الرياض إلى جدة',
      'تنقل': 'رحلة عمل من الرياض إلى جدة',
      'hospitality': 'عشاء عمل مع العميل الجديد',
      'ضيافة': 'عشاء عمل مع العميل الجديد',
      'communications': 'فاتورة اتصالات شهر يناير',
      'إتصالات': 'فاتورة اتصالات شهر يناير',
      'marketing': 'إعلان في صحيفة محلية',
      'دعاية': 'إعلان في صحيفة محلية',
      'office': 'شراء قرطاسية مكتبية',
      'مكتبية': 'شراء قرطاسية مكتبية',
    };

    return examples[categoryName.toLowerCase()] || 'وصف المصروف';
  }

  // Get form templates
  async getFormTemplates(categoryId?: string, isPopular?: boolean): Promise<FormTemplate[]> {
    try {
      let query = supabase
        .from('form_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (isPopular) {
        query = query.eq('is_popular', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get form templates failed:', error);
      return [];
    }
  }

  // Create template from submission
  async createTemplateFromSubmission(
    submissionId: string,
    templateName: string,
    templateDescription?: string
  ): Promise<FormTemplate | null> {
    try {
      const { data: submission } = await supabase
        .from('form_submissions')
        .select(`
          *,
          expense_item:expense_items(
            category_id,
            category:expense_categories(name)
          )
        `)
        .eq('id', submissionId)
        .single();

      if (!submission) return null;

      const template: Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'> = {
        name: templateName.toLowerCase().replace(/\s+/g, '_'),
        title: templateName,
        description: templateDescription,
        category_id: submission.expense_item.category_id,
        category_name: submission.expense_item.category.name,
        usage_count: 0,
        is_popular: false,
        is_featured: false,
        tags: this.generateTagsFromData(submission.data),
        template_data: this.extractTemplateData(submission.data),
        quick_actions: {
          duplicate: true,
          recurring: false,
          auto_categorize: true,
        },
        created_by: submission.user_id,
      };

      const { data, error } = await supabase
        .from('form_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create template from submission failed:', error);
      return null;
    }
  }

  // Extract template data from submission
  private extractTemplateData(submissionData: Record<string, any>): FormTemplate['template_data'] {
    const templateData: FormTemplate['template_data'] = {};

    // Extract common fields that are useful for templates
    const templateFields = ['description', 'merchant_name', 'notes', 'transport_type', 'meal_type', 'communication_type'];
    
    templateFields.forEach(field => {
      if (submissionData[field]) {
        templateData.common_fields = templateData.common_fields || {};
        templateData.common_fields[field] = submissionData[field];
      }
    });

    return templateData;
  }

  // Generate tags from submission data
  private generateTagsFromData(data: Record<string, any>): string[] {
    const tags: string[] = [];

    // Add tags based on field values
    Object.entries(data).forEach(([field, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        if (field.includes('type')) {
          tags.push(value);
        }
        if (field === 'merchant_name' && value) {
          tags.push('تاجر محدد');
        }
      }
    });

    // Add frequency tags
    if (Object.keys(data).length > 5) {
      tags.push('تفصيلي');
    } else {
      tags.push('بسيط');
    }

    return [...new Set(tags)];
  }

  // Use template to pre-fill form
  async applyTemplate(templateId: string): Promise<Record<string, any>> {
    try {
      const { data: template, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Increment usage count
      await supabase
        .from('form_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);

      return template.template_data.common_fields || {};
    } catch (error) {
      console.error('Apply template failed:', error);
      return {};
    }
  }

  // Validate form data
  async validateFormData(formId: string, data: Record<string, any>): Promise<{
    isValid: boolean;
    errors: { field: string; message: string }[];
  }> {
    try {
      const { data: form } = await supabase
        .from('dynamic_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (!form) {
        return { isValid: false, errors: [{ field: 'form', message: 'Form not found' }] };
      }

      const errors: { field: string; message: string }[] = [];

      form.fields.forEach((field: FormField) => {
        const value = data[field.name];

        // Check required fields
        if (field.required && (!value || value === '')) {
          errors.push({
            field: field.name,
            message: `${field.label} مطلوب`,
          });
          return;
        }

        // Skip validation if field is empty and not required
        if (!value && !field.required) return;

        // Validate based on field type and constraints
        if (field.validation) {
          const validation = field.validation;

          // Number validations
          if (field.type === 'number' || field.type === 'currency') {
            const numValue = Number(value);
            
            if (validation.min !== undefined && numValue < validation.min) {
              errors.push({
                field: field.name,
                message: `${field.label} يجب أن يكون أكبر من أو يساوي ${validation.min}`,
              });
            }
            
            if (validation.max !== undefined && numValue > validation.max) {
              errors.push({
                field: field.name,
                message: `${field.label} يجب أن يكون أقل من أو يساوي ${validation.max}`,
              });
            }
          }

          // String validations
          if (typeof value === 'string') {
            if (validation.minLength !== undefined && value.length < validation.minLength) {
              errors.push({
                field: field.name,
                message: `${field.label} يجب أن يكون ${validation.minLength} أحرف على الأقل`,
              });
            }
            
            if (validation.maxLength !== undefined && value.length > validation.maxLength) {
              errors.push({
                field: field.name,
                message: `${field.label} يجب أن يكون ${validation.maxLength} حرف كحد أقصى`,
              });
            }

            // Pattern validation
            if (validation.pattern) {
              const regex = new RegExp(validation.pattern);
              if (!regex.test(value)) {
                errors.push({
                  field: field.name,
                  message: `${field.label} بصيغة غير صحيحة`,
                });
              }
            }
          }
        }

        // Type-specific validations
        if (field.type === 'email' && typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push({
              field: field.name,
              message: `${field.label} يجب أن يكون بريد إلكتروني صحيح`,
            });
          }
        }

        if (field.type === 'tel' && typeof value === 'string') {
          const phoneRegex = /^[+]?[0-9\s\-()]{10,}$/;
          if (!phoneRegex.test(value)) {
            errors.push({
              field: field.name,
              message: `${field.label} يجب أن يكون رقم هاتف صحيح`,
            });
          }
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Validate form data failed:', error);
      return {
        isValid: false,
        errors: [{ field: 'form', message: 'Validation failed' }],
      };
    }
  }

  // Submit form data
  async submitFormData(
    formId: string,
    expenseItemId: string,
    userId: string,
    data: Record<string, any>,
    startTime: Date
  ): Promise<FormSubmission | null> {
    try {
      const validation = await this.validateFormData(formId, data);
      
      const submission: Omit<FormSubmission, 'id' | 'created_at'> = {
        form_id: formId,
        expense_item_id: expenseItemId,
        user_id: userId,
        data,
        validation_errors: validation.errors.map(e => e.message),
        auto_filled_fields: Object.keys(data).filter(key => data[key]?.autoFilled),
        completion_time_seconds: Math.round((Date.now() - startTime.getTime()) / 1000),
      };

      const { data: submissionData, error } = await supabase
        .from('form_submissions')
        .insert(submission)
        .select()
        .single();

      if (error) throw error;
      return submissionData;
    } catch (error) {
      console.error('Submit form data failed:', error);
      return null;
    }
  }

  // Get form analytics
  async getFormAnalytics(formId: string): Promise<FormAnalytics | null> {
    try {
      const { data, error } = await supabase.rpc('get_form_analytics', {
        p_form_id: formId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get form analytics failed:', error);
      return null;
    }
  }
}

export const dynamicFormsService = new DynamicFormsService();
export default dynamicFormsService;