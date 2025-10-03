import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// DELETE /api/orders/[id] - Admin only (soft-delete to recycle bin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role?.toString().toLowerCase();
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Snapshot before delete
    const { data: snapshot, error: fetchErr } = await (supabase as any)
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr) console.warn('Order snapshot fetch failed:', fetchErr);

    // Try soft delete by marking fields if available; fallback to status=cancelled
    let softErr: any = null;
    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      // try common soft-delete fields
      (updatePayload as any).deleted_at = new Date().toISOString();
      (updatePayload as any).deleted_by = (session.user as any)?.id || null;
      const { error: upErr } = await (supabase as any)
        .from('orders')
        .update(updatePayload)
        .eq('id', id);
      if (upErr) throw upErr;
    } catch (e) {
      softErr = e;
      console.warn('Soft-delete fields not available for orders, falling back to status=cancelled:', (e as any)?.message || e);
      const { error: cancelErr } = await (supabase as any)
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (cancelErr) {
        console.error('Order cancel fallback failed:', cancelErr);
        return NextResponse.json({ error: 'Delete failed', details: cancelErr.message }, { status: 500 });
      }
    }

    // Log recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'order',
        entity_id: id,
        title: `طلب إلى سلة المهملات: ${id}`,
        details: `تم نقل الطلب إلى سلة المهملات بواسطة ${(session.user as any)?.email || 'unknown'}`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      }, req as any);
    } catch (logErr) {
      console.warn('Failed to log order recycle bin entry:', logErr);
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('DELETE /api/orders/[id] exception:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e?.message || e) }, { status: 500 });
  }
}