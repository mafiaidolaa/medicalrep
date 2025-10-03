-- =====================================================
-- FINAL MIGRATION: Security & Integrity Features (FIXED)
-- =====================================================
-- النسخة النهائية - مُصححة لتتوافق مع جدول products الجديد
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
-- STEP 2: Check if columns already exist
-- ========================================

-- Check if version column exists, if not add it
DO $$
BEGIN
    -- orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='version') THEN
        ALTER TABLE orders ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- products  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='version') THEN
        ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- clinics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinics' AND column_name='version') THEN
        ALTER TABLE clinics ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- visits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='version') THEN
        ALTER TABLE visits ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- min_stock_level for products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='min_stock_level') THEN
        ALTER TABLE products ADD COLUMN min_stock_level INTEGER DEFAULT 10;
    END IF;
    
    -- stock column for products (if needed for compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock') THEN
        ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;
        -- Add constraint
        ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
    END IF;
END
$$;

-- ========================================
-- STEP 3: Version Increment Function
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
-- STEP 4: Version Triggers
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
-- STEP 5: Advanced Stock Functions (Compatible with new system)
-- ========================================

-- Stock decrement function (works with both old and new stock systems)
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
  -- Try to get stock from the basic stock column first
  SELECT COALESCE(stock, 0), name INTO v_current_stock, v_product_name
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

-- Stock increment function
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
    stock = COALESCE(stock, 0) + p_quantity,
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
-- STEP 6: Enhanced Views (Safe)
-- ========================================

-- Simple product stock status view
CREATE OR REPLACE VIEW product_stock_status AS
SELECT 
    p.id,
    p.name,
    COALESCE(p.stock, 0) as current_stock,
    COALESCE(p.min_stock_level, 10) as min_stock_level,
    CASE 
        WHEN COALESCE(p.stock, 0) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(p.stock, 0) <= COALESCE(p.min_stock_level, 10) THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END as stock_status,
    p.price,
    p.is_active,
    p.created_at,
    p.updated_at
FROM products p
WHERE p.is_active = true;

-- Low stock products view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    p.id,
    p.name,
    COALESCE(p.stock, 0) as current_stock,
    COALESCE(p.min_stock_level, 10) as min_stock_level,
    p.price,
    p.created_at
FROM products p
WHERE p.is_active = true 
  AND COALESCE(p.stock, 0) <= COALESCE(p.min_stock_level, 10);

-- ========================================
-- STEP 7: Audit Log Function (Enhanced)
-- ========================================

CREATE OR REPLACE FUNCTION log_audit(
  p_table_name TEXT,
  p_operation TEXT,
  p_user_id UUID,
  p_record_id UUID,
  p_changes JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- This is a placeholder for audit logging
  -- Can be implemented with an audit_log table later
  RAISE NOTICE 'AUDIT: % % on % by user % with changes: %', 
    p_operation, p_table_name, p_record_id, p_user_id, p_changes;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 8: Data Integrity Functions
-- ========================================

-- Egyptian phone validation
CREATE OR REPLACE FUNCTION is_valid_egyptian_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove spaces and special characters
  phone_number := regexp_replace(phone_number, '[^0-9+]', '', 'g');
  
  -- Check if it matches Egyptian phone patterns
  RETURN phone_number ~ '^(\+2)?01[0-2,5][0-9]{8}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '🎉 FINAL MIGRATION completed successfully! System enhanced with security features.' as result;