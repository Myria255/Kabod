import { supabase } from "@/supabaseClient";

const CHURCH_EVENTS_TABLE = "church_events";

export type ChurchEventStatus = "draft" | "published";

export type ChurchEventRecord = {
  id: string | null;
  title: string;
  description: string;
  location: string;
  eventDate: string | null;
  registrationUrl: string | null;
  status: ChurchEventStatus;
  updatedAt: string | null;
};

type ChurchEventRow = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  event_date?: string | null;
  registration_url?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

function mapRow(row: ChurchEventRow | null | undefined): ChurchEventRecord | null {
  if (!row) return null;

  return {
    id: typeof row.id === "string" ? row.id : null,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    location: typeof row.location === "string" ? row.location : "",
    eventDate: typeof row.event_date === "string" ? row.event_date : null,
    registrationUrl: typeof row.registration_url === "string" ? row.registration_url : null,
    status: row.status === "published" ? "published" : "draft",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function getChurchEvents(limit = 100): Promise<ChurchEventRecord[]> {
  const { data, error } = await supabase
    .from(CHURCH_EVENTS_TABLE)
    .select("id, title, description, location, event_date, registration_url, status, updated_at")
    .order("event_date", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as ChurchEventRow))
    .filter((row): row is ChurchEventRecord => row !== null);
}

type SaveChurchEventInput = {
  id?: string | null;
  userId: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  registrationUrl?: string | null;
  status: ChurchEventStatus;
};

export async function saveChurchEvent(input: SaveChurchEventInput): Promise<ChurchEventRecord> {
  const payload = {
    title: input.title,
    description: input.description,
    location: input.location,
    event_date: input.eventDate,
    registration_url: input.registrationUrl ?? null,
    status: input.status,
    created_by: input.userId,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from(CHURCH_EVENTS_TABLE)
      .update(payload)
      .eq("id", input.id)
      .select("id, title, description, location, event_date, registration_url, status, updated_at")
      .single();

    if (error) throw error;
    return mapRow(data as ChurchEventRow)!;
  }

  const { data, error } = await supabase
    .from(CHURCH_EVENTS_TABLE)
    .insert(payload)
    .select("id, title, description, location, event_date, registration_url, status, updated_at")
    .single();

  if (error) throw error;
  return mapRow(data as ChurchEventRow)!;
}

export async function deleteChurchEvent(id: string): Promise<void> {
  const { error } = await supabase.from(CHURCH_EVENTS_TABLE).delete().eq("id", id);
  if (error) throw error;
}
