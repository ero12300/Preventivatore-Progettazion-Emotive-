alter table public.preventivi_progettazione_emotive
  add column if not exists quote_number text,
  add column if not exists lead_number text,
  add column if not exists business_categories jsonb default '[]'::jsonb,
  add column if not exists lead_source text default 'web_form',
  add column if not exists funnel_step text,
  add column if not exists notes text;

create index if not exists idx_preventivi_proj_quote_number on public.preventivi_progettazione_emotive (quote_number);
create index if not exists idx_preventivi_proj_lead_number on public.preventivi_progettazione_emotive (lead_number);
