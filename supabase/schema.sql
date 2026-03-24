create extension if not exists "pgcrypto";

create table if not exists public.preventivi_progettazione_emotive (
  id bigint generated always as identity primary key,
  app_id text not null unique,
  event_type text not null,
  quote_number text,
  lead_number text,
  status text not null default 'pending',
  first_name text,
  last_name text,
  client_name text,
  email text,
  phone text,
  business_type text,
  business_categories jsonb default '[]'::jsonb,
  location text,
  square_meters text,
  company_name text,
  vat_number text,
  address text,
  project_description text,
  total_price numeric(12,2) default 0,
  deposit_percentage numeric(5,2) default 0,
  deposit_total numeric(12,2) default 0,
  remaining_total numeric(12,2) default 0,
  stripe_url text,
  payment_link_expires_at timestamptz,
  source text default 'preventivatore',
  lead_source text default 'web_form',
  funnel_step text,
  notes text,
  metadata jsonb default '{}'::jsonb,
  timestamp_utc timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_preventivi_proj_email on public.preventivi_progettazione_emotive (email);
create index if not exists idx_preventivi_proj_status on public.preventivi_progettazione_emotive (status);
create index if not exists idx_preventivi_proj_event_type on public.preventivi_progettazione_emotive (event_type);
create index if not exists idx_preventivi_proj_quote_number on public.preventivi_progettazione_emotive (quote_number);
create index if not exists idx_preventivi_proj_lead_number on public.preventivi_progettazione_emotive (lead_number);
create index if not exists idx_preventivi_proj_created_at on public.preventivi_progettazione_emotive (created_at desc);

create or replace function public.set_updated_at_preventivi_progettazione_emotive()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_preventivi_progettazione_emotive on public.preventivi_progettazione_emotive;
create trigger trg_set_updated_at_preventivi_progettazione_emotive
before update on public.preventivi_progettazione_emotive
for each row
execute function public.set_updated_at_preventivi_progettazione_emotive();

alter table public.preventivi_progettazione_emotive enable row level security;

drop policy if exists "service role full access" on public.preventivi_progettazione_emotive;
create policy "service role full access"
on public.preventivi_progettazione_emotive
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
