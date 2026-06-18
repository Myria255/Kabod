import { COLORS } from "@/src/constants/colors";
import { getLiveStreams, type LiveStreamRecord } from "@/src/services/liveStreamSupabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PodcastReplaysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LiveStreamRecord[]>([]);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const rows = await getLiveStreams();
      setItems(rows.filter((item) => item.status === "replay"));
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les replays.");
    } finally {
      setLoading(false);
    }
  }

  async function openReplay(url: string | null) {
    if (!url) {
      Alert.alert("Indisponible", "Aucun replay disponible pour ce contenu.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Ouverture impossible", "Impossible d'ouvrir ce replay pour le moment.");
      return;
    }

    await Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Replays</Text>
            <Text style={styles.subtitle}>Tous les replays disponibles dans un affichage compact.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={COLORS.gold} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="play-circle-outline" size={22} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucun replay disponible</Text>
            <Text style={styles.emptyText}>Les replays accessibles apparaitront ici.</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {items.map((item) => (
              <Pressable key={item.id ?? item.title} style={styles.itemCard} onPress={() => openReplay(item.replayUrl ?? item.streamUrl)}>
                <View style={styles.itemIcon}>
                  <Ionicons name="play-circle-outline" size={18} color={COLORS.gold} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemText} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.itemMeta}>{formatDate(item.scheduledAt)}</Text>
                </View>
                <Ionicons name="open-outline" size={20} color={COLORS.blueDark} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 14 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 4 },
  title: { color: COLORS.blueDark, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  loaderWrap: { paddingVertical: 40, alignItems: "center", justifyContent: "center" },
  listWrap: { gap: 10 },
  itemCard: { borderRadius: 16, backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  itemBody: { flex: 1, gap: 3 },
  itemTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "800" },
  itemText: { color: COLORS.gray, fontSize: 12.5, lineHeight: 17 },
  itemMeta: { color: COLORS.gray, fontSize: 11.5, fontWeight: "600" },
  emptyCard: { borderRadius: 18, backgroundColor: "#F8FAFC", padding: 20, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { color: COLORS.blueDark, fontSize: 15, fontWeight: "800" },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
