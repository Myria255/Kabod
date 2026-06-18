import { BIBLE, isNewTestament, isOldTestament } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { calculateProgress, getCompletedDays } from "@/src/stockage/readingProgress";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Testament = "old" | "new";

type ReadingSummary = {
  planType: "annuel" | "mensuel";
  completedCount: number;
  progress: number;
  nextDay: number;
  label: string;
} | null;

export default function BibleTabPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Testament>("old");
  const [query, setQuery] = useState("");
  const [readingSummary, setReadingSummary] = useState<ReadingSummary>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const books = useMemo(() => Object.keys(BIBLE).map((id) => ({ id, name: id })), []);
  const filteredBooks = books
    .filter((book) => (activeTab === "old" ? isOldTestament(book.id) : isNewTestament(book.id)))
    .filter((book) => book.name.toLowerCase().includes(query.trim().toLowerCase()));

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPlan() {
        if (!user?.user_id) {
          if (isActive) {
            setReadingSummary(null);
            setLoadingPlan(false);
          }
          return;
        }

        try {
          const { data } = await supabase
            .from("plan_lecture_utilisateur")
            .select("type_plan, jour_actuel")
            .eq("utilisateur_id", user.user_id)
            .order("date_creation", { ascending: false })
            .limit(1);

          const planType = data?.[0]?.type_plan === "annuel" || data?.[0]?.type_plan === "mensuel"
            ? data[0].type_plan
            : null;

          if (planType && isActive) {
            const completedDays = await getCompletedDays(user.user_id, planType).catch(() => []);
            const totalDays = planType === "annuel" ? 365 : 30;
            const currentDay = Number(data?.[0]?.jour_actuel);
            const nextDay = Number.isFinite(currentDay) && currentDay > 0 ? currentDay : completedDays.length + 1;

            setReadingSummary({
              planType,
              completedCount: completedDays.length,
              progress: calculateProgress(completedDays, totalDays),
              nextDay,
              label: planType === "annuel" ? "Plan biblique annuel" : "Plan de découverte",
            });
          } else if (isActive) {
            setReadingSummary(null);
          }
        } catch (error) {
          console.error("Error loading plan in library", error);
        } finally {
          if (isActive) setLoadingPlan(false);
        }
      }

      loadPlan();
      return () => {
        isActive = false;
      };
    }, [user?.user_id])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.top}>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Bibliothèque</Text>
              <Text style={styles.title}>Bible</Text>
              <Text style={styles.subtitle}>Explorez les Écritures et reprenez votre parcours de lecture.</Text>
            </View>

            <View style={styles.planCard}>
              <View style={styles.planTop}>
                <View style={styles.planIcon}>
                  <Ionicons name="book-outline" size={22} color={COLORS.blueDark} />
                </View>
                <Text style={styles.planPill}>Chemin de lecture</Text>
              </View>
              <Text style={styles.planTitle}>
                {readingSummary ? readingSummary.label : loadingPlan ? "Chargement du plan..." : "Aucun plan actif"}
              </Text>
              <Text style={styles.planText}>
                {readingSummary
                  ? "Retrouvez un rythme spirituel régulier à travers une exploration quotidienne de la Parole."
                  : "Sélectionnez un programme de lecture pour commencer à suivre votre progression quotidienne."}
              </Text>
              
              {readingSummary && (
                <View style={styles.progressBox}>
                  <View>
                    <Text style={styles.progressLabel}>Progrès actuel</Text>
                    <Text style={styles.progressTitle}>Jour {readingSummary.nextDay}</Text>
                  </View>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressPercent}>{readingSummary.progress}%</Text>
                  </View>
                </View>
              )}
              
              <Pressable style={styles.primaryButton} onPress={() => router.push("/meditation/lecture")}>
                <Text style={styles.primaryText}>{readingSummary ? "Continuer" : "Commencer un plan"}</Text>
                <Ionicons name={readingSummary ? "play" : "arrow-forward"} size={16} color={COLORS.white} />
              </Pressable>
            </View>

            <View style={styles.search}>
              <Ionicons name="search-outline" size={18} color={COLORS.gray} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher un livre"
                placeholderTextColor={COLORS.gray}
                style={styles.input}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                </Pressable>
              )}
            </View>

            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, activeTab === "old" && styles.tabActive]}
                onPress={() => setActiveTab("old")}
              >
                <Text style={[styles.tabText, activeTab === "old" && styles.tabTextActive]}>Ancien Testament</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === "new" && styles.tabActive]}
                onPress={() => setActiveTab("new")}
              >
                <Text style={[styles.tabText, activeTab === "new" && styles.tabTextActive]}>Nouveau Testament</Text>
              </Pressable>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Livres</Text>
              <Text style={styles.sectionHint}>{filteredBooks.length} résultats</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Link
            href={{
              pathname: "/bible/[bookId]",
              params: { bookId: item.id, bookName: item.name },
            }}
            asChild
          >
            <Pressable style={styles.row}>
              <View style={styles.bookIndex}>
                <Text style={styles.bookIndexText}>{String(index + 1).padStart(2, "0")}</Text>
              </View>
              <View style={styles.bookBody}>
                <Text style={styles.bookName}>{item.name}</Text>
                <Text style={styles.bookMeta}>Ouvrir les chapitres</Text>
              </View>
              <View style={styles.bookChevron}>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
              </View>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={24} color={COLORS.gray} />
            <Text style={styles.emptyText}>Aucun livre trouvé.</Text>
          </View>
        }
      />
    </SafeAreaView>
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
  },
  top: { gap: 16, marginBottom: 8 },
  header: { gap: 4 },
  eyebrow: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  planCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 15,
  },
  planTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  planPill: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  planTitle: { color: COLORS.blueDark, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  planText: { color: COLORS.gray, fontSize: 14, lineHeight: 22 },
  progressBox: {
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: { color: COLORS.gray, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  progressTitle: { marginTop: 4, color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  progressCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercent: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  primaryButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: COLORS.white, fontSize: 15, fontWeight: "900" },
  search: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  input: { flex: 1, color: COLORS.blueDark, fontSize: 15 },
  tabs: {
    height: 54,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    padding: 5,
    gap: 5,
  },
  tab: { flex: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  tabActive: { backgroundColor: COLORS.blueDark },
  tabText: { color: COLORS.gray, fontSize: 13, fontWeight: "800", textAlign: "center" },
  tabTextActive: { color: COLORS.white },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  sectionHint: { color: COLORS.gray, fontSize: 12, fontWeight: "800" },
  row: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  bookIndex: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  bookIndexText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  bookBody: { flex: 1 },
  bookName: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  bookMeta: { marginTop: 3, color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  bookChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    paddingVertical: 28,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { color: COLORS.gray, fontSize: 15, fontWeight: "700" },
});
