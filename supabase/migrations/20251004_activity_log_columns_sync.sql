-- Sync activity_log structure with server/API expectations
-- Date: 2025-10-04
-- This migration captures manual changes applied in production so local/dev stay in sync

BEGIN;

ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS "timestamp" timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Helpful indexes used by API queries
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log("timestamp");
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);

COMMIT;
