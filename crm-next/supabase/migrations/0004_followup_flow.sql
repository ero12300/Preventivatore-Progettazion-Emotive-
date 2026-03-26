-- Follow-up commerciale su pratiche con preventivo inviato e non accettato

alter table public.practices
  add column if not exists quote_sent_at timestamptz not null default timezone('utc'::text, now()),
  add column if not exists quote_accepted_at timestamptz,
  add column if not exists followup_count integer not null default 0,
  add column if not exists followup_last_sent_at timestamptz,
  add column if not exists next_followup_at timestamptz,
  add column if not exists followup_last_message text;

create index if not exists practices_next_followup_idx on public.practices(next_followup_at);
