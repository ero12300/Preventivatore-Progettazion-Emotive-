-- Dynamic pricing engine for EMOTIVE quote calculator.
-- Run in Supabase SQL editor.

create table if not exists public.pricing_rules_emotive (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_mq integer not null check (min_mq >= 0),
  max_mq integer not null check (max_mq >= min_mq),
  base_price_ex_vat numeric(10,2) not null check (base_price_ex_vat >= 0),
  priority integer not null default 100,
  is_active boolean not null default true,
  valid_from timestamptz null,
  valid_to timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pricing_rules_emotive_lookup
  on public.pricing_rules_emotive (is_active, min_mq, max_mq, priority);

create table if not exists public.pricing_discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  max_uses integer null check (max_uses is null or max_uses >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  visible_to_client boolean not null default true,
  valid_from timestamptz null,
  valid_to timestamptz null,
  notes_internal text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_referral_rules (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null unique,
  reward_type text not null check (
    reward_type in ('customer_discount', 'customer_discount_fixed', 'cash_commission', 'credit')
  ),
  reward_value numeric(10,2) not null check (reward_value >= 0),
  is_active boolean not null default true,
  valid_from timestamptz null,
  valid_to timestamptz null,
  notes_internal text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.preventivi_progettazione_emotive
  add column if not exists pricing_rule_id uuid null,
  add column if not exists pricing_rule_name text null,
  add column if not exists applied_discount_code text null,
  add column if not exists applied_referral_code text null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pricing_rules_touch_updated_at on public.pricing_rules_emotive;
create trigger trg_pricing_rules_touch_updated_at
before update on public.pricing_rules_emotive
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_discount_codes_touch_updated_at on public.pricing_discount_codes;
create trigger trg_discount_codes_touch_updated_at
before update on public.pricing_discount_codes
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_referral_rules_touch_updated_at on public.pricing_referral_rules;
create trigger trg_referral_rules_touch_updated_at
before update on public.pricing_referral_rules
for each row execute procedure public.touch_updated_at();

create or replace function public.prevent_pricing_overlap()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.pricing_rules_emotive r
    where r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and r.is_active = true
      and new.is_active = true
      and r.min_mq <= new.max_mq
      and r.max_mq >= new.min_mq
  ) then
    raise exception 'Fasce mq sovrapposte: aggiorna min/max.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pricing_rules_no_overlap on public.pricing_rules_emotive;
create trigger trg_pricing_rules_no_overlap
before insert or update on public.pricing_rules_emotive
for each row execute procedure public.prevent_pricing_overlap();

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 0, 69, 749, 10, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 0 and max_mq = 69 and is_active = true
);

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 70, 99, 849, 20, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 70 and max_mq = 99 and is_active = true
);

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 100, 149, 1050, 30, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 100 and max_mq = 149 and is_active = true
);

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 150, 199, 1250, 40, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 150 and max_mq = 199 and is_active = true
);

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 200, 249, 1450, 50, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 200 and max_mq = 249 and is_active = true
);

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 250, 299, 1650, 60, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 250 and max_mq = 299 and is_active = true
);

insert into public.pricing_rules_emotive (name, min_mq, max_mq, base_price_ex_vat, priority, is_active)
select 'Listino Standard 2026', 300, 500, 1850, 70, true
where not exists (
  select 1 from public.pricing_rules_emotive
  where min_mq = 300 and max_mq = 500 and is_active = true
);
