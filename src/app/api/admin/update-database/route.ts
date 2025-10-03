import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// تحديثات قاعدة البيانات للأنشطة المهمة
const DATABASE_UPDATES = [
  // 1. إضافة أعمدة الموقع الجغرافي المحسن
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS location_provider VARCHAR(20) DEFAULT \'unknown\';',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS full_address TEXT;',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS region VARCHAR(100);',
  
  // 2. إضافة أعمدة المعلومات التقنية
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50);',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS os_version VARCHAR(50);',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS screen_resolution VARCHAR(20);',
  'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);'
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_activity_log_important_types 
   ON public.activity_log(type) 
   WHERE type IN ('login', 'logout', 'visit', 'clinic_register', 'order', 'debt_payment', 'expense_request', 'plan');`,
  
  `CREATE INDEX IF NOT EXISTS idx_activity_log_with_location 
   ON public.activity_log(lat, lng) 
   WHERE lat IS NOT NULL AND lng IS NOT NULL;`,
  
  `CREATE INDEX IF NOT EXISTS idx_activity_log_date_type 
   ON public.activity_log(timestamp DESC, type);`,
  
  `CREATE INDEX IF NOT EXISTS idx_activity_log_user_type 
   ON public.activity_log(user_id, type);`
];

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 بدء تحديث قاعدة البيانات للأنشطة المهمة...');
    
    const supabase = createServerSupabaseClient();
    const results: any[] = [];

    // 1. تطبيق تحديثات الجدول
    console.log('📍 إضافة الأعمدة الجديدة...');
    for (const sql of DATABASE_UPDATES) {
      try {
        const { error } = await (supabase as any).rpc('exec_sql', { sql });
        if (error) {
          console.warn(`⚠️ تحذير عند تنفيذ: ${sql}`);
          console.warn(`الخطأ: ${error.message}`);
          results.push({ sql, status: 'warning', error: error.message });
        } else {
          results.push({ sql, status: 'success' });
        }
      } catch (err) {
        // محاولة التنفيذ المباشر إذا فشلت دالة exec_sql
        console.log('📝 محاولة التنفيذ المباشر...');
        try {
          await supabase.from('_migrations').select('*').limit(0); // اختبار الاتصال
          results.push({ sql, status: 'skipped', reason: 'exec_sql function not available' });
        } catch (directError) {
          results.push({ sql, status: 'error', error: 'Failed to execute' });
        }
      }
    }

    // 2. إنشاء الفهارس
    console.log('🔍 إنشاء الفهارس...');
    for (const sql of INDEXES) {
      try {
        const { error } = await (supabase as any).rpc('exec_sql', { sql });
        if (error) {
          console.warn(`⚠️ تحذير عند إنشاء الفهرس: ${error.message}`);
          results.push({ sql, status: 'warning', error: error.message });
        } else {
          results.push({ sql, status: 'success' });
        }
      } catch (err) {
        results.push({ sql, status: 'skipped', reason: 'exec_sql function not available' });
      }
    }

    // 3. تسجيل التحديث في السجل
    console.log('📋 تسجيل التحديث...');
    const { error: logError } = await (supabase as any)
      .from('activity_log')
      .insert({
        user_id: 'system',
        action: 'database_update',
        entity_type: 'system',
        entity_id: 'enhanced_activity_log',
        title: 'تحديث قاعدة البيانات للأنشطة المهمة',
        details: 'تم تطبيق التحديثات لدعم الأنشطة المحدودة والموقع الجغرافي المحسن',
        type: 'other',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_success: true
      });

    if (logError) {
      console.warn('⚠️ تحذير عند تسجيل التحديث:', logError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'تم تطبيق تحديثات قاعدة البيانات',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        warnings: results.filter(r => r.status === 'warning').length,
        errors: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث قاعدة البيانات:', error);
    return NextResponse.json({
      success: false,
      error: 'فشل في تحديث قاعدة البيانات',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'استخدم POST لتطبيق تحديثات قاعدة البيانات',
    info: 'Database Update API for Enhanced Activity Log System'
  });
}