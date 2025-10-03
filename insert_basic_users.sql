-- إدراج المستخدمين الأساسيين - نسخة مبسطة
-- كلمات المرور: admin123, manager123

-- Admin user
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@epgroup.com',
  '$2b$12$W/6QngPAwzkp0S1rTTC/SOXbL39C4vlTDxtGXLc4zply9K3XpYCiq',   -- password: admin123
  'مدير النظام',
  'admin',
  true,
  NOW(),
  NOW()
);

-- Manager user  
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'manager@epgroup.com',
  '$2b$12$Z2.UfEKt2dX3BlnqA7zD1eWHaJTgdxcXnE3L6wzuXgSx2JB.C.c3y',     -- password: manager123
  'مدير الفرع',
  'manager',
  true,
  NOW(),
  NOW()
);