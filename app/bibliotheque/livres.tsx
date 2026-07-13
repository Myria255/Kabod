import { COLORS } from "@/src/constants/colors";
import {
  getBookAssetUrl,
  getPublishedBooks,
  scopeLabel,
  type LibraryBook,
} from "@/src/services/bookLibrarySupabase";
import {
  getMyBookProgress,
  markBookCompleted,
  markBookInProgress,
  type LibraryBookProgress,
} from "@/src/services/bookProgressSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatSize(value: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function progressLabel(progress: LibraryBookProgress | undefined) {
  if (!progress) return "À lire";
  if (progress.status === "completed") return "Terminé";
  return "En cours";
}

function progressPercent(progress: LibraryBookProgress | undefined) {
  if (!progress) return 0;
  return Math.max(0, Math.min(progress.progressPercent, 100));
}

export default function LibraryBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [progressByBook, setProgressByBook] = useState<Record<string, LibraryBookProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [updatingProgressId, setUpdatingProgressId] = useState<string | null>(null);

  const filteredBooks = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
      const matchesQuery =
        !cleanQuery ||
        `${book.title} ${book.author ?? ""} ${book.category ?? ""}`.toLowerCase().includes(cleanQuery);
      return matchesCategory && matchesQuery;
    });
  }, [books, query, selectedCategory]);

  const categories = useMemo(() => {
    const unique = [...new Set(books.map((book) => book.category).filter(Boolean))] as string[];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [books]);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const [rows, progressRows] = await Promise.all([
        getPublishedBooks(),
        getMyBookProgress().catch(() => []),
      ]);
      setBooks(rows);
      setProgressByBook(
        Object.fromEntries(progressRows.map((progress) => [progress.bookId, progress]))
      );
      const covers: Record<string, string> = {};
      await Promise.all(
        rows
          .filter((book) => book.coverObjectKey)
          .map(async (book) => {
            try {
              covers[book.id] = await getBookAssetUrl(book.id, "cover");
            } catch {
              // Une couverture manquante ne doit pas bloquer la bibliothèque.
            }
          })
      );
      setCoverUrls(covers);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les livres.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshPage() {
    setRefreshing(true);
    await loadPage();
  }

  async function openBook(book: LibraryBook) {
    setOpeningId(book.id);
    try {
      const url = await getBookAssetUrl(book.id, "file");
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Lecture impossible", "Impossible d’ouvrir ce livre pour le moment.");
        return;
      }
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert("Ouverture impossible", error?.message ?? "Impossible d’ouvrir ce livre.");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleStartBook(book: LibraryBook) {
    setUpdatingProgressId(book.id);
    try {
      const progress = await markBookInProgress(book.id);
      setProgressByBook((current) => ({ ...current, [book.id]: progress }));
      await openBook(book);
    } catch (error: any) {
      Alert.alert("Progression impossible", error?.message ?? "Impossible de démarrer ce livre.");
    } finally {
      setUpdatingProgressId(null);
    }
  }

  async function handleCompleteBook(book: LibraryBook) {
    setUpdatingProgressId(book.id);
    try {
      const progress = await markBookCompleted(book.id);
      setProgressByBook((current) => ({ ...current, [book.id]: progress }));
    } catch (error: any) {
      Alert.alert("Progression impossible", error?.message ?? "Impossible de terminer ce livre.");
    } finally {
      setUpdatingProgressId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshPage} tintColor={COLORS.gold} />}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Bibliothèque</Text>
            <Text style={styles.title}>Livres & documents</Text>
            <Text style={styles.subtitle}>Lisez ou téléchargez les ressources publiées par Kabod.</Text>
          </View>
        </View>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un livre..."
            placeholderTextColor={COLORS.gray}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </Pressable>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{books.length}</Text>
            <Text style={styles.statLabel}>Ressources</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{books.filter((book) => book.fileType === "audio").length}</Text>
            <Text style={styles.statLabel}>Audios</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{books.filter((book) => book.isDownloadable).length}</Text>
            <Text style={styles.statLabel}>Téléchargeables</Text>
          </View>
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            <Pressable
              style={[styles.categoryChip, selectedCategory === "all" && styles.categoryChipActive]}
              onPress={() => setSelectedCategory("all")}
            >
              <Text style={[styles.categoryText, selectedCategory === "all" && styles.categoryTextActive]}>
                Tout
              </Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category}
                style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : filteredBooks.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={28} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucun livre disponible</Text>
            <Text style={styles.emptyText}>Les livres publiés par l’administrateur apparaîtront ici.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredBooks.map((book) => {
              const progress = progressByBook[book.id];
              const percent = progressPercent(progress);

              return (
              <View key={book.id} style={styles.bookCard}>
                {coverUrls[book.id] ? (
                  <Image source={{ uri: coverUrls[book.id] }} style={styles.cover} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <MaterialCommunityIcons name="book-open-variant" size={36} color={COLORS.gold} />
                  </View>
                )}
                <View style={styles.bookBody}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>{book.author || "Kabod"}</Text>
                  <Text style={styles.bookMeta} numberOfLines={1}>
                    {book.fileType.toUpperCase()} {formatSize(book.fileSize)} · {scopeLabel(book.targetScope)}
                  </Text>
                  {!!book.description && (
                    <Text style={styles.bookDescription} numberOfLines={3}>{book.description}</Text>
                  )}
                </View>
                <View style={styles.progressPanel}>
                  <View style={styles.progressTop}>
                    <Text style={styles.progressLabel}>{progressLabel(progress)}</Text>
                    <Text style={styles.progressPercent}>{percent}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${percent}%` }]} />
                  </View>
                </View>
                <View style={styles.bookActionRow}>
                  <Pressable
                    style={[styles.secondaryButton, updatingProgressId === book.id && styles.disabled]}
                    disabled={updatingProgressId === book.id}
                    onPress={() => handleStartBook(book)}
                  >
                    <Ionicons name="play-outline" size={15} color={COLORS.blueDark} />
                    <Text style={styles.secondaryButtonText}>{progress ? "Reprendre" : "Commencer"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.doneButton, updatingProgressId === book.id && styles.disabled]}
                    disabled={updatingProgressId === book.id}
                    onPress={() => handleCompleteBook(book)}
                  >
                    <Ionicons name="checkmark-done-outline" size={15} color={COLORS.white} />
                    <Text style={styles.doneButtonText}>Terminé</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.openButton, openingId === book.id && styles.disabled]}
                  disabled={openingId === book.id}
                  onPress={() => openBook(book)}
                >
                  {openingId === book.id ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.openButtonText}>
                        {book.isDownloadable ? "Lire / télécharger" : "Lire"}
                      </Text>
                      <Ionicons name="open-outline" size={16} color={COLORS.white} />
                    </>
                  )}
                </Pressable>
              </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 16,
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  search: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
  },
  searchInput: { flex: 1, color: COLORS.blueDark, fontSize: 14.5 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    justifyContent: "center",
    gap: 3,
  },
  statValue: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  statLabel: { color: COLORS.gray, fontSize: 10.5, fontWeight: "800" },
  categoryRow: { gap: 8, paddingRight: 16 },
  categoryChip: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  categoryText: { color: COLORS.gray, fontSize: 12.5, fontWeight: "900" },
  categoryTextActive: { color: COLORS.white },
  centerCard: {
    minHeight: 150,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, textAlign: "center" },
  grid: { gap: 14 },
  bookCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  cover: { width: "100%", height: 210, backgroundColor: COLORS.blueDark },
  coverPlaceholder: {
    height: 190,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBody: { padding: 16, gap: 6 },
  bookTitle: { color: COLORS.blueDark, fontSize: 19, lineHeight: 24, fontWeight: "900" },
  bookAuthor: { color: COLORS.gold, fontSize: 13, fontWeight: "900" },
  bookMeta: { color: COLORS.gray, fontSize: 11.5, fontWeight: "800" },
  bookDescription: { color: COLORS.gray, fontSize: 13, lineHeight: 20, marginTop: 3 },
  progressPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    padding: 12,
    gap: 8,
  },
  progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  progressPercent: { color: COLORS.gold, fontSize: 12, fontWeight: "900" },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  bookActionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.goldSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryButtonText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  doneButton: {
    flex: 1,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.emerald,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  doneButtonText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  openButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabled: { opacity: 0.65 },
  openButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
});
