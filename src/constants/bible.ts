import enBibleRaw from "../data/en_kjv.json";
import frBibleRaw from "../data/fr_sg.json";

/* ================= TYPES ================= */

export type BibleVerses = Record<string, string>;
export type BibleChapters = Record<string, BibleVerses>;
export type BibleBooks = Record<string, BibleChapters>;

export type BibleVersion = "fr" | "en";

/* ================= DATA ================= */

const frBible = frBibleRaw as BibleBooks;
const enBible = enBibleRaw as BibleBooks;

export const BIBLES: Record<BibleVersion, BibleBooks> = {
  fr: frBible,
  en: enBible,
};

/**
 * ⚠️ Bible active
 * (plus tard tu pourras la rendre dynamique avec un Context)
 */
export const BIBLE: BibleBooks = BIBLES.fr;

/* ================= BOOK ACCESS ================= */

/**
 * Tous les livres, dans l’ordre EXACT du JSON
 * (important pour la séparation Ancien / Nouveau)
 */
export const getBooks = (): string[] => {
  return Object.keys(BIBLE);
};

/* ================= TESTAMENTS ================= */

/**
 * Nombre canonique de livres de l’Ancien Testament
 * (valable pour toutes les langues)
 */
const OLD_TESTAMENT_COUNT = 39;

/**
 * Ancien Testament = 39 premiers livres
 */
export const isOldTestament = (bookId: string): boolean => {
  const books = getBooks();
  const index = books.indexOf(bookId);
  return index !== -1 && index < OLD_TESTAMENT_COUNT;
};

/**
 * Nouveau Testament = livres après les 39 premiers
 */
export const isNewTestament = (bookId: string): boolean => {
  const books = getBooks();
  const index = books.indexOf(bookId);
  return index >= OLD_TESTAMENT_COUNT;
};

/* ================= CHAPTER / VERSE ACCESS ================= */

/**
 * Chapitres d’un livre (ex: ["1","2","3"])
 */
export const getChapters = (bookId: string): string[] => {
  return Object.keys(BIBLE[bookId] ?? {});
};

/**
 * Versets d’un chapitre
 */
export const getVerses = (
  bookId: string,
  chapterId: string
): BibleVerses => {
  return BIBLE[bookId]?.[chapterId] ?? {};
};
