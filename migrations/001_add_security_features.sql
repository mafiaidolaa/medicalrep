-- =====================================================
-- Migration: Add Security & Integrity Features
-- =====================================================
-- Date: 2024
-- Description: إضافة الحماية والتحسينات الأمنية للنظام
-- =====================================================

-- ========================================
-- PART 0: Drop Existing Views (إذا موجودة)
-- ========================================
-- يجب حذف الـ Views قبل تعديل الأعمدة

DROP VIEW IF EXISTS low_stock_products CASCADE;
DROP VIEW IF EXISTS order_summary CASCADE;
DROP VIEW IF EXISTS clinic_orders CASCADE;
DROP VIEW IF EXISTS product_stock_status CASCADE;

-- ========================================
-- PART 1: Add Version Control (للحماية من Race Conditions)
-- ========================================

-- إضافة عمود version للجداول المهمة
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- إضافة trigger لتحديث version تلقائياً
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ trigger بالجداول
DROP TRIGGER IF EXISTS orders_version_trigger ON orders;
CREATE TRIGGER orders_version_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS products_version_trigger ON products;
CREATE TRIGGER products_version_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS clinics_version_trigger ON clinics;
CREATE TRIGGER clinics_version_trigger
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS visits_version_trigger ON visits;
CREATE TRIGGER visits_version_trigger
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- ========================================
-- PART 2: Add Stock Management Features
-- ========================================

-- إضافة min_stock_level للتحذيرات
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;

-- التأكد من وجود constraints صحيحة
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_stock_non_negative;
  
ALTER TABLE products 
  ADD CONSTRAINT products_stock_non_negative 
  CHECK (stock >= 0);

-- ========================================
-- PART 3: Safe Stock Decrement Function
-- ========================================

-- دالة آمنة لخصم المخزون (atomic operation)
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
  -- قفل الصف للقراءة والتعديل (منع race conditions)
  SELECT stock, name INTO v_current_stock, v_product_name
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;  -- 🔒 Lock حتى نهاية الـ transaction

  -- التحقق من وجود المنتج
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      0, 
      'المنتج غير موجود';
    RETURN;
  END IF;

  -- التحقق من كفاية المخزون
  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT 
      FALSE, 
      v_current_stock,
      format('مخزون غير كافٍ: %s - متوفر: %s، مطلوب: %s', 
             v_product_name, v_current_stock, p_quantity);
    RETURN;
  END IF;

  -- خصم المخزون
  UPDATE products
  SET 
    stock = stock - p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- إرجاع النتيجة
  RETURN QUERY SELECT 
    TRUE, 
    v_current_stock - p_quantity,
    'تم خصم المخزون بنجاح';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 4: Safe Stock Increment Function
-- ========================================

-- دالة آمنة لإضافة للمخزون (عند الإرجاع أو الإضافة)
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
  -- تحديث المخزون
  UPDATE products
  SET 
    stock = stock + p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  -- التحقق من النجاح
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      0, 
      'المنتج غير موجود';
    RETURN;
  END IF;

  -- إرجاع النتيجة
  RETURN QUERY SELECT 
    TRUE, 
    v_new_stock,
    'تم إضافة للمخزون بنجاح';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 5: Stock History Tracking
-- ========================================

-- جدول لتتبع حركة المخزون (audit trail)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL, -- سالب للخصم، موجب للإضافة
  reason TEXT NOT NULL, -- 'order', 'return', 'adjustment', 'initial'
  reference_id UUID, -- order_id أو visit_id
  performed_by UUID REFERENCES users(id),
  old_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_stock_movements_product 
  ON stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference 
  ON stock_movements(reference_id);

-- Trigger لتسجيل كل تغيير في المخزون تلقائياً
CREATE OR REPLACE FUNCTION track_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- تسجيل فقط لو المخزون اتغير
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

DROP TRIGGER IF EXISTS track_stock_trigger ON products;
CREATE TRIGGER track_stock_trigger
  AFTER UPDATE OF stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION track_stock_movement();

-- ========================================
-- PART 6: Low Stock Alert View
-- ========================================

-- View للمنتجات اللي قربت تخلص
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
-- PART 7: Performance Indexes
-- ========================================

-- Indexes للأداء العالي
CREATE INDEX IF NOT EXISTS idx_orders_status 
  ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
  ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_clinic 
  ON orders(clinic_id);

CREATE INDEX IF NOT EXISTS idx_products_stock 
  ON products(stock);

CREATE INDEX IF NOT EXISTS idx_products_category 
  ON products(category_id);

-- ========================================
-- PART 8: Data Validation Functions
-- ========================================

-- دالة للتحقق من صلاحية رقم الهاتف المصري
CREATE OR REPLACE FUNCTION is_valid_egyptian_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- يقبل: 01xxxxxxxxx أو +201xxxxxxxxx أو 00201xxxxxxxxx
  RETURN phone ~ '^(\+?20|0)?1[0125][0-9]{8}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- إضافة constraint للأرقام
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_valid_phone;

-- يمكن تفعيله لاحقاً إذا أردت
-- ALTER TABLE orders 
--   ADD CONSTRAINT orders_valid_phone 
--   CHECK (customer_phone IS NULL OR is_valid_egyptian_phone(customer_phone));

-- ========================================
-- PART 9: Audit Log Table
-- ========================================

-- جدول لتسجيل كل العمليات المهمة
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  changes JSONB, -- البيانات القديمة والجديدة
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_audit_logs_table 
  ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
  ON audit_logs(created_at DESC);

-- ========================================
-- PART 10: Helper Function للـ Audit
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
-- DONE! ✅
-- ========================================

-- رسالة نجاح
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Added: version control, stock management, audit logs';
  RAISE NOTICE '🔒 Added: safe stock operations with locking';
  RAISE NOTICE '📈 Added: performance indexes';
END $$;