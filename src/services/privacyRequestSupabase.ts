import { supabase } from "@/supabaseClient";

export type PrivacyRequestType = "access" | "rectification" | "deletion" | "restriction" | "other";
export type PrivacyRequestStatus = "new" | "in_review" | "completed" | "rejected" | "archived";

export type PrivacyRequest = {
  id: string;
  user_id: string;
  request_type: PrivacyRequestType;
  message: string;
  status: PrivacyRequestStatus;
  admin_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listMyPrivacyRequests() {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PrivacyRequest[];
}

export async function createPrivacyRequest(input: {
  userId: string;
  requestType: PrivacyRequestType;
  message: string;
}) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      user_id: input.userId,
      request_type: input.requestType,
      message: input.message.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as PrivacyRequest;
}

export async function listAdminPrivacyRequests() {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PrivacyRequest[];
}

export async function updatePrivacyRequestStatus(input: {
  id: string;
  status: PrivacyRequestStatus;
  adminNote?: string;
  handledBy: string;
}) {
  const isHandled = input.status === "completed" || input.status === "rejected" || input.status === "archived";

  const { data, error } = await supabase
    .from("privacy_requests")
    .update({
      status: input.status,
      admin_note: input.adminNote?.trim() || null,
      handled_by: isHandled ? input.handledBy : null,
      handled_at: isHandled ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as PrivacyRequest;
}
