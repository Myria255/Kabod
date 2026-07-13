-- Kabod: distinguer les nouveautés non vues par l'admin des demandes encore à traiter.

alter table if exists public.testimonies
  add column if not exists admin_seen_at timestamptz;

alter table if exists public.support_requests
  add column if not exists admin_seen_at timestamptz;

alter table if exists public.donation_intents
  add column if not exists admin_seen_at timestamptz;

alter table if exists public.privacy_requests
  add column if not exists admin_seen_at timestamptz;

create index if not exists testimonies_admin_seen_idx
on public.testimonies (status, admin_seen_at, created_at desc);

create index if not exists support_requests_admin_seen_idx
on public.support_requests (status, admin_seen_at, created_at desc);

create index if not exists donation_intents_admin_seen_idx
on public.donation_intents (status, admin_seen_at, created_at desc);

create index if not exists privacy_requests_admin_seen_idx
on public.privacy_requests (status, admin_seen_at, created_at desc);

notify pgrst, 'reload schema';
