-- Kabod: preuve de consentement RGPD lors de l'inscription.

alter table if exists public.users_profile
  add column if not exists rgpd_consent boolean not null default false,
  add column if not exists rgpd_consent_accepted_at timestamptz,
  add column if not exists rgpd_consent_text_version text;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_age integer;
  consent_accepted_at timestamptz;
begin
  profile_age := case
    when coalesce(new.raw_user_meta_data ->> 'age', '') ~ '^[0-9]{1,3}$'
      then (new.raw_user_meta_data ->> 'age')::integer
    else null
  end;

  consent_accepted_at := case
    when coalesce(new.raw_user_meta_data ->> 'rgpd_consent_accepted_at', '') <> ''
      then (new.raw_user_meta_data ->> 'rgpd_consent_accepted_at')::timestamptz
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
    rgpd_consent,
    rgpd_consent_accepted_at,
    rgpd_consent_text_version,
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
    coalesce((new.raw_user_meta_data ->> 'rgpd_consent')::boolean, false),
    consent_accepted_at,
    nullif(trim(new.raw_user_meta_data ->> 'rgpd_consent_text_version'), ''),
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
    type_communaute = excluded.type_communaute,
    rgpd_consent = excluded.rgpd_consent,
    rgpd_consent_accepted_at = excluded.rgpd_consent_accepted_at,
    rgpd_consent_text_version = excluded.rgpd_consent_text_version;

  return new;
end;
$$;
