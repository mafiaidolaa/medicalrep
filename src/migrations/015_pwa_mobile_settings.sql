-- Migration: PWA and Mobile App Settings
-- This migration creates the database schema for Progressive Web App functionality

-- Create PWA settings table
CREATE TABLE IF NOT EXISTS pwa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  offline_enabled BOOLEAN DEFAULT true,
  push_notifications_enabled BOOLEAN DEFAULT true,
  background_sync_enabled BOOLEAN DEFAULT true,
  auto_update_enabled BOOLEAN DEFAULT true,
  cache_strategy TEXT DEFAULT 'stale-while-revalidate' 
    CHECK (cache_strategy IN ('network-first', 'cache-first', 'stale-while-revalidate', 'network-only', 'cache-only')),
  cache_max_age_hours INTEGER DEFAULT 24,
  offline_fallback_pages TEXT[] DEFAULT ARRAY['/offline', '/expenses/new'],
  installable BOOLEAN DEFAULT true,
  app_shortcuts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create device info table to track user devices
CREATE TABLE IF NOT EXISTS device_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'windows', 'macos', 'linux', 'unknown')),
  browser TEXT NOT NULL,
  browser_version TEXT NOT NULL,
  screen_width INTEGER NOT NULL,
  screen_height INTEGER NOT NULL,
  is_pwa BOOLEAN DEFAULT false,
  is_offline_capable BOOLEAN DEFAULT false,
  supports_notifications BOOLEAN DEFAULT false,
  supports_background_sync BOOLEAN DEFAULT false,
  last_online TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create app installations tracking table
CREATE TABLE IF NOT EXISTS app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  device_type TEXT NOT NULL,
  browser TEXT,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uninstalled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL, -- Contains p256dh and auth keys
  device_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Create offline sync queue table (for tracking offline operations)
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('expense_request', 'expense_item', 'form_data', 'attachment')),
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  data JSONB NOT NULL,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  created_offline_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_sync_attempt TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mobile app features table
CREATE TABLE IF NOT EXISTS mobile_app_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  requires_permissions TEXT[],
  supported_platforms TEXT[] DEFAULT ARRAY['android', 'ios', 'web'],
  min_version TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user mobile preferences table
CREATE TABLE IF NOT EXISTS user_mobile_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL REFERENCES mobile_app_features(feature_name) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, feature_name)
);

-- Create background sync tasks table
CREATE TABLE IF NOT EXISTS background_sync_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('sync_offline_data', 'update_cache', 'fetch_updates', 'send_analytics')),
  payload JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create PWA analytics table
CREATE TABLE IF NOT EXISTS pwa_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  device_info JSONB,
  is_offline BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification interactions tracking
CREATE TABLE IF NOT EXISTS notification_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('clicked', 'dismissed', 'viewed', 'closed')),
  device_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_info_user_id ON device_info(user_id);
CREATE INDEX IF NOT EXISTS idx_device_info_platform ON device_info(platform, device_type);
CREATE INDEX IF NOT EXISTS idx_app_installations_user_id ON app_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_platform ON app_installations(platform, installed_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_user_id ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_status ON offline_sync_queue(sync_status) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_created ON offline_sync_queue(created_offline_at);
CREATE INDEX IF NOT EXISTS idx_user_mobile_preferences_user_id ON user_mobile_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_background_sync_tasks_status ON background_sync_tasks(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_background_sync_tasks_scheduled ON background_sync_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_pwa_analytics_user_id ON pwa_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_analytics_timestamp ON pwa_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_pwa_analytics_event_type ON pwa_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_interactions_notification_id ON notification_interactions(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_interactions_user_id ON notification_interactions(user_id);

-- Insert default mobile app features
INSERT INTO mobile_app_features (feature_name, display_name, description, category, configuration) VALUES
('offline_mode', 'وضع العمل بدون اتصال', 'إمكانية العمل واستخدام التطبيق بدون اتصال بالإنترنت', 'core', '{"cache_size_mb": 50, "sync_interval_minutes": 5}'::jsonb),
('push_notifications', 'الإشعارات الفورية', 'استقبال إشعارات فورية للموافقات والتحديثات المهمة', 'notifications', '{"sound_enabled": true, "vibration_enabled": true, "quiet_hours": {"enabled": false, "start": "22:00", "end": "08:00"}}'::jsonb),
('background_sync', 'المزامنة في الخلفية', 'مزامنة البيانات تلقائياً في الخلفية حتى عند إغلاق التطبيق', 'sync', '{"sync_frequency": "realtime", "battery_optimization": true}'::jsonb),
('location_tracking', 'تتبع الموقع', 'تتبع موقع المصروفات والتحقق من صحة الإيصالات', 'location', '{"accuracy": "high", "background_tracking": false, "geofencing_enabled": true}'::jsonb),
('camera_integration', 'تكامل الكاميرا', 'استخدام الكاميرا لتصوير الإيصالات مباشرة', 'media', '{"auto_enhance": true, "compression_quality": 0.8, "max_file_size_mb": 5}'::jsonb),
('biometric_auth', 'المصادقة البيومترية', 'استخدام بصمة الإصبع أو الوجه لتأمين التطبيق', 'security', '{"fingerprint_enabled": true, "face_id_enabled": true, "timeout_minutes": 15}'::jsonb),
('dark_mode', 'الوضع المظلم', 'تفعيل الوضع المظلم لتوفير الطاقة وراحة العين', 'appearance', '{"auto_switch": true, "schedule": {"enabled": false, "start": "20:00", "end": "06:00"}}'::jsonb),
('quick_actions', 'الإجراءات السريعة', 'اختصارات للوصول السريع للوظائف الأساسية', 'productivity', '{"shortcuts": ["new_expense", "scan_receipt", "view_reports"]}'::jsonb),
('offline_forms', 'النماذج بدون اتصال', 'إمكانية تعبئة النماذج وحفظها بدون اتصال للمزامنة لاحقاً', 'forms', '{"auto_save_interval": 30, "max_offline_forms": 50}'::jsonb),
('smart_categorization', 'التصنيف الذكي', 'تصنيف المصروفات تلقائياً باستخدام الذكاء الاصطناعي', 'ai', '{"confidence_threshold": 0.8, "auto_apply": false, "learning_enabled": true}'::jsonb)
ON CONFLICT (feature_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  configuration = EXCLUDED.configuration,
  updated_at = now();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE pwa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_app_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mobile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_sync_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- PWA settings - only admin can manage
CREATE POLICY "Admin can manage PWA settings" ON pwa_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Device info - users can manage their own devices
CREATE POLICY "Users can manage their device info" ON device_info
  FOR ALL USING (user_id = auth.uid());

-- App installations - users can view their installations, admin can view all
CREATE POLICY "Users can view their app installations" ON app_installations
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert app installations" ON app_installations
  FOR INSERT WITH CHECK (true);

-- Push subscriptions - users can manage their own subscriptions
CREATE POLICY "Users can manage their push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Offline sync queue - users can manage their own queue
CREATE POLICY "Users can manage their offline sync queue" ON offline_sync_queue
  FOR ALL USING (user_id = auth.uid());

-- Mobile app features - everyone can read, admin can modify
CREATE POLICY "Everyone can read mobile app features" ON mobile_app_features
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage mobile app features" ON mobile_app_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- User mobile preferences - users can manage their own preferences
CREATE POLICY "Users can manage their mobile preferences" ON user_mobile_preferences
  FOR ALL USING (user_id = auth.uid());

-- Background sync tasks - users can manage their own tasks
CREATE POLICY "Users can manage their background sync tasks" ON background_sync_tasks
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

-- PWA analytics - users can insert their own analytics, admin can view all
CREATE POLICY "Users can insert their analytics" ON pwa_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their analytics" ON pwa_analytics
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

-- Notification interactions - users can manage their own interactions
CREATE POLICY "Users can manage their notification interactions" ON notification_interactions
  FOR ALL USING (user_id = auth.uid());

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables
CREATE TRIGGER update_pwa_settings_updated_at BEFORE UPDATE ON pwa_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_info_updated_at BEFORE UPDATE ON device_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offline_sync_queue_updated_at BEFORE UPDATE ON offline_sync_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mobile_app_features_updated_at BEFORE UPDATE ON mobile_app_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_mobile_preferences_updated_at BEFORE UPDATE ON user_mobile_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_background_sync_tasks_updated_at BEFORE UPDATE ON background_sync_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create stored functions for PWA functionality

-- Function to get user's PWA settings with defaults
CREATE OR REPLACE FUNCTION get_user_pwa_settings()
RETURNS TABLE (
  enabled boolean,
  offline_enabled boolean,
  push_notifications_enabled boolean,
  background_sync_enabled boolean,
  auto_update_enabled boolean,
  cache_strategy text,
  cache_max_age_hours integer,
  offline_fallback_pages text[],
  installable boolean,
  app_shortcuts jsonb
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ps.enabled, true) as enabled,
    COALESCE(ps.offline_enabled, true) as offline_enabled,
    COALESCE(ps.push_notifications_enabled, true) as push_notifications_enabled,
    COALESCE(ps.background_sync_enabled, true) as background_sync_enabled,
    COALESCE(ps.auto_update_enabled, true) as auto_update_enabled,
    COALESCE(ps.cache_strategy, 'stale-while-revalidate') as cache_strategy,
    COALESCE(ps.cache_max_age_hours, 24) as cache_max_age_hours,
    COALESCE(ps.offline_fallback_pages, ARRAY['/offline', '/expenses/new']) as offline_fallback_pages,
    COALESCE(ps.installable, true) as installable,
    COALESCE(ps.app_shortcuts, '[]'::jsonb) as app_shortcuts
  FROM pwa_settings ps
  LIMIT 1;
END;
$$;

-- Function to update offline sync status
CREATE OR REPLACE FUNCTION update_offline_sync_status(
  p_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE offline_sync_queue 
  SET 
    sync_status = p_status,
    last_sync_attempt = now(),
    sync_error = p_error,
    retry_count = CASE 
      WHEN p_status = 'failed' THEN retry_count + 1 
      ELSE retry_count 
    END,
    updated_at = now()
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- Function to clean up old offline sync records
CREATE OR REPLACE FUNCTION cleanup_offline_sync_queue()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete synced records older than 7 days
  DELETE FROM offline_sync_queue 
  WHERE sync_status = 'synced' 
    AND updated_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete failed records that exceeded max retries and are older than 30 days
  DELETE FROM offline_sync_queue 
  WHERE sync_status = 'failed' 
    AND retry_count >= max_retries 
    AND created_offline_at < now() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$;

-- Function to get mobile feature settings for user
CREATE OR REPLACE FUNCTION get_user_mobile_features(p_user_id UUID)
RETURNS TABLE (
  feature_name text,
  display_name text,
  description text,
  category text,
  is_enabled boolean,
  user_enabled boolean,
  settings jsonb,
  configuration jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    maf.feature_name,
    maf.display_name,
    maf.description,
    maf.category,
    maf.is_enabled,
    COALESCE(ump.is_enabled, true) as user_enabled,
    COALESCE(ump.settings, '{}'::jsonb) as settings,
    maf.configuration
  FROM mobile_app_features maf
  LEFT JOIN user_mobile_preferences ump ON maf.feature_name = ump.feature_name AND ump.user_id = p_user_id
  WHERE maf.is_enabled = true
  ORDER BY maf.category, maf.display_name;
END;
$$;

-- Schedule cleanup job (if pg_cron extension is available)
-- SELECT cron.schedule('cleanup-offline-sync', '0 2 * * *', 'SELECT cleanup_offline_sync_queue();');

-- Grant necessary permissions
GRANT ALL ON pwa_settings TO authenticated;
GRANT ALL ON device_info TO authenticated;
GRANT ALL ON app_installations TO authenticated;
GRANT ALL ON push_subscriptions TO authenticated;
GRANT ALL ON offline_sync_queue TO authenticated;
GRANT ALL ON mobile_app_features TO authenticated;
GRANT ALL ON user_mobile_preferences TO authenticated;
GRANT ALL ON background_sync_tasks TO authenticated;
GRANT ALL ON pwa_analytics TO authenticated;
GRANT ALL ON notification_interactions TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_pwa_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION update_offline_sync_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_offline_sync_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_mobile_features(UUID) TO authenticated;