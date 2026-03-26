-- Campi per tracking booking esterno (Cal.com webhook)

alter table public.practices
  add column if not exists external_booking_uid text,
  add column if not exists external_event_start_at timestamptz,
  add column if not exists appointment_confirmed_at timestamptz;

create index if not exists practices_external_booking_uid_idx
  on public.practices(external_booking_uid);
