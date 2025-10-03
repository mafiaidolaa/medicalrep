import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServerSupabaseClient();
    const { data, error } = await sb.from('report_schedules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const sb = createServerSupabaseClient();
    const insert = {
      name: String(payload.name),
      scope: String(payload.scope || 'rep'),
      period: String(payload.period || 'this_month'),
      custom_start: payload.custom_start ? new Date(payload.custom_start).toISOString() : null,
      custom_end: payload.custom_end ? new Date(payload.custom_end).toISOString() : null,
      recipients: Array.isArray(payload.recipients) ? payload.recipients : [],
      enabled: payload.enabled !== false,
      updated_at: new Date().toISOString()
    } as any;
    const { data, error } = await sb.from('report_schedules').insert(insert).select('*').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}