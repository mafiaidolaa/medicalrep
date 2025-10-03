import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// إعداد Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const region = searchParams.get('region');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = supabase
      .from('sales_representatives')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // تطبيق الفلاتر
    if (activeOnly) {
      query = query.eq('status', 'active');
    } else if (status) {
      query = query.eq('status', status);
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (region) {
      query = query.eq('region', region);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,rep_code.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // تطبيق التصفح
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching representatives:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // إضافة رؤوس للتصفح
    const response = NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: to < (count || 0) - 1,
        hasPrevious: page > 1
      }
    });

    response.headers.set('X-Total-Count', (count || 0).toString());
    return response;

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      rep_code,
      name,
      phone,
      email,
      department,
      region,
      commission_rate = 0,
      target_amount = 0
    } = body;

    // التحقق من البيانات المطلوبة
    if (!name || !rep_code) {
      return NextResponse.json(
        { error: 'الاسم وكود المندوب مطلوبان' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود كود المندوب مسبقاً
    const { data: existingRep } = await supabase
      .from('sales_representatives')
      .select('id')
      .eq('rep_code', rep_code)
      .single();

    if (existingRep) {
      return NextResponse.json(
        { error: 'كود المندوب موجود مسبقاً' },
        { status: 400 }
      );
    }

    // إنشاء المندوب الجديد
    const { data, error } = await supabase
      .from('sales_representatives')
      .insert([{
        rep_code,
        name,
        phone,
        email,
        department,
        region,
        commission_rate,
        target_amount,
        current_sales: 0,
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating representative:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// دالة مساعدة لتوليد كود مندوب جديد
export async function generateRepCode(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('sales_representatives')
      .select('rep_code')
      .like('rep_code', 'R%')
      .order('rep_code', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastCode = data[0].rep_code;
      const lastNumber = parseInt(lastCode.replace('R', ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `R${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating rep code:', error);
    // fallback to timestamp-based code
    return `R${Date.now().toString().slice(-3)}`;
  }
}