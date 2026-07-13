import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { getSupabaseErrorMessage, hasSupabaseConfig, supabase } from "@/supabaseClient";
import { getDefaultRouteForUser } from "@/src/services/authRedirect";

WebBrowser.maybeCompleteAuthSession();

function getUrlHashParams(url: string) {
  const hash = url.split("#")[1];
  return new URLSearchParams(hash ?? "");
}

async function applyAuthUrl(url: string) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) throw new Error(getSupabaseErrorMessage(error));
    return data.session?.user?.id ?? null;
  }

  const hashParams = getUrlHashParams(url);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw new Error(getSupabaseErrorMessage(error));
    return data.session?.user?.id ?? null;
  }

  return null;
}

export async function signInWithGoogle() {
  if (!hasSupabaseConfig) {
    throw new Error(getSupabaseErrorMessage(new Error("Configuration Supabase absente.")));
  }

  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!data.url) throw new Error("Impossible d’ouvrir la connexion Google.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return null;

  const userId = await applyAuthUrl(result.url);
  if (!userId) return null;

  return getDefaultRouteForUser(userId);
}

export function getPasswordResetRedirectUrl() {
  return Linking.createURL("reset-password");
}

export async function applyPasswordRecoveryUrl(url: string) {
  return applyAuthUrl(url);
}
