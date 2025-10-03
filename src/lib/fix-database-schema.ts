/**
 * Database Schema Fix Script
 * 
 * This script fixes database schema issues including:
 * 1. Adding missing is_enabled column to system_settings table
 * 2. Creating initial system settings records
 * 3. Ensuring proper table structure
 */

import { createServerSupabaseClient } from './supabase';

export const fixDatabaseSchema = async () => {
  try {
    console.log('🔧 Starting database schema fixes...');
    const serverClient = createServerSupabaseClient();

    // First, check if system_settings table exists and create it if it doesn't
    const { data: tables, error: tablesError } = await serverClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'system_settings');

    if (tablesError) {
      console.warn('Could not check table existence:', tablesError);
    }

    // If system_settings table doesn't exist, create it
    if (!tables || tables.length === 0) {
      console.log('📋 Creating system_settings table...');
      
      const { error: createTableError } = await serverClient.rpc('sql', {
        query: `
          CREATE TABLE IF NOT EXISTS public.system_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category VARCHAR(100) NOT NULL,
            setting_key VARCHAR(100) NOT NULL,
            setting_value JSONB DEFAULT '{}',
            description TEXT,
            is_enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            created_by UUID,
            updated_by UUID,
            UNIQUE(category, setting_key)
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
          CREATE INDEX IF NOT EXISTS idx_system_settings_enabled ON public.system_settings(is_enabled);
          
          -- Enable RLS
          ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Allow authenticated users to read system settings" 
          ON public.system_settings FOR SELECT 
          TO authenticated 
          USING (true);
          
          CREATE POLICY "Allow admin users to manage system settings" 
          ON public.system_settings FOR ALL 
          TO authenticated 
          USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
        `
      });

      if (createTableError) {
        console.error('❌ Error creating system_settings table:', createTableError);
        throw createTableError;
      }
      
      console.log('✅ system_settings table created successfully');
    } else {
      // Table exists, check if is_enabled column exists
      console.log('📋 Checking system_settings table schema...');
      
      const { data: columns, error: columnsError } = await serverClient
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'system_settings')
        .eq('column_name', 'is_enabled');

      if (columnsError) {
        console.warn('Could not check column existence:', columnsError);
      }

      // If is_enabled column doesn't exist, add it
      if (!columns || columns.length === 0) {
        console.log('🔧 Adding missing is_enabled column...');
        
        const { error: alterTableError } = await serverClient.rpc('sql', {
          query: `
            ALTER TABLE public.system_settings 
            ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
            
            -- Create index for the new column
            CREATE INDEX IF NOT EXISTS idx_system_settings_enabled 
            ON public.system_settings(is_enabled);
          `
        });

        if (alterTableError) {
          console.error('❌ Error adding is_enabled column:', alterTableError);
          throw alterTableError;
        }
        
        console.log('✅ is_enabled column added successfully');
      } else {
        console.log('✅ is_enabled column already exists');
      }
    }

    // Create initial system settings
    console.log('📝 Creating initial system settings...');
    
    const initialSettings = [
      {
        category: 'ui',
        setting_key: 'default_theme',
        setting_value: { theme: 'light' },
        description: 'Default UI theme for the application',
        is_enabled: true
      },
      {
        category: 'ui',
        setting_key: 'new_user_theme',
        setting_value: { theme: 'light' },
        description: 'Default theme for new users',
        is_enabled: true
      },
      {
        category: 'security',
        setting_key: 'password_policy',
        setting_value: { 
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: false
        },
        description: 'Password complexity requirements',
        is_enabled: true
      },
      {
        category: 'security',
        setting_key: 'session_management',
        setting_value: {
          max_age: 2592000, // 30 days
          update_age: 86400, // 24 hours
          idle_timeout: 3600 // 1 hour
        },
        description: 'Session timeout and management settings',
        is_enabled: true
      },
      {
        category: 'activity_logging',
        setting_key: 'system_enabled',
        setting_value: { enabled: true },
        description: 'Enable system-wide activity logging',
        is_enabled: true
      },
      {
        category: 'activity_logging',
        setting_key: 'login_tracking',
        setting_value: { enabled: true },
        description: 'Track user login/logout activities',
        is_enabled: true
      },
      {
        category: 'activity_logging',
        setting_key: 'location_logging',
        setting_value: { enabled: false },
        description: 'Track user location during activities',
        is_enabled: false
      }
    ];

    for (const setting of initialSettings) {
      try {
        const { error: insertError } = await serverClient
          .from('system_settings')
          .upsert(setting, {
            onConflict: 'category,setting_key',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.warn(`⚠️ Could not insert setting ${setting.category}.${setting.setting_key}:`, insertError);
        } else {
          console.log(`✅ Setting ${setting.category}.${setting.setting_key} created/updated`);
        }
      } catch (settingError) {
        console.warn(`⚠️ Error creating setting ${setting.category}.${setting.setting_key}:`, settingError);
      }
    }

    console.log('✅ Database schema fixes completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  }
};

// Alternative function to use direct SQL if RPC is not available
export const fixDatabaseSchemaDirectSQL = async () => {
  try {
    console.log('🔧 Starting database schema fixes with direct SQL...');
    const serverClient = createServerSupabaseClient();

    // Try to select from system_settings to see if table exists and has proper structure
    const { data: testData, error: testError } = await serverClient
      .from('system_settings')
      .select('id, category, setting_key, setting_value, is_enabled')
      .limit(1);

    if (testError && testError.message.includes('relation "system_settings" does not exist')) {
      console.log('📋 system_settings table does not exist - it may need to be created manually');
      throw new Error('system_settings table does not exist. Please create it manually in your database.');
    }

    if (testError && testError.message.includes('column "is_enabled" does not exist')) {
      console.log('🔧 is_enabled column is missing - it may need to be added manually');
      throw new Error('is_enabled column is missing from system_settings table. Please add it manually.');
    }

    if (testError) {
      console.error('❌ Error checking system_settings table:', testError);
      throw testError;
    }

    // If we get here, the table structure is correct
    console.log('✅ system_settings table structure is correct');

    // Create initial settings if they don't exist
    const initialSettings = [
      {
        category: 'ui',
        setting_key: 'default_theme',
        setting_value: { theme: 'light' },
        description: 'Default UI theme for the application',
        is_enabled: true
      },
      {
        category: 'ui',
        setting_key: 'new_user_theme',
        setting_value: { theme: 'light' },
        description: 'Default theme for new users',
        is_enabled: true
      }
    ];

    for (const setting of initialSettings) {
      try {
        // Check if setting exists
        const { data: existing } = await serverClient
          .from('system_settings')
          .select('id')
          .eq('category', setting.category)
          .eq('setting_key', setting.setting_key)
          .single();

        if (!existing) {
          const { error: insertError } = await serverClient
            .from('system_settings')
            .insert(setting);

          if (insertError) {
            console.warn(`⚠️ Could not insert setting ${setting.category}.${setting.setting_key}:`, insertError);
          } else {
            console.log(`✅ Setting ${setting.category}.${setting.setting_key} created`);
          }
        } else {
          console.log(`✅ Setting ${setting.category}.${setting.setting_key} already exists`);
        }
      } catch (settingError) {
        console.warn(`⚠️ Error checking/creating setting ${setting.category}.${setting.setting_key}:`, settingError);
      }
    }

    console.log('✅ Database schema fixes completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  }
};