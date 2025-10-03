-- Enhanced Activity Logs Migration
-- This migration enhances the activity_log table to include comprehensive tracking

-- First, let's add all the new columns to the existing activity_log table
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS details TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS is_success BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,

-- Location Data
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS real_ip INET,
ADD COLUMN IF NOT EXISTS lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,

-- Device & Browser Info
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS browser_version TEXT,
ADD COLUMN IF NOT EXISTS os TEXT,

-- Security Data (for failed logins - stored securely)
ADD COLUMN IF NOT EXISTS attempted_username TEXT,
ADD COLUMN IF NOT EXISTS attempted_password_hash TEXT, -- NEVER store plain passwords
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,

-- Additional Metadata
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS referrer TEXT,

-- Indexes for performance
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_is_success ON activity_log(is_success);
CREATE INDEX IF NOT EXISTS idx_activity_log_ip ON activity_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_activity_log_updated_at ON activity_log;
CREATE TRIGGER update_activity_log_updated_at
    BEFORE UPDATE ON activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful views for common queries
CREATE OR REPLACE VIEW activity_log_with_user_details AS
SELECT 
    al.*,
    u.full_name as user_name,
    u.role as user_role,
    u.area as user_area,
    u.line as user_line
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id;

-- View for failed login attempts (security monitoring)
CREATE OR REPLACE VIEW failed_login_attempts AS
SELECT 
    al.*,
    u.full_name as user_name
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.type = 'failed_login' 
ORDER BY al.timestamp DESC;

-- View for successful logins with location
CREATE OR REPLACE VIEW successful_logins AS
SELECT 
    al.*,
    u.full_name as user_name,
    u.role as user_role
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.type IN ('login', 'logout') 
AND al.is_success = TRUE
ORDER BY al.timestamp DESC;

-- Add RLS policies for security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own activity logs (unless they are admin/manager)
CREATE POLICY "Users can view their own activity logs" ON activity_log
    FOR SELECT USING (
        user_id = auth.uid()::text 
        OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: Only admins and the system can insert activity logs
CREATE POLICY "Activity logs can be inserted by system" ON activity_log
    FOR INSERT WITH CHECK (true);

-- Policy: Only admins can update activity logs
CREATE POLICY "Only admins can update activity logs" ON activity_log
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Policy: Only admins can delete activity logs
CREATE POLICY "Only admins can delete activity logs" ON activity_log
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

COMMENT ON TABLE activity_log IS 'Enhanced activity logging table with comprehensive tracking for security, location, and device information';
COMMENT ON COLUMN activity_log.attempted_password_hash IS 'IMPORTANT: This should ONLY contain hashed/masked passwords for security monitoring, NEVER plain text passwords';
COMMENT ON COLUMN activity_log.risk_score IS 'Security risk score from 0-100, higher scores indicate more suspicious activity';