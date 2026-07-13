// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TargetScope = "all" | "general" | "jeune" | "mariee";

function normalizePayloadData(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function getAuthUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await client.auth.getUser();

  return user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuration Supabase incomplète." }, 500);
  }

  const service = createClient(supabaseUrl, serviceRoleKey);
  const user = await getAuthUser(req, supabaseUrl, anonKey);
  if (!user) return json({ error: "Session requise." }, 401);

  const { data: profile } = await service
    .from("users_profile")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (String(profile?.role ?? "").trim().toLowerCase() !== "admin") {
    return json({ error: "Accès admin requis." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  const messageBody = typeof body.body === "string" ? body.body.trim().slice(0, 180) : "";
  const targetScope: TargetScope =
    body.targetScope === "jeune" || body.targetScope === "mariee" || body.targetScope === "general" || body.targetScope === "all"
      ? body.targetScope
      : "all";

  if (!title || !messageBody) {
    return json({ error: "Titre et message requis." }, 400);
  }

  const payloadData = normalizePayloadData(body.data);
  const notificationType =
    typeof payloadData.type === "string" && payloadData.type.trim()
      ? payloadData.type.trim().slice(0, 40)
      : "admin";
  const route =
    typeof payloadData.route === "string" && payloadData.route.trim()
      ? payloadData.route.trim().slice(0, 160)
      : null;

  let targetUserIds: string[] = [];
  if (targetScope === "jeune" || targetScope === "mariee") {
    const { data: profiles, error: profileError } = await service
      .from("users_profile")
      .select("user_id")
      .eq("appartient_communaute", true)
      .eq("type_communaute", targetScope);
    if (profileError) throw profileError;
    targetUserIds = [...new Set((profiles ?? []).map((profile: any) => profile.user_id).filter(Boolean))];
  } else {
    const { data: profiles, error: profileError } = await service.from("users_profile").select("user_id");
    if (profileError) throw profileError;
    targetUserIds = [...new Set((profiles ?? []).map((profile: any) => profile.user_id).filter(Boolean))];
  }

  if (targetUserIds.length > 0) {
    const rows = targetUserIds.map((userId) => ({
      user_id: userId,
      title,
      body: messageBody,
      notification_type: notificationType,
      route,
      data: payloadData,
    }));

    for (const part of chunk(rows, 500)) {
      const { error: insertError } = await service.from("app_notifications").insert(part);
      if (insertError) throw insertError;
    }
  }

  const { data: tokenRows, error } = await service
    .from("device_push_tokens")
    .select("user_id, expo_push_token")
    .eq("enabled", true);
  if (error) throw error;

  let allowedUserIds: Set<string> | null = null;
  if (targetScope === "jeune" || targetScope === "mariee") allowedUserIds = new Set(targetUserIds);

  const tokens = [
    ...new Set(
      (tokenRows ?? [])
        .filter((row: any) => !allowedUserIds || allowedUserIds.has(row.user_id))
        .map((row: any) => row.expo_push_token)
        .filter(Boolean)
    ),
  ];
  if (tokens.length === 0) return json({ sent: 0 });

  const notifications = tokens.map((to) => ({
    to,
    title,
    body: messageBody,
    sound: "default",
    priority: "high",
    channelId: "kabod-admin-publications",
    data: payloadData,
  }));

  let sent = 0;
  for (const part of chunk(notifications, 100)) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(part),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Expo push error", response.status, text);
      continue;
    }

    sent += part.length;
  }

  return json({ sent, saved: targetUserIds.length });
});
