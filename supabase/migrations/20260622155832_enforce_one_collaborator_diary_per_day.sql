create or replace function public.insert_collaborator_diary(
  p_id text,
  p_work_date date,
  p_technician text,
  p_payload jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_technician || '|' || p_work_date::text, 0)
  );

  if exists (
    select 1
    from public.app_diary_records
    where technician = p_technician
      and work_date = p_work_date
  ) then
    return false;
  end if;

  insert into public.app_diary_records (
    id,
    work_date,
    technician,
    payload
  )
  values (
    p_id,
    p_work_date,
    p_technician,
    p_payload
  );

  return true;
end;
$$;

revoke all on function public.insert_collaborator_diary(text, date, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.insert_collaborator_diary(text, date, text, jsonb)
  to service_role;
