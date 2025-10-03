import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch visits with pagination and soft delete support
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
    const representative_id = url.searchParams.get('representative_id');
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    
    const pageSizeParam = url.searchParams.get('pageSize') || url.searchParams.get('limit') || '200';
    const pageParam = url.searchParams.get('page') || '1';
    const pageSize = Math.max(1, Math.min(parseInt(pageSizeParam, 10) || 200, 1000));
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const offset = (page - 1) * pageSize;

    const supabase = createServerSupabaseClient();
    
    console.log(`🔍 Fetching visits from DB - Direct query`);

    // Build query with enhanced selection
    let query = (supabase as any)
      .from('visits')
      .select(`
        id, 
        clinic_id, 
        representative_id, 
        visit_date, 
        purpose, 
        notes, 
        outcome, 
        next_visit_date, 
        status,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        clinics!visits_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    query = query.order('visit_date', { ascending: false });

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (clinic_id) {
        query = query.eq('clinic_id', clinic_id);
      }
      if (representative_id) {
        query = query.eq('representative_id', representative_id);
      }
      if (q) {
        query = query.or(`purpose.ilike.%${q}%,notes.ilike.%${q}%,clinics.name.ilike.%${q}%`);
      }
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ GET /api/visits error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count
    const countQuery = supabase.from('visits').select('id', { count: 'exact', head: true });
    if (!includeDeleted) {
      countQuery.is('deleted_at', null);
    }
    const { count } = await countQuery;

    console.log(`✅ Visits retrieved: ${data?.length || 0} records`);

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
    console.error('❌ GET /api/visits exception:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new visit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📝 POST /api/visits - Creating new visit');
    
    const body = await request.json();
    console.log('Received body:', body);

    // Validation
    const clinic_id = String(body.clinic_id || body.clinicId || '').trim();
    const visit_date = body.visit_date || body.visitDate || new Date().toISOString();
    const purpose = String(body.purpose || '').trim();

    if (!clinic_id) {
      return NextResponse.json({
        error: 'فشل إنشاء الزيارة',
        details: 'معرف العيادة مطلوب'
      }, { status: 400 });
    }

    if (!purpose) {
      return NextResponse.json({
        error: 'فشل إنشاء الزيارة',
        details: 'غرض الزيارة مطلوب'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const payload: any = {
      id: body.id || undefined,
      clinic_id,
      representative_id: body.representative_id || body.representativeId || session?.user?.id || null,
      visit_date,
      purpose,
      notes: body.notes || null,
      outcome: body.outcome || null,
      next_visit_date: body.next_visit_date || body.nextVisitDate || null,
      status: body.status || 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await (supabase as any)
      .from('visits')
      .insert(payload)
      .select(`
        *,
        clinics!visits_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        error: 'فشل إنشاء الزيارة',
        details: error.message,
        code: error.code,
        hint: (error as any).hint
      }, { status: 500 });
    }

    console.log('✅ Visit created successfully:', data);
    
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('POST /api/visits exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// PUT - Update existing visit
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/visits - Updating visit');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف الزيارة مطلوب',
        details: 'يجب تحديد معرف الزيارة للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.clinic_id || updateData.clinicId) payload.clinic_id = updateData.clinic_id || updateData.clinicId;
    if (updateData.representative_id !== undefined || updateData.representativeId !== undefined) {
      payload.representative_id = updateData.representative_id || updateData.representativeId;
    }
    if (updateData.visit_date || updateData.visitDate) payload.visit_date = updateData.visit_date || updateData.visitDate;
    if (updateData.purpose) payload.purpose = updateData.purpose.trim();
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.outcome !== undefined) payload.outcome = updateData.outcome;
    if (updateData.next_visit_date !== undefined || updateData.nextVisitDate !== undefined) {
      payload.next_visit_date = updateData.next_visit_date || updateData.nextVisitDate;
    }
    if (updateData.status) payload.status = updateData.status;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('visits')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted visits
      .select(`
        *,
        clinics!visits_clinic_id_fkey (
          id,
          name,
          doctor_name
        )
      `)
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث الزيارة',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'الزيارة غير موجودة',
        details: 'لم يتم العثور على الزيارة المطلوب تحديثها'
      }, { status: 404 });
    }

    console.log('✅ Visit updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/visits exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE - Soft delete visit
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/visits - Soft deleting visit');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف الزيارة مطلوب',
        details: 'يجب تحديد معرف الزيارة للحذف'
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
        .from('visits')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للزيارة',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Visit permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف الزيارة نهائياً',
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
        .from('visits')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted visits
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف الزيارة',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'الزيارة غير موجودة',
          details: 'لم يتم العثور على الزيارة المطلوب حذفها'
        }, { status: 404 });
      }

      console.log('✅ Visit soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل الزيارة إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/visits exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}
