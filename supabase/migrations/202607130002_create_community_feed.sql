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

create table if not exists public.community_feed_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  target_scope text not null default 'general' check (target_scope in ('general', 'jeune', 'mariee')),
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  kind text not null default 'announcement' check (kind in ('announcement', 'encouragement', 'prayer', 'event', 'testimony')),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  pinned boolean not null default false,
  image_url text,
  image_path text,
  audio_url text,
  audio_path text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_feed_posts add column if not exists image_url text;
alter table public.community_feed_posts add column if not exists image_path text;
alter table public.community_feed_posts add column if not exists audio_url text;
alter table public.community_feed_posts add column if not exists audio_path text;

create index if not exists community_feed_posts_scope_status_idx
on public.community_feed_posts (target_scope, status, pinned desc, published_at desc, created_at desc);

drop trigger if exists community_feed_posts_set_updated_at on public.community_feed_posts;
create trigger community_feed_posts_set_updated_at
before update on public.community_feed_posts
for each row
execute function public.set_updated_at();

alter table public.community_feed_posts enable row level security;
alter table public.community_feed_posts force row level security;

drop policy if exists community_feed_posts_public_general_read on public.community_feed_posts;
create policy community_feed_posts_public_general_read
on public.community_feed_posts
for select
to anon, authenticated
using (status = 'published' and target_scope = 'general');

drop policy if exists community_feed_posts_member_scope_read on public.community_feed_posts;
create policy community_feed_posts_member_scope_read
on public.community_feed_posts
for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.users_profile profile
    where profile.user_id = auth.uid()
      and profile.appartient_communaute is true
      and profile.type_communaute = community_feed_posts.target_scope
  )
);

drop policy if exists community_feed_posts_admin_all on public.community_feed_posts;
create policy community_feed_posts_admin_all
on public.community_feed_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('community-feed-media', 'community-feed-media', true)
on conflict (id) do update set public = true;

drop policy if exists community_feed_media_public_read on storage.objects;
create policy community_feed_media_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'community-feed-media');

drop policy if exists community_feed_media_admin_insert on storage.objects;
create policy community_feed_media_admin_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'community-feed-media' and public.is_admin());

drop policy if exists community_feed_media_admin_update on storage.objects;
create policy community_feed_media_admin_update
on storage.objects
for update
to authenticated
using (bucket_id = 'community-feed-media' and public.is_admin())
with check (bucket_id = 'community-feed-media' and public.is_admin());

drop policy if exists community_feed_media_admin_delete on storage.objects;
create policy community_feed_media_admin_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'community-feed-media' and public.is_admin());
