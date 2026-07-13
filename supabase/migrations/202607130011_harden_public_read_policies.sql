-- Durcissement : les contenus de l'app sont destinés aux utilisateurs connectés.
-- On remplace les lectures "public/anon" par "authenticated" quand cela concerne
-- les tables applicatives. Les Edge Functions et les admins gardent leurs accès.

drop policy if exists admin_prayers_read_published on public.admin_prayers;
create policy admin_prayers_read_published
on public.admin_prayers
for select
to authenticated
using (status = 'published');

drop policy if exists daily_prayer_topics_read_published on public.daily_prayer_topics;
create policy daily_prayer_topics_read_published
on public.daily_prayer_topics
for select
to authenticated
using (status = 'published');

drop policy if exists prayer_podcasts_read_published on public.prayer_podcasts;
create policy prayer_podcasts_read_published
on public.prayer_podcasts
for select
to authenticated
using (status = 'published');

drop policy if exists church_events_read_published on public.church_events;
create policy church_events_read_published
on public.church_events
for select
to authenticated
using (status = 'published');

drop policy if exists live_streams_read_active on public.live_streams;
create policy live_streams_read_active
on public.live_streams
for select
to authenticated
using (status <> 'draft');

drop policy if exists testimonies_public_read_approved on public.testimonies;
create policy testimonies_public_read_approved
on public.testimonies
for select
to authenticated
using (status = 'approved');

drop policy if exists community_feed_posts_public_general_read on public.community_feed_posts;
create policy community_feed_posts_public_general_read
on public.community_feed_posts
for select
to authenticated
using (status = 'published' and target_scope = 'general');

drop policy if exists library_books_public_general_read on public.library_books;
create policy library_books_public_general_read
on public.library_books
for select
to authenticated
using (status = 'published' and target_scope = 'general');

notify pgrst, 'reload schema';
