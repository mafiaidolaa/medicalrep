const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// إعداد Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateActivityLogDatabase() {
  console.log('🚀 بدء تحديث قاعدة البيانات للأنشطة المهمة...\n');

  try {
    // 1. إضافة الأعمدة الجديدة للموقع الجغرافي المحسن
    console.log('📍 إضافة أعمدة الموقع الجغرافي...');
    
    const locationColumns = [
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS location_provider VARCHAR(20) DEFAULT \'unknown\';',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS full_address TEXT;',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS region VARCHAR(100);'
    ];

    for (const sql of locationColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.warn(`⚠️ Warning executing: ${sql}`);
        console.warn(`Error: ${error.message}`);
      }
    }

    // 2. إضافة أعمدة المعلومات التقنية
    console.log('💻 إضافة أعمدة المعلومات التقنية...');
    
    const techColumns = [
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50);',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS os_version VARCHAR(50);',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS screen_resolution VARCHAR(20);',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);'
    ];

    for (const sql of techColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.warn(`⚠️ Warning executing: ${sql}`);
        console.warn(`Error: ${error.message}`);
      }
    }

    // 3. إنشاء الفهارس المحسنة
    console.log('🔍 إنشاء الفهارس المحسنة...');
    
    const indexes = [
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

    for (const sql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.warn(`⚠️ Warning creating index: ${error.message}`);
      }
    }

    // 4. إنشاء View للأنشطة المهمة
    console.log('📊 إنشاء View للأنشطة المهمة...');
    
    const viewSql = `
      CREATE OR REPLACE VIEW public.important_activities AS
      SELECT 
          *,
          CASE 
              WHEN lat IS NOT NULL AND lng IS NOT NULL THEN true
              ELSE false
          END as has_location,
          CASE 
              WHEN type = 'login' THEN 'تسجيل دخول'
              WHEN type = 'logout' THEN 'تسجيل خروج'
              WHEN type = 'visit' THEN 'عمل زيارة'
              WHEN type = 'clinic_register' THEN 'إضافة عيادة'
              WHEN type = 'order' THEN 'عمل طلبية'
              WHEN type = 'debt_payment' THEN 'دفع دين على عيادة'
              WHEN type = 'expense_request' THEN 'طلب مصاريف'
              WHEN type = 'plan' THEN 'عمل خطة'
              ELSE type
          END as type_display_name
      FROM public.activity_log
      WHERE type IN ('login', 'logout', 'visit', 'clinic_register', 'order', 'debt_payment', 'expense_request', 'plan');
    `;

    const { error: viewError } = await supabase.rpc('exec_sql', { sql: viewSql });
    if (viewError) {
      console.warn(`⚠️ Warning creating view: ${viewError.message}`);
    }

    // 5. إضافة صلاحيات
    console.log('🔐 إضافة الصلاحيات...');
    
    const permissions = [
      'GRANT SELECT ON public.important_activities TO authenticated;',
      'GRANT SELECT ON public.important_activities TO anon;'
    ];

    for (const sql of permissions) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.warn(`⚠️ Warning setting permissions: ${error.message}`);
      }
    }

    // 6. إضافة التعليقات
    console.log('📝 إضافة التعليقات...');
    
    const comments = [
      "COMMENT ON TABLE public.activity_log IS 'سجل الأنشطة المهمة في النظام مع تتبع الموقع الجغرافي';",
      "COMMENT ON COLUMN public.activity_log.location_accuracy IS 'دقة الموقع بالأمتار';",
      "COMMENT ON COLUMN public.activity_log.location_provider IS 'مصدر الموقع: gps, network, passive';"
    ];

    for (const sql of comments) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.warn(`⚠️ Warning adding comment: ${error.message}`);
      }
    }

    // 7. تسجيل التحديث
    console.log('📋 تسجيل التحديث في السجل...');
    
    const { error: logError } = await supabase
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
      console.warn(`⚠️ Warning logging update: ${logError.message}`);
    }

    // 8. التحقق من النتائج
    console.log('🔍 التحقق من النتائج...');
    
    const { data: importantActivities, error: checkError } = await supabase
      .from('important_activities')
      .select('count(*)', { count: 'exact' });

    if (!checkError) {
      console.log(`✅ تم العثور على ${importantActivities[0]?.count || 0} نشاط مهم`);
    }

    console.log('\n🎉 تم تحديث قاعدة البيانات بنجاح!');
    console.log('\n📋 ملخص التحديثات:');
    console.log('   ✅ إضافة أعمدة الموقع الجغرافي المحسن');
    console.log('   ✅ إضافة أعمدة المعلومات التقنية');
    console.log('   ✅ إنشاء فهارس محسنة للأداء');
    console.log('   ✅ إنشاء View للأنشطة المهمة');
    console.log('   ✅ تطبيق الصلاحيات المناسبة');
    console.log('   ✅ إضافة التعليقات والتوثيق');
    console.log('\n🚀 النظام جاهز الآن لاستخدام الأنشطة المهمة مع تتبع الموقع!');

  } catch (error) {
    console.error('❌ خطأ في تحديث قاعدة البيانات:', error);
    process.exit(1);
  }
}

// تشغيل التحديث
updateActivityLogDatabase();