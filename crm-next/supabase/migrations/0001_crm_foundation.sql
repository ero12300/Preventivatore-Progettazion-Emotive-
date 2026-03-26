-- CRM EMOTIVE foundation
-- Core entities: user profiles, clients, practices, activity log.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'crm_user_role') then
    create type crm_user_role as enum ('admin', 'progettista', 'commerciale');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_practice_status') then
    create type crm_practice_status as enum (
      'preventivo_inviato',
      'in_attesa_documenti',
      'rilievo_da_prenotare',
      'rilievo_prenotato',
      'in_progettazione',
      'presentazione_da_prenotare',
      'presentazione_prenotata',
      'in_revisione',
      'chiusa_vinta',
      'chiusa_persa'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_trigger_source') then
    create type crm_trigger_source as enum (
      'status_change',
      'admin_flag',
      'event_completion',
      'webhook_external',
      'manual_controlled'
    );
  end if;
end $$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role crm_user_role not null default 'commerciale',
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  company_name text,
  vat_number text,
  city text,
  business_type text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists clients_email_idx on public.clients (email);

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  status crm_practice_status not null default 'preventivo_inviato',
  scheduler_provider text not null default 'calendly',
  quote_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  square_meters integer,
  booking_link_sent_at timestamptz,
  payment_received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists practices_client_idx on public.practices(client_id);
create index if not exists practices_status_idx on public.practices(status);

create table if not exists public.activity_log (
  id bigserial primary key,
  practice_id uuid references public.practices(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  trigger_source crm_trigger_source not null,
  action_key text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists activity_log_practice_created_idx on public.activity_log(practice_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.practices enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "authenticated can read profiles" on public.user_profiles;
create policy "authenticated can read profiles"
  on public.user_profiles
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated can read clients" on public.clients;
create policy "authenticated can read clients"
  on public.clients
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated can write clients" on public.clients;
create policy "authenticated can write clients"
  on public.clients
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can read practices" on public.practices;
create policy "authenticated can read practices"
  on public.practices
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated can write practices" on public.practices;
create policy "authenticated can write practices"
  on public.practices
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can read activity_log" on public.activity_log;
create policy "authenticated can read activity_log"
  on public.activity_log
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated can insert activity_log" on public.activity_log;
create policy "authenticated can insert activity_log"
  on public.activity_log
  for insert
  to authenticated
  with check (true);

