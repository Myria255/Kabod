import { COLORS } from "@/src/constants/colors";
import { getChurchEvents, type ChurchEventRecord } from "@/src/services/churchEventSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatEventDate(value: string | null) {
  if (!value) return "Date à confirmer";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date à confirmer";

  return parsed.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isFutureEvent(value: string | null) {
  if (!value) return true;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() >= Date.now();
}

export default function CommunityEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<ChurchEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const nextEvent = useMemo(() => events.find((event) => isFutureEvent(event.eventDate)) ?? events[0] ?? null, [events]);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const rows = await getChurchEvents();
      setEvents(rows.filter((event) => event.status === "published"));
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les événements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshPage() {
    setRefreshing(true);
    await loadPage();
  }

  async function openRegistration(url: string | null) {
    if (!url) {
      Alert.alert("Inscription indisponible", "Aucun lien d’inscription n’a été ajouté pour cet événement.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Lien indisponible", "Impossible d’ouvrir ce lien pour le moment.");
      return;
    }

    await Linking.openURL(url);
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
            <Text style={styles.eyebrow}>Communauté</Text>
            <Text style={styles.title}>Événements</Text>
            <Text style={styles.subtitle}>Retrouvez les rendez-vous publiés par l’équipe Kabod.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-heart" size={28} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucun événement publié</Text>
            <Text style={styles.emptyText}>Les prochains rendez-vous apparaîtront ici dès qu’ils seront disponibles.</Text>
          </View>
        ) : (
          <>
            {nextEvent && (
              <View style={styles.featuredCard}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={COLORS.blueDark} />
                  <Text style={styles.featuredBadgeText}>Prochain rendez-vous</Text>
                </View>
                <Text style={styles.featuredTitle}>{nextEvent.title}</Text>
                <Text style={styles.featuredText}>{nextEvent.description}</Text>
                <View style={styles.featuredMeta}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.gold} />
                  <Text style={styles.featuredMetaText}>{formatEventDate(nextEvent.eventDate)}</Text>
                </View>
                {!!nextEvent.location && (
                  <View style={styles.featuredMeta}>
                    <Ionicons name="location-outline" size={16} color={COLORS.gold} />
                    <Text style={styles.featuredMetaText}>{nextEvent.location}</Text>
                  </View>
                )}
                <Pressable style={styles.featuredButton} onPress={() => openRegistration(nextEvent.registrationUrl)}>
                  <Text style={styles.featuredButtonText}>
                    {nextEvent.registrationUrl ? "S’inscrire / voir le lien" : "Voir les détails"}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={COLORS.blueDark} />
                </Pressable>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tous les événements</Text>
              <Text style={styles.sectionCount}>{events.length}</Text>
            </View>

            <View style={styles.list}>
              {events.map((event) => (
                <View key={event.id ?? event.title} style={styles.eventCard}>
                  <View style={styles.eventIcon}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.gold} />
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                    <Text style={styles.eventMeta}>{formatEventDate(event.eventDate)}</Text>
                    {!!event.location && <Text style={styles.eventMeta}>{event.location}</Text>}
                    <Pressable style={styles.smallButton} onPress={() => openRegistration(event.registrationUrl)}>
                      <Text style={styles.smallButtonText}>
                        {event.registrationUrl ? "Ouvrir le lien" : "Lien non disponible"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
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
  centerCard: {
    minHeight: 160,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    padding: 24,
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center", lineHeight: 20 },
  featuredCard: {
    borderRadius: 28,
    backgroundColor: COLORS.blueDark,
    padding: 20,
    gap: 12,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featuredBadgeText: { color: COLORS.blueDark, fontSize: 11, fontWeight: "900" },
  featuredTitle: { color: COLORS.white, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  featuredText: { color: "#D1D5DB", fontSize: 14, lineHeight: 21 },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredMetaText: { flex: 1, color: COLORS.white, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  featuredButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  featuredButtonText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  sectionCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    color: COLORS.blueDark,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "900",
    overflow: "hidden",
  },
  list: { gap: 12 },
  eventCard: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  eventBody: { flex: 1, gap: 6 },
  eventTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  eventDescription: { color: COLORS.gray, fontSize: 13, lineHeight: 19 },
  eventMeta: { color: COLORS.blueDark, fontSize: 12.5, lineHeight: 18, fontWeight: "700" },
  smallButton: {
    alignSelf: "flex-start",
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  smallButtonText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
});
