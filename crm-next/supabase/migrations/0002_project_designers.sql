-- Elenco progettisti interni CRM EMOTIVE

create table if not exists public.project_designers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.project_designers enable row level security;

drop policy if exists "authenticated can read project_designers" on public.project_designers;
create policy "authenticated can read project_designers"
  on public.project_designers
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated can write project_designers" on public.project_designers;
create policy "authenticated can write project_designers"
  on public.project_designers
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.project_designers (full_name, email, is_active)
values
  ('Tommaso Fiorino', 'fiorino-tommaso@virgilio.it', true),
  ('Eros Boncordo', 'boncordoarredi89@gmail.com', true)
on conflict (email) do update
set
  full_name = excluded.full_name,
  is_active = excluded.is_active,
  updated_at = timezone('utc'::text, now());
