-- إضافة حقل username إلى جدول المستخدمين
ALTER TABLE users ADD COLUMN username VARCHAR(255);

-- تحديث البيانات الموجودة لتعيين username من email
UPDATE users SET username = email WHERE username IS NULL;

-- جعل حقل username غير فارغ ومفهرس للبحث السريع
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);