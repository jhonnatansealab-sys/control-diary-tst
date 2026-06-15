alter table public.app_access_accounts
  alter column username type text using username::text;

create index if not exists app_edit_requests_record_id_idx
  on public.app_edit_requests (record_id);

drop extension if exists citext;
