import { supabase } from "@/supabaseClient";

const DAILY_PRAYER_TOPICS_TABLE = "daily_prayer_topics";

export type DailyPrayerTopicStatus = "draft" | "published";

export type DailyPrayerTopicRecord = {
  id: string | null;
  title: string;
  theme: string;
  message: string;
  topicDate: string | null;
  status: DailyPrayerTopicStatus;
  updatedAt: string | null;
};

type DailyPrayerTopicRow = {
  id?: string | null;
  title?: string | null;
  theme?: string | null;
  message?: string | null;
  topic_date?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

function normalizeStatus(value: unknown): DailyPrayerTopicStatus {
  return value === "published" ? "published" : "draft";
}

function mapRow(row: DailyPrayerTopicRow | null | undefined): DailyPrayerTopicRecord | null {
  if (!row) return null;

  return {
    id: typeof row.id === "string" ? row.id : null,
    title: typeof row.title === "string" ? row.title : "",
    theme: typeof row.theme === "string" ? row.theme : "",
    message: typeof row.message === "string" ? row.message : "",
    topicDate: typeof row.topic_date === "string" ? row.topic_date : null,
    status: normalizeStatus(row.status),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function getLatestDailyPrayerTopic(
  status?: DailyPrayerTopicStatus
): Promise<DailyPrayerTopicRecord | null> {
  let query = supabase
    .from(DAILY_PRAYER_TOPICS_TABLE)
    .select("id, title, theme, message, topic_date, status, updated_at")
    .order("topic_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return mapRow(data?.[0] as DailyPrayerTopicRow | undefined);
}

export async function getDailyPrayerTopics(limit = 100): Promise<DailyPrayerTopicRecord[]> {
  const { data, error } = await supabase
    .from(DAILY_PRAYER_TOPICS_TABLE)
    .select("id, title, theme, message, topic_date, status, updated_at")
    .order("topic_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as DailyPrayerTopicRow))
    .filter((row): row is DailyPrayerTopicRecord => row !== null);
}

type SaveDailyPrayerTopicInput = {
  id?: string | null;
  userId: string;
  title: string;
  theme: string;
  message: string;
  topicDate: string;
  status: DailyPrayerTopicStatus;
};

export async function saveDailyPrayerTopic(
  input: SaveDailyPrayerTopicInput
): Promise<DailyPrayerTopicRecord> {
  const payload = {
    title: input.title,
    theme: input.theme,
    message: input.message,
    topic_date: input.topicDate,
    status: input.status,
    created_by: input.userId,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from(DAILY_PRAYER_TOPICS_TABLE)
      .update(payload)
      .eq("id", input.id)
      .select("id, title, theme, message, topic_date, status, updated_at")
      .single();

    if (error) throw error;
    return mapRow(data as DailyPrayerTopicRow)!;
  }

  const { data, error } = await supabase
    .from(DAILY_PRAYER_TOPICS_TABLE)
    .insert(payload)
    .select("id, title, theme, message, topic_date, status, updated_at")
    .single();

  if (error) throw error;
  return mapRow(data as DailyPrayerTopicRow)!;
}

export async function deleteDailyPrayerTopic(id: string): Promise<void> {
  const { error } = await supabase
    .from(DAILY_PRAYER_TOPICS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
