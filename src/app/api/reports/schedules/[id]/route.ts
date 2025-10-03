import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(req: Request) {
  try {
    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop() as string;
    const updates = await req.json();
    const sb: any = createServerSupabaseClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (typeof updates.name === 'string') payload.name = updates.name;
    if (typeof updates.scope === 'string') payload.scope = updates.scope;
    if (typeof updates.period === 'string') payload.period = updates.period;
    if (updates.custom_start !== undefined) payload.custom_start = updates.custom_start ? new Date(updates.custom_start).toISOString() : null;
    if (updates.custom_end !== undefined) payload.custom_end = updates.custom_end ? new Date(updates.custom_end).toISOString() : null;
    if (Array.isArray(updates.recipients)) payload.recipients = updates.recipients;
    if (typeof updates.enabled === 'boolean') payload.enabled = updates.enabled;

const { data, error } = await sb.from('report_schedules').update(payload as any).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop() as string;
    const sb: any = createServerSupabaseClient();
    const { error } = await sb.from('report_schedules').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}