import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST - Track logout activity (optimized for sendBeacon)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Parse the body (could be from sendBeacon or regular fetch)
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch (error) {
      console.warn('Failed to parse logout request body:', error);
      return NextResponse.json({ success: true }); // Don't fail logout
    }

    const { 
      type = 'logout', 
      title, 
      details = 'تسجيل خروج من النظام', 
      location
    } = body;

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              'localhost';

    // Helper function to validate UUID
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
    
    // Get valid user_id or null for anonymous users
    const validUserId = session?.user?.id && isValidUUID(session.user.id) ? session.user.id : null;

    // Create logout activity data
    const activityData = {
      type,
      title: title || `تسجيل خروج${session?.user?.name ? ` - ${session.user.name}` : ''}`,
      details,
      timestamp: new Date().toISOString(),
      user_id: validUserId,
      action: 'logout',
      entity_type: 'session',
      entity_id: validUserId || `logout_session_${Date.now()}`, // Generate fallback entity_id
      is_success: true,
      
      // Location data (if available)
      lat: location?.lat || null,
      lng: location?.lng || null,
      location_name: location?.locationName || null,
      city: location?.city || null,
      country: location?.country || null,
      location_accuracy: location?.accuracy || null,
      location_source: location?.source || 'unknown',
      
      // Technical data
      ip_address: ip,
      real_ip: ip,
      user_agent: request.headers.get('user-agent')?.substring(0, 200) || 'Unknown',
      device: location?.device || 'Unknown',
      browser: location?.browser || 'Unknown',
      browser_version: location?.browserVersion || null,
      os: location?.os || 'Unknown',
      
      // Session data
      session_id: validUserId ? `logout_${validUserId}_${Date.now()}` : `anonymous_logout_${Date.now()}`,
      risk_score: 0, // Logout is typically low risk
      
      created_at: new Date().toISOString()
    };

    // Insert into database
    const supabase = createServerSupabaseClient();
    
    const { error } = await (supabase as any)
      .from('activity_log')
      .insert(activityData);

    if (error) {
      console.error('Logout tracking database error:', error);
      // Still return success - logout tracking shouldn't fail the logout process
    } else {
      console.log('✅ Logout activity tracked successfully');
    }

    // Always return success for logout tracking
    return NextResponse.json({ success: true });

  } catch (error) {
    console.warn('Logout tracking error (non-critical):', error);
    // Always return success - don't break logout process
    return NextResponse.json({ success: true });
  }
}
