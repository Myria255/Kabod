create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null default 'admin',
  route text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_user_created_idx
on public.app_notifications (user_id, created_at desc);

create index if not exists app_notifications_user_unread_idx
on public.app_notifications (user_id, read_at)
where read_at is null;

alter table public.app_notifications enable row level security;
alter table public.app_notifications force row level security;

drop policy if exists app_notifications_own_select on public.app_notifications;
create policy app_notifications_own_select
on public.app_notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists app_notifications_own_update on public.app_notifications;
create policy app_notifications_own_update
on public.app_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists app_notifications_own_delete on public.app_notifications;
create policy app_notifications_own_delete
on public.app_notifications
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists app_notifications_admin_insert on public.app_notifications;
create policy app_notifications_admin_insert
on public.app_notifications
for insert
to authenticated
with check (public.is_admin());

notify pgrst, 'reload schema';
