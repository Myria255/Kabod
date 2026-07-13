// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type R2Method = "GET" | "PUT";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeRfc3986).join("/");
}

async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
}

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function amzDates(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

async function signingKey(secret: string, dateStamp: string) {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${secret}`), dateStamp);
  const kRegion = await hmac(kDate, "auto");
  const kService = await hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

async function presignR2Url({
  method,
  objectKey,
  expires = 900,
}: {
  method: R2Method;
  objectKey: string;
  expires?: number;
}) {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET") || "kabod-books";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Configuration R2 incomplète.");
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = amzDates();
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${bucket}/${encodeObjectKey(objectKey)}`;

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };

  const canonicalQueryString = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join("\n");

  const key = await signingKey(secretAccessKey, dateStamp);
  const signature = toHex(await hmac(key, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function safeObjectKey(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/^\/+/, "").replace(/\.\./g, "").slice(0, 500);
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
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "createUploadUrl") {
      if (!user) return json({ error: "Session requise." }, 401);

      const { data: profile } = await service
        .from("users_profile")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (String(profile?.role ?? "").trim().toLowerCase() !== "admin") {
        return json({ error: "Accès admin requis." }, 403);
      }

      const objectKey = safeObjectKey(body.objectKey);
      if (!objectKey) return json({ error: "objectKey requis." }, 400);

      return json({
        objectKey,
        uploadUrl: await presignR2Url({ method: "PUT", objectKey, expires: 900 }),
      });
    }

    if (action === "createDownloadUrl") {
      if (!user) return json({ error: "Session requise." }, 401);

      const bookId = typeof body.bookId === "string" ? body.bookId : "";
      const assetType = body.assetType === "cover" ? "cover" : "file";

      const { data: book, error } = await service
        .from("library_books")
        .select("id, status, target_scope, file_object_key, cover_object_key")
        .eq("id", bookId)
        .maybeSingle();

      if (error) throw error;
      if (!book) return json({ error: "Livre introuvable." }, 404);

      const { data: profile } = await service
        .from("users_profile")
        .select("role, appartient_communaute, type_communaute")
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = String(profile?.role ?? "").trim().toLowerCase() === "admin";
      const isAllowed =
        isAdmin ||
        (book.status === "published" &&
          (book.target_scope === "general" ||
            (profile?.appartient_communaute === true && profile?.type_communaute === book.target_scope)));

      if (!isAllowed) return json({ error: "Accès non autorisé." }, 403);

      const objectKey = safeObjectKey(assetType === "cover" ? book.cover_object_key : book.file_object_key);
      if (!objectKey) return json({ error: "Fichier indisponible." }, 404);

      return json({
        url: await presignR2Url({ method: "GET", objectKey, expires: 900 }),
      });
    }

    return json({ error: "Action inconnue." }, 400);
  } catch (error) {
    console.error("r2-books error", error);
    return json({ error: error?.message ?? "Erreur R2." }, 500);
  }
});
