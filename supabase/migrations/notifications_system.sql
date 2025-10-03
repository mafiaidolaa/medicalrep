-- ==============================================
-- نظام الإشعارات المتقدم - EP Group System
-- ==============================================

-- Table: notification_settings
-- إعدادات الإشعارات للمستخدمين
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- نوع الإشعارات
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  approval_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  budget_alert_notifications BOOLEAN DEFAULT true,
  
  -- تكرار التذكيرات
  reminder_frequency TEXT DEFAULT 'daily' CHECK (reminder_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  
  -- ساعات الصمت
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- إعدادات إضافية
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- فهرس فريد لكل مستخدم
  UNIQUE(user_id)
);

-- Table: notifications
-- سجل الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- محتوى الإشعار
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('approval', 'reminder', 'budget_alert', 'info', 'warning', 'error')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- حالة الإشعار
  read BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  
  -- بيانات إضافية (JSON)
  data JSONB,
  
  -- انتهاء الصلاحية
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: push_subscriptions
-- اشتراكات Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- بيانات الاشتراك
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL, -- {p256dh, auth}
  
  -- معلومات الجهاز
  user_agent TEXT,
  device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  
  -- الحالة
  is_active BOOLEAN DEFAULT true,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- فهرس فريد للـ endpoint
  UNIQUE(endpoint)
);

-- Table: notification_logs
-- سجل إرسال الإشعارات
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- نوع الإرسال
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('push', 'email', 'in_app')),
  
  -- حالة الإرسال
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
  
  -- تفاصيل الخطأ
  error_message TEXT,
  
  -- بيانات إضافية
  metadata JSONB,
  
  -- التواريخ
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- الفهارس (Indexes)
-- ==============================================

-- فهارس notification_settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- فهارس notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- فهارس push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_type ON push_subscriptions(device_type);

-- فهارس notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_delivery_method ON notification_logs(delivery_method);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- ==============================================
-- الدوال المساعدة (Functions)
-- ==============================================

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers لتحديث updated_at
CREATE TRIGGER update_notification_settings_updated_at 
  BEFORE UPDATE ON notification_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- دالة إنشاء إعدادات افتراضية للمستخدم الجديد
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger لإنشاء إعدادات افتراضية عند تسجيل مستخدم جديد
CREATE TRIGGER create_default_notification_settings_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();

-- دالة تنظيف الإشعارات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- دالة تنظيف الإشعارات القديمة (أكثر من 30 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    AND read = true;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- دالة إحصائيات الإشعارات
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_notifications BIGINT,
  unread_notifications BIGINT,
  urgent_notifications BIGINT,
  approval_notifications BIGINT,
  reminder_notifications BIGINT,
  budget_alert_notifications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = false) as unread_notifications,
    COUNT(*) FILTER (WHERE priority = 'urgent' AND read = false) as urgent_notifications,
    COUNT(*) FILTER (WHERE type = 'approval' AND read = false) as approval_notifications,
    COUNT(*) FILTER (WHERE type = 'reminder' AND read = false) as reminder_notifications,
    COUNT(*) FILTER (WHERE type = 'budget_alert' AND read = false) as budget_alert_notifications
  FROM notifications
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
END;
$$ language 'plpgsql';

-- دالة البحث في الإشعارات
CREATE OR REPLACE FUNCTION search_notifications(
  p_user_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_read_status BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  priority TEXT,
  read BOOLEAN,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.read,
    n.data,
    n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND (p_search_term IS NULL OR (n.title ILIKE '%' || p_search_term || '%' OR n.message ILIKE '%' || p_search_term || '%'))
    AND (p_type IS NULL OR n.type = p_type)
    AND (p_priority IS NULL OR n.priority = p_priority)
    AND (p_read_status IS NULL OR n.read = p_read_status)
    AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ language 'plpgsql';

-- ==============================================
-- صلاحيات الأمان (RLS Policies)
-- ==============================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- صلاحيات notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- صلاحيات notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- صلاحيات push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- صلاحيات notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notification logs"
  ON notification_logs
  FOR ALL
  WITH CHECK (true);

-- ==============================================
-- المهام المجدولة (Scheduled Tasks)
-- ==============================================

-- تنظيف الإشعارات المنتهية الصلاحية كل ساعة
-- يتم تشغيلها عبر cron job أو scheduled function

-- مهمة إرسال التذكيرات الدورية
CREATE OR REPLACE FUNCTION send_scheduled_reminders()
RETURNS void AS $$
DECLARE
  reminder_record RECORD;
  days_pending INTEGER;
BEGIN
  -- البحث عن طلبات المصروفات المعلقة
  FOR reminder_record IN
    SELECT 
      er.*,
      u.id as manager_id,
      u.full_name as manager_name,
      u.email as manager_email,
      ns.reminder_frequency,
      EXTRACT(DAY FROM CURRENT_TIMESTAMP - er.created_at)::INTEGER as days_pending
    FROM expense_requests er
    JOIN users u ON er.assigned_manager_id = u.id
    LEFT JOIN notification_settings ns ON u.id = ns.user_id
    WHERE er.status = 'pending'
      AND er.created_at < CURRENT_TIMESTAMP - INTERVAL '1 day'
      AND (ns.reminder_notifications IS NULL OR ns.reminder_notifications = true)
  LOOP
    days_pending := reminder_record.days_pending;
    
    -- تحديد ما إذا كان يجب إرسال تذكير بناءً على التكرار المحدد
    IF (reminder_record.reminder_frequency = 'daily') OR
       (reminder_record.reminder_frequency = 'weekly' AND days_pending % 7 = 0) OR
       (reminder_record.reminder_frequency = 'immediate' AND days_pending = 1) THEN
      
      -- إدراج إشعار تذكير
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        priority,
        data
      ) VALUES (
        reminder_record.manager_id,
        'تذكير: طلب مصروفات معلق منذ ' || days_pending || ' أيام',
        'طلب مصروفات من ' || reminder_record.employee_name || ' بقيمة ' || 
        reminder_record.total_amount || ' ' || reminder_record.currency || ' ما زال في انتظار موافقتك',
        'reminder',
        CASE WHEN days_pending > 7 THEN 'urgent' ELSE 'medium' END,
        jsonb_build_object(
          'expense_request_id', reminder_record.id,
          'days_pending', days_pending,
          'action_url', '/expenses/approvals?request=' || reminder_record.id
        )
      );
    END IF;
  END LOOP;
END;
$$ language 'plpgsql';

-- دالة فحص تجاوز الميزانية وإرسال تنبيهات
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS void AS $$
DECLARE
  budget_record RECORD;
  used_percentage NUMERIC;
BEGIN
  -- فحص ميزانيات الفئات
  FOR budget_record IN
    SELECT 
      ec.name as category_name,
      ec.monthly_budget,
      COALESCE(SUM(ei.amount), 0) as used_amount,
      u.id as user_id,
      u.full_name as user_name
    FROM expense_categories ec
    CROSS JOIN users u
    LEFT JOIN expense_requests er ON er.employee_id = u.id 
      AND er.status IN ('approved', 'processed', 'paid')
      AND DATE_TRUNC('month', er.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    LEFT JOIN expense_items ei ON ei.expense_request_id = er.id 
      AND ei.category_id = ec.id
    WHERE ec.monthly_budget > 0
      AND EXISTS (
        SELECT 1 FROM notification_settings ns 
        WHERE ns.user_id = u.id 
        AND (ns.budget_alert_notifications IS NULL OR ns.budget_alert_notifications = true)
      )
    GROUP BY ec.id, ec.name, ec.monthly_budget, u.id, u.full_name
  LOOP
    used_percentage := (budget_record.used_amount / budget_record.monthly_budget) * 100;
    
    -- إرسال تنبيه إذا تم تجاوز 80% من الميزانية
    IF used_percentage >= 80 THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        priority,
        data
      ) VALUES (
        budget_record.user_id,
        'تحذير: تجاوز الميزانية',
        'تم تجاوز ' || ROUND(used_percentage, 1) || '% من ميزانية ' || budget_record.category_name || 
        '. المبلغ المستخدم: ' || budget_record.used_amount || ' من أصل ' || budget_record.monthly_budget,
        'budget_alert',
        CASE WHEN used_percentage > 95 THEN 'urgent' ELSE 'high' END,
        jsonb_build_object(
          'category', budget_record.category_name,
          'used_amount', budget_record.used_amount,
          'budget_limit', budget_record.monthly_budget,
          'percentage', ROUND(used_percentage, 1),
          'action_url', '/accounts/expenses/reports'
        )
      );
    END IF;
  END LOOP;
END;
$$ language 'plpgsql';

-- ==============================================
-- البيانات الأولية (Initial Data)
-- ==============================================

-- إدراج إعدادات افتراضية للمستخدمين الموجودين
INSERT INTO notification_settings (user_id, push_notifications, email_notifications, approval_notifications, reminder_notifications, budget_alert_notifications, reminder_frequency)
SELECT 
  id,
  true,
  true,
  true,
  true,
  true,
  'daily'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================
-- تعليقات الجداول والأعمدة
-- ==============================================

COMMENT ON TABLE notification_settings IS 'إعدادات الإشعارات للمستخدمين';
COMMENT ON TABLE notifications IS 'سجل جميع الإشعارات المرسلة للمستخدمين';
COMMENT ON TABLE push_subscriptions IS 'اشتراكات Push Notifications للأجهزة';
COMMENT ON TABLE notification_logs IS 'سجل تفصيلي لإرسال الإشعارات';

COMMENT ON COLUMN notification_settings.reminder_frequency IS 'تكرار إرسال التذكيرات: immediate, hourly, daily, weekly';
COMMENT ON COLUMN notifications.type IS 'نوع الإشعار: approval, reminder, budget_alert, info, warning, error';
COMMENT ON COLUMN notifications.priority IS 'أولوية الإشعار: low, medium, high, urgent';
COMMENT ON COLUMN push_subscriptions.device_type IS 'نوع الجهاز: desktop, mobile, tablet';
COMMENT ON COLUMN notification_logs.delivery_method IS 'طريقة الإرسال: push, email, in_app';
COMMENT ON COLUMN notification_logs.status IS 'حالة الإرسال: pending, sent, delivered, failed, expired';