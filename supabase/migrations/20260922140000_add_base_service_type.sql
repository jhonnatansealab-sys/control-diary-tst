alter table public.app_schedule_records
  drop constraint app_schedule_records_service_type_check;

alter table public.app_schedule_records
  add constraint app_schedule_records_service_type_check
  check (service_type in ('Operacional', 'DOC&CON', 'Base'));
