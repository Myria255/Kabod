import { supabase } from "@/supabaseClient";

const PRAYER_PODCASTS_TABLE = "prayer_podcasts";
const PRAYER_PODCASTS_BUCKET = "prayer-podcasts";

export type PrayerPodcastStatus = "draft" | "published";
export type PrayerPodcastSourceType = "upload" | "external";

export type PrayerPodcastRecord = {
  id: string | null;
  title: string;
  description: string;
  status: PrayerPodcastStatus;
  sourceType: PrayerPodcastSourceType;
  externalUrl: string | null;
  audioUrl: string | null;
  audioPath: string | null;
  updatedAt: string | null;
};

export type LocalAudioSelection = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type PrayerPodcastRow = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  source_type?: string | null;
  external_url?: string | null;
  audio_url?: string | null;
  audio_path?: string | null;
  updated_at?: string | null;
};

function normalizeStatus(value: unknown): PrayerPodcastStatus {
  return value === "published" ? "published" : "draft";
}

function normalizeSourceType(value: unknown): PrayerPodcastSourceType {
  return value === "external" ? "external" : "upload";
}

function mapRow(row: PrayerPodcastRow | null | undefined): PrayerPodcastRecord | null {
  if (!row) return null;

  return {
    id: typeof row.id === "string" ? row.id : null,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    status: normalizeStatus(row.status),
    sourceType: normalizeSourceType(row.source_type),
    externalUrl: typeof row.external_url === "string" ? row.external_url : null,
    audioUrl: typeof row.audio_url === "string" ? row.audio_url : null,
    audioPath: typeof row.audio_path === "string" ? row.audio_path : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function buildAudioPath(userId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}-${safeName}`;
}

export async function getLatestPrayerPodcast(
  status?: PrayerPodcastStatus
): Promise<PrayerPodcastRecord | null> {
  let query = supabase
    .from(PRAYER_PODCASTS_TABLE)
    .select("id, title, description, status, source_type, external_url, audio_url, audio_path, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return mapRow(data?.[0] as PrayerPodcastRow | undefined);
}

export async function getPrayerPodcasts(limit = 100): Promise<PrayerPodcastRecord[]> {
  const { data, error } = await supabase
    .from(PRAYER_PODCASTS_TABLE)
    .select("id, title, description, status, source_type, external_url, audio_url, audio_path, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => mapRow(row as PrayerPodcastRow))
    .filter((row): row is PrayerPodcastRecord => row !== null);
}

export async function uploadPrayerPodcastAudio(
  userId: string,
  file: LocalAudioSelection
): Promise<{ audioPath: string; audioUrl: string }> {
  const response = await fetch(file.uri);
  const arrayBuffer = await response.arrayBuffer();
  const audioPath = buildAudioPath(userId, file.name || "podcast-audio");

  const uploadResult = await supabase.storage
    .from(PRAYER_PODCASTS_BUCKET)
    .upload(audioPath, arrayBuffer, {
      contentType: file.mimeType ?? "audio/mpeg",
      upsert: true,
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const publicUrlResult = supabase.storage
    .from(PRAYER_PODCASTS_BUCKET)
    .getPublicUrl(audioPath);

  return {
    audioPath,
    audioUrl: publicUrlResult.data.publicUrl,
  };
}

type SavePrayerPodcastInput = {
  id?: string | null;
  userId: string;
  title: string;
  description: string;
  status: PrayerPodcastStatus;
  sourceType: PrayerPodcastSourceType;
  externalUrl?: string | null;
  audioUrl?: string | null;
  audioPath?: string | null;
};

export async function savePrayerPodcastRecord(
  input: SavePrayerPodcastInput
): Promise<PrayerPodcastRecord> {
  const payload = {
    title: input.title,
    description: input.description,
    status: input.status,
    source_type: input.sourceType,
    external_url: input.sourceType === "external" ? input.externalUrl ?? null : null,
    audio_url: input.sourceType === "upload" ? input.audioUrl ?? null : null,
    audio_path: input.sourceType === "upload" ? input.audioPath ?? null : null,
    created_by: input.userId,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from(PRAYER_PODCASTS_TABLE)
      .update(payload)
      .eq("id", input.id)
      .select("id, title, description, status, source_type, external_url, audio_url, audio_path, updated_at")
      .single();

    if (error) throw error;
    return mapRow(data as PrayerPodcastRow)!;
  }

  const { data, error } = await supabase
    .from(PRAYER_PODCASTS_TABLE)
    .insert(payload)
    .select("id, title, description, status, source_type, external_url, audio_url, audio_path, updated_at")
    .single();

  if (error) throw error;
  return mapRow(data as PrayerPodcastRow)!;
}

export async function deletePrayerPodcast(record: PrayerPodcastRecord): Promise<void> {
  if (!record.id) {
    throw new Error("Podcast introuvable.");
  }

  if (record.audioPath) {
    const storageResult = await supabase.storage
      .from(PRAYER_PODCASTS_BUCKET)
      .remove([record.audioPath]);

    if (storageResult.error) {
      throw storageResult.error;
    }
  }

  const { error } = await supabase
    .from(PRAYER_PODCASTS_TABLE)
    .delete()
    .eq("id", record.id);

  if (error) {
    throw error;
  }
}
