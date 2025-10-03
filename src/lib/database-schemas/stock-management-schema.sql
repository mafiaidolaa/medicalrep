-- ==================================================================
-- 🏭 EP Group System - Stock Management Database Schema
-- نظام إدارة المخازن - مخطط قاعدة البيانات الشامل
-- العملة الموحدة: الجنيه المصري (EGP)
-- ==================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;

-- ==================================================================
-- جدول المخازن الرئيسي
-- ==================================================================
CREATE TABLE warehouses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    location VARCHAR(200),
    manager_id TEXT,
    manager_name VARCHAR(100),
    capacity_limit INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL
);

-- ==================================================================
-- جدول المنتجات
-- ==================================================================
CREATE TABLE products (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'قطعة',
    
    -- الأسعار بالجنيه المصري
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- حدود المخزون
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    
    -- معلومات إضافية
    brand VARCHAR(100),
    model VARCHAR(100),
    specifications TEXT,
    image_path VARCHAR(500),
    
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_by TEXT
);

-- ==================================================================
-- جدول مخزون المنتجات في المخازن
-- ==================================================================
CREATE TABLE stock_levels (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- الكميات
    available_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    total_quantity INTEGER GENERATED ALWAYS AS (available_quantity + reserved_quantity) STORED,
    
    -- معلومات الموقع داخل المخزن
    shelf_location VARCHAR(50),
    bin_location VARCHAR(50),
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    
    UNIQUE(warehouse_id, product_id)
);

-- ==================================================================
-- جدول أنواع الطلبات
-- ==================================================================
CREATE TABLE request_types (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(50) NOT NULL,
    description TEXT,
    requires_manager_approval INTEGER DEFAULT 1,
    requires_accounting_approval INTEGER DEFAULT 0,
    auto_approve_limit DECIMAL(15,2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- ==================================================================
-- جدول طلبات المخزون الرئيسي
-- ==================================================================
CREATE TABLE stock_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- نوع الطلب
    request_type_id TEXT NOT NULL REFERENCES request_types(id),
    request_type VARCHAR(50) NOT NULL, -- 'order', 'demo', 'return', 'transfer', 'adjustment'
    
    -- معلومات الطلب الأساسية
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- المخزن والمستخدم
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    requested_by TEXT NOT NULL,
    requested_by_name VARCHAR(100),
    department VARCHAR(100),
    
    -- الحالة وسير العمل
    status VARCHAR(20) DEFAULT 'pending', -- pending, manager_approved, accounting_approved, ready_for_issue, issued, completed, rejected, cancelled
    
    -- التواريخ المهمة
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    required_date DATE,
    approved_date DATETIME,
    issued_date DATETIME,
    completed_date DATETIME,
    
    -- معلومات مالية
    total_value DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- ربط مع الطلبات الخارجية
    external_order_id TEXT, -- ربط مع جدول Orders
    external_invoice_id TEXT, -- ربط مع فاتورة الحسابات
    
    -- ملاحظات
    notes TEXT,
    rejection_reason TEXT,
    cancellation_reason TEXT,
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_by TEXT
);

-- ==================================================================
-- جدول عناصر طلبات المخزون
-- ==================================================================
CREATE TABLE stock_request_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_id TEXT NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    
    -- الكميات
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
    approved_quantity INTEGER DEFAULT 0,
    issued_quantity INTEGER DEFAULT 0,
    remaining_quantity INTEGER GENERATED ALWAYS AS (approved_quantity - issued_quantity) STORED,
    
    -- معلومات السعر
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (approved_quantity * unit_price) STORED,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- ملاحظات خاصة بالعنصر
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول موافقات الطلبات
-- ==================================================================
CREATE TABLE stock_request_approvals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_id TEXT NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    
    -- معلومات المُوافِق
    approver_id TEXT NOT NULL,
    approver_name VARCHAR(100) NOT NULL,
    approver_email VARCHAR(100),
    approver_role VARCHAR(50) NOT NULL, -- manager, accounting, admin, stock_manager
    approval_level INTEGER NOT NULL,
    
    -- نتيجة الموافقة
    action VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, delegated
    action_date DATETIME,
    comments TEXT,
    
    -- تفويض الموافقة
    delegated_to TEXT,
    delegated_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول حركات المخزون (Stock Movements)
-- ==================================================================
CREATE TABLE stock_movements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    movement_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- معلومات الحركة
    movement_type VARCHAR(20) NOT NULL, -- in, out, transfer, adjustment, return
    movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- المخزن والمنتج
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    
    -- الكميات
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (ABS(quantity) * unit_price) STORED,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- الرصيد قبل وبعد الحركة
    balance_before INTEGER DEFAULT 0,
    balance_after INTEGER DEFAULT 0,
    
    -- مرجع الحركة
    reference_type VARCHAR(50), -- stock_request, invoice, adjustment, transfer
    reference_id TEXT,
    reference_number VARCHAR(50),
    
    -- معلومات إضافية
    description TEXT,
    processed_by TEXT NOT NULL,
    processed_by_name VARCHAR(100),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول أوامر الصرف (Issue Orders)
-- ==================================================================
CREATE TABLE issue_orders (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    request_id TEXT NOT NULL REFERENCES stock_requests(id),
    
    -- معلومات أمر الصرف
    issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    issued_by TEXT NOT NULL,
    issued_by_name VARCHAR(100),
    received_by TEXT,
    received_by_name VARCHAR(100),
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'issued', -- issued, received, partially_received, cancelled
    
    -- معلومات مالية
    total_value DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- ملاحظات
    notes TEXT,
    delivery_notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول عناصر أوامر الصرف
-- ==================================================================
CREATE TABLE issue_order_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    issue_order_id TEXT NOT NULL REFERENCES issue_orders(id) ON DELETE CASCADE,
    request_item_id TEXT NOT NULL REFERENCES stock_request_items(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    
    -- الكميات
    issued_quantity INTEGER NOT NULL CHECK (issued_quantity > 0),
    received_quantity INTEGER DEFAULT 0,
    
    -- معلومات السعر
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (issued_quantity * unit_price) STORED,
    
    -- معلومات الموقع
    shelf_location VARCHAR(50),
    bin_location VARCHAR(50),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول تحويلات المخزون بين المخازن
-- ==================================================================
CREATE TABLE stock_transfers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transfer_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- المخازن المشاركة
    from_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    to_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    
    -- معلومات التحويل
    transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_transit, received, cancelled
    
    -- معلومات المسؤولين
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    sent_by TEXT,
    received_by TEXT,
    
    -- تواريخ مهمة
    approved_date DATETIME,
    sent_date DATETIME,
    received_date DATETIME,
    
    total_value DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول عناصر التحويلات
-- ==================================================================
CREATE TABLE stock_transfer_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
    sent_quantity INTEGER DEFAULT 0,
    received_quantity INTEGER DEFAULT 0,
    
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (sent_quantity * unit_price) STORED,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول صلاحيات المخازن للمستخدمين
-- ==================================================================
CREATE TABLE user_warehouse_permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    user_name VARCHAR(100),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- الصلاحيات
    can_view INTEGER DEFAULT 1,
    can_create_requests INTEGER DEFAULT 1,
    can_approve_requests INTEGER DEFAULT 0,
    can_issue_items INTEGER DEFAULT 0,
    can_receive_items INTEGER DEFAULT 0,
    can_manage_stock INTEGER DEFAULT 0,
    can_view_reports INTEGER DEFAULT 1,
    
    -- صلاحيات خاصة
    is_warehouse_manager INTEGER DEFAULT 0,
    
    assigned_by TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, warehouse_id)
);

-- ==================================================================
-- جدول الإشعارات للمخازن
-- ==================================================================
CREATE TABLE stock_notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    recipient_id TEXT NOT NULL,
    recipient_email VARCHAR(100),
    notification_type VARCHAR(50) NOT NULL,
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    
    -- ربط بالكيانات
    warehouse_id TEXT REFERENCES warehouses(id),
    request_id TEXT REFERENCES stock_requests(id),
    product_id TEXT REFERENCES products(id),
    
    -- حالة الإرسال
    is_read INTEGER DEFAULT 0,
    sent_at DATETIME,
    read_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- جدول المحذوفات للمخازن (Trash System)
-- ==================================================================
CREATE TABLE stock_deleted_records (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    original_table VARCHAR(50) NOT NULL,
    original_id TEXT NOT NULL,
    original_data TEXT NOT NULL, -- JSON format
    
    -- معلومات الحذف
    deletion_reason TEXT,
    deleted_by TEXT NOT NULL,
    deleted_by_name VARCHAR(100),
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- إمكانية الاسترداد
    can_restore INTEGER DEFAULT 1,
    restored_at DATETIME,
    restored_by TEXT,
    
    -- فترة الحفظ (بالأيام)
    retention_days INTEGER DEFAULT 30,
    auto_delete_date DATE GENERATED ALWAYS AS (date(deleted_at, '+' || retention_days || ' days')) STORED
);

-- ==================================================================
-- جدول سجل العمليات للمخازن
-- ==================================================================
CREATE TABLE stock_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_name VARCHAR(50) NOT NULL,
    record_id TEXT NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, APPROVE, REJECT, ISSUE
    
    old_values TEXT, -- JSON format
    new_values TEXT, -- JSON format
    changed_fields TEXT, -- comma-separated
    
    -- معلومات المستخدم
    user_id TEXT,
    user_name VARCHAR(100),
    user_ip VARCHAR(45),
    user_agent TEXT,
    
    -- معلومات السياق
    warehouse_id TEXT,
    request_id TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- إنشاء الفهارس لتحسين الأداء
-- ==================================================================

-- فهارس المخازن
CREATE INDEX idx_warehouses_active ON warehouses(is_active);
CREATE INDEX idx_warehouses_manager ON warehouses(manager_id);

-- فهارس المنتجات
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

-- فهارس مستويات المخزون
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_quantity ON stock_levels(available_quantity);

-- فهارس الطلبات
CREATE INDEX idx_stock_requests_number ON stock_requests(request_number);
CREATE INDEX idx_stock_requests_status ON stock_requests(status);
CREATE INDEX idx_stock_requests_type ON stock_requests(request_type);
CREATE INDEX idx_stock_requests_warehouse ON stock_requests(warehouse_id);
CREATE INDEX idx_stock_requests_requested_by ON stock_requests(requested_by);
CREATE INDEX idx_stock_requests_date ON stock_requests(request_date);

-- فهارس الموافقات
CREATE INDEX idx_stock_approvals_request ON stock_request_approvals(request_id);
CREATE INDEX idx_stock_approvals_approver ON stock_request_approvals(approver_id);
CREATE INDEX idx_stock_approvals_action ON stock_request_approvals(action);

-- فهارس الحركات
CREATE INDEX idx_stock_movements_number ON stock_movements(movement_number);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- فهارس الصلاحيات
CREATE INDEX idx_user_warehouse_permissions_user ON user_warehouse_permissions(user_id);
CREATE INDEX idx_user_warehouse_permissions_warehouse ON user_warehouse_permissions(warehouse_id);

-- فهارس الإشعارات
CREATE INDEX idx_stock_notifications_recipient ON stock_notifications(recipient_id);
CREATE INDEX idx_stock_notifications_type ON stock_notifications(notification_type);
CREATE INDEX idx_stock_notifications_read ON stock_notifications(is_read);

-- ==================================================================
-- المحفزات (Triggers) لتحديث المخزون تلقائياً
-- ==================================================================

-- محفز تحديث المخزون عند إدراج حركة
CREATE TRIGGER update_stock_after_movement 
AFTER INSERT ON stock_movements
BEGIN
    INSERT OR REPLACE INTO stock_levels (warehouse_id, product_id, available_quantity, last_updated, updated_by)
    SELECT 
        NEW.warehouse_id,
        NEW.product_id,
        COALESCE((SELECT available_quantity FROM stock_levels WHERE warehouse_id = NEW.warehouse_id AND product_id = NEW.product_id), 0) + NEW.quantity,
        CURRENT_TIMESTAMP,
        NEW.processed_by
    WHERE NEW.movement_type IN ('in', 'out', 'adjustment');
END;

-- محفز سجل العمليات للطلبات
CREATE TRIGGER audit_stock_requests
AFTER UPDATE ON stock_requests
BEGIN
    INSERT INTO stock_audit_log (table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_name, warehouse_id, request_id)
    VALUES (
        'stock_requests',
        NEW.id,
        'UPDATE',
        json_object('status', OLD.status, 'total_value', OLD.total_value),
        json_object('status', NEW.status, 'total_value', NEW.total_value),
        CASE 
            WHEN OLD.status != NEW.status THEN 'status,'
            ELSE ''
        END ||
        CASE 
            WHEN OLD.total_value != NEW.total_value THEN 'total_value'
            ELSE ''
        END,
        NEW.updated_by,
        NEW.requested_by_name,
        NEW.warehouse_id,
        NEW.id
    );
END;

-- ==================================================================
-- إدراج البيانات الأولية
-- ==================================================================

-- إدراج أنواع الطلبات
INSERT INTO request_types (name, name_ar, description, requires_manager_approval, requires_accounting_approval, auto_approve_limit, color) VALUES
('order', 'أوردر', 'طلب شراء أو استلام بضائع', 1, 1, 0, '#3B82F6'),
('demo', 'عينة', 'طلب عينة للعرض أو التجربة', 1, 0, 500, '#10B981'),
('return', 'إرجاع', 'إرجاع منتجات إلى المخزن', 1, 0, 0, '#F59E0B'),
('transfer', 'تحويل', 'تحويل بين المخازن', 1, 0, 0, '#8B5CF6'),
('adjustment', 'تسوية', 'تسوية المخزون', 1, 1, 0, '#EF4444');

-- إدراج مخازن تجريبية
INSERT INTO warehouses (name, name_ar, code, description, location, is_active, created_by) VALUES
('Main Warehouse', 'المخزن الرئيسي', 'WH001', 'المخزن الرئيسي للشركة', 'القاهرة - المنطقة الصناعية', 1, 'admin'),
('Branch Warehouse Cairo', 'مخزن فرع القاهرة', 'WH002', 'مخزن فرع القاهرة', 'القاهرة - مدينة نصر', 1, 'admin'),
('Branch Warehouse Alex', 'مخزن فرع الإسكندرية', 'WH003', 'مخزن فرع الإسكندرية', 'الإسكندرية - المنتزه', 1, 'admin');

-- إدراج منتجات تجريبية
INSERT INTO products (name, name_ar, code, barcode, category, unit, cost_price, selling_price, min_stock_level, reorder_level, is_active, created_by) VALUES
('Medical Monitor', 'مونيتور طبي', 'PRD001', '1234567890123', 'طبي', 'قطعة', 15000.00, 18000.00, 5, 10, 1, 'admin'),
('Surgical Instruments Set', 'طقم أدوات جراحية', 'PRD002', '1234567890124', 'جراحي', 'طقم', 2500.00, 3200.00, 10, 15, 1, 'admin'),
('IV Stand', 'حامل المحاليل', 'PRD003', '1234567890125', 'مستلزمات', 'قطعة', 800.00, 1200.00, 20, 30, 1, 'admin'),
('Hospital Bed', 'سرير مستشفى', 'PRD004', '1234567890126', 'أثاث طبي', 'قطعة', 8000.00, 12000.00, 2, 5, 1, 'admin'),
('ECG Machine', 'جهاز رسم القلب', 'PRD005', '1234567890127', 'أجهزة طبية', 'قطعة', 25000.00, 35000.00, 1, 2, 1, 'admin');

-- ==================================================================
-- عرض ملخص البيانات المدرجة
-- ==================================================================
SELECT 'Tables Created Successfully' as status;