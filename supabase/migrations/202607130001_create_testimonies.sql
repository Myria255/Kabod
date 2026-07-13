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

create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  author_name text,
  community_type text check (community_type is null or community_type in ('jeune', 'mariee')),
  title text not null check (char_length(trim(title)) > 0),
  original_text text,
  published_text text,
  audio_url text,
  audio_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonies_has_content check (
    nullif(trim(coalesce(original_text, '')), '') is not null
    or nullif(trim(coalesce(audio_url, '')), '') is not null
  )
);

create index if not exists testimonies_status_created_at_idx
on public.testimonies (status, created_at desc);

create index if not exists testimonies_created_by_idx
on public.testimonies (created_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists testimonies_set_updated_at on public.testimonies;
create trigger testimonies_set_updated_at
before update on public.testimonies
for each row
execute function public.set_updated_at();

alter table public.testimonies enable row level security;
alter table public.testimonies force row level security;

drop policy if exists testimonies_public_read_approved on public.testimonies;
create policy testimonies_public_read_approved
on public.testimonies
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists testimonies_members_read_own on public.testimonies;
create policy testimonies_members_read_own
on public.testimonies
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists testimonies_members_insert_own_pending on public.testimonies;
create policy testimonies_members_insert_own_pending
on public.testimonies
for insert
to authenticated
with check (created_by = auth.uid() and status = 'pending');

drop policy if exists testimonies_members_update_own_pending on public.testimonies;
create policy testimonies_members_update_own_pending
on public.testimonies
for update
to authenticated
using (created_by = auth.uid() and status = 'pending')
with check (created_by = auth.uid() and status = 'pending');

drop policy if exists testimonies_admin_all on public.testimonies;
create policy testimonies_admin_all
on public.testimonies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('testimony-audios', 'testimony-audios', true)
on conflict (id) do update set public = true;

drop policy if exists testimony_audios_public_read on storage.objects;
create policy testimony_audios_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'testimony-audios');

drop policy if exists testimony_audios_members_insert on storage.objects;
create policy testimony_audios_members_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'testimony-audios'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists testimony_audios_members_update_own_pending on storage.objects;
create policy testimony_audios_members_update_own_pending
on storage.objects
for update
to authenticated
using (
  bucket_id = 'testimony-audios'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
)
with check (
  bucket_id = 'testimony-audios'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists testimony_audios_members_delete_own_or_admin on storage.objects;
create policy testimony_audios_members_delete_own_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'testimony-audios'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
