-- URGENT: Run this single line in Supabase SQL Editor to fix admin login NOW:

UPDATE public.users SET password = '$2b$12$OJAuCmuU9.ayZvBYdvqWyuvn73vpicHfW8jtRFUYod3GxIxJGAggO' WHERE email = 'admin@clinicconnect.com';

-- This updates the admin password to: AdminPass123!
-- After running this, you can login with:
-- Email: admin@clinicconnect.com
-- Password: AdminPass123!