-- Partner payouts extension (bank transfer + Stripe Connect).
-- Run after migration_auth_partner_portal.sql

alter table public.partners
  add column if not exists payout_method text null check (payout_method in ('bank_transfer', 'stripe_connect', 'manual_card')),
  add column if not exists payout_email text null,
  add column if not exists bank_account_holder text null,
  add column if not exists bank_iban text null,
  add column if not exists stripe_account_id text null;

alter table public.partner_commissions
  add column if not exists payout_method text null check (payout_method in ('bank_transfer', 'stripe_connect', 'manual_card')),
  add column if not exists paid_at timestamptz null;

create index if not exists idx_partners_stripe_account on public.partners(stripe_account_id);
create index if not exists idx_partner_commissions_status on public.partner_commissions(status, created_at desc);
