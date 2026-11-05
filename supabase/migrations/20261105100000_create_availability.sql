create table if not exists public.app_availability (
  technician text not null,
  work_date date not null,
  choice text not null check (choice in ('Diurno', 'Noturno', 'Ambos', 'Indisponivel')),
  updated_at timestamptz not null default now(),
  primary key (technician, work_date)
);

create index if not exists app_availability_work_date_idx
  on public.app_availability (work_date);

alter table public.app_availability enable row level security;

revoke all on public.app_availability from anon, authenticated;
