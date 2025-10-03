-- إضافة جداول نظام المصروفات
-- تاريخ الإنشاء: 2024-12-19

-- جدول فئات المصروفات
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL,
  category_name_en VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_receipt BOOLEAN DEFAULT false,
  max_amount DECIMAL(15,2),
  approval_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_category_name UNIQUE(category_name)
);

-- جدول طلبات المصروفات
CREATE TABLE IF NOT EXISTS expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  employee_id UUID NOT NULL, -- ربط بجدول الموظفين
  employee_name VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  team VARCHAR(100),
  region VARCHAR(100),
  line_number VARCHAR(50),
  manager_id UUID, -- المدير المسؤول
  
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_date DATE NOT NULL,
  
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'SAR',
  
  status expense_request_status DEFAULT 'pending',
  priority expense_priority DEFAULT 'normal',
  
  description TEXT,
  notes TEXT,
  rejection_reason TEXT,
  
  -- تواريخ الموافقة
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- معلومات الموافقة
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name VARCHAR(200),
  processed_by UUID REFERENCES auth.users(id),
  processed_by_name VARCHAR(200),
  
  -- ملفات مرفقة
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

-- جدول بنود المصروفات
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  category_name VARCHAR(100) NOT NULL,
  
  item_description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  unit_price DECIMAL(15,2),
  
  expense_date DATE NOT NULL,
  expense_time TIME,
  location VARCHAR(200),
  
  receipt_number VARCHAR(100),
  receipt_image_url TEXT,
  
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT valid_quantity CHECK (quantity > 0)
);

-- جدول تاريخ الموافقات
CREATE TABLE IF NOT EXISTS expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approver_name VARCHAR(200) NOT NULL,
  approver_role VARCHAR(100),
  
  action expense_approval_action NOT NULL,
  comments TEXT,
  
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- معلومات إضافية
  previous_status expense_request_status,
  new_status expense_request_status,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إحصائيات المصروفات (للأداء السريع)
CREATE TABLE IF NOT EXISTS expense_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'monthly', 'yearly'
  period_date DATE NOT NULL,
  
  employee_id UUID,
  department VARCHAR(100),
  team VARCHAR(100),
  region VARCHAR(100),
  category_id UUID REFERENCES expense_categories(id),
  
  total_requests INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  approved_requests INTEGER DEFAULT 0,
  approved_amount DECIMAL(15,2) DEFAULT 0,
  pending_requests INTEGER DEFAULT 0,
  pending_amount DECIMAL(15,2) DEFAULT 0,
  rejected_requests INTEGER DEFAULT 0,
  rejected_amount DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_expense_stats UNIQUE(period_type, period_date, employee_id, department, team, region, category_id)
);

-- إنشاء ENUMs للحالات والأولويات
DO $$ 
BEGIN
  -- حالات طلبات المصروفات
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_request_status') THEN
    CREATE TYPE expense_request_status AS ENUM (
      'draft',      -- مسودة
      'pending',    -- في انتظار الموافقة
      'approved',   -- موافق عليها
      'rejected',   -- مرفوضة
      'processed',  -- تم معالجتها في المحاسبة
      'paid',       -- تم دفعها
      'cancelled'   -- ملغاة
    );
  END IF;

  -- أولويات طلبات المصروفات  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_priority') THEN
    CREATE TYPE expense_priority AS ENUM (
      'low',        -- منخفضة
      'normal',     -- عادية
      'high',       -- مرتفعة
      'urgent'      -- عاجلة
    );
  END IF;

  -- إجراءات الموافقة
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_approval_action') THEN
    CREATE TYPE expense_approval_action AS ENUM (
      'submitted',  -- تم التقديم
      'approved',   -- موافق
      'rejected',   -- مرفوض
      'returned',   -- إرجاع للتعديل
      'processed',  -- تم المعالجة
      'paid'        -- تم الدفع
    );
  END IF;
END $$;

-- إنشاء الفهارس للأداء السريع
CREATE INDEX IF NOT EXISTS idx_expense_requests_employee_id ON expense_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_requests_date ON expense_requests(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_requests_manager ON expense_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_team ON expense_requests(team);
CREATE INDEX IF NOT EXISTS idx_expense_requests_region ON expense_requests(region);

CREATE INDEX IF NOT EXISTS idx_expense_items_request_id ON expense_items(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category ON expense_items(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_date ON expense_items(expense_date);

CREATE INDEX IF NOT EXISTS idx_expense_approvals_request_id ON expense_approvals(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver ON expense_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_date ON expense_approvals(action_date);

CREATE INDEX IF NOT EXISTS idx_expense_statistics_period ON expense_statistics(period_type, period_date);
CREATE INDEX IF NOT EXISTS idx_expense_statistics_employee ON expense_statistics(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_statistics_department ON expense_statistics(department);

-- إضافة triggers لتحديث التواريخ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at 
  BEFORE UPDATE ON expense_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_requests_updated_at ON expense_requests;
CREATE TRIGGER update_expense_requests_updated_at 
  BEFORE UPDATE ON expense_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_items_updated_at ON expense_items;
CREATE TRIGGER update_expense_items_updated_at 
  BEFORE UPDATE ON expense_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function لتحديث إجمالي المبلغ في طلب المصروفات
CREATE OR REPLACE FUNCTION update_expense_request_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expense_requests 
  SET total_amount = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM expense_items 
    WHERE expense_request_id = COALESCE(NEW.expense_request_id, OLD.expense_request_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.expense_request_id, OLD.expense_request_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers لتحديث إجمالي المبلغ عند تعديل البنود
DROP TRIGGER IF EXISTS update_request_total_on_item_change ON expense_items;
CREATE TRIGGER update_request_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON expense_items
  FOR EACH ROW EXECUTE FUNCTION update_expense_request_total();

-- Function لتسجيل إجراءات الموافقة تلقائياً
CREATE OR REPLACE FUNCTION log_expense_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- تسجيل التغيير في جدول الموافقات
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO expense_approvals (
      expense_request_id,
      approver_id,
      approver_name,
      action,
      previous_status,
      new_status,
      comments
    ) VALUES (
      NEW.id,
      COALESCE(NEW.approved_by, NEW.processed_by),
      COALESCE(NEW.approved_by_name, NEW.processed_by_name),
      CASE NEW.status
        WHEN 'pending' THEN 'submitted'
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'processed' THEN 'processed'
        WHEN 'paid' THEN 'paid'
        ELSE 'submitted'
      END,
      OLD.status,
      NEW.status,
      CASE NEW.status
        WHEN 'rejected' THEN NEW.rejection_reason
        ELSE NEW.notes
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger لتسجيل إجراءات الموافقة
DROP TRIGGER IF EXISTS log_approval_on_status_change ON expense_requests;
CREATE TRIGGER log_approval_on_status_change
  AFTER UPDATE OF status ON expense_requests
  FOR EACH ROW EXECUTE FUNCTION log_expense_approval();

-- إدراج فئات المصروفات الافتراضية
INSERT INTO expense_categories (category_name, category_name_en, description, requires_receipt, max_amount, approval_required) VALUES
('مصاريف تنقل', 'Transportation', 'مصاريف المواصلات والوقود والتنقل', true, 500.00, true),
('مصاريف ضيافة', 'Hospitality', 'مصاريف الضيافة والطعام مع العملاء', true, 300.00, true),
('مصاريف دعاية وإعلان', 'Marketing & Advertising', 'مصاريف الترويج والدعاية والمواد التسويقية', true, 1000.00, true),
('مصاريف اتصالات', 'Communications', 'مصاريف الهاتف والإنترنت والاتصالات', true, 200.00, false),
('مصاريف مكتبية', 'Office Supplies', 'مصاريف القرطاسية واللوازم المكتبية', true, 150.00, false),
('مصاريف صيانة', 'Maintenance', 'مصاريف صيانة المعدات والأجهزة', true, 800.00, true),
('مصاريف تدريب', 'Training', 'مصاريف التدريب والتطوير المهني', true, 1500.00, true),
('مصاريف أخرى', 'Other Expenses', 'مصاريف متنوعة أخرى', true, 400.00, true)
ON CONFLICT (category_name) DO NOTHING;

-- إنشاء RLS policies
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_statistics ENABLE ROW LEVEL SECURITY;

-- Policies للفئات - يمكن للجميع القراءة، الإدارة فقط يمكنها التعديل
CREATE POLICY "انyone can view expense categories" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage expense categories" ON expense_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role = 'admin')
);

-- Policies للطلبات - الموظف يرى طلباته، المدير يرى طلبات فريقه، المحاسبة ترى الكل
CREATE POLICY "Employees can view their own requests" ON expense_requests FOR SELECT USING (
  employee_id::text = auth.uid()::text
);

CREATE POLICY "Managers can view team requests" ON expense_requests FOR SELECT USING (
  manager_id = auth.uid()
);

CREATE POLICY "Accounting can view all requests" ON expense_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role IN ('admin', 'accountant'))
);

CREATE POLICY "Employees can create requests" ON expense_requests FOR INSERT WITH CHECK (
  employee_id::text = auth.uid()::text
);

CREATE POLICY "Employees can update their pending requests" ON expense_requests FOR UPDATE USING (
  employee_id::text = auth.uid()::text AND status = 'draft'
);

CREATE POLICY "Managers can approve team requests" ON expense_requests FOR UPDATE USING (
  manager_id = auth.uid() AND status = 'pending'
);

CREATE POLICY "Accounting can process approved requests" ON expense_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role IN ('admin', 'accountant'))
  AND status IN ('approved', 'processed')
);

-- Policies للبنود - نفس قواعد الطلبات
CREATE POLICY "View expense items based on request access" ON expense_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expense_requests er 
    WHERE er.id = expense_items.expense_request_id
    AND (
      er.employee_id::text = auth.uid()::text 
      OR er.manager_id = auth.uid()
      OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role IN ('admin', 'accountant'))
    )
  )
);

CREATE POLICY "Manage expense items based on request access" ON expense_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM expense_requests er 
    WHERE er.id = expense_items.expense_request_id
    AND (
      (er.employee_id::text = auth.uid()::text AND er.status = 'draft')
      OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role IN ('admin', 'accountant'))
    )
  )
);

-- Policies للموافقات - يمكن للجميع قراءة الموافقات المتعلقة بطلباتهم
CREATE POLICY "View approvals based on request access" ON expense_approvals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expense_requests er 
    WHERE er.id = expense_approvals.expense_request_id
    AND (
      er.employee_id::text = auth.uid()::text 
      OR er.manager_id = auth.uid()
      OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role IN ('admin', 'accountant'))
    )
  )
);

-- Policies للإحصائيات - الإدارة والمحاسبة فقط
CREATE POLICY "Only admins and accountants can view statistics" ON expense_statistics FOR SELECT USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role IN ('admin', 'accountant'))
);

CREATE POLICY "Only system can manage statistics" ON expense_statistics FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.role = 'system')
);

-- إنشاء views للتقارير السريعة
CREATE OR REPLACE VIEW expense_requests_summary AS
SELECT 
  er.id,
  er.request_number,
  er.employee_id,
  er.employee_name,
  er.department,
  er.team,
  er.region,
  er.line_number,
  er.expense_date,
  er.total_amount,
  er.currency,
  er.status,
  er.priority,
  er.created_at,
  er.approved_at,
  er.approved_by_name,
  COUNT(ei.id) as item_count,
  STRING_AGG(DISTINCT ec.category_name, ', ') as categories
FROM expense_requests er
LEFT JOIN expense_items ei ON er.id = ei.expense_request_id
LEFT JOIN expense_categories ec ON ei.category_id = ec.id
GROUP BY er.id, er.request_number, er.employee_id, er.employee_name, 
         er.department, er.team, er.region, er.line_number,
         er.expense_date, er.total_amount, er.currency, er.status, 
         er.priority, er.created_at, er.approved_at, er.approved_by_name;

-- Function لتوليد رقم الطلب التلقائي
CREATE OR REPLACE FUNCTION generate_expense_request_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  request_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- الحصول على آخر رقم تسلسلي للسنة الحالية
  SELECT COALESCE(MAX(
    CASE 
      WHEN request_number LIKE 'EXP-' || current_year || '-%' 
      THEN (SPLIT_PART(request_number, '-', 3))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM expense_requests;
  
  request_num := 'EXP-' || current_year || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN request_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE expense_categories IS 'فئات المصروفات المختلفة';
COMMENT ON TABLE expense_requests IS 'طلبات المصروفات المقدمة من المندوبين';
COMMENT ON TABLE expense_items IS 'بنود المصروفات التفصيلية';
COMMENT ON TABLE expense_approvals IS 'سجل الموافقات والإجراءات على طلبات المصروفات';
COMMENT ON TABLE expense_statistics IS 'إحصائيات المصروفات للتقارير السريعة';