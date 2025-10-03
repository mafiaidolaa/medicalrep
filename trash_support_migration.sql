-- Recycle Bin Extras Migration
-- This migration adds helpful indexes for the trash (activity_log) and
-- soft-delete support for payments table.
-- Safe to run multiple times (uses IF NOT EXISTS)

BEGIN;

-- 1) Payments soft-delete columns (optional but recommended if you use payments)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Helpful index to speed up queries that exclude soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON public.payments (deleted_at) WHERE deleted_at IS NOT NULL;

-- 2) Activity Log indexes (for trash listing and counts)
-- We frequently filter by action = 'move_to_trash' and entity_type, and order by timestamp.
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log (action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON public.activity_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_entity_type ON public.activity_log (action, entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type_timestamp ON public.activity_log (entity_type, timestamp DESC);

-- When enriching trash items with user info we select on user_id
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log (user_id);

COMMIT;

-- How to use:
-- 1) Run this file in Supabase SQL Editor (or any Postgres client connected to your DB).
-- 2) No downtime expected; all statements use IF NOT EXISTS.
-- 3) After this, the Trash page (/trash) will have faster counts and listings,
--    and payments soft-delete will be fully supported.
