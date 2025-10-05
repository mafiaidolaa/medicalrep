-- Migration: 2025-10-05 Upgrade activity_log schema for richer tracking
-- Safe to run multiple times. Adds missing columns and indexes if they do not exist.

-- Add optional columns if missing
DO $$ BEGIN
  -- JSONB change sets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='old_values'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN old_values jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='new_values'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN new_values jsonb;
  END IF;

  -- Device/agent/network
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='ip_address'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN ip_address text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='user_agent'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN user_agent text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='device'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN device text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='browser'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN browser text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='os'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN os text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='referrer'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN referrer text;
  END IF;

  -- Location
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='lat'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN lat double precision;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='lng'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN lng double precision;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='location_name'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN location_name text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='city'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='country'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN country text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='location_accuracy'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN location_accuracy double precision;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='location_provider'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN location_provider text;
  END IF;

  -- Ensure essential reference columns exist (if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='entity_type'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN entity_type text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='entity_id'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN entity_id text;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type      ON public.activity_log (type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user      ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity    ON public.activity_log (entity_type, entity_id);

-- Optional: GIN indexes on JSONB columns (if large volumes)
-- CREATE INDEX IF NOT EXISTS idx_activity_log_old_values_gin ON public.activity_log USING GIN (old_values);
-- CREATE INDEX IF NOT EXISTS idx_activity_log_new_values_gin ON public.activity_log USING GIN (new_values);
