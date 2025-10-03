// نظام معالجة أخطاء قاعدة البيانات المتقدم
import { PostgrestError } from '@supabase/supabase-js';

// أنواع الأخطاء المختلفة
export enum DatabaseErrorType {
  NULL_CONSTRAINT = 'null_constraint_violation',
  FOREIGN_KEY = 'foreign_key_violation',
  UNIQUE_CONSTRAINT = 'unique_violation',
  CHECK_CONSTRAINT = 'check_violation',
  CONNECTION_ERROR = 'connection_error',
  TIMEOUT_ERROR = 'timeout_error',
  PERMISSION_ERROR = 'insufficient_privilege',
  DATA_TYPE_ERROR = 'invalid_text_representation',
  UNKNOWN_ERROR = 'unknown_error'
}

// واجهة تفاصيل الخطأ المحسّنة
export interface DatabaseErrorDetails {
  type: DatabaseErrorType;
  originalError: any;
  message: string;
  table?: string;
  column?: string;
  constraint?: string;
  suggestion?: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// معالج الأخطاء الذكي
export class DatabaseErrorHandler {
  // تحليل وتصنيف الخطأ
  static analyzeError(error: any): DatabaseErrorDetails {
    // معالجة أخطاء Supabase/PostgreSQL
    if (error?.code) {
      return this.handlePostgresError(error);
    }
    
    // معالجة أخطاء الشبكة
    if (error?.message?.includes('fetch')) {
      return {
        type: DatabaseErrorType.CONNECTION_ERROR,
        originalError: error,
        message: 'فشل في الاتصال بقاعدة البيانات',
        suggestion: 'تحقق من اتصال الإنترنت وحاول مرة أخرى',
        retryable: true,
        severity: 'medium'
      };
    }
    
    // أخطاء غير معروفة
    return {
      type: DatabaseErrorType.UNKNOWN_ERROR,
      originalError: error,
      message: error?.message || 'خطأ غير معروف في قاعدة البيانات',
      suggestion: 'تحقق من سجلات النظام أو اتصل بالدعم التقني',
      retryable: false,
      severity: 'high'
    };
  }
  
  // معالجة أخطاء PostgreSQL المحددة
  private static handlePostgresError(error: PostgrestError | any): DatabaseErrorDetails {
    const code = error.code;
    const message = error.message || '';
    
    switch (code) {
      case '23502': // NOT NULL violation
        return this.handleNullConstraintError(error);
        
      case '23503': // Foreign key violation
        return this.handleForeignKeyError(error);
        
      case '23505': // Unique violation
        return this.handleUniqueConstraintError(error);
        
      case '23514': // Check constraint violation
        return this.handleCheckConstraintError(error);
        
      case '42501': // Insufficient privilege
        return {
          type: DatabaseErrorType.PERMISSION_ERROR,
          originalError: error,
          message: 'ليس لديك صلاحية للقيام بهذا الإجراء',
          suggestion: 'تواصل مع مدير النظام للحصول على الصلاحيات اللازمة',
          retryable: false,
          severity: 'high'
        };
        
      case '22P02': // Invalid text representation
        return {
          type: DatabaseErrorType.DATA_TYPE_ERROR,
          originalError: error,
          message: 'نوع البيانات المدخل غير صحيح',
          suggestion: 'تحقق من صحة البيانات المدخلة والتنسيق المطلوب',
          retryable: false,
          severity: 'medium'
        };
        
      default:
        return {
          type: DatabaseErrorType.UNKNOWN_ERROR,
          originalError: error,
          message: `خطأ في قاعدة البيانات: ${message}`,
          suggestion: 'راجع سجلات النظام للمزيد من التفاصيل',
          retryable: false,
          severity: 'high'
        };
    }
  }
  
  // معالجة خطأ NULL constraint
  private static handleNullConstraintError(error: any): DatabaseErrorDetails {
    const message = error.message || '';
    const match = message.match(/null value in column "([^"]+)"/);
    const column = match ? match[1] : 'unknown';
    
    // معالجة خاصة لعمود entity_id
    if (column === 'entity_id') {
      return {
        type: DatabaseErrorType.NULL_CONSTRAINT,
        originalError: error,
        message: 'معرف الكيان مطلوب ولا يمكن أن يكون فارغاً',
        table: this.extractTableFromError(message),
        column: 'entity_id',
        constraint: 'entity_id_not_null',
        suggestion: 'تأكد من تمرير معرف صحيح للكيان المطلوب تسجيل نشاطه',
        retryable: true,
        severity: 'medium'
      };
    }
    
    return {
      type: DatabaseErrorType.NULL_CONSTRAINT,
      originalError: error,
      message: `القيمة مطلوبة في العمود: ${column}`,
      table: this.extractTableFromError(message),
      column,
      suggestion: `تأكد من تمرير قيمة صحيحة للعمود ${column}`,
      retryable: true,
      severity: 'medium'
    };
  }
  
  // معالجة خطأ Foreign Key
  private static handleForeignKeyError(error: any): DatabaseErrorDetails {
    const message = error.message || '';
    
    return {
      type: DatabaseErrorType.FOREIGN_KEY,
      originalError: error,
      message: 'مرجع خارجي غير موجود أو غير صحيح',
      table: this.extractTableFromError(message),
      suggestion: 'تأكد من وجود السجل المرجعي في الجدول ذي الصلة',
      retryable: false,
      severity: 'high'
    };
  }
  
  // معالجة خطأ Unique constraint
  private static handleUniqueConstraintError(error: any): DatabaseErrorDetails {
    const message = error.message || '';
    
    return {
      type: DatabaseErrorType.UNIQUE_CONSTRAINT,
      originalError: error,
      message: 'القيمة المدخلة موجودة مسبقاً',
      table: this.extractTableFromError(message),
      suggestion: 'استخدم قيمة فريدة أو قم بتحديث السجل الموجود',
      retryable: false,
      severity: 'medium'
    };
  }
  
  // معالجة خطأ Check constraint
  private static handleCheckConstraintError(error: any): DatabaseErrorDetails {
    const message = error.message || '';
    
    return {
      type: DatabaseErrorType.CHECK_CONSTRAINT,
      originalError: error,
      message: 'البيانات المدخلة لا تلبي شروط التحقق',
      table: this.extractTableFromError(message),
      suggestion: 'تأكد من أن البيانات تلبي جميع القيود والشروط المطلوبة',
      retryable: true,
      severity: 'medium'
    };
  }
  
  // استخراج اسم الجدول من رسالة الخطأ
  private static extractTableFromError(message: string): string | undefined {
    const tableMatch = message.match(/relation "([^"]+)"/);
    return tableMatch ? tableMatch[1] : undefined;
  }
  
  // تسجيل الخطأ مع التفاصيل
  static logError(errorDetails: DatabaseErrorDetails, context?: Record<string, any>) {
    const logLevel = this.getLogLevel(errorDetails.severity);
    const logMessage = {
      timestamp: new Date().toISOString(),
      type: errorDetails.type,
      message: errorDetails.message,
      table: errorDetails.table,
      column: errorDetails.column,
      constraint: errorDetails.constraint,
      suggestion: errorDetails.suggestion,
      retryable: errorDetails.retryable,
      severity: errorDetails.severity,
      context: context || {},
      originalError: errorDetails.originalError
    };
    
    console[logLevel]('Database Error:', JSON.stringify(logMessage, null, 2));
    
    // يمكن إضافة إرسال إلى خدمة monitoring خارجية هنا
    if (errorDetails.severity === 'critical') {
      this.alertCriticalError(errorDetails, context);
    }
  }
  
  // تحديد مستوى السجل
  private static getLogLevel(severity: string): 'error' | 'warn' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'info';
    }
  }
  
  // تنبيه للأخطاء الحرجة
  private static alertCriticalError(errorDetails: DatabaseErrorDetails, context?: Record<string, any>) {
    // يمكن تنفيذ إرسال تنبيهات للمطورين هنا
    // مثل: Slack, Email, SMS, إلخ
    console.error('🚨 CRITICAL DATABASE ERROR DETECTED 🚨');
    console.error('Details:', errorDetails);
    console.error('Context:', context);
  }
  
  // إعادة المحاولة مع backoff تدريجي
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorDetails = this.analyzeError(error);
        
        // لا تعيد المحاولة إذا كان الخطأ غير قابل للإعادة
        if (!errorDetails.retryable) {
          this.logError(errorDetails, { attempt: attempt + 1, maxRetries });
          throw error;
        }
        
        // آخر محاولة
        if (attempt === maxRetries - 1) {
          this.logError(errorDetails, { 
            attempt: attempt + 1, 
            maxRetries,
            finalAttempt: true 
          });
          break;
        }
        
        // انتظار تدريجي قبل إعادة المحاولة
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Database operation failed, retrying in ${delay}ms... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  // معالجة معاملة database مع معالجة الأخطاء
  static async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<{ data: T | null; error: DatabaseErrorDetails | null }> {
    try {
      const data = await operation();
      return { data, error: null };
    } catch (error) {
      const errorDetails = this.analyzeError(error);
      this.logError(errorDetails, context);
      return { data: null, error: errorDetails };
    }
  }
}

// دوال مساعدة للاستخدام السريع
export const analyzeDbError = DatabaseErrorHandler.analyzeError;
export const logDbError = DatabaseErrorHandler.logError;
export const retryDbOperation = DatabaseErrorHandler.retryOperation;
export const executeWithErrorHandling = DatabaseErrorHandler.executeWithErrorHandling;