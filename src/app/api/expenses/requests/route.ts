import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-logger';
import { isDev, getDevUser } from '@/lib/dev-config';

// الحصول على طلبات النفقات
export async function GET(request: NextRequest) {
  try {
    // في بيئة التطوير، إرجاع بيانات تجريبية فوراً
    if (isDev()) {
      const mockData = [
        {
          id: 'dev-req-1',
          request_number: 'EXP-DEV-001',
          user_id: 'dev-user-123',
          employee_name: 'مطور النظام',
          department: 'التطوير',
          amount: 500,
          status: 'pending',
          expense_date: new Date().toISOString().split('T')[0],
          description: 'طلب مصروفات تجريبي',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expense_categories: {
            id: '1',
            name: 'مواصلات',
            name_ar: 'مواصلات',
            name_en: 'Transportation'
          },
          users: {
            id: 'dev-user-123',
            full_name: 'مطور النظام',
            username: 'dev-user',
            role: 'admin'
          }
        }
      ];
      
      return NextResponse.json(mockData);
    }
    
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // الحصول على بيانات المستخدم وصلاحياته
    const { data: profile } = await supabase
      .from('users')
      .select('role, manager_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'ملف المستخدم غير موجود' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('expense_requests')
      .select(`
        *,
        expense_categories (
          id,
          name,
          name_ar,
          name_en,
          icon,
          color
        ),
        users!expense_requests_user_id_fkey (
          id,
          full_name,
          username,
          role
        )
      `);

    // تحديد الطلبات التي يمكن للمستخدم رؤيتها
    switch (profile.role) {
      case 'admin':
      case 'accounting':
        // المدير والمحاسب يرون كل الطلبات
        break;
      case 'manager':
        // المدير يرى طلبات فريقه فقط
        query = query.or(`user_id.eq.${user.id},manager_approved_by.eq.${user.id}`);
        break;
      default:
        // المستخدم العادي يرى طلباته فقط
        query = query.eq('user_id', user.id);
    }

    // فلترة حسب المعايير
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (status) {
      query = query.eq('status', status);
    }
    if (userId && (profile.role === 'admin' || profile.role === 'accounting')) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data: requests, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expense requests:', error);
      return NextResponse.json(
        { error: 'فشل في جلب طلبات النفقات' },
        { status: 500 }
      );
    }

    return NextResponse.json(requests || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// إنشاء طلب نفقة جديد
export async function POST(request: NextRequest) {
  try {
    // في بيئة التطوير، محاكاة إنشاء طلب جديد
    if (isDev()) {
      const body = await request.json();
      
      const mockResponse = {
        id: `dev-req-${Date.now()}`,
        request_number: `EXP-DEV-${Date.now()}`,
        user_id: 'dev-user-123',
        employee_name: 'مطور النظام',
        amount: body.amount || 100,
        status: 'pending',
        expense_date: body.expense_date || new Date().toISOString().split('T')[0],
        description: body.description || 'طلب تجريبي',
        notes: body.notes || '',
        currency: 'EGP',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expense_categories: {
          id: body.category_id || '1',
          name: 'مواصلات',
          name_ar: 'مواصلات',
          name_en: 'Transportation'
        }
      };
      
      return NextResponse.json(mockResponse, { status: 201 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // التحقق من صحة البيانات
    const body = await request.json();
    const { category_id, amount, description, notes, expense_date, receipt_image } = body;

    if (!category_id || !amount || !expense_date) {
      return NextResponse.json(
        { error: 'البيانات المطلوبة مفقودة' },
        { status: 400 }
      );
    }

    // التحقق من صحة المبلغ
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'المبلغ يجب أن يكون أكبر من صفر' },
        { status: 400 }
      );
    }

    // التحقق من الحد الأقصى للمبلغ (optional)
    const maxAmount = 10000; // default max amount
    if (numericAmount > maxAmount) {
      return NextResponse.json(
        { error: `المبلغ يتجاوز الحد الأقصى المسموح: ${maxAmount} جنيه` },
        { status: 400 }
      );
    }

    // إنشاء الطلب الجديد
    const { data: newRequest, error } = await supabase
      .from('expense_requests')
      .insert([
        {
          user_id: user.id,
          category_id,
          amount: numericAmount,
          description: description || null,
          notes: notes || null,
          expense_date,
          receipt_image: receipt_image || null,
        }
      ])
      .select(`
        *,
        expense_categories (
          id,
          name,
          name_ar,
          name_en,
          icon,
          color
        ),
        users!expense_requests_user_id_fkey (
          id,
          full_name,
          username
        )
      `)
      .single();

    if (error) {
      console.error('Error creating expense request:', error);
      return NextResponse.json(
        { error: 'فشل في إنشاء طلب النفقة' },
        { status: 500 }
      );
    }

    // تسجيل النشاط
    await logActivity({
      action: 'create_expense_request',
      entity_type: 'expense_request',
      entity_id: newRequest.id,
      title: `طلب نفقة جديد`,
      details: `تم إنشاء طلب نفقة جديد بمبلغ ${numericAmount} جنيه`,
      type: 'create'
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
