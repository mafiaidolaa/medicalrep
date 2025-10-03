-- إدراج المستخدمين الافتراضيين للنظام
-- كلمات المرور: admin123, manager123, super123

-- Super Admin user (using admin role)
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
  'super@epgroup.com',
  '$2b$12$R9/UBseI5zeqBKlQH4lVueu39PUBKt88ZAuDvq01pWIUoX.bvRfBm',  -- password: super123
  'مدير النظام العام',
  'admin',
  true,
  NOW(),
  NOW()
);

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

-- Representative user
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
  'rep@epgroup.com',
  '$2b$12$oO0mtrMJ4/wVZwmhxYeX9usenl9M0EgUdnQ7J4WT1f6hbgktE7mKu',     -- password: rep123
  'مندوب مبيعات',
  'representative',
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
