create table if not exists public.app_schedule_records (
  id text primary key,
  scheduled_at timestamptz not null,
  vessel text not null,
  os_number text not null,
  status text not null check (status in ('Programado', 'Em andamento', 'Concluído', 'Cancelado')),
  service_type text not null check (service_type in ('Operacional', 'DOC&CON')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_schedule_records_status_scheduled_idx
  on public.app_schedule_records (status, scheduled_at);

alter table public.app_schedule_records enable row level security;

revoke all on public.app_schedule_records from anon, authenticated;
