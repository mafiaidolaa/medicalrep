import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * 🏥 Clinics API - Direct Database Operations with Soft Delete Support
 * - Direct database operations (no cache)
 * - Full soft delete functionality
 * - Real-time data consistency
 */

// GET /api/clinics - List clinics with optional filtering
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const id = url.searchParams.get('id');
    const includeDeleted = url.searchParams.get('include_deleted') === 'true';
    const includeLocations = url.searchParams.get('include_locations') === 'true';
    const filterByLocations = url.searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabase = createServerSupabaseClient();
    
    console.log(`🔍 Fetching clinics from DB - Direct query`);
    
    // Build query with soft delete filtering
    let query = supabase
      .from('clinics')
      .select(`
        id,
        name,
        doctor_name,
        address,
        area,
        line,
        lat,
        lng,
        clinic_phone,
        doctor_phone,
        classification,
        credit_status,
        is_active,
        registered_at,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        clinic_locations(
          location_name,
          is_primary
        )
      `);

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    // Apply active filter for normal operations
    if (!includeDeleted) {
      query = query.eq('is_active', true);
    }
    
    query = query.order('name', { ascending: true });

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (q) {
        query = query.or(`name.ilike.%${q}%,doctor_name.ilike.%${q}%,address.ilike.%${q}%`);
      }
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ GET /api/clinics error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error', code: 'CLINICS_FETCH_ERROR' }, 
        { status: 500 }
      );
    }

    console.log(`✅ Clinics retrieved: ${data?.length || 0} records`);

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': (data?.length || 0).toString()
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/clinics exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'CLINICS_FETCH_ERROR' }, 
      { status: 500 }
    );
  }
}

// POST /api/clinics - Create new clinic
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const supabase = createServerSupabaseClient();
    
    console.log('📝 POST /api/clinics - Creating new clinic');
    
    const body = await request.json();
    console.log('Received body:', body);

    // Validation
    const name = (body.name || '').trim();
    const doctor_name = (body.doctor_name || body.doctorName || body.owner_name || body.ownerName || '').trim();
    const address = (body.address || '').trim();
    const area = (body.area || '').trim();
    const line = (body.line || '').trim();
    const lat = Number(body.lat ?? 0);
    const lng = Number(body.lng ?? 0);

    if (!name) {
      return NextResponse.json({
        error: 'فشل تسجيل العيادة',
        details: 'اسم العيادة مطلوب'
      }, { status: 400 });
    }

    if (!doctor_name) {
      return NextResponse.json({
        error: 'فشل تسجيل العيادة',
        details: 'اسم صاحب العيادة/الطبيب مطلوب'
      }, { status: 400 });
    }

    // Validate locations (new multi-location support)
    const locations = body.locations || (area ? [area] : []);
    const primaryLocation = body.primaryLocation || body.primary_location || locations[0];
    
    if (!locations || locations.length === 0) {
      return NextResponse.json({
        error: 'فشل تسجيل العيادة',
        details: 'يجب تحديد موقع واحد على الأقل'
      }, { status: 400 });
    }

    if (!line) {
      return NextResponse.json({
        error: 'فشل تسجيل العيادة',
        details: 'الخط مطلوب'
      }, { status: 400 });
    }

    const payload: any = {
      id: body.id || undefined,
      name,
      doctor_name,
      address: address || 'غير محدد',
      lat: isFinite(lat) ? lat : 0,
      lng: isFinite(lng) ? lng : 0,
      registered_at: body.registered_at || body.registeredAt || new Date().toISOString(),
      registered_by: session?.user?.id || null,
      clinic_phone: body.clinic_phone ?? body.clinicPhone ?? body.phone ?? null,
      doctor_phone: body.doctor_phone ?? body.doctorPhone ?? body.alt_phone ?? body.altPhone ?? null,
      area,
      line,
      classification: body.classification ?? 'B',
      credit_status: body.credit_status ?? body.creditStatus ?? 'green',
      notes: body.notes ?? null,
      is_active: body.is_active !== undefined ? !!body.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await (supabase as any)
      .from('clinics')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        error: 'فشل تسجيل العيادة',
        details: error.message,
        code: error.code,
        hint: (error as any).hint
      }, { status: 500 });
    }
    console.log('\u2705 Clinic created successfully:', data);
    
    // Now handle multi-location setup
    if (data && locations.length > 0) {
      try {
        const { error: locationError } = await supabase
          .rpc('set_clinic_locations', {
            clinic_uuid: data.id,
            locations: locations,
            primary_location: primaryLocation
          });
        
        if (locationError) {
          console.warn('Location setup warning:', locationError);
          // Don't fail the entire operation, just warn
        } else {
          console.log('\u2705 Multi-locations set successfully');
        }
      } catch (locError) {
        console.warn('Location setup exception:', locError);
      }
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('POST /api/clinics exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// PUT /api/clinics - Update existing clinic
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const supabase = createServerSupabaseClient();
    
    console.log('✏️ PUT /api/clinics - Updating clinic');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف العيادة مطلوب',
        details: 'يجب تحديد معرف العيادة للتحديث'
      }, { status: 400 });
    }

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.name) payload.name = updateData.name.trim();
    if (updateData.doctor_name || updateData.doctorName) {
      payload.doctor_name = (updateData.doctor_name || updateData.doctorName).trim();
    }
    if (updateData.address) payload.address = updateData.address.trim();
    if (updateData.area) payload.area = updateData.area.trim();
    if (updateData.line) payload.line = updateData.line.trim();
    if (updateData.lat !== undefined) payload.lat = Number(updateData.lat);
    if (updateData.lng !== undefined) payload.lng = Number(updateData.lng);
    if (updateData.clinic_phone !== undefined) payload.clinic_phone = updateData.clinic_phone;
    if (updateData.doctor_phone !== undefined) payload.doctor_phone = updateData.doctor_phone;
    if (updateData.classification !== undefined) payload.classification = updateData.classification;
    if (updateData.credit_status !== undefined) payload.credit_status = updateData.credit_status;
    if (updateData.notes !== undefined) payload.notes = updateData.notes;
    if (updateData.is_active !== undefined) payload.is_active = !!updateData.is_active;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('clinics')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted clinics
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث العيادة',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'العيادة غير موجودة',
        details: 'لم يتم العثور على العيادة المطلوب تحديثها'
      }, { status: 404 });
    }

    console.log('✅ Clinic updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/clinics exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE /api/clinics - Soft delete clinic
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const supabase = createServerSupabaseClient();
    
    console.log('🗑️ DELETE /api/clinics - Soft deleting clinic');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف العيادة مطلوب',
        details: 'يجب تحديد معرف العيادة للحذف'
      }, { status: 400 });
    }

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
        .from('clinics')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للعيادة',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Clinic permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف العيادة نهائياً',
        deleted: data 
      });
    } else {
      // Soft delete
      const payload = {
        deleted_at: new Date().toISOString(),
        deleted_by: session?.user?.id || null,
        is_active: false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await (supabase as any)
        .from('clinics')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted clinics
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف العيادة',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'العيادة غير موجودة',
          details: 'لم يتم العثور على العيادة المطلوب حذفها'
        }, { status: 404 });
      }

      console.log('✅ Clinic soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل العيادة إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/clinics exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}
