-- Check the enum values for the user_role type
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM 
    pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE 
    t.typname = 'user_role'
ORDER BY 
    e.enumsortorder;