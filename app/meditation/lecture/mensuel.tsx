import { COLORS as THEME_COLORS } from "@/src/constants/colors";
import {
  ensureLocalNotificationPermission,
  sendImmediateLocalNotification,
} from "@/src/services/localDeviceNotifications";
import {
  getMonthlyChaptersProgressForBooks,
  migrateLegacyMonthlyProgressToDb,
  resetMonthlyBookProgress,
} from "@/src/services/monthlyChapterProgress";
import { getDelayNotificationMessage } from "@/src/services/planNotifications";
import { getMonthlyReadingPlan, type MonthlyPlanItem } from "@/src/services/readingPlans";
import { getCompletedDays } from "@/src/stockage/readingProgress";
import { getLastReadChaptersForBooks } from "@/src/stockage/readingPosition";
import { supabase } from "@/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  blue: THEME_COLORS.blue,
  blueDark: THEME_COLORS.blueDark,
  gold: THEME_COLORS.gold,
  white: "#FFFFFF",
  grayLight: "#F1F5F9",
  gray: "#64748B",
  bg: "#F8FAFC",
  blueSoft: THEME_COLORS.blueSoft,
  border: THEME_COLORS.border,
  goldSoft: THEME_COLORS.goldSoft,
};

const PLAN_START_KEY = "PLAN_START_DATE_V1";
const PLAN_UNREAD_NOTIFICATION_KEY = "PLAN_UNREAD_NOTIFICATION_V1";
const MONTHLY_MIGRATION_DONE_KEY = "MONTHLY_MIGRATION_DONE_V1";

type PlanItem = MonthlyPlanItem;

function getCurrentMonthFromCompleted(completed: number[]): number {
  const done = new Set(completed);
  for (let i = 1; i <= 12; i++) {
    if (!done.has(i)) return i;
  }
  return 12;
}

export default function PlanMensuelPremium() {
  const router = useRouter();
  const plan = useMemo(() => getMonthlyReadingPlan(), []);
  const migrationDoneRef = useRef(false);
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [moisActuel, setMoisActuel] = useState(1);
  const [completedMonths, setCompletedMonths] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [retardMois, setRetardMois] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  const [lastNotif, setLastNotif] = useState<{ title: string; body: string } | null>(null);
  const [chapterProgressByBook, setChapterProgressByBook] = useState<
    Record<string, { read: number; total: number; percent: number }>
  >({});
  const [lastChapterByBook, setLastChapterByBook] = useState<Record<string, number>>({});

  const loadProgress = useCallback(async () => {
    try {
      setLoaded(false);
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setLoaded(true);
        return;
      }

      const key = `${PLAN_START_KEY}:${user.id}:mensuel`;
      let startIso = await AsyncStorage.getItem(key);
      if (!startIso) {
        startIso = new Date().toISOString();
        await AsyncStorage.setItem(key, startIso);
      }

      const days = await getCompletedDays(user.id, "mensuel");
      const normalized = [...new Set(days)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
      if (!migrationDoneRef.current) {
        const migrationKey = `${MONTHLY_MIGRATION_DONE_KEY}:${user.id}`;
        const done = await AsyncStorage.getItem(migrationKey);
        if (!done) {
          await migrateLegacyMonthlyProgressToDb(
            user.id,
            plan.map((item) => ({ bookId: item.bookId }))
          );
          await AsyncStorage.setItem(migrationKey, "1");
        }
        migrationDoneRef.current = true;
      }
      const bookIds = plan.map((item) => item.bookId);
      const [lastChapters, bookProgress] = await Promise.all([
        getLastReadChaptersForBooks(user.id, bookIds),
        getMonthlyChaptersProgressForBooks(
          user.id,
          plan.map((item) => ({ bookId: item.bookId, total: item.nombreChapitres }))
        ),
      ]);
      const mergedBookProgress = { ...bookProgress };
      plan.forEach((item) => {
        const savedChapter = lastChapters[item.bookId] ?? 1;
        const inferredRead = Math.max(0, Math.min(savedChapter - 1, item.nombreChapitres));
        const current = mergedBookProgress[item.bookId] ?? {
          read: 0,
          total: item.nombreChapitres,
          percent: 0,
        };
        const read = Math.max(current.read, inferredRead);
        mergedBookProgress[item.bookId] = {
          read,
          total: item.nombreChapitres,
          percent: item.nombreChapitres > 0 ? Math.min(100, Math.round((read / item.nombreChapitres) * 100)) : 0,
        };
      });
      setLastChapterByBook(lastChapters);
      setChapterProgressByBook(mergedBookProgress);
      const notifAllowed = await ensureLocalNotificationPermission();
      setNotifEnabled(notifAllowed);
      const unreadKey = `${PLAN_UNREAD_NOTIFICATION_KEY}:${user.id}:mensuel`;
      const unreadRaw = await AsyncStorage.getItem(unreadKey);
      if (unreadRaw) {
        try {
          const parsed = JSON.parse(unreadRaw) as { title: string; body: string };
          setLastNotif(parsed);
          setHasUnreadNotif(true);
        } catch {
          setLastNotif(null);
          setHasUnreadNotif(false);
        }
      } else {
        setLastNotif(null);
        setHasUnreadNotif(false);
      }

      const startDate = new Date(startIso);
      const now = new Date();
      const monthDiff =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());
      const expectedMonths = Math.min(Math.max(monthDiff + 1, 1), 12);
      const retard = Math.max(0, expectedMonths - normalized.length);
      setRetardMois(retard);

      if (notifAllowed && retard > 0) {
        const today = now.toISOString().slice(0, 10);
        const alertKey = `READING_DELAY_ALERT_V1:${user.id}:mensuel:${today}`;
        const alerted = await AsyncStorage.getItem(alertKey);
        if (!alerted) {
          const message = getDelayNotificationMessage("mensuel", retard);
          await sendImmediateLocalNotification(message);
          await AsyncStorage.setItem(alertKey, "1");
          await AsyncStorage.setItem(unreadKey, JSON.stringify(message));
          setLastNotif(message);
          setHasUnreadNotif(true);
        }
      }

      setCompletedMonths(normalized);
      setMoisActuel(getCurrentMonthFromCompleted(normalized));
    } finally {
      setLoaded(true);
    }
  }, [plan]);

  useFocusEffect(
    useCallback(() => {
      setLoaded(false);
      loadProgress();
    }, [loadProgress])
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const subscribeRealtime = async () => {
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;
      if (!user || !active) return;

      channel = supabase
        .channel(`progression-mensuel-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "progression_lecture",
            filter: `utilisateur_id=eq.${user.id}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old ?? {}) as { plan?: string };
            const planName = row.plan ?? "";
            if (
              planName === "mensuel" ||
              planName.startsWith("mensuel_book:") ||
              planName.startsWith("last_chapter:")
            ) {
              if (realtimeRefreshTimerRef.current) {
                clearTimeout(realtimeRefreshTimerRef.current);
              }
              realtimeRefreshTimerRef.current = setTimeout(() => {
                setLoaded(false);
                loadProgress();
              }, 200);
            }
          }
        )
        .subscribe();
    };

    subscribeRealtime();

    return () => {
      active = false;
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadProgress]);

  const currentPlanItem = useMemo(
    () => plan.find((item) => item.mois === moisActuel) ?? plan[0],
    [moisActuel, plan]
  );

  const currentBookName = currentPlanItem
    ? currentPlanItem.bookId.charAt(0).toUpperCase() + currentPlanItem.bookId.slice(1)
    : "";

  const currentBookProgress = currentPlanItem
    ? chapterProgressByBook[currentPlanItem.bookId]
    : null;

  const currentReadCount = currentPlanItem
    ? Math.min(currentBookProgress?.read ?? 0, currentPlanItem.nombreChapitres)
    : 0;

  const currentReadingPercent = currentPlanItem
    ? Math.min(currentBookProgress?.percent ?? 0, 100)
    : 0;

  const validatedBooksPercent = useMemo(
    () => Math.min(Math.round((completedMonths.length / 12) * 100), 100),
    [completedMonths]
  );

  function getStartChapterForItem(item: PlanItem) {
    const isCompleted = completedMonths.includes(item.mois);
    const chapterProgress = chapterProgressByBook[item.bookId];
    const readCount = isCompleted
      ? item.nombreChapitres
      : Math.min(chapterProgress?.read ?? 0, item.nombreChapitres);
    const lastChapter = lastChapterByBook[item.bookId] ?? 1;
    const nextUnreadChapter = Math.min(readCount + 1, item.nombreChapitres);

    return readCount > 0
      ? nextUnreadChapter
      : Math.min(Math.max(lastChapter, 1), item.nombreChapitres);
  }

  async function openNotificationInbox() {
    if (lastNotif) {
      Alert.alert(lastNotif.title, lastNotif.body);
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;
      if (user) {
        await AsyncStorage.removeItem(`${PLAN_UNREAD_NOTIFICATION_KEY}:${user.id}:mensuel`);
      }
      setHasUnreadNotif(false);
      setLastNotif(null);
      return;
    }

    Alert.alert("Notifications", "Aucune notification a lire.");
  }

  async function recommencerLivre(item: PlanItem) {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    try {
      await resetMonthlyBookProgress(user.id, item.bookId, item.mois);
      setLoaded(false);
      await loadProgress();
      Alert.alert("Progression reinitialisee", "Le livre a bien ete remis a zero.");
    } catch (e: any) {
      Alert.alert(
        "Echec de reinitialisation",
        e?.message ?? "Impossible de recommencer ce livre pour le moment."
      );
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={22} color={COLORS.blueDark} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Programme mensuel</Text>
          <TouchableOpacity onPress={openNotificationInbox} style={styles.backButton}>
            <Feather
              name="bell"
              size={18}
              color={hasUnreadNotif ? COLORS.gold : notifEnabled ? COLORS.blueDark : COLORS.gray}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[COLORS.blueDark, "#1D2A44"]} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View style={styles.badgeLabel}>
                <Text style={styles.badgeText}>PROGRAMME MENSUEL</Text>
              </View>
              <View style={styles.heroIcon}>
                <Feather name="book-open" size={20} color={COLORS.blueDark} />
              </View>
            </View>
            <Text style={styles.heroTitle}>12 livres à approfondir</Text>
            <Text style={styles.heroSub}>Avancez chaque mois dans un livre clé, avec une reprise directe là où vous en êtes.</Text>

            <View style={styles.progressRow}>
              <View style={styles.miniProgressContainer}>
                <View style={[styles.miniProgressBar, { width: `${currentReadingPercent}%` }]} />
              </View>
              <Text style={styles.progressStat}>{currentReadingPercent}%</Text>
            </View>

            {currentPlanItem && (
              <View style={styles.currentBookPanel}>
                <View style={styles.currentBookIcon}>
                  <Feather name="bookmark" size={17} color={COLORS.gold} />
                </View>
                <View style={styles.currentBookBody}>
                  <Text style={styles.currentBookLabel}>Lecture en cours</Text>
                  <Text style={styles.currentBookTitle}>
                    {currentBookName} · Chapitre {getStartChapterForItem(currentPlanItem)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{validatedBooksPercent}%</Text>
            <Text style={styles.summaryLabel}>Livres validés</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {currentPlanItem ? `${currentReadCount}/${currentPlanItem.nombreChapitres}` : currentReadCount}
            </Text>
            <Text style={styles.summaryLabel}>Chapitres lus</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{moisActuel}</Text>
            <Text style={styles.summaryLabel}>Mois actif</Text>
          </View>
        </View>

        {notifEnabled && retardMois > 0 && (
          <View style={styles.delayBanner}>
            <Feather name="bell" size={14} color={COLORS.gold} />
            <Text style={styles.delayBannerText}>
              Retard: {retardMois} mois a rattraper
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Votre parcours</Text>
          <View style={styles.lineDecor} />
        </View>

        <View style={styles.planContainer}>
          {plan.map((item) => {
            const isCompleted = completedMonths.includes(item.mois);
            const isCurrent = item.mois === moisActuel && !isCompleted;
            const isLocked = !isCompleted && item.mois > moisActuel;
            const bookName = item.bookId.charAt(0).toUpperCase() + item.bookId.slice(1);
            const chapterProgress = chapterProgressByBook[item.bookId];
            const readCount = isCompleted
              ? item.nombreChapitres
              : Math.min(chapterProgress?.read ?? 0, item.nombreChapitres);
            const chapterPercent = isCompleted
              ? 100
              : Math.min(chapterProgress?.percent ?? 0, 100);
            const startChapter = getStartChapterForItem(item);
            const canOpenQuiz = !isCompleted && !isLocked && readCount >= item.nombreChapitres;
            const statusLabel = isCompleted
              ? "Terminé"
              : isCurrent
                ? "En cours"
                : isLocked
                  ? "À venir"
                  : "Disponible";
            const resumeLabel = isCompleted
              ? "Lecture terminée"
              : isLocked
                ? "Disponible prochainement"
                : `Reprendre au chapitre ${startChapter}`;

            return (
              <TouchableOpacity
                key={item.mois}
                activeOpacity={0.7}
                disabled={!loaded || isLocked}
                style={[
                  styles.itemCard,
                  isCurrent && styles.itemCardActive,
                  isCompleted && styles.itemCardCompleted,
                  isLocked && styles.itemCardLocked,
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/bible/[bookId]/[chapterId]",
                    params: {
                      bookId: item.bookId,
                      chapterId: String(startChapter),
                      bookName,
                      planType: "mensuel",
                      month: String(item.mois),
                      totalChapters: String(item.nombreChapitres),
                    },
                  })
                }
                onLongPress={() => {
                  Alert.alert(
                    "Recommencer ce livre",
                    `Voulez-vous remettre a zero la progression de ${bookName} ?`,
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Recommencer",
                        style: "destructive",
                        onPress: () => recommencerLivre(item),
                      },
                    ]
                  );
                }}
              >
                <View
                  style={[
                    styles.monthBox,
                    isCurrent && styles.monthBoxActive,
                    isCompleted && styles.monthBoxCompleted,
                  ]}
                >
                  <Text style={[styles.monthLabel, (isCurrent || isCompleted) && styles.textWhite]}>
                    Mois
                  </Text>
                  <Text style={[styles.monthValue, (isCurrent || isCompleted) && styles.textWhite]}>
                    {item.mois}
                  </Text>
                </View>

                <View style={styles.contentBox}>
                  <Text style={[styles.bookName, (isCurrent || isCompleted) && styles.textWhite]}>
                    {bookName}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={[styles.statusText, (isCurrent || isCompleted) && styles.textWhiteOpacity]}>
                      {statusLabel}
                    </Text>
                    <Text style={[styles.resumeText, (isCurrent || isCompleted) && styles.resumeTextLight]}>
                      {resumeLabel}
                    </Text>
                  </View>
                  <Text style={[styles.chapterDetail, (isCurrent || isCompleted) && styles.textWhiteOpacity]}>
                    {isCompleted
                      ? "Livre terminé · 100%"
                      : `${readCount}/${item.nombreChapitres} chapitres lus · ${chapterPercent}%`}
                  </Text>
                  <View style={[styles.chapterTrack, (isCurrent || isCompleted) && styles.chapterTrackDark]}>
                    <View
                      style={[
                        styles.chapterFill,
                        { width: `${chapterPercent}%` },
                        isCurrent && styles.chapterFillActive,
                        isCompleted && styles.chapterFillCompleted,
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.actionBox}>
                  {isCompleted ? (
                    <View style={styles.donePill}>
                      <Feather name="check" size={14} color={COLORS.white} />
                    </View>
                  ) : canOpenQuiz ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.quizPill, isCurrent && styles.quizPillActive]}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                          pathname: "/meditation/lecture/mensuel-quiz",
                          params: {
                            bookId: item.bookId,
                            bookName,
                            month: String(item.mois),
                          },
                        });
                      }}
                    >
                      <Text style={[styles.quizPillText, isCurrent && styles.quizPillTextActive]}>
                        Quiz
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.progressPill,
                        isCurrent && styles.progressPillActive,
                        isLocked && styles.progressPillLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.progressPillText,
                          isCurrent && styles.progressPillTextActive,
                        ]}
                      >
                        {isLocked ? `${chapterPercent}%` : `Ch. ${startChapter}`}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerSafe: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  scrollContent: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  heroContent: { width: "100%", gap: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeLabel: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { color: COLORS.gold, fontSize: 10, fontWeight: "900" },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 28, lineHeight: 34, fontWeight: "900", color: COLORS.white },
  heroSub: { fontSize: 14, color: COLORS.blueSoft, lineHeight: 21 },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  miniProgressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    overflow: "hidden",
  },
  miniProgressBar: { height: 8, backgroundColor: COLORS.gold, borderRadius: 999 },
  progressStat: { fontSize: 13, fontWeight: "900", color: COLORS.white },
  currentBookPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
  },
  currentBookIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentBookBody: { flex: 1 },
  currentBookLabel: { color: COLORS.blueSoft, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  currentBookTitle: { color: COLORS.white, fontSize: 15, fontWeight: "900", marginTop: 2 },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    justifyContent: "space-between",
  },
  summaryValue: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  summaryLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "800" },
  delayBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  delayBannerText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  lineDecor: { flex: 1, height: 1, backgroundColor: COLORS.border },

  planContainer: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  itemCardActive: {
    backgroundColor: COLORS.blueDark,
    borderColor: COLORS.blueDark,
  },
  itemCardCompleted: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  itemCardLocked: {
    opacity: 0.45,
  },
  monthBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  monthBoxActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  monthBoxCompleted: { backgroundColor: "rgba(255,255,255,0.18)" },
  monthLabel: { fontSize: 9, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase" },
  monthValue: { fontSize: 22, fontWeight: "800", color: COLORS.blueDark },

  contentBox: { flex: 1, paddingLeft: 16 },
  bookName: { fontSize: 18, fontWeight: "900", color: COLORS.blueDark },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  statusText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  resumeText: {
    color: COLORS.blueDark,
    fontSize: 12,
    fontWeight: "800",
  },
  resumeTextLight: {
    color: COLORS.white,
  },
  chapterDetail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  chapterTrack: {
    marginTop: 9,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.grayLight,
    overflow: "hidden",
  },
  chapterTrackDark: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  chapterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  chapterFillActive: {
    backgroundColor: COLORS.gold,
  },
  chapterFillCompleted: {
    backgroundColor: COLORS.white,
  },

  actionBox: { paddingRight: 4 },
  progressPill: {
    minWidth: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  progressPillActive: {
    backgroundColor: COLORS.gold,
  },
  progressPillLocked: {
    opacity: 0.75,
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.blueDark,
  },
  progressPillTextActive: {
    color: COLORS.blueDark,
  },
  quizPill: {
    minWidth: 62,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  quizPillActive: {
    backgroundColor: COLORS.white,
  },
  quizPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.blueDark,
  },
  quizPillTextActive: {
    color: COLORS.blueDark,
  },
  donePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  textWhite: { color: COLORS.white },
  textWhiteOpacity: { color: "rgba(255,255,255,0.6)" },
});
