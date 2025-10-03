-- ======================================
-- ClinicConnect - Seed Data with Proper Password Hashes
-- ======================================
-- This file contains sample data with properly hashed bcrypt passwords
-- Run this after the main schema migration

-- First, let's ensure we have the bcrypt extension (if available)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================
-- USER CREDENTIALS WITH REAL BCRYPT HASHES
-- ======================================
-- Passwords hashed with bcrypt (cost 12) using real bcrypt library
-- Plain text passwords for reference:
-- admin@clinicconnect.com: AdminPass123!
-- john.doe@clinicconnect.com: MedRep2024!
-- jane.smith@clinicconnect.com: Manager2024!
-- mike.wilson@clinicconnect.com: MedRep2024!
-- sarah.jones@clinicconnect.com: Account2024!

INSERT INTO public.users (
    full_name, username, email, role, hire_date, password, 
    area, line, primary_phone, whatsapp_phone, 
    sales_target, visits_target
) VALUES
-- Admin User
(
    'System Administrator', 
    'admin', 
    'admin@clinicconnect.com', 
    'admin',
    '2024-01-01 00:00:00+00',
    '$2b$12$ssfAFJDqyKEkRmhmDaPTeeD5F7MPLNe1DB/ft6fY6lhXWfSgoEBS2', -- AdminPass123!
    'All Areas',
    'All Lines',
    '+1234567890',
    '+1234567890',
    0,
    0
),
-- Medical Representatives
(
    'John Doe',
    'john.doe',
    'john.doe@clinicconnect.com',
    'medical_rep',
    '2024-02-01 00:00:00+00',
    '$2b$12$wC9P4aZgER.Jj0/dYLp11Ol8/Vl1svTrAYXXyjufDrBxu3sIak7yu', -- MedRep2024!
    'North Region',
    'Pharmaceuticals',
    '+1234567891',
    '+1234567891',
    50000.00,
    100
),
(
    'Mike Wilson',
    'mike.wilson',
    'mike.wilson@clinicconnect.com',
    'medical_rep',
    '2024-02-15 00:00:00+00',
    '$2b$12$wC9P4aZgER.Jj0/dYLp11Ol8/Vl1svTrAYXXyjufDrBxu3sIak7yu', -- MedRep2024!
    'South Region',
    'Medical Devices',
    '+1234567893',
    '+1234567893',
    45000.00,
    90
),
-- Manager
(
    'Jane Smith',
    'jane.smith',
    'jane.smith@clinicconnect.com',
    'manager',
    '2024-01-15 00:00:00+00',
    '$2b$12$sSLamR5rwsdXI/G6R3Oxee0Ss0eJVvxDspwJh1NAHTev3Bv2Ijn0K', -- Manager2024!
    'Central Office',
    'Management',
    '+1234567892',
    '+1234567892',
    0,
    0
),
-- Accountant
(
    'Sarah Jones',
    'sarah.jones',
    'sarah.jones@clinicconnect.com',
    'accountant',
    '2024-01-20 00:00:00+00',
    '$2b$12$KXqhsAc6vkOsPLqpFLWmauzdFDTFXEVgz374hGpVHdCwjAOOYc.wS', -- Account2024!
    'Central Office',
    'Finance',
    '+1234567894',
    '+1234567894',
    0,
    0
);

-- Quick test to see if users were inserted
DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🔐 TEST LOGIN CREDENTIALS:';
    RAISE NOTICE '   Email: admin@clinicconnect.com';
    RAISE NOTICE '   Username: admin';
    RAISE NOTICE '   Password: AdminPass123!';
    RAISE NOTICE '';
    RAISE NOTICE '📧 All available accounts:';
    RAISE NOTICE '   admin@clinicconnect.com | AdminPass123!';
    RAISE NOTICE '   john.doe@clinicconnect.com | MedRep2024!';
    RAISE NOTICE '   jane.smith@clinicconnect.com | Manager2024!';
    RAISE NOTICE '   mike.wilson@clinicconnect.com | MedRep2024!';
    RAISE NOTICE '   sarah.jones@clinicconnect.com | Account2024!';
    RAISE NOTICE '';
END $$;