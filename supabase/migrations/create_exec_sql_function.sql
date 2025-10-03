-- Create exec_sql function for running dynamic SQL
-- This function allows us to execute SQL commands from our Node.js script

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execution permission to service role
GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;

-- Add comment
COMMENT ON FUNCTION public.exec_sql IS 'Execute dynamic SQL commands (restricted to service role)';