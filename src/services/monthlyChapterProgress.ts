import { BIBLE } from "@/src/constants/bible";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";

const TABLE_PROGRESSION_LECTURE = "progression_lecture";
const CHAPTER_PROGRESS_BASE = 10000;
const POSITION_BASE = 500000;
const CHAPTER_BLOCK = 200;
const BOOK_IDS = Object.keys(BIBLE);
const LEGACY_MONTHLY_READ_KEY = "MONTHLY_BOOK_READ_V1";
const READING_PROGRESS_CACHE_KEY = "READING_PROGRESS_CACHE_V1";
const READING_POSITION_KEY = "READING_POSITION_V1";

async function saveLocalChapterRead(userId: string, bookId: string, chapter: number) {
  const key = `${LEGACY_MONTHLY_READ_KEY}:${userId}:${bookId}`;
  const raw = await AsyncStorage.getItem(key);
  let map: Record<string, boolean> = {};
  if (raw) {
    try {
      map = JSON.parse(raw) as Record<string, boolean>;
    } catch {
      map = {};
    }
  }
  map[String(Math.floor(chapter))] = true;
  await AsyncStorage.setItem(key, JSON.stringify(map));
}

async function getLocalReadChapters(
  userId: string,
  bookId: string
): Promise<Set<number>> {
  const key = `${LEGACY_MONTHLY_READ_KEY}:${userId}:${bookId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return new Set<number>();
  try {
    const map = JSON.parse(raw) as Record<string, boolean>;
    return new Set(
      Object.entries(map)
        .filter(([, isRead]) => Boolean(isRead))
        .map(([chapter]) => Number(chapter))
        .filter((chapter) => Number.isFinite(chapter) && chapter >= 1)
        .map((chapter) => Math.floor(chapter))
    );
  } catch {
    return new Set<number>();
  }
}

async function getLocalReadChaptersForBooks(
  userId: string,
  bookIds: string[]
): Promise<Record<string, Set<number>>> {
  const result: Record<string, Set<number>> = {};
  if (!userId || bookIds.length === 0) return result;

  const keys = bookIds.map((bookId) => `${LEGACY_MONTHLY_READ_KEY}:${userId}:${bookId}`);
  const values = await AsyncStorage.multiGet(keys);

  values.forEach(([, raw], index) => {
    const bookId = bookIds[index];
    if (!bookId) return;
    if (!raw) {
      result[bookId] = new Set<number>();
      return;
    }
    try {
      const map = JSON.parse(raw) as Record<string, boolean>;
      result[bookId] = new Set(
        Object.entries(map)
          .filter(([, isRead]) => Boolean(isRead))
          .map(([chapter]) => Number(chapter))
          .filter((chapter) => Number.isFinite(chapter) && chapter >= 1)
          .map((chapter) => Math.floor(chapter))
      );
    } catch {
      result[bookId] = new Set<number>();
    }
  });

  return result;
}

function getBookOrder(bookId: string): number | null {
  const idx = BOOK_IDS.indexOf(bookId);
  if (idx < 0) return null;
  return idx + 1;
}

function encodeMonthlyChapterDay(bookId: string, chapter: number): number | null {
  const order = getBookOrder(bookId);
  if (!order) return null;
  if (!Number.isFinite(chapter) || chapter < 1 || chapter >= CHAPTER_BLOCK) return null;
  return CHAPTER_PROGRESS_BASE + order * CHAPTER_BLOCK + Math.floor(chapter);
}

function decodeMonthlyChapterDay(day: number): { bookId: string; chapter: number } | null {
  if (!Number.isFinite(day)) return null;
  if (day < CHAPTER_PROGRESS_BASE || day >= POSITION_BASE) return null;
  const val = day - CHAPTER_PROGRESS_BASE;
  const order = Math.floor(val / CHAPTER_BLOCK);
  const chapter = val % CHAPTER_BLOCK;
  if (order < 1 || chapter < 1) return null;
  const bookId = BOOK_IDS[order - 1];
  if (!bookId) return null;
  return { bookId, chapter };
}

function getLegacyPlanTypeForBook(bookId: string) {
  return `mensuel_book:${bookId}`;
}

export async function markMonthlyChapterAsRead(
  userId: string,
  bookId: string,
  chapter: number
) {
  if (!userId || !bookId || !Number.isFinite(chapter) || chapter < 1) return;
  await saveLocalChapterRead(userId, bookId, chapter);
  const legacy = await supabase.from(TABLE_PROGRESSION_LECTURE).upsert(
    {
      utilisateur_id: userId,
      plan: getLegacyPlanTypeForBook(bookId),
      numero: Math.floor(chapter),
      valide: true,
      date_validation: new Date().toISOString(),
    },
    { onConflict: "utilisateur_id,plan,numero" }
  );

  if (!legacy.error) return;

  const encodedDay = encodeMonthlyChapterDay(bookId, chapter);
  if (!encodedDay) return;

  await supabase.from(TABLE_PROGRESSION_LECTURE).upsert(
    {
      utilisateur_id: userId,
      plan: "mensuel",
      numero: encodedDay,
      valide: true,
      date_validation: new Date().toISOString(),
    },
    { onConflict: "utilisateur_id,plan,numero" }
  );
}

export async function getMonthlyChaptersProgressForBooks(
  userId: string,
  books: Array<{ bookId: string; total: number }>
): Promise<Record<string, { read: number; total: number; percent: number }>> {
  const result: Record<string, { read: number; total: number; percent: number }> = {};
  if (!userId || books.length === 0) return result;

  const targetBooks = new Set(books.map((item) => item.bookId));
  const legacyPlanTypes = books.map((item) => getLegacyPlanTypeForBook(item.bookId));
  const [encodedResp, legacyResp] = await Promise.all([
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .select("plan, numero")
      .eq("utilisateur_id", userId)
      .eq("valide", true)
      .eq("plan", "mensuel")
      .gte("numero", CHAPTER_PROGRESS_BASE)
      .lt("numero", POSITION_BASE),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .select("plan, numero")
      .eq("utilisateur_id", userId)
      .eq("valide", true)
      .in("plan", legacyPlanTypes),
  ]);

  const data = [
    ...((encodedResp.data ?? []) as Array<{ plan: string; numero: number }>),
    ...((legacyResp.data ?? []) as Array<{ plan: string; numero: number }>),
  ];
  const hasDataError = Boolean(encodedResp.error) && Boolean(legacyResp.error);

  const readDaysByBook: Record<string, Set<number>> = {};
  books.forEach((item) => {
    readDaysByBook[item.bookId] = new Set<number>();
  });

  if (!hasDataError && data.length > 0) {
    data.forEach((row) => {
      const planType = String(row.plan ?? "");
      let bookId = "";
      let chapter = 0;

      if (planType.startsWith("mensuel_book:")) {
        bookId = planType.replace("mensuel_book:", "");
        chapter = Math.floor(Number(row.numero));
      } else {
        const decoded = decodeMonthlyChapterDay(Number(row.numero));
        if (!decoded) return;
        bookId = decoded.bookId;
        chapter = decoded.chapter;
      }

      if (!targetBooks.has(bookId)) return;
      if (!readDaysByBook[bookId]) return;
      readDaysByBook[bookId].add(chapter);
    });
  }

  // Fallback local en complement pour ne pas perdre l'affichage en cas de souci BD.
  const localByBook = await getLocalReadChaptersForBooks(
    userId,
    books.map((item) => item.bookId)
  );
  books.forEach((item) => {
    const localSet = localByBook[item.bookId] ?? new Set<number>();
    localSet.forEach((chapter) => readDaysByBook[item.bookId].add(chapter));
  });

  books.forEach((item) => {
    const read = readDaysByBook[item.bookId]?.size ?? 0;
    const total = item.total;
    const percent = total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0;
    result[item.bookId] = { read, total, percent };
  });

  return result;
}

export async function getMonthlyReadCountForBook(
  userId: string,
  bookId: string
): Promise<number> {
  if (!userId || !bookId) return 0;
  const order = getBookOrder(bookId);
  const min = order ? CHAPTER_PROGRESS_BASE + order * CHAPTER_BLOCK + 1 : CHAPTER_PROGRESS_BASE;
  const max = order ? CHAPTER_PROGRESS_BASE + order * CHAPTER_BLOCK + (CHAPTER_BLOCK - 1) : POSITION_BASE - 1;
  const [encodedResp, legacyResp] = await Promise.all([
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .select("plan, numero")
      .eq("utilisateur_id", userId)
      .eq("plan", "mensuel")
      .eq("valide", true)
      .gte("numero", min)
      .lte("numero", max),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .select("plan, numero")
      .eq("utilisateur_id", userId)
      .eq("plan", getLegacyPlanTypeForBook(bookId))
      .eq("valide", true),
  ]);

  const data = [
    ...((encodedResp.data ?? []) as Array<{ plan: string; numero: number }>),
    ...((legacyResp.data ?? []) as Array<{ plan: string; numero: number }>),
  ];

  if (Boolean(encodedResp.error) && Boolean(legacyResp.error)) return 0;
  const fromDb = new Set(
    data
      .map((row) => {
        const planType = String(row.plan ?? "");
        if (planType.startsWith("mensuel_book:")) {
          const fromPlan = planType.replace("mensuel_book:", "");
          if (fromPlan !== bookId) return null;
          const chapter = Number(row.numero);
          return Number.isFinite(chapter) && chapter >= 1 ? Math.floor(chapter) : null;
        }
        const decoded = decodeMonthlyChapterDay(Number(row.numero));
        if (!decoded || decoded.bookId !== bookId) return null;
        return decoded.chapter;
      })
      .filter((chapter): chapter is number => chapter !== null)
  );
  const fromLocal = await getLocalReadChapters(userId, bookId);
  fromLocal.forEach((chapter) => fromDb.add(chapter));
  return fromDb.size;
}

export async function migrateLegacyMonthlyProgressToDb(
  userId: string,
  books: Array<{ bookId: string }>
) {
  if (!userId || books.length === 0) return;

  const payloadEncoded: Array<{
    utilisateur_id: string;
    plan: string;
    numero: number;
    valide: boolean;
    date_validation: string;
  }> = [];
  const payloadLegacy: Array<{
    utilisateur_id: string;
    plan: string;
    numero: number;
    valide: boolean;
    date_validation: string;
  }> = [];

  const keys = books.map((item) => `${LEGACY_MONTHLY_READ_KEY}:${userId}:${item.bookId}`);
  const values = await AsyncStorage.multiGet(keys);

  for (let index = 0; index < books.length; index++) {
    const item = books[index];
    const raw = values[index]?.[1];
    if (!raw || !item) continue;

    let map: Record<string, boolean> = {};
    try {
      map = JSON.parse(raw) as Record<string, boolean>;
    } catch {
      map = {};
    }

    Object.entries(map).forEach(([chapterRaw, isRead]) => {
      if (!isRead) return;
      const chapter = Number(chapterRaw);
      if (!Number.isFinite(chapter) || chapter < 1) return;
      payloadLegacy.push({
        utilisateur_id: userId,
        plan: getLegacyPlanTypeForBook(item.bookId),
        numero: Math.floor(chapter),
        valide: true,
        date_validation: new Date().toISOString(),
      });
      const encodedDay = encodeMonthlyChapterDay(item.bookId, chapter);
      if (!encodedDay) return;
      payloadEncoded.push({
        utilisateur_id: userId,
        plan: "mensuel",
        numero: encodedDay,
        valide: true,
        date_validation: new Date().toISOString(),
      });
    });
  }

  if (payloadLegacy.length > 0) {
    await supabase.from(TABLE_PROGRESSION_LECTURE).upsert(payloadLegacy, {
      onConflict: "utilisateur_id,plan,numero",
    });
  }

  if (payloadEncoded.length > 0) {
    await supabase.from(TABLE_PROGRESSION_LECTURE).upsert(payloadEncoded, {
      onConflict: "utilisateur_id,plan,numero",
    });
  }
}

export async function resetMonthlyBookProgress(
  userId: string,
  bookId: string,
  month: number
) {
  if (!userId || !bookId || !Number.isFinite(month) || month < 1 || month > 12) return;

  const order = getBookOrder(bookId);
  if (!order) return;
  const minEncodedChapter = CHAPTER_PROGRESS_BASE + order * CHAPTER_BLOCK + 1;
  const maxEncodedChapter = CHAPTER_PROGRESS_BASE + order * CHAPTER_BLOCK + (CHAPTER_BLOCK - 1);
  const minEncodedPosition = POSITION_BASE + order * CHAPTER_BLOCK + 1;
  const maxEncodedPosition = POSITION_BASE + order * CHAPTER_BLOCK + (CHAPTER_BLOCK - 1);
  const nowIso = new Date().toISOString();

  const results = await Promise.all([
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .update({ valide: false, date_validation: nowIso })
      .eq("utilisateur_id", userId)
      .eq("plan", getLegacyPlanTypeForBook(bookId))
      .eq("valide", true),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .update({ valide: false, date_validation: nowIso })
      .eq("utilisateur_id", userId)
      .eq("plan", `last_chapter:${bookId}`)
      .eq("valide", true),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .update({ valide: false, date_validation: nowIso })
      .eq("utilisateur_id", userId)
      .eq("plan", "mensuel")
      .eq("valide", true)
      .gte("numero", minEncodedChapter)
      .lte("numero", maxEncodedChapter),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .update({ valide: false, date_validation: nowIso })
      .eq("utilisateur_id", userId)
      .eq("plan", "mensuel")
      .eq("valide", true)
      .gte("numero", minEncodedPosition)
      .lte("numero", maxEncodedPosition),
    supabase
      .from(TABLE_PROGRESSION_LECTURE)
      .update({ valide: false, date_validation: nowIso })
      .eq("utilisateur_id", userId)
      .eq("plan", "mensuel")
      .eq("numero", Math.floor(month))
      .eq("valide", true),
    AsyncStorage.multiRemove([
      `${LEGACY_MONTHLY_READ_KEY}:${userId}:${bookId}`,
      `${READING_PROGRESS_CACHE_KEY}:${userId}:mensuel`,
      `${READING_POSITION_KEY}:${userId}:${bookId}`,
    ]),
  ]);

  const dbErrors = results
    .slice(0, 5)
    .map((r: any) => r?.error)
    .filter(Boolean);
  if (dbErrors.length > 0) {
    throw dbErrors[0];
  }
}
