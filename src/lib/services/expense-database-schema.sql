-- ==================================================================
-- 🏢 EP Group System - Expense Management Database Schema
-- نظام إدارة النفقات - مخطط قاعدة البيانات الشامل
-- ==================================================================

-- إنشاء امتدادات مطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ==================================================================
-- إنشاء أنواع البيانات المخصصة (ENUMs)
-- ==================================================================

-- حالات طلب النفقة
CREATE TYPE expense_status AS ENUM (
    'draft',        -- مسودة
    'submitted',    -- مُرسل
    'under_review', -- قيد المراجعة
    'approved',     -- معتمد
    'rejected',     -- مرفوض
    'paid',         -- مدفوع
    'cancelled'     -- ملغى
);

-- أنواع الموافقة
CREATE TYPE approval_action AS ENUM (
    'pending',      -- في انتظار
    'approved',     -- موافقة
    'rejected',     -- رفض
    'delegated',    -- مُفوّض
    'escalated'     -- صعد للمستوى الأعلى
);

-- حالات المدفوعات
CREATE TYPE payment_status AS ENUM (
    'pending',      -- في انتظار
    'processing',   -- قيد المعالجة
    'completed',    -- مكتملة
    'failed',       -- فاشلة
    'cancelled',    -- ملغاة
    'refunded'      -- مُستردة
);

-- طرق الدفع
CREATE TYPE payment_method AS ENUM (
    'bank_transfer',    -- حوالة بنكية
    'check',           -- شيك
    'cash',            -- نقدي
    'card',            -- بطاقة ائتمان
    'digital_wallet'   -- محفظة رقمية
);

-- مستويات الأولوية
CREATE TYPE priority_level AS ENUM (
    'low',      -- منخفضة
    'medium',   -- متوسطة
    'high',     -- عالية
    'urgent'    -- عاجلة
);

-- أنواع الإشعارات
CREATE TYPE notification_type AS ENUM (
    'email',        -- بريد إلكتروني
    'sms',          -- رسالة نصية
    'push',         -- إشعار مباشر
    'in_app'        -- داخل التطبيق
);

-- ==================================================================
-- الجداول الأساسية
-- ==================================================================

-- جدول فئات النفقات
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES expense_categories(id),
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    budget_limit DECIMAL(15,2),
    requires_receipt BOOLEAN DEFAULT TRUE,
    max_amount_without_approval DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- جدول طلبات النفقات الرئيسي
CREATE TABLE expense_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    
    -- معلومات الطلب
    expense_date DATE NOT NULL,
    vendor_name VARCHAR(200),
    vendor_tax_number VARCHAR(50),
    vendor_address TEXT,
    vendor_phone VARCHAR(20),
    vendor_email VARCHAR(100),
    
    -- حالة الطلب
    status expense_status DEFAULT 'draft',
    priority priority_level DEFAULT 'medium',
    
    -- معلومات المالية
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
    
    -- معلومات الإرسال
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID NOT NULL,
    
    -- معلومات القسم والمشروع
    department VARCHAR(100),
    project_code VARCHAR(50),
    cost_center VARCHAR(50),
    
    -- ملاحظات
    notes TEXT,
    rejection_reason TEXT,
    
    -- معلومات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID
);

-- جدول مرفقات النفقات
CREATE TABLE expense_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    is_receipt BOOLEAN DEFAULT FALSE,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL
);

-- جدول الموافقات
CREATE TABLE expense_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL,
    approver_name VARCHAR(200) NOT NULL,
    approver_email VARCHAR(100),
    approval_level INTEGER NOT NULL,
    required_amount_threshold DECIMAL(15,2),
    
    -- حالة الموافقة
    action approval_action DEFAULT 'pending',
    action_date TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    
    -- تفويض الموافقة
    delegated_to UUID,
    delegated_at TIMESTAMP WITH TIME ZONE,
    
    -- معلومات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول المدفوعات
CREATE TABLE expense_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expense_requests(id),
    payment_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- معلومات المدفوعات
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    
    -- معلومات البنك/الشيك
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    check_number VARCHAR(30),
    reference_number VARCHAR(100),
    
    -- تواريخ مهمة
    scheduled_date DATE,
    processed_date TIMESTAMP WITH TIME ZONE,
    cleared_date DATE,
    
    -- ملاحظات
    notes TEXT,
    failure_reason TEXT,
    
    -- معلومات المعالج
    processed_by UUID,
    
    -- معلومات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول دفعات المدفوعات (للمدفوعات الجماعية)
CREATE TABLE payment_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(20) UNIQUE NOT NULL,
    batch_name VARCHAR(200) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_count INTEGER NOT NULL,
    batch_status payment_status DEFAULT 'pending',
    
    -- معلومات المعالجة
    created_by UUID NOT NULL,
    processed_by UUID,
    approved_by UUID,
    
    -- تواريخ
    scheduled_date DATE,
    processed_date TIMESTAMP WITH TIME ZONE,
    
    -- ملاحظات
    description TEXT,
    notes TEXT,
    
    -- معلومات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ربط المدفوعات بالدفعات
CREATE TABLE batch_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES expense_payments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, payment_id)
);

-- جدول الميزانيات
CREATE TABLE expense_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES expense_categories(id),
    
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
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    
    -- معلومات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL
);

-- جدول الإشعارات
CREATE TABLE expense_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL,
    recipient_email VARCHAR(100),
    notification_type notification_type NOT NULL,
    
    -- محتوى الإشعار
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- معلومات الإرسال
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    
    -- ربط بالكيانات
    expense_id UUID REFERENCES expense_requests(id),
    payment_id UUID REFERENCES expense_payments(id),
    
    -- معلومات التتبع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- فهرسة
    INDEX idx_notifications_recipient (recipient_id),
    INDEX idx_notifications_type (notification_type),
    INDEX idx_notifications_status (delivery_status)
);

-- جدول سجل العمليات (Audit Log)
CREATE TABLE expense_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- معلومات المستخدم
    user_id UUID,
    user_name VARCHAR(200),
    user_ip INET,
    
    -- معلومات الجلسة
    session_id VARCHAR(255),
    user_agent TEXT,
    
    -- معلومات التوقيت
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول النفقات المحذوفة (Soft Delete)
CREATE TABLE expense_deleted_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_table VARCHAR(100) NOT NULL,
    original_id UUID NOT NULL,
    original_data JSONB NOT NULL,
    deletion_reason TEXT,
    deleted_by UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    can_restore BOOLEAN DEFAULT TRUE
);

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    value_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_required BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    validation_rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    UNIQUE(category, setting_key)
);

-- ==================================================================
-- الجداول التحليلية والإحصائية
-- ==================================================================

-- جدول الإحصائيات الشهرية
CREATE TABLE expense_monthly_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    department VARCHAR(100),
    category_id UUID REFERENCES expense_categories(id),
    
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
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(year, month, department, category_id)
);

-- ==================================================================
-- الفهارس (Indexes) لتحسين الأداء
-- ==================================================================

-- فهارس الأداء الأساسية
CREATE INDEX idx_expense_requests_status ON expense_requests(status);
CREATE INDEX idx_expense_requests_submitted_by ON expense_requests(submitted_by);
CREATE INDEX idx_expense_requests_category ON expense_requests(category_id);
CREATE INDEX idx_expense_requests_date ON expense_requests(expense_date);
CREATE INDEX idx_expense_requests_amount ON expense_requests(amount);
CREATE INDEX idx_expense_requests_department ON expense_requests(department);

-- فهارس البحث النصي
CREATE INDEX idx_expense_requests_title_search ON expense_requests USING gin(to_tsvector('arabic', title));
CREATE INDEX idx_expense_requests_description_search ON expense_requests USING gin(to_tsvector('arabic', description));

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

-- ==================================================================
-- التسلسلات (Sequences) لترقيم الطلبات
-- ==================================================================

-- تسلسل أرقام طلبات النفقات
CREATE SEQUENCE expense_request_number_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 999999
    CYCLE;

-- تسلسل أرقام المدفوعات
CREATE SEQUENCE payment_number_seq
    START WITH 10000
    INCREMENT BY 1
    MINVALUE 10000
    MAXVALUE 9999999
    CYCLE;

-- تسلسل أرقام دفعات المدفوعات
CREATE SEQUENCE batch_number_seq
    START WITH 100
    INCREMENT BY 1
    MINVALUE 100
    MAXVALUE 99999
    CYCLE;

-- ==================================================================
-- الوظائف المساعدة (Functions)
-- ==================================================================

-- وظيفة إنشاء رقم طلب نفقة
CREATE OR REPLACE FUNCTION generate_expense_request_number()
RETURNS TEXT AS $$
DECLARE
    year_prefix TEXT;
    seq_number TEXT;
BEGIN
    year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    seq_number := LPAD(nextval('expense_request_number_seq')::TEXT, 6, '0');
    RETURN 'EXP-' || year_prefix || '-' || seq_number;
END;
$$ LANGUAGE plpgsql;

-- وظيفة إنشاء رقم مدفوعات
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT AS $$
DECLARE
    year_month TEXT;
    seq_number TEXT;
BEGIN
    year_month := TO_CHAR(CURRENT_DATE, 'YYMM');
    seq_number := LPAD(nextval('payment_number_seq')::TEXT, 5, '0');
    RETURN 'PAY-' || year_month || '-' || seq_number;
END;
$$ LANGUAGE plpgsql;

-- وظيفة إنشاء رقم دفعة
CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS TEXT AS $$
DECLARE
    year_month TEXT;
    seq_number TEXT;
BEGIN
    year_month := TO_CHAR(CURRENT_DATE, 'YYMM');
    seq_number := LPAD(nextval('batch_number_seq')::TEXT, 3, '0');
    RETURN 'BATCH-' || year_month || '-' || seq_number;
END;
$$ LANGUAGE plpgsql;

-- وظيفة تحديث إحصائيات الميزانية
CREATE OR REPLACE FUNCTION update_budget_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث المبلغ المستخدم عند تغيير حالة النفقة إلى "مدفوع"
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE expense_budgets 
        SET used_amount = used_amount + NEW.total_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE department = NEW.department 
        AND (category_id IS NULL OR category_id = NEW.category_id)
        AND start_date <= NEW.expense_date 
        AND end_date >= NEW.expense_date
        AND is_active = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- وظيفة تسجيل العمليات في سجل التدقيق
CREATE OR REPLACE FUNCTION log_expense_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[] := '{}';
    field_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- تحديد الحقول المتغيرة
    FOR field_name IN 
        SELECT column_name::TEXT 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND table_schema = TG_TABLE_SCHEMA
    LOOP
        IF TG_OP = 'UPDATE' THEN
            EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', field_name, field_name) 
            INTO old_val, new_val 
            USING OLD, NEW;
            
            IF old_val IS DISTINCT FROM new_val THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END IF;
    END LOOP;
    
    -- إدراج سجل في جدول التدقيق
    INSERT INTO expense_audit_log (
        table_name, record_id, action, old_values, new_values, changed_fields,
        user_id, created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        changed_fields,
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by, OLD.created_by),
        CURRENT_TIMESTAMP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==================================================================
-- المحفزات (Triggers)
-- ==================================================================

-- محفز تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق محفز التحديث على الجداول الرئيسية
CREATE TRIGGER trg_expense_requests_updated_at
    BEFORE UPDATE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_expense_approvals_updated_at
    BEFORE UPDATE ON expense_approvals
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_expense_payments_updated_at
    BEFORE UPDATE ON expense_payments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_payment_batches_updated_at
    BEFORE UPDATE ON payment_batches
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- محفز ترقيم طلبات النفقات تلقائياً
CREATE TRIGGER trg_expense_request_number
    BEFORE INSERT ON expense_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION (
        NEW.request_number = generate_expense_request_number()
    );

-- محفز تحديث إحصائيات الميزانية
CREATE TRIGGER trg_update_budget_usage
    AFTER UPDATE OF status ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION update_budget_usage();

-- محفزات سجل التدقيق
CREATE TRIGGER trg_audit_expense_requests
    AFTER INSERT OR UPDATE OR DELETE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION log_expense_changes();

CREATE TRIGGER trg_audit_expense_payments
    AFTER INSERT OR UPDATE OR DELETE ON expense_payments
    FOR EACH ROW EXECUTE FUNCTION log_expense_changes();

-- ==================================================================
-- أمان الصفوف (Row Level Security)
-- ==================================================================

-- تفعيل RLS على الجداول الحساسة
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;

-- سياسة أمان للنفقات - المستخدمون يرون نفقاتهم فقط
CREATE POLICY expense_requests_policy ON expense_requests
    FOR ALL USING (
        submitted_by = current_setting('app.current_user_id')::UUID
        OR current_setting('app.user_role') IN ('admin', 'manager', 'accountant')
    );

-- سياسة أمان للموافقات - المعتمدون يرون موافقاتهم فقط
CREATE POLICY expense_approvals_policy ON expense_approvals
    FOR ALL USING (
        approver_id = current_setting('app.current_user_id')::UUID
        OR current_setting('app.user_role') IN ('admin', 'manager')
    );

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
('company', 'site_title', 'EP Group System', 'string', 'عنوان النظام الرئيسي', true),
('company', 'company_name', 'مجموعة إي بي للأنظمة الطبية', 'string', 'اسم الشركة الرسمي', true),
('company', 'company_email', 'info@epgroup.sa', 'string', 'البريد الإلكتروني الرسمي', true),
('company', 'company_phone', '+966 11 123 4567', 'string', 'رقم هاتف الشركة', true),
('system', 'default_currency', 'SAR', 'string', 'العملة الافتراضية', true),
('system', 'tax_rate', '15', 'number', 'معدل ضريبة القيمة المضافة', false),
('expenses', 'max_expense_amount', '10000', 'number', 'الحد الأقصى لمبلغ النفقة', false),
('expenses', 'auto_approve_threshold', '500', 'number', 'حد الموافقة التلقائية', false),
('expenses', 'require_receipt', 'true', 'boolean', 'إلزام إرفاق فاتورة', false);

-- إنشاء مستخدم نظام افتراضي للاختبار
DO $$
DECLARE
    system_user_id UUID := uuid_generate_v4();
BEGIN
    -- يمكن إضافة مستخدم نظام هنا للاختبار
    NULL;
END $$;

-- ==================================================================
-- عرض ملخص قاعدة البيانات
-- ==================================================================

-- عرض عدد الجداول المُنشأة
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename LIKE 'expense_%' 
    OR tablename = 'system_settings'
GROUP BY schemaname;

-- عرض الفهارس المُنشأة
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

COMMENT ON SCHEMA public IS 'EP Group Expense Management System Database - نظام إدارة النفقات لمجموعة إي بي';