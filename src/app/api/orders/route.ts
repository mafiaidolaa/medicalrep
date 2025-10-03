import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { orderCreateSchema } from '@/lib/validation/schemas';
import { validateStockOrThrow } from '@/lib/validation/stock-validator';
import { handleError } from '@/lib/errors/error-handler';
import { DatabaseError } from '@/lib/errors/app-errors';

// GET - Fetch orders with pagination and soft delete support
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
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    
    const pageSizeParam = url.searchParams.get('pageSize') || url.searchParams.get('limit') || '200';
    const pageParam = url.searchParams.get('page') || '1';
    const pageSize = Math.max(1, Math.min(parseInt(pageSizeParam, 10) || 200, 1000));
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const offset = (page - 1) * pageSize;

    const supabase = createServerSupabaseClient();

    console.log(`🔍 Fetching orders from DB - Direct query`);

    // Build query with enhanced selection including clinic info
    let query = (supabase as any)
      .from('orders')
      .select(`
        id, 
        clinic_id, 
        representative_id, 
        items, 
        total_amount, 
        status, 
        order_date, 
        notes, 
        temp_invoice_id, 
        final_invoice_id, 
        approved_by, 
        approved_at,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        clinics!orders_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    query = query.order('order_date', { ascending: false });

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
      if (q) {
        // Search in order notes and clinic name
        query = query.or(`notes.ilike.%${q}%,clinics.name.ilike.%${q}%`);
      }
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/orders error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const countQuery = supabase.from('orders').select('id', { count: 'exact', head: true });
    if (!includeDeleted) {
      countQuery.is('deleted_at', null);
    }
    const { count } = await countQuery;

    console.log(`✅ Orders retrieved: ${data?.length || 0} records`);

    const res = NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': (data?.length || 0).toString()
      }
    });
    
    if (typeof count === 'number') {
      res.headers.set('X-Total-Count', String(count));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    
    return res;
  } catch (error: any) {
    console.error('❌ GET /api/orders exception:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create order with validation and safe stock management
export async function POST(req: NextRequest) {
  try {
    // 🔐 Step 1: Authentication Check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // 🛡️ Step 2: Data Validation (Zod Schema)
    // تحويل البيانات للصيغة المتوقعة
    const validationInput = {
      clinicId: body.clinic_id,
      representativeId: body.representative_id,
      items: (body.items || []).map((item: any) => ({
        productId: item.productId || item.product_id,
        quantity: Number(item.quantity),
        unitPrice: Number(item.price || item.unit_price || 0)
      })),
      notes: body.notes,
      totalAmount: body.total_amount
    };

    // التحقق من صحة البيانات
    const validatedData = orderCreateSchema.parse(validationInput);
    
    // ✅ Step 3: Stock Availability Check (قبل إنشاء Order)
    const commitStock = body.commitStock !== false; // default true
    if (commitStock) {
      await validateStockOrThrow(
        validatedData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      );
    }

    const supabase = createServerSupabaseClient() as any;
    
    // حساب الـ total إذا لم يتم إرساله
    const total_amount = validatedData.totalAmount || 
      validatedData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // 🔄 Step 4: Create Order + Decrement Stock (في معاملة واحدة)
    // نستخدم try/catch داخلي للـ rollback
    let order: any = null;
    
    try {
      // 4.1: Create Order Record
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          clinic_id: validatedData.clinicId,
          representative_id: validatedData.representativeId,
          items: body.items, // Keep original format for compatibility
          total_amount,
          status: 'pending',
          order_date: new Date().toISOString(),
          notes: validatedData.notes
        })
        .select('*')
        .single();

      if (orderErr) {
        throw new DatabaseError('فشل إنشاء الطلب', { error: orderErr.message });
      }
      
      order = orderData;

      // 4.2: Decrement Stock using Safe Function
      if (commitStock) {
        for (const item of validatedData.items) {
          // استخدام الدالة الآمنة من الداتابيز
          const { data: stockResult, error: stockErr } = await supabase
            .rpc('decrement_stock', {
              p_product_id: item.productId,
              p_quantity: item.quantity
            })
            .single();

          // إذا فشل خصم المخزون
          if (stockErr || !stockResult?.success) {
            // حذف Order اللي اتعمل (manual rollback)
            await supabase.from('orders').delete().eq('id', order.id);
            
            throw new DatabaseError(
              stockResult?.message || 'فشل خصم المخزون',
              { productId: item.productId, quantity: item.quantity }
            );
          }

          // تسجيل الحركة
          await supabase.from('product_movements').insert({
            product_id: item.productId,
            movement_type: 'out',
            quantity: item.quantity,
            source: 'order',
            source_id: order.id,
            created_at: new Date().toISOString()
          });
        }
      }

      // ✅ Success Response
      return NextResponse.json({
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        data: {
          order_id: order.id,
          total_amount,
          status: order.status,
          items_count: validatedData.items.length
        }
      }, { status: 201 });

    } catch (innerError: any) {
      // إذا حصل خطأ وفي order اتعمل، نحذفه (rollback يدوي)
      if (order?.id) {
        try {
          await supabase.from('orders').delete().eq('id', order.id);
          console.log('🔄 Rollback: تم حذف Order', order.id);
        } catch (rollbackErr) {
          console.error('❌ Rollback failed:', rollbackErr);
        }
      }
      throw innerError;
    }

  } catch (error: any) {
    // 🚨 Step 5: Error Handling (استخدام النظام الجديد)
    console.error('❌ Order creation failed:', error);
    return handleError(error);
  }
}

// PUT - Update existing order
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/orders - Updating order');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف الطلب مطلوب',
        details: 'يجب تحديد معرف الطلب للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.clinic_id) payload.clinic_id = updateData.clinic_id;
    if (updateData.representative_id !== undefined) payload.representative_id = updateData.representative_id;
    if (updateData.order_date) payload.order_date = updateData.order_date;
    if (updateData.total_amount !== undefined) payload.total_amount = Number(updateData.total_amount);
    if (updateData.status) payload.status = updateData.status;
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.items !== undefined) payload.items = updateData.items;
    if (updateData.temp_invoice_id !== undefined) payload.temp_invoice_id = updateData.temp_invoice_id;
    if (updateData.final_invoice_id !== undefined) payload.final_invoice_id = updateData.final_invoice_id;
    if (updateData.approved_by !== undefined) payload.approved_by = updateData.approved_by;
    if (updateData.approved_at !== undefined) payload.approved_at = updateData.approved_at;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('orders')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted orders
      .select(`
        *,
        clinics!orders_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث الطلب',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'الطلب غير موجود',
        details: 'لم يتم العثور على الطلب المطلوب تحديثه'
      }, { status: 404 });
    }

    console.log('✅ Order updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/orders exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE - Soft delete order
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/orders - Soft deleting order');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف الطلب مطلوب',
        details: 'يجب تحديد معرف الطلب للحذف'
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
        .from('orders')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للطلب',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Order permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف الطلب نهائياً',
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
        .from('orders')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted orders
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف الطلب',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'الطلب غير موجود',
          details: 'لم يتم العثور على الطلب المطلوب حذفه'
        }, { status: 404 });
      }

      console.log('✅ Order soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل الطلب إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/orders exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}
