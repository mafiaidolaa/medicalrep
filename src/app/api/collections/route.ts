import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * 💰 Collections API - Direct Database Operations with Soft Delete Support
 * - Direct database operations (no cache)
 * - Full soft delete functionality
 * - Real-time data consistency
 */

// GET /api/collections - List collections with optional filtering
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
    const payment_method = url.searchParams.get('payment_method');
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabase = createServerSupabaseClient();
    
    console.log(`🔍 Fetching collections from DB - Direct query`);
    
    // Build query with soft delete filtering
    let query = supabase
      .from('collections')
      .select(`
        id,
        clinic_id,
        amount,
        payment_method,
        collection_date,
        notes,
        status,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        clinics!collections_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    query = query.order('collection_date', { ascending: false });

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (clinic_id) {
        query = query.eq('clinic_id', clinic_id);
      }
      if (payment_method) {
        query = query.eq('payment_method', payment_method);
      }
      if (q) {
        query = query.or(`notes.ilike.%${q}%,clinics.name.ilike.%${q}%`);
      }
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ GET /api/collections error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error', code: 'COLLECTIONS_FETCH_ERROR' }, 
        { status: 500 }
      );
    }

    console.log(`✅ Collections retrieved: ${data?.length || 0} records`);

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': (data?.length || 0).toString()
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/collections exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'COLLECTIONS_FETCH_ERROR' }, 
      { status: 500 }
    );
  }
}

// POST /api/collections - Create new collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📝 POST /api/collections - Creating new collection');
    
    const body = await request.json();
    console.log('Received body:', body);

    // Validation
    const clinic_id = String(body.clinic_id || '').trim();
    const amount = Number(body.amount || 0);
    const collection_date = body.collection_date || new Date().toISOString();
    const payment_method = String(body.payment_method || 'cash').trim();

    if (!clinic_id) {
      return NextResponse.json({
        error: 'فشل إنشاء التحصيل',
        details: 'معرف العيادة مطلوب'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        error: 'فشل إنشاء التحصيل',
        details: 'المبلغ يجب أن يكون أكبر من صفر'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const payload: any = {
      id: body.id || undefined,
      clinic_id,
      amount,
      payment_method,
      collection_date,
      notes: body.notes || null,
      status: body.status || 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await (supabase as any)
      .from('collections')
      .insert(payload)
      .select(`
        *,
        clinics!collections_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        error: 'فشل إنشاء التحصيل',
        details: error.message,
        code: error.code,
        hint: (error as any).hint
      }, { status: 500 });
    }

    console.log('✅ Collection created successfully:', data);
    
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('POST /api/collections exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// PUT /api/collections - Update existing collection
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/collections - Updating collection');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف التحصيل مطلوب',
        details: 'يجب تحديد معرف التحصيل للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.clinic_id) payload.clinic_id = updateData.clinic_id;
    if (updateData.amount !== undefined) payload.amount = Number(updateData.amount);
    if (updateData.payment_method) payload.payment_method = updateData.payment_method;
    if (updateData.collection_date) payload.collection_date = updateData.collection_date;
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.status) payload.status = updateData.status;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('collections')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted collections
      .select(`
        *,
        clinics!collections_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث التحصيل',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'التحصيل غير موجود',
        details: 'لم يتم العثور على التحصيل المطلوب تحديثه'
      }, { status: 404 });
    }

    console.log('✅ Collection updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/collections exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE /api/collections - Soft delete collection
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/collections - Soft deleting collection');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف التحصيل مطلوب',
        details: 'يجب تحديد معرف التحصيل للحذف'
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
        .from('collections')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للتحصيل',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Collection permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف التحصيل نهائياً',
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
        .from('collections')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted collections
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف التحصيل',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'التحصيل غير موجود',
          details: 'لم يتم العثور على التحصيل المطلوب حذفه'
        }, { status: 404 });
      }

      console.log('✅ Collection soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل التحصيل إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/collections exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}