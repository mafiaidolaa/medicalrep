-- ==============================================
-- نظام كشف الغش في الإيصالات - EP Group System
-- ==============================================

-- Table: fraud_detection_settings
-- إعدادات نظام كشف الغش
CREATE TABLE IF NOT EXISTS fraud_detection_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- تفعيل النظام
  enabled BOOLEAN DEFAULT true,
  
  -- عتبة التشابه للكشف عن المكررات (0-100)
  duplicate_threshold NUMERIC(5,2) DEFAULT 85.0 CHECK (duplicate_threshold >= 0 AND duplicate_threshold <= 100),
  
  -- نسبة التسامح في المبلغ (0-100)
  amount_tolerance NUMERIC(5,2) DEFAULT 5.0 CHECK (amount_tolerance >= 0 AND amount_tolerance <= 100),
  
  -- النافذة الزمنية للبحث عن المكررات (بالساعات)
  time_window_hours INTEGER DEFAULT 24 CHECK (time_window_hours > 0),
  
  -- نطاق المسافة للموقع (بالكيلومتر)
  location_radius_km NUMERIC(8,3) DEFAULT 0.5 CHECK (location_radius_km >= 0),
  
  -- وضع علامة تلقائية على الإيصالات المشبوهة
  auto_flag_suspicious BOOLEAN DEFAULT true,
  
  -- طلب موافقة المدير للإيصالات المشبوهة
  require_manager_approval BOOLEAN DEFAULT true,
  
  -- إعدادات متقدمة
  advanced_pattern_detection BOOLEAN DEFAULT false,
  ai_assisted_detection BOOLEAN DEFAULT false,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: receipt_fingerprints
-- بصمات الإيصالات للمقارنة
CREATE TABLE IF NOT EXISTS receipt_fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_item_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
  
  -- البصمات المختلفة
  hash_content TEXT NOT NULL, -- Hash للمحتوى النصي
  hash_visual TEXT, -- Hash للمحتوى البصري (إذا توفر)
  
  -- البيانات الأساسية
  amount NUMERIC(12,2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- معلومات الموقع
  location JSONB, -- {lat, lng, address}
  
  -- معلومات التاجر
  merchant_info JSONB, -- {name, tax_number, phone}
  
  -- النص المستخرج
  extracted_text TEXT,
  
  -- معلومات إضافية
  receipt_image_url TEXT,
  ocr_confidence NUMERIC(5,2), -- ثقة استخراج النص (0-100)
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- فهرس فريد لكل expense_item
  UNIQUE(expense_item_id)
);

-- Table: fraud_alerts
-- تنبيهات الغش المكتشفة
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_item_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
  duplicate_item_id UUID REFERENCES expense_items(id) ON DELETE SET NULL,
  
  -- درجة الثقة في كون الإيصال مشبوه (0-100)
  confidence_score NUMERIC(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- نوع الغش المكتشف
  fraud_type TEXT NOT NULL CHECK (fraud_type IN (
    'duplicate_receipt', 'amount_manipulation', 'location_mismatch', 
    'time_anomaly', 'pattern_anomaly', 'merchant_fraud', 'category_fraud'
  )),
  
  -- تفاصيل الكشف (JSON)
  details JSONB NOT NULL, -- {amount_difference, time_difference_hours, distance_km, similarity_factors, risk_level}
  
  -- حالة التنبيه
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'confirmed', 'dismissed')),
  
  -- المراجعة
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- الإجراءات المتخذة
  action_taken TEXT, -- ما الإجراء المتخذ بناءً على التنبيه
  resolution TEXT, -- نتيجة المراجعة
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: fraud_patterns
-- أنماط الغش المعروفة للتعلم الآلي
CREATE TABLE IF NOT EXISTS fraud_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- معلومات النمط
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'duplicate', 'amount_inflation', 'location_spoofing', 
    'time_manipulation', 'category_abuse', 'merchant_collusion'
  )),
  
  -- خصائص النمط
  pattern_features JSONB NOT NULL, -- الخصائص المميزة للنمط
  
  -- إحصائيات النمط
  detection_count INTEGER DEFAULT 0,
  confirmed_cases INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  accuracy_rate NUMERIC(5,2) DEFAULT 0.0,
  
  -- حالة النمط
  is_active BOOLEAN DEFAULT true,
  risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_detected_at TIMESTAMP WITH TIME ZONE
);

-- Table: user_fraud_scores
-- درجات الغش للمستخدمين
CREATE TABLE IF NOT EXISTS user_fraud_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- درجات الغش
  overall_score NUMERIC(5,2) DEFAULT 0.0 CHECK (overall_score >= 0 AND overall_score <= 100),
  duplicate_score NUMERIC(5,2) DEFAULT 0.0,
  amount_score NUMERIC(5,2) DEFAULT 0.0,
  pattern_score NUMERIC(5,2) DEFAULT 0.0,
  
  -- إحصائيات المستخدم
  total_expenses INTEGER DEFAULT 0,
  flagged_expenses INTEGER DEFAULT 0,
  confirmed_fraud INTEGER DEFAULT 0,
  
  -- مستوى المخاطر
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- آخر تحديث للدرجة
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- فهرس فريد لكل مستخدم
  UNIQUE(user_id)
);

-- ==============================================
-- الفهارس (Indexes)
-- ==============================================

-- فهارس receipt_fingerprints
CREATE INDEX IF NOT EXISTS idx_receipt_fingerprints_expense_item_id ON receipt_fingerprints(expense_item_id);
CREATE INDEX IF NOT EXISTS idx_receipt_fingerprints_hash_content ON receipt_fingerprints(hash_content);
CREATE INDEX IF NOT EXISTS idx_receipt_fingerprints_amount ON receipt_fingerprints(amount);
CREATE INDEX IF NOT EXISTS idx_receipt_fingerprints_timestamp ON receipt_fingerprints(timestamp);
CREATE INDEX IF NOT EXISTS idx_receipt_fingerprints_location ON receipt_fingerprints USING GIN(location) WHERE location IS NOT NULL;

-- فهارس fraud_alerts
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_expense_item_id ON fraud_alerts(expense_item_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_duplicate_item_id ON fraud_alerts(duplicate_item_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_fraud_type ON fraud_alerts(fraud_type);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_confidence_score ON fraud_alerts(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_at ON fraud_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_risk_level ON fraud_alerts USING GIN((details->'risk_level'));

-- فهارس fraud_patterns
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_pattern_type ON fraud_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_is_active ON fraud_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_risk_score ON fraud_patterns(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_features ON fraud_patterns USING GIN(pattern_features);

-- فهارس user_fraud_scores
CREATE INDEX IF NOT EXISTS idx_user_fraud_scores_user_id ON user_fraud_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fraud_scores_overall_score ON user_fraud_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_fraud_scores_risk_level ON user_fraud_scores(risk_level);

-- ==============================================
-- الدوال المساعدة (Functions)
-- ==============================================

-- دالة تحديث updated_at تلقائياً
CREATE TRIGGER update_fraud_detection_settings_updated_at 
  BEFORE UPDATE ON fraud_detection_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipt_fingerprints_updated_at 
  BEFORE UPDATE ON receipt_fingerprints 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_alerts_updated_at 
  BEFORE UPDATE ON fraud_alerts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_patterns_updated_at 
  BEFORE UPDATE ON fraud_patterns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_fraud_scores_updated_at 
  BEFORE UPDATE ON user_fraud_scores 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- دالة حساب درجة الغش للمستخدم
CREATE OR REPLACE FUNCTION calculate_user_fraud_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_expenses INTEGER;
  flagged_expenses INTEGER;
  confirmed_fraud INTEGER;
  fraud_score NUMERIC := 0.0;
BEGIN
  -- حساب إجمالي المصروفات
  SELECT COUNT(*)
  INTO total_expenses
  FROM expense_items ei
  JOIN expense_requests er ON ei.expense_request_id = er.id
  WHERE er.employee_id = p_user_id;

  -- حساب المصروفات المشبوهة
  SELECT COUNT(DISTINCT fa.expense_item_id)
  INTO flagged_expenses
  FROM fraud_alerts fa
  JOIN expense_items ei ON fa.expense_item_id = ei.id
  JOIN expense_requests er ON ei.expense_request_id = er.id
  WHERE er.employee_id = p_user_id;

  -- حساب الغش المؤكد
  SELECT COUNT(DISTINCT fa.expense_item_id)
  INTO confirmed_fraud
  FROM fraud_alerts fa
  JOIN expense_items ei ON fa.expense_item_id = ei.id
  JOIN expense_requests er ON ei.expense_request_id = er.id
  WHERE er.employee_id = p_user_id
    AND fa.status = 'confirmed';

  -- حساب درجة الغش
  IF total_expenses > 0 THEN
    fraud_score := (
      (flagged_expenses::NUMERIC / total_expenses) * 30 +
      (confirmed_fraud::NUMERIC / total_expenses) * 70
    ) * 100;
  END IF;

  -- تحديث أو إدراج الدرجة
  INSERT INTO user_fraud_scores (
    user_id, 
    overall_score, 
    total_expenses, 
    flagged_expenses, 
    confirmed_fraud,
    risk_level,
    last_calculated_at
  ) VALUES (
    p_user_id, 
    LEAST(fraud_score, 100), 
    total_expenses, 
    flagged_expenses, 
    confirmed_fraud,
    CASE 
      WHEN fraud_score >= 75 THEN 'critical'
      WHEN fraud_score >= 50 THEN 'high'
      WHEN fraud_score >= 25 THEN 'medium'
      ELSE 'low'
    END,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (user_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    total_expenses = EXCLUDED.total_expenses,
    flagged_expenses = EXCLUDED.flagged_expenses,
    confirmed_fraud = EXCLUDED.confirmed_fraud,
    risk_level = EXCLUDED.risk_level,
    last_calculated_at = EXCLUDED.last_calculated_at;

  RETURN LEAST(fraud_score, 100);
END;
$$ language 'plpgsql';

-- دالة البحث عن الإيصالات المتشابهة
CREATE OR REPLACE FUNCTION find_similar_receipts(
  p_expense_item_id UUID,
  p_similarity_threshold NUMERIC DEFAULT 85.0,
  p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  fingerprint_id UUID,
  expense_item_id UUID,
  similarity_score NUMERIC,
  amount_diff NUMERIC,
  time_diff_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf2.id as fingerprint_id,
    rf2.expense_item_id,
    -- حساب التشابه بناءً على عوامل متعددة
    (
      CASE WHEN rf1.hash_content = rf2.hash_content THEN 40.0 ELSE 0.0 END +
      GREATEST(0, 25.0 - ABS(rf1.amount - rf2.amount) / GREATEST(rf1.amount, rf2.amount) * 25.0) +
      GREATEST(0, 20.0 - EXTRACT(EPOCH FROM ABS(rf1.timestamp - rf2.timestamp))/3600 * 0.5) +
      CASE 
        WHEN rf1.location IS NOT NULL AND rf2.location IS NOT NULL THEN
          GREATEST(0, 15.0 - (
            ST_Distance(
              ST_Point((rf1.location->>'lng')::FLOAT, (rf1.location->>'lat')::FLOAT)::geography,
              ST_Point((rf2.location->>'lng')::FLOAT, (rf2.location->>'lat')::FLOAT)::geography
            ) / 1000 * 3
          ))
        ELSE 0.0
      END
    ) as similarity_score,
    ABS(rf1.amount - rf2.amount) as amount_diff,
    EXTRACT(EPOCH FROM ABS(rf1.timestamp - rf2.timestamp))/3600 as time_diff_hours
  FROM receipt_fingerprints rf1
  JOIN receipt_fingerprints rf2 ON rf1.id != rf2.id
  WHERE rf1.expense_item_id = p_expense_item_id
    AND rf2.timestamp >= (rf1.timestamp - INTERVAL '1 hour' * p_time_window_hours)
    AND rf2.timestamp <= (rf1.timestamp + INTERVAL '1 hour' * p_time_window_hours)
  HAVING (
    CASE WHEN rf1.hash_content = rf2.hash_content THEN 40.0 ELSE 0.0 END +
    GREATEST(0, 25.0 - ABS(rf1.amount - rf2.amount) / GREATEST(rf1.amount, rf2.amount) * 25.0) +
    GREATEST(0, 20.0 - EXTRACT(EPOCH FROM ABS(rf1.timestamp - rf2.timestamp))/3600 * 0.5) +
    CASE 
      WHEN rf1.location IS NOT NULL AND rf2.location IS NOT NULL THEN
        GREATEST(0, 15.0 - (
          ST_Distance(
            ST_Point((rf1.location->>'lng')::FLOAT, (rf1.location->>'lat')::FLOAT)::geography,
            ST_Point((rf2.location->>'lng')::FLOAT, (rf2.location->>'lat')::FLOAT)::geography
          ) / 1000 * 3
        ))
      ELSE 0.0
    END
  ) >= p_similarity_threshold;
END;
$$ language 'plpgsql';

-- دالة إحصائيات نظام كشف الغش
CREATE OR REPLACE FUNCTION get_fraud_detection_stats()
RETURNS TABLE (
  total_alerts BIGINT,
  pending_alerts BIGINT,
  confirmed_fraud BIGINT,
  dismissed_alerts BIGINT,
  avg_confidence_score NUMERIC,
  high_risk_users BIGINT,
  duplicate_receipts BIGINT,
  amount_anomalies BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE fa.status = 'pending') as pending_alerts,
    COUNT(*) FILTER (WHERE fa.status = 'confirmed') as confirmed_fraud,
    COUNT(*) FILTER (WHERE fa.status = 'dismissed') as dismissed_alerts,
    AVG(fa.confidence_score) as avg_confidence_score,
    (SELECT COUNT(*) FROM user_fraud_scores WHERE risk_level IN ('high', 'critical')) as high_risk_users,
    COUNT(*) FILTER (WHERE fa.fraud_type = 'duplicate_receipt') as duplicate_receipts,
    COUNT(*) FILTER (WHERE fa.fraud_type = 'amount_manipulation') as amount_anomalies
  FROM fraud_alerts fa;
END;
$$ language 'plpgsql';

-- دالة تنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION cleanup_fraud_detection_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف التنبيهات المرفوضة القديمة (أكثر من 6 شهور)
  DELETE FROM fraud_alerts 
  WHERE status = 'dismissed' 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- حذف بصمات الإيصالات القديمة (أكثر من سنة)
  DELETE FROM receipt_fingerprints 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year'
    AND expense_item_id NOT IN (
      SELECT expense_item_id FROM fraud_alerts WHERE status != 'dismissed'
    );
  
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- ==============================================
-- صلاحيات الأمان (RLS Policies)
-- ==============================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE fraud_detection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fraud_scores ENABLE ROW LEVEL SECURITY;

-- صلاحيات fraud_detection_settings
CREATE POLICY "Only admins can manage fraud detection settings"
  ON fraud_detection_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- صلاحيات receipt_fingerprints
CREATE POLICY "Users can view fingerprints of their own expenses"
  ON receipt_fingerprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expense_items ei
      JOIN expense_requests er ON ei.expense_request_id = er.id
      WHERE ei.id = receipt_fingerprints.expense_item_id
      AND er.employee_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all fingerprints"
  ON receipt_fingerprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- صلاحيات fraud_alerts
CREATE POLICY "Users can view alerts for their own expenses"
  ON fraud_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expense_items ei
      JOIN expense_requests er ON ei.expense_request_id = er.id
      WHERE ei.id = fraud_alerts.expense_item_id
      AND er.employee_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view and update fraud alerts"
  ON fraud_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- صلاحيات fraud_patterns
CREATE POLICY "Only admins can manage fraud patterns"
  ON fraud_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- صلاحيات user_fraud_scores
CREATE POLICY "Users can view their own fraud scores"
  ON user_fraud_scores
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view all fraud scores"
  ON user_fraud_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- ==============================================
-- البيانات الأولية (Initial Data)
-- ==============================================

-- إدراج إعدادات افتراضية لنظام كشف الغش
INSERT INTO fraud_detection_settings (
  enabled, 
  duplicate_threshold, 
  amount_tolerance, 
  time_window_hours, 
  location_radius_km,
  auto_flag_suspicious,
  require_manager_approval
) VALUES (
  true,
  85.0,
  5.0,
  24,
  0.5,
  true,
  true
) ON CONFLICT DO NOTHING;

-- إدراج أنماط الغش الأساسية
INSERT INTO fraud_patterns (pattern_name, pattern_type, pattern_features, risk_score) VALUES
('إيصالات متطابقة', 'duplicate', '{"hash_match": true, "amount_match": true, "time_proximity": 24}', 90),
('مبالغ مضخمة', 'amount_inflation', '{"amount_multiplier": 2, "category_mismatch": true}', 75),
('مواقع مزيفة', 'location_spoofing', '{"distance_anomaly": 100, "impossible_travel": true}', 85),
('تلاعب في التوقيت', 'time_manipulation', '{"retroactive_entry": true, "weekend_anomaly": true}', 70)
ON CONFLICT DO NOTHING;

-- ==============================================
-- تعليقات الجداول والأعمدة
-- ==============================================

COMMENT ON TABLE fraud_detection_settings IS 'إعدادات نظام كشف الغش في الإيصالات';
COMMENT ON TABLE receipt_fingerprints IS 'بصمات الإيصالات المستخدمة للمقارنة والكشف عن المكررات';
COMMENT ON TABLE fraud_alerts IS 'تنبيهات الغش المكتشفة من قبل النظام';
COMMENT ON TABLE fraud_patterns IS 'أنماط الغش المعروفة للتعلم الآلي';
COMMENT ON TABLE user_fraud_scores IS 'درجات مخاطر الغش للمستخدمين';

COMMENT ON COLUMN fraud_detection_settings.duplicate_threshold IS 'نسبة التشابه المطلوبة لاعتبار الإيصال مكرر (0-100)';
COMMENT ON COLUMN fraud_alerts.confidence_score IS 'درجة الثقة في كون الإيصال مشبوه (0-100)';
COMMENT ON COLUMN fraud_alerts.fraud_type IS 'نوع الغش: duplicate_receipt, amount_manipulation, location_mismatch, time_anomaly, pattern_anomaly';
COMMENT ON COLUMN user_fraud_scores.overall_score IS 'الدرجة الإجمالية لمخاطر الغش (0-100)';