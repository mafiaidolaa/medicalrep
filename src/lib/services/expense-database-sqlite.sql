-- ==================================================================
-- 🏢 EP Group System - Expense Management Database Schema (SQLite)
-- نظام إدارة النفقات - مخطط قاعدة البيانات SQLite
-- ==================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;

-- ==================================================================
-- الجداول الأساسية
-- ==================================================================

-- جدول فئات النفقات
CREATE TABLE expense_categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES expense_categories(id),
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    budget_limit DECIMAL(15,2),
    requires_receipt INTEGER DEFAULT 1,
    max_amount_without_approval DECIMAL(15,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- جدول طلبات النفقات الرئيسي
CREATE TABLE expense_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    category_id TEXT NOT NULL REFERENCES expense_categories(id),
    
    -- معلومات الطلب
    expense_date DATE NOT NULL,
    vendor_name VARCHAR(200),
    vendor_tax_number VARCHAR(50),
    vendor_address TEXT,
    vendor_phone VARCHAR(20),
    vendor_email VARCHAR(100),
    
    -- حالة الطلب
    status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, under_review, approved, rejected, paid, cancelled
    priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- معلومات المالية
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
    
    -- معلومات الإرسال
    submitted_at DATETIME,
    submitted_by TEXT NOT NULL,
    
    -- معلومات القسم والمشروع
    department VARCHAR(100),
    project_code VARCHAR(50),
    cost_center VARCHAR(50),
    
    -- ملاحظات
    notes TEXT,
    rejection_reason TEXT,
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_by TEXT
);

-- جدول مرفقات النفقات
CREATE TABLE expense_attachments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id TEXT NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    is_receipt INTEGER DEFAULT 0,
    description TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT NOT NULL
);

-- جدول الموافقات
CREATE TABLE expense_approvals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id TEXT NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    approver_id TEXT NOT NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_email VARCHAR(100),
    approval_level INTEGER NOT NULL,
    required_amount_threshold DECIMAL(15,2),
    
    -- حالة الموافقة
    action VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, delegated, escalated
    action_date DATETIME,
    comments TEXT,
    
    -- تفويض الموافقة
    delegated_to TEXT,
    delegated_at DATETIME,
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المدفوعات
CREATE TABLE expense_payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id TEXT NOT NULL REFERENCES expense_requests(id),
    payment_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- معلومات المدفوعات
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL, -- bank_transfer, check, cash, card, digital_wallet
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled, refunded
    
    -- معلومات البنك/الشيك
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    check_number VARCHAR(30),
    reference_number VARCHAR(100),
    
    -- تواريخ مهمة
    scheduled_date DATE,
    processed_date DATETIME,
    cleared_date DATE,
    
    -- ملاحظات
    notes TEXT,
    failure_reason TEXT,
    
    -- معلومات المعالج
    processed_by TEXT,
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول دفعات المدفوعات (للمدفوعات الجماعية)
CREATE TABLE payment_batches (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    batch_number VARCHAR(20) UNIQUE NOT NULL,
    batch_name VARCHAR(200) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_count INTEGER NOT NULL,
    batch_status VARCHAR(20) DEFAULT 'pending',
    
    -- معلومات المعالجة
    created_by TEXT NOT NULL,
    processed_by TEXT,
    approved_by TEXT,
    
    -- تواريخ
    scheduled_date DATE,
    processed_date DATETIME,
    
    -- ملاحظات
    description TEXT,
    notes TEXT,
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ربط المدفوعات بالدفعات
CREATE TABLE batch_payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    batch_id TEXT NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL REFERENCES expense_payments(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, payment_id)
);

-- جدول الميزانيات
CREATE TABLE expense_budgets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    category_id TEXT REFERENCES expense_categories(id),
    
    -- فترة الميزانية
    fiscal_year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- مبالغ الميزانية
    allocated_amount DECIMAL(15,2) NOT NULL CHECK (allocated_amount > 0),
    used_amount DECIMAL(15,2) DEFAULT 0,
    committed_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (allocated_amount - used_amount - committed_amount) STORED,
    
    -- تنبيهات
    warning_threshold DECIMAL(5,2) DEFAULT 80.00, -- نسبة مئوية
    critical_threshold DECIMAL(5,2) DEFAULT 95.00,
    
    -- حالة الميزانية
    is_active INTEGER DEFAULT 1,
    is_locked INTEGER DEFAULT 0,
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL
);

-- جدول الإشعارات
CREATE TABLE expense_notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    recipient_id TEXT NOT NULL,
    recipient_email VARCHAR(100),
    notification_type VARCHAR(20) NOT NULL, -- email, sms, push, in_app
    
    -- محتوى الإشعار
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- معلومات الإرسال
    sent_at DATETIME,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    
    -- ربط بالكيانات
    expense_id TEXT REFERENCES expense_requests(id),
    payment_id TEXT REFERENCES expense_payments(id),
    
    -- معلومات التتبع
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل العمليات (Audit Log)
CREATE TABLE expense_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_name VARCHAR(100) NOT NULL,
    record_id TEXT NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values TEXT, -- JSON format
    new_values TEXT, -- JSON format
    changed_fields TEXT, -- comma-separated fields
    
    -- معلومات المستخدم
    user_id TEXT,
    user_name VARCHAR(200),
    user_ip VARCHAR(45),
    
    -- معلومات الجلسة
    session_id VARCHAR(255),
    user_agent TEXT,
    
    -- معلومات التوقيت
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول النفقات المحذوفة (Soft Delete)
CREATE TABLE expense_deleted_records (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    original_table VARCHAR(100) NOT NULL,
    original_id TEXT NOT NULL,
    original_data TEXT NOT NULL, -- JSON format
    deletion_reason TEXT,
    deleted_by TEXT NOT NULL,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    can_restore INTEGER DEFAULT 1
);

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    value_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_public INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 0,
    is_enabled INTEGER DEFAULT 1,
    validation_rules TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    UNIQUE(category, setting_key)
);

-- جدول الإحصائيات الشهرية
CREATE TABLE expense_monthly_stats (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    department VARCHAR(100),
    category_id TEXT REFERENCES expense_categories(id),
    
    -- إحصائيات العدد
    total_requests INTEGER DEFAULT 0,
    approved_requests INTEGER DEFAULT 0,
    rejected_requests INTEGER DEFAULT 0,
    pending_requests INTEGER DEFAULT 0,
    
    -- إحصائيات المبالغ
    total_amount DECIMAL(15,2) DEFAULT 0,
    approved_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    
    -- معدلات
    average_amount DECIMAL(15,2) DEFAULT 0,
    average_approval_time DECIMAL(5,2) DEFAULT 0, -- بالأيام
    
    -- تاريخ آخر تحديث
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(year, month, department, category_id)
);

-- ==================================================================
-- الفهارس لتحسين الأداء
-- ==================================================================

-- فهارس الأداء الأساسية
CREATE INDEX idx_expense_requests_status ON expense_requests(status);
CREATE INDEX idx_expense_requests_submitted_by ON expense_requests(submitted_by);
CREATE INDEX idx_expense_requests_category ON expense_requests(category_id);
CREATE INDEX idx_expense_requests_date ON expense_requests(expense_date);
CREATE INDEX idx_expense_requests_amount ON expense_requests(amount);
CREATE INDEX idx_expense_requests_department ON expense_requests(department);

-- فهارس البحث النصي
CREATE INDEX idx_expense_requests_title ON expense_requests(title);
CREATE INDEX idx_expense_requests_description ON expense_requests(description);

-- فهارس الموافقات
CREATE INDEX idx_expense_approvals_expense ON expense_approvals(expense_id);
CREATE INDEX idx_expense_approvals_approver ON expense_approvals(approver_id);
CREATE INDEX idx_expense_approvals_level ON expense_approvals(approval_level);
CREATE INDEX idx_expense_approvals_action ON expense_approvals(action);

-- فهارس المدفوعات
CREATE INDEX idx_expense_payments_expense ON expense_payments(expense_id);
CREATE INDEX idx_expense_payments_status ON expense_payments(payment_status);
CREATE INDEX idx_expense_payments_method ON expense_payments(payment_method);
CREATE INDEX idx_expense_payments_date ON expense_payments(processed_date);

-- فهارس المرفقات
CREATE INDEX idx_expense_attachments_expense ON expense_attachments(expense_id);
CREATE INDEX idx_expense_attachments_type ON expense_attachments(file_type);

-- فهارس الإحصائيات
CREATE INDEX idx_monthly_stats_period ON expense_monthly_stats(year, month);
CREATE INDEX idx_monthly_stats_dept ON expense_monthly_stats(department);

-- فهارس الإشعارات
CREATE INDEX idx_notifications_recipient ON expense_notifications(recipient_id);
CREATE INDEX idx_notifications_type ON expense_notifications(notification_type);
CREATE INDEX idx_notifications_status ON expense_notifications(delivery_status);

-- ==================================================================
-- المحفزات لتحديث التواريخ تلقائياً
-- ==================================================================

-- محفز تحديث updated_at عند التحديث
CREATE TRIGGER update_expense_requests_updated_at 
    AFTER UPDATE ON expense_requests
BEGIN
    UPDATE expense_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_expense_categories_updated_at 
    AFTER UPDATE ON expense_categories
BEGIN
    UPDATE expense_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_expense_approvals_updated_at 
    AFTER UPDATE ON expense_approvals
BEGIN
    UPDATE expense_approvals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_expense_payments_updated_at 
    AFTER UPDATE ON expense_payments
BEGIN
    UPDATE expense_payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_payment_batches_updated_at 
    AFTER UPDATE ON payment_batches
BEGIN
    UPDATE payment_batches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ==================================================================
-- البيانات الأولية (Seed Data)
-- ==================================================================

-- إدراج فئات النفقات الأساسية
INSERT INTO expense_categories (name, name_ar, description, icon, color, sort_order) VALUES
('Travel & Transportation', 'السفر والانتقال', 'Travel expenses including flights, hotels, and transportation', 'plane', '#3B82F6', 1),
('Meals & Entertainment', 'وجبات والترفيه', 'Business meals and client entertainment', 'utensils', '#10B981', 2),
('Office Supplies', 'مستلزمات مكتبية', 'Office equipment and supplies', 'briefcase', '#F59E0B', 3),
('Training & Development', 'التدريب والتطوير', 'Professional training and development courses', 'graduation-cap', '#8B5CF6', 4),
('Technology & Software', 'تكنولوجيا وبرامج', 'Technology equipment and software licenses', 'monitor', '#EF4444', 5),
('Marketing & Advertising', 'التسويق والإعلان', 'Marketing campaigns and advertising expenses', 'megaphone', '#06B6D4', 6),
('Professional Services', 'الخدمات المهنية', 'Legal, consulting, and other professional services', 'users', '#84CC16', 7),
('Utilities & Communication', 'المرافق والاتصالات', 'Utilities, phone, and internet services', 'phone', '#F97316', 8);

-- إدراج إعدادات النظام الأساسية
INSERT INTO system_settings (category, setting_key, setting_value, value_type, description, is_public) VALUES
('company', 'site_title', 'EP Group System', 'string', 'عنوان النظام الرئيسي', 1),
('company', 'company_name', 'مجموعة إي بي للأنظمة الطبية', 'string', 'اسم الشركة الرسمي', 1),
('company', 'company_email', 'info@epgroup.sa', 'string', 'البريد الإلكتروني الرسمي', 1),
('company', 'company_phone', '+966 11 123 4567', 'string', 'رقم هاتف الشركة', 1),
('company', 'company_address', 'الرياض، المملكة العربية السعودية', 'string', 'عنوان الشركة', 1),
('company', 'company_website', 'https://www.epgroup.sa', 'string', 'موقع الشركة', 1),
('system', 'default_currency', 'SAR', 'string', 'العملة الافتراضية', 1),
('system', 'tax_rate', '15', 'number', 'معدل ضريبة القيمة المضافة', 0),
('system', 'default_language', 'ar', 'string', 'اللغة الافتراضية', 1),
('system', 'timezone', 'Asia/Riyadh', 'string', 'المنطقة الزمنية', 0),
('expenses', 'max_expense_amount', '10000', 'number', 'الحد الأقصى لمبلغ النفقة', 0),
('expenses', 'auto_approve_threshold', '500', 'number', 'حد الموافقة التلقائية', 0),
('expenses', 'require_receipt', 'true', 'boolean', 'إلزام إرفاق فاتورة', 0),
('expenses', 'require_manager_approval', 'true', 'boolean', 'إلزام موافقة المدير', 0),
('expenses', 'max_file_size', '5', 'number', 'الحد الأقصى لحجم الملف (MB)', 0),
('expenses', 'allowed_file_types', 'pdf,jpg,jpeg,png,doc,docx', 'string', 'أنواع الملفات المسموحة', 0),
('printing', 'enable_watermark', 'true', 'boolean', 'تفعيل العلامة المائية', 0),
('printing', 'default_template', 'professional', 'string', 'قالب الطباعة الافتراضي', 0),
('printing', 'include_qr_code', 'true', 'boolean', 'تضمين رمز QR', 0),
('printing', 'auto_generate_pdf', 'true', 'boolean', 'إنشاء PDF تلقائياً', 0),
('notifications', 'email_notifications', 'true', 'boolean', 'تفعيل إشعارات البريد', 0),
('notifications', 'sms_notifications', 'false', 'boolean', 'تفعيل الرسائل النصية', 0),
('notifications', 'push_notifications', 'true', 'boolean', 'تفعيل الإشعارات المباشرة', 0),
('security', 'session_timeout', '30', 'number', 'مدة انتهاء الجلسة (دقيقة)', 0),
('security', 'max_login_attempts', '5', 'number', 'عدد محاولات تسجيل الدخول', 0),
('security', 'require_2fa', 'false', 'boolean', 'إلزام التحقق بخطوتين', 0);

-- إدراج بيانات تجريبية للاختبار
INSERT INTO expense_requests (
    request_number, title, amount, category_id, expense_date, 
    submitted_by, created_by, status, department, vendor_name
) VALUES 
(
    'EXP-2024-001001', 
    'نفقات سفر - مؤتمر الرياض التقني', 
    2500.00, 
    (SELECT id FROM expense_categories WHERE name = 'Travel & Transportation' LIMIT 1),
    '2024-01-15',
    'user_123',
    'user_123',
    'submitted',
    'تقنية المعلومات',
    'فندق الريتز كارلتون'
),
(
    'EXP-2024-001002', 
    'مستلزمات مكتبية للربع الأول', 
    850.00, 
    (SELECT id FROM expense_categories WHERE name = 'Office Supplies' LIMIT 1),
    '2024-01-10',
    'user_456',
    'user_456',
    'approved',
    'الإدارة العامة',
    'مكتبة جرير'
),
(
    'EXP-2024-001003', 
    'دورة تدريبية في الذكاء الاصطناعي', 
    4500.00, 
    (SELECT id FROM expense_categories WHERE name = 'Training & Development' LIMIT 1),
    '2024-01-08',
    'user_789',
    'user_789',
    'under_review',
    'تقنية المعلومات',
    'معهد الملك عبدالله للتقنية'
);

-- إدراج موافقات تجريبية
INSERT INTO expense_approvals (expense_id, approver_id, approver_name, approver_email, approval_level, action) 
SELECT 
    id,
    'manager_001',
    'أحمد المدير',
    'manager@epgroup.sa',
    1,
    'approved'
FROM expense_requests 
WHERE request_number = 'EXP-2024-001002';

-- إدراج ميزانيات تجريبية
INSERT INTO expense_budgets (name, department, fiscal_year, start_date, end_date, allocated_amount, created_by) VALUES
('ميزانية تقنية المعلومات 2024', 'تقنية المعلومات', 2024, '2024-01-01', '2024-12-31', 100000.00, 'admin_001'),
('ميزانية التسويق 2024', 'التسويق', 2024, '2024-01-01', '2024-12-31', 50000.00, 'admin_001'),
('ميزانية الموارد البشرية 2024', 'الموارد البشرية', 2024, '2024-01-01', '2024-12-31', 30000.00, 'admin_001');

-- عرض ملخص البيانات المُدرجة
SELECT 'expense_categories' as table_name, COUNT(*) as count FROM expense_categories
UNION ALL
SELECT 'system_settings', COUNT(*) FROM system_settings
UNION ALL
SELECT 'expense_requests', COUNT(*) FROM expense_requests  
UNION ALL
SELECT 'expense_budgets', COUNT(*) FROM expense_budgets
ORDER BY table_name;