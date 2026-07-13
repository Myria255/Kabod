-- Kabod: demandes d'exercice des droits RGPD.

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access', 'rectification', 'deletion', 'restriction', 'other')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_review', 'completed', 'rejected', 'archived')),
  admin_note text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_user_id_idx on public.privacy_requests(user_id);
create index if not exists privacy_requests_status_idx on public.privacy_requests(status);
create index if not exists privacy_requests_created_at_idx on public.privacy_requests(created_at desc);

alter table public.privacy_requests enable row level security;
alter table public.privacy_requests force row level security;

drop trigger if exists set_privacy_requests_updated_at on public.privacy_requests;
create trigger set_privacy_requests_updated_at
before update on public.privacy_requests
for each row execute function public.set_updated_at();

drop policy if exists privacy_requests_select_own on public.privacy_requests;
drop policy if exists privacy_requests_insert_own on public.privacy_requests;
drop policy if exists privacy_requests_admin_all on public.privacy_requests;

create policy privacy_requests_select_own
on public.privacy_requests for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy privacy_requests_insert_own
on public.privacy_requests for insert
to authenticated
with check (user_id = auth.uid());

create policy privacy_requests_admin_all
on public.privacy_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
