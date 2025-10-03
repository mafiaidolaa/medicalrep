import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * 📄 Invoices API - Direct Database Operations with Soft Delete Support
 * - Direct database operations (no cache)
 * - Full soft delete functionality
 * - Real-time data consistency
 */

// GET /api/invoices - List invoices with optional filtering
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
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabase = createServerSupabaseClient();
    
    console.log(`🔍 Fetching invoices from DB - Direct query`);
    
    // Build query with soft delete filtering
    let query = supabase
      .from('invoices')
      .select(`
        id,
        clinic_id,
        invoice_number,
        invoice_date,
        due_date,
        amount,
        tax_amount,
        total_amount,
        type,
        status,
        notes,
        payment_terms,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        clinics!invoices_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    query = query.order('invoice_date', { ascending: false });

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (clinic_id) {
        query = query.eq('clinic_id', clinic_id);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('type', type);
      }
      if (q) {
        query = query.or(`invoice_number.ilike.%${q}%,notes.ilike.%${q}%,clinics.name.ilike.%${q}%`);
      }
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ GET /api/invoices error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error', code: 'INVOICES_FETCH_ERROR' }, 
        { status: 500 }
      );
    }

    console.log(`✅ Invoices retrieved: ${data?.length || 0} records`);

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': (data?.length || 0).toString()
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/invoices exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'INVOICES_FETCH_ERROR' }, 
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📝 POST /api/invoices - Creating new invoice');
    
    const body = await request.json();
    console.log('Received body:', body);

    // Validation
    const clinic_id = String(body.clinic_id || '').trim();
    const amount = Number(body.amount || 0);
    const invoice_date = body.invoice_date || new Date().toISOString();
    const type = String(body.type || 'service').trim();

    if (!clinic_id) {
      return NextResponse.json({
        error: 'فشل إنشاء الفاتورة',
        details: 'معرف العيادة مطلوب'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        error: 'فشل إنشاء الفاتورة',
        details: 'المبلغ يجب أن يكون أكبر من صفر'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Generate invoice number if not provided
    const generateInvoiceNumber = async (): Promise<string> => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Get the count of invoices this month
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('invoice_date', `${year}-${month}-01`)
        .lt('invoice_date', `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`);
      
      const nextNumber = (count || 0) + 1;
      return `INV-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
    };

    const tax_amount = Number(body.tax_amount || 0);
    const total_amount = amount + tax_amount;

    const payload: any = {
      id: body.id || undefined,
      clinic_id,
      invoice_number: body.invoice_number || await generateInvoiceNumber(),
      invoice_date,
      due_date: body.due_date || null,
      amount,
      tax_amount,
      total_amount,
      type,
      status: body.status || 'pending',
      notes: body.notes || null,
      payment_terms: body.payment_terms || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await (supabase as any)
      .from('invoices')
      .insert(payload)
      .select(`
        *,
        clinics!invoices_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        error: 'فشل إنشاء الفاتورة',
        details: error.message,
        code: error.code,
        hint: (error as any).hint
      }, { status: 500 });
    }

    console.log('✅ Invoice created successfully:', data);
    
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('POST /api/invoices exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// PUT /api/invoices - Update existing invoice
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/invoices - Updating invoice');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف الفاتورة مطلوب',
        details: 'يجب تحديد معرف الفاتورة للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.clinic_id) payload.clinic_id = updateData.clinic_id;
    if (updateData.invoice_number) payload.invoice_number = updateData.invoice_number;
    if (updateData.invoice_date) payload.invoice_date = updateData.invoice_date;
    if (updateData.due_date !== undefined) payload.due_date = updateData.due_date;
    if (updateData.amount !== undefined) {
      payload.amount = Number(updateData.amount);
      // Recalculate total if amount changes
      const tax_amount = Number(updateData.tax_amount || 0);
      payload.tax_amount = tax_amount;
      payload.total_amount = payload.amount + tax_amount;
    }
    if (updateData.tax_amount !== undefined) {
      payload.tax_amount = Number(updateData.tax_amount);
      // Recalculate total if tax changes
      const amount = Number(updateData.amount || 0);
      payload.total_amount = amount + payload.tax_amount;
    }
    if (updateData.type) payload.type = updateData.type;
    if (updateData.status) payload.status = updateData.status;
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.payment_terms !== undefined) payload.payment_terms = updateData.payment_terms;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('invoices')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted invoices
      .select(`
        *,
        clinics!invoices_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث الفاتورة',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'الفاتورة غير موجودة',
        details: 'لم يتم العثور على الفاتورة المطلوب تحديثها'
      }, { status: 404 });
    }

    console.log('✅ Invoice updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/invoices exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE /api/invoices - Soft delete invoice
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/invoices - Soft deleting invoice');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف الفاتورة مطلوب',
        details: 'يجب تحديد معرف الفاتورة للحذف'
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
        .from('invoices')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للفاتورة',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Invoice permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف الفاتورة نهائياً',
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
        .from('invoices')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted invoices
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف الفاتورة',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'الفاتورة غير موجودة',
          details: 'لم يتم العثور على الفاتورة المطلوب حذفها'
        }, { status: 404 });
      }

      console.log('✅ Invoice soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل الفاتورة إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/invoices exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}