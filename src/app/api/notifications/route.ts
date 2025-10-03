import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Send Web Push to users' devices if VAPID keys are configured
async function sendWebPushToUsers(userIds: string[], payload: any) {
  try {
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return; // skip if not configured

    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds);

    if (!subs || subs.length === 0) return;

    await Promise.allSettled(
      subs.map((s: any) => {
        const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any;
        return webpush
          .sendNotification(subscription, JSON.stringify(payload))
          .catch((err: any) => console.warn('Web push failed', err?.statusCode || err?.message));
      })
    );
  } catch (e) {
    console.warn('sendWebPushToUsers skipped/failed:', (e as any)?.message || e);
  }
}

type Audience = {
  user_ids?: string[];
  roles?: string[];
  areas?: string[];
  lines?: string[];
  all?: boolean;
};

async function resolveRecipients(audience: Audience | undefined) {
  const recipients = new Set<string>();
  if (!audience) return recipients;

  if (audience.user_ids?.length) {
    audience.user_ids.forEach((id) => recipients.add(id));
  }

  // If any of roles/areas/lines/all provided, query users table
  const needsQuery = audience.all || (audience.roles?.length || audience.areas?.length || audience.lines?.length);
  if (needsQuery) {
    try {
      if (audience.all) {
        const { data } = await supabase.from('users').select('id');
        data?.forEach((u: any) => u?.id && recipients.add(u.id));
      } else {
        const promises: Promise<any>[] = [];
        if (audience.roles?.length) {
          promises.push(
            supabase.from('users').select('id').in('role', audience.roles)
          );
        }
        if (audience.areas?.length) {
          promises.push(
            supabase.from('users').select('id').in('area', audience.areas)
          );
        }
        if (audience.lines?.length) {
          promises.push(
            supabase.from('users').select('id').in('line', audience.lines)
          );
        }
        const results = await Promise.all(promises);
        results.forEach(({ data }) => {
          data?.forEach((u: any) => u?.id && recipients.add(u.id));
        });
      }
    } catch (e) {
      console.error('Failed to resolve recipients:', e);
    }
  }

  return recipients;
}

function stripNewColumns(row: any) {
  const { section, sender_id, sender_role, audience_type, department, read_at, clicked_at, delivered_at, ...rest } = row;
  return rest;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type');
    const read = searchParams.get('read');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const priority = searchParams.get('priority');
    const section = searchParams.get('section');
    const since = searchParams.get('since'); // ISO string
    const unreadOnly = searchParams.get('unreadOnly'); // 'true' to force read=false
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('notifications')
      .select(`
        *,
        related_type,
        related_id,
        action_url,
        auto_generated
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // إضافة الفلاتر
    if (type) {
      query = query.eq('type', type);
    }
    
    if (read !== null) {
      query = query.eq('read', read === 'true');
    }

    if (unreadOnly === 'true') {
      query = query.eq('read', false);
    }
    
    if (priority) {
      query = query.eq('priority', priority);
    }

    if (section) {
      query = query.eq('section', section);
    }

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // جلب الإحصائيات
    const { data: stats } = await supabase
      .rpc('get_notification_stats', { p_user_id: userId });

    return NextResponse.json({
      notifications,
      stats: stats?.[0] || {
        total_notifications: 0,
        unread_notifications: 0,
        urgent_notifications: 0,
        approval_notifications: 0,
        reminder_notifications: 0,
        budget_alert_notifications: 0
      }
    });

  } catch (error) {
    console.error('Error in notifications GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      title,
      message,
      type = 'info',
      priority = 'medium',
      related_id,
      related_type,
      action_url,
      expires_at,
      data = {},
      // new fields
      section,
      sender_id,
      sender_role,
      audience
    }: {
      user_id?: string;
      title: string;
      message: string;
      type?: string;
      priority?: string;
      related_id?: string;
      related_type?: string;
      action_url?: string;
      expires_at?: string;
      data?: any;
      section?: string;
      sender_id?: string;
      sender_role?: string;
      audience?: Audience;
    } = body;

    if (!title || !message) {
      return NextResponse.json({
        error: 'title and message are required'
      }, { status: 400 });
    }

    // If audience provided or multi-recipient scenario
    const recipients = await resolveRecipients(audience);

    // Fallback to single user_id if no audience targets
    if ((!recipients || recipients.size === 0) && user_id) {
      const row = {
        user_id,
        title,
        message,
        type,
        priority,
        related_id,
        related_type,
        action_url,
        expires_at,
        data,
        auto_generated: false,
        section,
        sender_id,
        sender_role
      } as any;

      // Try insert with new columns; if it fails due to column missing, strip and re-insert
      let insertRes = await supabase
        .from('notifications')
        .insert([row])
        .select()
        .single();

      if (insertRes.error && /column .* does not exist/i.test(insertRes.error.message || '')) {
        const fallbackRow = stripNewColumns(row);
        insertRes = await supabase
          .from('notifications')
          .insert([fallbackRow])
          .select()
          .single();
      }

      if (insertRes.error) {
        console.error('Error creating notification:', insertRes.error);
        return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
      }

      // Fire push to the single recipient (if configured)
      await sendWebPushToUsers([user_id], {
        title,
        body: message,
        id: insertRes.data?.id,
        url: action_url || '/notifications',
        type,
        tag: section || 'notifications'
      });

      return NextResponse.json({ notification: insertRes.data }, { status: 201 });
    }

    if (!recipients || recipients.size === 0) {
      return NextResponse.json({ error: 'No recipients resolved (provide user_id or audience)' }, { status: 400 });
    }

    // Bulk insert for multiple recipients
    const rows = Array.from(recipients).map((uid) => ({
      user_id: uid,
      title,
      message,
      type,
      priority,
      related_id,
      related_type,
      action_url,
      expires_at,
      data,
      auto_generated: false,
      section,
      sender_id,
      sender_role
    }));

    let insertMany = await supabase
      .from('notifications')
      .insert(rows)
      .select();

    if (insertMany.error && /column .* does not exist/i.test(insertMany.error.message || '')) {
      const fallbackRows = rows.map(stripNewColumns);
      insertMany = await supabase
        .from('notifications')
        .insert(fallbackRows)
        .select();
    }

    if (insertMany.error) {
      console.error('Error creating notifications (bulk):', insertMany.error);
      return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 });
    }

    // Push to all recipients
    await sendWebPushToUsers(Array.from(recipients), {
      title,
      body: message,
      // for bulk, no single id is accurate, but we can send a generic tag
      url: action_url || '/notifications',
      type,
      tag: section || 'notifications'
    });

    return NextResponse.json({ inserted: insertMany.data?.length || 0, notifications: insertMany.data }, { status: 201 });

  } catch (error) {
    console.error('Error in notifications POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    let updateData: any = {};
    
    if (action === 'mark_read') {
      updateData = { read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    } else if (action === 'mark_clicked') {
      updateData = { clicked: true, clicked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    } else {
      const body = await request.json();
      updateData = { ...body, updated_at: new Date().toISOString() };
    }

    let updateRes = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .select()
      .single();

    if (updateRes.error && /column .* does not exist/i.test(updateRes.error.message || '')) {
      // Fallback without new columns
      if (action === 'mark_read') {
        updateRes = await supabase
          .from('notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .eq('id', notificationId)
          .select()
          .single();
      } else if (action === 'mark_clicked') {
        updateRes = await supabase
          .from('notifications')
          .update({ clicked: true, updated_at: new Date().toISOString() })
          .eq('id', notificationId)
          .select()
          .single();
      }
    }

    if (updateRes.error) {
      console.error('Error updating notification:', updateRes.error);
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    // Send a silent sync push so other devices reflect the change
    try {
      const updated = updateRes.data as any;
      if (updated?.user_id) {
        await sendWebPushToUsers([updated.user_id], {
          kind: 'update',
          update: action || 'update',
          id: updated.id,
          silent: true,
          tag: 'notifications-sync'
        });
      }
    } catch {}

    return NextResponse.json({ notification: updateRes.data });

  } catch (error) {
    console.error('Error in notifications PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in notifications DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
