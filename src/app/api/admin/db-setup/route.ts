import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST /api/admin/db-setup - Setup soft delete columns for all tables
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = String((session?.user as any)?.role || '').toLowerCase();
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    
    // Tables that need soft delete functionality
    const tables = [
      'clinics',
      'orders', 
      'visits',
      'expenses',
      'collections',
      'products',
      'invoices',
      'payments'
    ];

    const results = [];

    for (const table of tables) {
      try {
        // Check if columns already exist
        const { data: columnCheck } = await supabase
          .rpc('execute_sql', {
            query: `
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = '${table}' 
              AND column_name IN ('deleted_at', 'deleted_by')
            `
          });

        const existingColumns = columnCheck?.map((row: any) => row.column_name) || [];
        
        // Add deleted_at column if not exists
        if (!existingColumns.includes('deleted_at')) {
          await supabase.rpc('execute_sql', {
            query: `ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMP NULL;`
          });
          results.push(`Added deleted_at to ${table}`);
        }

        // Add deleted_by column if not exists
        if (!existingColumns.includes('deleted_by')) {
          await supabase.rpc('execute_sql', {
            query: `ALTER TABLE ${table} ADD COLUMN deleted_by UUID REFERENCES users(id);`
          });
          results.push(`Added deleted_by to ${table}`);
        }

        // Create index for better performance
        await supabase.rpc('execute_sql', {
          query: `CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table}(deleted_at);`
        });
        results.push(`Added index for ${table}`);

      } catch (error: any) {
        results.push(`Error with ${table}: ${error.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Database setup completed'
    });

  } catch (error: any) {
    console.error('DB setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed', details: error?.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/db-setup - Check database structure
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = String((session?.user as any)?.role || '').toLowerCase();
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    
    // Check all tables structure
    const tables = [
      'clinics', 'orders', 'visits', 'expenses', 
      'collections', 'products', 'invoices', 'payments'
    ];

    const tableStructures: Record<string, any> = {};

    for (const table of tables) {
      try {
        // Get table columns
        const { data: columns } = await supabase
          .rpc('execute_sql', {
            query: `
              SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
              FROM information_schema.columns 
              WHERE table_name = '${table}'
              ORDER BY ordinal_position
            `
          });

        // Check for soft delete columns specifically
        const softDeleteColumns = columns?.filter((col: any) => 
          ['deleted_at', 'deleted_by'].includes(col.column_name)
        ) || [];

        tableStructures[table] = {
          totalColumns: columns?.length || 0,
          softDeleteColumns: softDeleteColumns,
          hasSoftDelete: softDeleteColumns.length === 2
        };

      } catch (error: any) {
        tableStructures[table] = {
          error: error.message
        };
      }
    }

    return NextResponse.json({ 
      success: true,
      tableStructures,
      summary: {
        tablesWithSoftDelete: Object.keys(tableStructures).filter(
          table => tableStructures[table].hasSoftDelete
        ).length,
        totalTables: Object.keys(tableStructures).length
      }
    });

  } catch (error: any) {
    console.error('DB check error:', error);
    return NextResponse.json(
      { error: 'Check failed', details: error?.message },
      { status: 500 }
    );
  }
}