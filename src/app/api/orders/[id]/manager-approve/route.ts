import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST /api/orders/[id]/manager-approve
// Manager approval for an order (sets status to 'confirmed'). Only the representative's manager, admin, accountant GM can approve.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch order
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select('id, representative_id, status')
      .eq('id', id)
      .single();
    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Allow only manager of the representative or admin/gm to approve
    const role = (session.user as any).role || '';
    let isManager = false;
    if (role !== 'admin' && role !== 'gm') {
      const { data: repUser } = await (supabase as any)
        .from('users')
        .select('id, manager')
        .eq('id', order.representative_id)
        .single();
      isManager = repUser?.manager === (session.user as any).id;
      if (!isManager) {
        return NextResponse.json({ error: 'Forbidden: not manager of this representative' }, { status: 403 });
      }
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be manager-approved' }, { status: 400 });
    }

    const { data: updated, error: updErr } = await (supabase as any)
      .from('orders')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    console.error('manager-approve error:', e);
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
