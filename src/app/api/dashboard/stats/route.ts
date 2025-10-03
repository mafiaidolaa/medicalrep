import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/dashboard/stats - إحصائيات مباشرة من قاعدة البيانات
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // جميع الاستعلامات بشكل مباشر بدون كاش
    const [
      usersResult,
      clinicsResult,
      productsResult,
      visitsResult,
      ordersResult,
      expensesResult
    ] = await Promise.all([
      // عدد المستخدمين النشطين
      (supabase as any)
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null),
        
      // عدد العيادات النشطة
      (supabase as any)
        .from('clinics')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null),
        
      // عدد المنتجات
      (supabase as any)
        .from('products')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
        
      // عدد الزيارات
      (supabase as any)
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
        
      // عدد الطلبات
      (supabase as any)
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
        
      // عدد المصروفات
      (supabase as any)
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
    ]);

    // التحقق من الأخطاء
    const errors = [
      usersResult.error,
      clinicsResult.error,
      productsResult.error,
      visitsResult.error,
      ordersResult.error,
      expensesResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Database errors in stats:', errors);
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: 'خطأ في قاعدة البيانات أثناء جلب الإحصائيات',
          errors: errors.map(e => e?.message)
        }, 
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    const stats = {
      usersCount: usersResult.count || 0,
      clinicsCount: clinicsResult.count || 0,
      productsCount: productsResult.count || 0,
      visitsCount: visitsResult.count || 0,
      ordersCount: ordersResult.count || 0,
      expensesCount: expensesResult.count || 0,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'خطأ داخلي في الخادم' 
      }, 
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}