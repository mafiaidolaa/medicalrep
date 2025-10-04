import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// ============================================
// OPTIMIZED CACHING AND THROTTLING SYSTEM
// ============================================

const recentLogs = new Map<string, number>();
const AGGRESSIVE_THROTTLE_MS = 5000; // 5 seconds - much more aggressive
const MAX_CACHE_SIZE = 50; // Smaller cache

// Cleanup old entries
function cleanupCache() {
  const now = Date.now();
  const cutoff = now - (AGGRESSIVE_THROTTLE_MS * 3);
  
  for (const [key, timestamp] of recentLogs.entries()) {
    if (timestamp < cutoff) {
      recentLogs.delete(key);
    }
  }
}

// Run cleanup every 30 seconds
setInterval(() => cleanupCache(), 30000);

// Canonical types and aliases mapping to keep API flexible with client payloads
const TYPE_ALIASES: Record<string, string> = {
  register_clinic: 'clinic_register',
  collection: 'debt_payment',
};
function canonicalType(t: string | undefined): string {
  const key = (t || '').toLowerCase();
  return TYPE_ALIASES[key] ?? key;
}

// ============================================
// GET - Fetch activity logs (optimized)
// ============================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role
    let role = (session?.user as any)?.role;
    if (!['admin', 'manager'].includes(role?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = parseInt(searchParams.get('offset') || '0');

    // Only fetch CRITICAL activity types
    const criticalTypes = ['login', 'logout', 'visit', 'clinic_register', 'order'];

    const { data, error } = await supabase
      .from('activity_log')
      .select('*, users:user_id(id,full_name,username,role)')
      .in('type', criticalTypes)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// POST - Create activity log (HEAVILY OPTIMIZED)
// ============================================
export async function POST(request: NextRequest) {
  try {
    // ✅ FIX: Check if body exists before parsing
    const contentLength = request.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      // Silently ignore empty requests
      return NextResponse.json({ success: true, skipped: true });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      // Invalid JSON - silently ignore
      return NextResponse.json({ success: true, skipped: true });
    }

    const rawType = body?.type;
    const type = canonicalType(rawType);
    const { title, details, isSuccess = true, entityType, entityId } = body;

    // Quick validation
    if (!type || !title) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // ✅ AGGRESSIVE THROTTLING
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'anonymous';
    const logKey = `${userId}-${type}`;
    const now = Date.now();
    const lastLog = recentLogs.get(logKey);

    if (lastLog && (now - lastLog) < AGGRESSIVE_THROTTLE_MS) {
      // Silently throttle - NO console noise
      return NextResponse.json({ 
        success: true, 
        throttled: true 
      });
    }

    recentLogs.set(logKey, now);

    // Cleanup if needed
    if (recentLogs.size > MAX_CACHE_SIZE) {
      cleanupCache();
    }

    // ✅ ONLY LOG CRITICAL ACTIVITIES
    const criticalTypes = ['login', 'logout', 'visit', 'clinic_register', 'order'];
    if (!criticalTypes.includes(type)) {
      // Skip non-critical activities
      return NextResponse.json({ success: true, skipped: true });
    }

    // UUID validation
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    const validUserId = session?.user?.id && isValidUUID(session.user.id) ? session.user.id : null;
    const validEntityId = entityId && isValidUUID(entityId) ? entityId : validUserId;

    // Minimal activity data
    const activityData = {
      type,
      title,
      details: details || '',
      timestamp: new Date().toISOString(),
      user_id: validUserId,
      action: type,
      entity_type: entityType || type,
      entity_id: validEntityId,
      is_success: isSuccess,
      created_at: new Date().toISOString()
    };

    // ✅ ASYNC INSERT - Don't wait for response
    const supabase = createServerSupabaseClient();
    
    supabase
      .from('activity_log')
      .insert(activityData)
      .then(() => {
        // Success - no logging needed
      })
      .catch((error) => {
        // Fail silently in production
        if (process.env.NODE_ENV === 'development') {
          console.warn('Activity log insert failed:', error);
        }
      });

    // Return immediately - don't wait for DB
    return NextResponse.json({ success: true });

  } catch (error) {
    // Fail silently - don't break user experience
    return NextResponse.json({ success: true });
  }
}
