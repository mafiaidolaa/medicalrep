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
    const status = searchParams.get('status');
    const customerType = searchParams.get('customer_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // تطبيق الفلاتر
    if (activeOnly) {
      query = query.eq('status', 'active');
    } else if (status) {
      query = query.eq('status', status);
    }

    if (customerType) {
      query = query.eq('customer_type', customerType);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,customer_code.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // تطبيق التصفح
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
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
      customer_code,
      name,
      phone,
      email,
      address,
      tax_number,
      credit_limit = 0,
      customer_type = 'regular'
    } = body;

    // التحقق من البيانات المطلوبة
    if (!name || !customer_code) {
      return NextResponse.json(
        { error: 'الاسم وكود العميل مطلوبان' },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود كود العميل مسبقاً
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('customer_code', customer_code)
      .single();

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'كود العميل موجود مسبقاً' },
        { status: 400 }
      );
    }

    // إنشاء العميل الجديد
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        customer_code,
        name,
        phone,
        email,
        address,
        tax_number,
        credit_limit,
        balance: 0,
        status: 'active',
        customer_type,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
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

// دالة مساعدة لتوليد كود عميل جديد
export async function generateCustomerCode(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('customer_code')
      .like('customer_code', 'C%')
      .order('customer_code', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastCode = data[0].customer_code;
      const lastNumber = parseInt(lastCode.replace('C', ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `C${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating customer code:', error);
    // fallback to timestamp-based code
    return `C${Date.now().toString().slice(-3)}`;
  }
}