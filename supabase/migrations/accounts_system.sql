-- إنشاء جداول نظام الحسابات الاحترافي
-- EP Group System - Accounts Module

-- ===========================
-- جدول العملاء (Customers)
-- ===========================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('regular', 'vip', 'wholesale')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ===========================
-- جدول الفواتير (Invoices)
-- ===========================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'sales' CHECK (invoice_type IN ('sales', 'purchase', 'return_sales', 'return_purchase')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    
    -- المبالغ
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    remaining_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- معلومات إضافية
    notes TEXT,
    terms_conditions TEXT,
    payment_terms VARCHAR(50),
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ===========================
-- جدول تفاصيل الفواتير (Invoice Items)
-- ===========================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1.000,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- جدول المديونيات (Debts/Receivables)
-- ===========================
CREATE TABLE IF NOT EXISTS receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    reference_number VARCHAR(50),
    
    -- المبالغ
    original_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    
    -- التواريخ
    due_date DATE NOT NULL,
    overdue_days INTEGER GENERATED ALWAYS AS (CURRENT_DATE - due_date) STORED,
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'written_off')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- معلومات إضافية
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ===========================
-- جدول التحصيلات (Collections/Payments)
-- ===========================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    receivable_id UUID REFERENCES receivables(id) ON DELETE SET NULL,
    
    -- المبالغ
    amount DECIMAL(15,2) NOT NULL,
    
    -- طريقة الدفع
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online')),
    payment_reference VARCHAR(100), -- رقم الشيك أو رقم التحويل
    
    -- التواريخ
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    bank_date DATE, -- تاريخ استحقاق الشيك أو التحويل
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'bounced', 'cancelled')),
    
    -- معلومات إضافية
    notes TEXT,
    bank_name VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ===========================
-- جدول ربط المدفوعات بالفواتير (Payment Allocations)
-- ===========================
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    receivable_id UUID REFERENCES receivables(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(15,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ===========================
-- جدول سجل التحصيل (Collection History)
-- ===========================
CREATE TABLE IF NOT EXISTS collection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('call', 'visit', 'email', 'sms', 'letter', 'meeting')),
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    action_time TIME DEFAULT CURRENT_TIME,
    
    -- تفاصيل الإجراء
    contact_person VARCHAR(255),
    result VARCHAR(30) CHECK (result IN ('no_answer', 'promised_payment', 'partial_payment', 'full_payment', 'dispute', 'unable_to_pay')),
    promised_date DATE,
    promised_amount DECIMAL(15,2),
    
    -- الملاحظات
    notes TEXT,
    next_action VARCHAR(30),
    next_action_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ===========================
-- إنشاء الفهارس (Indexes)
-- ===========================
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);

CREATE INDEX IF NOT EXISTS idx_collection_history_customer ON collection_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_collection_history_date ON collection_history(action_date);

-- ===========================
-- إنشاء التريغرات (Triggers)
-- ===========================

-- تريغر لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON receivables FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- تريغر لحساب المجاميع في الفواتير
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ),
        tax_amount = (
            SELECT COALESCE(SUM(tax_amount), 0) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        )
    WHERE id = NEW.invoice_id;
    
    UPDATE invoices 
    SET 
        total_amount = subtotal + tax_amount - discount_amount,
        remaining_amount = subtotal + tax_amount - discount_amount - paid_amount
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_invoice_totals_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items 
    FOR EACH ROW EXECUTE PROCEDURE calculate_invoice_totals();

-- تريغر لتحديث رصيد العميل
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers 
    SET balance = (
        SELECT COALESCE(SUM(remaining_amount), 0) 
        FROM invoices 
        WHERE customer_id = NEW.customer_id AND status NOT IN ('cancelled', 'paid')
    )
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_balance_trigger 
    AFTER INSERT OR UPDATE ON invoices 
    FOR EACH ROW EXECUTE PROCEDURE update_customer_balance();

-- ===========================
-- إنشاء الآراء (Views) للتقارير
-- ===========================

-- عرض تقرير الفواتير المستحقة
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT 
    i.id,
    i.invoice_number,
    c.name as customer_name,
    c.phone as customer_phone,
    i.invoice_date,
    i.due_date,
    CURRENT_DATE - i.due_date as overdue_days,
    i.total_amount,
    i.paid_amount,
    i.remaining_amount,
    i.status
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.due_date < CURRENT_DATE 
AND i.remaining_amount > 0
AND i.status NOT IN ('cancelled', 'paid')
ORDER BY i.due_date ASC;

-- عرض تقرير العملاء المدينين
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
    c.id,
    c.customer_code,
    c.name,
    c.phone,
    c.email,
    c.balance,
    c.credit_limit,
    CASE 
        WHEN c.balance > c.credit_limit THEN 'over_limit'
        WHEN c.balance > 0 THEN 'has_balance'
        ELSE 'clear'
    END as balance_status,
    COUNT(i.id) as total_invoices,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.customer_code, c.name, c.phone, c.email, c.balance, c.credit_limit
HAVING c.balance > 0
ORDER BY c.balance DESC;

-- عرض تقرير التحصيلات الشهرية
CREATE OR REPLACE VIEW monthly_collections AS
SELECT 
    DATE_TRUNC('month', p.payment_date) as month,
    COUNT(*) as payment_count,
    SUM(p.amount) as total_collected,
    SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END) as cash_amount,
    SUM(CASE WHEN p.payment_method = 'check' THEN p.amount ELSE 0 END) as check_amount,
    SUM(CASE WHEN p.payment_method = 'bank_transfer' THEN p.amount ELSE 0 END) as transfer_amount
FROM payments p
WHERE p.status = 'confirmed'
GROUP BY DATE_TRUNC('month', p.payment_date)
ORDER BY month DESC;

-- ===========================
-- إدراج بيانات تجريبية (Sample Data)
-- ===========================

-- عملاء تجريبيين
INSERT INTO customers (customer_code, name, phone, email, address, credit_limit) VALUES
('C001', 'شركة الأمل للتجارة', '0501234567', 'amal@company.com', 'الرياض - حي العليا', 50000.00),
('C002', 'مؤسسة النور', '0509876543', 'noor@company.com', 'جدة - حي الحمراء', 30000.00),
('C003', 'شركة المستقبل', '0507654321', 'future@company.com', 'الدمام - حي الفيصلية', 75000.00)
ON CONFLICT (customer_code) DO NOTHING;

COMMENT ON TABLE customers IS 'جدول العملاء - يحتوي على بيانات العملاء وحدود الائتمان';
COMMENT ON TABLE invoices IS 'جدول الفواتير - يحتوي على فواتير المبيعات والمشتريات';
COMMENT ON TABLE invoice_items IS 'جدول تفاصيل الفواتير - يحتوي على بنود كل فاتورة';
COMMENT ON TABLE receivables IS 'جدول المديونيات - يحتوي على المبالغ المستحقة من العملاء';
COMMENT ON TABLE payments IS 'جدول المدفوعات - يحتوي على مدفوعات العملاء';
COMMENT ON TABLE payment_allocations IS 'جدول ربط المدفوعات - يحتوي على ربط المدفوعات بالفواتير';
COMMENT ON TABLE collection_history IS 'جدول سجل التحصيل - يحتوي على سجل أنشطة التحصيل';