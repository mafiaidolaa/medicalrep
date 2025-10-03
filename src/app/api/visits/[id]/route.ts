import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// DELETE /api/visits/[id] - Admin only (soft-delete to recycle bin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role?.toString().toLowerCase();
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing visit id' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Snapshot
    const { data: snapshot, error: fetchErr } = await (supabase as any)
      .from('visits')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr) console.warn('Visit snapshot fetch failed:', fetchErr);

    // Try soft-delete fields, else mark notes
    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      (updatePayload as any).deleted_at = new Date().toISOString();
      (updatePayload as any).deleted_by = (session.user as any)?.id || null;
      const { error: upErr } = await (supabase as any)
        .from('visits')
        .update(updatePayload)
        .eq('id', id);
      if (upErr) throw upErr;
    } catch (e) {
      console.warn('Soft-delete fields not available for visits, marking notes:', (e as any)?.message || e);
      const marker = '[DELETED] ' + new Date().toISOString();
      const { error: up2 } = await (supabase as any)
        .from('visits')
        .update({ notes: (snapshot?.notes ? `${snapshot.notes}\n` : '') + marker, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (up2) {
        console.error('Visit soft-delete marker failed:', up2);
        return NextResponse.json({ error: 'Delete failed', details: up2.message }, { status: 500 });
      }
    }

    // Log recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'visit',
        entity_id: id,
        title: `زيارة إلى سلة المهملات: ${id}`,
        details: `تم نقل الزيارة إلى سلة المهملات بواسطة ${(session.user as any)?.email || 'unknown'}`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      }, req as any);
    } catch (logErr) {
      console.warn('Failed to log visit recycle bin entry:', logErr);
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('DELETE /api/visits/[id] exception:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e?.message || e) }, { status: 500 });
  }
}