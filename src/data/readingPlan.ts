// src/constants/readingPlans.ts

import { BIBLE } from "@/src/constants/bible";

export type ReadingItem = {
  bookId: string;
  chapter: number;
};

export function getAllBibleChapters(): ReadingItem[] {
  const result: ReadingItem[] = [];

  Object.entries(BIBLE).forEach(([bookId, chapters]) => {
    Object.keys(chapters).forEach((chapter) => {
      result.push({
        bookId,
        chapter: Number(chapter),
      });
    });
  });

  return result;
}
