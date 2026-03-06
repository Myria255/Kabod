import { BIBLE, isNewTestament, isOldTestament } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

  /* ================= LIVRES (JSON LOCAL) ================= */
  const books: BibleBook[] = useMemo(() => {
    return Object.keys(BIBLE).map((bookId) => ({
      id: bookId,
      name: bookId, // mapping FR possible plus tard
    }));
  }, []);

  /* ================= FILTRAGE ================= */
  const filteredBooks = books
    .filter((b) =>
      activeTab === "old"
        ? isOldTestament(b.id)
        : isNewTestament(b.id)
    )
    .filter((b) =>
      b.name.toLowerCase().includes(query.trim().toLowerCase())
    );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerSide}>
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.blueDark}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bible</Text>
        </View>

        <View style={styles.headerSide} />
      </View>

      {/* ================= CONTENT ================= */}
      <View style={styles.container}>
        {/* RECHERCHE */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color={COLORS.gray}
          />
          <TextInput
            placeholder="Rechercher un livre"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {/* SWITCH TESTAMENT */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab("old")}
            style={[
              styles.tab,
              activeTab === "old" && styles.tabActive,
            ]}
          >
            <Text
              style={
                activeTab === "old"
                  ? styles.tabTextActive
                  : styles.tabText
              }
            >
              Ancien Testament
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("new")}
            style={[
              styles.tab,
              activeTab === "new" && styles.tabActive,
            ]}
          >
            <Text
              style={
                activeTab === "new"
                  ? styles.tabTextActive
                  : styles.tabText
              }
            >
              Nouveau Testament
            </Text>
          </Pressable>
        </View>

        {/* LISTE */}
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
                <Text style={styles.bookName}>{item.name}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.gray}
                />
              </Pressable>
            </Link>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: COLORS.white,
  },

  headerSide: {
    width: 40,
    alignItems: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.blueDark,
  },

  /* CONTENT */
  container: {
    flex: 1,
    padding: 16,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.blueDark,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },

  tabActive: {
    backgroundColor: COLORS.blueDark,
    borderRadius: 12,
  },

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray,
  },

  tabTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  bookName: {
    fontSize: 16,
    color: COLORS.blueDark,
    fontWeight: "500",
  },
});
