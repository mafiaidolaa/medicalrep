-- Report schedules table for recurring email reports
create table if not exists report_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null check (scope in ('rep','manager')),
  period text not null check (period in ('this_month','last_month','last_3_months','ytd','custom')),
  custom_start timestamptz,
  custom_end timestamptz,
  recipients text[] not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
