import { supabase } from "@/supabaseClient";

const COMMUNITY_FEED_TABLE = "community_feed_posts";
const COMMUNITY_FEED_MEDIA_BUCKET = "community-feed-media";

export type CommunityFeedScope = "general" | "jeune" | "mariee";
export type CommunityFeedStatus = "draft" | "published" | "archived";
export type CommunityFeedKind = "announcement" | "encouragement" | "prayer" | "event" | "testimony";

export type CommunityFeedPost = {
  id: string;
  createdBy: string | null;
  targetScope: CommunityFeedScope;
  title: string;
  body: string;
  kind: CommunityFeedKind;
  status: CommunityFeedStatus;
  pinned: boolean;
  imageUrl: string | null;
  imagePath: string | null;
  audioUrl: string | null;
  audioPath: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type CommunityFeedRow = {
  id?: string | null;
  created_by?: string | null;
  target_scope?: string | null;
  title?: string | null;
  body?: string | null;
  kind?: string | null;
  status?: string | null;
  pinned?: boolean | null;
  image_url?: string | null;
  image_path?: string | null;
  audio_url?: string | null;
  audio_path?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SaveCommunityFeedPostInput = {
  id?: string | null;
  userId: string;
  targetScope: CommunityFeedScope;
  title: string;
  body: string;
  kind: CommunityFeedKind;
  status: CommunityFeedStatus;
  pinned: boolean;
  imageUrl?: string | null;
  imagePath?: string | null;
  audioUrl?: string | null;
  audioPath?: string | null;
};

const COMMUNITY_FEED_SELECT =
  "id, created_by, target_scope, title, body, kind, status, pinned, image_url, image_path, audio_url, audio_path, published_at, created_at, updated_at";

export type LocalCommunityFeedMedia = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

function normalizeScope(value: unknown): CommunityFeedScope {
  if (value === "jeune" || value === "mariee") return value;
  return "general";
}

function normalizeStatus(value: unknown): CommunityFeedStatus {
  if (value === "draft" || value === "archived") return value;
  return "published";
}

function normalizeKind(value: unknown): CommunityFeedKind {
  if (value === "encouragement" || value === "prayer" || value === "event" || value === "testimony") {
    return value;
  }
  return "announcement";
}

function mapRow(row: CommunityFeedRow | null | undefined): CommunityFeedPost | null {
  if (!row?.id) return null;

  return {
    id: row.id,
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    targetScope: normalizeScope(row.target_scope),
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    kind: normalizeKind(row.kind),
    status: normalizeStatus(row.status),
    pinned: row.pinned === true,
    imageUrl: typeof row.image_url === "string" ? row.image_url : null,
    imagePath: typeof row.image_path === "string" ? row.image_path : null,
    audioUrl: typeof row.audio_url === "string" ? row.audio_url : null,
    audioPath: typeof row.audio_path === "string" ? row.audio_path : null,
    publishedAt: typeof row.published_at === "string" ? row.published_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export function scopeLabel(scope: CommunityFeedScope) {
  if (scope === "jeune") return "Jeunes chrétiens";
  if (scope === "mariee") return "Couples mariés";
  return "Toute la communauté";
}

export function kindLabel(kind: CommunityFeedKind) {
  if (kind === "encouragement") return "Encouragement";
  if (kind === "prayer") return "Prière";
  if (kind === "event") return "Événement";
  if (kind === "testimony") return "Témoignage";
  return "Annonce";
}

function buildMediaPath(userId: string, type: "images" | "audios", fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${type}/${userId}/${Date.now()}-${safeName || type}`;
}

export async function uploadCommunityFeedMedia(
  userId: string,
  type: "images" | "audios",
  file: LocalCommunityFeedMedia
): Promise<{ path: string; url: string }> {
  const response = await fetch(file.uri);
  const arrayBuffer = await response.arrayBuffer();
  const path = buildMediaPath(userId, type, file.name);

  const uploadResult = await supabase.storage
    .from(COMMUNITY_FEED_MEDIA_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.mimeType ?? (type === "images" ? "image/jpeg" : "audio/mpeg"),
      upsert: true,
    });

  if (uploadResult.error) throw uploadResult.error;

  const publicUrlResult = supabase.storage.from(COMMUNITY_FEED_MEDIA_BUCKET).getPublicUrl(path);
  return {
    path,
    url: publicUrlResult.data.publicUrl,
  };
}

export async function getCommunityFeedPosts(limit = 80): Promise<CommunityFeedPost[]> {
  const { data, error } = await supabase
    .from(COMMUNITY_FEED_TABLE)
    .select(COMMUNITY_FEED_SELECT)
    .eq("status", "published")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as CommunityFeedRow))
    .filter((row): row is CommunityFeedPost => row !== null);
}

export async function getAdminCommunityFeedPosts(status?: CommunityFeedStatus | "all"): Promise<CommunityFeedPost[]> {
  let query = supabase
    .from(COMMUNITY_FEED_TABLE)
    .select(COMMUNITY_FEED_SELECT)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as CommunityFeedRow))
    .filter((row): row is CommunityFeedPost => row !== null);
}

export async function saveCommunityFeedPost(input: SaveCommunityFeedPostInput): Promise<CommunityFeedPost> {
  const payload = {
    created_by: input.userId,
    target_scope: input.targetScope,
    title: input.title.trim(),
    body: input.body.trim(),
    kind: input.kind,
    status: input.status,
    pinned: input.pinned,
    image_url: input.imageUrl ?? null,
    image_path: input.imagePath ?? null,
    audio_url: input.audioUrl ?? null,
    audio_path: input.audioPath ?? null,
    published_at: input.status === "published" ? new Date().toISOString() : null,
  };

  const query = input.id
    ? supabase.from(COMMUNITY_FEED_TABLE).update(payload).eq("id", input.id)
    : supabase.from(COMMUNITY_FEED_TABLE).insert(payload);

  const { data, error } = await query.select(COMMUNITY_FEED_SELECT).single();
  if (error) throw error;

  const post = mapRow(data as CommunityFeedRow);
  if (!post) throw new Error("Publication introuvable après enregistrement.");
  return post;
}

export async function deleteCommunityFeedPost(id: string): Promise<void> {
  const { error } = await supabase.from(COMMUNITY_FEED_TABLE).delete().eq("id", id);
  if (error) throw error;
}
