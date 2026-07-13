alter table public.community_feed_posts add column if not exists image_url text;
alter table public.community_feed_posts add column if not exists image_path text;
alter table public.community_feed_posts add column if not exists audio_url text;
alter table public.community_feed_posts add column if not exists audio_path text;

notify pgrst, 'reload schema';
