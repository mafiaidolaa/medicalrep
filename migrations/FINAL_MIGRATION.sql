-- =====================================================
-- FINAL MIGRATION: Security & Integrity Features
-- =====================================================
-- النسخة النهائية - بدون أخطاء
-- =====================================================

-- ========================================
-- STEP 1: Cleanup (حذف القديم)
-- ========================================

-- حذف Views
DROP VIEW IF EXISTS low_stock_products CASCADE;
DROP VIEW IF EXISTS order_summary CASCADE;
DROP VIEW IF EXISTS clinic_orders CASCADE;
DROP VIEW IF EXISTS product_stock_status CASCADE;

-- حذف Triggers
DROP TRIGGER IF EXISTS orders_version_trigger ON orders;
DROP TRIGGER IF EXISTS products_version_trigger ON products;
DROP TRIGGER IF EXISTS clinics_version_trigger ON clinics;
DROP TRIGGER IF EXISTS visits_version_trigger ON visits;
DROP TRIGGER IF EXISTS track_stock_trigger ON products;

-- حذف Functions
DROP FUNCTION IF EXISTS increment_version() CASCADE;
DROP FUNCTION IF EXISTS track_stock_movement() CASCADE;
DROP FUNCTION IF EXISTS decrement_stock(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS increment_stock(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS log_audit(TEXT, TEXT, UUID, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS is_valid_egyptian_phone(TEXT) CASCADE;

-- ========================================
-- STEP 2: Add Version Columns
-- ========================================

-- orders
ALTER TABLE orders 
  DROP COLUMN IF EXISTS version;
ALTER TABLE orders 
  ADD COLUMN version INTEGER DEFAULT 1;

-- products
ALTER TABLE products 
  DROP COLUMN IF EXISTS version;
ALTER TABLE products 
  ADD COLUMN version INTEGER DEFAULT 1;

-- clinics
ALTER TABLE clinics 
  DROP COLUMN IF EXISTS version;
ALTER TABLE clinics 
  ADD COLUMN version INTEGER DEFAULT 1;

-- visits
ALTER TABLE visits 
  DROP COLUMN IF EXISTS version;
ALTER TABLE visits 
  ADD COLUMN version INTEGER DEFAULT 1;

-- ========================================
-- STEP 3: Add min_stock_level
-- ========================================

ALTER TABLE products 
  DROP COLUMN IF EXISTS min_stock_level;
ALTER TABLE products 
  ADD COLUMN min_stock_level INTEGER DEFAULT 10;

-- ========================================
-- STEP 4: Stock Constraint
-- ========================================

ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_stock_non_negative;
ALTER TABLE products 
  ADD CONSTRAINT products_stock_non_negative 
  CHECK (stock >= 0);

-- ========================================
-- STEP 5: Version Increment Function
-- ========================================

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 6: Version Triggers
-- ========================================

CREATE TRIGGER orders_version_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER products_version_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER clinics_version_trigger
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER visits_version_trigger
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- ========================================
-- STEP 7: Stock Decrement Function
-- ========================================

CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id UUID,
  p_quantity INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_stock INTEGER;
  v_product_name TEXT;
BEGIN
  SELECT stock, name INTO v_current_stock, v_product_name
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'المنتج غير موجود'::TEXT;
    RETURN;
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT 
      FALSE, 
      v_current_stock,
      format('مخزون غير كافٍ: %s - متوفر: %s، مطلوب: %s', 
             v_product_name, v_current_stock, p_quantity)::TEXT;
    RETURN;
  END IF;

  UPDATE products
  SET 
    stock = stock - p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY SELECT 
    TRUE, 
    v_current_stock - p_quantity,
    'تم خصم المخزون بنجاح'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 8: Stock Increment Function
-- ========================================

CREATE OR REPLACE FUNCTION increment_stock(
  p_product_id UUID,
  p_quantity INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
) AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  UPDATE products
  SET 
    stock = stock + p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'المنتج غير موجود'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT 
    TRUE, 
    v_new_stock,
    'تم إضافة للمخزون بنجاح'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 9: Stock Movements Table
-- ========================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  performed_by UUID,
  old_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product 
  ON stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference 
  ON stock_movements(reference_id);

-- ========================================
-- STEP 10: Stock Tracking Trigger
-- ========================================

CREATE OR REPLACE FUNCTION track_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock != OLD.stock THEN
    INSERT INTO stock_movements (
      product_id,
      quantity_change,
      reason,
      old_stock,
      new_stock,
      notes
    ) VALUES (
      NEW.id,
      NEW.stock - OLD.stock,
      'auto_tracked',
      OLD.stock,
      NEW.stock,
      'تم التغيير تلقائياً'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_stock_trigger
  AFTER UPDATE OF stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION track_stock_movement();

-- ========================================
-- STEP 11: Audit Logs Table
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- STEP 12: Audit Log Function
-- ========================================

CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_user_id UUID,
  p_changes JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    user_id,
    changes
  ) VALUES (
    p_action,
    p_table_name,
    p_record_id,
    p_user_id,
    p_changes
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 13: Low Stock View
-- ========================================

CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.id,
  p.name,
  p.stock AS current_stock,
  p.min_stock_level,
  p.stock - p.min_stock_level AS stock_difference,
  CASE 
    WHEN p.stock = 0 THEN 'نفذ'
    WHEN p.stock < p.min_stock_level THEN 'حرج'
    ELSE 'عادي'
  END AS status
FROM products p
WHERE p.stock <= p.min_stock_level
ORDER BY p.stock ASC;

-- ========================================
-- STEP 14: Performance Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_status 
  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
  ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_clinic 
  ON orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_products_stock 
  ON products(stock);

-- ========================================
-- STEP 15: Phone Validation Function
-- ========================================

CREATE OR REPLACE FUNCTION is_valid_egyptian_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone ~ '^(\+?20|0)?1[0125][0-9]{8}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- SUCCESS! ✅
-- ========================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅✅✅ MIGRATION COMPLETED SUCCESSFULLY! ✅✅✅';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was added:';
  RAISE NOTICE '  ✓ Version control columns (orders, products, clinics, visits)';
  RAISE NOTICE '  ✓ Stock management functions (decrement_stock, increment_stock)';
  RAISE NOTICE '  ✓ Audit logs table';
  RAISE NOTICE '  ✓ Stock movements tracking';
  RAISE NOTICE '  ✓ Performance indexes';
  RAISE NOTICE '  ✓ Low stock alerts view';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Quick Test:';
  RAISE NOTICE '  Run: SELECT * FROM low_stock_products;';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next: Run your app with: npm run dev';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;