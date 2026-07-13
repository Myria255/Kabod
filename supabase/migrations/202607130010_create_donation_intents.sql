create table if not exists public.donation_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  gift_type text not null check (gift_type in ('offrande', 'dime', 'don', 'solidarite', 'mission', 'autre')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  frequency text not null default 'once' check (frequency in ('once', 'monthly')),
  payment_method text not null default 'a_definir' check (payment_method in ('mobile_money', 'paypal', 'virement', 'especes', 'a_definir', 'autre')),
  note text,
  status text not null default 'new' check (status in ('new', 'contacted', 'completed', 'cancelled', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donation_intents_status_created_idx
on public.donation_intents (status, created_at desc);

create index if not exists donation_intents_user_created_idx
on public.donation_intents (user_id, created_at desc);

drop trigger if exists donation_intents_set_updated_at on public.donation_intents;
create trigger donation_intents_set_updated_at
before update on public.donation_intents
for each row
execute function public.set_updated_at();

alter table public.donation_intents enable row level security;
alter table public.donation_intents force row level security;

drop policy if exists donation_intents_own_insert on public.donation_intents;
create policy donation_intents_own_insert
on public.donation_intents
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists donation_intents_own_select on public.donation_intents;
create policy donation_intents_own_select
on public.donation_intents
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists donation_intents_admin_all on public.donation_intents;
create policy donation_intents_admin_all
on public.donation_intents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
