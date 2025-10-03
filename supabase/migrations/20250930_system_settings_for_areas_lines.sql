-- ===============================================
-- System Settings Table for Areas and Lines
-- ===============================================
-- This removes dependency on localStorage and makes everything database-driven

-- Step 1: Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'array', 'object')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON public.system_settings(is_public) WHERE is_public = true;

-- Step 2: Insert default areas and lines
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
    ('app_areas', '["القاهرة", "الجيزة", "الاسكندرية"]'::jsonb, 'array', 'قائمة المناطق الجغرافية المتاحة في النظام', true),
    ('app_lines', '["الخط الأول", "الخط الثاني", "الخط الثالث"]'::jsonb, 'array', 'قائمة الخطوط التجارية المتاحة في النظام', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Step 3: Create RLS policies for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read public settings
CREATE POLICY "system_settings_select_public"
ON public.system_settings
FOR SELECT
TO public
USING (is_public = true);

-- Only admins can read all settings
CREATE POLICY "system_settings_select_admin"
ON public.system_settings
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
        AND users.is_active = true
    )
);

-- Only admins can insert settings
CREATE POLICY "system_settings_insert_admin"
ON public.system_settings
FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
        AND users.is_active = true
    )
);

-- Only admins can update settings
CREATE POLICY "system_settings_update_admin"
ON public.system_settings
FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
        AND users.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
        AND users.is_active = true
    )
);

-- Only admins can delete settings
CREATE POLICY "system_settings_delete_admin"
ON public.system_settings
FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
        AND users.is_active = true
    )
);

-- Step 4: Create helper function to get setting value
CREATE OR REPLACE FUNCTION public.get_setting(key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT setting_value INTO result
    FROM public.system_settings
    WHERE setting_key = key
    AND is_public = true;
    
    RETURN result;
END;
$$;

-- Step 5: Create helper function to update setting (admin only)
CREATE OR REPLACE FUNCTION public.update_setting(
    key TEXT,
    value JSONB,
    updated_by_uid UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = COALESCE(updated_by_uid, auth.uid())
        AND role = 'admin'
        AND is_active = true
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can update system settings';
    END IF;
    
    -- Update the setting
    UPDATE public.system_settings
    SET 
        setting_value = value,
        updated_at = NOW(),
        updated_by = COALESCE(updated_by_uid, auth.uid())
    WHERE setting_key = key;
    
    RETURN FOUND;
END;
$$;

-- Step 6: Grant permissions
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Step 7: Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_system_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_system_settings_timestamp ON public.system_settings;

CREATE TRIGGER trigger_update_system_settings_timestamp
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_system_settings_timestamp();

-- Step 8: Verify setup
SELECT 
    '✅ SYSTEM SETTINGS CREATED' as info,
    'Areas and Lines are now database-driven' as status;

-- Show current settings
SELECT 
    'Current Settings' as category,
    setting_key,
    setting_value,
    setting_type,
    is_public,
    description
FROM public.system_settings
WHERE setting_key IN ('app_areas', 'app_lines')
ORDER BY setting_key;

-- Test the helper function
SELECT 
    'Test get_setting()' as category,
    'app_areas' as key,
    get_setting('app_areas') as value;

SELECT 
    'Test get_setting()' as category,
    'app_lines' as key,
    get_setting('app_lines') as value;

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ SYSTEM SETTINGS TABLE CREATED SUCCESSFULLY!';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 What was created:';
    RAISE NOTICE '  1. system_settings table with RLS';
    RAISE NOTICE '  2. Default areas: القاهرة, الجيزة, الاسكندرية';
    RAISE NOTICE '  3. Default lines: الخط الأول, الثاني, الثالث';
    RAISE NOTICE '  4. Helper functions: get_setting(), update_setting()';
    RAISE NOTICE '  5. RLS policies for admin-only updates';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Benefits:';
    RAISE NOTICE '  - No more localStorage dependency';
    RAISE NOTICE '  - All data in database (reliable & persistent)';
    RAISE NOTICE '  - Admins can update from settings page';
    RAISE NOTICE '  - All users see same values (synchronized)';
    RAISE NOTICE '';
END $$;
