-- ====================================
-- نظام إدارة الطلبات - قاعدة البيانات
-- Orders Management System - Database Schema
-- ====================================

-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS orders_management 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE orders_management;

-- ====================================
-- جداول النظام الأساسية
-- Core System Tables
-- ====================================

-- جدول المستخدمين
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'medical_rep', 'accountant') NOT NULL,
    area VARCHAR(100) NULL,
    line VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_role (role),
    INDEX idx_users_area_line (area, line),
    INDEX idx_users_active (is_active)
);

-- جدول المناطق والخطوط
CREATE TABLE areas_lines (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    area_name VARCHAR(100) NOT NULL,
    line_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_area_line (area_name, line_name),
    INDEX idx_areas_lines_active (is_active)
);

-- جدول فئات المنتجات
CREATE TABLE product_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_categories_active (is_active)
);

-- جدول المنتجات
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NULL,
    description TEXT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NULL,
    category_id VARCHAR(36) NOT NULL,
    in_stock INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 0,
    max_stock INT NULL,
    unit VARCHAR(50) NOT NULL,
    barcode VARCHAR(100) NULL UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    manufacturer VARCHAR(255) NULL,
    supplier VARCHAR(255) NULL,
    expiry_date DATE NULL,
    manufacturing_date DATE NULL,
    storage_location VARCHAR(100) NULL,
    notes TEXT NULL,
    tags JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT,
    INDEX idx_products_category (category_id),
    INDEX idx_products_active (is_active),
    INDEX idx_products_stock (in_stock),
    INDEX idx_products_barcode (barcode),
    INDEX idx_products_expiry (expiry_date)
);

-- جدول العيادات
CREATE TABLE clinics (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NULL,
    area VARCHAR(100) NOT NULL,
    line VARCHAR(100) NOT NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    current_debt DECIMAL(12, 2) DEFAULT 0.00,
    doctor_name VARCHAR(255) NULL,
    doctor_phone VARCHAR(20) NULL,
    clinic_phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    tax_number VARCHAR(50) NULL,
    commercial_register VARCHAR(50) NULL,
    notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_clinics_area_line (area, line),
    INDEX idx_clinics_active (is_active),
    INDEX idx_clinics_credit (credit_limit, current_debt)
);

-- ====================================
-- جداول الطلبات
-- Orders Tables
-- ====================================

-- جدول الطلبات الرئيسي
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- معلومات العيادة
    clinic_id VARCHAR(36) NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    clinic_area VARCHAR(100) NOT NULL,
    clinic_line VARCHAR(100) NOT NULL,
    
    -- معلومات مقدم الطلب
    representative_id VARCHAR(36) NOT NULL,
    representative_name VARCHAR(255) NOT NULL,
    representative_role ENUM('admin', 'manager', 'medical_rep', 'accountant') NOT NULL,
    
    -- معلومات الطلب
    items_count INT NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    
    -- الحسابات المالية
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    items_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    order_discount_type ENUM('percentage', 'fixed', 'demo') NULL,
    order_discount_value DECIMAL(10, 2) NULL DEFAULT 0.00,
    order_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    final_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- تفاصيل الطلب
    payment_method ENUM('cash', 'bank_transfer', 'deferred') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending',
    notes TEXT NULL,
    internal_notes TEXT NULL,
    
    -- التواريخ
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    requested_delivery_date DATE NULL,
    approved_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    
    -- الاعتمادات
    requires_manager_approval BOOLEAN DEFAULT FALSE,
    requires_accountant_approval BOOLEAN DEFAULT FALSE,
    is_fully_approved BOOLEAN DEFAULT FALSE,
    
    -- التتبع
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36) NOT NULL,
    updated_by VARCHAR(36) NULL,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT,
    FOREIGN KEY (representative_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_orders_number (order_number),
    INDEX idx_orders_clinic (clinic_id),
    INDEX idx_orders_representative (representative_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_priority (priority),
    INDEX idx_orders_date (order_date),
    INDEX idx_orders_area_line (clinic_area, clinic_line),
    INDEX idx_orders_approval (requires_manager_approval, requires_accountant_approval, is_fully_approved)
);

-- جدول بنود الطلبات
CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    requested_quantity INT NULL, -- الكمية المطلوبة أصلاً
    available_quantity INT NULL, -- الكمية المتاحة
    unit VARCHAR(50) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    item_total DECIMAL(12, 2) NOT NULL, -- السعر × الكمية
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- قيمة الخصم
    final_amount DECIMAL(12, 2) NOT NULL, -- المبلغ النهائي بعد الخصم
    notes TEXT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id),
    INDEX idx_order_items_demo (is_demo)
);

-- جدول اعتمادات الطلبات
CREATE TABLE order_approvals (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL,
    approver_type ENUM('manager', 'accountant', 'admin') NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    approver_name VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    notes TEXT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    UNIQUE KEY uk_order_approver (order_id, approver_type),
    INDEX idx_approvals_order (order_id),
    INDEX idx_approvals_approver (approver_id),
    INDEX idx_approvals_status (status)
);

-- جدول تاريخ الطلبات
CREATE TABLE order_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL,
    status ENUM('draft', 'pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') NOT NULL,
    previous_status ENUM('draft', 'pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled', 'returned') NULL,
    changed_by VARCHAR(36) NOT NULL,
    changed_by_name VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_history_order (order_id),
    INDEX idx_history_status (status),
    INDEX idx_history_date (created_at)
);

-- جدول الملفات المرفقة (اختياري)
CREATE TABLE order_attachments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    uploaded_by VARCHAR(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_attachments_order (order_id),
    INDEX idx_attachments_uploader (uploaded_by)
);

-- ====================================
-- جداول إدارة المخزون
-- Inventory Management Tables
-- ====================================

-- جدول حجز المخزون
CREATE TABLE product_reservations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status ENUM('active', 'expired', 'fulfilled', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    INDEX idx_reservations_product (product_id),
    INDEX idx_reservations_order (order_id),
    INDEX idx_reservations_status (status),
    INDEX idx_reservations_expires (expires_at)
);

-- جدول معاملات المخزون
CREATE TABLE stock_transactions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    type ENUM('order_reserve', 'order_fulfill', 'order_cancel', 'order_return', 'manual_adjustment', 'purchase', 'damage', 'expired') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    order_id VARCHAR(36) NULL,
    order_number VARCHAR(50) NULL,
    reason TEXT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_transactions_product (product_id),
    INDEX idx_transactions_order (order_id),
    INDEX idx_transactions_type (type),
    INDEX idx_transactions_date (timestamp),
    INDEX idx_transactions_user (user_id)
);

-- ====================================
-- الإعدادات والثوابت
-- Settings and Constants
-- ====================================

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    is_public BOOLEAN DEFAULT FALSE, -- هل يمكن عرضها للمستخدمين العاديين
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_settings_key (setting_key),
    INDEX idx_settings_public (is_public)
);

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
-- الفهارس الإضافية للأداء
-- Additional Performance Indexes
-- ====================================

-- فهارس مركبة للاستعلامات المعقدة
CREATE INDEX idx_orders_clinic_status_date ON orders (clinic_id, status, order_date);
CREATE INDEX idx_orders_representative_status_date ON orders (representative_id, status, order_date);
CREATE INDEX idx_orders_area_line_status ON orders (clinic_area, clinic_line, status);
CREATE INDEX idx_orders_priority_date ON orders (priority, order_date);
CREATE INDEX idx_orders_total_amount ON orders (final_total);

-- فهارس للمنتجات والمخزون
CREATE INDEX idx_products_category_active_stock ON products (category_id, is_active, in_stock);
CREATE INDEX idx_products_low_stock ON products (min_stock, in_stock);
CREATE INDEX idx_stock_transactions_product_date ON stock_transactions (product_id, timestamp);

-- فهارس للبحث النصي
CREATE FULLTEXT INDEX idx_clinics_search ON clinics (name, doctor_name, address);
CREATE FULLTEXT INDEX idx_products_search ON products (name, name_en, description);
CREATE FULLTEXT INDEX idx_orders_search ON orders (order_number, notes);

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
WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(order_date)
ORDER BY sale_date DESC;

-- ====================================
-- الأذونات والأمان
-- Permissions and Security
-- ====================================

-- إنشاء مستخدم للتطبيق (يُنصح بتخصيص كلمة مرور قوية)
-- CREATE USER 'orders_app'@'localhost' IDENTIFIED BY 'your_secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orders_management.* TO 'orders_app'@'localhost';
-- FLUSH PRIVILEGES;

-- ====================================
-- إجراءات مخزنة مفيدة
-- Useful Stored Procedures
-- ====================================

DELIMITER //

-- إجراء لحساب إجماليات الطلب
CREATE PROCEDURE CalculateOrderTotals(IN order_id VARCHAR(36))
BEGIN
    DECLARE v_subtotal DECIMAL(12,2) DEFAULT 0;
    DECLARE v_items_discount DECIMAL(12,2) DEFAULT 0;
    DECLARE v_order_discount DECIMAL(12,2) DEFAULT 0;
    DECLARE v_final_total DECIMAL(12,2) DEFAULT 0;
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_total_quantity INT DEFAULT 0;
    
    -- حساب المجاميع من البنود
    SELECT 
        COALESCE(SUM(item_total), 0),
        COALESCE(SUM(discount_amount), 0),
        COUNT(*),
        COALESCE(SUM(quantity), 0)
    INTO v_subtotal, v_items_discount, v_items_count, v_total_quantity
    FROM order_items 
    WHERE order_id = order_id;
    
    -- الحصول على خصم الطلب
    SELECT COALESCE(order_discount_amount, 0) INTO v_order_discount
    FROM orders WHERE id = order_id;
    
    -- حساب الإجمالي النهائي
    SET v_final_total = v_subtotal - v_items_discount - v_order_discount;
    IF v_final_total < 0 THEN SET v_final_total = 0; END IF;
    
    -- تحديث الطلب
    UPDATE orders SET 
        subtotal = v_subtotal,
        items_discount_amount = v_items_discount,
        total_discount_amount = v_items_discount + v_order_discount,
        final_total = v_final_total,
        items_count = v_items_count,
        total_quantity = v_total_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = order_id;
END //

-- إجراء لتنظيف الحجوزات المنتهية الصلاحية
CREATE PROCEDURE CleanupExpiredReservations()
BEGIN
    UPDATE product_reservations 
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' AND expires_at < NOW();
    
    SELECT ROW_COUNT() as cleaned_reservations;
END //

DELIMITER ;

-- ====================================
-- مشغلات (Triggers) لضمان تكامل البيانات
-- Triggers for Data Integrity
-- ====================================

DELIMITER //

-- مشغل لتحديث إجماليات الطلب عند تغيير البنود
CREATE TRIGGER tr_order_items_update
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    CALL CalculateOrderTotals(NEW.order_id);
END //

CREATE TRIGGER tr_order_items_update_after_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
    CALL CalculateOrderTotals(NEW.order_id);
END //

CREATE TRIGGER tr_order_items_update_after_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
    CALL CalculateOrderTotals(OLD.order_id);
END //

-- مشغل لإضافة سجل في تاريخ الطلب عند تغيير الحالة
CREATE TRIGGER tr_order_status_history
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO order_history (
            order_id, status, previous_status, 
            changed_by, changed_by_name, 
            notes, created_at
        ) VALUES (
            NEW.id, NEW.status, OLD.status,
            COALESCE(NEW.updated_by, NEW.created_by), 
            (SELECT full_name FROM users WHERE id = COALESCE(NEW.updated_by, NEW.created_by)),
            CONCAT('تم تغيير الحالة من ', OLD.status, ' إلى ', NEW.status),
            CURRENT_TIMESTAMP
        );
    END IF;
END //

DELIMITER ;

-- ====================================
-- تمت إضافة هيكل قاعدة البيانات بنجاح
-- Database Schema Created Successfully
-- ====================================

-- لاستخدام هذا الملف:
-- 1. تأكد من وجود خادم MySQL
-- 2. نفذ هذا الملف: mysql -u root -p < orders-system-schema.sql
-- 3. قم بتخصيص المستخدم وكلمة المرور حسب حاجتك
-- 4. تأكد من تحديث إعدادات الاتصال في التطبيق