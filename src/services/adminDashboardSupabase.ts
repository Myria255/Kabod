import { supabase } from "@/supabaseClient";

export type AdminDashboardCounts = {
  testimonies: number;
  supportRequests: number;
  donationIntents: number;
  privacyRequests: number;
  total: number;
};

export type AdminNotificationItem = {
  id: string;
  type: "testimony" | "support_request" | "donation_intent" | "privacy_request";
  title: string;
  description: string;
  createdAt: string;
  route: string;
  badge: string;
};

export type AdminSeenModule = "testimonies" | "supportRequests" | "donationIntents" | "privacyRequests";

async function countRows(table: string, column: string, value: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .is("admin_seen_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const [testimonies, supportRequests, donationIntents, privacyRequests] = await Promise.all([
    countRows("testimonies", "status", "pending"),
    countRows("support_requests", "status", "new"),
    countRows("donation_intents", "status", "new"),
    countRows("privacy_requests", "status", "new"),
  ]);

  return {
    testimonies,
    supportRequests,
    donationIntents,
    privacyRequests,
    total: testimonies + supportRequests + donationIntents + privacyRequests,
  };
}

export async function listAdminNotificationItems(): Promise<AdminNotificationItem[]> {
  const [testimoniesResult, supportResult, donationResult, privacyResult] = await Promise.all([
    supabase
      .from("testimonies")
      .select("id,title,author_name,created_at")
      .eq("status", "pending")
      .is("admin_seen_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("support_requests")
      .select("id,title,request_type,created_at")
      .eq("status", "new")
      .is("admin_seen_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("donation_intents")
      .select("id,gift_type,amount,currency,created_at")
      .eq("status", "new")
      .is("admin_seen_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("privacy_requests")
      .select("id,request_type,created_at")
      .eq("status", "new")
      .is("admin_seen_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const firstError = testimoniesResult.error ?? supportResult.error ?? donationResult.error ?? privacyResult.error;
  if (firstError) throw firstError;

  const items: AdminNotificationItem[] = [
    ...(testimoniesResult.data ?? []).map((item) => ({
      id: item.id,
      type: "testimony" as const,
      title: item.title ?? "Nouveau témoignage",
      description: item.author_name ? `Envoyé par ${item.author_name}` : "Un membre a envoyé un témoignage à valider.",
      createdAt: item.created_at,
      route: "/admin-space/temoignages",
      badge: "Témoignage",
    })),
    ...(supportResult.data ?? []).map((item) => ({
      id: item.id,
      type: "support_request" as const,
      title: item.title ?? "Nouvelle requête",
      description: `Type : ${item.request_type ?? "demande"}`,
      createdAt: item.created_at,
      route: "/admin-space/requetes-soutien",
      badge: "Soutien",
    })),
    ...(donationResult.data ?? []).map((item) => ({
      id: item.id,
      type: "donation_intent" as const,
      title: "Nouvelle intention de don",
      description: `${item.gift_type ?? "don"} · ${item.amount ?? ""} ${item.currency ?? ""}`.trim(),
      createdAt: item.created_at,
      route: "/admin-space/dons",
      badge: "Don",
    })),
    ...(privacyResult.data ?? []).map((item) => ({
      id: item.id,
      type: "privacy_request" as const,
      title: "Nouvelle demande RGPD",
      description: `Demande : ${item.request_type ?? "données personnelles"}`,
      createdAt: item.created_at,
      route: "/admin-space/donnees-rgpd",
      badge: "RGPD",
    })),
  ];

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markAdminModuleSeen(module: AdminSeenModule) {
  const seenAt = new Date().toISOString();

  if (module === "testimonies") {
    const { error } = await supabase
      .from("testimonies")
      .update({ admin_seen_at: seenAt })
      .eq("status", "pending")
      .is("admin_seen_at", null);
    if (error) throw error;
    return;
  }

  if (module === "supportRequests") {
    const { error } = await supabase
      .from("support_requests")
      .update({ admin_seen_at: seenAt })
      .eq("status", "new")
      .is("admin_seen_at", null);
    if (error) throw error;
    return;
  }

  if (module === "donationIntents") {
    const { error } = await supabase
      .from("donation_intents")
      .update({ admin_seen_at: seenAt })
      .eq("status", "new")
      .is("admin_seen_at", null);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("privacy_requests")
    .update({ admin_seen_at: seenAt })
    .eq("status", "new")
    .is("admin_seen_at", null);
  if (error) throw error;
}

export async function markAdminRouteSeen(route: string) {
  if (route === "/admin-space/temoignages") return markAdminModuleSeen("testimonies");
  if (route === "/admin-space/requetes-soutien") return markAdminModuleSeen("supportRequests");
  if (route === "/admin-space/dons") return markAdminModuleSeen("donationIntents");
  if (route === "/admin-space/donnees-rgpd") return markAdminModuleSeen("privacyRequests");
}
