import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * DEBUG ENDPOINT: Clinic Visibility Diagnostic
 * 
 * This endpoint helps diagnose why clinics might not be visible after creation.
 * 
 * Usage: GET /api/clinics/debug
 * 
 * Only use in development! Remove or protect with authentication in production.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const diagnosticResults: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      serviceRoleKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      currentUser: user ? {
        id: user.id,
        email: user.email,
      } : null,
      authError: authError?.message || null,
      tests: {},
    };

    // Test 1: Fetch clinics count using service role (should bypass RLS)
    try {
      const { count: serviceRoleCount, error: countError } = await supabase
        .from('clinics')
        .select('*', { count: 'exact', head: true });
      
      diagnosticResults.tests.serviceRoleClinicCount = {
        success: !countError,
        count: serviceRoleCount,
        error: countError?.message || null,
      };
    } catch (e: any) {
      diagnosticResults.tests.serviceRoleClinicCount = {
        success: false,
        error: e.message,
      };
    }

    // Test 2: Fetch latest 10 clinics with full details
    try {
      const { data: latestClinics, error: fetchError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      diagnosticResults.tests.latestClinics = {
        success: !fetchError,
        count: latestClinics?.length || 0,
        clinics: latestClinics?.map(c => ({
          id: c.id,
          name: c.name,
          area: c.area,
          line: c.line,
          registered_at: c.registered_at,
          created_at: c.created_at,
          classification: c.classification,
          credit_status: c.credit_status,
        })) || [],
        error: fetchError?.message || null,
      };
    } catch (e: any) {
      diagnosticResults.tests.latestClinics = {
        success: false,
        error: e.message,
      };
    }

    // Test 3: Check for clinics with NULL area or line
    try {
      const { data: nullClinics, error: nullError } = await supabase
        .from('clinics')
        .select('id, name, area, line, created_at')
        .or('area.is.null,line.is.null')
        .limit(10);
      
      diagnosticResults.tests.clinicsWithNullAreaOrLine = {
        success: !nullError,
        count: nullClinics?.length || 0,
        clinics: nullClinics || [],
        error: nullError?.message || null,
      };
    } catch (e: any) {
      diagnosticResults.tests.clinicsWithNullAreaOrLine = {
        success: false,
        error: e.message,
      };
    }

    // Test 4: Check cache status
    diagnosticResults.tests.cache = {
      note: 'Check browser console for cache-related logs. Frontend uses in-memory cache with 2-minute TTL.',
      recommendation: 'After creating a clinic, wait 2 minutes or clear cache to see updates.',
    };

    // Test 5: RLS policy check (this would need direct postgres access)
    diagnosticResults.tests.rlsPolicies = {
      note: 'Run the diagnose_clinics_rls.sql script in Supabase SQL Editor to check RLS policies',
      sqlScriptLocation: 'diagnose_clinics_rls.sql in project root',
    };

    // Recommendations based on results
    const recommendations: string[] = [];
    
    if (!diagnosticResults.serviceRoleKeyPresent) {
      recommendations.push('⚠️ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! Add it to .env.local and restart the dev server.');
    }
    
    if (diagnosticResults.tests.serviceRoleClinicCount?.count === 0) {
      recommendations.push('ℹ️ No clinics found in database. This is expected if this is a new installation.');
    }
    
    if (diagnosticResults.tests.clinicsWithNullAreaOrLine?.count > 0) {
      recommendations.push(`⚠️ Found ${diagnosticResults.tests.clinicsWithNullAreaOrLine.count} clinics with NULL area or line. This may cause visibility issues for non-admin users.`);
    }
    
    if (!diagnosticResults.currentUser) {
      recommendations.push('⚠️ No authenticated user found. Make sure you are logged in.');
    }

    recommendations.push('✅ Run the SQL diagnostic script (diagnose_clinics_rls.sql) in Supabase SQL Editor for detailed RLS policy analysis.');
    recommendations.push('✅ Check browser console logs when fetching clinics - look for "✅ Fetched X clinics" messages.');
    recommendations.push('✅ Clear browser cache and hard refresh (Ctrl+Shift+R) to ensure fresh data.');

    diagnosticResults.recommendations = recommendations;

    return NextResponse.json(diagnosticResults, { status: 200 });
  } catch (e: any) {
    console.error('Error in clinic debug endpoint:', e);
    return NextResponse.json({ 
      error: 'Diagnostic failed', 
      details: e.message || String(e) 
    }, { status: 500 });
  }
}
