-- ======================================
-- Add Manager Hierarchy to Users Table
-- ======================================
-- This adds a manager_id field to enable hierarchical reporting structure
-- where each user can have a direct manager for approvals, notifications, etc.

-- Add manager_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);

-- Add comment for documentation
COMMENT ON COLUMN public.users.manager_id IS 'المدير المباشر - Direct manager/supervisor for this user. Used for approvals, visits display, expenses review, and notifications routing.';

-- Create a helpful view to see the manager-employee relationships
CREATE OR REPLACE VIEW public.user_hierarchy AS
SELECT 
    u.id as user_id,
    u.full_name as user_name,
    u.username,
    u.role as user_role,
    u.area,
    u.line,
    u.is_active,
    m.id as manager_id,
    m.full_name as manager_name,
    m.username as manager_username,
    m.role as manager_role
FROM public.users u
LEFT JOIN public.users m ON u.manager_id = m.id;

-- Grant permissions
GRANT SELECT ON public.user_hierarchy TO authenticated;
GRANT SELECT ON public.user_hierarchy TO service_role;

-- ======================================
-- Example Queries
-- ======================================

-- Get all employees for a specific manager:
-- SELECT * FROM public.user_hierarchy WHERE manager_id = '{{manager_uuid}}';

-- Get manager details for a specific user:
-- SELECT manager_id, manager_name FROM public.user_hierarchy WHERE user_id = '{{user_uuid}}';

-- Get all users without a manager (likely admins or top-level managers):
-- SELECT * FROM public.users WHERE manager_id IS NULL;