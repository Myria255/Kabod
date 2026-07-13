import { COLORS } from "@/src/constants/colors";
import {
  getAdminDashboardCounts,
  listAdminNotificationItems,
  markAdminRouteSeen,
  type AdminDashboardCounts,
  type AdminNotificationItem,
} from "@/src/services/adminDashboardSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EMPTY_COUNTS: AdminDashboardCounts = {
  testimonies: 0,
  supportRequests: 0,
  donationIntents: 0,
  privacyRequests: 0,
  total: 0,
};

const TYPE_ICON: Record<AdminNotificationItem["type"], keyof typeof MaterialCommunityIcons.glyphMap> = {
  testimony: "message-star-outline",
  support_request: "heart-pulse",
  donation_intent: "hand-heart-outline",
  privacy_request: "shield-check-outline",
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<AdminDashboardCounts>(EMPTY_COUNTS);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [nextCounts, nextItems] = await Promise.all([
        getAdminDashboardCounts(),
        listAdminNotificationItems(),
      ]);
      setCounts(nextCounts);
      setItems(nextItems);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les notifications admin.";
      Alert.alert("Notifications admin", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const summary = [
    { label: "Témoignages", value: counts.testimonies, route: "/admin-space/temoignages" },
    { label: "Requêtes", value: counts.supportRequests, route: "/admin-space/requetes-soutien" },
    { label: "Dons", value: counts.donationIntents, route: "/admin-space/dons" },
    { label: "RGPD", value: counts.privacyRequests, route: "/admin-space/donnees-rgpd" },
  ];

  const openAdminRoute = async (route: string) => {
    try {
      await markAdminRouteSeen(route);
      await loadNotifications();
    } catch {
      // On laisse l'admin accéder à la page même si le marquage "vu" échoue.
    }
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.blueDark} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton} onPress={loadNotifications}>
            <Ionicons name="refresh" size={18} color={COLORS.blueDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications-outline" size={30} color={COLORS.gold} />
            {counts.total > 0 ? (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{counts.total > 99 ? "99+" : counts.total}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>Notifications admin</Text>
          <Text style={styles.subtitle}>Tout ce que les membres viennent d’envoyer et qui demande votre attention.</Text>
        </View>

        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <TouchableOpacity key={item.label} style={styles.summaryCard} onPress={() => openAdminRoute(item.route)}>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>À traiter maintenant</Text>

          {loading ? <Text style={styles.emptyText}>Chargement...</Text> : null}
          {!loading && items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={34} color={COLORS.emerald} />
              <Text style={styles.emptyTitle}>Tout est à jour</Text>
              <Text style={styles.emptyText}>Aucune nouvelle demande membre pour le moment.</Text>
            </View>
          ) : null}

          {items.map((item) => (
            <TouchableOpacity key={`${item.type}-${item.id}`} style={styles.itemCard} onPress={() => openAdminRoute(item.route)}>
              <View style={styles.itemIcon}>
                <MaterialCommunityIcons name={TYPE_ICON[item.type]} size={23} color={COLORS.gold} />
              </View>
              <View style={styles.itemBody}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>{item.badge}</Text>
                  </View>
                </View>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString("fr-FR")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gold} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  container: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  heroBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  heroBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: "900" },
  title: { color: COLORS.blueDark, fontSize: 25, fontWeight: "900", textAlign: "center" },
  subtitle: { color: COLORS.gray, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center", marginTop: 6 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  summaryValue: { color: COLORS.blueDark, fontSize: 24, fontWeight: "900" },
  summaryLabel: { color: COLORS.gray, fontSize: 12, fontWeight: "900", marginTop: 3 },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 7 },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, fontWeight: "700", textAlign: "center" },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 13,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: { flex: 1, gap: 4 },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { flex: 1, color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  itemBadge: { backgroundColor: COLORS.goldSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  itemBadgeText: { color: COLORS.blueDark, fontSize: 10, fontWeight: "900" },
  itemDescription: { color: COLORS.gray, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  itemDate: { color: "#94A3B8", fontSize: 11, fontWeight: "800" },
});
