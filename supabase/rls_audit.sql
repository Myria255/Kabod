-- Audit RLS Kabod
-- À exécuter dans le SQL Editor Supabase après les migrations.

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p')
  and c.relname in (
    'users_profile',
    'progression_lecture',
    'plan_lecture_utilisateur',
    'meditations',
    'admin_prayers',
    'daily_prayer_topics',
    'prayer_podcasts',
    'church_events',
    'live_streams',
    'testimonies',
    'community_feed_posts',
    'library_books',
    'library_book_progress',
    'support_requests',
    'device_push_tokens',
    'app_notifications',
    'donation_intents',
    'objects'
  )
order by n.nspname, c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'users_profile',
    'progression_lecture',
    'plan_lecture_utilisateur',
    'meditations',
    'admin_prayers',
    'daily_prayer_topics',
    'prayer_podcasts',
    'church_events',
    'live_streams',
    'testimonies',
    'community_feed_posts',
    'library_books',
    'library_book_progress',
    'support_requests',
    'device_push_tokens',
    'app_notifications',
    'donation_intents',
    'objects'
  )
order by schemaname, tablename, policyname;

-- Tables publiques sans RLS activé : doit idéalement retourner 0 ligne
-- pour les tables applicatives sensibles.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relrowsecurity is false
order by c.relname;
