alter table public.app_settings
  add column if not exists technician_contacts jsonb not null default '{}'::jsonb,
  add column if not exists cbo_supports jsonb not null default '[]'::jsonb;
