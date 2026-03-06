import { BIBLE } from "@/src/constants/bible";
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
import { getCompletedDays } from "@/src/stockage/readingProgress";
import { getLastReadChaptersForBooks } from "@/src/stockage/readingPosition";
import { supabase } from "@/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
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
};

const PLAN_START_KEY = "PLAN_START_DATE_V1";
const PLAN_UNREAD_NOTIFICATION_KEY = "PLAN_UNREAD_NOTIFICATION_V1";
const MONTHLY_MIGRATION_DONE_KEY = "MONTHLY_MIGRATION_DONE_V1";

type PlanItem = {
  mois: number;
  bookId: string;
  nombreChapitres: number;
};

function genererPlanMensuel(): PlanItem[] {
  const livres = Object.entries(BIBLE);
  const livresParMois = Math.ceil(livres.length / 12);
  const plan: PlanItem[] = [];
  let index = 0;

  for (let mois = 1; mois <= 12; mois++) {
    if (index >= livres.length) break;
    const [bookId, contenu] = livres[index] as [string, Record<string, unknown>];
    plan.push({
      mois,
      bookId,
      nombreChapitres: Object.keys(contenu).length,
    });
    index += livresParMois;
  }

  return plan;
}

function getCurrentMonthFromCompleted(completed: number[]): number {
  const done = new Set(completed);
  for (let i = 1; i <= 12; i++) {
    if (!done.has(i)) return i;
  }
  return 12;
}

export default function PlanMensuelPremium() {
  const router = useRouter();
  const plan = useMemo(() => genererPlanMensuel(), []);
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
      setLastChapterByBook(lastChapters);
      setChapterProgressByBook(bookProgress);
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

  const progression = useMemo(
    () => Math.min(Math.round((completedMonths.length / 12) * 100), 100),
    [completedMonths]
  );

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
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.badgeLabel}>
              <Text style={styles.badgeText}>OBJECTIF</Text>
            </View>
            <Text style={styles.heroTitle}>La Bible en 12 mois</Text>
            <Text style={styles.heroSub}>La progression se base sur les livres reels termines.</Text>

            <View style={styles.progressRow}>
              <View style={styles.miniProgressContainer}>
                <View style={[styles.miniProgressBar, { width: `${progression}%` }]} />
              </View>
              <Text style={styles.progressStat}>{progression}%</Text>
            </View>
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
          <Text style={styles.sectionTitle}>Votre progression</Text>
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
            const lastChapter = lastChapterByBook[item.bookId] ?? 1;
            const startChapter = Math.min(Math.max(lastChapter, 1), item.nombreChapitres);
            const canOpenQuiz = !isCompleted && !isLocked && readCount >= item.nombreChapitres;

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
                  <Text style={[styles.chapterDetail, (isCurrent || isCompleted) && styles.textWhiteOpacity]}>
                    {isCompleted
                      ? "Livre termine • 100%"
                      : `${readCount}/${item.nombreChapitres} chapitres lus • ${chapterPercent}%`}
                  </Text>
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
                        {chapterPercent}%
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
    borderBottomColor: COLORS.grayLight,
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
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },

  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  heroContent: { width: "100%" },
  badgeLabel: {
    backgroundColor: COLORS.gold + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  badgeText: { color: COLORS.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: "800", color: COLORS.blueDark },
  heroSub: { fontSize: 14, color: COLORS.gray, marginTop: 8, lineHeight: 20 },

  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 12 },
  miniProgressContainer: { flex: 1, height: 6, backgroundColor: COLORS.grayLight, borderRadius: 3 },
  miniProgressBar: { height: 6, backgroundColor: COLORS.gold, borderRadius: 3 },
  progressStat: { fontSize: 12, fontWeight: "700", color: COLORS.blueDark },
  delayBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
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
  lineDecor: { flex: 1, height: 1, backgroundColor: COLORS.grayLight },

  planContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingVertical: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 8,
  },
  itemCardActive: {
    backgroundColor: COLORS.blueDark,
  },
  itemCardCompleted: {
    backgroundColor: COLORS.blue,
  },
  itemCardLocked: {
    opacity: 0.45,
  },
  monthBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  monthBoxActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  monthBoxCompleted: { backgroundColor: "rgba(255,255,255,0.18)" },
  monthLabel: { fontSize: 9, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase" },
  monthValue: { fontSize: 22, fontWeight: "800", color: COLORS.blueDark },

  contentBox: { flex: 1, paddingLeft: 16 },
  bookName: { fontSize: 18, fontWeight: "700", color: COLORS.blueDark },
  chapterDetail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },

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
