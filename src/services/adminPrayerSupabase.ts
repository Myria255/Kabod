import { supabase } from "@/supabaseClient";

const ADMIN_PRAYERS_TABLE = "admin_prayers";

export type AdminPrayerStatus = "draft" | "published";

export type AdminPrayerRecord = {
  id: string | null;
  title: string;
  content: string;
  verseReference: string;
  verseText: string;
  bookId: string;
  chapter: number | null;
  verseNumber: number | null;
  status: AdminPrayerStatus;
  updatedAt: string | null;
};

type AdminPrayerRow = {
  id?: string | null;
  title?: string | null;
  content?: string | null;
  verse_reference?: string | null;
  verse_text?: string | null;
  book_id?: string | null;
  chapter?: number | null;
  verse_number?: number | null;
  status?: string | null;
  updated_at?: string | null;
};

function normalizeStatus(value: unknown): AdminPrayerStatus {
  return value === "published" ? "published" : "draft";
}

function mapRow(row: AdminPrayerRow | null | undefined): AdminPrayerRecord | null {
  if (!row) return null;

  return {
    id: typeof row.id === "string" ? row.id : null,
    title: typeof row.title === "string" ? row.title : "",
    content: typeof row.content === "string" ? row.content : "",
    verseReference: typeof row.verse_reference === "string" ? row.verse_reference : "",
    verseText: typeof row.verse_text === "string" ? row.verse_text : "",
    bookId: typeof row.book_id === "string" ? row.book_id : "",
    chapter: typeof row.chapter === "number" ? row.chapter : null,
    verseNumber: typeof row.verse_number === "number" ? row.verse_number : null,
    status: normalizeStatus(row.status),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function getLatestAdminPrayer(
  status?: AdminPrayerStatus
): Promise<AdminPrayerRecord | null> {
  let query = supabase
    .from(ADMIN_PRAYERS_TABLE)
    .select("id, title, content, verse_reference, verse_text, book_id, chapter, verse_number, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return mapRow(data?.[0] as AdminPrayerRow | undefined);
}

export async function getAdminPrayers(limit = 100): Promise<AdminPrayerRecord[]> {
  const { data, error } = await supabase
    .from(ADMIN_PRAYERS_TABLE)
    .select("id, title, content, verse_reference, verse_text, book_id, chapter, verse_number, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as AdminPrayerRow))
    .filter((row): row is AdminPrayerRecord => row !== null);
}

type SaveAdminPrayerInput = {
  id?: string | null;
  userId: string;
  title: string;
  content: string;
  verseReference: string;
  verseText: string;
  bookId: string;
  chapter: number;
  verseNumber: number;
  status: AdminPrayerStatus;
};

export async function saveAdminPrayer(
  input: SaveAdminPrayerInput
): Promise<AdminPrayerRecord> {
  const payload = {
    title: input.title,
    content: input.content,
    verse_reference: input.verseReference,
    verse_text: input.verseText,
    book_id: input.bookId,
    chapter: input.chapter,
    verse_number: input.verseNumber,
    status: input.status,
    created_by: input.userId,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from(ADMIN_PRAYERS_TABLE)
      .update(payload)
      .eq("id", input.id)
      .select("id, title, content, verse_reference, verse_text, book_id, chapter, verse_number, status, updated_at")
      .single();

    if (error) throw error;
    return mapRow(data as AdminPrayerRow)!;
  }

  const { data, error } = await supabase
    .from(ADMIN_PRAYERS_TABLE)
    .insert(payload)
    .select("id, title, content, verse_reference, verse_text, book_id, chapter, verse_number, status, updated_at")
    .single();

  if (error) throw error;
  return mapRow(data as AdminPrayerRow)!;
}

export async function deleteAdminPrayer(id: string): Promise<void> {
  const { error } = await supabase
    .from(ADMIN_PRAYERS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
