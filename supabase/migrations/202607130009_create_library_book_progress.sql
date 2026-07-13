create table if not exists public.library_book_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.library_books(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index if not exists library_book_progress_user_status_idx
on public.library_book_progress (user_id, status, updated_at desc);

drop trigger if exists library_book_progress_set_updated_at on public.library_book_progress;
create trigger library_book_progress_set_updated_at
before update on public.library_book_progress
for each row
execute function public.set_updated_at();

alter table public.library_book_progress enable row level security;
alter table public.library_book_progress force row level security;

drop policy if exists library_book_progress_own_select on public.library_book_progress;
create policy library_book_progress_own_select
on public.library_book_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists library_book_progress_own_insert on public.library_book_progress;
create policy library_book_progress_own_insert
on public.library_book_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists library_book_progress_own_update on public.library_book_progress;
create policy library_book_progress_own_update
on public.library_book_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists library_book_progress_own_delete on public.library_book_progress;
create policy library_book_progress_own_delete
on public.library_book_progress
for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
