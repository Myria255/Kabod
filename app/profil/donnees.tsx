import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import {
  createPrivacyRequest,
  listMyPrivacyRequests,
  type PrivacyRequest,
  type PrivacyRequestType,
} from "@/src/services/privacyRequestSupabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REQUEST_TYPES: { value: PrivacyRequestType; label: string; description: string }[] = [
  { value: "access", label: "Accéder à mes données", description: "Recevoir un récapitulatif des données liées à mon compte." },
  { value: "rectification", label: "Corriger mes données", description: "Demander la modification d’une information incorrecte." },
  { value: "deletion", label: "Supprimer mon compte", description: "Demander la suppression de mon compte et de mes données associées." },
  { value: "restriction", label: "Limiter l’utilisation", description: "Demander une limitation temporaire du traitement." },
  { value: "other", label: "Autre demande", description: "Poser une question liée à mes données personnelles." },
];

const STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  in_review: "En traitement",
  completed: "Terminée",
  rejected: "Refusée",
  archived: "Archivée",
};

export default function PersonalDataPage() {
  const router = useRouter();
  const { user } = useUser();
  const [requestType, setRequestType] = useState<PrivacyRequestType>("access");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedType = useMemo(
    () => REQUEST_TYPES.find((item) => item.value === requestType) ?? REQUEST_TYPES[0],
    [requestType]
  );

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setRequests(await listMyPrivacyRequests());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Impossible de charger vos demandes.";
      Alert.alert("Mes données", errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const handleSubmit = async () => {
    if (!user?.user_id) {
      Alert.alert("Connexion requise", "Reconnectez-vous pour envoyer une demande.");
      return;
    }

    if (message.trim().length < 10) {
      Alert.alert("Message trop court", "Expliquez votre demande en quelques mots.");
      return;
    }

    try {
      setSubmitting(true);
      await createPrivacyRequest({
        userId: user.user_id,
        requestType,
        message,
      });
      setMessage("");
      await loadRequests();
      Alert.alert("Demande envoyée", "Votre demande a été transmise à l’administration Kabod.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Votre demande n’a pas pu être envoyée.";
      Alert.alert("Envoi impossible", errorMessage);
    } finally {
      setSubmitting(false);
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
            <Ionicons name="person-circle-outline" size={30} color={COLORS.gold} />
          </View>
          <Text style={styles.title}>Mes données personnelles</Text>
          <Text style={styles.subtitle}>Consultez vos droits et envoyez une demande à l’administration.</Text>
        </View>

        <View style={styles.legalRow}>
          <TouchableOpacity style={styles.legalButton} onPress={() => router.push("/legal/privacy" as any)}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.blueDark} />
            <Text style={styles.legalText}>Confidentialité</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalButton} onPress={() => router.push("/legal/terms" as any)}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.blueDark} />
            <Text style={styles.legalText}>Conditions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Faire une demande</Text>
          <Text style={styles.helper}>
            Choisissez le type de demande. L’administration devra vous répondre via le canal officiel de Kabod.
          </Text>

          <View style={styles.typeList}>
            {REQUEST_TYPES.map((item) => {
              const selected = item.value === requestType;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.typeCard, selected && styles.typeCardSelected]}
                  onPress={() => setRequestType(item.value)}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.typeBody}>
                    <Text style={styles.typeLabel}>{item.label}</Text>
                    <Text style={styles.typeDescription}>{item.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>{selectedType.label}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Expliquez votre demande..."
            placeholderTextColor={COLORS.gray}
            style={styles.textArea}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? "Envoi..." : "Envoyer la demande"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {loading ? <Text style={styles.emptyText}>Chargement...</Text> : null}
          {!loading && requests.length === 0 ? (
            <Text style={styles.emptyText}>Aucune demande envoyée pour le moment.</Text>
          ) : null}
          {requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>
                  {REQUEST_TYPES.find((item) => item.value === request.request_type)?.label ?? "Demande"}
                </Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{STATUS_LABELS[request.status] ?? request.status}</Text>
                </View>
              </View>
              <Text style={styles.requestMessage}>{request.message}</Text>
              {request.admin_note ? <Text style={styles.adminNote}>Réponse admin : {request.admin_note}</Text> : null}
            </View>
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
    maxWidth: 620,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
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
  subtitle: { color: COLORS.gray, fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 6, lineHeight: 20 },
  legalRow: { flexDirection: "row", gap: 10 },
  legalButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  legalText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  helper: { color: COLORS.gray, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  typeList: { gap: 10 },
  typeCard: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  typeCardSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.goldSoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioSelected: { borderColor: COLORS.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  typeBody: { flex: 1 },
  typeLabel: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  typeDescription: { color: COLORS.gray, fontSize: 12, lineHeight: 17, marginTop: 3, fontWeight: "600" },
  inputLabel: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  textArea: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.blueDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, fontWeight: "700" },
  requestCard: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 8 },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  requestTitle: { flex: 1, color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  statusPill: { backgroundColor: COLORS.blueSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: COLORS.blueDark, fontSize: 11, fontWeight: "900" },
  requestMessage: { color: COLORS.gray, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  adminNote: {
    color: COLORS.blueDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    backgroundColor: COLORS.goldSoft,
    borderRadius: 12,
    padding: 10,
  },
});
