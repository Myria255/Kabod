import { BIBLE, isNewTestament, isOldTestament } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Testament = "old" | "new";

type BibleBook = {
  id: string;
  name: string;
};

export default function BiblePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Testament>("old");
  const [query, setQuery] = useState("");

  const books: BibleBook[] = useMemo(() => {
    return Object.keys(BIBLE).map((bookId) => ({
      id: bookId,
      name: bookId,
    }));
  }, []);

  const oldBooksCount = books.filter((book) => isOldTestament(book.id)).length;
  const newBooksCount = books.filter((book) => isNewTestament(book.id)).length;

  const filteredBooks = books
    .filter((book) => (activeTab === "old" ? isOldTestament(book.id) : isNewTestament(book.id)))
    .filter((book) => book.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={23} color={COLORS.blueDark} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Bible et bibliotheque</Text>
          <Text style={styles.headerTitle}>Explorer la Parole</Text>
        </View>
      </View>

      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <LinearGradient colors={[COLORS.blueDark, COLORS.blueMid]} style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="library-outline" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.heroTitle}>Votre bibliotheque biblique</Text>
              <Text style={styles.heroText}>
                Recherchez un livre, changez de testament et reprenez votre lecture en un geste.
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{oldBooksCount}</Text>
                  <Text style={styles.heroStatLabel}>Ancien</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{newBooksCount}</Text>
                  <Text style={styles.heroStatLabel}>Nouveau</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={COLORS.gray} />
              <TextInput
                placeholder="Rechercher un livre"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                placeholderTextColor={COLORS.gray}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                </Pressable>
              )}
            </View>

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setActiveTab("old")}
                style={[styles.tab, activeTab === "old" && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === "old" && styles.tabTextActive]}>
                  Ancien Testament
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("new")}
                style={[styles.tab, activeTab === "new" && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === "new" && styles.tabTextActive]}>
                  Nouveau Testament
                </Text>
              </Pressable>
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{filteredBooks.length} livres</Text>
              <Text style={styles.listHint}>{activeTab === "old" ? "Ancien Testament" : "Nouveau Testament"}</Text>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <Link
            href={{
              pathname: "/bible/[bookId]",
              params: {
                bookId: item.id,
                bookName: item.name,
              },
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
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={24} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucun livre trouve</Text>
            <Text style={styles.emptyText}>Essayez un autre terme de recherche.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCopy: { flex: 1 },
  headerEyebrow: { color: COLORS.gold, fontSize: 12, fontWeight: "900" },
  headerTitle: { marginTop: 2, color: COLORS.blueDark, fontSize: 24, fontWeight: "900" },
  content: { paddingHorizontal: 18, paddingBottom: 30, gap: 12 },
  hero: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { marginTop: 14, color: COLORS.white, fontSize: 24, fontWeight: "900" },
  heroText: { marginTop: 8, color: "#D7DEEA", fontSize: 14, lineHeight: 21 },
  heroStats: { marginTop: 16, flexDirection: "row", gap: 10 },
  heroStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
  },
  heroStatValue: { color: COLORS.gold, fontSize: 20, fontWeight: "900" },
  heroStatLabel: { marginTop: 3, color: COLORS.white, fontSize: 12, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 13,
    height: 50,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.blueDark },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 5,
    gap: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tabActive: { backgroundColor: COLORS.blueDark },
  tabText: { fontSize: 13, fontWeight: "800", color: COLORS.gray, textAlign: "center" },
  tabTextActive: { color: COLORS.white },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  listTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  listHint: { color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  bookIndex: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bookIndexText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  bookBody: { flex: 1 },
  bookName: { fontSize: 16, color: COLORS.blueDark, fontWeight: "900" },
  bookMeta: { marginTop: 3, color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.white,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { marginTop: 8, color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 4, color: COLORS.gray, fontSize: 13 },
});
