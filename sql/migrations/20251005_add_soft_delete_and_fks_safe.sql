-- SAFE migration: Adds soft-delete columns/indexes/FKs only when tables exist
-- Date: 2025-10-05
-- Run safely on any environment with partial tables. No nested functions.

DO $$
BEGIN
  -- ===== clinics =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinics') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.clinics ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.clinics ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='is_active'
    ) THEN
      ALTER TABLE public.clinics ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relname='idx_clinics_deleted_at' AND n.nspname='public'
    ) THEN
      EXECUTE 'CREATE INDEX idx_clinics_deleted_at ON public.clinics (deleted_at)';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relname='idx_clinics_is_active' AND n.nspname='public'
    ) THEN
      EXECUTE 'CREATE INDEX idx_clinics_is_active ON public.clinics (is_active)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='clinics_deleted_by_fkey') THEN
      ALTER TABLE public.clinics
        ADD CONSTRAINT clinics_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== users =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.users ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.users ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_active'
    ) THEN
      ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relname='idx_users_deleted_at' AND n.nspname='public'
    ) THEN
      EXECUTE 'CREATE INDEX idx_users_deleted_at ON public.users (deleted_at)';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relname='idx_users_is_active' AND n.nspname='public'
    ) THEN
      EXECUTE 'CREATE INDEX idx_users_is_active ON public.users (is_active)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_deleted_by_fkey') THEN
      ALTER TABLE public.users
        ADD CONSTRAINT users_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== orders (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_deleted_by_fkey') THEN
      ALTER TABLE public.orders
        ADD CONSTRAINT orders_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== visits (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visits' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.visits ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visits' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.visits ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='visits_deleted_by_fkey') THEN
      ALTER TABLE public.visits
        ADD CONSTRAINT visits_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== collections (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collections') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.collections ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.collections ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='collections_deleted_by_fkey') THEN
      ALTER TABLE public.collections
        ADD CONSTRAINT collections_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== payments (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='payments_deleted_by_fkey') THEN
      ALTER TABLE public.payments
        ADD CONSTRAINT payments_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== products (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.products ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.products ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_deleted_by_fkey') THEN
      ALTER TABLE public.products
        ADD CONSTRAINT products_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== invoices (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_deleted_by_fkey') THEN
      ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

  -- ===== expenses (optional) =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='deleted_at'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN deleted_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='deleted_by'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN deleted_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='expenses_deleted_by_fkey') THEN
      ALTER TABLE public.expenses
        ADD CONSTRAINT expenses_deleted_by_fkey
        FOREIGN KEY (deleted_by) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
  END IF;

END $$;
