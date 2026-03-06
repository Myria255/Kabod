import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";

const READING_PROGRESS_CACHE_KEY = "READING_PROGRESS_CACHE_V1";
const READING_PROGRESS_PENDING_KEY = "READING_PROGRESS_PENDING_V1";
const TABLE_PROGRESSION_LECTURE = "progression_lecture";

type PendingProgressItem = {
  userId: string;
  planType: string;
  day: number;
  completedAt: string;
};

function buildCacheKey(userId: string, planType: string) {
  return `${READING_PROGRESS_CACHE_KEY}:${userId}:${planType}`;
}

async function getPendingProgress(): Promise<PendingProgressItem[]> {
  const raw = await AsyncStorage.getItem(READING_PROGRESS_PENDING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PendingProgressItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setPendingProgress(items: PendingProgressItem[]) {
  await AsyncStorage.setItem(READING_PROGRESS_PENDING_KEY, JSON.stringify(items));
}

export async function enqueuePendingProgress(
  userId: string,
  planType: string,
  day: number,
  completedAt = new Date().toISOString()
) {
  const pending = await getPendingProgress();
  const key = `${userId}:${planType}:${day}`;
  const filtered = pending.filter(
    (item) => `${item.userId}:${item.planType}:${item.day}` !== key
  );
  filtered.push({ userId, planType, day, completedAt });
  await setPendingProgress(filtered);
}

export async function flushPendingProgress(
  userId?: string,
  planType?: string
): Promise<void> {
  const pending = await getPendingProgress();
  if (pending.length === 0) return;

  const toFlush = pending.filter((item) => {
    if (userId && item.userId !== userId) return false;
    if (planType && item.planType !== planType) return false;
    return true;
  });
  if (toFlush.length === 0) return;

  const { error } = await supabase.from(TABLE_PROGRESSION_LECTURE).upsert(
    toFlush.map((item) => ({
      utilisateur_id: item.userId,
      plan: item.planType,
      numero: item.day,
      valide: true,
      date_validation: item.completedAt,
    })),
    { onConflict: "utilisateur_id,plan,numero" }
  );

  if (error) return;

  const flushedKeys = new Set(
    toFlush.map((item) => `${item.userId}:${item.planType}:${item.day}`)
  );
  const remaining = pending.filter(
    (item) => !flushedKeys.has(`${item.userId}:${item.planType}:${item.day}`)
  );
  await setPendingProgress(remaining);
}

export async function upsertLocalCompletedDay(
  userId: string,
  planType: string,
  day: number
) {
  const key = buildCacheKey(userId, planType);
  const raw = await AsyncStorage.getItem(key);
  const current = raw ? (JSON.parse(raw) as number[]) : [];
  const merged = [...new Set([...current, day])].sort((a, b) => a - b);
  await AsyncStorage.setItem(key, JSON.stringify(merged));
}

export async function getLocalCompletedDays(
  userId: string,
  planType: string
): Promise<number[]> {
  const key = buildCacheKey(userId, planType);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as number[];
    return [...new Set(parsed)].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export async function getCompletedDays(
  userId: string,
  planType: string
): Promise<number[]> {
  await flushPendingProgress(userId, planType);
  const local = await getLocalCompletedDays(userId, planType);

  const { data, error } = await supabase
    .from(TABLE_PROGRESSION_LECTURE)
    .select("numero")
    .eq("utilisateur_id", userId)
    .eq("plan", planType)
    .eq("valide", true);

  if (error || !data) {
    return local;
  }

  const remote = data.map((d: any) => d.numero as number);
  const merged = [...new Set([...remote, ...local])].sort((a, b) => a - b);
  const remoteSet = new Set(remote);
  const missingRemote = local.filter((day) => !remoteSet.has(day));

  if (missingRemote.length > 0) {
    const nowIso = new Date().toISOString();
    const { error: missingError } = await supabase.from(TABLE_PROGRESSION_LECTURE).upsert(
      missingRemote.map((day) => ({
        utilisateur_id: userId,
        plan: planType,
        numero: day,
        valide: true,
        date_validation: nowIso,
      })),
      { onConflict: "utilisateur_id,plan,numero" }
    );
    if (missingError) {
      for (const day of missingRemote) {
        await enqueuePendingProgress(userId, planType, day, nowIso);
      }
    }
  }

  await AsyncStorage.setItem(buildCacheKey(userId, planType), JSON.stringify(merged));
  return merged;
}
export function calculateProgress(
  completedDays: number[],
  totalDays: number
) {
  if (totalDays === 0) return 0;
  return Math.round((completedDays.length / totalDays) * 100);
}

