import { supabase } from "@/supabaseClient";

const BOOKS_TABLE = "library_books";

export type BookScope = "general" | "jeune" | "mariee";
export type BookStatus = "draft" | "published" | "archived";
export type BookFileType = "pdf" | "epub" | "audio" | "other";

export type LibraryBook = {
  id: string;
  createdBy: string | null;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  language: string;
  targetScope: BookScope;
  status: BookStatus;
  isDownloadable: boolean;
  fileType: BookFileType;
  fileName: string | null;
  fileSize: number | null;
  coverObjectKey: string | null;
  fileObjectKey: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LocalBookAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

type LibraryBookRow = {
  id?: string | null;
  created_by?: string | null;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  category?: string | null;
  language?: string | null;
  target_scope?: string | null;
  status?: string | null;
  is_downloadable?: boolean | null;
  file_type?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  cover_object_key?: string | null;
  file_object_key?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SaveBookInput = {
  id?: string | null;
  userId: string;
  title: string;
  author?: string | null;
  description?: string | null;
  category?: string | null;
  language: string;
  targetScope: BookScope;
  status: BookStatus;
  isDownloadable: boolean;
  fileType: BookFileType;
  fileName?: string | null;
  fileSize?: number | null;
  coverObjectKey?: string | null;
  fileObjectKey: string;
};

const BOOK_SELECT =
  "id, created_by, title, author, description, category, language, target_scope, status, is_downloadable, file_type, file_name, file_size, cover_object_key, file_object_key, created_at, updated_at";

function getFunctionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  if ("message" in error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function normalizeScope(value: unknown): BookScope {
  if (value === "jeune" || value === "mariee") return value;
  return "general";
}

function normalizeStatus(value: unknown): BookStatus {
  if (value === "published" || value === "archived") return value;
  return "draft";
}

function normalizeFileType(value: unknown): BookFileType {
  if (value === "audio") return "audio";
  if (value === "epub" || value === "other") return value;
  return "pdf";
}

function mapRow(row: LibraryBookRow | null | undefined): LibraryBook | null {
  if (!row?.id || !row.file_object_key) return null;

  return {
    id: row.id,
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    title: typeof row.title === "string" ? row.title : "",
    author: typeof row.author === "string" ? row.author : null,
    description: typeof row.description === "string" ? row.description : null,
    category: typeof row.category === "string" ? row.category : null,
    language: typeof row.language === "string" ? row.language : "fr",
    targetScope: normalizeScope(row.target_scope),
    status: normalizeStatus(row.status),
    isDownloadable: row.is_downloadable !== false,
    fileType: normalizeFileType(row.file_type),
    fileName: typeof row.file_name === "string" ? row.file_name : null,
    fileSize: typeof row.file_size === "number" ? row.file_size : null,
    coverObjectKey: typeof row.cover_object_key === "string" ? row.cover_object_key : null,
    fileObjectKey: row.file_object_key,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "book-file";
}

function buildObjectKey(userId: string, folder: "covers" | "files", fileName: string) {
  return `${folder}/${userId}/${Date.now()}-${safeFileName(fileName)}`;
}

export function scopeLabel(scope: BookScope) {
  if (scope === "jeune") return "Jeunes chrétiens";
  if (scope === "mariee") return "Couples mariés";
  return "Tous les membres";
}

export function statusLabel(status: BookStatus) {
  if (status === "published") return "Publié";
  if (status === "archived") return "Archivé";
  return "Brouillon";
}

export function fileTypeFromName(fileName: string): BookFileType {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".mp3") ||
    lower.endsWith(".m4a") ||
    lower.endsWith(".aac") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".ogg")
  ) {
    return "audio";
  }
  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".pdf")) return "pdf";
  return "other";
}

export async function getPublishedBooks(limit = 100): Promise<LibraryBook[]> {
  const { data, error } = await supabase
    .from(BOOKS_TABLE)
    .select(BOOK_SELECT)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as LibraryBookRow))
    .filter((row): row is LibraryBook => row !== null);
}

export async function getAdminBooks(): Promise<LibraryBook[]> {
  const { data, error } = await supabase
    .from(BOOKS_TABLE)
    .select(BOOK_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as LibraryBookRow))
    .filter((row): row is LibraryBook => row !== null);
}

export async function uploadBookAsset(
  userId: string,
  folder: "covers" | "files",
  file: LocalBookAsset
): Promise<string> {
  const objectKey = buildObjectKey(userId, folder, file.name);
  const { data, error } = await supabase.functions.invoke("r2-books", {
    body: {
      action: "createUploadUrl",
      objectKey,
      contentType: file.mimeType ?? "application/octet-stream",
    },
  });

  if (error) {
    throw new Error(getFunctionErrorMessage(error, "Impossible de préparer l’envoi vers Cloudflare R2."));
  }
  if (data?.error) throw new Error(String(data.error));
  if (!data?.uploadUrl) throw new Error("URL d’upload R2 indisponible.");

  const response = await fetch(file.uri);
  const arrayBuffer = await response.arrayBuffer();
  const uploadResponse = await fetch(data.uploadUrl, {
    method: "PUT",
    body: arrayBuffer,
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `L’envoi du fichier vers Cloudflare R2 a échoué (${uploadResponse.status}). Vérifiez les clés R2 et les permissions du token.`
    );
  }

  return objectKey;
}

export async function getBookAssetUrl(bookId: string, assetType: "file" | "cover"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("r2-books", {
    body: {
      action: "createDownloadUrl",
      bookId,
      assetType,
    },
  });

  if (error) {
    throw new Error(getFunctionErrorMessage(error, "Impossible de préparer le lien du fichier."));
  }
  if (data?.error) throw new Error(String(data.error));
  if (!data?.url) throw new Error("Lien du fichier indisponible.");
  return data.url;
}

export async function saveBook(input: SaveBookInput): Promise<LibraryBook> {
  const payload = {
    created_by: input.userId,
    title: input.title.trim(),
    author: input.author?.trim() || null,
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    language: input.language.trim() || "fr",
    target_scope: input.targetScope,
    status: input.status,
    is_downloadable: input.isDownloadable,
    file_type: input.fileType,
    file_name: input.fileName ?? null,
    file_size: input.fileSize ?? null,
    cover_object_key: input.coverObjectKey ?? null,
    file_object_key: input.fileObjectKey,
  };

  const query = input.id
    ? supabase.from(BOOKS_TABLE).update(payload).eq("id", input.id)
    : supabase.from(BOOKS_TABLE).insert(payload);

  const { data, error } = await query.select(BOOK_SELECT).single();
  if (error) throw error;

  const book = mapRow(data as LibraryBookRow);
  if (!book) throw new Error("Livre introuvable après enregistrement.");
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from(BOOKS_TABLE).delete().eq("id", id);
  if (error) throw error;
}
