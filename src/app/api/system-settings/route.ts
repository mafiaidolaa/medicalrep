import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { microCache } from '@/lib/micro-cache';

// GET: قراءة الإعدادات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Dev micro-cache to reduce repeated DB hits during navigation
    const devCacheTtl = process.env.NODE_ENV === 'development' ? 10 * 1000 : 0;
    const cacheKey = `system-settings:${key || 'all'}`;
    if (devCacheTtl > 0) {
      const cached = microCache.get<any>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' }
        });
      }
    }
    
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('system_settings')
      .select('setting_key, setting_value, updated_at')
      .eq('is_public', true);
    
    if (key) {
      query = query.eq('setting_key', key);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        error: 'فشل في قراءة الإعدادات',
        details: error.message
      }, { status: 500 });
    }
    
    console.log(`✅ Successfully fetched settings:`, data?.map(d => d.setting_key));
    const payload = { data };

    if (devCacheTtl > 0) {
      microCache.set(cacheKey, payload, devCacheTtl);
    }

    return NextResponse.json(payload);
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'خطأ في الخادم',
      details: error.message
    }, { status: 500 });
  }
}

// POST/PUT: تحديث الإعدادات
export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        error: 'غير مصرح لك بتنفيذ هذا الإجراء'
      }, { status: 401 });
    }
    
    const { setting_key, setting_value } = await request.json();
    
    if (!setting_key || !setting_value) {
      return NextResponse.json({
        error: 'بيانات غير مكتملة',
        details: 'setting_key و setting_value مطلوبان'
      }, { status: 400 });
    }
    
    console.log(`🔄 Updating setting: ${setting_key}`, setting_value);
    
    const supabase = createServerSupabaseClient();
    
    // محاولة التحديث أولاً
    const { data: updateData, error: updateError } = await supabase
      .from('system_settings')
      .update({
        setting_value: setting_value,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', setting_key)
      .eq('is_public', true)
      .select();
    
    // إذا لم يتم العثور على السجل، قم بإنشاء واحد جديد
    if (!updateData || updateData.length === 0) {
      console.log(`📝 Creating new setting record for: ${setting_key}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('system_settings')
        .insert({
          setting_key,
          setting_value,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({
          error: 'فشل في إنشاء الإعداد الجديد',
          details: insertError.message
        }, { status: 500 });
      }
      
      console.log(`✅ Successfully created new setting: ${setting_key}`);
      return NextResponse.json({ 
        success: true, 
        data: insertData[0],
        message: `تم إنشاء إعداد ${setting_key} بنجاح`
      });
    }
    
    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({
        error: 'فشل في تحديث الإعداد',
        details: updateError.message
      }, { status: 500 });
    }
    
    console.log(`✅ Successfully updated setting: ${setting_key}`);
    return NextResponse.json({ 
      success: true, 
      data: updateData[0],
      message: `تم تحديث إعداد ${setting_key} بنجاح`
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'خطأ في الخادم',
      details: error.message
    }, { status: 500 });
  }
}

// PUT: نفس وظيفة POST للراحة
export async function PUT(request: NextRequest) {
  return POST(request);
}