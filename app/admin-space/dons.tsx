import { COLORS } from "@/src/constants/colors";
import {
  donationStatusLabel,
  getAdminDonationIntents,
  giftTypeLabel,
  paymentMethodLabel,
  updateDonationIntentStatus,
  type DonationIntent,
  type DonationStatus,
} from "@/src/services/donationIntentSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_ACTIONS: DonationStatus[] = ["contacted", "completed", "cancelled", "archived"];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDonationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<DonationIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const newCount = items.filter((item) => item.status === "new").length;
  const totalAmount = items
    .filter((item) => item.status !== "cancelled" && item.status !== "archived")
    .reduce((sum, item) => sum + item.amount, 0);

  const loadPage = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    try {
      setItems(await getAdminDonationIntents());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les dons.";
      Alert.alert("Dons & offrandes", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage();
    }, [loadPage])
  );

  async function changeStatus(item: DonationIntent, status: DonationStatus) {
    setUpdatingId(item.id);
    try {
      await updateDonationIntentStatus(item.id, status);
      setItems((current) =>
        current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, status } : currentItem))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action impossible.";
      Alert.alert("Dons & offrandes", message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPage("refresh")} />}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Administration</Text>
            <Text style={styles.title}>Dons & offrandes</Text>
            <Text style={styles.subtitle}>Suivez les intentions envoyées par les membres.</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Demandes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{newCount}</Text>
            <Text style={styles.statLabel}>Nouvelles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalAmount.toFixed(0)}€</Text>
            <Text style={styles.statLabel}>Déclaré</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="hand-heart-outline" size={34} color={COLORS.gold} />
            <Text style={styles.emptyTitle}>Aucune intention</Text>
            <Text style={styles.emptyText}>Les demandes de don ou offrande apparaîtront ici.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons name="hand-heart-outline" size={22} color={COLORS.gold} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{giftTypeLabel(item.giftType)}</Text>
                    <Text style={styles.cardMeta}>
                      {formatDate(item.createdAt)} · {paymentMethodLabel(item.paymentMethod)} ·{" "}
                      {item.frequency === "monthly" ? "Mensuel" : "Une fois"}
                    </Text>
                  </View>
                  <View style={styles.amountPill}>
                    <Text style={styles.amountText}>{item.amount.toFixed(2)}€</Text>
                  </View>
                </View>

                {!!item.note && <Text style={styles.note}>{item.note}</Text>}

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Statut : {donationStatusLabel(item.status)}</Text>
                </View>

                <View style={styles.actions}>
                  {STATUS_ACTIONS.map((status) => (
                    <Pressable
                      key={status}
                      style={[styles.actionButton, item.status === status && styles.actionButtonActive]}
                      disabled={updatingId === item.id}
                      onPress={() => changeStatus(item, status)}
                    >
                      <Text style={[styles.actionText, item.status === status && styles.actionTextActive]}>
                        {donationStatusLabel(status)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
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
    maxWidth: 640,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 36,
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
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 28, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    gap: 3,
  },
  statValue: { color: COLORS.blueDark, fontSize: 19, fontWeight: "900" },
  statLabel: { color: COLORS.gray, fontSize: 10.5, fontWeight: "800" },
  centerCard: {
    minHeight: 160,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    minHeight: 180,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  emptyText: { color: COLORS.gray, textAlign: "center", lineHeight: 19 },
  list: { gap: 12 },
  card: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  cardMeta: { color: COLORS.gray, fontSize: 11.5, fontWeight: "700" },
  amountPill: { borderRadius: 999, backgroundColor: COLORS.blueDark, paddingHorizontal: 11, paddingVertical: 7 },
  amountText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  note: { color: COLORS.gray, fontSize: 13, lineHeight: 19, backgroundColor: COLORS.grayLight, borderRadius: 14, padding: 11 },
  statusRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  statusLabel: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: {
    minHeight: 36,
    borderRadius: 13,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonActive: { backgroundColor: COLORS.gold },
  actionText: { color: COLORS.gray, fontSize: 11.5, fontWeight: "900" },
  actionTextActive: { color: COLORS.blueDark },
});
