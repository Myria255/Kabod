import { supabase } from "@/supabaseClient";

type RouteTarget = "/(tabs)" | "/admin-space";

function normalizeRole(value: unknown): string | null {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

export async function getDefaultRouteForUser(userId: string): Promise<RouteTarget> {
  if (!userId) return "/(tabs)";

  const { data, error } = await supabase
    .from("users_profile")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data) {
    const role = normalizeRole(data.role);
    if (role === "admin") {
      return "/admin-space";
    }
  }

  return "/(tabs)";
}
