import { supabase } from "@/supabaseClient";

const TABLE = "library_book_progress";

export type LibraryBookProgressStatus = "in_progress" | "completed";

export type LibraryBookProgress = {
  id: string;
  userId: string;
  bookId: string;
  status: LibraryBookProgressStatus;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastOpenedAt: string | null;
  updatedAt: string | null;
};

type LibraryBookProgressRow = {
  id?: string | null;
  user_id?: string | null;
  book_id?: string | null;
  status?: string | null;
  progress_percent?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_opened_at?: string | null;
  updated_at?: string | null;
};

const PROGRESS_SELECT =
  "id, user_id, book_id, status, progress_percent, started_at, completed_at, last_opened_at, updated_at";

function normalizeStatus(value: unknown): LibraryBookProgressStatus {
  return value === "completed" ? "completed" : "in_progress";
}

function mapRow(row: LibraryBookProgressRow | null | undefined): LibraryBookProgress | null {
  if (!row?.id || !row.user_id || !row.book_id) return null;

  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    status: normalizeStatus(row.status),
    progressPercent: typeof row.progress_percent === "number" ? row.progress_percent : 0,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    lastOpenedAt: typeof row.last_opened_at === "string" ? row.last_opened_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) throw new Error("Session requise.");
  return user.id;
}

export async function getMyBookProgress(): Promise<LibraryBookProgress[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(PROGRESS_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as LibraryBookProgressRow))
    .filter((row): row is LibraryBookProgress => row !== null);
}

export async function markBookInProgress(bookId: string): Promise<LibraryBookProgress> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        book_id: bookId,
        status: "in_progress",
        progress_percent: 25,
        last_opened_at: now,
        completed_at: null,
      },
      { onConflict: "user_id,book_id" }
    )
    .select(PROGRESS_SELECT)
    .single();

  if (error) throw error;
  const progress = mapRow(data as LibraryBookProgressRow);
  if (!progress) throw new Error("Progression introuvable.");
  return progress;
}

export async function markBookCompleted(bookId: string): Promise<LibraryBookProgress> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        book_id: bookId,
        status: "completed",
        progress_percent: 100,
        last_opened_at: now,
        completed_at: now,
      },
      { onConflict: "user_id,book_id" }
    )
    .select(PROGRESS_SELECT)
    .single();

  if (error) throw error;
  const progress = mapRow(data as LibraryBookProgressRow);
  if (!progress) throw new Error("Progression introuvable.");
  return progress;
}
