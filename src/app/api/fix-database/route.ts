import { NextRequest, NextResponse } from 'next/server';

// دالة إصلاح activity_log columns
async function fixActivityLogColumns() {
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();
  
  const fixSQL = `
    -- Add missing columns to activity_log
    ALTER TABLE public.activity_log
      ADD COLUMN IF NOT EXISTS external_ip inet,
      ADD COLUMN IF NOT EXISTS internal_ip text,
      ADD COLUMN IF NOT EXISTS provider text,
      ADD COLUMN IF NOT EXISTS accuracy_m integer,
      ADD COLUMN IF NOT EXISTS geohash text,
      ADD COLUMN IF NOT EXISTS s2_cell_id text,
      ADD COLUMN IF NOT EXISTS device_id text,
      ADD COLUMN IF NOT EXISTS device_alias text,
      ADD COLUMN IF NOT EXISTS device_model text,
      ADD COLUMN IF NOT EXISTS entry_hash text,
      ADD COLUMN IF NOT EXISTS prev_hash text,
      ADD COLUMN IF NOT EXISTS ingest_source text;
    
    -- Add useful indexes
    CREATE INDEX IF NOT EXISTS idx_activity_log_external_ip ON public.activity_log (external_ip);
    CREATE INDEX IF NOT EXISTS idx_activity_log_geohash ON public.activity_log (geohash);
    CREATE INDEX IF NOT EXISTS idx_activity_log_device_id ON public.activity_log (device_id);
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: fixSQL });
  
  if (error) {
    // محاولة تنفيذ الأوامر منفردة
    console.log('Trying individual column additions...');
    
    const individualQueries = [
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS external_ip inet',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS internal_ip text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS provider text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS accuracy_m integer',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS geohash text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS s2_cell_id text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS device_id text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS device_alias text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS device_model text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS entry_hash text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS prev_hash text',
      'ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS ingest_source text'
    ];
    
    for (const query of individualQueries) {
      try {
        const { error: individualError } = await supabase.rpc('exec_sql', { sql_query: query });
        if (individualError) {
          console.log(`Query failed: ${query}`, individualError);
        }
      } catch (e) {
        console.log(`Query error: ${query}`, e);
      }
    }
  }
  
  console.log('✅ Activity log columns fix completed');
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Database schema fix requested...');
    
    // Run the database schema fixes (lazy import to avoid build-time resolution)
    const { fixDatabaseSchemaDirectSQL } = await import('@/lib/fix-database-schema');
    await fixDatabaseSchemaDirectSQL();
    
    // Fix activity_log columns
    console.log('🔧 Fixing activity_log columns...');
    await fixActivityLogColumns();
    
    console.log('✅ Database schema fix completed successfully');
    
    return NextResponse.json(
      { message: 'Database schema fixed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to fix database schema', 
        details: errorMessage,
        suggestions: [
          'Check if system_settings table exists in your database',
          'Manually add is_enabled BOOLEAN DEFAULT true column to system_settings table',
          'Ensure proper database permissions are set',
          'Verify Supabase connection is working'
        ]
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Database schema fix endpoint. Use POST to run fixes.',
      info: 'This endpoint fixes missing columns and creates initial system settings'
    },
    { status: 200 }
  );
}