-- Kabod: politiques RLS et création atomique du profil à l'inscription.
-- Cette migration est idempotente pour les objets qu'elle gère.

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

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_age integer;
begin
  profile_age := case
    when coalesce(new.raw_user_meta_data ->> 'age', '') ~ '^[0-9]{1,3}$'
      then (new.raw_user_meta_data ->> 'age')::integer
    else null
  end;

  insert into public.users_profile (
    user_id,
    prenom,
    nom,
    sexe,
    age,
    situation,
    profession,
    pays,
    ville,
    appartient_communaute,
    type_communaute,
    role
  )
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'prenom'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'nom'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'sexe'), ''),
    profile_age,
    nullif(trim(new.raw_user_meta_data ->> 'situation'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'profession'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'pays'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'ville'), ''),
    coalesce((new.raw_user_meta_data ->> 'appartient_communaute')::boolean, false),
    nullif(trim(new.raw_user_meta_data ->> 'type_communaute'), ''),
    'user'
  )
  on conflict (user_id) do update set
    prenom = excluded.prenom,
    nom = excluded.nom,
    sexe = excluded.sexe,
    age = excluded.age,
    situation = excluded.situation,
    profession = excluded.profession,
    pays = excluded.pays,
    ville = excluded.ville,
    appartient_communaute = excluded.appartient_communaute,
    type_communaute = excluded.type_communaute;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'users_profile',
    'progression_lecture',
    'plan_lecture_utilisateur',
    'meditations',
    'admin_prayers',
    'daily_prayer_topics',
    'prayer_podcasts',
    'church_events',
    'live_streams'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end;
$$;

-- Profil : chacun lit et modifie son profil, sans pouvoir s'attribuer admin.
create policy users_profile_select_own
on public.users_profile for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy users_profile_insert_own
on public.users_profile for insert
to authenticated
with check (
  user_id = auth.uid()
  and lower(trim(coalesce(role, 'user'))) <> 'admin'
);

create policy users_profile_update_own
on public.users_profile for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and lower(trim(coalesce(role, 'user'))) <> 'admin'
);

create policy users_profile_admin_all
on public.users_profile for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Données privées liées directement à auth.users.
create policy progression_lecture_own
on public.progression_lecture for all
to authenticated
using (utilisateur_id = auth.uid())
with check (utilisateur_id = auth.uid());

create policy plan_lecture_utilisateur_own
on public.plan_lecture_utilisateur for all
to authenticated
using (utilisateur_id = auth.uid())
with check (utilisateur_id = auth.uid());

-- Le carnet historique peut utiliser utilisateur_id ou user_id, tous deux
-- contenant l'identifiant interne users_profile.id.
do $$
declare
  owner_expression text;
begin
  if to_regclass('public.meditations') is null then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'meditations'
      and column_name = 'utilisateur_id'
  ) then
    owner_expression :=
      'utilisateur_id in (select id from public.users_profile where user_id = auth.uid())';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'meditations'
      and column_name = 'user_id'
  ) then
    owner_expression :=
      'user_id in (select id from public.users_profile where user_id = auth.uid())';
  else
    raise exception 'La table public.meditations ne contient ni utilisateur_id ni user_id';
  end if;

  execute format(
    'create policy meditations_own on public.meditations for all to authenticated using (%s) with check (%s)',
    owner_expression,
    owner_expression
  );
end;
$$;

-- Contenus éditoriaux : les membres lisent uniquement le contenu publié ;
-- les administrateurs ont l'accès complet.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_prayers',
    'daily_prayer_topics',
    'prayer_podcasts',
    'church_events'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format(
      'create policy %I on public.%I for select to public using (status = ''published'')',
      table_name || '_read_published',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      table_name || '_admin_all',
      table_name
    );
  end loop;
end;
$$;

create policy live_streams_read_active
on public.live_streams for select
to public
using (status <> 'draft');

create policy live_streams_admin_all
on public.live_streams for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Stockage des podcasts : lecture publique, écriture réservée aux admins.
do $$
declare
  policy_name text;
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;

  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname like 'prayer_podcasts_%'
        or policyname like 'prayer-podcasts_%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;
end;
$$;

create policy prayer_podcasts_public_read
on storage.objects for select
to public
using (bucket_id = 'prayer-podcasts');

create policy prayer_podcasts_admin_insert
on storage.objects for insert
to authenticated
with check (bucket_id = 'prayer-podcasts' and public.is_admin());

create policy prayer_podcasts_admin_update
on storage.objects for update
to authenticated
using (bucket_id = 'prayer-podcasts' and public.is_admin())
with check (bucket_id = 'prayer-podcasts' and public.is_admin());

create policy prayer_podcasts_admin_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'prayer-podcasts' and public.is_admin());
