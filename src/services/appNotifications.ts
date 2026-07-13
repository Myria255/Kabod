import { supabase } from "@/supabaseClient";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  route: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const TABLE = "app_notifications";

export async function getMyAppNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, user_id, title, body, notification_type, route, data, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function getUnreadAppNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function markAppNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) throw error;
}

export async function markAllAppNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw error;
}
