import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * 💸 Expenses API - Direct Database Operations with Soft Delete Support
 * - Direct database operations (no cache)
 * - Full soft delete functionality
 * - Real-time data consistency
 */

// GET /api/expenses - List expenses with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const id = url.searchParams.get('id');
    const category = url.searchParams.get('category');
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabase = createServerSupabaseClient();
    
    console.log(`🔍 Fetching expenses from DB - Direct query`);
    
    // Build query with soft delete filtering
    let query = supabase
      .from('expenses')
      .select(`
        id,
        category,
        amount,
        description,
        expense_date,
        receipt_url,
        status,
        created_at,
        updated_at,
        deleted_at,
        deleted_by
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    query = query.order('expense_date', { ascending: false });

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (category) {
        query = query.eq('category', category);
      }
      if (q) {
        query = query.or(`description.ilike.%${q}%,category.ilike.%${q}%`);
      }
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ GET /api/expenses error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error', code: 'EXPENSES_FETCH_ERROR' }, 
        { status: 500 }
      );
    }

    console.log(`✅ Expenses retrieved: ${data?.length || 0} records`);

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': (data?.length || 0).toString()
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/expenses exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'EXPENSES_FETCH_ERROR' }, 
      { status: 500 }
    );
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📝 POST /api/expenses - Creating new expense');
    
    const body = await request.json();
    console.log('Received body:', body);

    // Validation
    const category = String(body.category || '').trim();
    const amount = Number(body.amount || 0);
    const description = String(body.description || '').trim();
    const expense_date = body.expense_date || new Date().toISOString();

    if (!category) {
      return NextResponse.json({
        error: 'فشل إنشاء المصروف',
        details: 'فئة المصروف مطلوبة'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        error: 'فشل إنشاء المصروف',
        details: 'المبلغ يجب أن يكون أكبر من صفر'
      }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({
        error: 'فشل إنشاء المصروف',
        details: 'وصف المصروف مطلوب'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const payload: any = {
      id: body.id || undefined,
      category,
      amount,
      description,
      expense_date,
      receipt_url: body.receipt_url || null,
      status: body.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await (supabase as any)
      .from('expenses')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        error: 'فشل إنشاء المصروف',
        details: error.message,
        code: error.code,
        hint: (error as any).hint
      }, { status: 500 });
    }

    console.log('✅ Expense created successfully:', data);
    
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('POST /api/expenses exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// PUT /api/expenses - Update existing expense
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/expenses - Updating expense');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف المصروف مطلوب',
        details: 'يجب تحديد معرف المصروف للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.category) payload.category = updateData.category.trim();
    if (updateData.amount !== undefined) payload.amount = Number(updateData.amount);
    if (updateData.description) payload.description = updateData.description.trim();
    if (updateData.expense_date) payload.expense_date = updateData.expense_date;
    if (updateData.receipt_url !== undefined) payload.receipt_url = updateData.receipt_url;
    if (updateData.status) payload.status = updateData.status;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted expenses
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث المصروف',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'المصروف غير موجود',
        details: 'لم يتم العثور على المصروف المطلوب تحديثه'
      }, { status: 404 });
    }

    console.log('✅ Expense updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/expenses exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE /api/expenses - Soft delete expense
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/expenses - Soft deleting expense');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف المصروف مطلوب',
        details: 'يجب تحديد معرف المصروف للحذف'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check user permissions for permanent delete
    if (permanent) {
      const role = String((session?.user as any)?.role || '').toLowerCase();
      if (!['admin', 'gm'].includes(role)) {
        return NextResponse.json({
          error: 'غير مصرح',
          details: 'الحذف النهائي متاح للمديرين العامين فقط'
        }, { status: 403 });
      }
    }

    if (permanent) {
      // Permanent delete
      const { data, error } = await (supabase as any)
        .from('expenses')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للمصروف',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Expense permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف المصروف نهائياً',
        deleted: data 
      });
    } else {
      // Soft delete
      const payload = {
        deleted_at: new Date().toISOString(),
        deleted_by: session?.user?.id || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await (supabase as any)
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted expenses
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف المصروف',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'المصروف غير موجود',
          details: 'لم يتم العثور على المصروف المطلوب حذفه'
        }, { status: 404 });
      }

      console.log('✅ Expense soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل المصروف إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/expenses exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}