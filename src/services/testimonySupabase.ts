import { supabase } from "@/supabaseClient";

const TESTIMONIES_TABLE = "testimonies";
const TESTIMONY_AUDIO_BUCKET = "testimony-audios";

export type TestimonyStatus = "pending" | "approved" | "rejected";
export type TestimonyCommunityType = "jeune" | "mariee" | null;

export type TestimonyRecord = {
  id: string;
  createdBy: string;
  authorName: string | null;
  communityType: TestimonyCommunityType;
  title: string;
  originalText: string | null;
  publishedText: string | null;
  audioUrl: string | null;
  audioPath: string | null;
  status: TestimonyStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LocalAudioSelection = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type TestimonyRow = {
  id?: string | null;
  created_by?: string | null;
  author_name?: string | null;
  community_type?: string | null;
  title?: string | null;
  original_text?: string | null;
  published_text?: string | null;
  audio_url?: string | null;
  audio_path?: string | null;
  status?: string | null;
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CreateTestimonyInput = {
  userId: string;
  authorName?: string | null;
  communityType?: TestimonyCommunityType;
  title: string;
  originalText?: string | null;
  audioUrl?: string | null;
  audioPath?: string | null;
};

type ReviewTestimonyInput = {
  id: string;
  status: TestimonyStatus;
  title: string;
  publishedText?: string | null;
  adminNote?: string | null;
  reviewedBy: string;
};

function normalizeStatus(value: unknown): TestimonyStatus {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

function normalizeCommunityType(value: unknown): TestimonyCommunityType {
  if (value === "jeune" || value === "mariee") return value;
  return null;
}

function mapRow(row: TestimonyRow | null | undefined): TestimonyRecord | null {
  if (!row?.id || !row.created_by) return null;

  return {
    id: row.id,
    createdBy: row.created_by,
    authorName: typeof row.author_name === "string" ? row.author_name : null,
    communityType: normalizeCommunityType(row.community_type),
    title: typeof row.title === "string" ? row.title : "",
    originalText: typeof row.original_text === "string" ? row.original_text : null,
    publishedText: typeof row.published_text === "string" ? row.published_text : null,
    audioUrl: typeof row.audio_url === "string" ? row.audio_url : null,
    audioPath: typeof row.audio_path === "string" ? row.audio_path : null,
    status: normalizeStatus(row.status),
    adminNote: typeof row.admin_note === "string" ? row.admin_note : null,
    reviewedBy: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function buildAudioPath(userId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}-${safeName || "temoignage-audio"}`;
}

const TESTIMONY_SELECT =
  "id, created_by, author_name, community_type, title, original_text, published_text, audio_url, audio_path, status, admin_note, reviewed_by, reviewed_at, created_at, updated_at";

export async function getApprovedTestimonies(limit = 50): Promise<TestimonyRecord[]> {
  const { data, error } = await supabase
    .from(TESTIMONIES_TABLE)
    .select(TESTIMONY_SELECT)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as TestimonyRow))
    .filter((row): row is TestimonyRecord => row !== null);
}

export async function getAdminTestimonies(status?: TestimonyStatus | "all"): Promise<TestimonyRecord[]> {
  let query = supabase
    .from(TESTIMONIES_TABLE)
    .select(TESTIMONY_SELECT)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as TestimonyRow))
    .filter((row): row is TestimonyRecord => row !== null);
}

export async function uploadTestimonyAudio(
  userId: string,
  file: LocalAudioSelection
): Promise<{ audioPath: string; audioUrl: string }> {
  const response = await fetch(file.uri);
  const arrayBuffer = await response.arrayBuffer();
  const audioPath = buildAudioPath(userId, file.name);

  const uploadResult = await supabase.storage
    .from(TESTIMONY_AUDIO_BUCKET)
    .upload(audioPath, arrayBuffer, {
      contentType: file.mimeType ?? "audio/mpeg",
      upsert: true,
    });

  if (uploadResult.error) throw uploadResult.error;

  const publicUrlResult = supabase.storage
    .from(TESTIMONY_AUDIO_BUCKET)
    .getPublicUrl(audioPath);

  return {
    audioPath,
    audioUrl: publicUrlResult.data.publicUrl,
  };
}

export async function createTestimony(input: CreateTestimonyInput): Promise<TestimonyRecord> {
  const payload = {
    created_by: input.userId,
    author_name: input.authorName?.trim() || null,
    community_type: input.communityType ?? null,
    title: input.title.trim(),
    original_text: input.originalText?.trim() || null,
    published_text: null,
    audio_url: input.audioUrl ?? null,
    audio_path: input.audioPath ?? null,
    status: "pending" satisfies TestimonyStatus,
  };

  const { data, error } = await supabase
    .from(TESTIMONIES_TABLE)
    .insert(payload)
    .select(TESTIMONY_SELECT)
    .single();

  if (error) throw error;
  const record = mapRow(data as TestimonyRow);
  if (!record) throw new Error("Témoignage introuvable après création.");
  return record;
}

export async function reviewTestimony(input: ReviewTestimonyInput): Promise<TestimonyRecord> {
  const payload = {
    status: input.status,
    title: input.title.trim(),
    published_text: input.publishedText?.trim() || null,
    admin_note: input.adminNote?.trim() || null,
    reviewed_by: input.reviewedBy,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TESTIMONIES_TABLE)
    .update(payload)
    .eq("id", input.id)
    .select(TESTIMONY_SELECT)
    .single();

  if (error) throw error;
  const record = mapRow(data as TestimonyRow);
  if (!record) throw new Error("Témoignage introuvable après mise à jour.");
  return record;
}

export async function deleteTestimony(record: TestimonyRecord): Promise<void> {
  if (record.audioPath) {
    const storageResult = await supabase.storage
      .from(TESTIMONY_AUDIO_BUCKET)
      .remove([record.audioPath]);

    if (storageResult.error) throw storageResult.error;
  }

  const { error } = await supabase
    .from(TESTIMONIES_TABLE)
    .delete()
    .eq("id", record.id);

  if (error) throw error;
}
