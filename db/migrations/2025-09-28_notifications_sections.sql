-- Notifications schema upgrade: add sections, sender fields, tracking timestamps, and helpful indexes
-- Run this against your Supabase/Postgres database before using the new API features.

begin;

-- Core new columns
alter table if exists notifications
  add column if not exists section text,                                    -- e.g. 'managers' | 'accounting' | 'system' | 'approvals' | 'reminders'
  add column if not exists sender_id uuid,                                  -- who sent the notification
  add column if not exists sender_role text,                                -- role of sender (admin/manager/accounting/...)
  add column if not exists audience_type text,                              -- 'user' | 'role' | 'department' | 'all' (optional meta)
  add column if not exists department text,                                 -- optional department tag if you use departments
  add column if not exists clicked boolean default false,
  add column if not exists read_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists delivered_at timestamptz;

-- Helpful indexes
create index if not exists idx_notifications_user_section_created
  on notifications (user_id, section, created_at desc);

create index if not exists idx_notifications_section_priority_created
  on notifications (section, priority, created_at desc);

create index if not exists idx_notifications_user_read_created
  on notifications (user_id, read, created_at desc);

commit;
