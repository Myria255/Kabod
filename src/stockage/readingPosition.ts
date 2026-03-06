import AsyncStorage from "@react-native-async-storage/async-storage";
import { BIBLE } from "@/src/constants/bible";
import { supabase } from "@/supabaseClient";

const TABLE_PROGRESSION_LECTURE = "progression_lecture";
const READING_POSITION_KEY = "READING_POSITION_V1";
const POSITION_BASE = 500000;
const CHAPTER_BLOCK = 200;
const BOOK_IDS = Object.keys(BIBLE);

function buildPositionKey(userId: string, bookId: string) {
  return `${READING_POSITION_KEY}:${userId}:${bookId}`;
}

function getBookOrder(bookId: string): number | null {
  const idx = BOOK_IDS.indexOf(bookId);
  if (idx < 0) return null;
  return idx + 1;
}

function encodePositionDay(bookId: string, chapter: number): number | null {
  const order = getBookOrder(bookId);
  if (!order) return null;
  if (!Number.isFinite(chapter) || chapter < 1 || chapter >= CHAPTER_BLOCK) return null;
  return POSITION_BASE + order * CHAPTER_BLOCK + Math.floor(chapter);
}

function decodePositionDay(day: number): { bookId: string; chapter: number } | null {
  if (!Number.isFinite(day) || day < POSITION_BASE) return null;
  const val = day - POSITION_BASE;
  const order = Math.floor(val / CHAPTER_BLOCK);
  const chapter = val % CHAPTER_BLOCK;
  if (order < 1 || chapter < 1) return null;
  const bookId = BOOK_IDS[order - 1];
  if (!bookId) return null;
  return { bookId, chapter };
}

function getLegacyPlanTypeForBook(bookId: string) {
  return `last_chapter:${bookId}`;
}

export async function saveLastReadChapter(
  userId: string,
  bookId: string,
  chapter: number
) {
  if (!userId || !bookId || !Number.isFinite(chapter) || chapter < 1) return;
  const day = encodePositionDay(bookId, chapter);
  const completedAt = new Date().toISOString();
  const legacy = await supabase
    .from(TABLE_PROGRESSION_LECTURE)
    .upsert(
      {
        utilisateur_id: userId,
        plan: getLegacyPlanTypeForBook(bookId),
        numero: Math.floor(chapter),
        valide: true,
        date_validation: completedAt,
      },
      { onConflict: "utilisateur_id,plan,numero" }
    );

  if (!legacy.error) {
    await AsyncStorage.removeItem(buildPositionKey(userId, bookId));
    return;
  }

  if (day) {
    const { error: encodedError } = await supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .upsert(
        {
          utilisateur_id: userId,
          plan: "mensuel",
          numero: day,
          valide: true,
          date_validation: completedAt,
        },
        { onConflict: "utilisateur_id,plan,numero" }
      );
    if (!encodedError) {
      await AsyncStorage.removeItem(buildPositionKey(userId, bookId));
      return;
    }
  }

  await AsyncStorage.setItem(buildPositionKey(userId, bookId), String(chapter));
}

export async function getLastReadChapter(
  userId: string,
  bookId: string
): Promise<number | null> {
  if (!userId || !bookId) return null;
  const legacy = await supabase
    .from(TABLE_PROGRESSION_LECTURE)
    .select("numero, date_validation")
    .eq("utilisateur_id", userId)
    .eq("plan", getLegacyPlanTypeForBook(bookId))
    .eq("valide", true)
    .order("date_validation", { ascending: false })
    .limit(1);

  if (!legacy.error && legacy.data && legacy.data.length > 0) {
    const chapter = Number(legacy.data[0].numero);
    if (Number.isFinite(chapter) && chapter >= 1) {
      return Math.floor(chapter);
    }
  }

  const order = getBookOrder(bookId);
  if (!order) return null;
  const min = POSITION_BASE + order * CHAPTER_BLOCK + 1;
  const max = POSITION_BASE + order * CHAPTER_BLOCK + (CHAPTER_BLOCK - 1);

  const { data, error } = await supabase
    .from(TABLE_PROGRESSION_LECTURE)
    .select("numero")
    .eq("utilisateur_id", userId)
    .eq("plan", "mensuel")
    .eq("valide", true)
    .gte("numero", min)
    .lte("numero", max)
    .order("numero", { ascending: false })
    .limit(1);

  if (!error && data && data.length > 0) {
    const decoded = decodePositionDay(Number(data[0].numero));
    if (decoded && decoded.bookId === bookId) {
      return decoded.chapter;
    }
  }

  const raw = await AsyncStorage.getItem(buildPositionKey(userId, bookId));
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

export async function getLastReadChaptersForBooks(
  userId: string,
  bookIds: string[]
): Promise<Record<string, number>> {
  if (!userId || bookIds.length === 0) return {};

  const result: Record<string, number> = {};
  const targetBooks = new Set(bookIds);
  const legacyPlanTypes = bookIds.map((bookId) => getLegacyPlanTypeForBook(bookId));

  const [legacyResp, encodedResp] = await Promise.all([
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .select("plan, numero, date_validation")
      .eq("utilisateur_id", userId)
      .eq("valide", true)
      .in("plan", legacyPlanTypes)
      .order("date_validation", { ascending: false }),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .select("numero")
      .eq("utilisateur_id", userId)
      .eq("plan", "mensuel")
      .eq("valide", true)
      .gte("numero", POSITION_BASE),
  ]);

  if (!legacyResp.error && legacyResp.data) {
    legacyResp.data.forEach((row) => {
      const planType = String((row as any).plan ?? "");
      if (!planType.startsWith("last_chapter:")) return;
      const bookId = planType.replace("last_chapter:", "");
      if (!bookId || !targetBooks.has(bookId) || result[bookId] !== undefined) return;
      const chapter = Number((row as any).numero);
      if (!Number.isFinite(chapter) || chapter < 1) return;
      result[bookId] = Math.floor(chapter);
    });
  }

  if (!encodedResp.error && encodedResp.data) {
    encodedResp.data.forEach((row) => {
      const decoded = decodePositionDay(Number((row as any).numero));
      if (!decoded) return;
      const { bookId, chapter } = decoded;
      if (!targetBooks.has(bookId)) return;
      if (result[bookId] === undefined || chapter > result[bookId]) {
        result[bookId] = chapter;
      }
    });
  }

  const missingBookIds = bookIds.filter((bookId) => result[bookId] === undefined);
  if (missingBookIds.length === 0) return result;

  const keys = missingBookIds.map((bookId) => buildPositionKey(userId, bookId));
  const values = await AsyncStorage.multiGet(keys);
  values.forEach(([, value], index) => {
    if (!value) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    result[missingBookIds[index]] = Math.floor(parsed);
  });

  return result;
}
