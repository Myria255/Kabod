import { BIBLE } from "@/src/constants/bible";
import { useUser } from "@/src/context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  blueDark: "#0F172A",
  blueMid: "#1E293B",
  gold: "#D4AF37",
  gray: "#64748B",
  grayLight: "#F1F5F9",
  white: "#FFFFFF",
};

type RandomVerse = {
  text: string;
  bookId: string;
  chapter: number;
  verse: string;
};

export default function HomePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [verse, setVerse] = useState<RandomVerse | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon apres-midi";
    return "Bonsoir";
  }, []);

  const userName = user?.nom ?? "Utilisateur";
  const userInitial = userName.charAt(0).toUpperCase();

  function loadRandomVerse() {
    try {
      setLoadingVerse(true);
      const books = Object.keys(BIBLE);
      const randomBookId = books[Math.floor(Math.random() * books.length)];
      const chapters = Object.keys(BIBLE[randomBookId] ?? {});
      const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
      const verses = Object.entries(BIBLE[randomBookId]?.[randomChapter] ?? {});
      const [verseNumber, verseText] = verses[Math.floor(Math.random() * verses.length)];

      setVerse({
        bookId: randomBookId,
        chapter: Number(randomChapter),
        verse: String(verseNumber),
        text: String(verseText),
      });
    } catch {
      setVerse(null);
    } finally {
      setLoadingVerse(false);
    }
  }

  useEffect(() => {
    loadRandomVerse();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting}
            </Text>
            <Text style={styles.title}>{userLoading ? "" : ` ${userName}`}</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => router.push("/profil")}>
            <Text style={styles.avatarText}>{userLoading ? "..." : userInitial}</Text>
          </Pressable>
        </View>

        <View style={styles.verseCard}>
          <View style={styles.verseHead}>
            <Text style={styles.verseLabel}>Verset du jour</Text>
            <Pressable style={styles.refreshBtn} onPress={loadRandomVerse}>
              <Ionicons name="refresh" size={16} color={COLORS.blueDark} />
            </Pressable>
          </View>

          {loadingVerse ? (
            <ActivityIndicator size="small" color={COLORS.gold} style={{ marginTop: 12 }} />
          ) : verse ? (
            <>
              <Text style={styles.verseText}>{verse.text}</Text>
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
                <Text style={styles.verseRef}>
                  {verse.bookId} {verse.chapter}:{verse.verse}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.errorText}>Impossible de charger le verset.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    marginTop: 2,
    color: COLORS.blueDark,
    fontSize: 28,
    fontWeight: "800",
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  verseCard: {
    backgroundColor: COLORS.blueMid,
    borderRadius: 18,
    padding: 14,
  },
  verseHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verseLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  verseText: {
    marginTop: 10,
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "500",
  },
  verseRef: {
    marginTop: 10,
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  errorText: {
    marginTop: 10,
    color: "#E2E8F0",
    fontSize: 13,
  },
});
