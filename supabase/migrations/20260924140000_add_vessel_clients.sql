alter table public.app_settings
  add column if not exists vessel_clients jsonb not null default '{}'::jsonb;
