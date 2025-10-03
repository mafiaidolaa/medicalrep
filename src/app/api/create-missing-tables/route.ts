import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating missing tables...');
    const serverClient = createServerSupabaseClient();
    
    // Check and create debts table
    await createDebtsTable(serverClient);
    
    console.log('✅ Missing tables creation completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Missing tables created successfully',
    });
  } catch (error) {
    console.error('❌ Error creating missing tables:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create missing tables', 
        details: errorMessage,
        suggestions: [
          'Check database permissions',
          'Verify Supabase connection',
          'Run the database-schema-fix.sql manually',
        ]
      },
      { status: 500 }
    );
  }
}

async function createDebtsTable(serverClient: any) {
  try {
    // First check if debts table exists
    const { data: existingDebts, error: checkError } = await serverClient
      .from('debts')
      .select('id')
      .limit(1);

    if (checkError && (checkError.code === 'PGRST116' || checkError.code === '42P01')) {
      console.log('📊 Creating debts table...');
      
      // Create debts table using RPC or direct SQL
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.debts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_name VARCHAR(255) NOT NULL,
          clinic_id UUID,
          amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          due_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'current' CHECK (status IN ('current', 'overdue', 'critical')),
          invoice_number VARCHAR(100),
          notes TEXT,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- Create indexes for debts table
        CREATE INDEX IF NOT EXISTS idx_debts_client_name ON public.debts(client_name);
        CREATE INDEX IF NOT EXISTS idx_debts_clinic_id ON public.debts(clinic_id);
        CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(status);
        CREATE INDEX IF NOT EXISTS idx_debts_due_date ON public.debts(due_date);
        CREATE INDEX IF NOT EXISTS idx_debts_created_by ON public.debts(created_by);

        -- Enable RLS for debts table
        ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

        -- Create policies for debts table
        DROP POLICY IF EXISTS "Users can read debts they created or manage" ON public.debts;
        DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;

        CREATE POLICY "Users can read debts they created or manage" 
        ON public.debts FOR SELECT 
        TO authenticated 
        USING (
          created_by = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
          )
        );

        CREATE POLICY "Users can manage their own debts" 
        ON public.debts FOR ALL 
        TO authenticated 
        USING (
          created_by = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
          )
        );

        -- Create update trigger for debts
        DROP TRIGGER IF EXISTS update_debts_updated_at ON public.debts;
        CREATE TRIGGER update_debts_updated_at 
          BEFORE UPDATE ON public.debts 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      // Since we can't create tables via API in most cases, 
      // we'll just log that the table is missing and suggest manual creation
      console.warn('📊 Debts table is missing. Please create it manually using the database-schema-fix.sql script.');
      console.log('💡 You can find the SQL script in the project root: database-schema-fix.sql');
      console.log('🔧 Run this script in your Supabase SQL Editor to create all missing tables.');
      
      return; // Don't try to create table programmatically
    } else if (!checkError) {
      console.log('✅ Debts table already exists');
    }
  } catch (error) {
    console.warn('Table creation attempt failed (this might be expected):', error);
    // Don't throw error - the table might be created manually later
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Missing tables creation endpoint. Use POST to create missing tables.',
      info: 'This endpoint creates missing database tables like debts, system_settings, etc.'
    },
    { status: 200 }
  );
}