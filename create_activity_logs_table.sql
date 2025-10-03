-- Create the missing 'activity_logs' table in the 'public' schema
-- This script creates the table that your application is looking for

-- Option 1: Create activity_logs as a view that references activity_log
-- This keeps both tables in sync automatically
DROP VIEW IF EXISTS public.activity_logs;
CREATE VIEW public.activity_logs AS 
SELECT * FROM public.activity_log;

-- Grant permissions on the view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO anon;

-- Add comment explaining the purpose
COMMENT ON VIEW public.activity_logs IS 'View that provides plural naming for activity_log table to match application expectations';

-- Alternative Option 2: Create activity_logs as a table and sync with triggers
-- Uncomment the lines below if you prefer a real table instead of a view

/*
-- Create the activity_logs table with same structure as activity_log
CREATE TABLE IF NOT EXISTS public.activity_logs (
    LIKE public.activity_log INCLUDING ALL
);

-- Create function to sync activity_log to activity_logs
CREATE OR REPLACE FUNCTION sync_activity_log_to_logs()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activity_logs SELECT NEW.*;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.activity_logs 
        SET 
            user_id = NEW.user_id,
            action = NEW.action,
            entity_type = NEW.entity_type,
            entity_id = NEW.entity_id,
            details = NEW.details,
            timestamp = NEW.timestamp,
            created_at = NEW.created_at,
            title = NEW.title,
            type = NEW.type,
            is_success = NEW.is_success,
            failure_reason = NEW.failure_reason,
            ip_address = NEW.ip_address,
            real_ip = NEW.real_ip,
            lat = NEW.lat,
            lng = NEW.lng,
            location_name = NEW.location_name,
            country = NEW.country,
            city = NEW.city,
            user_agent = NEW.user_agent,
            device = NEW.device,
            browser = NEW.browser,
            browser_version = NEW.browser_version,
            os = NEW.os,
            attempted_username = NEW.attempted_username,
            attempted_password_hash = NEW.attempted_password_hash,
            session_id = NEW.session_id,
            risk_score = NEW.risk_score,
            duration_ms = NEW.duration_ms,
            referrer = NEW.referrer,
            updated_at = NEW.updated_at
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.activity_logs WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to keep both tables in sync
CREATE TRIGGER sync_activity_log_insert
    AFTER INSERT ON public.activity_log
    FOR EACH ROW EXECUTE FUNCTION sync_activity_log_to_logs();

CREATE TRIGGER sync_activity_log_update
    AFTER UPDATE ON public.activity_log
    FOR EACH ROW EXECUTE FUNCTION sync_activity_log_to_logs();

CREATE TRIGGER sync_activity_log_delete
    AFTER DELETE ON public.activity_log
    FOR EACH ROW EXECUTE FUNCTION sync_activity_log_to_logs();

-- Copy existing data from activity_log to activity_logs
INSERT INTO public.activity_logs SELECT * FROM public.activity_log;

-- Grant permissions on the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO anon;
GRANT USAGE, SELECT ON SEQUENCE activity_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE activity_logs_id_seq TO anon;
*/

-- Verify the creation
SELECT 'activity_logs view created successfully' as status;

-- Add page_visit type support
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS page_path TEXT;

-- Test query to make sure it works
SELECT COUNT(*) as total_records FROM public.activity_logs;

-- Insert some test data for verification
INSERT INTO public.activity_log (
    type, title, user_id, action, entity_type, entity_id, 
    details, timestamp, created_at, updated_at, is_success
) VALUES (
    'login', 'تسجيل دخول تجريبي', 'test-user', 'login', 'authentication', 
    'test-user', 'اختبار تسجيل الدخول', NOW(), NOW(), NOW(), true
) ON CONFLICT DO NOTHING;

SELECT 'Activity logs system setup completed successfully!' as status;
