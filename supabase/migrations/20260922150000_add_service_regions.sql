alter table public.app_settings
  add column if not exists service_regions jsonb not null default '[]'::jsonb;

update public.app_settings
set service_regions = '[
  {"id": "region-macae", "name": "Macaé", "posts": []},
  {"id": "region-campos", "name": "Campos", "posts": []},
  {"id": "region-niteroi", "name": "Niterói", "posts": []},
  {"id": "region-sao-goncalo", "name": "São Gonçalo", "posts": []}
]'::jsonb
where id = true and (service_regions is null or service_regions = '[]'::jsonb);
