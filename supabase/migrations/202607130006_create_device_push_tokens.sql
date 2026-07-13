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

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text,
  device_name text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists device_push_tokens_user_idx
on public.device_push_tokens (user_id, enabled);

alter table public.device_push_tokens enable row level security;
alter table public.device_push_tokens force row level security;

drop policy if exists device_push_tokens_own_select on public.device_push_tokens;
create policy device_push_tokens_own_select
on public.device_push_tokens
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists device_push_tokens_own_insert on public.device_push_tokens;
create policy device_push_tokens_own_insert
on public.device_push_tokens
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists device_push_tokens_own_update on public.device_push_tokens;
create policy device_push_tokens_own_update
on public.device_push_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists device_push_tokens_own_delete on public.device_push_tokens;
create policy device_push_tokens_own_delete
on public.device_push_tokens
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists device_push_tokens_admin_read on public.device_push_tokens;
create policy device_push_tokens_admin_read
on public.device_push_tokens
for select
to authenticated
using (public.is_admin());

notify pgrst, 'reload schema';
