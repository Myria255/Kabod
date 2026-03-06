import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getChapters, getVerses } from "@/src/constants/bible";
import {
  getMonthlyReadCountForBook,
  markMonthlyChapterAsRead,
} from "@/src/services/monthlyChapterProgress";
import {
  generateReliableQuizForReadings,
  type ReliableQuizQuestion,
} from "@/src/services/quizGenerator";
import { markDayAsCompleted } from "@/src/services/readingSync";
import { saveLastReadChapter } from "@/src/stockage/readingPosition";
import { supabase } from "@/supabaseClient";

/* ================= TYPES ================= */

type HighlightColor = "yellow" | "blue" | "green" | "pink";

type VerseAction = {
  note?: string;
  audioUri?: string;
  highlight?: HighlightColor;
};

type VerseActionsMap = Record<string, VerseAction>;

type Verse = {
  number: string;
  text: string;
};

type QuizCorrection = {
  id: string;
  prompt: string;
  verseReference: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

/* ================= CONSTANTS ================= */

const STORAGE_KEY = "VERSE_ACTIONS_V2";
const ANNUAL_DAY_READ_KEY = "ANNUAL_DAY_READ_V1";

/* ================= COLORS ================= */

const COLORS = {
  primary: "#0F172A",
  gold: "#D4AF37",
  gray: "#6B6F8A",
  grayLight: "#F2F3F7",
  white: "#FFFFFF",
  highlight: {
    yellow: "#FEF08A",
    blue: "#DBEAFE",
    green: "#DCFCE7",
    pink: "#FCE7F3",
  },
};
const NAV_DISABLED_COLOR = "#94A3B8";

export default function VersesPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { bookId, bookName, chapterId, verse, planType, month, totalChapters, day, totalReadings } = useLocalSearchParams<{
    bookId: string;
    bookName: string;
    chapterId: string;
    verse?: string;
    planType?: string;
    month?: string;
    totalChapters?: string;
    day?: string;
    totalReadings?: string;
  }>();
  const safeBookId = (Array.isArray(bookId) ? bookId[0] : bookId) ?? "";
  const safeBookName = (Array.isArray(bookName) ? bookName[0] : bookName) ?? "";
  const safeChapterId = (Array.isArray(chapterId) ? chapterId[0] : chapterId) ?? "";
  const safeVerse = (Array.isArray(verse) ? verse[0] : verse) ?? "";
  const safePlanType = (Array.isArray(planType) ? planType[0] : planType) ?? "";
  const safeMonth = (Array.isArray(month) ? month[0] : month) ?? "";
  const safeTotalChapters = (Array.isArray(totalChapters) ? totalChapters[0] : totalChapters) ?? "";
  const safeDay = (Array.isArray(day) ? day[0] : day) ?? "";
  const safeTotalReadings = (Array.isArray(totalReadings) ? totalReadings[0] : totalReadings) ?? "";
  const displayBookName =
    safeBookName ||
    (safeBookId ? safeBookId.charAt(0).toUpperCase() + safeBookId.slice(1) : "");
  const currentChapter = Number(safeChapterId || "1");
  const chapterNumbers = safeBookId
    ? getChapters(safeBookId)
        .map((c) => parseInt(c, 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b)
    : [];
  const chapterIndex = chapterNumbers.findIndex((n) => n === currentChapter);
  const prevChapter = chapterIndex > 0 ? chapterNumbers[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < chapterNumbers.length - 1
      ? chapterNumbers[chapterIndex + 1]
      : null;

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  const [actions, setActions] = useState<VerseActionsMap>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [colorModalVisible, setColorModalVisible] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<ReliableQuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    corrections: QuizCorrection[];
  } | null>(null);

  /* ================= LOAD ================= */

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setActions(JSON.parse(stored));

      const raw = getVerses(safeBookId, safeChapterId);
      const parsed = Object.entries(raw).map(([number, text]) => ({
        number,
        text,
      }));

      setVerses(parsed);
      setLoading(false);
    };

    load();
  }, [safeBookId, safeChapterId]);

  useEffect(() => {
    if (!safeVerse || !safeBookId || !safeChapterId) return;
    if (!verses.some((v) => v.number === safeVerse)) return;
    setSelectedKey(`${safeBookId}-${safeChapterId}-${safeVerse}`);
  }, [safeBookId, safeChapterId, safeVerse, verses]);

  useEffect(() => {
    const syncMonthlyProgress = async () => {
      if (safePlanType !== "mensuel" || !safeBookId || !safeChapterId) return;

      const month = Number(safeMonth);
      const total = Number(safeTotalChapters);
      if (!Number.isFinite(month) || month < 1 || month > 12) return;
      if (!Number.isFinite(total) || total <= 0) return;

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      await markMonthlyChapterAsRead(user.id, safeBookId, Number(safeChapterId));
      const readCount = await getMonthlyReadCountForBook(user.id, safeBookId);
      if (readCount >= total) {
        const { data: validated } = await supabase
          .from("progression_lecture")
          .select("numero")
          .eq("utilisateur_id", user.id)
          .eq("plan", "mensuel")
          .eq("numero", month)
          .eq("valide", true)
          .maybeSingle();
        if (!validated) {
          Alert.alert(
            "Livre termine",
            "Votre livre est termine. Passez au quiz de validation.",
            [
              { text: "Plus tard", style: "cancel" },
              {
                text: "Passer au quiz",
                onPress: () =>
                  router.push({
                    pathname: "/meditation/lecture/mensuel-quiz",
                    params: {
                      bookId: safeBookId,
                      bookName: displayBookName,
                      month: String(month),
                    },
                  }),
              },
            ]
          );
        }
      }
    };

    syncMonthlyProgress();
  }, [safeBookId, safeChapterId, safeMonth, safePlanType, safeTotalChapters]);

  function buildReadingsForWholeBook() {
    const chapters = getChapters(safeBookId)
      .map((chapter) => Number(chapter))
      .filter((chapter) => Number.isFinite(chapter) && chapter >= 1);
    return chapters.map((chapter) => ({ bookId: safeBookId, chapter }));
  }

  function ensureMinimumQuestions(
    questions: ReliableQuizQuestion[],
    minCount: number
  ): ReliableQuizQuestion[] {
    if (questions.length >= minCount) return questions.slice(0, minCount);
    if (questions.length === 0) return [];

    const expanded: ReliableQuizQuestion[] = [];
    let idx = 0;
    while (expanded.length < minCount) {
      const base = questions[idx % questions.length];
      expanded.push({
        ...base,
        id: `${base.id}-dup-${idx}`,
      });
      idx++;
    }
    return expanded;
  }

  function ouvrirQuizValidationLivre() {
    if (!safeBookId) return;
    const readings = buildReadingsForWholeBook();
    const generated = generateReliableQuizForReadings(readings, 60);
    const questions = ensureMinimumQuestions(generated, 20);
    if (questions.length < 20) {
      Alert.alert("Quiz indisponible", "Impossible de generer un quiz de 20 questions.");
      return;
    }
    setQuizQuestions(questions);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizVisible(true);
  }

  async function soumettreQuizLivre() {
    if (quizQuestions.some((q) => quizAnswers[q.id] === undefined)) {
      Alert.alert("Quiz incomplet", "Repondez aux 20 questions avant de valider.");
      return;
    }

    const month = Number(safeMonth);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      Alert.alert("Erreur", "Mois invalide.");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const total = quizQuestions.length;
    const correctCount = quizQuestions.filter((q) => quizAnswers[q.id] === q.correctAnswer).length;
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= 85;
    const corrections: QuizCorrection[] = quizQuestions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      verseReference: q.verseReference,
      userAnswer: quizAnswers[q.id] ?? "-",
      correctAnswer: q.correctAnswer,
      isCorrect: quizAnswers[q.id] === q.correctAnswer,
    }));
    setQuizResult({ score, passed, corrections });

    if (!passed) {
      Alert.alert("Score insuffisant", `Vous avez ${score}%. Il faut 85% minimum.`);
      return;
    }

    setQuizLoading(true);
    try {
      await markDayAsCompleted(user.id, "mensuel", month);
      setQuizVisible(false);
      Alert.alert("Livre valide", `Score ${score}% - livre valide avec succes.`);
    } finally {
      setQuizLoading(false);
    }
  }

  useEffect(() => {
    const syncAnnualProgress = async () => {
      if (safePlanType !== "annuel" || !safeBookId || !safeChapterId) return;

      const day = Number(safeDay);
      const total = Number(safeTotalReadings);
      if (!Number.isFinite(day) || day < 1 || day > 365) return;
      if (!Number.isFinite(total) || total <= 0) return;

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const key = `${ANNUAL_DAY_READ_KEY}:${user.id}:${day}`;
      let map: Record<string, boolean> = {};
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          map = JSON.parse(raw) as Record<string, boolean>;
        } catch {
          map = {};
        }
      }

      const chapterKey = `${safeBookId}-${safeChapterId}`;
      map[chapterKey] = true;
      await AsyncStorage.setItem(key, JSON.stringify(map));

      const readCount = Object.keys(map).length;
      if (readCount >= total) {
        // La validation annuelle est declenchee depuis le quiz dans l'ecran annuel.
      }
    };

    syncAnnualProgress();
  }, [safeBookId, safeChapterId, safeDay, safePlanType, safeTotalReadings]);

  useEffect(() => {
    const persistReadingPosition = async () => {
      if (!safeBookId || !safeChapterId) return;
      const chapter = Number(safeChapterId);
      if (!Number.isFinite(chapter) || chapter < 1) return;

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      await saveLastReadChapter(user.id, safeBookId, chapter);
    };

    persistReadingPosition();
  }, [safeBookId, safeChapterId]);

  /* ================= STORAGE ================= */

  const persist = async (updated: VerseActionsMap) => {
    setActions(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateVerse = (key: string, data: Partial<VerseAction>) => {
    persist({
      ...actions,
      [key]: { ...actions[key], ...data },
    });
  };

  const removeHighlight = (key: string) => {
    const updated = { ...actions };
    delete updated[key]?.highlight;
    persist(updated);
  };

  /* ================= AUDIO ================= */

  const startRecording = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await rec.startAsync();
    setRecording(rec);
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) setAudioUri(uri);
  };

  /* ================= ACTIONS ================= */

  const withRef = (text: string, verse: string) =>
    `${text}\n\n— ${displayBookName} ${safeChapterId}:${verse}`;

  const copyVerse = async (v: Verse) => {
    await Clipboard.setStringAsync(withRef(v.text, v.number));
    Alert.alert("Copié", "Verset copié avec sa référence");
    setSelectedKey(null);
  };

  const shareVerse = async (v: Verse) => {
    await Share.share({ message: withRef(v.text, v.number) });
    setSelectedKey(null);
  };

  const goToChapter = (target: number) => {
    if (!safeBookId) return;
    router.replace({
      pathname: "/bible/[bookId]/[chapterId]",
      params: {
        bookId: safeBookId,
        bookName: displayBookName,
        chapterId: String(target),
        ...(safePlanType ? { planType: safePlanType } : {}),
        ...(safeMonth ? { month: safeMonth } : {}),
        ...(safeTotalChapters ? { totalChapters: safeTotalChapters } : {}),
        ...(safeDay ? { day: safeDay } : {}),
        ...(safeTotalReadings ? { totalReadings: safeTotalReadings } : {}),
      },
    });
  };

  /* ================= UI ================= */

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          </Pressable>

          <View style={styles.headerMiddle}>
            <Text style={styles.headerBookName}>{displayBookName}</Text>

            <View style={styles.chapterInline}>
              <Pressable
                onPress={() => prevChapter && goToChapter(prevChapter)}
                disabled={!prevChapter}
                style={[styles.chapterInlineBtn, !prevChapter && styles.chapterInlineBtnDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={prevChapter ? COLORS.primary : NAV_DISABLED_COLOR}
                />
              </Pressable>

              <Text style={styles.chapterInlineText}>Chap. {safeChapterId}</Text>

              <Pressable
                onPress={() => nextChapter && goToChapter(nextChapter)}
                disabled={!nextChapter}
                style={[styles.chapterInlineBtn, !nextChapter && styles.chapterInlineBtnDisabled]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={nextChapter ? COLORS.primary : NAV_DISABLED_COLOR}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* CONTENT */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.body,
              { paddingBottom: selectedKey ? 90 + insets.bottom : 20 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {verses.map((v) => {
              const key = `${safeBookId}-${safeChapterId}-${v.number}`;
              const action = actions[key];

              return (
                <Pressable
                  key={key}
                  onPress={() =>
                    setSelectedKey(selectedKey === key ? null : key)
                  }
                  onLongPress={() => setSelectedKey(key)}
                  style={[
                    styles.verseRow,
                    selectedKey === key && styles.selected,
                    action?.highlight && {
                      backgroundColor:
                        COLORS.highlight[action.highlight],
                    },
                  ]}
                >
                  <Text style={styles.verseText}>
                    <Text style={styles.verseNumber}>{v.number} </Text>
                    {v.text}
                  </Text>

                  {(action?.note || action?.audioUri) && (
                    <View style={styles.noteIndicator}>
                      <Ionicons
                        name={action.audioUri ? "mic" : "document-text"}
                        size={14}
                        color={COLORS.gold}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* ACTION BAR */}
      {selectedKey && (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          <ActionIcon
            icon="create-outline"
            label="Note"
            onPress={() => {
              const a = actions[selectedKey];
              setNoteText(a?.note || "");
              setAudioUri(a?.audioUri || null);
              setNoteModalVisible(true);
            }}
          />

          <ActionIcon
            icon="color-palette-outline"
            label="Couleur"
            onPress={() => setColorModalVisible(true)}
          />

          <ActionIcon
            icon="copy-outline"
            label="Copier"
            onPress={() => {
              const v = verses.find(
                (x) =>
                  `${safeBookId}-${safeChapterId}-${x.number}` === selectedKey
              );
              if (v) copyVerse(v);
            }}
          />

          <ActionIcon
            icon="share-social-outline"
            label="Partager"
            onPress={() => {
              const v = verses.find(
                (x) =>
                  `${safeBookId}-${safeChapterId}-${x.number}` === selectedKey
              );
              if (v) shareVerse(v);
            }}
          />
        </View>
      )}

      {/* NOTE MODAL */}
      <Modal visible={noteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Note</Text>

            <TextInput
              style={styles.input}
              multiline
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Écrivez votre note…"
            />

            {/* 🎤 NOTE VOCALE */}
            <Pressable
              style={styles.audioBtn}
              onPress={recording ? stopRecording : startRecording}
            >
              <Ionicons
                name={recording ? "stop" : "mic"}
                size={18}
                color="#FFF"
              />
              <Text style={styles.audioText}>
                {recording
                  ? "Arrêter l’enregistrement"
                  : audioUri
                  ? "Réenregistrer"
                  : "Note vocale"}
              </Text>
            </Pressable>

            <View style={styles.modalBtns}>
              <Pressable onPress={() => setNoteModalVisible(false)}>
                <Text style={styles.cancel}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={() => {
                  if (selectedKey) {
                    updateVerse(selectedKey, {
                      note: noteText.trim() || undefined,
                      audioUri: audioUri || undefined,
                    });
                  }
                  setNoteModalVisible(false);
                  setSelectedKey(null);
                }}
              >
                <Text style={styles.saveText}>Sauvegarder</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* COLOR MODAL */}
      <Modal visible={colorModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setColorModalVisible(false)}
        >
          <Pressable style={styles.colorModal}>
            <Text style={styles.modalTitle}>Surligner</Text>

            <View style={styles.colorRow}>
              {(Object.keys(COLORS.highlight) as HighlightColor[]).map(
                (color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: COLORS.highlight[color] },
                    ]}
                    onPress={() => {
                      if (selectedKey) {
                        updateVerse(selectedKey, { highlight: color });
                      }
                      setColorModalVisible(false);
                      setSelectedKey(null);
                    }}
                  />
                )
              )}

              <Pressable
                style={[styles.colorCircle, styles.clearCircle]}
                onPress={() => {
                  if (selectedKey) removeHighlight(selectedKey);
                  setColorModalVisible(false);
                  setSelectedKey(null);
                }}
              >
                <Ionicons name="close" size={18} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={quizVisible} transparent animationType="slide">
        <View style={styles.quizOverlay}>
          <View style={styles.quizCard}>
            <Text style={styles.quizTitle}>Validation du livre</Text>
            <Text style={styles.quizSubtitle}>
              Repondez aux 20 questions pour valider ce livre.
            </Text>

            <ScrollView style={styles.quizList} contentContainerStyle={styles.quizListContent}>
              {quizQuestions.map((q, index) => {
                const selected = quizAnswers[q.id];
                return (
                  <View key={q.id} style={styles.quizItem}>
                    <Text style={styles.quizQuestion}>{index + 1}. {q.prompt}</Text>
                    <Text style={styles.quizRef}>{q.verseReference}</Text>
                    <Text style={styles.quizVerse}>{q.verseWithBlank}</Text>
                    <View style={styles.quizOptionsRow}>
                      {q.options.map((opt) => {
                        const active = selected === opt;
                        return (
                          <Pressable
                            key={`${q.id}-${opt}`}
                            style={[styles.quizOption, active && styles.quizOptionActive]}
                            onPress={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          >
                            <Text style={[styles.quizOptionText, active && styles.quizOptionTextActive]}>
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {quizResult && (
              <Text style={styles.quizScoreText}>
                Resultat: {quizResult.score}% {quizResult.passed ? "(Valide)" : "(Non valide)"}
              </Text>
            )}

            <View style={styles.quizActions}>
              <Pressable style={styles.quizCancel} onPress={() => setQuizVisible(false)}>
                <Text style={styles.quizCancelText}>Fermer</Text>
              </Pressable>
              <Pressable
                style={[styles.quizValidate, quizLoading && styles.quizValidateDisabled]}
                disabled={quizLoading}
                onPress={soumettreQuizLivre}
              >
                <Text style={styles.quizValidateText}>
                  {quizLoading ? "Validation..." : "Valider le livre"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= COMPONENT ================= */

function ActionIcon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionIconContainer} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFBFD" },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderRadius: 0,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },

  headerMiddle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  headerBookName: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primary,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.grayLight,
  },
  headerIconSpacer: {
    width: 6,
  },

  chapterInline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 6,
  },
  chapterInlineBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  chapterInlineBtnDisabled: {
    opacity: 0.45,
  },
  chapterInlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  body: { paddingHorizontal: 14, paddingTop: 2 },

  verseRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 0,
    marginBottom: 0,
    position: "relative",
    backgroundColor: "transparent",
  },

  selected: {
    backgroundColor: "#EAF1FF",
    shadowOpacity: 0.2,
  },

  verseText: {
    fontSize: 17,
    lineHeight: 26,
    color: COLORS.primary,
  },

  verseNumber: {
    fontWeight: "700",
    color: COLORS.gold,
  },

  noteIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 5,
  },

  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFFF5",
    borderTopWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 24,
  },

  actionIconContainer: { alignItems: "center", gap: 4 },

  actionIcon: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#EEF3FF",
  },

  actionLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: "500",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },

  colorModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    fontSize: 16,
  },

  audioBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
  },

  audioText: {
    color: "#FFF",
    fontWeight: "600",
  },

  modalBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 16,
  },

  cancel: {
    color: COLORS.gray,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  saveBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  saveText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },

  colorRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 16,
    justifyContent: "center",
  },

  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },

  clearCircle: {
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quizOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  quizCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    maxHeight: "92%",
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  quizSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 10,
  },
  quizList: { maxHeight: 420 },
  quizListContent: { paddingBottom: 8 },
  quizItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  quizQuestion: { color: COLORS.primary, fontSize: 13, fontWeight: "700", marginBottom: 4 },
  quizRef: { color: COLORS.gray, fontSize: 12, marginBottom: 4 },
  quizVerse: { color: COLORS.primary, fontSize: 13, marginBottom: 8, fontStyle: "italic" },
  quizOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quizOption: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  quizOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quizOptionText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  quizOptionTextActive: { color: COLORS.white },
  quizScoreText: {
    marginTop: 4,
    marginBottom: 8,
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  quizActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  quizCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  quizCancelText: { color: COLORS.gray, fontWeight: "600" },
  quizValidate: {
    flex: 1,
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  quizValidateDisabled: { opacity: 0.65 },
  quizValidateText: { color: COLORS.white, fontWeight: "700" },
});


