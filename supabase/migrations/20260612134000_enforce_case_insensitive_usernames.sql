create unique index if not exists app_access_accounts_username_lower_idx
  on public.app_access_accounts (lower(username));
