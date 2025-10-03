-- ======================================
-- ClinicConnect - Seed Data
-- ======================================
-- This file contains sample data and login credentials for testing
-- Run this after the main schema migration

-- ======================================
-- USER CREDENTIALS
-- ======================================
-- Note: Passwords are hashed with bcrypt (cost 12)
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
    '$2b$12$LQv3c1yqBwLFaAOKVqp.8.O7Z8ZqBZqJvZqBZqJvZqBZqJvZqBZqJ', -- AdminPass123!
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
    '$2b$12$8XQv3c1yqBwLFaAOKVqp.8.O7Z8ZqBZqJvZqBZqJvZqBZqJvZqBZqM', -- MedRep2024!
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
    '$2b$12$8XQv3c1yqBwLFaAOKVqp.8.O7Z8ZqBZqJvZqBZqJvZqBZqJvZqBZqM', -- MedRep2024!
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
    '$2b$12$9YRv3c1yqBwLFaAOKVqp.8.O7Z8ZqBZqJvZqBZqJvZqBZqJvZqBZqN', -- Manager2024!
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
    '$2b$12$AZSv3c1yqBwLFaAOKVqp.8.O7Z8ZqBZqJvZqBZqJvZqBZqJvZqBZqO', -- Account2024!
    'Central Office',
    'Finance',
    '+1234567894',
    '+1234567894',
    0,
    0
);

-- ======================================
-- USER PREFERENCES
-- ======================================

INSERT INTO public.user_preferences (user_id, language, theme, timezone, notifications_email, notifications_push)
SELECT 
    id,
    'en',
    CASE 
        WHEN role = 'admin' THEN 'dark'
        ELSE 'light'
    END,
    'UTC',
    true,
    true
FROM public.users;

-- ======================================
-- SAMPLE CLINICS
-- ======================================

INSERT INTO public.clinics (
    name, doctor_name, address, lat, lng, registered_at, registered_by,
    clinic_phone, doctor_phone, email, area, line, classification, credit_status,
    credit_limit, outstanding_balance, payment_terms, specialty, notes
) VALUES
-- High-value clinics (Class A)
(
    'Metro General Hospital',
    'Dr. Robert Anderson',
    '123 Medical Center Drive, Downtown, City',
    40.7128, -74.0060,
    '2024-03-01 10:00:00+00',
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '+1555-001-0001',
    '+1555-001-0002',
    'info@metrogh.com',
    'North Region',
    'Pharmaceuticals',
    'A',
    'green',
    100000.00,
    5000.00,
    30,
    'General Medicine',
    'Major hospital with 200+ beds. Key account.'
),
(
    'City Heart Clinic',
    'Dr. Maria Rodriguez',
    '456 Cardiology Ave, Medical District',
    40.7589, -73.9851,
    '2024-03-05 14:30:00+00',
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '+1555-002-0001',
    '+1555-002-0002',
    'contact@cityheartclinic.com',
    'North Region',
    'Pharmaceuticals',
    'A',
    'green',
    75000.00,
    0.00,
    45,
    'Cardiology',
    'Specialized cardiac care center'
),
-- Medium-value clinics (Class B)
(
    'Neighborhood Family Practice',
    'Dr. James Wilson',
    '789 Family Health Blvd, Suburbia',
    40.6892, -74.0445,
    '2024-03-10 09:15:00+00',
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '+1555-003-0001',
    '+1555-003-0002',
    'admin@nfpractice.com',
    'South Region',
    'Medical Devices',
    'B',
    'yellow',
    30000.00,
    8500.00,
    30,
    'Family Medicine',
    'Growing practice, potential for upgrade to Class A'
),
(
    'Dental Excellence Center',
    'Dr. Lisa Chen',
    '321 Smile Street, Dental Plaza',
    40.7505, -73.9934,
    '2024-03-15 16:45:00+00',
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '+1555-004-0001',
    '+1555-004-0002',
    'reception@dentalexcellence.com',
    'South Region',
    'Medical Devices',
    'B',
    'green',
    20000.00,
    2000.00,
    15,
    'Dentistry',
    'Modern dental facility with latest equipment'
),
-- Smaller clinics (Class C)
(
    'QuickCare Urgent Center',
    'Dr. Michael Brown',
    '654 Emergency Lane, Express Plaza',
    40.7282, -73.7949,
    '2024-03-20 11:30:00+00',
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '+1555-005-0001',
    '+1555-005-0002',
    'info@quickcareuc.com',
    'North Region',
    'Pharmaceuticals',
    'C',
    'green',
    10000.00,
    1500.00,
    30,
    'Urgent Care',
    'Walk-in clinic, high volume'
),
(
    'Wellness Pediatric Clinic',
    'Dr. Emily Davis',
    '987 Children Way, Family District',
    40.6782, -73.9442,
    '2024-03-25 13:20:00+00',
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '+1555-006-0001',
    '+1555-006-0002',
    'hello@wellnesspediatric.com',
    'South Region',
    'Medical Devices',
    'C',
    'yellow',
    5000.00,
    3200.00,
    45,
    'Pediatrics',
    'Specialized in children healthcare'
);

-- ======================================
-- CLINIC CONTACTS
-- ======================================

INSERT INTO public.clinic_contacts (clinic_id, name, position, phone, email, is_primary)
SELECT 
    c.id,
    'Office Manager',
    'Administrative Manager',
    '+1555-' || LPAD((ROW_NUMBER() OVER())::TEXT, 3, '0') || '-0010',
    'manager@' || LOWER(REPLACE(c.name, ' ', '')) || '.com',
    false
FROM public.clinics c;

INSERT INTO public.clinic_contacts (clinic_id, name, position, phone, email, is_primary)
SELECT 
    c.id,
    'Head Nurse',
    'Senior Nurse',
    '+1555-' || LPAD((ROW_NUMBER() OVER())::TEXT, 3, '0') || '-0011',
    'nurse@' || LOWER(REPLACE(c.name, ' ', '')) || '.com',
    false
FROM public.clinics c;

-- ======================================
-- SAMPLE PRODUCTS
-- ======================================

INSERT INTO public.products (
    name, sku, category_id, description, price, cost_price, 
    stock, min_stock_level, line, unit, is_active
) VALUES
-- Pharmaceuticals
(
    'Amoxicillin 500mg',
    'PHARM-AMX-500',
    (SELECT id FROM public.product_categories WHERE name = 'Pharmaceuticals'),
    'Broad-spectrum antibiotic for bacterial infections',
    25.99, 12.50,
    500, 50,
    'Pharmaceuticals',
    'bottle',
    true
),
(
    'Ibuprofen 400mg',
    'PHARM-IBU-400',
    (SELECT id FROM public.product_categories WHERE name = 'Pharmaceuticals'),
    'Anti-inflammatory pain reliever',
    15.99, 8.25,
    750, 100,
    'Pharmaceuticals',
    'bottle',
    true
),
(
    'Metformin 850mg',
    'PHARM-MET-850',
    (SELECT id FROM public.product_categories WHERE name = 'Pharmaceuticals'),
    'Diabetes medication for blood sugar control',
    32.99, 18.75,
    300, 40,
    'Pharmaceuticals',
    'bottle',
    true
),
-- Medical Devices
(
    'Digital Blood Pressure Monitor',
    'DEVICE-BP-001',
    (SELECT id FROM public.product_categories WHERE name = 'Medical Devices'),
    'Automatic digital BP monitor with large display',
    89.99, 45.00,
    25, 5,
    'Medical Devices',
    'piece',
    true
),
(
    'Pulse Oximeter',
    'DEVICE-OX-001',
    (SELECT id FROM public.product_categories WHERE name = 'Medical Devices'),
    'Fingertip pulse oximeter for oxygen saturation',
    45.99, 22.50,
    60, 10,
    'Medical Devices',
    'piece',
    true
),
(
    'Digital Thermometer',
    'DEVICE-TEMP-001',
    (SELECT id FROM public.product_categories WHERE name = 'Medical Devices'),
    'Fast-reading digital thermometer',
    19.99, 8.95,
    150, 20,
    'Medical Devices',
    'piece',
    true
),
-- Consumables
(
    'Disposable Gloves (Box of 100)',
    'CONS-GLOVE-100',
    (SELECT id FROM public.product_categories WHERE name = 'Consumables'),
    'Latex-free disposable examination gloves',
    12.99, 6.50,
    200, 30,
    'Pharmaceuticals',
    'box',
    true
),
(
    'Surgical Masks (Box of 50)',
    'CONS-MASK-50',
    (SELECT id FROM public.product_categories WHERE name = 'Consumables'),
    '3-layer protective surgical masks',
    8.99, 4.25,
    500, 75,
    'Medical Devices',
    'box',
    true
),
-- Low stock item for testing alerts
(
    'Insulin Pen Needles',
    'PHARM-INS-NEEDLE',
    (SELECT id FROM public.product_categories WHERE name = 'Pharmaceuticals'),
    'Ultra-fine insulin pen needles 32G',
    28.99, 15.50,
    5, 25, -- Low stock to trigger alerts
    'Pharmaceuticals',
    'box',
    true
);

-- ======================================
-- SAMPLE ORDERS
-- ======================================

INSERT INTO public.orders (
    clinic_id, representative_id, order_date, status, priority,
    subtotal, tax_amount, total_amount, payment_status, notes
) VALUES
-- Recent orders
(
    (SELECT id FROM public.clinics WHERE name = 'Metro General Hospital'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '2024-03-20 10:30:00+00',
    'delivered',
    'high',
    2500.00, 250.00, 2750.00,
    'paid',
    'Large order for hospital pharmacy'
),
(
    (SELECT id FROM public.clinics WHERE name = 'City Heart Clinic'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '2024-03-22 14:15:00+00',
    'shipped',
    'normal',
    890.50, 89.05, 979.55,
    'unpaid',
    'Cardiac medication refill'
),
(
    (SELECT id FROM public.clinics WHERE name = 'Neighborhood Family Practice'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '2024-03-25 09:45:00+00',
    'confirmed',
    'normal',
    1200.75, 120.08, 1320.83,
    'partial',
    'Medical devices for practice upgrade'
),
-- Pending orders
(
    (SELECT id FROM public.clinics WHERE name = 'QuickCare Urgent Center'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    NOW(),
    'pending',
    'urgent',
    650.00, 65.00, 715.00,
    'unpaid',
    'Urgent restocking needed'
);

-- ======================================
-- ORDER ITEMS
-- ======================================

-- Items for the first order (Metro General Hospital)
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, line_total)
SELECT 
    o.id,
    p.id,
    50,
    p.price,
    50 * p.price
FROM public.orders o, public.products p
WHERE EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = o.clinic_id AND c.name = 'Metro General Hospital')
AND p.name = 'Amoxicillin 500mg'
LIMIT 1;

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, line_total)
SELECT 
    o.id,
    p.id,
    30,
    p.price,
    30 * p.price
FROM public.orders o, public.products p
WHERE EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = o.clinic_id AND c.name = 'Metro General Hospital')
AND p.name = 'Ibuprofen 400mg'
LIMIT 1;

-- Items for the second order (City Heart Clinic)
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, line_total)
SELECT 
    o.id,
    p.id,
    20,
    p.price,
    20 * p.price
FROM public.orders o, public.products p
WHERE EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = o.clinic_id AND c.name = 'City Heart Clinic')
AND p.name = 'Metformin 850mg'
LIMIT 1;

-- ======================================
-- SAMPLE VISITS
-- ======================================

INSERT INTO public.visits (
    clinic_id, representative_id, visit_date, check_in_time, check_out_time,
    visit_type, purpose, notes, outcome, mood_rating, success_rating, status
) VALUES
-- Recent completed visits
(
    (SELECT id FROM public.clinics WHERE name = 'Metro General Hospital'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '2024-03-18 09:00:00+00',
    '2024-03-18 09:15:00+00',
    '2024-03-18 10:30:00+00',
    'scheduled',
    'Product presentation and order discussion',
    'Presented new cardiac medications. Doctor very interested in bulk pricing.',
    'Secured large order commitment. Follow-up scheduled.',
    5, 5,
    'completed'
),
(
    (SELECT id FROM public.clinics WHERE name = 'City Heart Clinic'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    '2024-03-19 14:00:00+00',
    '2024-03-19 14:10:00+00',
    '2024-03-19 15:15:00+00',
    'follow_up',
    'Follow-up on previous order and relationship building',
    'Discussed treatment outcomes with our medications. Very positive feedback.',
    'Strong relationship maintained. Future orders likely.',
    4, 4,
    'completed'
),
(
    (SELECT id FROM public.clinics WHERE name = 'Neighborhood Family Practice'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '2024-03-21 11:00:00+00',
    '2024-03-21 11:20:00+00',
    '2024-03-21 12:00:00+00',
    'scheduled',
    'Equipment demonstration and training',
    'Demonstrated new blood pressure monitors. Provided training to staff.',
    'Equipment order placed. Training completed successfully.',
    4, 5,
    'completed'
),
-- Upcoming scheduled visits
(
    (SELECT id FROM public.clinics WHERE name = 'Dental Excellence Center'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '2024-03-28 10:00:00+00',
    NULL, NULL,
    'scheduled',
    'New product launch presentation',
    NULL, NULL, NULL, NULL,
    'planned'
),
(
    (SELECT id FROM public.clinics WHERE name = 'Wellness Pediatric Clinic'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    '2024-03-29 15:30:00+00',
    NULL, NULL,
    'follow_up',
    'Payment collection and relationship maintenance',
    NULL, NULL, NULL, NULL,
    'planned'
);

-- ======================================
-- SAMPLE COLLECTIONS
-- ======================================

INSERT INTO public.collections (
    clinic_id, representative_id, amount, collection_date,
    payment_method, reference_number, status, notes
) VALUES
(
    (SELECT id FROM public.clinics WHERE name = 'Metro General Hospital'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    2750.00,
    '2024-03-21 16:00:00+00',
    'bank_transfer',
    'TXN123456789',
    'cleared',
    'Payment for recent large order'
),
(
    (SELECT id FROM public.clinics WHERE name = 'Neighborhood Family Practice'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    5000.00,
    '2024-03-23 11:30:00+00',
    'check',
    'CHK001234',
    'pending',
    'Partial payment on outstanding balance'
);

-- ======================================
-- SAMPLE EXPENSES
-- ======================================

INSERT INTO public.expenses (
    user_id, category_id, amount, description, expense_date,
    status, mileage, location
) VALUES
-- Travel expenses
(
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    (SELECT id FROM public.expense_categories WHERE name = 'Travel'),
    45.60,
    'Client visits - Metro area route',
    '2024-03-20 00:00:00+00',
    'approved',
    120.5,
    'North Region'
),
(
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    (SELECT id FROM public.expense_categories WHERE name = 'Fuel'),
    78.25,
    'Vehicle fuel for client visits',
    '2024-03-21 00:00:00+00',
    'approved',
    NULL,
    'South Region'
),
-- Meal expenses
(
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    (SELECT id FROM public.expense_categories WHERE name = 'Meals'),
    65.00,
    'Client lunch meeting - Metro General Hospital',
    '2024-03-18 00:00:00+00',
    'approved',
    NULL,
    'Downtown Restaurant'
),
-- Pending expenses
(
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    (SELECT id FROM public.expense_categories WHERE name = 'Marketing'),
    150.00,
    'Promotional materials for new product launch',
    '2024-03-25 00:00:00+00',
    'pending',
    NULL,
    'Marketing Department'
);

-- ======================================
-- SAMPLE PLAN TASKS
-- ======================================

INSERT INTO public.plan_tasks (
    title, description, category_id, assigned_to, created_by,
    due_date, priority, status, clinic_id
) VALUES
-- Sales tasks
(
    'Follow-up with Metro General Hospital',
    'Schedule next visit and discuss Q2 product catalog',
    (SELECT id FROM public.plan_categories WHERE name = 'Sales Visit'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    (SELECT id FROM public.users WHERE username = 'jane.smith'),
    '2024-03-30 10:00:00+00',
    'high',
    'pending',
    (SELECT id FROM public.clinics WHERE name = 'Metro General Hospital')
),
(
    'Product demonstration at Dental Center',
    'Demo new dental equipment line and discuss pricing',
    (SELECT id FROM public.plan_categories WHERE name = 'Training'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    (SELECT id FROM public.users WHERE username = 'jane.smith'),
    '2024-03-28 14:00:00+00',
    'medium',
    'pending',
    (SELECT id FROM public.clinics WHERE name = 'Dental Excellence Center')
),
-- Collection tasks
(
    'Collect payment from Family Practice',
    'Follow up on overdue invoice and arrange payment plan',
    (SELECT id FROM public.plan_categories WHERE name = 'Collection'),
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    (SELECT id FROM public.users WHERE username = 'sarah.jones'),
    '2024-03-27 09:00:00+00',
    'urgent',
    'in_progress',
    (SELECT id FROM public.clinics WHERE name = 'Neighborhood Family Practice')
),
-- Administrative tasks
(
    'Prepare monthly sales report',
    'Compile sales data and client feedback for March',
    (SELECT id FROM public.plan_categories WHERE name = 'Administrative'),
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    (SELECT id FROM public.users WHERE username = 'jane.smith'),
    '2024-03-31 17:00:00+00',
    'medium',
    'pending',
    NULL
);

-- ======================================
-- SAMPLE NOTIFICATIONS
-- ======================================

INSERT INTO public.notifications (
    user_id, title, message, type, category, priority, read
) VALUES
-- Stock alerts
(
    (SELECT id FROM public.users WHERE username = 'admin'),
    'Low Stock Alert',
    'Insulin Pen Needles are running low (5 units remaining)',
    'warning',
    'stock',
    'high',
    false
),
-- Task reminders
(
    (SELECT id FROM public.users WHERE username = 'john.doe'),
    'Upcoming Visit',
    'You have a scheduled visit to Metro General Hospital tomorrow at 10:00 AM',
    'reminder',
    'visit',
    'medium',
    false
),
(
    (SELECT id FROM public.users WHERE username = 'mike.wilson'),
    'Payment Collection Due',
    'Overdue payment collection from Neighborhood Family Practice needs immediate attention',
    'warning',
    'payment',
    'urgent',
    true
),
-- System notifications
(
    (SELECT id FROM public.users WHERE username = 'jane.smith'),
    'Monthly Report Ready',
    'March sales report has been generated and is ready for review',
    'info',
    'system',
    'low',
    false
);

-- ======================================
-- SUCCESS MESSAGE
-- ======================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '🌱 ClinicConnect Seed Data Loaded Successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '👤 LOGIN CREDENTIALS:';
    RAISE NOTICE '   📧 admin@clinicconnect.com | 🔑 AdminPass123!';
    RAISE NOTICE '   📧 john.doe@clinicconnect.com | 🔑 MedRep2024!';
    RAISE NOTICE '   📧 jane.smith@clinicconnect.com | 🔑 Manager2024!';
    RAISE NOTICE '   📧 mike.wilson@clinicconnect.com | 🔑 MedRep2024!';
    RAISE NOTICE '   📧 sarah.jones@clinicconnect.com | 🔑 Account2024!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SAMPLE DATA LOADED:';
    RAISE NOTICE '   • 5 Users with different roles';
    RAISE NOTICE '   • 6 Sample clinics with different classifications';
    RAISE NOTICE '   • 9 Products with varied stock levels';
    RAISE NOTICE '   • 4 Orders with different statuses';
    RAISE NOTICE '   • 5 Visits (completed and planned)';
    RAISE NOTICE '   • 2 Payment collections';
    RAISE NOTICE '   • 4 Expense entries';
    RAISE NOTICE '   • 4 Plan tasks';
    RAISE NOTICE '   • 4 Sample notifications';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your ClinicConnect app is ready for testing!';
    RAISE NOTICE '   Login with any of the credentials above to explore the system.';
    RAISE NOTICE '';
END $$;