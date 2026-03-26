-- Estensione practices per MVP workflow operativo

alter table public.practices
  add column if not exists assigned_designer_id uuid references public.project_designers(id) on delete set null,
  add column if not exists documents_completed_at timestamptz,
  add column if not exists booking_link_url text;

create index if not exists practices_assigned_designer_idx on public.practices(assigned_designer_id);
