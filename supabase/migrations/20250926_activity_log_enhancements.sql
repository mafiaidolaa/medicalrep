-- Activity Log Enhancements Migration
-- Date: 2025-09-26
-- Adds location/device/security fields, indexes, and hash-chain trigger to public.activity_log

BEGIN;

-- Add new columns if not exist
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS external_ip inet,
  ADD COLUMN IF NOT EXISTS internal_ip text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS accuracy_m integer,
  ADD COLUMN IF NOT EXISTS geohash text,
  ADD COLUMN IF NOT EXISTS s2_cell_id text,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS device_alias text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS entry_hash text,
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS ingest_source text;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_ts ON public.activity_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log (action);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.activity_log (type);
CREATE INDEX IF NOT EXISTS idx_activity_log_geohash ON public.activity_log (geohash);
CREATE INDEX IF NOT EXISTS idx_activity_log_s2 ON public.activity_log (s2_cell_id);

-- Hash chain trigger to provide tamper-evidence
-- Requires pgcrypto for digest(); enable if not enabled
DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.activity_log_hash_chain()
RETURNS trigger AS $$
DECLARE
  last_hash text;
BEGIN
  -- Fetch last entry hash (by created_at desc, fallback to timestamp)
  SELECT entry_hash INTO last_hash
  FROM public.activity_log
  WHERE id <> NEW.id
  ORDER BY COALESCE(created_at, timestamp) DESC NULLS LAST, id DESC
  LIMIT 1;

  NEW.prev_hash := last_hash;

  -- Build a canonical string of important fields
  NEW.entry_hash := encode(digest(
    coalesce(NEW.id::text,'') || '|' ||
    coalesce(NEW.user_id,'') || '|' ||
    coalesce(NEW.action,'') || '|' ||
    coalesce(NEW.entity_type,'') || '|' ||
    coalesce(NEW.entity_id,'') || '|' ||
    coalesce(NEW.type,'') || '|' ||
    coalesce(NEW.timestamp::text,'') || '|' ||
    coalesce(NEW.is_success::text,'') || '|' ||
    coalesce(NEW.failure_reason,'') || '|' ||
    coalesce(NEW.ip_address::text,'') || '|' ||
    coalesce(NEW.real_ip::text,'') || '|' ||
    coalesce(NEW.external_ip::text,'') || '|' ||
    coalesce(NEW.internal_ip,'') || '|' ||
    coalesce(NEW.lat::text,'') || '|' ||
    coalesce(NEW.lng::text,'') || '|' ||
    coalesce(NEW.geohash,'') || '|' ||
    coalesce(NEW.s2_cell_id,'') || '|' ||
    coalesce(NEW.user_agent,'') || '|' ||
    coalesce(NEW.device,'') || '|' ||
    coalesce(NEW.device_id,'') || '|' ||
    coalesce(NEW.device_alias,'') || '|' ||
    coalesce(NEW.device_model,'') || '|' ||
    coalesce(NEW.browser,'') || '|' ||
    coalesce(NEW.browser_version,'') || '|' ||
    coalesce(NEW.os,'') || '|' ||
    coalesce(NEW.provider,'') || '|' ||
    coalesce(NEW.ingest_source,'') || '|' ||
    coalesce(NEW.referrer,'') || '|' ||
    coalesce(NEW.prev_hash,'')
  , 'sha256'), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activity_log_hash_chain ON public.activity_log;
CREATE TRIGGER trg_activity_log_hash_chain
BEFORE INSERT ON public.activity_log
FOR EACH ROW EXECUTE FUNCTION public.activity_log_hash_chain();

COMMIT;
