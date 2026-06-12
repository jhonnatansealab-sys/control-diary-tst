create extension if not exists pgcrypto;

create table public.app_settings (
  id boolean primary key default true check (id),
  technicians jsonb not null default '[]'::jsonb,
  vessels jsonb not null default '[]'::jsonb,
  allow_selfie_deletion boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.app_access_accounts (
  id text primary key,
  role text not null check (role in ('supervisor', 'financeiro', 'admin')),
  name text not null,
  username text not null unique,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_sessions (
  token_hash text primary key,
  role text not null check (role in ('colaborador', 'supervisor', 'financeiro', 'admin')),
  name text not null,
  username text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.app_diary_records (
  id text primary key,
  work_date date not null,
  technician text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index app_diary_records_technician_date_idx
  on public.app_diary_records (technician, work_date desc);

create table public.app_edit_requests (
  id text primary key,
  record_id text not null references public.app_diary_records(id) on delete cascade,
  technician text not null,
  status text not null check (status in ('Pendente', 'Aprovada', 'Rejeitada')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index app_edit_requests_record_id_idx
  on public.app_edit_requests (record_id);

create table public.app_selfies (
  id text primary key,
  technician text not null,
  image_data text not null,
  captured_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
alter table public.app_access_accounts enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_diary_records enable row level security;
alter table public.app_edit_requests enable row level security;
alter table public.app_selfies enable row level security;

revoke all on public.app_settings from anon, authenticated;
revoke all on public.app_access_accounts from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;
revoke all on public.app_diary_records from anon, authenticated;
revoke all on public.app_edit_requests from anon, authenticated;
revoke all on public.app_selfies from anon, authenticated;

create or replace function public.verify_app_password(account_id text, candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_access_accounts
    where id = account_id
      and active
      and password_hash = extensions.crypt(candidate, password_hash)
  );
$$;

create or replace function public.set_app_access_account(
  account_id text,
  account_role text,
  account_name text,
  account_username text,
  account_password text,
  account_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_access_accounts (
    id, role, name, username, password_hash, active
  )
  values (
    account_id,
    account_role,
    account_name,
    account_username,
    extensions.crypt(account_password, extensions.gen_salt('bf')),
    account_active
  )
  on conflict (id) do update
  set role = excluded.role,
      name = excluded.name,
      username = excluded.username,
      password_hash = case
        when account_password = '' then public.app_access_accounts.password_hash
        else excluded.password_hash
      end,
      active = excluded.active,
      updated_at = now();
end;
$$;

revoke all on function public.verify_app_password(text, text) from public, anon, authenticated;
revoke all on function public.set_app_access_account(text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.verify_app_password(text, text) to service_role;
grant execute on function public.set_app_access_account(text, text, text, text, text, boolean) to service_role;

insert into public.app_settings (id, technicians, vessels)
values (
  true,
  '[
    "Arthur Muller",
    "Bruno Lima Cardoso de Oliveira",
    "Caio Guerreiro de Oliveira",
    "Carolina dos Anjos Cunha",
    "Cleyton Henrique Rodrigues Costa",
    "Daniel da Silva Drumond",
    "Ernani Michel Lima Cardoso de Oliveira",
    "Fabiano de Souza Correaia",
    "Fábio de Souza",
    "Felipe de Araújo Paz",
    "Felipi Silmplício de Oliveira",
    "Horlan da Silva Gonçalves",
    "Jairo Marcelo Rodrigues",
    "João Paulo dos Santos Filho",
    "Joyce de Oliveira Leite",
    "Lais Maria de Oliveira",
    "Lamaier Rodrigues Ribeiro",
    "Larissa Cristina de Almeida Rodrigues",
    "Leandro da Silva da Costa",
    "Lucas do Nascimento dos Santos",
    "Marcelo Diniz Quadros",
    "Marcos da Silva Damazio",
    "Marcos Vinicius Nunes Almeida",
    "Marcus Vinicius Nogueira Silva",
    "Mary Ellen Santana",
    "Matheus Alves Tavares",
    "Matheus Loyola Araujo",
    "Matheus Souza Ribeiro",
    "Maurício Cabral",
    "Paulo André Vidal Fernandes",
    "Pedro Schenkel Assunção Natário",
    "Rafael de Paula da Silva",
    "Ricardo Elias Antunes de Araújo",
    "Stephanie Barros Oliveira",
    "Thiago Pacheco Brito",
    "Thiago Vinícius Matos Mesquita",
    "Victor da Silva Souza"
  ]'::jsonb,
  '[
    "HOSS BRASS RING",
    "SIEM PILOT",
    "SKANDI AMAZONAS",
    "SKANDI CARLA",
    "SKANDI COMMANDER",
    "SKANDI PARATY"
  ]'::jsonb
)
on conflict (id) do nothing;

select public.set_app_access_account(
  'access-admin', 'admin', 'Administrador', 'admin', 'Muniz@2026', true
);
select public.set_app_access_account(
  'access-supervisor', 'supervisor', 'Coordenador', 'Coordenador', 'Martins@2026', true
);
select public.set_app_access_account(
  'access-financeiro', 'financeiro', 'Financeiro', 'Financeiro', 'Sea@2026@', true
);
