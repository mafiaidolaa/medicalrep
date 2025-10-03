import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST /api/trash/restore
// body: { section: 'clinics'|'orders'|'visits'|'invoices'|'expenses'|'collections', id: string }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = String((session?.user as any)?.role || '').toLowerCase();
    if (!session || !['admin','gm'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const section = String(body.section || '').toLowerCase();
    const id = String(body.id || '');
    if (!section || !id) return NextResponse.json({ error: 'Missing section or id' }, { status: 400 });

    const map: Record<string, string> = {
      clinics: 'clinics',
      orders: 'orders',
      visits: 'visits',
      invoices: 'invoices',
      expenses: 'expenses',
      products: 'products',
      payments: 'payments',
      collections: 'collections',
    };
    const table = map[section];
    if (!table) return NextResponse.json({ error: 'Invalid section' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Prepare generic restore payload
    const payload: any = { deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() };
    if (table === 'clinics') payload.is_active = true;

    const { error } = await (supabase as any)
      .from(table)
      .update(payload)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('POST /api/trash/restore error:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
