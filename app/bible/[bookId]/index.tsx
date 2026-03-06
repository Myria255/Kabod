import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getChapters } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";

export default function ChaptersPage() {
  const router = useRouter();

  const { bookId, bookName } = useLocalSearchParams<{
    bookId: string;
    bookName: string;
  }>();
  const safeBookId = (Array.isArray(bookId) ? bookId[0] : bookId) ?? "";
  const safeBookName = (Array.isArray(bookName) ? bookName[0] : bookName) ?? "";
  const displayBookName =
    safeBookName ||
    (safeBookId
      ? safeBookId.charAt(0).toUpperCase() + safeBookId.slice(1)
      : "");

  const [chapters, setChapters] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!safeBookId) return;

    try {
      setLoading(true);

      const chapterKeys = getChapters(safeBookId);
      const parsed = chapterKeys
        .map((c) => parseInt(c, 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      setChapters(parsed);
    } finally {
      setLoading(false);
    }
  }, [safeBookId]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerSide}>
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.blueDark}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{displayBookName}</Text>
        </View>

        <View style={styles.headerSide} />
      </View>

      {/* CONTENT */}
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator color={COLORS.gold} />
        ) : (
          <FlatList
            data={chapters}
            numColumns={5}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.chapter,
                  pressed && { opacity: 0.6 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/bible/[bookId]/[chapterId]",
                    params: {
                      bookId: safeBookId,
                      bookName: displayBookName,
                      chapterId: item.toString(),
                    },
                  })
                }
              >
                <Text style={styles.chapterText}>{item}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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

  grid: {
    gap: 12,
  },

  chapter: {
    flex: 1,
    margin: 6,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  chapterText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.blueDark,
  },
});
