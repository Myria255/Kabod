import { getSupabaseErrorMessage, hasSupabaseConfig, supabase } from "@/supabaseClient";
import * as SecureStore from "expo-secure-store";

const REGISTRATION_DRAFT_KEY = "KABOD_REGISTRATION_DRAFT_V1";

export type RegistrationProfileInput = {
  prenom: string;
  nom: string;
  sexe: string | null;
  age: string;
  situation: string | null;
  profession: string;
  pays: string | null;
  ville: string | null;
  rgpdConsent: boolean;
  rgpdConsentTextVersion: string;
  rgpdConsentAcceptedAt: string;
};

export type RegistrationInput = RegistrationProfileInput & {
  email: string;
  password: string;
  appartientCommunaute: boolean;
  typeCommunaute: string | null;
};

export type RegistrationDraft = RegistrationProfileInput & {
  email: string;
  password: string;
};

export type RegistrationResult = {
  userId: string;
  requiresEmailConfirmation: boolean;
};

function parseAge(value: string) {
  const age = Number.parseInt(value, 10);
  return Number.isFinite(age) && age > 0 ? age : null;
}

function buildProfile(input: RegistrationInput) {
  return {
    prenom: input.prenom.trim() || null,
    nom: input.nom.trim() || null,
    sexe: input.sexe,
    age: parseAge(input.age),
    situation: input.situation,
    profession: input.profession.trim() || null,
    pays: input.pays,
    ville: input.ville,
    appartient_communaute: input.appartientCommunaute,
    type_communaute: input.appartientCommunaute ? input.typeCommunaute : null,
    rgpd_consent: input.rgpdConsent,
    rgpd_consent_text_version: input.rgpdConsentTextVersion,
    rgpd_consent_accepted_at: input.rgpdConsentAcceptedAt,
  };
}

export async function saveRegistrationDraft(draft: RegistrationDraft) {
  await SecureStore.setItemAsync(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
}

export async function loadRegistrationDraft(): Promise<RegistrationDraft | null> {
  const raw = await SecureStore.getItemAsync(REGISTRATION_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as RegistrationDraft;
  } catch {
    await SecureStore.deleteItemAsync(REGISTRATION_DRAFT_KEY);
    return null;
  }
}

export async function clearRegistrationDraft() {
  await SecureStore.deleteItemAsync(REGISTRATION_DRAFT_KEY);
}

export async function registerUserWithProfile(
  input: RegistrationInput
): Promise<RegistrationResult> {
  if (!hasSupabaseConfig) {
    throw new Error(getSupabaseErrorMessage(new Error("Configuration Supabase absente.")));
  }

  const email = input.email.trim().toLowerCase();
  const profile = buildProfile(input);

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: profile,
    },
  });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!data.user) {
    throw new Error("Supabase n’a retourné aucun utilisateur après l’inscription.");
  }

  // Le trigger handle_new_user_profile crée le profil de manière atomique,
  // y compris quand la confirmation email est activée. Si une session existe,
  // ce fallback maintient la compatibilité avant le déploiement de la migration.
  if (data.session) {
    const { data: existingProfile, error: profileReadError } = await supabase
      .from("users_profile")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (profileReadError) throw profileReadError;

    if (!existingProfile) {
      const { error: profileWriteError } = await supabase
        .from("users_profile")
        .upsert(
          {
            user_id: data.user.id,
            ...profile,
          },
          { onConflict: "user_id" }
        );

      if (profileWriteError) throw profileWriteError;
    }
  }

  return {
    userId: data.user.id,
    requiresEmailConfirmation: !data.session,
  };
}
