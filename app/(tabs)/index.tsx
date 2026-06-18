import { BIBLE } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";
import { getLatestAdminPrayer, type AdminPrayerRecord } from "@/src/services/adminPrayerSupabase";
import {
  getLatestDailyPrayerTopic,
  type DailyPrayerTopicRecord,
} from "@/src/services/dailyPrayerTopicSupabase";
import { getLatestPrayerPodcast, type PrayerPodcastRecord } from "@/src/services/prayerPodcastSupabase";
import { calculateProgress, getCompletedDays } from "@/src/stockage/readingProgress";
import { useUser } from "@/src/context/UserContext";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type VerseCard = {
  text: string;
  bookId: string;
  chapter: number;
  verse: string;
  source: "admin" | "local";
};

type ReadingSummary = {
  planType: "annuel" | "mensuel";
  completedCount: number;
  progress: number;
  nextDay: number;
  label: string;
} | null;

const SUBJECTS_KEY_PREFIX = "PRAYER_SUBJECTS_V1";

function getDailyLocalVerse(): VerseCard | null {
  try {
    const books = Object.keys(BIBLE);
    const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    const bookId = books[seed % books.length];
    const chapters = Object.keys(BIBLE[bookId] ?? {});
    const chapterId = chapters[seed % chapters.length];
    const verses = Object.entries(BIBLE[bookId]?.[chapterId] ?? {});
    const [verseNumber, verseText] = verses[seed % verses.length];

    return {
      bookId,
      chapter: Number(chapterId),
      verse: String(verseNumber),
      text: String(verseText),
      source: "local",
    };
  } catch {
    return null;
  }
}

function getAdminVerse(adminPrayer: AdminPrayerRecord | null): VerseCard | null {
  if (!adminPrayer?.verseText || !adminPrayer.bookId || !adminPrayer.chapter || !adminPrayer.verseNumber) {
    return null;
  }

  return {
    text: adminPrayer.verseText,
    bookId: adminPrayer.bookId,
    chapter: adminPrayer.chapter,
    verse: String(adminPrayer.verseNumber),
    source: "admin",
  };
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [verse, setVerse] = useState<VerseCard | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [dailyTopic, setDailyTopic] = useState<DailyPrayerTopicRecord | null>(null);
  const [adminPrayer, setAdminPrayer] = useState<AdminPrayerRecord | null>(null);
  const [latestPodcast, setLatestPodcast] = useState<PrayerPodcastRecord | null>(null);
  const [readingSummary, setReadingSummary] = useState<ReadingSummary>(null);
  const [subjectCount, setSubjectCount] = useState(0);
  const [loadingHome, setLoadingHome] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userName = user?.nom ?? "Utilisateur";
  const userInitial = userName.charAt(0).toUpperCase();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  const loadHomeData = useCallback(async () => {
    setLoadingHome(true);

    const userId = user?.user_id ?? null;
    const [storedAdminPrayer, storedDailyTopic, storedPodcast] = await Promise.all([
      getLatestAdminPrayer("published").catch(() => null),
      getLatestDailyPrayerTopic("published").catch(() => null),
      getLatestPrayerPodcast("published").catch(() => null),
    ]);

    setAdminPrayer(storedAdminPrayer);
    setDailyTopic(storedDailyTopic);
    setLatestPodcast(storedPodcast);
    setVerse(getAdminVerse(storedAdminPrayer) ?? getDailyLocalVerse());

    if (userId) {
      const savedImage = await AsyncStorage.getItem(`profile_image_${userId}`);
      setProfileImage(savedImage);

      const rawSubjects = await AsyncStorage.getItem(`${SUBJECTS_KEY_PREFIX}:${userId}`);
      if (rawSubjects) {
        try {
          const parsed = JSON.parse(rawSubjects);
          setSubjectCount(Array.isArray(parsed) ? parsed.length : 0);
        } catch {
          setSubjectCount(0);
        }
      } else {
        setSubjectCount(0);
      }

      const { data } = await supabase
        .from("plan_lecture_utilisateur")
        .select("type_plan, jour_actuel")
        .eq("utilisateur_id", userId)
        .order("date_creation", { ascending: false })
        .limit(1);

      const planType = data?.[0]?.type_plan === "annuel" || data?.[0]?.type_plan === "mensuel"
        ? data[0].type_plan
        : null;

      if (planType) {
        const completedDays = await getCompletedDays(userId, planType).catch(() => []);
        const totalDays = planType === "annuel" ? 365 : 30;
        const currentDay = Number(data?.[0]?.jour_actuel);
        const nextDay = Number.isFinite(currentDay) && currentDay > 0 ? currentDay : completedDays.length + 1;

        setReadingSummary({
          planType,
          completedCount: completedDays.length,
          progress: calculateProgress(completedDays, totalDays),
          nextDay,
          label: planType === "annuel" ? "Plan annuel" : "Plan mensuel",
        });
      } else {
        setReadingSummary(null);
      }
    } else {
      setProfileImage(null);
      setSubjectCount(0);
      setReadingSummary(null);
    }

    setLoadingHome(false);
  }, [user?.user_id]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  async function refreshHome() {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  }

  const actionCards = useMemo(() => {
    const cards = [];

    if (dailyTopic) {
      cards.push({
        id: "daily-topic",
        title: dailyTopic.title || "Sujet de prière",
        subtitle: dailyTopic.theme || "Sujet journalier",
        icon: "sunny-outline" as const,
        route: "/priere",
      });
    }

    if (latestPodcast) {
      cards.push({
        id: "podcast",
        title: latestPodcast.title || "Podcast de prière",
        subtitle: latestPodcast.description || "Dernier audio publié",
        icon: "headset-outline" as const,
        route: "/podcast/audio",
      });
    }

    if (adminPrayer) {
      cards.push({
        id: "admin-prayer",
        title: adminPrayer.title || "Prière publiée",
        subtitle: adminPrayer.verseReference || "Prière de l’administrateur",
        icon: "document-text-outline" as const,
        route: "/priere/priere",
      });
    }

    if (cards.length === 0) {
      cards.push({
        id: "guidance",
        title: "Demander une guidance",
        subtitle: "Assistant spirituel",
        icon: "sparkles-outline" as const,
        route: "/guidance",
      });
    }

    return cards.slice(0, 3);
  }, [adminPrayer, dailyTopic, latestPodcast]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshHome} tintColor={COLORS.gold} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Kabod</Text>
            <Text style={styles.title}>
              {greeting}, {userLoading ? "..." : userName}
            </Text>
            <Text style={styles.subtitle}>Votre espace du jour, mis à jour avec vos données.</Text>
          </View>

          <Pressable style={styles.avatar} onPress={() => router.push("/profil")}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{userLoading ? "..." : userInitial}</Text>
            )}
          </Pressable>
        </View>

        <ImageBackground
          source={require("@/assets/images/fond2.jpg")}
          imageStyle={styles.verseImage}
          style={styles.verseCard}
        >
          <View style={styles.verseOverlay}>
            <View style={styles.verseHeader}>
              <Text style={styles.verseLabel}>{verse?.source === "admin" ? "Verset publié" : "Verset du jour"}</Text>
              {loadingHome && <ActivityIndicator color={COLORS.white} size="small" />}
            </View>

            {verse ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/bible/[bookId]/[chapterId]",
                    params: {
                      bookId: verse.bookId,
                      bookName: verse.bookId,
                      chapterId: String(verse.chapter),
                      verse: verse.verse,
                    },
                  })
                }
              >
                <Text style={styles.verseText} numberOfLines={5}>
                  “{verse.text}”
                </Text>
                <Text style={styles.verseRef}>
                  {verse.bookId} {verse.chapter}:{verse.verse}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.verseFallback}>Aucun verset disponible pour le moment.</Text>
            )}
          </View>
        </ImageBackground>

        <Pressable style={styles.readingCard} onPress={() => router.push("/meditation/lecture")}>
          <View style={styles.readingIcon}>
            <Ionicons name="book-outline" size={20} color={COLORS.blueDark} />
          </View>
          <View style={styles.readingBody}>
            <Text style={styles.readingLabel}>{readingSummary?.label ?? "Lecture biblique"}</Text>
            <Text style={styles.readingTitle}>
              {readingSummary ? `Jour ${readingSummary.nextDay}` : "Choisir un plan de lecture"}
            </Text>
            <Text style={styles.readingMeta}>
              {readingSummary
                ? `${readingSummary.completedCount} lectures validées`
                : "Votre progression apparaîtra ici."}
            </Text>
          </View>
          <View style={styles.readingProgress}>
            <Text style={styles.readingProgressValue}>{readingSummary ? `${readingSummary.progress}%` : "0%"}</Text>
          </View>
        </Pressable>

        <View style={styles.metrics}>
          <Metric
            icon="checkmark-done-outline"
            label="Progression"
            value={readingSummary ? `${readingSummary.progress}%` : "0%"}
          />
          <Metric icon="heart-outline" label="Sujets" value={String(subjectCount)} />
          <Metric icon="headset-outline" label="Podcast" value={latestPodcast ? "Publié" : "Aucun"} />
        </View>

        {dailyTopic && (
          <View style={styles.topicCard}>
            <View style={styles.topicIcon}>
              <Ionicons name="sunny-outline" size={21} color={COLORS.blueDark} />
            </View>
            <View style={styles.topicBody}>
              <Text style={styles.topicLabel}>Sujet de prière journalier</Text>
              <Text style={styles.topicTitle}>{dailyTopic.title}</Text>
              <Text style={styles.topicText} numberOfLines={3}>
                {dailyTopic.message}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>À reprendre</Text>
            <Pressable onPress={refreshHome}>
              <Text style={styles.seeAll}>Actualiser</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actions}>
            {actionCards.map((item) => (
              <Pressable key={item.id} style={styles.actionCard} onPress={() => router.push(item.route as any)}>
                <View style={styles.actionIcon}>
                  <Ionicons name={item.icon} size={22} color={COLORS.blueDark} />
                </View>
                <Text style={styles.actionSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                <Text style={styles.actionTitle} numberOfLines={2}>{item.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={COLORS.gold} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  headerText: { flex: 1 },
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 28, fontWeight: "900" },
  subtitle: { marginTop: 4, color: COLORS.gray, fontSize: 13, lineHeight: 18 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  avatarImage: { width: "100%", height: "100%" },
  verseCard: {
    minHeight: 260,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.blueDark,
  },
  verseImage: { borderRadius: 24 },
  verseOverlay: {
    flex: 1,
    padding: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "space-between",
  },
  verseHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verseLabel: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  verseText: { color: COLORS.white, fontSize: 25, lineHeight: 35, fontWeight: "900" },
  verseRef: { marginTop: 14, color: COLORS.white, fontSize: 12, fontWeight: "800" },
  verseFallback: { color: COLORS.white, fontSize: 14 },
  readingCard: {
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  readingBody: { flex: 1 },
  readingLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  readingTitle: { color: COLORS.blueDark, fontSize: 19, fontWeight: "900", marginTop: 2 },
  readingMeta: { color: COLORS.gray, fontSize: 12, fontWeight: "700", marginTop: 3 },
  readingProgress: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  readingProgressValue: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  metrics: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    justifyContent: "space-between",
  },
  metricValue: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  metricLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "800" },
  topicCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    padding: 15,
    flexDirection: "row",
    gap: 13,
  },
  topicIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  topicBody: { flex: 1 },
  topicLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  topicTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900", marginTop: 3 },
  topicText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, marginTop: 5 },
  section: { gap: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  seeAll: { color: COLORS.blue, fontSize: 12, fontWeight: "900" },
  actions: { gap: 12, paddingRight: 18 },
  actionCard: {
    width: 168,
    minHeight: 148,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSubtitle: { color: COLORS.gray, fontSize: 11, fontWeight: "900" },
  actionTitle: { color: COLORS.blueDark, fontSize: 16, lineHeight: 21, fontWeight: "900" },
});
