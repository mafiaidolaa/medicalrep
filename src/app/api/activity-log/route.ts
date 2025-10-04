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
const MAX_BATCH = 200; // Maximum items accepted in a single batch
const INSERT_CHUNK_SIZE = 100; // Chunk size for bulk inserts

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

// Session caching to reduce repeated getServerSession() overhead in hot paths
const SESSION_CACHE_MS = 30000; // 30s cache window
const sessionCache = new Map<string, { session: any; ts: number }>();

function sessionCacheKey(req: NextRequest): string {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)(?:__Secure-next-auth\.session-token|next-auth\.session-token)=([^;]+)/);
  if (m) return `cookie:${m[1]}`;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'localhost';
  const ua = req.headers.get('user-agent') || '';
  return `anon:${ip}:${ua}`;
}

async function getCachedSession(req: NextRequest) {
  const key = sessionCacheKey(req);
  const now = Date.now();
  const cached = sessionCache.get(key);
  if (cached && (now - cached.ts) < SESSION_CACHE_MS) return cached.session;
  const session = await getServerSession(authOptions);
  sessionCache.set(key, { session, ts: now });
  // trim LRU-ish
  if (sessionCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(sessionCache.entries());
    entries.sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
      sessionCache.delete(entries[i][0]);
    }
  }
  return session;
}

// Important/critical types aligned with DB views and README
// Canonical types and aliases mapping to keep API flexible with client payloads
const TYPE_ALIASES: Record<string, string> = {
  register_clinic: 'clinic_register',
  collection: 'debt_payment',
};
function canonicalType(t: string | undefined): string {
  const key = (t || '').toLowerCase();
  return TYPE_ALIASES[key] ?? key;
}

const IMPORTANT_TYPES = [
  'login',
  'logout',
  'visit',
  'clinic_register',
  'order',
  'debt_payment',
  'expense_request',
  'plan',
];

// ============================================
// GET - Fetch activity logs (optimized)
// ============================================
export async function GET(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    
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

    const { data, error } = await supabase
      .from('activity_log')
      .select('*, users:user_id(id,full_name,username,role)')
      .in('type', IMPORTANT_TYPES)
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
// Helpers
// ============================================
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function normalizeItem(item: any, session: any) {
  const nowIso = new Date().toISOString();
  const validUserId = session?.user?.id && isValidUUID(session.user.id) ? session.user.id : null;
  const entityId = item.entityId || item.entity_id;
  const entityType = item.entityType || item.entity_type;
  const isSuccess = item.isSuccess ?? item.is_success ?? true;

  return {
    type: item.type,
    title: item.title,
    details: item.details || '',
    timestamp: item.timestamp || nowIso,
    user_id: item.user_id && isValidUUID(item.user_id) ? item.user_id : validUserId,
    action: item.action || item.type,
    entity_type: entityType || item.type,
    entity_id: entityId && isValidUUID(entityId) ? entityId : (validUserId || entityId || null),
    is_success: isSuccess,
    created_at: item.created_at || nowIso,
  };
}

// ============================================
// POST - Create activity log (HEAVILY OPTIMIZED + BATCH SUPPORT)
// ============================================
export async function POST(request: NextRequest) {
  try {
    // ✅ Quick body presence check
    const contentLength = request.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      return NextResponse.json({ success: true, skipped: true });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: true, skipped: true });
    }

    const session = await getCachedSession(request);

    // Support both single object and array
    const items = Array.isArray(body) ? body : [body];

    // Cap batch size
    const capped = items.slice(0, MAX_BATCH);

    // Map to canonical types and filter: require type and title; keep only important types
    const mapped = capped.map((it) => ({ ...it, type: canonicalType(it?.type) }));
    const filtered = mapped.filter((it) => it && it.type && it.title && IMPORTANT_TYPES.includes(it.type));

    if (filtered.length === 0) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Aggressive per-user/type throttle for SINGLE-item requests only
    if (!Array.isArray(body)) {
      const userId = session?.user?.id || 'anonymous';
      const logKey = `${userId}-${filtered[0].type}`;
      const now = Date.now();
      const lastLog = recentLogs.get(logKey);
      if (lastLog && (now - lastLog) < AGGRESSIVE_THROTTLE_MS) {
        return NextResponse.json({ success: true, throttled: true });
      }
      recentLogs.set(logKey, now);
      if (recentLogs.size > MAX_CACHE_SIZE) cleanupCache();
    }

    // Normalize items and deduplicate within batch: (type, entity_id, title) per second
    const normalized = filtered.map((it) => normalizeItem(it, session));
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const it of normalized) {
      const key = `${it.type}|${it.entity_id || ''}|${it.title}|${(it.timestamp || '').slice(0, 19)}`; // second precision
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(it);
      }
    }

    if (deduped.length === 0) {
      return NextResponse.json({ success: true, skipped: true, deduped: true });
    }

    const supabase = createServerSupabaseClient();

    // Insert in chunks to avoid payload limits
    let inserted = 0;
    for (let i = 0; i < deduped.length; i += INSERT_CHUNK_SIZE) {
      const chunk = deduped.slice(i, i + INSERT_CHUNK_SIZE);
      const { error } = await supabase.from('activity_log').insert(chunk as any);
      if (!error) {
        inserted += chunk.length;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('Activity log chunk insert failed:', error);
      }
    }

    return NextResponse.json({ success: true, inserted, total: deduped.length });

  } catch (error) {
    // Fail silently - don't break user experience
    return NextResponse.json({ success: true });
  }
}

// Handle CORS preflight or stray OPTIONS requests quickly
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}
