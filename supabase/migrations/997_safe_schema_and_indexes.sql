-- Safe, idempotent migration for aligning schema and adding performance indexes
-- Run in Supabase SQL editor. Can be re-run safely.

SET search_path = public;

-- 1) Ensure required columns on expenses (used by codebase)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Add FKs if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'expenses_created_by_fkey'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'expenses_approved_by_fkey'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES public.users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Create performance indexes only if target columns exist
-- USERS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='username') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='full_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_full_name ON public.users (full_name)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at)';
  END IF;
END $$;

-- CLINICS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clinics_name ON public.clinics (name)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='area') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clinics_area ON public.clinics (area)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='line') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clinics_line ON public.clinics (line)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinics' AND column_name='registered_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clinics_registered_at ON public.clinics (registered_at)';
  END IF;
END $$;

-- PRODUCTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='line') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_line ON public.products (line)';
  END IF;
END $$;

-- ORDERS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='clinic_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_clinic_id ON public.orders (clinic_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='representative_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_representative_id ON public.orders (representative_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status)';
  END IF;
END $$;

-- VISITS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visits' AND column_name='visit_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON public.visits (visit_date)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visits' AND column_name='clinic_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_clinic_id ON public.visits (clinic_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visits' AND column_name='representative_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_representative_id ON public.visits (representative_id)';
  END IF;
END $$;

-- COLLECTIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections (created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='clinic_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_collections_clinic_id ON public.collections (clinic_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='representative_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_collections_representative_id ON public.collections (representative_id)';
  END IF;
END $$;

-- EXPENSES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses (created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='created_by') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses (created_by)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='approved_by') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses (approved_by)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses (status)';
  END IF;
END $$;

-- ACTIVITY LOG
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='timestamp') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log (timestamp)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log (user_id)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='entity_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='entity_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log (entity_type, entity_id)';
  END IF;
END $$;

-- NOTIFICATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='read') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read)';
  END IF;
END $$;

-- PLAN TASKS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_tasks' AND column_name='assigned_to') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_plan_tasks_assigned_to ON public.plan_tasks (assigned_to)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_tasks' AND column_name='due_date') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_plan_tasks_due_date ON public.plan_tasks (due_date)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_tasks' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_plan_tasks_status ON public.plan_tasks (status)';
  END IF;
END $$;
