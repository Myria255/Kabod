export type ReadingProgress = {
  completed: boolean;
  completedAt?: string; // ISO date
};

export type AnnualReadingProgress = {
  [day: number]: ReadingProgress;
};
