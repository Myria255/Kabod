import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { getMonthlyReadingPlan, type MonthlyPlanItem } from "@/src/services/readingPlans";
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

/* ================= CONSTANTS ================= */

const STORAGE_KEY = "VERSE_ACTIONS_V2";
const ANNUAL_DAY_READ_KEY = "ANNUAL_DAY_READ_V1";

const MONTHLY_PLAN_ITEMS: MonthlyPlanItem[] = getMonthlyReadingPlan();

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
  const monthlyPlanItem = MONTHLY_PLAN_ITEMS.find((item) => item.bookId === safeBookId);
  const [activePlanType, setActivePlanType] = useState("");
  const effectivePlanType = safePlanType || activePlanType;
  const effectiveMonth = safeMonth || (monthlyPlanItem ? String(monthlyPlanItem.mois) : "");
  const effectiveTotalChapters = safeTotalChapters || (monthlyPlanItem ? String(monthlyPlanItem.nombreChapitres) : "");
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
  const chapterReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monthlyReadInFlightRef = useRef<Set<string>>(new Set());
  const monthlyReadDoneRef = useRef<Set<string>>(new Set());

  const [actions, setActions] = useState<VerseActionsMap>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [colorModalVisible, setColorModalVisible] = useState(false);

  const [audioUri, setAudioUri] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const markCurrentMonthlyChapterAsRead = useCallback(
    async (options: { showCompletionAlert?: boolean } = {}) => {
      if (effectivePlanType !== "mensuel" || !safeBookId || !safeChapterId) return;
      if (!safePlanType && !monthlyPlanItem) return;

      const chapter = Number(safeChapterId);
      const monthNumber = Number(effectiveMonth);
      const totalFromParams = Number(effectiveTotalChapters);
      const totalFromBible = getChapters(safeBookId).length;
      const total = Number.isFinite(totalFromParams) && totalFromParams > 0 ? totalFromParams : totalFromBible;
      if (!Number.isFinite(chapter) || chapter < 1) return;

      const progressKey = `${safeBookId}:${chapter}`;
      if (monthlyReadDoneRef.current.has(progressKey) || monthlyReadInFlightRef.current.has(progressKey)) {
        return;
      }

      monthlyReadInFlightRef.current.add(progressKey);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;

        await markMonthlyChapterAsRead(user.id, safeBookId, chapter);
        monthlyReadDoneRef.current.add(progressKey);
        const nextSavedChapter = chapter >= total ? total + 1 : chapter + 1;
        await saveLastReadChapter(user.id, safeBookId, nextSavedChapter);

        const readCount = await getMonthlyReadCountForBook(user.id, safeBookId);
        if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) return;
        if (!Number.isFinite(total) || total <= 0) return;
        if (readCount < total) return;

        if (options.showCompletionAlert !== false) {
          Alert.alert(
            "Livre terminé",
            "Votre livre du mois est terminé. Passez au quiz pour valider ce mois.",
            [
              {
                text: "Retour au plan",
                style: "cancel",
                onPress: () => router.replace("/meditation/lecture/mensuel" as any),
              },
              {
                text: "Faire le quiz",
                onPress: () =>
                  router.push({
                    pathname: "/meditation/lecture/mensuel-quiz",
                    params: {
                      bookId: safeBookId,
                      bookName: displayBookName,
                      month: String(monthNumber),
                    },
                  }),
              },
            ]
          );
        }
      } finally {
        monthlyReadInFlightRef.current.delete(progressKey);
      }
    },
    [
      displayBookName,
      effectiveMonth,
      effectivePlanType,
      effectiveTotalChapters,
      monthlyPlanItem,
      router,
      safeBookId,
      safeChapterId,
      safePlanType,
    ]
  );

  useEffect(() => {
    if (safePlanType) {
      setActivePlanType("");
      return;
    }

    let isActive = true;

    async function loadActivePlanType() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const { data } = await supabase
        .from("plan_lecture_utilisateur")
        .select("type_plan")
        .eq("utilisateur_id", user.id)
        .order("date_creation", { ascending: false })
        .limit(1);

      const planName = data?.[0]?.type_plan;
      if (!isActive) return;
      setActivePlanType(planName === "mensuel" || planName === "annuel" ? planName : "");
    }

    loadActivePlanType();

    return () => {
      isActive = false;
    };
  }, [safePlanType]);

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

      // Marquer le chapitre comme lu après 3 secondes (programme mensuel)
      if (chapterReadTimerRef.current) clearTimeout(chapterReadTimerRef.current);
      if (effectivePlanType === "mensuel") {
        chapterReadTimerRef.current = setTimeout(() => {
          markCurrentMonthlyChapterAsRead();
        }, 3000);
      }
    };

    load();

    return () => {
      if (chapterReadTimerRef.current) clearTimeout(chapterReadTimerRef.current);
    };
  }, [effectivePlanType, markCurrentMonthlyChapterAsRead, safeBookId, safeChapterId]);

  useEffect(() => {
    if (!safeVerse || !safeBookId || !safeChapterId) return;
    if (!verses.some((v) => v.number === safeVerse)) return;
    setSelectedKey(`${safeBookId}-${safeChapterId}-${safeVerse}`);
  }, [safeBookId, safeChapterId, safeVerse, verses]);

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
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone refuse", "Autorisez le microphone pour enregistrer une note vocale.");
      return;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) return;
    await audioRecorder.stop();
    if (audioRecorder.uri) {
      setAudioUri(audioRecorder.uri);
    }
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

  const handleChapterScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const reachedBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 96;
    // Marquer immédiatement si l'utilisateur scrolle jusqu'en bas (programme mensuel)
    if (reachedBottom && effectivePlanType === "mensuel") {
      if (chapterReadTimerRef.current) clearTimeout(chapterReadTimerRef.current);
      markCurrentMonthlyChapterAsRead();
    }
  };

  const goToChapter = async (target: number) => {
    if (!safeBookId) return;
    if (target > currentChapter) {
      await markCurrentMonthlyChapterAsRead({ showCompletionAlert: false });
    }
    router.replace({
      pathname: "/bible/[bookId]/[chapterId]",
      params: {
        bookId: safeBookId,
        bookName: displayBookName,
        chapterId: String(target),
        ...(effectivePlanType ? { planType: effectivePlanType } : {}),
        ...(effectiveMonth ? { month: effectiveMonth } : {}),
        ...(effectiveTotalChapters ? { totalChapters: effectiveTotalChapters } : {}),
        ...(safeDay ? { day: safeDay } : {}),
        ...(safeTotalReadings ? { totalReadings: safeTotalReadings } : {}),
      },
    });
  };

  const goBack = async () => {
    if (chapterReadTimerRef.current) clearTimeout(chapterReadTimerRef.current);
    await markCurrentMonthlyChapterAsRead({ showCompletionAlert: false });
    router.back();
  };

  /* ================= UI ================= */

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.headerIconButton}>
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
            onScroll={handleChapterScroll}
            scrollEventThrottle={120}
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
              onPress={recorderState.isRecording ? stopRecording : startRecording}
            >
              <Ionicons
                name={recorderState.isRecording ? "stop" : "mic"}
                size={18}
                color="#FFF"
              />
              <Text style={styles.audioText}>
                {recorderState.isRecording
                  ? "Arrêter l'enregistrement"
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
});
