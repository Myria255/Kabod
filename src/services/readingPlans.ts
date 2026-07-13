import { BIBLE } from "@/src/constants/bible";

export type MonthlyPlanItem = {
  mois: number;
  bookId: string;
  nombreChapitres: number;
};

const MONTHLY_BOOK_IDS = [
  "Jean",
  "Romains",
  "Psaume",
  "Proverbes",
  "Genèse",
  "Exode",
  "Matthieu",
  "Actes",
  "Éphésiens",
  "Hébreux",
  "Jacques",
  "Apocalypse",
];

export function getMonthlyReadingPlan(): MonthlyPlanItem[] {
  return MONTHLY_BOOK_IDS
    .filter((bookId) => BIBLE[bookId])
    .map((bookId, index) => ({
      mois: index + 1,
      bookId,
      nombreChapitres: Object.keys(BIBLE[bookId]).length,
    }));
}
