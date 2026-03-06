import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBooks } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StepId = "lecture" | "note" | "priere";

type ProgramStep = {
  id: StepId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

type DailyProgram = {
  title: string;
  verse: string;
  focus: string;
  hints: Record<StepId, string>;
};

type DayProgress = Record<StepId, boolean>;
type ProgramProgressMap = Record<string, DayProgress>;
type ProgramContentMap = Record<string, DailyProgram>;
type ProgramActionMap = Record<string, Partial<Record<StepId, number>>>;
type StoredProgrammeState = {
  progressMap: ProgramProgressMap;
  programMap: ProgramContentMap;
  actionMap: ProgramActionMap;
};

const STORAGE_PREFIX = "PROGRAMME_JOURNALIER_V1";
const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MIN_SECONDS_REQUIRED: Record<StepId, number> = {
  lecture: 45,
  note: 0,
  priere: 60,
};

const BASE_STEPS: ProgramStep[] = [
  {
    id: "lecture",
    title: "Lecture du jour",
    subtitle: "Ouvrir votre plan et lire votre passage.",
    icon: "book-outline",
    route: "/meditation/lecture",
  },
  {
    id: "note",
    title: "Note de meditation",
    subtitle: "Ecrire ce que Dieu vous a montre aujourd'hui.",
    icon: "create-outline",
    route: "/meditation/carnet",
  },
  {
    id: "priere",
    title: "Temps de priere",
    subtitle: "Prier avec reconnaissance et intention.",
    icon: "heart-outline",
    route: "/priere/priere",
  },
];

const TITLE_THEME_POOL = [
  "Foi",
  "Sagesse",
  "Paix",
  "Obeissance",
  "Amour",
  "Reconnaissance",
  "Repos",
  "Esperance",
  "Perseverance",
  "Joie",
  "Purete",
  "Humilite",
  "Patience",
  "Confiance",
  "Discernement",
  "Courage",
];

const TITLE_INTENT_POOL = [
  "pour les decisions",
  "dans l'epreuve",
  "au quotidien",
  "en action",
  "dans les relations",
  "pour servir",
  "dans le silence",
  "en verite",
  "avec constance",
  "dans la gratitude",
  "sous la direction de Dieu",
  "pour ce jour",
  "dans la fidelite",
  "pour avancer",
  "dans l'attente",
  "avec assurance",
  "sans compromis",
  "dans la lumiere",
];

const VERSE_POOL = [
  "Proverbes 3:5-6",
  "Jacques 1:5",
  "Philippiens 4:6-7",
  "Jacques 1:22",
  "Jean 13:34-35",
  "Psaume 103:2",
  "Matthieu 11:28",
  "Romains 12:2",
  "Esaie 41:10",
  "Psaume 119:105",
  "2 Timothee 1:7",
  "Galates 5:22-23",
  "Jean 15:5",
  "Psaume 46:11",
  "Colossiens 3:23",
  "Josue 1:9",
  "1 Thessaloniciens 5:16-18",
  "Hebreux 12:1-2",
];

const FOCUS_ACTION_POOL = [
  "Confiez votre jour a Dieu",
  "Cherchez la sagesse avant d'agir",
  "Transformez les soucis en priere",
  "Passez de l'ecoute a l'action",
  "Aimez de maniere concrete",
  "Faites memoire des bienfaits recus",
  "Choisissez le repos interieur",
  "Restez aligne a la volonte de Dieu",
  "Marchez avec fidelite",
  "Gardez un coeur reconnaissant",
  "Restez ferme dans la verite",
  "Cultivez la patience",
];

const FOCUS_CONTEXT_POOL = [
  "dans vos decisions d'aujourd'hui.",
  "face aux defis du moment.",
  "dans vos relations proches.",
  "avant toute reponse importante.",
  "avec une intention claire.",
  "sans vous disperser.",
  "dans la paix et la confiance.",
  "avec humilite et constance.",
  "en gardant les yeux sur Christ.",
  "pour porter du fruit durable.",
  "dans les petites comme les grandes choses.",
  "avec courage et serenite.",
];

const LECTURE_HINT_POOL = [
  "Lire le passage propose lentement puis relever un mot cle.",
  "Lire le texte deux fois: une fois pour comprendre, une fois pour prier.",
  "Observer ce que Dieu revele sur Son caractere dans le passage.",
  "Identifier une promesse biblique a garder aujourd'hui.",
  "Relire le verset du jour en le mettant en pratique.",
  "Noter une verite a retenir avant de fermer la Bible.",
  "Prendre 10 minutes de lecture attentive sans distraction.",
];

const NOTE_HINT_POOL = [
  "Ecrire une application concrete a vivre avant ce soir.",
  "Noter ce qui vous interpelle le plus dans le passage.",
  "Ecrire une phrase de foi basee sur le verset du jour.",
  "Lister un changement d'attitude a commencer aujourd'hui.",
  "Resumer en 3 lignes ce que Dieu vous enseigne.",
  "Noter une decision pratique a mettre en oeuvre.",
  "Ecrire une courte priere personnelle dans le carnet.",
];

const PRIERE_HINT_POOL = [
  "Prier specifiquement sur ce que vous venez de lire.",
  "Remercier Dieu pour une grace recue aujourd'hui.",
  "Confier au Seigneur vos inquietudes du moment.",
  "Interceder pour une personne autour de vous.",
  "Demander la force d'obeir a la Parole.",
  "Prier 5 minutes en silence et en verite.",
  "Terminer en louange et reconnaissance.",
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyDayProgress(): DayProgress {
  return { lecture: false, note: false, priere: false };
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarCells(monthDate: Date): (number | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function randomPick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function programSignature(program: DailyProgram): string {
  return `${program.title}|${program.verse}|${program.focus}`;
}

function generateRandomDailyProgram(existing: ProgramContentMap): DailyProgram {
  const used = new Set(Object.values(existing).map(programSignature));

  for (let i = 0; i < 150; i++) {
    const generated: DailyProgram = {
      title: `${randomPick(TITLE_THEME_POOL)} ${randomPick(TITLE_INTENT_POOL)}`,
      verse: randomPick(VERSE_POOL),
      focus: `${randomPick(FOCUS_ACTION_POOL)} ${randomPick(FOCUS_CONTEXT_POOL)}`,
      hints: {
        lecture: randomPick(LECTURE_HINT_POOL),
        note: randomPick(NOTE_HINT_POOL),
        priere: randomPick(PRIERE_HINT_POOL),
      },
    };

    if (!used.has(programSignature(generated))) {
      return generated;
    }
  }

  return {
    title: `${randomPick(TITLE_THEME_POOL)} ${randomPick(TITLE_INTENT_POOL)}`,
    verse: randomPick(VERSE_POOL),
    focus: `${randomPick(FOCUS_ACTION_POOL)} ${randomPick(FOCUS_CONTEXT_POOL)}`,
    hints: {
      lecture: randomPick(LECTURE_HINT_POOL),
      note: randomPick(NOTE_HINT_POOL),
      priere: randomPick(PRIERE_HINT_POOL),
    },
  };
}

function parseVerseReference(reference?: string): {
  bookId: string;
  chapterId: string;
  verse: string;
} | null {
  if (!reference) return null;
  const match = reference.trim().match(/^(.*)\s+(\d+):(\d+)$/);
  if (!match) return null;
  const bookId = match[1].trim();
  const chapterId = match[2].trim();
  const verse = match[3].trim();
  if (!bookId || !chapterId || !verse) return null;
  return { bookId, chapterId, verse };
}

function isStoredProgrammeState(value: unknown): value is StoredProgrammeState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return "progressMap" in candidate && "programMap" in candidate;
}

export default function ProgrammePage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [progressMap, setProgressMap] = useState<ProgramProgressMap>({});
  const [programMap, setProgramMap] = useState<ProgramContentMap>({});
  const [actionMap, setActionMap] = useState<ProgramActionMap>({});
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const identity = user?.id ?? "guest";
      if (user?.id) {
        const profile = await supabase
          .from("users_profile")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!profile.error && profile.data?.id) {
          setProfileId(profile.data.id);
        }
      }
      const key = `${STORAGE_PREFIX}:${identity}`;
      setStorageKey(key);

      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        setInitialized(true);
        return;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        if (isStoredProgrammeState(parsed)) {
          setProgressMap(parsed.progressMap ?? {});
          setProgramMap(parsed.programMap ?? {});
          setActionMap(parsed.actionMap ?? {});
        } else {
          setProgressMap((parsed as ProgramProgressMap) ?? {});
          setProgramMap({});
          setActionMap({});
        }
      } catch {
        setProgressMap({});
        setProgramMap({});
        setActionMap({});
      } finally {
        setInitialized(true);
      }
    };

    bootstrap();
  }, []);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const dailyProgram = useMemo(
    () => programMap[selectedDateKey],
    [programMap, selectedDateKey]
  );
  const lectureTarget = useMemo(() => {
    const parsed = parseVerseReference(dailyProgram?.verse);
    if (!parsed) return null;
    const books = getBooks();
    if (!books.includes(parsed.bookId)) return null;
    return parsed;
  }, [dailyProgram]);

  const selectedDayProgress = useMemo(
    () => progressMap[selectedDateKey] ?? emptyDayProgress(),
    [progressMap, selectedDateKey]
  );

  const stepsForSelectedDay = useMemo(
    () =>
      BASE_STEPS.map((step) => ({
        ...step,
        subtitle: dailyProgram?.hints[step.id] ?? step.subtitle,
      })),
    [dailyProgram]
  );

  const doneCount = useMemo(
    () =>
      BASE_STEPS.reduce(
        (acc, step) => (selectedDayProgress[step.id] ? acc + 1 : acc),
        0
      ),
    [selectedDayProgress]
  );
  const progress = Math.round((doneCount / BASE_STEPS.length) * 100);
  const isSelectedDateFuture = useMemo(
    () => selectedDate > todayStart,
    [selectedDate, todayStart]
  );

  const monthLabel = useMemo(() => {
    const label = getMonthLabel(calendarMonth);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [calendarMonth]);

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth),
    [calendarMonth]
  );

  const monthCompletion = useMemo(() => {
    const monthPrefix = `${calendarMonth.getFullYear()}-${`${calendarMonth.getMonth() + 1}`.padStart(2, "0")}-`;
    const keys = Object.keys(progressMap).filter((key) => key.startsWith(monthPrefix));
    if (keys.length === 0) return 0;
    const completeDays = keys.filter((key) => {
      const day = progressMap[key];
      return day?.lecture && day?.note && day?.priere;
    }).length;
    return Math.round((completeDays / keys.length) * 100);
  }, [calendarMonth, progressMap]);

  const persistState = useCallback(async (
    nextProgressMap: ProgramProgressMap,
    nextProgramMap: ProgramContentMap,
    nextActionMap: ProgramActionMap,
    options?: { silent?: boolean }
  ) => {
    setProgressMap(nextProgressMap);
    setProgramMap(nextProgramMap);
    setActionMap(nextActionMap);
    if (!storageKey) return;
    const payload: StoredProgrammeState = {
      progressMap: nextProgressMap,
      programMap: nextProgramMap,
      actionMap: nextActionMap,
    };
    let saved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
        const check = await AsyncStorage.getItem(storageKey);
        if (check) {
          saved = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }

    if (!saved && !options?.silent) {
      Alert.alert(
        "Sauvegarde partielle",
        "La mise a jour locale n'a pas ete confirmee. Reessayez."
      );
    }
  }, [storageKey]);

  async function markStepOpened(stepId: StepId) {
    const current = actionMap[selectedDateKey] ?? {};
    const nextActionMap: ProgramActionMap = {
      ...actionMap,
      [selectedDateKey]: { ...current, [stepId]: Date.now() },
    };
    await persistState(progressMap, programMap, nextActionMap, { silent: true });
  }

  async function hasMeditationForSelectedDate(): Promise<boolean> {
    if (!profileId) return false;

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const primary = await supabase
      .from("meditations")
      .select("id")
      .eq("user_id", profileId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .limit(1);

    if (!primary.error && (primary.data?.length ?? 0) > 0) return true;

    const fallback = await supabase
      .from("meditations")
      .select("id")
      .eq("utilisateur_id", profileId)
      .gte("date_creation", start.toISOString())
      .lt("date_creation", end.toISOString())
      .limit(1);

    return !fallback.error && (fallback.data?.length ?? 0) > 0;
  }

  async function canValidateStep(stepId: StepId): Promise<{ ok: boolean; message?: string }> {
    if (isSelectedDateFuture) {
      return {
        ok: false,
        message:
          "Vous ne pouvez pas valider un jour futur. Vous pouvez rattraper les jours passes.",
      };
    }

    if (stepId === "note") {
      const hasNote = await hasMeditationForSelectedDate();
      if (!hasNote) {
        return {
          ok: false,
          message:
            "Ajoutez une note dans le carnet pour valider cette etape.",
        };
      }
      return { ok: true };
    }

    const openedAt = actionMap[selectedDateKey]?.[stepId];
    if (!openedAt) {
      return {
        ok: false,
        message:
          stepId === "lecture"
            ? "Ouvrez d'abord la lecture du jour avant de valider."
            : "Ouvrez d'abord la page de priere avant de valider.",
      };
    }

    const elapsedSeconds = Math.floor((Date.now() - openedAt) / 1000);
    const required = MIN_SECONDS_REQUIRED[stepId];
    if (elapsedSeconds < required) {
      return {
        ok: false,
        message:
          stepId === "lecture"
            ? `Prenez encore ${required - elapsedSeconds}s de lecture avant validation.`
            : `Prenez encore ${required - elapsedSeconds}s de priere avant validation.`,
      };
    }
    return { ok: true };
  }

  async function requireAuth(onSuccess: () => void) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      onSuccess();
      return;
    }

    Alert.alert(
      "Connexion requise",
      "Vous devez vous connecter pour acceder au programme.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se connecter", onPress: () => router.push("/(auth)/login") },
      ]
    );
  }

  async function toggleStepDone(stepId: StepId) {
    const current = progressMap[selectedDateKey] ?? emptyDayProgress();
    if (!current[stepId]) {
      const validation = await canValidateStep(stepId);
      if (!validation.ok) {
        Alert.alert("Validation impossible", validation.message ?? "Action non validee.");
        return;
      }
    }
    const nextDay: DayProgress = { ...current, [stepId]: !current[stepId] };
    await persistState(
      {
        ...progressMap,
        [selectedDateKey]: nextDay,
      },
      programMap,
      actionMap
    );
  }

  function goMonth(delta: number) {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  }

  useEffect(() => {
    if (!initialized) return;
    if (dailyProgram) return;
    const generated = generateRandomDailyProgram(programMap);
    const nextProgramMap = { ...programMap, [selectedDateKey]: generated };
    void persistState(progressMap, nextProgramMap, actionMap, { silent: true });
  }, [actionMap, dailyProgram, initialized, persistState, programMap, progressMap, selectedDateKey]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>Programme journalier</Text>
          <Text style={styles.heroTitle}>{dailyProgram?.title ?? "Programme du jour"}</Text>
          <Text style={styles.heroDate}>
            {selectedDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </Text>
          <Text style={styles.heroVerse}>{dailyProgram?.verse ?? "Chargement..."}</Text>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>

          <Text style={styles.heroHint}>
            {doneCount} / {BASE_STEPS.length} etapes completees
          </Text>
        </LinearGradient>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.monthBtn} onPress={() => goMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={COLORS.blueDark} />
            </Pressable>
            <Text style={styles.calendarTitle}>{monthLabel}</Text>
            <Pressable style={styles.monthBtn} onPress={() => goMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.blueDark} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
              }

              const cellDate = new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                day
              );
              const key = formatDateKey(cellDate);
              const status = progressMap[key] ?? emptyDayProgress();
              const completed = [status.lecture, status.note, status.priere].filter(Boolean).length;
              const fullDone = completed === 3;
              const isSelected = key === selectedDateKey;
              const isToday = key === todayKey;
              const isFuture = cellDate > todayStart;

              return (
                <Pressable
                  key={key}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    fullDone && styles.dayCellCompleted,
                    isFuture && styles.dayCellFuture,
                  ]}
                  disabled={isFuture}
                  onPress={() => setSelectedDateKey(key)}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      isFuture && styles.dayCellTextFuture,
                    ]}
                  >
                    {day}
                  </Text>
                  <View style={styles.dayDots}>
                    <View style={[styles.dayDot, status.lecture && styles.dayDotActive]} />
                    <View style={[styles.dayDot, status.note && styles.dayDotActive]} />
                    <View style={[styles.dayDot, status.priere && styles.dayDotActive]} />
                  </View>
                  {isToday && <View style={styles.todayMarker} />}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.monthSummary}>Evolution du mois: {monthCompletion}%</Text>
        </View>

        <View style={styles.section}>
          {stepsForSelectedDay.map((step) => {
            const done = selectedDayProgress[step.id];
            return (
              <Pressable
                key={step.id}
                style={({ pressed }) => [styles.stepCard, pressed && styles.pressed]}
                onPress={() =>
                  requireAuth(() => {
                    void markStepOpened(step.id);
                    if (step.id === "lecture" && lectureTarget) {
                      router.push({
                        pathname: "/bible/[bookId]/[chapterId]",
                        params: {
                          bookId: lectureTarget.bookId,
                          bookName: lectureTarget.bookId,
                          chapterId: lectureTarget.chapterId,
                          verse: lectureTarget.verse,
                        },
                      });
                      return;
                    }

                    router.push(step.route as any);
                  })
                }
              >
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={20} color={COLORS.blueDark} />
                </View>

                <View style={styles.stepMain}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    void toggleStepDone(step.id);
                  }}
                  style={[styles.checkBtn, done && styles.checkBtnActive]}
                >
                  <Ionicons
                    name={done ? "checkmark" : "ellipse-outline"}
                    size={18}
                    color={done ? COLORS.white : COLORS.gray}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FB" },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 16,
  },
  hero: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 6,
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "800",
  },
  heroDate: {
    marginTop: 6,
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  heroVerse: {
    marginTop: 6,
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "700",
  },
  progressWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.gold,
    borderRadius: 999,
  },
  progressText: {
    minWidth: 38,
    textAlign: "right",
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  heroHint: {
    marginTop: 10,
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarCard: {
    borderRadius: 18,
    backgroundColor: COLORS.white,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    color: COLORS.blueDark,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekLabel: {
    width: "14.2%",
    textAlign: "center",
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: "700",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 2,
    position: "relative",
  },
  dayCellEmpty: {
    width: "14.2%",
    paddingVertical: 8,
  },
  dayCellSelected: {
    backgroundColor: "#E2E8F0",
  },
  dayCellCompleted: {
    backgroundColor: "#ECFDF5",
  },
  dayCellFuture: {
    backgroundColor: "#F8FAFC",
    opacity: 0.45,
  },
  dayCellText: {
    color: COLORS.blueDark,
    fontSize: 13,
    fontWeight: "700",
  },
  dayCellTextSelected: {
    color: COLORS.blueDark,
  },
  dayCellTextFuture: {
    color: "#94A3B8",
  },
  dayDots: {
    marginTop: 3,
    flexDirection: "row",
    gap: 2,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  dayDotActive: {
    backgroundColor: COLORS.gold,
  },
  todayMarker: {
    position: "absolute",
    top: 4,
    right: 8,
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: COLORS.blue,
  },
  monthSummary: {
    marginTop: 8,
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  section: {
    gap: 12,
  },
  stepCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  stepMain: {
    flex: 1,
  },
  stepTitle: {
    color: COLORS.blueDark,
    fontSize: 16,
    fontWeight: "700",
  },
  stepSubtitle: {
    marginTop: 3,
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },
  checkBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  checkBtnActive: {
    backgroundColor: COLORS.blueDark,
  },
});
