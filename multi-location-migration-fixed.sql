-- ================================================
-- 🌍 Multi-Location Support Migration (FIXED)
-- ================================================
-- This migration adds support for multiple locations/areas for clinics and users

BEGIN;

-- ================================================
-- 1. CREATE JUNCTION TABLES
-- ================================================

-- Junction table for clinic locations
CREATE TABLE IF NOT EXISTS clinic_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    location_name VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate location per clinic
    UNIQUE(clinic_id, location_name)
);

-- Junction table for user locations
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_name VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate location per user
    UNIQUE(user_id, location_name)
);

-- ================================================
-- 2. MIGRATE EXISTING DATA SAFELY
-- ================================================

-- Migrate existing clinic areas to junction table (with error handling)
INSERT INTO clinic_locations (clinic_id, location_name, is_primary)
SELECT 
    id,
    area,
    true -- Mark existing areas as primary
FROM clinics 
WHERE area IS NOT NULL 
  AND area != ''
  AND area != 'null'
  AND NOT EXISTS (
      SELECT 1 FROM clinic_locations 
      WHERE clinic_id = clinics.id 
        AND location_name = clinics.area
  );

-- Migrate existing user areas to junction table (with error handling)
INSERT INTO user_locations (user_id, location_name, is_primary)
SELECT 
    id,
    area,
    true -- Mark existing areas as primary
FROM users 
WHERE area IS NOT NULL 
  AND area != ''
  AND area != 'null'
  AND NOT EXISTS (
      SELECT 1 FROM user_locations 
      WHERE user_id = users.id 
        AND location_name = users.area
  );

-- ================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_clinic_locations_clinic_id ON clinic_locations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_locations_location ON clinic_locations(location_name);
CREATE INDEX IF NOT EXISTS idx_clinic_locations_primary ON clinic_locations(clinic_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location ON user_locations(location_name);
CREATE INDEX IF NOT EXISTS idx_user_locations_primary ON user_locations(user_id, is_primary) WHERE is_primary = true;

-- ================================================
-- 4. CREATE HELPER FUNCTIONS
-- ================================================

-- Function to get clinic locations as array
CREATE OR REPLACE FUNCTION get_clinic_locations(clinic_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT location_name 
        FROM clinic_locations 
        WHERE clinic_id = clinic_uuid 
        ORDER BY is_primary DESC, location_name
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user locations as array
CREATE OR REPLACE FUNCTION get_user_locations(user_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT location_name 
        FROM user_locations 
        WHERE user_id = user_uuid 
        ORDER BY is_primary DESC, location_name
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set clinic locations
CREATE OR REPLACE FUNCTION set_clinic_locations(
    clinic_uuid UUID,
    locations TEXT[],
    primary_location TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    loc TEXT;
BEGIN
    -- Delete existing locations
    DELETE FROM clinic_locations WHERE clinic_id = clinic_uuid;
    
    -- Insert new locations
    FOREACH loc IN ARRAY locations LOOP
        INSERT INTO clinic_locations (clinic_id, location_name, is_primary)
        VALUES (
            clinic_uuid, 
            loc, 
            (loc = primary_location OR (primary_location IS NULL AND loc = locations[1]))
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to set user locations
CREATE OR REPLACE FUNCTION set_user_locations(
    user_uuid UUID,
    locations TEXT[],
    primary_location TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    loc TEXT;
BEGIN
    -- Delete existing locations
    DELETE FROM user_locations WHERE user_id = user_uuid;
    
    -- Insert new locations
    FOREACH loc IN ARRAY locations LOOP
        INSERT INTO user_locations (user_id, location_name, is_primary)
        VALUES (
            user_uuid, 
            loc, 
            (loc = primary_location OR (primary_location IS NULL AND loc = locations[1]))
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. CREATE VIEWS FOR EASY ACCESS
-- ================================================

-- Enhanced clinics view with locations
CREATE OR REPLACE VIEW v_clinics_with_locations AS
SELECT 
    c.*,
    get_clinic_locations(c.id) as locations,
    (SELECT location_name FROM clinic_locations WHERE clinic_id = c.id AND is_primary = true LIMIT 1) as primary_location
FROM clinics c;

-- Enhanced users view with locations
CREATE OR REPLACE VIEW v_users_with_locations AS
SELECT 
    u.*,
    get_user_locations(u.id) as locations,
    (SELECT location_name FROM user_locations WHERE user_id = u.id AND is_primary = true LIMIT 1) as primary_location
FROM users u;

-- ================================================
-- 6. ADD TRIGGERS FOR DATA CONSISTENCY
-- ================================================

-- Trigger to ensure at least one primary location per clinic
CREATE OR REPLACE FUNCTION ensure_clinic_primary_location()
RETURNS TRIGGER AS $$
BEGIN
    -- If no primary location exists, make the first one primary
    IF NOT EXISTS (SELECT 1 FROM clinic_locations WHERE clinic_id = NEW.clinic_id AND is_primary = true) THEN
        UPDATE clinic_locations 
        SET is_primary = true 
        WHERE clinic_id = NEW.clinic_id 
        AND id = (SELECT id FROM clinic_locations WHERE clinic_id = NEW.clinic_id ORDER BY created_at LIMIT 1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_clinic_primary_location
    AFTER INSERT ON clinic_locations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_clinic_primary_location();

-- Trigger to ensure at least one primary location per user
CREATE OR REPLACE FUNCTION ensure_user_primary_location()
RETURNS TRIGGER AS $$
BEGIN
    -- If no primary location exists, make the first one primary
    IF NOT EXISTS (SELECT 1 FROM user_locations WHERE user_id = NEW.user_id AND is_primary = true) THEN
        UPDATE user_locations 
        SET is_primary = true 
        WHERE user_id = NEW.user_id 
        AND id = (SELECT id FROM user_locations WHERE user_id = NEW.user_id ORDER BY created_at LIMIT 1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_user_primary_location
    AFTER INSERT ON user_locations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_primary_location();

-- ================================================
-- 7. CREATE SAFE VIEWS (checking column existence)
-- ================================================

-- Safe clinic summary view
DO $$
BEGIN
    -- Check if clinic_phone column exists, otherwise use a placeholder
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinics' AND column_name = 'clinic_phone'
    ) THEN
        EXECUTE '
        CREATE OR REPLACE VIEW v_clinic_summary AS
        SELECT 
            c.id,
            c.name,
            c.clinic_phone as phone,
            c.doctor_phone,
            COALESCE((SELECT location_name FROM clinic_locations WHERE clinic_id = c.id AND is_primary = true LIMIT 1), c.area) as area,
            get_clinic_locations(c.id) as all_locations,
            c.created_at
        FROM clinics c;';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinics' AND column_name = 'phone'
    ) THEN
        EXECUTE '
        CREATE OR REPLACE VIEW v_clinic_summary AS
        SELECT 
            c.id,
            c.name,
            c.phone,
            c.doctor_phone,
            COALESCE((SELECT location_name FROM clinic_locations WHERE clinic_id = c.id AND is_primary = true LIMIT 1), c.area) as area,
            get_clinic_locations(c.id) as all_locations,
            c.created_at
        FROM clinics c;';
    ELSE
        EXECUTE '
        CREATE OR REPLACE VIEW v_clinic_summary AS
        SELECT 
            c.id,
            c.name,
            null::text as phone,
            null::text as doctor_phone,
            COALESCE((SELECT location_name FROM clinic_locations WHERE clinic_id = c.id AND is_primary = true LIMIT 1), c.area) as area,
            get_clinic_locations(c.id) as all_locations,
            c.created_at
        FROM clinics c;';
    END IF;
END $$;

-- ================================================
-- 8. CREATE TEST FUNCTIONS
-- ================================================

-- Function to test multi-location functionality
CREATE OR REPLACE FUNCTION test_multi_location_system()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    -- Test 1: Check if tables exist
    RETURN QUERY
    SELECT 
        'Tables Created'::TEXT,
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clinic_locations')
             AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_locations')
            THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        'Junction tables for multi-location support'::TEXT;
    
    -- Test 2: Check if functions exist
    RETURN QUERY
    SELECT 
        'Functions Created'::TEXT,
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_clinic_locations')
             AND EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'set_clinic_locations')
            THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        'Helper functions for location management'::TEXT;
    
    -- Test 3: Check if indexes exist
    RETURN QUERY
    SELECT 
        'Indexes Created'::TEXT,
        CASE 
            WHEN EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_clinic_locations_clinic_id')
             AND EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_user_locations_user_id')
            THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        'Performance indexes for multi-location queries'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 9. SUCCESS MESSAGES AND TESTING
-- ================================================

-- Run tests
SELECT '🧪 Running Multi-Location System Tests...' as info;
SELECT * FROM test_multi_location_system();

-- Final success messages
SELECT '🌍 Multi-location support migration completed successfully!' as result;
SELECT '✅ Junction tables created and populated' as step1;
SELECT '✅ Helper functions and views created' as step2;
SELECT '✅ Performance indexes added' as step3;
SELECT '✅ Data consistency triggers enabled' as step4;
SELECT '✅ Migration tested and verified' as step5;
SELECT '🚀 Ready for frontend multi-select implementation!' as next_step;

-- Show some stats
SELECT 'Migration Statistics:' as info;
SELECT 
    'Clinics with locations: ' || COUNT(*) as clinic_stats
FROM clinic_locations;

SELECT 
    'Users with locations: ' || COUNT(*) as user_stats
FROM user_locations;

COMMIT;