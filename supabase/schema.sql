create extension if not exists "pgcrypto";

create type public.user_role as enum ('colaborador', 'supervisor', 'financeiro', 'admin');
create type public.shift_type as enum ('Diurno', 'Noturno');
create type public.activity_type as enum ('Area', 'ADM');
create type public.request_status as enum ('Pendente', 'Aprovada', 'Rejeitada');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'colaborador',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.vessels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.diary_records (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  technician_id uuid not null references public.profiles(id),
  notes text not null default '',
  double_shift boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.diary_turns (
  id uuid primary key default gen_random_uuid(),
  diary_record_id uuid not null references public.diary_records(id) on delete cascade,
  shift public.shift_type not null,
  activity public.activity_type not null,
  unique (diary_record_id, shift)
);

create table public.diary_turn_vessels (
  diary_turn_id uuid not null references public.diary_turns(id) on delete cascade,
  vessel_id uuid not null references public.vessels(id),
  primary key (diary_turn_id, vessel_id)
);

create table public.edit_requests (
  id uuid primary key default gen_random_uuid(),
  diary_record_id uuid not null references public.diary_records(id),
  requested_by uuid not null references public.profiles(id),
  reason text not null,
  original_record jsonb not null,
  proposed_record jsonb not null,
  status public.request_status not null default 'Pendente',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.system_settings (
  id boolean primary key default true check (id),
  allow_selfie_deletion boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.access_selfies (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id),
  storage_path text not null unique,
  captured_at timestamptz not null default now(),
  linked_record_id uuid references public.diary_records(id)
);

create unique index one_record_per_technician_date
  on public.diary_records (technician_id, work_date);

alter table public.profiles enable row level security;
alter table public.vessels enable row level security;
alter table public.diary_records enable row level security;
alter table public.diary_turns enable row level security;
alter table public.diary_turn_vessels enable row level security;
alter table public.edit_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.access_selfies enable row level security;
alter table public.system_settings enable row level security;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "authenticated users read active vessels"
  on public.vessels for select
  to authenticated
  using (active = true or public.current_user_role() = 'admin');

create policy "users read own profile and managers read all"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() in ('supervisor', 'financeiro', 'admin')
  );

create policy "users read own records and managers read all"
  on public.diary_records for select
  to authenticated
  using (
    technician_id = auth.uid()
    or public.current_user_role() in ('supervisor', 'financeiro', 'admin')
  );

create policy "users create own records and managers create any"
  on public.diary_records for insert
  to authenticated
  with check (
    (technician_id = auth.uid() and created_by = auth.uid())
    or public.current_user_role() in ('supervisor', 'admin')
  );

create policy "turns follow record visibility"
  on public.diary_turns for select
  to authenticated
  using (
    exists (
      select 1 from public.diary_records record
      where record.id = diary_record_id
        and (
          record.technician_id = auth.uid()
          or public.current_user_role() in ('supervisor', 'financeiro', 'admin')
        )
    )
  );

create policy "users create turns for allowed records"
  on public.diary_turns for insert
  to authenticated
  with check (
    exists (
      select 1 from public.diary_records record
      where record.id = diary_record_id
        and (
          record.technician_id = auth.uid()
          or public.current_user_role() in ('supervisor', 'admin')
        )
    )
  );

create policy "turn vessels follow record visibility"
  on public.diary_turn_vessels for select
  to authenticated
  using (
    exists (
      select 1
      from public.diary_turns turn_entry
      join public.diary_records record on record.id = turn_entry.diary_record_id
      where turn_entry.id = diary_turn_id
        and (
          record.technician_id = auth.uid()
          or public.current_user_role() in ('supervisor', 'financeiro', 'admin')
        )
    )
  );

create policy "users link vessels to allowed turns"
  on public.diary_turn_vessels for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.diary_turns turn_entry
      join public.diary_records record on record.id = turn_entry.diary_record_id
      where turn_entry.id = diary_turn_id
        and (
          record.technician_id = auth.uid()
          or public.current_user_role() in ('supervisor', 'admin')
        )
    )
  );

create policy "users create edit requests for own records"
  on public.edit_requests for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.diary_records record
      where record.id = diary_record_id
        and record.technician_id = auth.uid()
    )
  );

create policy "users read own requests and managers read all"
  on public.edit_requests for select
  to authenticated
  using (
    requested_by = auth.uid()
    or public.current_user_role() in ('supervisor', 'admin')
  );

create policy "managers review edit requests"
  on public.edit_requests for update
  to authenticated
  using (public.current_user_role() in ('supervisor', 'admin'))
  with check (public.current_user_role() in ('supervisor', 'admin'));

create policy "collaborators register own selfie metadata"
  on public.access_selfies for insert
  to authenticated
  with check (technician_id = auth.uid());

create policy "only admins read selfie metadata"
  on public.access_selfies for select
  to authenticated
  using (public.current_user_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('access-selfies', 'access-selfies', false)
on conflict (id) do nothing;

create policy "collaborators upload own access selfies"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'access-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "only admins view access selfies"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'access-selfies'
    and public.current_user_role() = 'admin'
  );

create policy "authenticated users read system settings"
  on public.system_settings for select
  to authenticated
  using (true);

create policy "only admins update system settings"
  on public.system_settings for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

insert into public.system_settings (id) values (true)
on conflict (id) do nothing;

insert into public.vessels (name) values
  ('HOSS BRASS RING'),
  ('SIEM PILOT'),
  ('SKANDI AMAZONAS'),
  ('SKANDI CARLA'),
  ('SKANDI COMMANDER'),
  ('SKANDI PARATY')
on conflict (name) do nothing;
