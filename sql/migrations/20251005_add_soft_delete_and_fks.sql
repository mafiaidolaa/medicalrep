-- Migration: 2025-10-05 Add soft-delete columns, FKs, and indexes across core tables
-- Safe to run multiple times. Uses IF NOT EXISTS and conditional constraint creation.

-- Helper: add column if not exists
DO $$ BEGIN
  -- clinics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='clinics' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.clinics ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='clinics' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.clinics ADD COLUMN deleted_by uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='clinics' AND column_name='is_active')
  THEN
    ALTER TABLE public.clinics ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='users' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.users ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='users' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.users ADD COLUMN deleted_by uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='users' AND column_name='is_active')
  THEN
    ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='orders' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.orders ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='orders' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.orders ADD COLUMN deleted_by uuid;
  END IF;

  -- visits
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='visits' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.visits ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='visits' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.visits ADD COLUMN deleted_by uuid;
  END IF;

  -- invoices
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='invoices' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.invoices ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='invoices' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.invoices ADD COLUMN deleted_by uuid;
  END IF;

  -- expenses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='expenses' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.expenses ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='expenses' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.expenses ADD COLUMN deleted_by uuid;
  END IF;

  -- products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='products' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.products ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='products' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.products ADD COLUMN deleted_by uuid;
  END IF;

  -- payments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payments' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.payments ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payments' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.payments ADD COLUMN deleted_by uuid;
  END IF;

  -- collections
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='collections' AND column_name='deleted_at')
  THEN
    ALTER TABLE public.collections ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='collections' AND column_name='deleted_by')
  THEN
    ALTER TABLE public.collections ADD COLUMN deleted_by uuid;
  END IF;
END $$;

-- Indexes for deleted_at and is_active
CREATE INDEX IF NOT EXISTS idx_clinics_deleted_at ON public.clinics (deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at   ON public.users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at  ON public.orders (deleted_at);
CREATE INDEX IF NOT EXISTS idx_visits_deleted_at  ON public.visits (deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON public.invoices (deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON public.payments (deleted_at);
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON public.collections (deleted_at);

CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON public.clinics (is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_active   ON public.users (is_active);

-- Add FK constraints for deleted_by -> users(id) if missing
DO $$ BEGIN
  -- Helper function via dynamic SQL avoided; inline checks per table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinics_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.clinics
      ADD CONSTRAINT clinics_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.visits
      ADD CONSTRAINT visits_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collections_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.collections
      ADD CONSTRAINT collections_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
