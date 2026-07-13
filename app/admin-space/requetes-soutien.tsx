import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import {
  getAdminSupportRequests,
  requestStatusLabel,
  requestTypeLabel,
  updateSupportRequest,
  type SupportRequest,
  type SupportRequestStatus,
} from "@/src/services/supportRequestsSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUSES: SupportRequestStatus[] = ["new", "in_progress", "resolved", "archived"];

function formatDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSupportRequestsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPage = useCallback(async () => {
    try {
      const rows = await getAdminSupportRequests();
      setRequests(rows);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les requêtes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function refreshPage() {
    setRefreshing(true);
    await loadPage();
  }

  function openRequest(request: SupportRequest) {
    setSelected(request);
    setAdminNote(request.adminNote ?? "");
  }

  async function changeStatus(status: SupportRequestStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateSupportRequest({
        id: selected.id,
        status,
        adminNote,
        handledBy: user?.user_id ?? null,
      });
      setSelected(updated);
      await loadPage();
    } catch (error: any) {
      Alert.alert("Mise à jour impossible", error?.message ?? "La requête n’a pas pu être mise à jour.");
    } finally {
      setSaving(false);
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
            <Text style={styles.eyebrow}>Admin</Text>
            <Text style={styles.title}>Requêtes & soutien</Text>
            <Text style={styles.subtitle}>Suivre les demandes de prière, soutien et accompagnement.</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <MaterialCommunityIcons name="heart-pulse" size={24} color={COLORS.gold} />
          <View style={styles.statsCopy}>
            <Text style={styles.statsValue}>{requests.filter((item) => item.status === "new").length}</Text>
            <Text style={styles.statsText}>nouvelles demandes à regarder</Text>
          </View>
        </View>

        {selected && (
          <View style={styles.detailCard}>
            <View style={styles.detailTop}>
              <View>
                <Text style={styles.detailType}>{requestTypeLabel(selected.requestType)}</Text>
                <Text style={styles.detailTitle}>{selected.title}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelected(null)}>
                <Ionicons name="close" size={18} color={COLORS.gray} />
              </Pressable>
            </View>
            <Text style={styles.detailMeta}>
              {requestStatusLabel(selected.status)} · {formatDate(selected.createdAt)}
            </Text>
            <Text style={styles.detailMessage}>{selected.message}</Text>

            <Text style={styles.noteLabel}>Note admin</Text>
            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Ajouter une note interne..."
              placeholderTextColor={COLORS.gray}
              multiline
              textAlignVertical="top"
              style={styles.noteInput}
            />

            <View style={styles.statusRow}>
              {STATUSES.map((status) => (
                <Pressable
                  key={status}
                  style={[styles.statusButton, selected.status === status && styles.statusButtonActive]}
                  disabled={saving}
                  onPress={() => changeStatus(status)}
                >
                  <Text style={[styles.statusButtonText, selected.status === status && styles.statusButtonTextActive]}>
                    {requestStatusLabel(status)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Toutes les requêtes</Text>
          <Text style={styles.count}>{requests.length}</Text>
        </View>

        {loading ? (
          <View style={styles.centerCard}><ActivityIndicator color={COLORS.gold} /></View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="mail-open-outline" size={25} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucune requête</Text>
            <Text style={styles.emptyText}>Les demandes envoyées par les utilisateurs apparaîtront ici.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((item) => (
              <Pressable key={item.id} style={styles.requestCard} onPress={() => openRequest(item)}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestType}>{requestTypeLabel(item.requestType)}</Text>
                  <Text style={styles.statusPill}>{requestStatusLabel(item.status)}</Text>
                </View>
                <Text style={styles.requestTitle}>{item.title}</Text>
                <Text style={styles.requestMessage} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.requestDate}>{formatDate(item.createdAt)}</Text>
              </Pressable>
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
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 28, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  statsCard: {
    borderRadius: 24,
    backgroundColor: COLORS.blueDark,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  statsCopy: { flex: 1 },
  statsValue: { color: COLORS.white, fontSize: 28, fontWeight: "900" },
  statsText: { color: "#D1D5DB", fontSize: 13, fontWeight: "700" },
  detailCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  detailTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  detailType: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  detailTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900", marginTop: 3 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  detailMeta: { color: COLORS.gray, fontSize: 12, fontWeight: "800" },
  detailMessage: { color: COLORS.blueDark, fontSize: 14, lineHeight: 22 },
  noteLabel: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  noteInput: {
    minHeight: 90,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.blueDark,
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusButton: {
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusButtonActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  statusButtonText: { color: COLORS.gray, fontSize: 12, fontWeight: "900" },
  statusButtonTextActive: { color: COLORS.white },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  count: {
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
  centerCard: { minHeight: 130, borderRadius: 22, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
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
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center" },
  list: { gap: 10 },
  requestCard: {
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 7,
  },
  requestTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  requestType: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  statusPill: {
    borderRadius: 999,
    backgroundColor: COLORS.goldSoft,
    color: COLORS.blueDark,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10.5,
    fontWeight: "900",
    overflow: "hidden",
  },
  requestTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  requestMessage: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  requestDate: { color: COLORS.gray, fontSize: 11, fontWeight: "700" },
});
