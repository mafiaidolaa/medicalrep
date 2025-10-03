-- ========================================
-- 🔍 CLINIC VISIBILITY DIAGNOSTIC SCRIPT
-- ========================================
-- Run this in your Supabase SQL Editor to diagnose the clinic visibility issue

-- 1️⃣ Check if RLS is enabled on clinics table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'clinics';

-- 2️⃣ List all RLS policies on the clinics table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'clinics';

-- 3️⃣ Count total clinics in the database
SELECT COUNT(*) as total_clinics FROM clinics;

-- 4️⃣ List all clinics with their details
SELECT 
    id,
    name,
    doctor_name,
    area,
    line,
    registered_at,
    created_at,
    classification,
    credit_status
FROM clinics 
ORDER BY created_at DESC 
LIMIT 20;

-- 5️⃣ Check if any clinics have NULL area or line (might cause visibility issues)
SELECT 
    COUNT(*) as clinics_with_null_area_or_line,
    COUNT(CASE WHEN area IS NULL THEN 1 END) as null_area,
    COUNT(CASE WHEN line IS NULL THEN 1 END) as null_line
FROM clinics;

-- 6️⃣ List clinics with NULL area or line
SELECT 
    id,
    name,
    area,
    line,
    created_at,
    classification,
    credit_status
FROM clinics 
WHERE area IS NULL OR line IS NULL OR area = '' OR line = ''
ORDER BY created_at DESC;

-- 7️⃣ Check users table for the "mo" user and "admin" user
SELECT 
    id,
    username,
    email,
    role,
    area,
    line,
    is_active
FROM users 
WHERE username IN ('mo', 'admin') OR email LIKE '%admin%';

-- ========================================
-- 🛠️ RECOMMENDED FIX: CREATE PROPER RLS POLICIES
-- ========================================
-- Only run the commands below if RLS policies are missing or incorrect

-- First, disable existing RLS temporarily to see all data
-- ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;

-- Or, create comprehensive RLS policies that work for all users:

-- Policy 1: Allow service role full access (for API routes)
-- CREATE POLICY "Service role has full access" 
-- ON clinics 
-- FOR ALL 
-- TO service_role 
-- USING (true) 
-- WITH CHECK (true);

-- Policy 2: Allow authenticated users to read all clinics
-- (Frontend will handle filtering by role/area/line)
-- CREATE POLICY "Authenticated users can read all clinics" 
-- ON clinics 
-- FOR SELECT 
-- TO authenticated 
-- USING (true);

-- Policy 3: Allow authenticated users to insert clinics
-- CREATE POLICY "Authenticated users can insert clinics" 
-- ON clinics 
-- FOR INSERT 
-- TO authenticated 
-- WITH CHECK (true);

-- Policy 4: Allow users to update clinics they registered
-- CREATE POLICY "Users can update their registered clinics" 
-- ON clinics 
-- FOR UPDATE 
-- TO authenticated 
-- USING (registered_by = auth.uid() OR EXISTS (
--     SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'gm', 'manager')
-- ))
-- WITH CHECK (registered_by = auth.uid() OR EXISTS (
--     SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'gm', 'manager')
-- ));

-- Policy 5: Allow admins and managers to delete clinics
-- CREATE POLICY "Admins and managers can delete clinics" 
-- ON clinics 
-- FOR DELETE 
-- TO authenticated 
-- USING (EXISTS (
--     SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'gm', 'manager')
-- ));

-- ========================================
-- 📊 AFTER APPLYING FIXES, VERIFY:
-- ========================================
-- Re-run the diagnostic queries above to confirm:
-- 1. RLS is enabled
-- 2. Policies are in place
-- 3. All clinics are visible
