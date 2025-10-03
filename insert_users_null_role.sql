-- إدراج المستخدمين الافتراضيين - بدون تحديد الأدوار
-- كلمات المرور: admin123, test123

-- Admin user (role will be NULL initially)
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@epgroup.com',
  '$2b$12$W/6QngPAwzkp0S1rTTC/SOXbL39C4vlTDxtGXLc4zply9K3XpYCiq',   -- password: admin123
  'مدير النظام',
  true,
  NOW(),
  NOW()
);

-- Test user (role will be NULL initially) 
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@epgroup.com',
  '$2b$12$Z2.UfEKt2dX3BlnqA7zD1eWHaJTgdxcXnE3L6wzuXgSx2JB.C.c3y',     -- password: test123
  'مستخدم تجريبي',
  true,
  NOW(),
  NOW()
);