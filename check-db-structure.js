const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqzgztkdgbwmfaovzfay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxemd6dGtkZ2J3bWZhb3Z6ZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTUwNzU3OSwiZXhwIjoyMDUxMDgzNTc5fQ.XWoAQWHLCFMOTfDZO25Bz5IHCwbBvs3OmLWiRJi2Xss';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDBStructure() {
  try {
    console.log('Checking database structure...\n');
    
    // Check clinics table structure
    const { data: clinicsColumns, error: clinicsError } = await supabase
      .rpc('sql_query', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'clinics' 
          ORDER BY ordinal_position;
        `
      });
    
    if (clinicsError) {
      console.error('Error checking clinics table:', clinicsError);
    } else {
      console.log('Clinics table columns:');
      console.table(clinicsColumns);
    }

    // Check if soft delete columns exist
    const { data: softDeleteCols, error: softError } = await supabase
      .rpc('sql_query', {
        query: `
          SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns 
          WHERE table_name IN ('clinics', 'orders', 'visits', 'expenses', 'collections', 'products')
          AND column_name IN ('deleted_at', 'deleted_by')
          ORDER BY table_name, column_name;
        `
      });
    
    if (softError) {
      console.error('Error checking soft delete columns:', softError);
    } else {
      console.log('\nSoft delete columns in tables:');
      console.table(softDeleteCols);
    }

    // Check foreign key constraints for deleted_by
    const { data: fkConstraints, error: fkError } = await supabase
      .rpc('sql_query', {
        query: `
          SELECT 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND kcu.column_name = 'deleted_by';
        `
      });
    
    if (fkError) {
      console.error('Error checking FK constraints:', fkError);
    } else {
      console.log('\nForeign key constraints for deleted_by:');
      console.table(fkConstraints);
    }

  } catch (error) {
    console.error('General error:', error);
  }
}

checkDBStructure();