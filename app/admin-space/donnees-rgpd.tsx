import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import {
  listAdminPrivacyRequests,
  updatePrivacyRequestStatus,
  type PrivacyRequest,
  type PrivacyRequestStatus,
} from "@/src/services/privacyRequestSupabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REQUEST_LABELS: Record<string, string> = {
  access: "Accès aux données",
  rectification: "Correction",
  deletion: "Suppression",
  restriction: "Limitation",
  other: "Autre",
};

const STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  new: "Nouvelle",
  in_review: "En traitement",
  completed: "Terminée",
  rejected: "Refusée",
  archived: "Archivée",
};

export default function AdminPrivacyRequestsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await listAdminPrivacyRequests();
      setRequests(rows);
      setAdminNotes(
        rows.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.admin_note ?? "";
          return acc;
        }, {})
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les demandes.";
      Alert.alert("Demandes RGPD", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const setStatus = async (request: PrivacyRequest, status: PrivacyRequestStatus) => {
    if (!user?.user_id) return;
    try {
      await updatePrivacyRequestStatus({
        id: request.id,
        status,
        adminNote: adminNotes[request.id],
        handledBy: user.user_id,
      });
      await loadRequests();
      Alert.alert("Demande mise à jour", `Statut : ${STATUS_LABELS[status]}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "La demande n’a pas pu être mise à jour.";
      Alert.alert("Action impossible", message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.blueDark} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={30} color={COLORS.gold} />
          </View>
          <Text style={styles.title}>Demandes RGPD</Text>
          <Text style={styles.subtitle}>Traiter les demandes d’accès, correction, suppression ou limitation.</Text>
        </View>

        {loading ? <Text style={styles.empty}>Chargement...</Text> : null}
        {!loading && requests.length === 0 ? <Text style={styles.empty}>Aucune demande pour le moment.</Text> : null}

        {requests.map((request) => (
          <View key={request.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.requestIcon}>
                <Ionicons name="person-circle-outline" size={22} color={COLORS.gold} />
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{REQUEST_LABELS[request.request_type] ?? "Demande"}</Text>
                <Text style={styles.cardDate}>{new Date(request.created_at).toLocaleDateString("fr-FR")}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{STATUS_LABELS[request.status]}</Text>
              </View>
            </View>

            <Text style={styles.message}>{request.message}</Text>

            <TextInput
              value={adminNotes[request.id] ?? ""}
              onChangeText={(text) => setAdminNotes((current) => ({ ...current, [request.id]: text }))}
              placeholder="Note ou réponse interne..."
              placeholderTextColor={COLORS.gray}
              style={styles.noteInput}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStatus(request, "in_review")}>
                <Text style={styles.secondaryText}>En traitement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStatus(request, "completed")}>
                <Text style={styles.primaryText}>Terminer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} onPress={() => setStatus(request, "rejected")}>
                <Text style={styles.dangerText}>Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  container: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 18, paddingBottom: 40, gap: 14 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "800" },
  hero: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { color: COLORS.blueDark, fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { color: COLORS.gray, fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 6 },
  empty: { color: COLORS.gray, fontSize: 14, fontWeight: "800", textAlign: "center", marginTop: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  requestIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  cardDate: { color: COLORS.gray, fontSize: 12, fontWeight: "700", marginTop: 2 },
  statusPill: { backgroundColor: COLORS.blueSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: COLORS.blueDark, fontSize: 11, fontWeight: "900" },
  message: { color: COLORS.gray, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  noteInput: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: "600",
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: { backgroundColor: COLORS.blueDark, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  primaryText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  secondaryButton: { backgroundColor: COLORS.blueSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  secondaryText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  dangerButton: { backgroundColor: "#FEE2E2", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  dangerText: { color: "#991B1B", fontSize: 12, fontWeight: "900" },
});
