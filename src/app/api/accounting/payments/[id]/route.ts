import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// DELETE /api/accounting/payments/[id] - Soft delete payment
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Snapshot
    const { data: snapshot } = await (supabase as any)
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    // Try soft delete with deleted_at/deleted_by, fallback to status=cancelled
    let softOk = true;
    const { error: upErr } = await (supabase as any)
      .from('payments')
      .update({ deleted_at: new Date().toISOString(), deleted_by: (session.user as any)?.id || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) {
      // 42703: column not found
      if (String(upErr?.code) === '42703') {
        softOk = false;
      } else {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    if (!softOk) {
      const { error: cancelErr } = await (supabase as any)
        .from('payments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (cancelErr) return NextResponse.json({ error: cancelErr.message }, { status: 500 });
    }

    // Log recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'payment',
        entity_id: id,
        title: `مدفوعة إلى سلة المهملات: ${id}`,
        details: `تم نقل المدفوعة إلى سلة المهملات بواسطة ${(session.user as any)?.email || 'unknown'}`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      }, request as any);
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
