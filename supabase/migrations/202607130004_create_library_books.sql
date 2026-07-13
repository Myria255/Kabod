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

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  author text,
  description text,
  category text,
  language text not null default 'fr',
  target_scope text not null default 'general' check (target_scope in ('general', 'jeune', 'mariee')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_downloadable boolean not null default true,
  file_type text not null default 'pdf' check (file_type in ('pdf', 'epub', 'other')),
  file_name text,
  file_size bigint,
  cover_object_key text,
  file_object_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_books_status_scope_idx
on public.library_books (status, target_scope, updated_at desc);

drop trigger if exists library_books_set_updated_at on public.library_books;
create trigger library_books_set_updated_at
before update on public.library_books
for each row
execute function public.set_updated_at();

alter table public.library_books enable row level security;
alter table public.library_books force row level security;

drop policy if exists library_books_public_general_read on public.library_books;
create policy library_books_public_general_read
on public.library_books
for select
to anon, authenticated
using (status = 'published' and target_scope = 'general');

drop policy if exists library_books_member_scope_read on public.library_books;
create policy library_books_member_scope_read
on public.library_books
for select
to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.users_profile profile
    where profile.user_id = auth.uid()
      and profile.appartient_communaute is true
      and profile.type_communaute = library_books.target_scope
  )
);

drop policy if exists library_books_admin_all on public.library_books;
create policy library_books_admin_all
on public.library_books
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
