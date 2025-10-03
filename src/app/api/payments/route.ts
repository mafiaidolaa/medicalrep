import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * 💳 Payments API - Direct Database Operations with Soft Delete Support
 * - Direct database operations (no cache)
 * - Full soft delete functionality
 * - Real-time data consistency
 */

// GET /api/payments - List payments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const id = url.searchParams.get('id');
    const clinic_id = url.searchParams.get('clinic_id');
    const invoice_id = url.searchParams.get('invoice_id');
    const payment_method = url.searchParams.get('payment_method');
    const status = url.searchParams.get('status');
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabase = createServerSupabaseClient();
    
    console.log(`🔍 Fetching payments from DB - Direct query`);
    
    // Build query with soft delete filtering
    let query = supabase
      .from('payments')
      .select(`
        id,
        clinic_id,
        invoice_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        status,
        notes,
        transaction_id,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        clinics!payments_clinic_id_fkey (
          id,
          name,
          doctor_name
        ),
        invoices!payments_invoice_id_fkey (
          id,
          invoice_number,
          total_amount
        )
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    query = query.order('payment_date', { ascending: false });

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (clinic_id) {
        query = query.eq('clinic_id', clinic_id);
      }
      if (invoice_id) {
        query = query.eq('invoice_id', invoice_id);
      }
      if (payment_method) {
        query = query.eq('payment_method', payment_method);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (q) {
        query = query.or(`reference_number.ilike.%${q}%,notes.ilike.%${q}%,clinics.name.ilike.%${q}%,invoices.invoice_number.ilike.%${q}%`);
      }
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ GET /api/payments error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error', code: 'PAYMENTS_FETCH_ERROR' }, 
        { status: 500 }
      );
    }

    console.log(`✅ Payments retrieved: ${data?.length || 0} records`);

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': (data?.length || 0).toString()
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/payments exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'PAYMENTS_FETCH_ERROR' }, 
      { status: 500 }
    );
  }
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📝 POST /api/payments - Creating new payment');
    
    const body = await request.json();
    console.log('Received body:', body);

    // Validation
    const clinic_id = String(body.clinic_id || '').trim();
    const amount = Number(body.amount || 0);
    const payment_method = String(body.payment_method || 'cash').trim();
    const payment_date = body.payment_date || new Date().toISOString();

    if (!clinic_id) {
      return NextResponse.json({
        error: 'فشل إنشاء المدفوعة',
        details: 'معرف العيادة مطلوب'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        error: 'فشل إنشاء المدفوعة',
        details: 'المبلغ يجب أن يكون أكبر من صفر'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Generate reference number if not provided
    const generateReferenceNumber = async (): Promise<string> => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const day = String(new Date().getDate()).padStart(2, '0');
      
      // Get the count of payments today
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .gte('payment_date', `${today}T00:00:00`)
        .lt('payment_date', `${today}T23:59:59`);
      
      const nextNumber = (count || 0) + 1;
      return `PAY-${year}${month}${day}-${String(nextNumber).padStart(4, '0')}`;
    };

    const payload: any = {
      id: body.id || undefined,
      clinic_id,
      invoice_id: body.invoice_id || null,
      amount,
      payment_method,
      payment_date,
      reference_number: body.reference_number || await generateReferenceNumber(),
      status: body.status || 'completed',
      notes: body.notes || null,
      transaction_id: body.transaction_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await (supabase as any)
      .from('payments')
      .insert(payload)
      .select(`
        *,
        clinics!payments_clinic_id_fkey (
          id,
          name,
          doctor_name
        ),
        invoices!payments_invoice_id_fkey (
          id,
          invoice_number,
          total_amount
        )
      `)
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        error: 'فشل إنشاء المدفوعة',
        details: error.message,
        code: error.code,
        hint: (error as any).hint
      }, { status: 500 });
    }

    console.log('✅ Payment created successfully:', data);
    
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('POST /api/payments exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// PUT /api/payments - Update existing payment
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/payments - Updating payment');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف المدفوعة مطلوب',
        details: 'يجب تحديد معرف المدفوعة للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.clinic_id) payload.clinic_id = updateData.clinic_id;
    if (updateData.invoice_id !== undefined) payload.invoice_id = updateData.invoice_id;
    if (updateData.amount !== undefined) payload.amount = Number(updateData.amount);
    if (updateData.payment_method) payload.payment_method = updateData.payment_method;
    if (updateData.payment_date) payload.payment_date = updateData.payment_date;
    if (updateData.reference_number) payload.reference_number = updateData.reference_number;
    if (updateData.status) payload.status = updateData.status;
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.transaction_id !== undefined) payload.transaction_id = updateData.transaction_id;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('payments')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted payments
      .select(`
        *,
        clinics!payments_clinic_id_fkey (
          id,
          name,
          doctor_name
        ),
        invoices!payments_invoice_id_fkey (
          id,
          invoice_number,
          total_amount
        )
      `)
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث المدفوعة',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'المدفوعة غير موجودة',
        details: 'لم يتم العثور على المدفوعة المطلوب تحديثها'
      }, { status: 404 });
    }

    console.log('✅ Payment updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/payments exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE /api/payments - Soft delete payment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/payments - Soft deleting payment');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف المدفوعة مطلوب',
        details: 'يجب تحديد معرف المدفوعة للحذف'
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
        .from('payments')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للمدفوعة',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Payment permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف المدفوعة نهائياً',
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
        .from('payments')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted payments
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف المدفوعة',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'المدفوعة غير موجودة',
          details: 'لم يتم العثور على المدفوعة المطلوب حذفها'
        }, { status: 404 });
      }

      console.log('✅ Payment soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل المدفوعة إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/payments exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}