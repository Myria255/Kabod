export type ReadingDay = {
  day: number; // 1 → 365
  readings: {
    bookId: string;
    chapter: number;
  }[];
};

export const READING_PLAN: ReadingDay[] = [
  {
    day: 1,
    readings: [
      { bookId: "Genesis", chapter: 1 },
      { bookId: "Matthew", chapter: 1 },
    ],
  },
  {
    day: 2,
    readings: [
      { bookId: "Genesis", chapter: 2 },
      { bookId: "Matthew", chapter: 2 },
    ],
  },
  // ...
];
