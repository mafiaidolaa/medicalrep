-- 🏢 EP Group System - Professional Expenses Management Database Schema
-- نظام إدارة النفقات الاحترافي - مخطط قاعدة البيانات
-- Created: 2024-10-01
-- Version: 1.0.0

-- ==================================================
-- 📂 EXPENSE CATEGORIES TABLE (فئات النفقات)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Receipt',
    color VARCHAR(7) DEFAULT '#3b82f6',
    parent_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    requires_receipt BOOLEAN DEFAULT true,
    max_amount DECIMAL(12,2),
    auto_approve_threshold DECIMAL(12,2),
    approval_workflow JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for expense_categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

-- ==================================================
-- 💼 EXPENSE REQUESTS TABLE (طلبات النفقات)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    exchange_rate DECIMAL(8,4) DEFAULT 1.0000,
    
    -- Request Details
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    location VARCHAR(200),
    vendor_name VARCHAR(150),
    vendor_details JSONB,
    
    -- User Information
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    
    -- Status and Workflow
    status VARCHAR(50) DEFAULT 'draft' CHECK (
        status IN ('draft', 'submitted', 'under_review', 'manager_approved', 
                  'admin_approved', 'accounting_approved', 'approved', 'rejected', 
                  'cancelled', 'paid', 'partially_paid')
    ),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Approval Information
    current_approval_level INTEGER DEFAULT 0,
    required_approval_levels INTEGER DEFAULT 1,
    approval_workflow JSONB,
    
    -- Payment Information
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date DATE,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    
    -- Attachments and Documentation
    receipt_files JSONB DEFAULT '[]'::jsonb,
    supporting_documents JSONB DEFAULT '[]'::jsonb,
    approval_documents JSONB DEFAULT '[]'::jsonb,
    
    -- Additional Information
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Keys for Approval Chain
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for expense_requests
CREATE INDEX IF NOT EXISTS idx_expense_requests_user ON expense_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_requests_category ON expense_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_date ON expense_requests(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_requests_amount ON expense_requests(amount);
CREATE INDEX IF NOT EXISTS idx_expense_requests_number ON expense_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_expense_requests_department ON expense_requests(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_requests_priority ON expense_requests(priority);
CREATE INDEX IF NOT EXISTS idx_expense_requests_created ON expense_requests(created_at);

-- ==================================================
-- 🔄 EXPENSE APPROVALS TABLE (موافقات النفقات)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    
    -- Approval Details
    approval_level INTEGER NOT NULL CHECK (approval_level > 0),
    approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approver_role VARCHAR(50) NOT NULL,
    
    -- Decision Information
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
    decision_date TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    conditions TEXT,
    
    -- Delegation Support
    delegated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delegated_at TIMESTAMP WITH TIME ZONE,
    delegation_reason TEXT,
    
    -- Approval Constraints
    max_amount_authorized DECIMAL(12,2),
    approval_scope VARCHAR(100),
    
    -- Additional Information
    approval_method VARCHAR(50) DEFAULT 'manual' CHECK (approval_method IN ('manual', 'auto', 'delegated')),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit Information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate approvals at same level
    UNIQUE(expense_request_id, approval_level, approver_id)
);

-- Indexes for expense_approvals
CREATE INDEX IF NOT EXISTS idx_expense_approvals_request ON expense_approvals(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver ON expense_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_status ON expense_approvals(status);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_level ON expense_approvals(approval_level);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_date ON expense_approvals(decision_date);

-- ==================================================
-- 🗑️ EXPENSE DELETED/ARCHIVED TABLE (النفقات المحذوفة)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_deleted (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_expense_id UUID NOT NULL,
    original_data JSONB NOT NULL,
    
    -- Deletion Information
    deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletion_reason TEXT,
    deletion_type VARCHAR(50) DEFAULT 'soft_delete' CHECK (
        deletion_type IN ('soft_delete', 'archive', 'purge', 'user_requested', 'admin_cleanup')
    ),
    
    -- Recovery Information
    can_recover BOOLEAN DEFAULT true,
    recovery_deadline TIMESTAMP WITH TIME ZONE,
    recovered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recovered_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expense_deleted
CREATE INDEX IF NOT EXISTS idx_expense_deleted_original ON expense_deleted(original_expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_deleted_by ON expense_deleted(deleted_by);
CREATE INDEX IF NOT EXISTS idx_expense_deleted_date ON expense_deleted(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expense_deleted_type ON expense_deleted(deletion_type);
CREATE INDEX IF NOT EXISTS idx_expense_deleted_recoverable ON expense_deleted(can_recover) WHERE can_recover = true;

-- ==================================================
-- 💰 EXPENSE BUDGET TABLE (ميزانيات النفقات)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Budget Scope
    department VARCHAR(100),
    cost_center VARCHAR(50),
    category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Budget Amounts
    total_budget DECIMAL(12,2) NOT NULL CHECK (total_budget > 0),
    used_budget DECIMAL(12,2) DEFAULT 0.00 CHECK (used_budget >= 0),
    available_budget DECIMAL(12,2) GENERATED ALWAYS AS (total_budget - used_budget) STORED,
    
    -- Budget Period
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (
        period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')
    ),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Budget Rules
    allow_overspend BOOLEAN DEFAULT false,
    overspend_limit DECIMAL(12,2),
    alert_threshold_percent DECIMAL(5,2) DEFAULT 80.00,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'suspended', 'expired')),
    
    -- Audit Information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CHECK (period_end > period_start),
    CHECK (overspend_limit IS NULL OR overspend_limit >= 0)
);

-- Indexes for expense_budgets
CREATE INDEX IF NOT EXISTS idx_expense_budgets_department ON expense_budgets(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_budgets_category ON expense_budgets(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_budgets_period ON expense_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_status ON expense_budgets(status);

-- ==================================================
-- 📊 EXPENSE ANALYTICS TABLE (تحليلات النفقات)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time Period
    period_year INTEGER NOT NULL,
    period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
    period_week INTEGER CHECK (period_week BETWEEN 1 AND 53),
    period_date DATE,
    
    -- Grouping Dimensions
    department VARCHAR(100),
    category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metrics
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    request_count INTEGER DEFAULT 0,
    approved_amount DECIMAL(12,2) DEFAULT 0.00,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    
    -- Performance Metrics
    avg_approval_time_hours DECIMAL(8,2),
    avg_amount_per_request DECIMAL(12,2),
    
    -- Audit Information
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraints for aggregation
    UNIQUE(period_year, period_month, period_week, period_date, department, category_id, user_id)
);

-- Indexes for expense_analytics
CREATE INDEX IF NOT EXISTS idx_expense_analytics_period ON expense_analytics(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_expense_analytics_department ON expense_analytics(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_analytics_category ON expense_analytics(category_id) WHERE category_id IS NOT NULL;

-- ==================================================
-- 🔔 EXPENSE NOTIFICATIONS TABLE (إشعارات النفقات)
-- ==================================================
CREATE TABLE IF NOT EXISTS expense_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification Target
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expense_request_id UUID REFERENCES expense_requests(id) ON DELETE CASCADE,
    
    -- Notification Content
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('request_submitted', 'approval_required', 'approved', 'rejected', 
                'payment_processed', 'budget_alert', 'deadline_reminder', 'system_update')
    ),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    
    -- Notification Status
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Delivery Channels
    channels JSONB DEFAULT '["in_app"]'::jsonb,
    sent_email BOOLEAN DEFAULT false,
    sent_sms BOOLEAN DEFAULT false,
    sent_push BOOLEAN DEFAULT false,
    
    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional Data
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit Information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expense_notifications
CREATE INDEX IF NOT EXISTS idx_expense_notifications_user ON expense_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_notifications_status ON expense_notifications(status);
CREATE INDEX IF NOT EXISTS idx_expense_notifications_type ON expense_notifications(type);
CREATE INDEX IF NOT EXISTS idx_expense_notifications_priority ON expense_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_expense_notifications_scheduled ON expense_notifications(scheduled_for);

-- ==================================================
-- 🔧 FUNCTIONS AND TRIGGERS
-- ==================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all main tables
CREATE TRIGGER trigger_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expense_requests_updated_at
    BEFORE UPDATE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expense_approvals_updated_at
    BEFORE UPDATE ON expense_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expense_budgets_updated_at
    BEFORE UPDATE ON expense_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expense_notifications_updated_at
    BEFORE UPDATE ON expense_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate expense request number
CREATE OR REPLACE FUNCTION generate_expense_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number = 'EXP-' || 
                            EXTRACT(YEAR FROM NOW()) || 
                            LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                            LPAD(nextval('expense_request_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for expense request numbers
CREATE SEQUENCE IF NOT EXISTS expense_request_seq START 1;

-- Apply expense request number generation trigger
CREATE TRIGGER trigger_generate_expense_request_number
    BEFORE INSERT ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION generate_expense_request_number();

-- Function to update budget usage
CREATE OR REPLACE FUNCTION update_budget_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update budget usage when expense is approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE expense_budgets 
        SET used_budget = used_budget + NEW.amount
        WHERE (department = NEW.department OR department IS NULL)
          AND (category_id = NEW.category_id OR category_id IS NULL)
          AND period_start <= NEW.expense_date 
          AND period_end >= NEW.expense_date
          AND status = 'active';
    END IF;
    
    -- Revert budget usage when expense is unapproved
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        UPDATE expense_budgets 
        SET used_budget = used_budget - OLD.amount
        WHERE (department = OLD.department OR department IS NULL)
          AND (category_id = OLD.category_id OR category_id IS NULL)
          AND period_start <= OLD.expense_date 
          AND period_end >= OLD.expense_date
          AND status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply budget usage update trigger
CREATE TRIGGER trigger_update_budget_usage
    AFTER UPDATE ON expense_requests
    FOR EACH ROW EXECUTE FUNCTION update_budget_usage();

-- ==================================================
-- 🔐 ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_deleted ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_notifications ENABLE ROW LEVEL SECURITY;

-- Basic policies for expense_categories (readable by authenticated users)
CREATE POLICY "Users can view active expense categories" ON expense_categories
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage expense categories" ON expense_categories
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        )
    );

-- Policies for expense_requests
CREATE POLICY "Users can view their own expense requests" ON expense_requests
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (user_id = auth.uid() OR 
         EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'accountant')
        ))
    );

CREATE POLICY "Users can create their own expense requests" ON expense_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own draft requests" ON expense_requests
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        user_id = auth.uid() AND 
        status IN ('draft', 'rejected')
    );

-- Policies for expense_approvals
CREATE POLICY "Approvers can view relevant approvals" ON expense_approvals
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (approver_id = auth.uid() OR 
         EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        ))
    );

CREATE POLICY "Approvers can create approvals" ON expense_approvals
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        approver_id = auth.uid()
    );

-- Policies for expense_notifications
CREATE POLICY "Users can view their own notifications" ON expense_notifications
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON expense_notifications
    FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- ==================================================
-- 📊 INITIAL DATA SEEDING
-- ==================================================

-- Insert default expense categories
INSERT INTO expense_categories (name, name_ar, name_en, description, icon, color) VALUES
('travel', 'مصاريف السفر', 'Travel Expenses', 'تكاليف السفر والإقامة والانتقالات', 'Plane', '#3b82f6'),
('office', 'مصاريف مكتبية', 'Office Supplies', 'أدوات مكتبية وقرطاسية', 'Coffee', '#10b981'),
('transport', 'مواصلات', 'Transportation', 'وقود وصيانة السيارات', 'Car', '#f59e0b'),
('entertainment', 'ضيافة وترفيه', 'Entertainment', 'مصاريف الضيافة والترفيه للعملاء', 'Gift', '#8b5cf6'),
('maintenance', 'صيانة', 'Maintenance', 'صيانة المعدات والأجهزة', 'Settings', '#ef4444'),
('marketing', 'تسويق', 'Marketing', 'مصاريف التسويق والإعلان', 'Users', '#06b6d4'),
('training', 'تدريب', 'Training', 'تكاليف التدريب والتطوير', 'BookOpen', '#84cc16'),
('medical', 'طبية', 'Medical', 'مصاريف طبية وصحية', 'Heart', '#f43f5e'),
('communication', 'اتصالات', 'Communication', 'فواتير الهاتف والإنترنت', 'Phone', '#06b6d4'),
('utilities', 'مرافق', 'Utilities', 'فواتير الكهرباء والماء والغاز', 'Zap', '#eab308')
ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- 📝 COMMENTS AND DOCUMENTATION
-- ==================================================

-- Add table comments
COMMENT ON TABLE expense_categories IS 'فئات النفقات - تصنيف أنواع المصروفات المختلفة';
COMMENT ON TABLE expense_requests IS 'طلبات النفقات - الطلبات المقدمة من الموظفين';
COMMENT ON TABLE expense_approvals IS 'موافقات النفقات - سجل عملية الموافقة على الطلبات';
COMMENT ON TABLE expense_deleted IS 'النفقات المحذوفة - أرشيف الطلبات المحذوفة';
COMMENT ON TABLE expense_budgets IS 'ميزانيات النفقات - إدارة الميزانيات المخصصة';
COMMENT ON TABLE expense_analytics IS 'تحليلات النفقات - إحصائيات وتقارير تحليلية';
COMMENT ON TABLE expense_notifications IS 'إشعارات النفقات - النظام الإشعارات المرتبطة بالنفقات';

-- Add column comments for key fields
COMMENT ON COLUMN expense_requests.request_number IS 'رقم الطلب الفريد';
COMMENT ON COLUMN expense_requests.status IS 'حالة الطلب الحالية';
COMMENT ON COLUMN expense_requests.approval_workflow IS 'سير عمل الموافقة المطلوب';
COMMENT ON COLUMN expense_approvals.approval_level IS 'مستوى الموافقة في التسلسل الهرمي';
COMMENT ON COLUMN expense_budgets.available_budget IS 'الميزانية المتاحة (محسوبة تلقائياً)';

-- Success message
SELECT 'تم إنشاء مخطط قاعدة بيانات النفقات بنجاح! 🎉' as message;