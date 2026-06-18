import { supabase } from "@/supabaseClient";

const LIVE_STREAMS_TABLE = "live_streams";

export type LiveStreamStatus = "draft" | "scheduled" | "live" | "terminated" | "replay";

export type LiveStreamRecord = {
  id: string | null;
  title: string;
  description: string;
  streamUrl: string | null;
  replayUrl: string | null;
  scheduledAt: string | null;
  status: LiveStreamStatus;
  updatedAt: string | null;
};

type LiveStreamRow = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  stream_url?: string | null;
  replay_url?: string | null;
  scheduled_at?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

function normalizeStatus(value: unknown): LiveStreamStatus {
  if (
    value === "scheduled" ||
    value === "live" ||
    value === "terminated" ||
    value === "replay"
  ) {
    return value;
  }
  return "draft";
}

function mapRow(row: LiveStreamRow | null | undefined): LiveStreamRecord | null {
  if (!row) return null;

  return {
    id: typeof row.id === "string" ? row.id : null,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    streamUrl: typeof row.stream_url === "string" ? row.stream_url : null,
    replayUrl: typeof row.replay_url === "string" ? row.replay_url : null,
    scheduledAt: typeof row.scheduled_at === "string" ? row.scheduled_at : null,
    status: normalizeStatus(row.status),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function getLiveStreams(limit = 100): Promise<LiveStreamRecord[]> {
  const { data, error } = await supabase
    .from(LIVE_STREAMS_TABLE)
    .select("id, title, description, stream_url, replay_url, scheduled_at, status, updated_at")
    .order("scheduled_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRow(row as LiveStreamRow))
    .filter((row): row is LiveStreamRecord => row !== null);
}

type SaveLiveStreamInput = {
  id?: string | null;
  userId: string;
  title: string;
  description: string;
  streamUrl?: string | null;
  replayUrl?: string | null;
  scheduledAt: string;
  status: LiveStreamStatus;
};

export async function saveLiveStream(input: SaveLiveStreamInput): Promise<LiveStreamRecord> {
  const payload = {
    title: input.title,
    description: input.description,
    stream_url: input.streamUrl ?? null,
    replay_url: input.replayUrl ?? null,
    scheduled_at: input.scheduledAt,
    status: input.status,
    created_by: input.userId,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from(LIVE_STREAMS_TABLE)
      .update(payload)
      .eq("id", input.id)
      .select("id, title, description, stream_url, replay_url, scheduled_at, status, updated_at")
      .single();

    if (error) throw error;
    return mapRow(data as LiveStreamRow)!;
  }

  const { data, error } = await supabase
    .from(LIVE_STREAMS_TABLE)
    .insert(payload)
    .select("id, title, description, stream_url, replay_url, scheduled_at, status, updated_at")
    .single();

  if (error) throw error;
  return mapRow(data as LiveStreamRow)!;
}

export async function deleteLiveStream(id: string): Promise<void> {
  const { error } = await supabase.from(LIVE_STREAMS_TABLE).delete().eq("id", id);
  if (error) throw error;
}
