import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// DELETE /api/clinics/[id]
// - Admin-only
// - Soft delete: set is_active = false
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role?.toString().toLowerCase();

    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing clinic id' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch snapshot before soft-delete for recycle bin
    const { data: snapshot, error: fetchErr } = await (supabase as any)
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr) {
      console.warn('Could not fetch clinic snapshot before delete:', fetchErr);
    }

    // Soft delete with audit fields (fallback if columns missing)
    let error: any = null;
    try {
      const { error: upErr } = await (supabase as any)
        .from('clinics')
        .update({ 
          is_active: false,
          // Attempt optional audit columns if they exist
          deleted_at: new Date().toISOString(),
          deleted_by: (session?.user as any)?.id || null
        })
        .eq('id', id);
      if (upErr) throw upErr;
    } catch (e: any) {
      // If columns don't exist (42703), retry with is_active only
      if (e?.code === '42703' || /column .* does not exist/i.test(e?.message || '')) {
        const { error: up2 } = await (supabase as any)
          .from('clinics')
          .update({ is_active: false })
          .eq('id', id);
        if (up2) error = up2; else error = null;
      } else {
        error = e;
      }
    }

    if (error) {
      console.error('DELETE /api/clinics/[id] error:', error);
      return NextResponse.json({ error: 'Delete failed', details: error.message }, { status: 500 });
    }

    // Log into activity log as recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'clinic',
        entity_id: id,
        title: `نقل إلى سلة المهملات: ${snapshot?.name || id}`,
        details: `تم نقل العيادة إلى سلة المهملات بواسطة ${(session?.user as any)?.email || 'unknown'}`,
        type: 'delete',
        // Store snapshot via activity-logger mapping to old_values
        changes: snapshot ? { snapshot } : undefined,
      }, req as any);
    } catch (logErr) {
      console.warn('Failed to log recycle bin entry:', logErr);
    }

    // Invalidate caches on client and proxies
    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Cache-Invalidate': 'clinics',
        },
      }
    );
  } catch (e: any) {
    console.error('DELETE /api/clinics/[id] exception:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e?.message || e) }, { status: 500 });
  }
}
