import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';

// GET - Fetch users with pagination and trimmed columns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pageSizeParam = url.searchParams.get('pageSize') || '200';
    const pageParam = url.searchParams.get('page') || '1';
    const pageSize = Math.max(1, Math.min(parseInt(pageSizeParam, 10) || 200, 1000));
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const offset = (page - 1) * pageSize;

    const supabase = createServerSupabaseClient();

    // Trim to only columns used by UI, include location relationships
    const { data, error } = await (supabase as any)
      .from('users')
      .select(`
        id, full_name, username, email, role, primary_phone, area, line, 
        profile_picture, sales_target, visits_target, is_active,
        user_locations(
          location_name,
          is_primary
        )
      `)
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });

    const res = NextResponse.json(data || []);
    if (typeof count === 'number') {
      res.headers.set('X-Total-Count', String(count));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/users - Creating new user');
  try {
    const session = await getServerSession(authOptions);
    console.log('📝 Session:', session?.user ? { email: (session.user as any).email, role: (session.user as any).role } : 'No session');
    
    if (!session || !session.user) {
      console.error('❌ Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized - يجب تسجيل الدخول' }, { status: 401 });
    }

    // Check if user has permission to create users (admin or manager)
    const userRole = (session.user as any).role;
    console.log('👤 User role:', userRole);
    
    if (!['admin', 'manager'].includes(userRole)) {
      console.error('❌ Forbidden: User role is not admin/manager');
      return NextResponse.json(
        { error: 'Forbidden - ليس لديك صلاحية لإضافة مستخدمين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('📦 Received body:', { ...body, password: '[REDACTED]' });
    
    // Validate required fields
    if (!body.id || !body.full_name || !body.username || !body.email || !body.password) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: id, full_name, username, email, password' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    console.log('🔑 Creating Supabase client with service role');
    const supabase = createServerSupabaseClient();
    console.log('✅ Supabase client created');

    // Handle multi-location support
    const incomingRole = body.role || 'medical_rep';
    const locations = body.locations || (body.area ? [body.area] : []);
    const primaryLocation = body.primaryLocation || body.primary_location || locations[0];
    
    const sanitizeScope = (v: any) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim().toLowerCase();
      if (s.startsWith('all ')) return null;
      if (s === 'all') return null;
      return String(v).trim();
    };
    
    // For backward compatibility, still set area field
    const sanitizedArea = incomingRole === 'admin' ? null : sanitizeScope(primaryLocation);
    const sanitizedLine = incomingRole === 'admin' ? null : sanitizeScope(body.line);

    // Prepare user data for database
    const userData = {
      id: body.id,
      full_name: body.full_name,
      username: body.username,
      email: body.email,
      password: body.password, // Should already be hashed from client
      role: incomingRole,
      hire_date: body.hire_date || new Date().toISOString(),
      area: sanitizedArea,
      line: sanitizedLine,
      manager_id: body.manager_id || null,
      // Use empty string for NOT NULL text columns to avoid DB constraint violations
      primary_phone: body.primary_phone ?? '',
      whatsapp_phone: body.whatsapp_phone ?? '',
      alt_phone: body.alt_phone ?? '',
      profile_picture: body.profile_picture || null,
      sales_target: body.sales_target || null,
      visits_target: body.visits_target || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert user using service role (bypasses RLS)
    console.log('💾 Inserting user into database...');
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      // Unique violation (PostgreSQL error code 23505)
      const status = (error as any)?.code === '23505' ? 409 : 500;
      return NextResponse.json(
        { error: `فشل في إضافة المستخدم: ${error.message}` },
        { status }
      );
    }
    
    console.log('✅ User created successfully:', data.id);
    
    // Handle multi-location setup
    if (data && locations.length > 0 && incomingRole !== 'admin') {
      try {
        const { error: locationError } = await supabase
          .rpc('set_user_locations', {
            user_uuid: data.id,
            locations: locations,
            primary_location: primaryLocation
          });
        
        if (locationError) {
          console.warn('User location setup warning:', locationError);
          // Don't fail the entire operation, just warn
        } else {
          console.log('✅ Multi-locations set successfully for user');
        }
      } catch (locError) {
        console.warn('User location setup exception:', locError);
      }
    }

    // Revalidate cache to ensure fresh data
    try {
      revalidatePath('/users');
      revalidatePath('/api/users');
      revalidateTag('users');
    } catch (revalidateError) {
      console.warn('Cache revalidation warning:', revalidateError);
      // Don't fail the request if revalidation fails
    }

    return NextResponse.json(
      { 
        message: 'تم إضافة المستخدم بنجاح',
        user: data 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
