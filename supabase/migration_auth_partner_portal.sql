-- Auth + partner portal schema for Supabase.
-- Run this in Supabase SQL Editor after dynamic pricing migration.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'partner')),
  partner_id uuid null,
  full_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  email text null,
  commission_percent numeric(5,2) not null default 7.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  referral_code text not null,
  lead_email text null,
  quote_number text null,
  preventivo_app_id text null,
  status text not null default 'click' check (status in ('click', 'lead', 'quote', 'paid', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  referral_id uuid null references public.partner_referrals(id) on delete set null,
  amount_eur numeric(10,2) not null check (amount_eur >= 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  payout_reference text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partner_referrals_partner on public.partner_referrals(partner_id, created_at desc);
create index if not exists idx_partner_commissions_partner on public.partner_commissions(partner_id, created_at desc);
create unique index if not exists uq_partner_referrals_preventivo_app_id
  on public.partner_referrals(preventivo_app_id)
  where preventivo_app_id is not null;
create unique index if not exists uq_partner_commissions_referral_id
  on public.partner_commissions(referral_id)
  where referral_id is not null;

create or replace function public.touch_updated_at_auth_tables()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_touch on public.user_profiles;
create trigger trg_user_profiles_touch before update on public.user_profiles
for each row execute procedure public.touch_updated_at_auth_tables();

drop trigger if exists trg_partners_touch on public.partners;
create trigger trg_partners_touch before update on public.partners
for each row execute procedure public.touch_updated_at_auth_tables();

drop trigger if exists trg_partner_referrals_touch on public.partner_referrals;
create trigger trg_partner_referrals_touch before update on public.partner_referrals
for each row execute procedure public.touch_updated_at_auth_tables();

drop trigger if exists trg_partner_commissions_touch on public.partner_commissions;
create trigger trg_partner_commissions_touch before update on public.partner_commissions
for each row execute procedure public.touch_updated_at_auth_tables();

alter table public.user_profiles enable row level security;
alter table public.partners enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_commissions enable row level security;

-- Admin full access policies.
drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all on public.user_profiles
for all using (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
) with check (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
);

drop policy if exists partners_admin_all on public.partners;
create policy partners_admin_all on public.partners
for all using (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
) with check (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
);

drop policy if exists partner_referrals_admin_all on public.partner_referrals;
create policy partner_referrals_admin_all on public.partner_referrals
for all using (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
) with check (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
);

drop policy if exists partner_commissions_admin_all on public.partner_commissions;
create policy partner_commissions_admin_all on public.partner_commissions
for all using (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
) with check (
  exists (
    select 1 from public.user_profiles me
    where me.user_id = auth.uid() and me.role = 'admin'
  )
);

-- Partner readonly policies on own data.
drop policy if exists partner_referrals_partner_read_own on public.partner_referrals;
create policy partner_referrals_partner_read_own on public.partner_referrals
for select using (
  exists (
    select 1
    from public.user_profiles me
    where me.user_id = auth.uid()
      and me.role = 'partner'
      and me.partner_id = partner_referrals.partner_id
  )
);

drop policy if exists partner_commissions_partner_read_own on public.partner_commissions;
create policy partner_commissions_partner_read_own on public.partner_commissions
for select using (
  exists (
    select 1
    from public.user_profiles me
    where me.user_id = auth.uid()
      and me.role = 'partner'
      and me.partner_id = partner_commissions.partner_id
  )
);

-- Bootstrap demo partner code if missing.
insert into public.partners (code, display_name, email, commission_percent, is_active)
select 'LUIGI23', 'Luigi Partner Demo', null, 7.00, true
where not exists (select 1 from public.partners where code = 'LUIGI23');
