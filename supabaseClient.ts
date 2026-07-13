import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "");
}

const supabaseUrl = cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const fallbackSupabaseUrl = "https://your-project.supabase.co";
const fallbackSupabaseAnonKey = "your-supabase-anon-key";

function isPlaceholder(value: string | undefined) {
  return !value || value.includes("your-project") || value.includes("your-supabase-anon-key");
}

function isValidHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const hasSupabaseConfig =
  !isPlaceholder(supabaseUrl) && isValidHttpUrl(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabaseConfigMessage =
  "Configuration Supabase absente. Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env.";

if (!hasSupabaseConfig) {
  console.warn(supabaseConfigMessage);
}

export function getSupabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/invalid api key/i.test(message)) {
    return [
      "Clé Supabase invalide.",
      "Vérifiez que EXPO_PUBLIC_SUPABASE_ANON_KEY est bien la clé anon/public du même projet que EXPO_PUBLIC_SUPABASE_URL.",
      "Après modification du .env, redémarrez Expo avec npx expo start -c.",
    ].join(" ");
  }

  if (!hasSupabaseConfig) {
    return `${supabaseConfigMessage} Redémarrez Expo avec npx expo start -c après modification.`;
  }

  return message || "Erreur Supabase inconnue.";
}

const resolvedSupabaseUrl = hasSupabaseConfig ? supabaseUrl! : fallbackSupabaseUrl;
const resolvedSupabaseAnonKey = hasSupabaseConfig ? supabaseAnonKey! : fallbackSupabaseAnonKey;

export const supabase = createClient(
  resolvedSupabaseUrl,
  resolvedSupabaseAnonKey,
  {
  auth: {
    storage: {
      async getItem(key: string) {
        return SecureStore.getItemAsync(key);
      },
      async setItem(key: string, value: string) {
        await SecureStore.setItemAsync(key, value);
      },
      async removeItem(key: string) {
        await SecureStore.deleteItemAsync(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
  }
);
