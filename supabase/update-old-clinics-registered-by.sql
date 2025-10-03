-- ======================================
-- Update Old Clinics with registered_by
-- ======================================
-- This fixes clinics that were added before we added the registered_by field

-- 1. Check how many clinics have NULL registered_by
SELECT 
    'Clinics without registered_by' as status,
    COUNT(*) as count
FROM public.clinics
WHERE registered_by IS NULL;

-- 2. Find the user "mo" ID
SELECT 
    'User mo ID' as info,
    id as user_id,
    full_name,
    username
FROM public.users
WHERE username = 'mo';

-- 3. Update clinic "بلووم" to be registered by "mo"
-- (Replace 'USER_ID_HERE' with the actual UUID from step 2)
/*
UPDATE public.clinics
SET registered_by = 'USER_ID_HERE'
WHERE name LIKE '%بلووم%'
AND registered_by IS NULL;
*/

-- 4. Or update ALL clinics without registered_by to be owned by a default admin
/*
UPDATE public.clinics
SET registered_by = (
    SELECT id FROM public.users WHERE role = 'admin' LIMIT 1
)
WHERE registered_by IS NULL;
*/

-- After updating, verify:
SELECT 
    'Updated Clinics' as status,
    id,
    name,
    registered_by,
    created_at
FROM public.clinics
ORDER BY created_at DESC
LIMIT 10;