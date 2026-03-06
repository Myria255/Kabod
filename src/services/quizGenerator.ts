import { getChapters, getVerses } from "@/src/constants/bible";

type ReadingTarget = {
  bookId: string;
  chapter: number;
};

export type ReliableQuizQuestion = {
  id: string;
  questionType:
    | "word"
    | "verse_number"
    | "verse_count"
    | "verse_ending"
    | "chapter_match";
  prompt: string;
  verseReference: string;
  verseWithBlank: string;
  options: string[];
  correctAnswer: string;
};

const STOP_WORDS = new Set([
  "dans",
  "avec",
  "pour",
  "plus",
  "mais",
  "que",
  "qui",
  "les",
  "des",
  "aux",
  "une",
  "son",
  "ses",
  "sur",
  "par",
  "est",
  "sont",
  "car",
  "pas",
  "vous",
  "nous",
  "ils",
  "elles",
  "comme",
  "tout",
  "tous",
  "leur",
  "leurs",
  "afin",
  "cela",
  "cette",
  "celui",
  "celle",
  "avait",
  "sera",
  "etre",
  "etait",
  "fait",
  "ainsi",
]);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tokenize(text: string): string[] {
  return text.match(/[A-Za-zÀ-ÿ'-]+/g) ?? [];
}

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-zà-ÿ'-]/gi, "");
}

function capitalizeBook(bookId: string): string {
  return bookId.charAt(0).toUpperCase() + bookId.slice(1);
}

function pickAnswerWord(words: string[]): string | null {
  const candidates = words
    .map((w) => normalize(w))
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

function maskWordInVerse(verse: string, answer: string): string {
  const regex = new RegExp(`\\b${answer}\\b`, "i");
  return verse.replace(regex, "____");
}

function buildDistractors(allWords: string[], answer: string, count: number): string[] {
  const pool = [...new Set(allWords.map((w) => normalize(w)).filter((w) => w.length >= 4))]
    .filter((w) => w !== answer && !STOP_WORDS.has(w));
  return shuffle(pool).slice(0, count);
}

function buildWordQuestion(target: ReadingTarget): ReliableQuizQuestion | null {
  const verses = getVerses(target.bookId, String(target.chapter));
  const verseEntries = Object.entries(verses)
    .map(([verseNum, text]) => ({ verseNum, text, words: tokenize(text) }))
    .filter((v) => v.words.length >= 6);

  if (verseEntries.length === 0) return null;

  const selected = verseEntries[Math.floor(Math.random() * verseEntries.length)];
  const answer = pickAnswerWord(selected.words);
  if (!answer) return null;

  const chapterWords = verseEntries.flatMap((v) => v.words);
  const distractors = buildDistractors(chapterWords, answer, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([answer, ...distractors]);
  const bookName = capitalizeBook(target.bookId);
  const ref = `${bookName} ${target.chapter}:${selected.verseNum}`;

  return {
    id: `${target.bookId}-${target.chapter}-${selected.verseNum}`,
    questionType: "word",
    prompt: `Quel mot manque dans ce verset ?`,
    verseReference: ref,
    verseWithBlank: maskWordInVerse(selected.text, answer),
    options,
    correctAnswer: answer,
  };
}

function buildVerseCountQuestion(target: ReadingTarget): ReliableQuizQuestion | null {
  const verses = getVerses(target.bookId, String(target.chapter));
  const count = Object.keys(verses).length;
  if (count <= 0) return null;

  const candidates = new Set<number>([count]);
  while (candidates.size < 4) {
    const delta = Math.floor(Math.random() * 11) - 5;
    candidates.add(Math.max(1, count + delta));
  }

  const options = shuffle(Array.from(candidates).map(String));
  const bookName = capitalizeBook(target.bookId);
  return {
    id: `${target.bookId}-${target.chapter}-count`,
    questionType: "verse_count",
    prompt: `Combien de versets contient ${bookName} ${target.chapter} ?`,
    verseReference: `${bookName} ${target.chapter}`,
    verseWithBlank: "Question de verification basee sur le chapitre lu.",
    options,
    correctAnswer: String(count),
  };
}

function buildVerseNumberQuestion(target: ReadingTarget): ReliableQuizQuestion | null {
  const verses = getVerses(target.bookId, String(target.chapter));
  const entries = Object.entries(verses)
    .map(([verseNum, text]) => ({ verseNum: Number(verseNum), text }))
    .filter((v) => Number.isFinite(v.verseNum) && v.text.trim().length >= 24);

  if (entries.length === 0) return null;

  const selected = entries[Math.floor(Math.random() * entries.length)];
  const tokens = tokenize(selected.text);
  const snippet = tokens.slice(0, Math.min(8, tokens.length)).join(" ");
  const answer = selected.verseNum;

  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = Math.floor(Math.random() * 9) - 4;
    set.add(Math.max(1, answer + delta));
  }

  const options = shuffle(Array.from(set)).map(String);
  const bookName = capitalizeBook(target.bookId);

  return {
    id: `${target.bookId}-${target.chapter}-${answer}-verse-num`,
    questionType: "verse_number",
    prompt: `Dans quel verset de ${bookName} ${target.chapter} trouve-t-on cet extrait ?`,
    verseReference: `${bookName} ${target.chapter}`,
    verseWithBlank: `"${snippet}..."`,
    options,
    correctAnswer: String(answer),
  };
}

function buildVerseEndingQuestion(target: ReadingTarget): ReliableQuizQuestion | null {
  const verses = getVerses(target.bookId, String(target.chapter));
  const entries = Object.entries(verses)
    .map(([verseNum, text]) => ({ verseNum, text, words: tokenize(text) }))
    .filter((v) => v.words.length >= 9);

  if (entries.length === 0) return null;
  const selected = entries[Math.floor(Math.random() * entries.length)];

  const splitIndex = Math.max(4, Math.min(8, Math.floor(selected.words.length / 2)));
  const start = selected.words.slice(0, splitIndex).join(" ");
  const answer = selected.words.slice(splitIndex).join(" ").trim();
  if (!answer || answer.length < 8) return null;

  const distractorPool = entries
    .filter((v) => v.verseNum !== selected.verseNum)
    .map((v) => v.words.slice(splitIndex).join(" ").trim())
    .filter((part) => part.length >= 8);

  const distractors = shuffle([...new Set(distractorPool)]).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([answer, ...distractors]);
  const bookName = capitalizeBook(target.bookId);
  const ref = `${bookName} ${target.chapter}:${selected.verseNum}`;

  return {
    id: `${target.bookId}-${target.chapter}-${selected.verseNum}-ending`,
    questionType: "verse_ending",
    prompt: `Quelle suite complete correctement ce verset ?`,
    verseReference: ref,
    verseWithBlank: `"${start} ..."`,
    options,
    correctAnswer: answer,
  };
}

function buildChapterMatchQuestion(target: ReadingTarget): ReliableQuizQuestion | null {
  const verses = getVerses(target.bookId, String(target.chapter));
  const entries = Object.entries(verses)
    .map(([verseNum, text]) => ({ verseNum, text, words: tokenize(text) }))
    .filter((v) => v.words.length >= 8);

  if (entries.length === 0) return null;
  const selected = entries[Math.floor(Math.random() * entries.length)];
  const snippet = selected.words.slice(0, Math.min(9, selected.words.length)).join(" ");

  const chapterNumbers = getChapters(target.bookId)
    .map((chapter) => Number(chapter))
    .filter((chapter) => Number.isFinite(chapter) && chapter >= 1)
    .sort((a, b) => a - b);
  if (chapterNumbers.length <= 1) return null;

  const answer = target.chapter;
  const nearby = chapterNumbers.filter((chapter) => chapter !== answer);
  const distractors: number[] = [];

  const offsets = [1, -1, 2, -2, 3, -3];
  offsets.forEach((offset) => {
    const candidate = answer + offset;
    if (nearby.includes(candidate) && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  });

  if (distractors.length < 3) {
    shuffle(nearby).forEach((candidate) => {
      if (distractors.length < 3 && !distractors.includes(candidate)) {
        distractors.push(candidate);
      }
    });
  }

  if (distractors.length < 3) return null;

  const options = shuffle([answer, ...distractors.slice(0, 3)]).map(String);
  const bookName = capitalizeBook(target.bookId);

  return {
    id: `${target.bookId}-${target.chapter}-${selected.verseNum}-chapter-match`,
    questionType: "chapter_match",
    prompt: `Dans quel chapitre de ${bookName} se trouve cet extrait ?`,
    verseReference: `${bookName}`,
    verseWithBlank: `"${snippet}..."`,
    options,
    correctAnswer: String(answer),
  };
}

export function generateReliableQuizForReadings(
  readings: ReadingTarget[],
  maxQuestions = 6
): ReliableQuizQuestion[] {
  const pool: ReliableQuizQuestion[] = [];

  for (const reading of readings) {
    const variants = [
      buildWordQuestion(reading),
      buildVerseNumberQuestion(reading),
      buildVerseCountQuestion(reading),
      buildVerseEndingQuestion(reading),
      buildChapterMatchQuestion(reading),
    ].filter((q): q is ReliableQuizQuestion => q !== null);
    pool.push(...variants);
  }

  const unique = new Map<string, ReliableQuizQuestion>();
  for (const q of pool) unique.set(q.id, q);
  const questions = shuffle(Array.from(unique.values()));
  const targetCount = Math.max(6, maxQuestions);

  const grouped: Record<ReliableQuizQuestion["questionType"], ReliableQuizQuestion[]> = {
    word: [],
    verse_number: [],
    verse_count: [],
    verse_ending: [],
    chapter_match: [],
  };
  questions.forEach((q) => grouped[q.questionType].push(q));

  const typeOrder = shuffle(Object.keys(grouped) as Array<ReliableQuizQuestion["questionType"]>);
  const selected: ReliableQuizQuestion[] = [];

  while (selected.length < targetCount) {
    let added = false;
    for (const type of typeOrder) {
      const bucket = grouped[type];
      if (bucket.length > 0 && selected.length < targetCount) {
        selected.push(bucket.pop() as ReliableQuizQuestion);
        added = true;
      }
    }
    if (!added) break;
  }

  return selected;
}
