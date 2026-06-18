import { COLORS } from "@/src/constants/colors";
import { calculateProgress, getCompletedDays } from "@/src/stockage/readingProgress";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TypePlan = "annuel" | "mensuel";

type PlanSummary = {
  type: TypePlan;
  day: number;
  completedCount: number;
  progress: number;
};

const PLAN_START_KEY = "PLAN_START_DATE_V1";
const PLAN_TYPE_CACHE_KEY = "PLAN_TYPE_CACHE_V1";
const PLAN_UNREAD_NOTIFICATION_KEY = "PLAN_UNREAD_NOTIFICATION_V1";
const READING_PROGRESS_CACHE_KEY = "READING_PROGRESS_CACHE_V1";
const READING_PROGRESS_PENDING_KEY = "READING_PROGRESS_PENDING_V1";
const READING_POSITION_KEY = "READING_POSITION_V1";
const LEGACY_MONTHLY_READ_KEY = "MONTHLY_BOOK_READ_V1";
const ANNUAL_DAY_READ_KEY = "ANNUAL_DAY_READ_V1";
const READING_DELAY_ALERT_KEY = "READING_DELAY_ALERT_V1";

const PLANS = [
  {
    type: "annuel" as const,
    title: "Plan annuel",
    subtitle: "Toute la Bible en 365 jours",
    detail: "Un parcours progressif pour lire régulièrement, jour après jour.",
    icon: "calendar-outline" as const,
    total: 365,
  },
  {
    type: "mensuel" as const,
    title: "Plan mensuel",
    subtitle: "Un livre à approfondir chaque mois",
    detail: "Un rythme plus posé pour méditer livre par livre.",
    icon: "book-outline" as const,
    total: 30,
  },
];

export default function IndexLecture() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<TypePlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanSummary | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const selectedPlanInfo = useMemo(
    () => PLANS.find((plan) => plan.type === currentPlan?.type) ?? null,
    [currentPlan?.type]
  );

  const clearPlanChoiceCache = useCallback(async (userId: string) => {
    const allKeys = await AsyncStorage.getAllKeys();
    const dynamicKeys = allKeys.filter((key) =>
      key.startsWith(`${ANNUAL_DAY_READ_KEY}:${userId}:`) ||
      key.startsWith(`${READING_DELAY_ALERT_KEY}:${userId}:`) ||
      key.startsWith(`${READING_POSITION_KEY}:${userId}:`) ||
      key.startsWith(`${LEGACY_MONTHLY_READ_KEY}:${userId}:`)
    );

    const staticKeys = [
      `${PLAN_TYPE_CACHE_KEY}:${userId}`,
      `${PLAN_START_KEY}:${userId}:annuel`,
      `${PLAN_START_KEY}:${userId}:mensuel`,
      `${PLAN_UNREAD_NOTIFICATION_KEY}:${userId}:annuel`,
      `${PLAN_UNREAD_NOTIFICATION_KEY}:${userId}:mensuel`,
      `${READING_PROGRESS_CACHE_KEY}:${userId}:annuel`,
      `${READING_PROGRESS_CACHE_KEY}:${userId}:mensuel`,
      READING_PROGRESS_PENDING_KEY,
    ];

    await AsyncStorage.multiRemove([...new Set([...staticKeys, ...dynamicKeys])]);
  }, []);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login" as any);
        return;
      }

      setAuthUserId(user.id);

      const cacheKey = `${PLAN_TYPE_CACHE_KEY}:${user.id}`;
      const { data, error } = await supabase
        .from("plan_lecture_utilisateur")
        .select("type_plan, jour_actuel")
        .eq("utilisateur_id", user.id)
        .order("date_creation", { ascending: false })
        .limit(1);

      if (error) throw error;

      const row = data?.[0];
      const remoteType = row?.type_plan === "annuel" || row?.type_plan === "mensuel" ? row.type_plan : null;
      const cachedType = (await AsyncStorage.getItem(cacheKey)) as TypePlan | null;
      const resolvedType = remoteType ?? (cachedType === "annuel" || cachedType === "mensuel" ? cachedType : null);

      if (!resolvedType) {
        setCurrentPlan(null);
        return;
      }

      await AsyncStorage.setItem(cacheKey, resolvedType);
      const completedDays = await getCompletedDays(user.id, resolvedType).catch(() => []);
      const total = resolvedType === "annuel" ? 365 : 30;
      const dbDay = Number(row?.jour_actuel);
      const day = Number.isFinite(dbDay) && dbDay > 0 ? dbDay : completedDays.length + 1;

      setCurrentPlan({
        type: resolvedType,
        day,
        completedCount: completedDays.length,
        progress: calculateProgress(completedDays, total),
      });
    } catch {
      setCurrentPlan(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
  );

  function openPlan(type: TypePlan) {
    router.push(type === "annuel" ? "/meditation/lecture/annuel" : "/meditation/lecture/mensuel");
  }

  async function savePlan(type: TypePlan) {
    if (!authUserId) {
      router.replace("/(auth)/login" as any);
      return;
    }

    setSavingPlan(type);

    try {
      await clearPlanChoiceCache(authUserId);
      const nowIso = new Date().toISOString();
      const storageKey = `${PLAN_START_KEY}:${authUserId}:${type}`;

      const { data: existingRows, error: existingError } = await supabase
        .from("plan_lecture_utilisateur")
        .select("utilisateur_id")
        .eq("utilisateur_id", authUserId)
        .limit(1);

      if (existingError) throw existingError;

      const payload = {
        type_plan: type,
        jour_actuel: 1,
      };

      if ((existingRows?.length ?? 0) > 0) {
        const updateResp = await supabase
          .from("plan_lecture_utilisateur")
          .update(payload)
          .eq("utilisateur_id", authUserId);

        if (updateResp.error) throw updateResp.error;
      } else {
        const insertResp = await supabase
          .from("plan_lecture_utilisateur")
          .insert({
            utilisateur_id: authUserId,
            ...payload,
            date_creation: nowIso,
          })
          .select("utilisateur_id")
          .single();

        if (insertResp.error) throw insertResp.error;
      }

      await AsyncStorage.setItem(`${PLAN_TYPE_CACHE_KEY}:${authUserId}`, type);
      await AsyncStorage.setItem(storageKey, nowIso);
      setCurrentPlan({ type, day: 1, completedCount: 0, progress: 0 });
      openPlan(type);
    } catch (error: any) {
      Alert.alert(
        "Sauvegarde impossible",
        error?.message ?? "Le choix du plan n’a pas pu être enregistré."
      );
    } finally {
      setSavingPlan(null);
    }
  }

  function confirmPlanChoice(type: TypePlan) {
    const isChanging = currentPlan && currentPlan.type !== type;
    if (!isChanging) {
      savePlan(type);
      return;
    }

    Alert.alert(
      "Changer de programme",
      "Votre progression du programme actuel sera réinitialisée pour démarrer ce nouveau plan.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Changer", style: "destructive", onPress: () => savePlan(type) },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.blueDark} />
          </Pressable>
          <Text style={styles.navTitle}>Programmes</Text>
          <Pressable style={styles.iconButton} onPress={loadPlan}>
            <Ionicons name="refresh" size={18} color={COLORS.blueDark} />
          </Pressable>
        </View>

        <LinearGradient colors={[COLORS.blueDark, COLORS.blueMid]} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="bookmarks-outline" size={24} color={COLORS.blueDark} />
          </View>
          <Text style={styles.heroLabel}>Lecture biblique</Text>
          <Text style={styles.heroTitle}>Choisissez votre rythme</Text>
          <Text style={styles.heroText}>
            Retrouvez votre programme en cours ou démarrez un nouveau parcours adapté à votre saison.
          </Text>
        </LinearGradient>

        {currentPlan && selectedPlanInfo && (
          <View style={styles.currentCard}>
            <View style={styles.currentTop}>
              <View>
                <Text style={styles.currentLabel}>Programme actif</Text>
                <Text style={styles.currentTitle}>{selectedPlanInfo.title}</Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressValue}>{currentPlan.progress}%</Text>
              </View>
            </View>

            <View style={styles.currentStats}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>Jour {currentPlan.day}</Text>
                <Text style={styles.statLabel}>Prochaine étape</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{currentPlan.completedCount}</Text>
                <Text style={styles.statLabel}>Validés</Text>
              </View>
            </View>

            <Pressable style={styles.continueButton} onPress={() => openPlan(currentPlan.type)}>
              <Text style={styles.continueText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={17} color={COLORS.blueDark} />
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentPlan ? "Changer de programme" : "Démarrer un programme"}</Text>
          <Text style={styles.sectionHint}>2 options</Text>
        </View>

        <View style={styles.planList}>
          {PLANS.map((plan) => {
            const isActive = currentPlan?.type === plan.type;
            const isSaving = savingPlan === plan.type;

            return (
              <Pressable
                key={plan.type}
                style={[styles.planCard, isActive && styles.planCardActive]}
                disabled={savingPlan !== null}
                onPress={() => (isActive ? openPlan(plan.type) : confirmPlanChoice(plan.type))}
              >
                <View style={[styles.planIcon, isActive && styles.planIconActive]}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={isActive ? COLORS.white : COLORS.blueDark} />
                  ) : (
                    <Ionicons name={plan.icon} size={22} color={isActive ? COLORS.white : COLORS.blueDark} />
                  )}
                </View>

                <View style={styles.planBody}>
                  <View style={styles.planTitleRow}>
                    <Text style={[styles.planTitle, isActive && styles.textWhite]}>{plan.title}</Text>
                    {isActive && (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>Actif</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planSubtitle, isActive && styles.textWhiteSoft]}>{plan.subtitle}</Text>
                  <Text style={[styles.planDetail, isActive && styles.textWhiteSoft]}>{plan.detail}</Text>
                </View>

                <Ionicons
                  name={isActive ? "arrow-forward" : "chevron-forward"}
                  size={18}
                  color={isActive ? COLORS.gold : COLORS.gray}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.gold} />
          <Text style={styles.noteText}>
            Le choix d’un nouveau programme remet à zéro les caches de progression liés à l’ancien parcours.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  center: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 18,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: "900", lineHeight: 34 },
  heroText: { color: COLORS.blueSoft, fontSize: 14, lineHeight: 21 },
  currentCard: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
  },
  currentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  currentLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  currentTitle: { marginTop: 3, color: COLORS.blueDark, fontSize: 21, fontWeight: "900" },
  progressCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  progressValue: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  currentStats: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    padding: 12,
  },
  statValue: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  statLabel: { marginTop: 3, color: COLORS.gray, fontSize: 11, fontWeight: "800" },
  continueButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueText: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  sectionHint: { color: COLORS.gray, fontSize: 12, fontWeight: "800" },
  planList: { gap: 12 },
  planCard: {
    minHeight: 128,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  planCardActive: {
    backgroundColor: COLORS.blueDark,
    borderColor: COLORS.blueDark,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  planIconActive: { backgroundColor: "rgba(255,255,255,0.14)" },
  planBody: { flex: 1, gap: 4 },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  planSubtitle: { color: COLORS.gray, fontSize: 13, fontWeight: "800" },
  planDetail: { color: COLORS.gray, fontSize: 12, lineHeight: 18 },
  activePill: {
    borderRadius: 999,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  activePillText: { color: COLORS.blueDark, fontSize: 10, fontWeight: "900" },
  noteCard: {
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noteText: { flex: 1, color: COLORS.gray, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  textWhite: { color: COLORS.white },
  textWhiteSoft: { color: COLORS.blueSoft },
});
