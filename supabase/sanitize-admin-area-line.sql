-- ======================================
-- Sanitize Admin Users area/line to NULL
-- ======================================
-- This ensures admins are not tied to any specific area/line

-- 1) Preview affected users
SELECT id, full_name, username, role, area, line
FROM public.users
WHERE role = 'admin' AND (
  area IS NOT NULL OR line IS NOT NULL OR
  LOWER(COALESCE(area,'')) LIKE 'all %' OR LOWER(COALESCE(line,'')) LIKE 'all %'
);

-- 2) Sanitize (set to NULL)
UPDATE public.users
SET 
  area = NULL,
  line = NULL,
  updated_at = NOW()
WHERE role = 'admin';

-- 3) Optional: sanitize any leftover 'all ...' for non-admins too (comment out if not needed)
-- UPDATE public.users
-- SET 
--   area = NULLIF(TRIM(area), ''),
--   line = NULLIF(TRIM(line), ''),
--   updated_at = NOW()
-- WHERE LOWER(COALESCE(area,'')) LIKE 'all %' OR LOWER(COALESCE(line,'')) LIKE 'all %';

-- 4) Verify
SELECT id, full_name, username, role, area, line
FROM public.users
WHERE role = 'admin';