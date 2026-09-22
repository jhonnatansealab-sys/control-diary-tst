create table if not exists public.app_reimbursement_requests (
  id text primary key,
  technician text not null,
  total numeric(12, 2) not null default 0,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_reimbursement_requests_technician_idx
  on public.app_reimbursement_requests (technician, created_at desc);

alter table public.app_reimbursement_requests enable row level security;

revoke all on public.app_reimbursement_requests from anon, authenticated;
