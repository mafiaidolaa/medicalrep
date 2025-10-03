import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// DELETE /api/accounting/expenses/[id] - Soft delete expense
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Snapshot
    const { data: snapshot } = await (supabase as any)
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    // Try soft delete
    let { error } = await (supabase as any)
      .from('expenses')
      .update({ deleted_at: new Date().toISOString(), deleted_by: (session.user as any)?.id || null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (String(error?.code) === '42703') {
        // fallback hard delete
        const { error: delErr } = await (supabase as any)
          .from('expenses')
          .delete()
          .eq('id', id);
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Log recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'expense',
        entity_id: id,
        title: `نفقة إلى سلة المهملات: ${id}`,
        details: `تم نقل النفقة إلى سلة المهملات بواسطة ${(session.user as any)?.email || 'unknown'}`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      }, request as any);
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
