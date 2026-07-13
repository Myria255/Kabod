import { supabase } from "@/supabaseClient";

const TABLE = "support_requests";

export type SupportRequestType = "prayer" | "support" | "counseling" | "other";
export type SupportRequestStatus = "new" | "in_progress" | "resolved" | "archived";

export type SupportRequest = {
  id: string;
  createdBy: string;
  requestType: SupportRequestType;
  title: string;
  message: string;
  status: SupportRequestStatus;
  isPrivate: boolean;
  adminNote: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SupportRequestRow = {
  id?: string | null;
  created_by?: string | null;
  request_type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  is_private?: boolean | null;
  admin_note?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CreateSupportRequestInput = {
  userId: string;
  requestType: SupportRequestType;
  title: string;
  message: string;
  isPrivate: boolean;
};

type UpdateSupportRequestInput = {
  id: string;
  status: SupportRequestStatus;
  adminNote?: string | null;
  handledBy?: string | null;
};

const SELECT =
  "id, created_by, request_type, title, message, status, is_private, admin_note, handled_by, handled_at, created_at, updated_at";

function normalizeType(value: unknown): SupportRequestType {
  if (value === "support" || value === "counseling" || value === "other") return value;
  return "prayer";
}

function normalizeStatus(value: unknown): SupportRequestStatus {
  if (value === "in_progress" || value === "resolved" || value === "archived") return value;
  return "new";
}

function mapRow(row: SupportRequestRow | null | undefined): SupportRequest | null {
  if (!row?.id || !row.created_by) return null;
  return {
    id: row.id,
    createdBy: row.created_by,
    requestType: normalizeType(row.request_type),
    title: row.title ?? "",
    message: row.message ?? "",
    status: normalizeStatus(row.status),
    isPrivate: row.is_private !== false,
    adminNote: row.admin_note ?? null,
    handledBy: row.handled_by ?? null,
    handledAt: row.handled_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function requestTypeLabel(type: SupportRequestType) {
  if (type === "support") return "Soutien";
  if (type === "counseling") return "Accompagnement";
  if (type === "other") return "Autre";
  return "Prière";
}

export function requestStatusLabel(status: SupportRequestStatus) {
  if (status === "in_progress") return "En cours";
  if (status === "resolved") return "Traitée";
  if (status === "archived") return "Archivée";
  return "Nouvelle";
}

export async function createSupportRequest(input: CreateSupportRequestInput): Promise<SupportRequest> {
  const payload = {
    created_by: input.userId,
    request_type: input.requestType,
    title: input.title.trim(),
    message: input.message.trim(),
    is_private: input.isPrivate,
    status: "new",
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select(SELECT).single();
  if (error) throw error;

  const request = mapRow(data as SupportRequestRow);
  if (!request) throw new Error("Requête introuvable après envoi.");
  return request;
}

export async function getMySupportRequests(): Promise<SupportRequest[]> {
  const { data, error } = await supabase.from(TABLE).select(SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapRow(row as SupportRequestRow))
    .filter((row): row is SupportRequest => row !== null);
}

export async function getAdminSupportRequests(): Promise<SupportRequest[]> {
  const { data, error } = await supabase.from(TABLE).select(SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapRow(row as SupportRequestRow))
    .filter((row): row is SupportRequest => row !== null);
}

export async function updateSupportRequest(input: UpdateSupportRequestInput): Promise<SupportRequest> {
  const payload = {
    status: input.status,
    admin_note: input.adminNote?.trim() || null,
    handled_by: input.handledBy ?? null,
    handled_at: input.status === "resolved" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from(TABLE).update(payload).eq("id", input.id).select(SELECT).single();
  if (error) throw error;

  const request = mapRow(data as SupportRequestRow);
  if (!request) throw new Error("Requête introuvable après mise à jour.");
  return request;
}
