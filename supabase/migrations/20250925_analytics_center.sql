-- إنشاء نظام التحليلات والذكاء الاصطناعي
-- Analytics Center & AI Features Database Schema

-- إنشاء جدول لتصنيفات التحليلات
CREATE TABLE IF NOT EXISTS analytics_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(50) DEFAULT 'bg-blue-500',
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول لمقاييس الأداء (KPIs)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES analytics_categories(id) ON DELETE CASCADE,
    metric_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram', 'rate'
    unit VARCHAR(50), -- 'count', 'percentage', 'currency', 'time', etc.
    target_value NUMERIC,
    warning_threshold NUMERIC,
    critical_threshold NUMERIC,
    calculation_method TEXT, -- SQL query or calculation formula
    update_frequency VARCHAR(50) DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily', 'weekly'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- إنشاء جدول لبيانات المقاييس التاريخية
CREATE TABLE IF NOT EXISTS metrics_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID REFERENCES performance_metrics(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    source VARCHAR(100), -- 'manual', 'api', 'calculation', 'import'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول للتقارير المخصصة
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'dashboard', 'chart', 'table', 'export'
    configuration JSONB NOT NULL, -- Chart config, filters, etc.
    data_source JSONB NOT NULL, -- Metrics, tables, custom queries
    visualization_config JSONB DEFAULT '{}', -- Colors, layout, etc.
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    refresh_interval INTEGER DEFAULT 300, -- seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- إنشاء جدول للتنبؤات بالذكاء الاصطناعي
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_type VARCHAR(100) NOT NULL, -- 'sales_forecast', 'inventory_demand', 'user_churn', etc.
    target_metric VARCHAR(200) NOT NULL,
    prediction_period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    periods_ahead INTEGER NOT NULL, -- How many periods to predict
    algorithm_used VARCHAR(100), -- 'linear_regression', 'arima', 'prophet', etc.
    confidence_score NUMERIC(5,2), -- 0-100
    predicted_values JSONB NOT NULL, -- Array of predicted values with timestamps
    actual_values JSONB DEFAULT '{}', -- Actual values for accuracy tracking
    input_data JSONB, -- Input data used for prediction
    model_parameters JSONB DEFAULT '{}',
    accuracy_score NUMERIC(5,2), -- Calculated accuracy percentage
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed', 'outdated'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- إنشاء جدول للتوصيات الذكية
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_type VARCHAR(100) NOT NULL, -- 'optimize_inventory', 'price_adjustment', 'marketing_action', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority_score INTEGER DEFAULT 50, -- 1-100, higher is more important
    potential_impact JSONB, -- Expected benefits, cost savings, etc.
    action_items JSONB, -- Specific steps to implement
    related_data JSONB DEFAULT '{}', -- Supporting data, charts, etc.
    implementation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'dismissed'
    confidence_level VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high'
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- إنشاء جدول لتتبع دقة التنبؤات
CREATE TABLE IF NOT EXISTS prediction_accuracy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
    predicted_value NUMERIC NOT NULL,
    actual_value NUMERIC NOT NULL,
    accuracy_percentage NUMERIC(5,2),
    error_magnitude NUMERIC,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول لإعدادات التحليلات
CREATE TABLE IF NOT EXISTS analytics_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_group VARCHAR(100) NOT NULL,
    setting_key VARCHAR(200) NOT NULL,
    setting_value JSONB,
    description TEXT,
    is_system BOOLEAN DEFAULT false, -- System settings vs user preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(setting_group, setting_key)
);

-- إدراج التصنيفات الأساسية للتحليلات
INSERT INTO analytics_categories (name, display_name, description, icon, color, sort_order) VALUES
('sales', 'تحليلات المبيعات', 'تحليل بيانات المبيعات والإيرادات والأداء التجاري', 'TrendingUp', 'bg-green-500', 1),
('inventory', 'تحليلات المخزون', 'مراقبة المخزون والتنبؤ بالطلب وتحسين التوزيع', 'Package', 'bg-blue-500', 2),
('customers', 'تحليلات العملاء', 'سلوك العملاء ومعدلات الاحتفاظ والتجزئة', 'Users', 'bg-purple-500', 3),
('financial', 'التحليلات المالية', 'الربحية والتكاليف والتدفق النقدي', 'DollarSign', 'bg-emerald-500', 4),
('operations', 'تحليلات العمليات', 'كفاءة العمليات والإنتاجية والجودة', 'Activity', 'bg-orange-500', 5),
('marketing', 'تحليلات التسويق', 'فعالية الحملات التسويقية ومعدلات التحويل', 'Target', 'bg-pink-500', 6)
ON CONFLICT (name) DO NOTHING;

-- إدراج مقاييس الأداء الأساسية
INSERT INTO performance_metrics (
    category_id, metric_name, display_name, description, metric_type, unit, 
    calculation_method, update_frequency
) VALUES
-- مقاييس المبيعات
((SELECT id FROM analytics_categories WHERE name = 'sales'), 'total_sales', 'إجمالي المبيعات', 'إجمالي قيمة المبيعات في الفترة المحددة', 'counter', 'currency', 
 'SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= $1 AND created_at <= $2', 'hourly'),
 
((SELECT id FROM analytics_categories WHERE name = 'sales'), 'sales_count', 'عدد المبيعات', 'عدد الطلبات المباعة في الفترة المحددة', 'counter', 'count', 
 'SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at <= $2', 'hourly'),

((SELECT id FROM analytics_categories WHERE name = 'sales'), 'avg_order_value', 'متوسط قيمة الطلب', 'متوسط قيمة الطلب الواحد', 'gauge', 'currency', 
 'SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE created_at >= $1 AND created_at <= $2', 'hourly'),

-- مقاييس العملاء
((SELECT id FROM analytics_categories WHERE name = 'customers'), 'total_customers', 'إجمالي العملاء', 'إجمالي عدد العملاء المسجلين', 'counter', 'count', 
 'SELECT COUNT(*) FROM users WHERE role = ''customer''', 'daily'),

((SELECT id FROM analytics_categories WHERE name = 'customers'), 'active_customers', 'العملاء النشطون', 'العملاء الذين تفاعلوا خلال الشهر الماضي', 'gauge', 'count', 
 'SELECT COUNT(DISTINCT user_id) FROM orders WHERE created_at >= NOW() - INTERVAL ''30 days''', 'daily'),

-- مقاييس المخزون
((SELECT id FROM analytics_categories WHERE name = 'inventory'), 'low_stock_items', 'منتجات قليلة المخزون', 'عدد المنتجات التي تحتاج إعادة تخزين', 'gauge', 'count', 
 'SELECT COUNT(*) FROM products WHERE stock_quantity <= minimum_stock_level', 'hourly'),

-- مقاييس العمليات
((SELECT id FROM analytics_categories WHERE name = 'operations'), 'pending_orders', 'الطلبات المعلقة', 'عدد الطلبات في انتظار المعالجة', 'gauge', 'count', 
 'SELECT COUNT(*) FROM orders WHERE status = ''pending''', 'hourly')

ON CONFLICT DO NOTHING;

-- إدراج الإعدادات الافتراضية للتحليلات
INSERT INTO analytics_settings (setting_group, setting_key, setting_value, description, is_system) VALUES
('ai_predictions', 'enable_sales_forecasting', '{"enabled": true, "model": "prophet", "periods": 30}', 'تفعيل التنبؤ بالمبيعات باستخدام AI', true),
('ai_predictions', 'enable_inventory_optimization', '{"enabled": true, "model": "linear_regression", "threshold": 0.8}', 'تفعيل تحسين المخزون الذكي', true),
('ai_recommendations', 'enable_smart_alerts', '{"enabled": true, "frequency": "daily", "min_confidence": 70}', 'تفعيل التنبيهات والتوصيات الذكية', true),
('dashboard', 'default_refresh_interval', '{"interval": 300}', 'معدل تحديث لوحة التحكم بالثواني', false),
('dashboard', 'default_date_range', '{"range": "last_30_days"}', 'النطاق الزمني الافتراضي للتقارير', false),
('reports', 'auto_export_enabled', '{"enabled": false, "format": "pdf", "schedule": "weekly"}', 'التصدير التلقائي للتقارير', false),
('performance', 'cache_duration', '{"duration": 900}', 'مدة تخزين البيانات في الذاكرة المؤقتة (ثانية)', true)
ON CONFLICT (setting_group, setting_key) DO NOTHING;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_metrics_data_metric_time ON metrics_data(metric_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_data_timestamp ON metrics_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_type_status ON ai_predictions(prediction_type, status);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON ai_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON ai_recommendations(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON ai_recommendations(implementation_status);
CREATE INDEX IF NOT EXISTS idx_accuracy_prediction_time ON prediction_accuracy(prediction_id, timestamp DESC);

-- إضافة triggers لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER analytics_categories_updated_at
    BEFORE UPDATE ON analytics_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER performance_metrics_updated_at
    BEFORE UPDATE ON performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER custom_reports_updated_at
    BEFORE UPDATE ON custom_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER ai_predictions_updated_at
    BEFORE UPDATE ON ai_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER ai_recommendations_updated_at
    BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER analytics_settings_updated_at
    BEFORE UPDATE ON analytics_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- دوال SQL للتحليلات المتقدمة

-- دالة لحساب معدل النمو
CREATE OR REPLACE FUNCTION calculate_growth_rate(
    p_metric_id UUID,
    p_period_days INTEGER DEFAULT 30,
    p_compare_period_days INTEGER DEFAULT 30
)
RETURNS NUMERIC AS $$
DECLARE
    current_value NUMERIC;
    previous_value NUMERIC;
    growth_rate NUMERIC;
BEGIN
    -- الحصول على القيمة الحالية
    SELECT AVG(value) INTO current_value
    FROM metrics_data 
    WHERE metric_id = p_metric_id 
      AND timestamp >= NOW() - INTERVAL '1 day' * p_period_days;
    
    -- الحصول على القيمة السابقة
    SELECT AVG(value) INTO previous_value
    FROM metrics_data 
    WHERE metric_id = p_metric_id 
      AND timestamp >= NOW() - INTERVAL '1 day' * (p_period_days + p_compare_period_days)
      AND timestamp < NOW() - INTERVAL '1 day' * p_period_days;
    
    -- حساب معدل النمو
    IF previous_value > 0 THEN
        growth_rate := ((current_value - previous_value) / previous_value) * 100;
    ELSE
        growth_rate := 0;
    END IF;
    
    RETURN COALESCE(growth_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب الاتجاه (Trend)
CREATE OR REPLACE FUNCTION calculate_trend(
    p_metric_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TEXT AS $$
DECLARE
    trend_direction TEXT;
    correlation NUMERIC;
BEGIN
    -- حساب معامل الارتباط البسيط للاتجاه
    WITH trend_data AS (
        SELECT 
            EXTRACT(EPOCH FROM timestamp)::BIGINT as x,
            value as y,
            ROW_NUMBER() OVER (ORDER BY timestamp) as row_num
        FROM metrics_data 
        WHERE metric_id = p_metric_id 
          AND timestamp >= NOW() - INTERVAL '1 day' * p_days
        ORDER BY timestamp
    ),
    stats AS (
        SELECT 
            AVG(x) as avg_x,
            AVG(y) as avg_y,
            COUNT(*) as n
        FROM trend_data
    )
    SELECT 
        CASE 
            WHEN COALESCE(
                SUM((td.x - s.avg_x) * (td.y - s.avg_y)) / 
                NULLIF(SQRT(SUM(POWER(td.x - s.avg_x, 2)) * SUM(POWER(td.y - s.avg_y, 2))), 0),
                0
            ) > 0.1 THEN 'increasing'
            WHEN COALESCE(
                SUM((td.x - s.avg_x) * (td.y - s.avg_y)) / 
                NULLIF(SQRT(SUM(POWER(td.x - s.avg_x, 2)) * SUM(POWER(td.y - s.avg_y, 2))), 0),
                0
            ) < -0.1 THEN 'decreasing'
            ELSE 'stable'
        END
    INTO trend_direction
    FROM trend_data td, stats s;
    
    RETURN COALESCE(trend_direction, 'stable');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتوليد تقرير الأداء الشامل
CREATE OR REPLACE FUNCTION generate_performance_summary(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    category_name TEXT,
    metric_name TEXT,
    current_value NUMERIC,
    growth_rate NUMERIC,
    trend TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.display_name::TEXT as category_name,
        pm.display_name::TEXT as metric_name,
        COALESCE(AVG(md.value), 0) as current_value,
        calculate_growth_rate(pm.id, p_days) as growth_rate,
        calculate_trend(pm.id, LEAST(p_days, 7)) as trend,
        CASE 
            WHEN pm.critical_threshold IS NOT NULL AND AVG(md.value) <= pm.critical_threshold THEN 'critical'
            WHEN pm.warning_threshold IS NOT NULL AND AVG(md.value) <= pm.warning_threshold THEN 'warning'
            ELSE 'normal'
        END::TEXT as status
    FROM performance_metrics pm
    JOIN analytics_categories ac ON pm.category_id = ac.id
    LEFT JOIN metrics_data md ON pm.id = md.metric_id 
        AND md.timestamp >= NOW() - INTERVAL '1 day' * p_days
    WHERE pm.is_active = true AND ac.is_enabled = true
    GROUP BY pm.id, pm.display_name, ac.display_name, pm.critical_threshold, pm.warning_threshold
    ORDER BY ac.sort_order, pm.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات المناسبة
GRANT SELECT ON analytics_categories TO authenticated;
GRANT SELECT ON performance_metrics TO authenticated;
GRANT SELECT ON metrics_data TO authenticated;
GRANT SELECT, INSERT, UPDATE ON custom_reports TO authenticated;
GRANT SELECT ON ai_predictions TO authenticated;
GRANT SELECT ON ai_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_growth_rate TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trend TO authenticated;
GRANT EXECUTE ON FUNCTION generate_performance_summary TO authenticated;

-- تعليقات وثائقية
COMMENT ON TABLE analytics_categories IS 'تصنيفات التحليلات (مبيعات، مخزون، عملاء، إلخ)';
COMMENT ON TABLE performance_metrics IS 'مقاييس الأداء الرئيسية (KPIs)';
COMMENT ON TABLE metrics_data IS 'البيانات التاريخية لجميع المقاييس';
COMMENT ON TABLE ai_predictions IS 'التنبؤات المولدة بواسطة الذكاء الاصطناعي';
COMMENT ON TABLE ai_recommendations IS 'التوصيات الذكية المبنية على تحليل البيانات';
COMMENT ON TABLE custom_reports IS 'التقارير المخصصة والمحفوظة';

COMMENT ON COLUMN ai_predictions.predicted_values IS 'القيم المتنبأ بها مع التواريخ (JSON Array)';
COMMENT ON COLUMN ai_recommendations.potential_impact IS 'التأثير المتوقع للتوصية (JSON)';
COMMENT ON COLUMN custom_reports.configuration IS 'إعدادات التقرير والمرشحات (JSON)';
COMMENT ON COLUMN metrics_data.metadata IS 'معلومات إضافية عن البيانات (JSON)';