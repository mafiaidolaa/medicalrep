-- إدراج المستخدمين الافتراضيين - بالأدوار الصحيحة
-- كلمات المرور: admin123, manager123, medical123, acc123

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

-- Medical Representative user
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
  'medical@epgroup.com',
  '$2b$12$oO0mtrMJ4/wVZwmhxYeX9usenl9M0EgUdnQ7J4WT1f6hbgktE7mKu',     -- password: medical123
  'مندوب طبي',
  'medical_rep',
  true,
  NOW(),
  NOW()
);

-- Accountant user
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
  'accountant@epgroup.com',
  '$2b$12$mtEg67yyjoO01Nre/EtdEuqA0KOLiIuMpNoeLgQtUb4sTZhg5jZaa',     -- password: acc123
  'المحاسب',
  'accountant',
  true,
  NOW(),
  NOW()
);