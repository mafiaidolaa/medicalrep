/**
 * Error Handler المركزي
 * يعمل جنباً إلى جنب مع الكود الحالي بدون تعطيله
 */

import { NextResponse } from 'next/server';
import { AppError } from './app-errors';
import { z } from 'zod';

interface ErrorLogEntry {
  timestamp: string;
  endpoint: string;
  method: string;
  userId?: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    statusCode: number;
  };
}

// تسجيل الأخطاء بشكل منظم
function logError(entry: ErrorLogEntry) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 [ERROR LOG]');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('📍 Endpoint:', entry.endpoint);
    console.error('🔧 Method:', entry.method);
    console.error('👤 User ID:', entry.userId || 'Anonymous');
    console.error('❌ Error:', entry.error.name);
    console.error('💬 Message:', entry.error.message);
    if (entry.error.stack) {
      console.error('📚 Stack:', entry.error.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    // في الإنتاج: log مختصر
    console.error('[ERROR]', JSON.stringify({
      endpoint: entry.endpoint,
      error: entry.error.name,
      message: entry.error.message,
      userId: entry.userId
    }));
  }
  
  // TODO: يمكن إرسال لـ Sentry هنا
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(entry);
  // }
}

// معرف فريد للخطأ (لتتبع المشاكل)
function generateErrorId(): string {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Supabase Error Codes Mapping
const SUPABASE_ERROR_MAP: Record<string, { message: string; status: number }> = {
  '23505': { message: 'البيانات موجودة مسبقاً (Duplicate)', status: 409 },
  '23503': { message: 'بيانات مرتبطة بسجلات أخرى (Foreign Key)', status: 409 },
  '23502': { message: 'حقل مطلوب مفقود (Not Null Violation)', status: 400 },
  'PGRST116': { message: 'لم يتم العثور على السجل', status: 404 },
  'PGRST204': { message: 'لا توجد نتائج', status: 404 },
  '42P01': { message: 'الجدول غير موجود', status: 500 },
  '42703': { message: 'العمود غير موجود', status: 500 },
};

/**
 * Error Handler الرئيسي
 * يمكن استخدامه في أي API route
 */
export function handleError(
  error: any,
  req: { url: string; method: string },
  userId?: string
): NextResponse {
  
  const errorId = generateErrorId();
  
  // تسجيل الخطأ
  logError({
    timestamp: new Date().toISOString(),
    endpoint: req.url,
    method: req.method,
    userId,
    error: {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      statusCode: error.statusCode || 500
    }
  });
  
  // معالجة Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: 'بيانات غير صالحة',
      errorId,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    }, { status: 400 });
  }
  
  // معالجة AppError (الأخطاء المخصصة)
  if (error instanceof AppError) {
    return NextResponse.json({
      error: error.message,
      errorId,
      details: error.details
    }, { status: error.statusCode });
  }
  
  // معالجة Supabase/PostgreSQL errors
  if (error.code && typeof error.code === 'string') {
    const mapped = SUPABASE_ERROR_MAP[error.code];
    if (mapped) {
      return NextResponse.json({
        error: mapped.message,
        errorId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: mapped.status });
    }
  }
  
  // خطأ عام (fallback)
  const isDevelopment = process.env.NODE_ENV === 'development';
  return NextResponse.json({
    error: 'حدث خطأ في الخادم',
    errorId,
    message: isDevelopment ? error.message : 'يرجى المحاولة لاحقاً أو الاتصال بالدعم'
  }, { status: error.statusCode || 500 });
}

/**
 * Helper: التحقق من أن الخطأ قابل للإعادة (retryable)
 */
export function isRetryableError(error: any): boolean {
  const retryableErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'ECONNRESET',
    'fetch failed',
    'network error'
  ];

  const errorString = String(error.message || error).toLowerCase();
  return retryableErrors.some(retryError => 
    errorString.includes(retryError.toLowerCase())
  );
}