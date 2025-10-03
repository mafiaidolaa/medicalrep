-- ==============================================
-- نظام الإشعارات المحسّن والشامل - EP Group System
-- يدعم إشعارات الخطط، الفواتير، والمهام الإدارية
-- ==============================================

-- جدول خطط المناديب (لإشعارات المتابعة)
CREATE TABLE IF NOT EXISTS rep_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,
  
  -- تفاصيل الخطة
  plan_date DATE NOT NULL,
  visit_purpose TEXT NOT NULL DEFAULT 'متابعة',
  notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- حالة الخطة
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'visited', 'cancelled', 'postponed')),
  visited_at TIMESTAMP WITH TIME ZONE,
  
  -- إشعارات
  notification_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الفواتير المؤجلة (لإشعارات الاستحقاق)
CREATE TABLE IF NOT EXISTS pending_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  
  -- تفاصيل الفاتورة
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- حالة السداد
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- إشعارات
  reminder_sent BOOLEAN DEFAULT false,
  overdue_notification_sent BOOLEAN DEFAULT false,
  
  -- بيانات إضافية
  description TEXT,
  notes JSONB,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول مهام المديرين (للإشعارات الإدارية)
CREATE TABLE IF NOT EXISTS manager_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- تفاصيل المهمة
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'general' CHECK (task_type IN ('general', 'urgent', 'meeting', 'deadline', 'review')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- المستقبلون
  target_users UUID[], -- مصفوفة من معرفات المستخدمين
  target_roles TEXT[], -- مصفوفة من الأدوار المحددة
  
  -- الجدولة والانتهاء
  due_date TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- الحالة
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  
  -- إحصائيات القراءة
  total_recipients INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تتبع قراءة المهام
CREATE TABLE IF NOT EXISTS task_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES manager_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- حالات التفاعل
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- ملاحظات المستخدم
  user_notes TEXT,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- فهرس فريد لكل مهمة ومستخدم
  UNIQUE(task_id, user_id)
);

-- تحديث جدول الإشعارات لدعم الأنواع الجديدة
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('approval', 'reminder', 'budget_alert', 'info', 'warning', 'error', 'plan_reminder', 'invoice_due', 'manager_task', 'visit_overdue'));

-- إضافة أعمدة جديدة للإشعارات
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_id UUID, -- معرف العنصر المرتبط (خطة، فاتورة، مهمة)
ADD COLUMN IF NOT EXISTS related_type TEXT CHECK (related_type IN ('plan', 'invoice', 'task', 'expense', 'visit')),
ADD COLUMN IF NOT EXISTS action_url TEXT, -- رابط الإجراء المطلوب
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false; -- هل الإشعار تم إنشاؤه تلقائياً

-- ==============================================
-- الفهارس الجديدة
-- ==============================================

-- فهارس rep_plans
CREATE INDEX IF NOT EXISTS idx_rep_plans_rep_id ON rep_plans(rep_id);
CREATE INDEX IF NOT EXISTS idx_rep_plans_plan_date ON rep_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_rep_plans_status ON rep_plans(status);
CREATE INDEX IF NOT EXISTS idx_rep_plans_notification_sent ON rep_plans(notification_sent);

-- فهارس pending_invoices
CREATE INDEX IF NOT EXISTS idx_pending_invoices_clinic_id ON pending_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_due_date ON pending_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_status ON pending_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_reminder_sent ON pending_invoices(reminder_sent);

-- فهارس manager_tasks
CREATE INDEX IF NOT EXISTS idx_manager_tasks_sender_id ON manager_tasks(sender_id);
CREATE INDEX IF NOT EXISTS idx_manager_tasks_status ON manager_tasks(status);
CREATE INDEX IF NOT EXISTS idx_manager_tasks_due_date ON manager_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_manager_tasks_created_at ON manager_tasks(created_at DESC);

-- فهارس task_read_status
CREATE INDEX IF NOT EXISTS idx_task_read_status_task_id ON task_read_status(task_id);
CREATE INDEX IF NOT EXISTS idx_task_read_status_user_id ON task_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_task_read_status_read_at ON task_read_status(read_at);

-- فهارس جديدة للإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_notifications_auto_generated ON notifications(auto_generated);

-- ==============================================
-- الدوال المحسّنة
-- ==============================================

-- دالة إنشاء إشعارات الخطط التلقائية
CREATE OR REPLACE FUNCTION create_plan_reminders()
RETURNS void AS $$
DECLARE
    plan_record RECORD;
BEGIN
    FOR plan_record IN
        SELECT 
            rp.*,
            u.id as rep_user_id,
            u.full_name as rep_name,
            c.name as clinic_name
        FROM rep_plans rp
        JOIN auth.users u ON rp.rep_id = u.id
        LEFT JOIN clinics c ON rp.clinic_id = c.id
        WHERE rp.status = 'planned'
          AND rp.plan_date = CURRENT_DATE
          AND rp.notification_sent = false
    LOOP
        -- إنشاء إشعار للمندوب
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            priority,
            related_id,
            related_type,
            action_url,
            auto_generated,
            data
        ) VALUES (
            plan_record.rep_user_id,
            '📅 تذكير: زيارة مجدولة اليوم',
            'لديك زيارة مجدولة اليوم لـ ' || COALESCE(plan_record.clinic_name, 'العيادة') || 
            ' بغرض ' || plan_record.visit_purpose,
            'plan_reminder',
            plan_record.priority,
            plan_record.id,
            'plan',
            '/visits/new?plan_id=' || plan_record.id,
            true,
            jsonb_build_object(
                'plan_id', plan_record.id,
                'clinic_name', COALESCE(plan_record.clinic_name, 'غير محدد'),
                'visit_purpose', plan_record.visit_purpose,
                'plan_date', plan_record.plan_date,
                'notes', plan_record.notes
            )
        );
        
        -- تحديث حالة الإشعار
        UPDATE rep_plans 
        SET notification_sent = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = plan_record.id;
    END LOOP;
END;
$$ language 'plpgsql';

-- دالة إنشاء إشعارات الفواتير المستحقة
CREATE OR REPLACE FUNCTION create_invoice_reminders()
RETURNS void AS $$
DECLARE
    invoice_record RECORD;
    days_overdue INTEGER;
BEGIN
    FOR invoice_record IN
        SELECT 
            pi.*,
            c.name as clinic_name,
            c.contact_person as contact_name
        FROM pending_invoices pi
        LEFT JOIN clinics c ON pi.clinic_id = c.id
        WHERE pi.status IN ('pending', 'partially_paid')
          AND pi.due_date <= CURRENT_DATE
          AND (
              (pi.due_date = CURRENT_DATE AND pi.reminder_sent = false) OR
              (pi.due_date < CURRENT_DATE AND pi.overdue_notification_sent = false)
          )
    LOOP
        days_overdue := (CURRENT_DATE - invoice_record.due_date)::INTEGER;
        
        -- إشعار لفريق المحاسبة
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            priority,
            related_id,
            related_type,
            action_url,
            auto_generated,
            data
        )
        SELECT 
            u.id,
            CASE 
                WHEN days_overdue = 0 THEN '💰 فاتورة مستحقة اليوم'
                ELSE '⚠️ فاتورة متأخرة منذ ' || days_overdue || ' أيام'
            END,
            'فاتورة رقم ' || invoice_record.invoice_number || ' من ' || 
            COALESCE(invoice_record.clinic_name, 'عميل غير محدد') || 
            ' بقيمة ' || invoice_record.amount || ' ' || invoice_record.currency,
            'invoice_due',
            CASE 
                WHEN days_overdue = 0 THEN 'medium'
                WHEN days_overdue <= 7 THEN 'high'
                ELSE 'urgent'
            END,
            invoice_record.id,
            'invoice',
            '/accounting/invoices/' || invoice_record.id,
            true,
            jsonb_build_object(
                'invoice_id', invoice_record.id,
                'invoice_number', invoice_record.invoice_number,
                'amount', invoice_record.amount,
                'currency', invoice_record.currency,
                'due_date', invoice_record.due_date,
                'days_overdue', days_overdue,
                'clinic_name', COALESCE(invoice_record.clinic_name, 'غير محدد')
            )
        FROM auth.users u
        JOIN user_profiles up ON u.id = up.user_id
        WHERE up.role IN ('admin', 'accounting', 'manager');
        
        -- تحديث حالة الإشعارات
        IF days_overdue = 0 THEN
            UPDATE pending_invoices 
            SET reminder_sent = true, updated_at = CURRENT_TIMESTAMP 
            WHERE id = invoice_record.id;
        ELSE
            UPDATE pending_invoices 
            SET overdue_notification_sent = true, updated_at = CURRENT_TIMESTAMP 
            WHERE id = invoice_record.id;
        END IF;
    END LOOP;
END;
$$ language 'plpgsql';

-- دالة إنشاء إشعارات المهام الإدارية
CREATE OR REPLACE FUNCTION create_manager_task_notifications(p_task_id UUID)
RETURNS void AS $$
DECLARE
    task_record RECORD;
    target_user_id UUID;
    recipients_count INTEGER := 0;
BEGIN
    -- جلب بيانات المهمة
    SELECT * INTO task_record 
    FROM manager_tasks 
    WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- إرسال إشعارات للمستخدمين المحددين
    IF task_record.target_users IS NOT NULL THEN
        FOREACH target_user_id IN ARRAY task_record.target_users
        LOOP
            INSERT INTO notifications (
                user_id,
                title,
                message,
                type,
                priority,
                related_id,
                related_type,
                action_url,
                auto_generated,
                expires_at,
                data
            ) VALUES (
                target_user_id,
                '📋 مهمة جديدة: ' || task_record.title,
                COALESCE(task_record.description, 'لا يوجد تفاصيل إضافية'),
                'manager_task',
                task_record.priority,
                task_record.id,
                'task',
                '/tasks/' || task_record.id,
                true,
                task_record.expires_at,
                jsonb_build_object(
                    'task_id', task_record.id,
                    'task_type', task_record.task_type,
                    'due_date', task_record.due_date,
                    'sender_name', (SELECT full_name FROM auth.users WHERE id = task_record.sender_id)
                )
            );
            
            -- إنشاء سجل متابعة
            INSERT INTO task_read_status (task_id, user_id)
            VALUES (task_record.id, target_user_id)
            ON CONFLICT (task_id, user_id) DO NOTHING;
            
            recipients_count := recipients_count + 1;
        END LOOP;
    END IF;
    
    -- إرسال إشعارات للأدوار المحددة
    IF task_record.target_roles IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            priority,
            related_id,
            related_type,
            action_url,
            auto_generated,
            expires_at,
            data
        )
        SELECT 
            u.id,
            '📋 مهمة جديدة: ' || task_record.title,
            COALESCE(task_record.description, 'لا يوجد تفاصيل إضافية'),
            'manager_task',
            task_record.priority,
            task_record.id,
            'task',
            '/tasks/' || task_record.id,
            true,
            task_record.expires_at,
            jsonb_build_object(
                'task_id', task_record.id,
                'task_type', task_record.task_type,
                'due_date', task_record.due_date,
                'sender_name', (SELECT full_name FROM auth.users WHERE id = task_record.sender_id)
            )
        FROM auth.users u
        JOIN user_profiles up ON u.id = up.user_id
        WHERE up.role = ANY(task_record.target_roles);
        
        -- إحصاء المستلمين الإضافيين
        SELECT COUNT(*) INTO recipients_count
        FROM auth.users u
        JOIN user_profiles up ON u.id = up.user_id
        WHERE up.role = ANY(task_record.target_roles);
        
        -- إنشاء سجلات المتابعة للأدوار
        INSERT INTO task_read_status (task_id, user_id)
        SELECT task_record.id, u.id
        FROM auth.users u
        JOIN user_profiles up ON u.id = up.user_id
        WHERE up.role = ANY(task_record.target_roles)
        ON CONFLICT (task_id, user_id) DO NOTHING;
    END IF;
    
    -- تحديث عدد المستلمين
    UPDATE manager_tasks 
    SET total_recipients = recipients_count, updated_at = CURRENT_TIMESTAMP
    WHERE id = task_record.id;
END;
$$ language 'plpgsql';

-- دالة تحديث إحصائيات قراءة المهام
CREATE OR REPLACE FUNCTION update_task_read_stats()
RETURNS TRIGGER AS $$
DECLARE
    task_id_var UUID := NEW.task_id;
BEGIN
    -- تحديث إحصائيات القراءة والنقر
    UPDATE manager_tasks 
    SET 
        read_count = (
            SELECT COUNT(*) FROM task_read_status 
            WHERE task_id = task_id_var AND read_at IS NOT NULL
        ),
        clicked_count = (
            SELECT COUNT(*) FROM task_read_status 
            WHERE task_id = task_id_var AND clicked_at IS NOT NULL
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = task_id_var;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger لتحديث إحصائيات المهام
CREATE TRIGGER update_task_stats_trigger
    AFTER UPDATE ON task_read_status
    FOR EACH ROW
    EXECUTE FUNCTION update_task_read_stats();

-- ==============================================
-- صلاحيات الأمان الجديدة
-- ==============================================

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE rep_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_read_status ENABLE ROW LEVEL SECURITY;

-- صلاحيات rep_plans
CREATE POLICY "Reps can manage their own plans"
    ON rep_plans
    FOR ALL
    USING (auth.uid() = rep_id)
    WITH CHECK (auth.uid() = rep_id);

CREATE POLICY "Managers and admins can view all plans"
    ON rep_plans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
    );

-- صلاحيات pending_invoices
CREATE POLICY "Accounting staff can manage invoices"
    ON pending_invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'accounting', 'manager')
        )
    );

-- صلاحيات manager_tasks
CREATE POLICY "Managers can create tasks"
    ON manager_tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view tasks assigned to them"
    ON manager_tasks
    FOR SELECT
    USING (
        auth.uid() = sender_id OR
        auth.uid() = ANY(target_users) OR
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = ANY(target_roles)
        )
    );

-- صلاحيات task_read_status
CREATE POLICY "Users can manage their own task status"
    ON task_read_status
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- Triggers للتحديثات التلقائية
-- ==============================================

CREATE TRIGGER update_rep_plans_updated_at 
    BEFORE UPDATE ON rep_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_invoices_updated_at 
    BEFORE UPDATE ON pending_invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manager_tasks_updated_at 
    BEFORE UPDATE ON manager_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- بيانات تجريبية للاختبار
-- ==============================================

-- إدراج خطة تجريبية (للاختبار)
INSERT INTO rep_plans (rep_id, clinic_id, plan_date, visit_purpose, notes, priority)
SELECT 
    u.id,
    '550e8400-e29b-41d4-a716-446655440001'::uuid, -- معرف عيادة تجريبي
    CURRENT_DATE,
    'متابعة دورية',
    'زيارة شهرية للمتابعة والتقييم',
    'medium'
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
WHERE up.role = 'rep'
LIMIT 1
ON CONFLICT DO NOTHING;

-- إدراج فاتورة تجريبية (للاختبار)
INSERT INTO pending_invoices (clinic_id, invoice_number, amount, currency, issue_date, due_date, description)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'INV-2024-001',
    5000.00,
    'EGP',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '5 days',
    'فاتورة منتجات شهر ديسمبر 2024'
)
ON CONFLICT (invoice_number) DO NOTHING;

-- ==============================================
-- التعليقات والوصف
-- ==============================================

COMMENT ON TABLE rep_plans IS 'خطط المناديب اليومية والأسبوعية للزيارات';
COMMENT ON TABLE pending_invoices IS 'الفواتير المؤجلة والمستحقة السداد';
COMMENT ON TABLE manager_tasks IS 'المهام الإدارية التي يرسلها المديرون للفريق';
COMMENT ON TABLE task_read_status IS 'تتبع حالة قراءة وتفاعل المستخدمين مع المهام';

COMMENT ON COLUMN rep_plans.visit_purpose IS 'الغرض من الزيارة: متابعة، عرض منتج، تحصيل، إلخ';
COMMENT ON COLUMN pending_invoices.status IS 'حالة الفاتورة: pending, partially_paid, paid, overdue, cancelled';
COMMENT ON COLUMN manager_tasks.target_users IS 'مصفوفة معرفات المستخدمين المستهدفين';
COMMENT ON COLUMN manager_tasks.target_roles IS 'مصفوفة الأدوار المستهدفة: admin, manager, rep, accounting';