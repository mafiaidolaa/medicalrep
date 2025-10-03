import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id, action } = body as { notification_id?: string; action?: string };

    if (!notification_id || !action) {
      return NextResponse.json({ error: 'notification_id and action are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updateData: any = { updated_at: now };

    if (action === 'delivered') {
      updateData.delivered_at = now;
    } else if (action === 'clicked') {
      updateData.clicked = true;
      updateData.clicked_at = now;
    } else if (action === 'read' || action === 'opened') {
      updateData.read = true;
      updateData.read_at = now;
    } else if (action === 'dismissed') {
      // no-op for now; could track dismissed_at if desired
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    let updateRes = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notification_id)
      .select('id')
      .single();

    if (updateRes.error && /column .* does not exist/i.test(updateRes.error.message || '')) {
      // Fallback without new timestamp columns
      if (action === 'clicked') {
        updateRes = await supabase
          .from('notifications')
          .update({ clicked: true, updated_at: now })
          .eq('id', notification_id)
          .select('id')
          .single();
      } else if (action === 'read' || action === 'opened') {
        updateRes = await supabase
          .from('notifications')
          .update({ read: true, updated_at: now })
          .eq('id', notification_id)
          .select('id')
          .single();
      } else if (action === 'delivered' || action === 'dismissed') {
        // ignore silently
        return NextResponse.json({ success: true });
      }
    }

    if (updateRes.error) {
      console.error('Error tracking notification interaction:', updateRes.error);
      return NextResponse.json({ error: 'Failed to track notification interaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in notifications/track POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
