import { COLORS } from "@/src/constants/colors";
import {
  createSupportRequest,
  getMySupportRequests,
  requestStatusLabel,
  requestTypeLabel,
  type SupportRequest,
  type SupportRequestType,
} from "@/src/services/supportRequestsSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

const TYPES: {
  id: SupportRequestType;
  title: string;
  text: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "prayer", title: "Prière", text: "Confier un sujet à l’équipe.", icon: "hands-pray" },
  { id: "support", title: "Soutien", text: "Demander de l’aide ou une écoute.", icon: "handshake-outline" },
  { id: "counseling", title: "Accompagnement", text: "Être orienté vers un responsable.", icon: "account-voice" },
  { id: "other", title: "Autre", text: "Partager une demande particulière.", icon: "message-question-outline" },
];

function formatDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PrayerRequestsPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<SupportRequestType>("prayer");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const rows = await getMySupportRequests();
      setRequests(rows);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger vos requêtes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshPage() {
    setRefreshing(true);
    await loadPage();
  }

  async function submitRequest() {
    if (!title.trim()) {
      Alert.alert("Titre requis", "Ajoutez un titre court à votre demande.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Message requis", "Écrivez votre demande avant de l’envoyer.");
      return;
    }

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/(auth)/login");
        return;
      }

      await createSupportRequest({
        userId: user.id,
        requestType,
        title,
        message,
        isPrivate,
      });

      setTitle("");
      setMessage("");
      setRequestType("prayer");
      setIsPrivate(true);
      await loadPage();
      Alert.alert("Demande envoyée", "Votre requête a été transmise à l’équipe Kabod.");
    } catch (error: any) {
      Alert.alert("Envoi impossible", error?.message ?? "Votre requête n’a pas pu être envoyée.");
    } finally {
      setSending(false);
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
            <Text style={styles.eyebrow}>Prière & soutien</Text>
            <Text style={styles.title}>Envoyer une requête</Text>
            <Text style={styles.subtitle}>Déposez une demande simplement. Elle sera visible par l’équipe admin.</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Type de demande</Text>
          <View style={styles.types}>
            {TYPES.map((type) => (
              <Pressable
                key={type.id}
                style={[styles.typeCard, requestType === type.id && styles.typeCardActive]}
                onPress={() => setRequestType(type.id)}
              >
                <MaterialCommunityIcons
                  name={type.icon}
                  size={22}
                  color={requestType === type.id ? COLORS.gold : COLORS.blueDark}
                />
                <View style={styles.typeCopy}>
                  <Text style={[styles.typeTitle, requestType === type.id && styles.typeTitleActive]}>{type.title}</Text>
                  <Text style={[styles.typeText, requestType === type.id && styles.typeTextActive]}>{type.text}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre court"
            placeholderTextColor={COLORS.gray}
            style={styles.input}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Expliquez votre demande..."
            placeholderTextColor={COLORS.gray}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.area]}
          />

          <Pressable style={styles.privateRow} onPress={() => setIsPrivate((value) => !value)}>
            <Ionicons name={isPrivate ? "checkbox" : "square-outline"} size={20} color={isPrivate ? COLORS.gold : COLORS.gray} />
            <Text style={styles.privateText}>Garder cette demande confidentielle</Text>
          </Pressable>

          <Pressable style={[styles.sendButton, sending && styles.disabled]} onPress={submitRequest} disabled={sending}>
            {sending ? <ActivityIndicator color={COLORS.blueDark} /> : <Text style={styles.sendText}>Envoyer la requête</Text>}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes demandes</Text>
          <Text style={styles.count}>{requests.length}</Text>
        </View>

        {loading ? (
          <View style={styles.centerCard}><ActivityIndicator color={COLORS.gold} /></View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="mail-open-outline" size={25} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucune demande envoyée</Text>
            <Text style={styles.emptyText}>Vos requêtes apparaîtront ici après envoi.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((item) => (
              <View key={item.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestType}>{requestTypeLabel(item.requestType)}</Text>
                  <Text style={styles.status}>{requestStatusLabel(item.status)}</Text>
                </View>
                <Text style={styles.requestTitle}>{item.title}</Text>
                <Text style={styles.requestMessage} numberOfLines={3}>{item.message}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
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
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 28, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  formCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 12,
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  types: { gap: 9 },
  typeCard: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  typeCardActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  typeCopy: { flex: 1, gap: 2 },
  typeTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  typeTitleActive: { color: COLORS.white },
  typeText: { color: COLORS.gray, fontSize: 12, lineHeight: 17 },
  typeTextActive: { color: "#D1D5DB" },
  input: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: "700",
  },
  area: { minHeight: 120, paddingTop: 13, lineHeight: 21 },
  privateRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 9 },
  privateText: { flex: 1, color: COLORS.blueDark, fontSize: 13, fontWeight: "800" },
  sendButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.7 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
  requestTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  requestType: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  status: {
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
  date: { color: COLORS.gray, fontSize: 11, fontWeight: "700" },
});
