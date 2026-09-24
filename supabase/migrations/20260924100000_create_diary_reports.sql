create table if not exists public.app_diary_reports (
  record_id text primary key references public.app_diary_records(id) on delete cascade,
  technician text not null,
  file_name text not null,
  mime_type text not null,
  size integer not null,
  data text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text not null
);

create index if not exists app_diary_reports_technician_idx
  on public.app_diary_reports (technician);

alter table public.app_diary_reports enable row level security;

revoke all on public.app_diary_reports from anon, authenticated;
