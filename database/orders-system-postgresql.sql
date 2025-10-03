-- ====================================
-- نظام إدارة الطلبات - قاعدة البيانات PostgreSQL
-- Orders Management System - PostgreSQL Database Schema
-- ====================================

-- إنشاء قاعدة البيانات (يجب تنفيذه من خارج قاعدة البيانات)
-- CREATE DATABASE orders_management WITH ENCODING 'UTF8';

-- الاتصال بقاعدة البيانات
-- \c orders_management;

-- تمكين امتداد UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- إنشاء الأنواع المخصصة (ENUMS)
-- Create Custom Types (ENUMS)
-- ====================================

-- نوع دور المستخدم
CREATE TYPE user_role AS ENUM (
    'admin', 'manager', 'medical_rep', 'accountant'
);

-- نوع حالة الطلب
CREATE TYPE order_status AS ENUM (
    'draft', 'pending', 'approved', 'rejected', 
    'processing', 'shipped', 'delivered', 'cancelled', 'returned'
);

-- نوع أولوية الطلب
CREATE TYPE order_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
);

-- نوع طريقة الدفع
CREATE TYPE payment_method AS ENUM (
    'cash', 'bank_transfer', 'deferred'
);

-- نوع الخصم
CREATE TYPE discount_type AS ENUM (
    'percentage', 'fixed', 'demo'
);

-- نوع الموافقة
CREATE TYPE approval_status AS ENUM (
    'pending', 'approved', 'rejected'
);

-- نوع جهة الموافقة
CREATE TYPE approver_type AS ENUM (
    'manager', 'accountant', 'admin'
);

-- نوع معاملة المخزون
CREATE TYPE transaction_type AS ENUM (
    'order_reserve', 'order_fulfill', 'order_cancel', 'order_return', 
    'manual_adjustment', 'purchase', 'damage', 'expired'
);

-- نوع حالة الحجز
CREATE TYPE reservation_status AS ENUM (
    'active', 'expired', 'fulfilled', 'cancelled'
);

-- نوع إعدادات النظام
CREATE TYPE setting_type AS ENUM (
    'string', 'number', 'boolean', 'json'
);

-- ====================================
-- جداول النظام الأساسية
-- Core System Tables
-- ====================================

-- جدول المستخدمين
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    area VARCHAR(100),
    line VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس للمستخدمين
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_area_line ON users(area, line);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_email ON users(email);

-- جدول المناطق والخطوط
CREATE TABLE areas_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_name VARCHAR(100) NOT NULL,
    line_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_area_line UNIQUE (area_name, line_name)
);

CREATE INDEX idx_areas_lines_active ON areas_lines(is_active);

-- جدول فئات المنتجات
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_active ON product_categories(is_active);

-- جدول المنتجات
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    in_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    unit VARCHAR(50) NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    manufacturer VARCHAR(255),
    supplier VARCHAR(255),
    expiry_date DATE,
    manufacturing_date DATE,
    storage_location VARCHAR(100),
    notes TEXT,
    tags JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس للمنتجات
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_stock ON products(in_stock);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_expiry ON products(expiry_date);

-- جدول العيادات
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    area VARCHAR(100) NOT NULL,
    line VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    current_debt DECIMAL(12, 2) DEFAULT 0.00,
    doctor_name VARCHAR(255),
    doctor_phone VARCHAR(20),
    clinic_phone VARCHAR(20),
    email VARCHAR(255),
    tax_number VARCHAR(50),
    commercial_register VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس للعيادات
CREATE INDEX idx_clinics_area_line ON clinics(area, line);
CREATE INDEX idx_clinics_active ON clinics(is_active);
CREATE INDEX idx_clinics_credit ON clinics(credit_limit, current_debt);

-- ====================================
-- جداول الطلبات
-- Orders Tables
-- ====================================

-- جدول الطلبات الرئيسي
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- معلومات العيادة
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
    clinic_name VARCHAR(255) NOT NULL,
    clinic_area VARCHAR(100) NOT NULL,
    clinic_line VARCHAR(100) NOT NULL,
    
    -- معلومات مقدم الطلب
    representative_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    representative_name VARCHAR(255) NOT NULL,
    representative_role user_role NOT NULL,
    
    -- معلومات الطلب
    items_count INTEGER NOT NULL DEFAULT 0,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    
    -- الحسابات المالية
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    items_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    order_discount_type discount_type,
    order_discount_value DECIMAL(10, 2) DEFAULT 0.00,
    order_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    final_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- تفاصيل الطلب
    payment_method payment_method NOT NULL,
    priority order_priority DEFAULT 'medium',
    status order_status DEFAULT 'pending',
    notes TEXT,
    internal_notes TEXT,
    
    -- التواريخ
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    requested_delivery_date DATE,
    approved_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- الاعتمادات
    requires_manager_approval BOOLEAN DEFAULT FALSE,
    requires_accountant_approval BOOLEAN DEFAULT FALSE,
    is_fully_approved BOOLEAN DEFAULT FALSE,
    
    -- التتبع
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE RESTRICT
);

-- إنشاء فهارس للطلبات
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_clinic ON orders(clinic_id);
CREATE INDEX idx_orders_representative ON orders(representative_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_priority ON orders(priority);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_area_line ON orders(clinic_area, clinic_line);
CREATE INDEX idx_orders_approval ON orders(requires_manager_approval, requires_accountant_approval, is_fully_approved);
CREATE INDEX idx_orders_final_total ON orders(final_total);

-- جدول بنود الطلبات
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    requested_quantity INTEGER, -- الكمية المطلوبة أصلاً
    available_quantity INTEGER, -- الكمية المتاحة
    unit VARCHAR(50) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    discount_type discount_type DEFAULT 'percentage',
    item_total DECIMAL(12, 2) NOT NULL, -- السعر × الكمية
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- قيمة الخصم
    final_amount DECIMAL(12, 2) NOT NULL, -- المبلغ النهائي بعد الخصم
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لبنود الطلبات
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_demo ON order_items(is_demo);

-- جدول اعتمادات الطلبات
CREATE TABLE order_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    approver_type approver_type NOT NULL,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approver_name VARCHAR(255) NOT NULL,
    status approval_status DEFAULT 'pending',
    notes TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_order_approver UNIQUE (order_id, approver_type)
);

-- إنشاء فهارس للاعتمادات
CREATE INDEX idx_approvals_order ON order_approvals(order_id);
CREATE INDEX idx_approvals_approver ON order_approvals(approver_id);
CREATE INDEX idx_approvals_status ON order_approvals(status);

-- جدول تاريخ الطلبات
CREATE TABLE order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    previous_status order_status,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    changed_by_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لتاريخ الطلبات
CREATE INDEX idx_history_order ON order_history(order_id);
CREATE INDEX idx_history_status ON order_history(status);
CREATE INDEX idx_history_date ON order_history(created_at);

-- جدول الملفات المرفقة (اختياري)
CREATE TABLE order_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس للملفات المرفقة
CREATE INDEX idx_attachments_order ON order_attachments(order_id);
CREATE INDEX idx_attachments_uploader ON order_attachments(uploaded_by);

-- ====================================
-- جداول إدارة المخزون
-- Inventory Management Tables
-- ====================================

-- جدول حجز المخزون
CREATE TABLE product_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status reservation_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لحجز المخزون
CREATE INDEX idx_reservations_product ON product_reservations(product_id);
CREATE INDEX idx_reservations_order ON product_reservations(order_id);
CREATE INDEX idx_reservations_status ON product_reservations(status);
CREATE INDEX idx_reservations_expires ON product_reservations(expires_at);

-- جدول معاملات المخزون
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    type transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    order_number VARCHAR(50),
    reason TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    user_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لمعاملات المخزون
CREATE INDEX idx_transactions_product ON stock_transactions(product_id);
CREATE INDEX idx_transactions_order ON stock_transactions(order_id);
CREATE INDEX idx_transactions_type ON stock_transactions(type);
CREATE INDEX idx_transactions_date ON stock_transactions(timestamp);
CREATE INDEX idx_transactions_user ON stock_transactions(user_id);

-- ====================================
-- الإعدادات والثوابت
-- Settings and Constants
-- ====================================

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type setting_type DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- هل يمكن عرضها للمستخدمين العاديين
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس للإعدادات
CREATE INDEX idx_settings_key ON system_settings(setting_key);
CREATE INDEX idx_settings_public ON system_settings(is_public);

-- ====================================
-- إدراج البيانات الأساسية
-- Insert Initial Data
-- ====================================

-- إدراج المناطق والخطوط الأساسية
INSERT INTO areas_lines (area_name, line_name, description) VALUES
('الرياض', 'الخط الأول', 'المنطقة الشمالية من الرياض'),
('الرياض', 'الخط الثاني', 'المنطقة الجنوبية من الرياض'),
('الرياض', 'الخط الثالث', 'المنطقة الشرقية من الرياض'),
('جدة', 'الخط الأول', 'شمال جدة'),
('جدة', 'الخط الثاني', 'جنوب جدة'),
('الدمام', 'الخط الأول', 'الدمام والخبر'),
('مكة', 'الخط الأول', 'مكة المكرمة'),
('المدينة', 'الخط الأول', 'المدينة المنورة');

-- إدراج فئات المنتجات
INSERT INTO product_categories (name, name_en, description) VALUES
('أدوية', 'Medicines', 'العقاقير والأدوية الطبية'),
('مستلزمات طبية', 'Medical Supplies', 'الأدوات والمستلزمات الطبية'),
('أجهزة طبية', 'Medical Equipment', 'المعدات والأجهزة الطبية'),
('مكملات غذائية', 'Supplements', 'الفيتامينات والمكملات الغذائية'),
('مستحضرات تجميل', 'Cosmetics', 'منتجات العناية والتجميل الطبية'),
('أدوات جراحة', 'Surgical Tools', 'الأدوات الجراحية المتخصصة');

-- إدراج منتجات عينة
INSERT INTO products (name, name_en, description, price, cost, category_id, in_stock, min_stock, unit, sku, manufacturer) VALUES
('أدوية المضادات الحيوية', 'Antibiotics', 'مضادات حيوية عامة للعدوى البكتيرية', 150.00, 100.00, 
 (SELECT id FROM product_categories WHERE name = 'أدوية' LIMIT 1), 100, 20, 'علبة', 'MED-001', 'شركة الدواء المصرية'),
('مستلزمات جراحية', 'Surgical Supplies', 'أدوات جراحية أساسية معقمة', 75.00, 50.00, 
 (SELECT id FROM product_categories WHERE name = 'مستلزمات طبية' LIMIT 1), 50, 10, 'حزمة', 'SUP-001', 'شركة المستلزمات الطبية'),
('أجهزة قياس ضغط الدم', 'Blood Pressure Monitors', 'جهاز قياس ضغط الدم الرقمي', 300.00, 200.00, 
 (SELECT id FROM product_categories WHERE name = 'أجهزة طبية' LIMIT 1), 25, 5, 'جهاز', 'EQP-001', 'شركة الأجهزة الطبية'),
('أدوية القلب والشرايين', 'Cardiovascular Drugs', 'أدوية علاج أمراض القلب والشرايين', 200.00, 130.00, 
 (SELECT id FROM product_categories WHERE name = 'أدوية' LIMIT 1), 80, 15, 'علبة', 'MED-002', 'شركة القاهرة للأدوية'),
('فيتامين د', 'Vitamin D', 'مكمل غذائي فيتامين د', 120.00, 80.00, 
 (SELECT id FROM product_categories WHERE name = 'مكملات غذائية' LIMIT 1), 60, 10, 'علبة', 'SUP-002', 'شركة المكملات الصحية');

-- إدراج عيادات عينة
INSERT INTO clinics (name, area, line, doctor_name, doctor_phone, clinic_phone, credit_limit, current_debt) VALUES
('عيادة النور للأسنان', 'الرياض', 'الخط الأول', 'د. أحمد محمد', '0501234567', '0112345678', 50000.00, 12000.00),
('مجمع الشفاء الطبي', 'الرياض', 'الخط الثاني', 'د. سارة أحمد', '0509876543', '0119876543', 30000.00, 8000.00),
('عيادة القاهرة للعظام', 'الرياض', 'الخط الأول', 'د. محمد علي', '0551122334', '0111122334', 40000.00, 15000.00),
('مستشفى الملك فيصل', 'الرياض', 'الخط الثالث', 'د. فاطمة حسن', '0556677889', '0116677889', 100000.00, 25000.00);

-- إدراج مستخدمين عينة (يجب تغيير كلمات المرور في الإنتاج)
INSERT INTO users (full_name, email, password_hash, role, area, line, phone, permissions) VALUES
('أحمد محمد المدير', 'manager@example.com', '$2b$10$example_hash_here', 'manager', 'الرياض', 'الخط الأول', '0501111111', 
 '["orders.view", "orders.approve", "orders.edit"]'::jsonb),
('سارة أحمد المندوبة', 'rep@example.com', '$2b$10$example_hash_here', 'medical_rep', 'الرياض', 'الخط الأول', '0502222222', 
 '["orders.view", "orders.create", "orders.edit_own"]'::jsonb),
('محمد علي المحاسب', 'accountant@example.com', '$2b$10$example_hash_here', 'accountant', NULL, NULL, '0503333333', 
 '["orders.view", "orders.approve", "reports.view"]'::jsonb),
('فاطمة حسن الأدمن', 'admin@example.com', '$2b$10$example_hash_here', 'admin', NULL, NULL, '0504444444', 
 '["*"]'::jsonb);

-- إدراج إعدادات النظام الافتراضية
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('default_currency', 'EGP', 'string', 'العملة الافتراضية للنظام', TRUE),
('manager_approval_threshold', '1000', 'number', 'الحد الأدنى للمبلغ الذي يتطلب موافقة المدير (بالجنيه)', FALSE),
('accountant_approval_threshold', '5000', 'number', 'الحد الأدنى للمبلغ الذي يتطلب موافقة المحاسب (بالجنيه)', FALSE),
('demo_max_products', '3', 'number', 'العدد الأقصى للمنتجات في الديمو', TRUE),
('demo_max_quantity_per_product', '1', 'number', 'الكمية القصوى لكل منتج في الديمو', TRUE),
('reservation_expiry_minutes', '30', 'number', 'مدة انتهاء حجز المخزون بالدقائق', FALSE),
('default_page_size', '10', 'number', 'عدد العناصر الافتراضي في الصفحة', TRUE),
('max_page_size', '100', 'number', 'الحد الأقصى لعدد العناصر في الصفحة', FALSE),
('enable_email_notifications', 'true', 'boolean', 'تفعيل الإشعارات عبر البريد الإلكتروني', FALSE),
('enable_sms_notifications', 'false', 'boolean', 'تفعيل الإشعارات عبر الرسائل النصية', FALSE);

-- ====================================
-- مشاهدات مفيدة
-- Useful Views
-- ====================================

-- مشاهدة ملخص الطلبات
CREATE VIEW v_orders_summary AS
SELECT 
    o.*,
    c.doctor_name,
    c.clinic_phone,
    c.credit_limit,
    c.current_debt,
    u.full_name as rep_full_name,
    u.phone as rep_phone,
    (SELECT COUNT(*) FROM order_approvals oa WHERE oa.order_id = o.id AND oa.status = 'pending') as pending_approvals,
    (SELECT COUNT(*) FROM order_approvals oa WHERE oa.order_id = o.id AND oa.status = 'approved') as approved_approvals
FROM orders o
JOIN clinics c ON o.clinic_id = c.id
JOIN users u ON o.representative_id = u.id;

-- مشاهدة المنتجات مع المخزون المتاح
CREATE VIEW v_products_availability AS
SELECT 
    p.*,
    pc.name as category_name,
    COALESCE(r.reserved_quantity, 0) as reserved_quantity,
    (p.in_stock - COALESCE(r.reserved_quantity, 0)) as available_quantity
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN (
    SELECT 
        product_id, 
        SUM(quantity) as reserved_quantity
    FROM product_reservations 
    WHERE status = 'active' AND expires_at > NOW()
    GROUP BY product_id
) r ON p.id = r.product_id;

-- مشاهدة إحصائيات المبيعات اليومية
CREATE VIEW v_daily_sales_stats AS
SELECT 
    DATE(order_date) as sale_date,
    COUNT(*) as total_orders,
    SUM(final_total) as total_revenue,
    AVG(final_total) as average_order_value,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(order_date)
ORDER BY sale_date DESC;

-- ====================================
-- دوال مفيدة
-- Useful Functions
-- ====================================

-- دالة لحساب إجماليات الطلب
CREATE OR REPLACE FUNCTION calculate_order_totals(order_uuid UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12,2) := 0;
    v_items_discount DECIMAL(12,2) := 0;
    v_order_discount DECIMAL(12,2) := 0;
    v_final_total DECIMAL(12,2) := 0;
    v_items_count INTEGER := 0;
    v_total_quantity INTEGER := 0;
BEGIN
    -- حساب المجاميع من البنود
    SELECT 
        COALESCE(SUM(item_total), 0),
        COALESCE(SUM(discount_amount), 0),
        COUNT(*),
        COALESCE(SUM(quantity), 0)
    INTO v_subtotal, v_items_discount, v_items_count, v_total_quantity
    FROM order_items 
    WHERE order_id = order_uuid;
    
    -- الحصول على خصم الطلب
    SELECT COALESCE(order_discount_amount, 0) INTO v_order_discount
    FROM orders WHERE id = order_uuid;
    
    -- حساب الإجمالي النهائي
    v_final_total := v_subtotal - v_items_discount - v_order_discount;
    IF v_final_total < 0 THEN v_final_total := 0; END IF;
    
    -- تحديث الطلب
    UPDATE orders SET 
        subtotal = v_subtotal,
        items_discount_amount = v_items_discount,
        total_discount_amount = v_items_discount + v_order_discount,
        final_total = v_final_total,
        items_count = v_items_count,
        total_quantity = v_total_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = order_uuid;
END;
$$ LANGUAGE plpgsql;

-- دالة لتنظيف الحجوزات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE product_reservations 
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' AND expires_at < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- دالة لتوليد رقم طلب
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    order_num VARCHAR(50);
    counter INTEGER;
BEGIN
    -- الحصول على التاريخ الحالي
    SELECT TO_CHAR(CURRENT_DATE, 'YYYYMMDD') INTO order_num;
    
    -- الحصول على العداد اليومي
    SELECT COUNT(*) + 1 INTO counter
    FROM orders 
    WHERE DATE(order_date) = CURRENT_DATE;
    
    -- تكوين رقم الطلب
    order_num := 'ORD-' || order_num || '-' || LPAD(counter::text, 4, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- مشغلات (Triggers) لضمان تكامل البيانات
-- Triggers for Data Integrity
-- ====================================

-- دالة المشغل لتحديث إجماليات الطلب
CREATE OR REPLACE FUNCTION trigger_update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_order_totals(OLD.order_id);
        RETURN OLD;
    ELSE
        PERFORM calculate_order_totals(NEW.order_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغلات لتحديث إجماليات الطلب
CREATE TRIGGER tr_order_items_calculate_totals
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_order_totals();

-- دالة المشغل لإضافة سجل في تاريخ الطلب
CREATE OR REPLACE FUNCTION trigger_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_history (
            order_id, status, previous_status, 
            changed_by, changed_by_name, 
            notes, created_at
        ) VALUES (
            NEW.id, NEW.status, OLD.status,
            COALESCE(NEW.updated_by, NEW.created_by), 
            (SELECT full_name FROM users WHERE id = COALESCE(NEW.updated_by, NEW.created_by)),
            'تم تغيير الحالة من ' || OLD.status || ' إلى ' || NEW.status,
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغل لتتبع تاريخ الطلب
CREATE TRIGGER tr_order_status_history
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trigger_order_status_history();

-- دالة المشغل لتحديث updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغلات تحديث الوقت
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_areas_lines_updated_at BEFORE UPDATE ON areas_lines
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_product_categories_updated_at BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_product_reservations_updated_at BEFORE UPDATE ON product_reservations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    
CREATE TRIGGER tr_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ====================================
-- تمت إضافة هيكل قاعدة البيانات بنجاح
-- PostgreSQL Database Schema Created Successfully
-- ====================================

-- لاستخدام هذا الملف:
-- 1. تأكد من وجود خادم PostgreSQL
-- 2. إنشاء قاعدة البيانات: createdb orders_management
-- 3. تنفيذ هذا الملف: psql -d orders_management -f orders-system-postgresql.sql
-- 4. قم بتحديث إعدادات الاتصال في التطبيق لاستخدام PostgreSQL

-- ملاحظات مهمة:
-- - تأكد من تغيير كلمات المرور الافتراضية قبل الاستخدام الفعلي
-- - قم بإنشاء مستخدم قاعدة بيانات مخصص للتطبيق مع الصلاحيات المناسبة
-- - راجع إعدادات الأمان والنسخ الاحتياطي حسب بيئة الإنتاج