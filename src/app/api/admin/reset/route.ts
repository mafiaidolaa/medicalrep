import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Development-only admin reset endpoint
// Usage: POST /api/admin/reset with JSON body { username, password, email? }
// - Creates or updates an admin user with given credentials.
// - Requires SUPABASE_SERVICE_ROLE_KEY to be set.
// - Disabled automatically in production.

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
    }

    const { username, password, email } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Check if an admin already exists
    const { data: admins, error: adminErr } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('role', 'admin')
      .limit(1);

    const hash = await bcrypt.hash(String(password), 10);

    if (admins && admins.length > 0) {
      // Update the first admin
      const admin = admins[0];
      const { error: upErr } = await supabase
        .from('users')
        .update({ 
          username, 
          email: email || admin.email || `${username}@local`, 
          role: 'admin', 
          password: hash, 
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id);
      if (upErr) throw upErr;
      return NextResponse.json({ success: true, updatedAdminId: admin.id });
    }

    // No admin found: insert new
    const id = crypto.randomUUID();
    const { error: insErr } = await supabase
      .from('users')
      .insert({
        id,
        full_name: 'System Administrator',
        username,
        email: email || `${username}@local`,
        role: 'admin',
        hire_date: new Date().toISOString(),
        password: hash,
        primary_phone: '',
        sales_target: 0,
        visits_target: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, createdAdminId: id });
  } catch (e: any) {
    console.error('Admin reset error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
