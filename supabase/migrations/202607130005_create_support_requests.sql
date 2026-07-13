create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users_profile
    where user_id = auth.uid()
      and lower(trim(coalesce(role, ''))) = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  request_type text not null default 'prayer' check (request_type in ('prayer', 'support', 'counseling', 'other')),
  title text not null check (char_length(trim(title)) > 0),
  message text not null check (char_length(trim(message)) > 0),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'archived')),
  is_private boolean not null default true,
  admin_note text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_created_by_idx
on public.support_requests (created_by, created_at desc);

create index if not exists support_requests_status_idx
on public.support_requests (status, created_at desc);

drop trigger if exists support_requests_set_updated_at on public.support_requests;
create trigger support_requests_set_updated_at
before update on public.support_requests
for each row
execute function public.set_updated_at();

alter table public.support_requests enable row level security;
alter table public.support_requests force row level security;

drop policy if exists support_requests_members_insert_own on public.support_requests;
create policy support_requests_members_insert_own
on public.support_requests
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists support_requests_members_read_own on public.support_requests;
create policy support_requests_members_read_own
on public.support_requests
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists support_requests_members_update_own_new on public.support_requests;
create policy support_requests_members_update_own_new
on public.support_requests
for update
to authenticated
using (created_by = auth.uid() and status = 'new')
with check (created_by = auth.uid() and status = 'new');

drop policy if exists support_requests_admin_all on public.support_requests;
create policy support_requests_admin_all
on public.support_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
