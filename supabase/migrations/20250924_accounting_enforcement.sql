-- EP Group System - Accounting Enforcement Migration (Step 2 & 3)
-- Date: 2025-09-24
-- Purpose:
--  - Add mandatory relationships (clinics and users) to accounting tables (invoices, payments, receivables)
--  - Prepare for unified logic and deep details per movement
--  - Add multi-currency columns
--  - Add essential constraints and indexes
--  - Add triggers and functions for allocations and balances (prevent overlaps)
--  - Add credit limit enforcement and AR aging view
--  - Enable basic RLS policies (tighten later)

-- =============================
-- 1) Columns and relationships
-- =============================

-- Invoices: link to clinics and sales rep, add currency and FX
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_rep_id ON invoices(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_invoices_remaining_amount ON invoices(remaining_amount);

-- Payments: link to clinics and collector, add currency and FX
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS collector_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_collector_id ON payments(collector_id);

-- Receivables: link to clinics and sales rep
ALTER TABLE receivables
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receivables_clinic_id ON receivables(clinic_id);
CREATE INDEX IF NOT EXISTS idx_receivables_sales_rep_id ON receivables(sales_rep_id);

-- Expand invoice_type to include 'debt' so debts can share invoice shape
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'invoices' AND constraint_name = 'invoices_invoice_type_check'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_invoice_type_check;
  END IF;
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_invoice_type_check
    CHECK (invoice_type IN ('sales', 'purchase', 'return_sales', 'return_purchase', 'debt'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Basic line-level validations on invoice_items
DO $$ BEGIN
  ALTER TABLE invoice_items
    ADD CONSTRAINT invoice_items_qty_positive CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoice_items
    ADD CONSTRAINT invoice_items_unit_price_nonneg CHECK (unit_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment allocations: ensure positive and exactly one target (invoice or receivable)
DO $$ BEGIN
  ALTER TABLE payment_allocations
    ADD CONSTRAINT payment_allocations_amount_positive CHECK (allocated_amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payment_allocations
    ADD CONSTRAINT payment_allocations_target_check 
    CHECK (
      (invoice_id IS NOT NULL AND receivable_id IS NULL) OR 
      (invoice_id IS NULL AND receivable_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================
-- 2) Allocation and totals logic
-- =============================

-- Recalculate invoice payments from allocations (confirmed payments only)
CREATE OR REPLACE FUNCTION recalc_invoice_payments(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_paid NUMERIC(15,2);
BEGIN
  SELECT COALESCE(SUM(pa.allocated_amount), 0)
    INTO v_paid
  FROM payment_allocations pa
  JOIN payments p ON p.id = pa.payment_id
  WHERE pa.invoice_id = p_invoice_id
    AND p.status = 'confirmed';

  UPDATE invoices i
  SET paid_amount = COALESCE(v_paid, 0),
      remaining_amount = GREATEST(i.total_amount - COALESCE(v_paid, 0), 0),
      status = CASE 
        WHEN GREATEST(i.total_amount - COALESCE(v_paid, 0), 0) = 0 THEN 'paid'
        WHEN COALESCE(v_paid, 0) > 0 THEN 'partially_paid'
        ELSE i.status
      END
  WHERE i.id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Recalculate receivable payments from allocations (confirmed payments only)
CREATE OR REPLACE FUNCTION recalc_receivable_payments(p_receivable_id UUID)
RETURNS VOID AS $$
DECLARE
  v_paid NUMERIC(15,2);
  v_original NUMERIC(15,2);
BEGIN
  SELECT COALESCE(SUM(pa.allocated_amount), 0)
    INTO v_paid
  FROM payment_allocations pa
  JOIN payments p ON p.id = pa.payment_id
  WHERE pa.receivable_id = p_receivable_id
    AND p.status = 'confirmed';

  SELECT original_amount INTO v_original FROM receivables WHERE id = p_receivable_id;

  UPDATE receivables r
  SET remaining_amount = GREATEST(COALESCE(v_original, 0) - COALESCE(v_paid, 0), 0),
      status = CASE 
        WHEN GREATEST(COALESCE(v_original, 0) - COALESCE(v_paid, 0), 0) = 0 THEN 'paid'
        WHEN COALESCE(v_paid, 0) > 0 THEN 'partially_paid'
        ELSE r.status
      END
  WHERE r.id = p_receivable_id;
END;
$$ LANGUAGE plpgsql;

-- Prevent over-allocation beyond document capacity
CREATE OR REPLACE FUNCTION enforce_allocation_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_total NUMERIC(15,2);
  v_invoice_alloc NUMERIC(15,2);
  v_receivable_total NUMERIC(15,2);
  v_receivable_alloc NUMERIC(15,2);
BEGIN
  -- Enforce against invoices
  IF COALESCE(NEW.invoice_id, OLD.invoice_id) IS NOT NULL THEN
    SELECT total_amount INTO v_invoice_total FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_invoice_alloc
    FROM payment_allocations
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

    IF (COALESCE(v_invoice_alloc, 0) + COALESCE(NEW.allocated_amount, 0)) > COALESCE(v_invoice_total, 0) THEN
      RAISE EXCEPTION 'Allocation exceeds invoice total: existing=%, new=%, total=%', v_invoice_alloc, NEW.allocated_amount, v_invoice_total;
    END IF;
  END IF;

  -- Enforce against receivables
  IF COALESCE(NEW.receivable_id, OLD.receivable_id) IS NOT NULL THEN
    SELECT original_amount INTO v_receivable_total FROM receivables WHERE id = COALESCE(NEW.receivable_id, OLD.receivable_id);
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_receivable_alloc
    FROM payment_allocations
    WHERE receivable_id = COALESCE(NEW.receivable_id, OLD.receivable_id)
      AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

    IF (COALESCE(v_receivable_alloc, 0) + COALESCE(NEW.allocated_amount, 0)) > COALESCE(v_receivable_total, 0) THEN
      RAISE EXCEPTION 'Allocation exceeds receivable total: existing=%, new=%, total=%', v_receivable_alloc, NEW.allocated_amount, v_receivable_total;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply allocation enforcement BEFORE insert/update
DROP TRIGGER IF EXISTS trg_enforce_allocation_limit_ins ON payment_allocations;
CREATE TRIGGER trg_enforce_allocation_limit_ins
  BEFORE INSERT ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION enforce_allocation_limit();

DROP TRIGGER IF EXISTS trg_enforce_allocation_limit_upd ON payment_allocations;
CREATE TRIGGER trg_enforce_allocation_limit_upd
  BEFORE UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION enforce_allocation_limit();

-- Recalc totals AFTER allocation changes

-- Dispatcher function to call proper recalc targets
CREATE OR REPLACE FUNCTION recalc_allocation_targets()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_receivable_id UUID := COALESCE(NEW.receivable_id, OLD.receivable_id);
BEGIN
  IF v_invoice_id IS NOT NULL THEN
    PERFORM recalc_invoice_payments(v_invoice_id);
  END IF;
  IF v_receivable_id IS NOT NULL THEN
    PERFORM recalc_receivable_payments(v_receivable_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger AFTER function exists
DROP TRIGGER IF EXISTS trg_recalc_payments_aiud ON payment_allocations;
CREATE TRIGGER trg_recalc_payments_aiud
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION recalc_allocation_targets();

-- =============================
-- 3) Credit limit enforcement and clinic balances
-- =============================

-- Update clinic outstanding balance whenever invoices change
CREATE OR REPLACE FUNCTION update_clinic_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.clinics c
    SET outstanding_balance = (
      SELECT COALESCE(SUM(remaining_amount * COALESCE(exchange_rate, 1)), 0)
      FROM invoices
      WHERE clinic_id = c.id AND status NOT IN ('cancelled', 'paid')
    )
    WHERE c.id = OLD.clinic_id;
    RETURN OLD;
  ELSE
    UPDATE public.clinics c
    SET outstanding_balance = (
      SELECT COALESCE(SUM(remaining_amount * COALESCE(exchange_rate, 1)), 0)
      FROM invoices
      WHERE clinic_id = c.id AND status NOT IN ('cancelled', 'paid')
    )
    WHERE c.id = NEW.clinic_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_clinic_outstanding_aiud ON invoices;
CREATE TRIGGER trg_update_clinic_outstanding_aiud
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_clinic_outstanding();

-- Enforce clinic credit limit when moving invoice out of draft
CREATE OR REPLACE FUNCTION enforce_credit_limit_on_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_limit NUMERIC(15,2);
  v_outstanding NUMERIC(15,2);
  v_new NUMERIC(15,2);
BEGIN
  IF NEW.clinic_id IS NULL THEN
    RETURN NEW; -- Clinic must be set later by app before posting
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status IN ('sent', 'partially_paid', 'overdue') THEN
    SELECT credit_limit INTO v_limit FROM public.clinics WHERE id = NEW.clinic_id;

    IF COALESCE(v_limit, 0) > 0 THEN
      SELECT COALESCE(SUM(remaining_amount * COALESCE(exchange_rate, 1)), 0)
        INTO v_outstanding
      FROM invoices
      WHERE clinic_id = NEW.clinic_id
        AND id <> NEW.id
        AND status NOT IN ('cancelled', 'paid');

      v_new := GREATEST((NEW.total_amount - NEW.paid_amount) * COALESCE(NEW.exchange_rate, 1), 0);

      IF (v_outstanding + v_new) > v_limit THEN
        RAISE EXCEPTION 'Credit limit exceeded for clinic % (limit=%, outstanding=%, new=%)', NEW.clinic_id, v_limit, v_outstanding, v_new;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_credit_limit_on_invoice_status ON invoices;
CREATE TRIGGER trg_enforce_credit_limit_on_invoice_status
  BEFORE UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION enforce_credit_limit_on_invoice_status();

-- =============================
-- 4) Aging view
-- =============================

CREATE OR REPLACE VIEW ar_aging AS
SELECT 
  i.clinic_id,
  c.name AS clinic_name,
  SUM(CASE WHEN CURRENT_DATE - i.due_date <= 0 THEN i.remaining_amount ELSE 0 END) AS current_bucket,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN i.remaining_amount ELSE 0 END) AS bucket_1_30,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.remaining_amount ELSE 0 END) AS bucket_31_60,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.remaining_amount ELSE 0 END) AS bucket_61_90,
  SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.remaining_amount ELSE 0 END) AS bucket_90_plus,
  SUM(i.remaining_amount) AS total_remaining
FROM invoices i
JOIN public.clinics c ON c.id = i.clinic_id
WHERE i.remaining_amount > 0 AND i.status <> 'cancelled'
GROUP BY i.clinic_id, c.name;

-- =============================
-- 5) Basic RLS policies (to refine later)
-- =============================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (service role bypasses RLS)
DO $$ BEGIN
  CREATE POLICY "auth users all - invoices" ON invoices FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth users all - invoice_items" ON invoice_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth users all - payments" ON payments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth users all - payment_allocations" ON payment_allocations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth users all - receivables" ON receivables FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notes:
-- - Columns added as NULLable for safe rollout; after data backfill (step 6), switch to NOT NULL
-- - Allocation enforcement uses totals; you may adjust to use remaining_amount if you want header discounts considered
-- - Credit limit check runs when invoice status transitions to a posted/active state
-- - Aging view uses remaining_amount in document currency without FX normalization; adapt if you want base currency
