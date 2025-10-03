-- نظام إدارة النفقات المتكامل
-- تم إنشاؤه بواسطة المساعد الذكي

-- تفعيل UUID extension إذا لم تكن مفعلة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- حذف الجداول إذا كانت موجودة (للاختبار فقط)
-- DROP TABLE IF EXISTS expense_approvals CASCADE;
-- DROP TABLE IF EXISTS expense_requests CASCADE;
-- DROP TABLE IF EXISTS expense_categories CASCADE;
-- DROP TABLE IF EXISTS expense_system_settings CASCADE;

-- جدول فئات النفقات (ديناميكي يتحكم فيه الأدمن)
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'Receipt',
    color VARCHAR(20) DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- إدراج الفئات الافتراضية
INSERT INTO expense_categories (name, name_ar, name_en, description, icon, color) VALUES
('انتقالات', 'انتقالات', 'Transportation', 'مصاريف الانتقال والمواصلات', 'Car', '#10b981'),
('هدايا', 'هدايا', 'Gifts', 'هدايا العملاء والمناسبات', 'Gift', '#f59e0b'),
('مصاريف سفر', 'مصاريف سفر', 'Travel Expenses', 'مصاريف السفر والإقامة', 'Plane', '#6366f1'),
('مصاريف إرسال', 'مصاريف إرسال', 'Shipping Expenses', 'مصاريف الشحن والتوصيل', 'Truck', '#84cc16'),
('مصاريف ضيافة', 'مصاريف ضيافة', 'Hospitality', 'مصاريف الضيافة والاستقبال', 'Coffee', '#f97316');

-- جدول طلبات النفقات
CREATE TABLE IF NOT EXISTS expense_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    notes TEXT,
    receipt_image TEXT, -- رابط صورة الفاتورة
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expense_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'manager_approved', 'manager_rejected', 'accounting_approved', 'accounting_rejected', 'paid')),
    manager_approval_date TIMESTAMP NULL,
    manager_approval_notes TEXT NULL,
    manager_approved_by UUID NULL REFERENCES auth.users(id),
    accounting_approval_date TIMESTAMP NULL,
    accounting_approval_notes TEXT NULL,
    accounting_approved_by UUID NULL REFERENCES auth.users(id),
    payment_date TIMESTAMP NULL,
    payment_method VARCHAR(50) NULL,
    reference_number VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول تتبع الموافقات (للتتبع التفصيلي)
CREATE TABLE IF NOT EXISTS expense_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'request_info')),
    notes TEXT,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level_type VARCHAR(20) NOT NULL CHECK (level_type IN ('manager', 'accounting'))
);

-- جدول الإعدادات العامة لنظام النفقات
CREATE TABLE IF NOT EXISTS expense_system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id)
);

-- إدراج الإعدادات الافتراضية
INSERT INTO expense_system_settings (setting_key, setting_value, description) VALUES
('max_expense_amount', '10000', 'الحد الأقصى لمبلغ النفقة الواحدة'),
('require_manager_approval', 'true', 'يتطلب موافقة المدير'),
('require_receipt_image', 'false', 'يتطلب صورة الفاتورة'),
('auto_approve_limit', '500', 'المبلغ الذي يتم الموافقة عليه تلقائياً');

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_expense_requests_user_id ON expense_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_requests_date ON expense_requests(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_requests_category ON expense_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_request_id ON expense_approvals(expense_request_id);

-- دوال مفيدة
-- دالة لحساب إجمالي النفقات لمستخدم في فترة معينة
CREATE OR REPLACE FUNCTION get_user_expenses_total(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    total_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO total_amount
    FROM expense_requests
    WHERE user_id = p_user_id
        AND expense_date BETWEEN p_start_date AND p_end_date
        AND status IN ('accounting_approved', 'paid');
    
    RETURN total_amount;
END;
$$;

-- دالة لحساب إحصائيات النفقات حسب الفئة
CREATE OR REPLACE FUNCTION get_expenses_by_category(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    category_name VARCHAR(255),
    category_name_ar VARCHAR(255),
    total_amount DECIMAL(10,2),
    request_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.name,
        ec.name_ar,
        COALESCE(SUM(er.amount), 0) as total_amount,
        COUNT(er.id) as request_count
    FROM expense_categories ec
    LEFT JOIN expense_requests er ON ec.id = er.category_id
        AND er.expense_date BETWEEN p_start_date AND p_end_date
        AND er.status IN ('accounting_approved', 'paid')
    WHERE ec.is_active = TRUE
    GROUP BY ec.id, ec.name, ec.name_ar
    ORDER BY total_amount DESC;
END;
$$;

-- إنشاء RLS policies
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_system_settings ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان للفئات - يمكن للجميع القراءة
CREATE POLICY "Anyone can view active expense categories" ON expense_categories
    FOR SELECT USING (is_active = TRUE);

-- سياسة الأمان للطلبات - المستخدم يرى طلباته فقط، المديرين يرون طلبات فريقهم، المحاسبة ترى الكل
CREATE POLICY "Users can view own expense requests" ON expense_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense requests" ON expense_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending requests" ON expense_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- triggers لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expense_requests_updated_at BEFORE UPDATE ON expense_requests
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- إضافة بيانات وهمية للاختبار
-- (يمكن حذف هذا القسم في الإنتاج)
/*
INSERT INTO expense_requests (user_id, category_id, amount, description, notes, expense_date, status) 
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM expense_categories WHERE name_ar = 'انتقالات'),
    150.00,
    'مواصلات لزيارة العيادات',
    'زيارة 3 عيادات في منطقة المعادي',
    CURRENT_DATE - INTERVAL '2 days',
    'pending';
*/