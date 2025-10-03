import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const DATA_DIR = join(process.cwd(), 'data');
const FALLBACK_FILE = join(DATA_DIR, 'push_subscriptions.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function saveSubscriptionFallback(record: any) {
  await ensureDataDir();
  let list: any[] = [];
  if (existsSync(FALLBACK_FILE)) {
    try {
      const txt = await readFile(FALLBACK_FILE, 'utf8');
      list = JSON.parse(txt);
    } catch {
      list = [];
    }
  }
  // Upsert by endpoint
  const idx = list.findIndex((x) => x.endpoint === record.endpoint);
  if (idx >= 0) list[idx] = { ...list[idx], ...record, updated_at: new Date().toISOString() };
  else list.push({ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await writeFile(FALLBACK_FILE, JSON.stringify(list, null, 2), 'utf8');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, subscription } = body as {
      user_id?: string;
      subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    };

    if (!user_id || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'user_id and valid subscription are required' }, { status: 400 });
    }

    const ua = request.headers.get('user-agent') || '';
    const record = {
      user_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: ua,
    };

    // Try Supabase first if configured
    if (supabase) {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          ...record,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' });

      if (error) {
        // If table missing or other schema error, fallback to file
        const msg = (error as any)?.message || '';
        if (/push_subscriptions/i.test(msg) || (error as any)?.code === 'PGRST205') {
          console.warn('push_subscriptions table missing; using file fallback');
          await saveSubscriptionFallback(record);
          return NextResponse.json({ success: true, fallback: 'file' });
        }
        console.error('Failed to save push subscription:', error);
        // Still fallback to file to avoid 500s in dev
        await saveSubscriptionFallback(record);
        return NextResponse.json({ success: true, fallback: 'file' });
      }

      return NextResponse.json({ success: true });
    }

    // No Supabase configured: fallback to file
    await saveSubscriptionFallback(record);
    return NextResponse.json({ success: true, fallback: 'file' });

  } catch (error) {
    console.error('Error in notifications/subscribe POST:', error);
    // Last-resort: do not fail the request; keep UX smooth
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.subscription?.endpoint) {
        await saveSubscriptionFallback({
          user_id: body.user_id || 'anonymous',
          endpoint: body.subscription.endpoint,
          p256dh: body.subscription.keys?.p256dh,
          auth: body.subscription.keys?.auth,
          user_agent: request.headers.get('user-agent') || '',
        });
      }
    } catch {}
    return NextResponse.json({ success: true, fallback: 'file' });
  }
}
