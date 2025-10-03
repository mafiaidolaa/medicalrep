-- Recycle Bin Migration
-- Adds deleted_at, deleted_by columns and helpful indexes to common tables
-- Safe to run multiple times (uses IF NOT EXISTS)

BEGIN;

-- Clinics
ALTER TABLE public.clinics  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.clinics  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Orders
ALTER TABLE public.orders   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.orders   ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Visits
ALTER TABLE public.visits   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.visits   ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Collections (optional, if you use this as part of accounting section)
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Indexes to speed up queries that exclude deleted rows
CREATE INDEX IF NOT EXISTS idx_clinics_deleted_at      ON public.clinics     (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at       ON public.orders      (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_deleted_at       ON public.visits      (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at     ON public.invoices    (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at     ON public.expenses    (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at  ON public.collections (deleted_at) WHERE deleted_at IS NOT NULL;

COMMIT;

-- How to use:
-- 1) Open Supabase SQL editor (or your Postgres client) and run this file's content.
-- 2) After successful migration, we can re-enable filtering by deleted_at IS NULL
--    in GET endpoints to exclude soft-deleted items from normal lists.
-- 3) The Trash page (/trash) with restore and hard-delete is already set up.
