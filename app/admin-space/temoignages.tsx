import { COLORS } from "@/src/constants/colors";
import {
  deleteTestimony,
  getAdminTestimonies,
  reviewTestimony,
  type TestimonyRecord,
  type TestimonyStatus,
} from "@/src/services/testimonySupabase";
import { supabase } from "@/supabaseClient";
import { notifyUsersFromAdmin } from "@/src/services/pushNotifications";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterStatus = TestimonyStatus | "all";

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "À valider", value: "pending" },
  { label: "Publiés", value: "approved" },
  { label: "Refusés", value: "rejected" },
  { label: "Tous", value: "all" },
];

function statusLabel(status: TestimonyStatus) {
  if (status === "approved") return "Publié";
  if (status === "rejected") return "Refusé";
  return "À valider";
}

function statusColor(status: TestimonyStatus) {
  if (status === "approved") return COLORS.emerald;
  if (status === "rejected") return "#B42318";
  return COLORS.gold;
}

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

export default function AdminTestimoniesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [items, setItems] = useState<TestimonyRecord[]>([]);
  const [selected, setSelected] = useState<TestimonyRecord | null>(null);
  const [title, setTitle] = useState("");
  const [publishedText, setPublishedText] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pendingCount = useMemo(() => items.filter((item) => item.status === "pending").length, [items]);

  const hydrate = useCallback((record: TestimonyRecord) => {
    setSelected(record);
    setTitle(record.title);
    setPublishedText(record.publishedText ?? record.originalText ?? "");
    setAdminNote(record.adminNote ?? "");
  }, []);

  const loadPage = useCallback(async (nextFilter: FilterStatus = filter) => {
    try {
      setLoading(true);
      const rows = await getAdminTestimonies(nextFilter);
      setItems(rows);
      if (rows.length > 0) {
        hydrate(rows[0]);
      } else {
        setSelected(null);
        setTitle("");
        setPublishedText("");
        setAdminNote("");
      }
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les témoignages.");
    } finally {
      setLoading(false);
    }
  }, [filter, hydrate]);

  useEffect(() => {
    loadPage(filter);
  }, [filter, loadPage]);

  async function openAudio(url: string | null) {
    if (!url) {
      Alert.alert("Audio indisponible", "Ce témoignage n'a pas d'audio attaché.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Lecture impossible", "Impossible d'ouvrir cet audio pour le moment.");
      return;
    }

    await Linking.openURL(url);
  }

  async function saveReview(nextStatus: TestimonyStatus) {
    if (!selected) return;
    if (!title.trim()) {
      Alert.alert("Titre requis", "Le témoignage publié doit garder un titre.");
      return;
    }
    if (nextStatus === "approved" && !publishedText.trim() && !selected.audioUrl) {
      Alert.alert("Contenu requis", "Ajoutez un texte publié ou gardez un audio avant d'approuver.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Session expirée.");

      await reviewTestimony({
        id: selected.id,
        status: nextStatus,
        title: title.trim(),
        publishedText: publishedText.trim() || null,
        adminNote: adminNote.trim() || null,
        reviewedBy: user.id,
      });

      if (nextStatus === "approved") {
        notifyUsersFromAdmin({
          title: "Nouveau témoignage",
          body: title.trim(),
          targetScope: selected.communityType ?? "all",
          data: { type: "testimony", route: "/communaute/temoignages" },
        }).catch((error) => console.warn("Notification témoignage failed", error));
      }

      await loadPage(filter);
      Alert.alert(
        nextStatus === "approved" ? "Témoignage publié" : nextStatus === "rejected" ? "Témoignage refusé" : "Témoignage mis à jour"
      );
    } catch (error: any) {
      Alert.alert("Action impossible", error?.message ?? "La modération n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(record: TestimonyRecord) {
    Alert.alert("Supprimer ce témoignage ?", "Cette action retirera aussi son audio si un fichier existe.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTestimony(record);
            await loadPage(filter);
          } catch (error: any) {
            Alert.alert("Suppression impossible", error?.message ?? "Le témoignage n'a pas pu être supprimé.");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Modération</Text>
            <Text style={styles.title}>Témoignages</Text>
            <Text style={styles.subtitle}>
              Relisez, améliorez la formulation, puis publiez uniquement ce qui édifie la communauté.
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIcon}>
            <MaterialCommunityIcons name="message-star-outline" size={24} color={COLORS.gold} />
          </View>
          <View style={styles.statsText}>
            <Text style={styles.statsValue}>{pendingCount}</Text>
            <Text style={styles.statsLabel}>témoignage(s) à valider dans la vue actuelle</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.filterButton, filter === item.value && styles.filterButtonActive]}
              onPress={() => setFilter(item.value)}
            >
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerCard}>
            <Text style={styles.emptyTitle}>Aucun témoignage ici</Text>
            <Text style={styles.emptyText}>Changez de filtre ou revenez plus tard.</Text>
          </View>
        ) : (
          <>
            <View style={styles.queue}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.queueItem, selected?.id === item.id && styles.queueItemActive]}
                  onPress={() => hydrate(item)}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                  <View style={styles.queueBody}>
                    <Text style={styles.queueTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.queueMeta} numberOfLines={1}>
                      {item.authorName ?? "Membre Kabod"} · {formatDate(item.createdAt)} · {statusLabel(item.status)}
                    </Text>
                  </View>
                  {!!item.audioUrl && <Ionicons name="mic-outline" size={16} color={COLORS.gray} />}
                </Pressable>
              ))}
            </View>

            {selected && (
              <View style={styles.editorCard}>
                <View style={styles.editorHeader}>
                  <View>
                    <Text style={styles.editorEyebrow}>Témoignage sélectionné</Text>
                    <Text style={styles.editorTitle}>{statusLabel(selected.status)}</Text>
                  </View>
                  <Pressable style={styles.deleteButton} onPress={() => confirmDelete(selected)}>
                    <Ionicons name="trash-outline" size={18} color="#B42318" />
                  </Pressable>
                </View>

                <View style={styles.originalBox}>
                  <Text style={styles.originalLabel}>Texte envoyé par le membre</Text>
                  <Text style={styles.originalText}>{selected.originalText || "Aucun texte, témoignage audio uniquement."}</Text>
                  {!!selected.audioUrl && (
                    <Pressable style={styles.listenButton} onPress={() => openAudio(selected.audioUrl)}>
                      <Ionicons name="play-circle-outline" size={18} color={COLORS.blueDark} />
                      <Text style={styles.listenText}>Écouter l’audio reçu</Text>
                    </Pressable>
                  )}
                </View>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Titre publié"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
                <TextInput
                  value={publishedText}
                  onChangeText={setPublishedText}
                  placeholder="Version publiée après correction..."
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.area]}
                  multiline
                  textAlignVertical="top"
                />
                <TextInput
                  value={adminNote}
                  onChangeText={setAdminNote}
                  placeholder="Note interne admin (optionnel)"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.rejectButton, saving && styles.disabled]}
                    onPress={() => saveReview("rejected")}
                    disabled={saving}
                  >
                    <Text style={styles.rejectText}>Refuser</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.approveButton, saving && styles.disabled]}
                    onPress={() => saveReview("approved")}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.approveText}>Approuver / publier</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 16,
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  statsCard: {
    borderRadius: 24,
    backgroundColor: COLORS.blueDark,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statsIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsText: { flex: 1 },
  statsValue: { color: COLORS.white, fontSize: 26, fontWeight: "900" },
  statsLabel: { color: "#D1D5DB", fontSize: 12.5, lineHeight: 18 },
  filters: { gap: 10, paddingRight: 18 },
  filterButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.gold },
  filterText: { color: COLORS.gray, fontSize: 12.5, fontWeight: "900" },
  filterTextActive: { color: COLORS.blueDark },
  centerCard: {
    minHeight: 150,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center" },
  queue: { gap: 10 },
  queueItem: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  queueItemActive: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.gold },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  queueBody: { flex: 1, gap: 3 },
  queueTitle: { color: COLORS.blueDark, fontSize: 14.5, fontWeight: "900" },
  queueMeta: { color: COLORS.gray, fontSize: 11.5, fontWeight: "700" },
  editorCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  editorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  editorEyebrow: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  editorTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FEF3F2",
    alignItems: "center",
    justifyContent: "center",
  },
  originalBox: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 8,
  },
  originalLabel: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  originalText: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  listenButton: {
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  listenText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  input: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: "700",
  },
  area: { minHeight: 130, paddingTop: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10 },
  rejectButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FEF3F2",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectText: { color: "#B42318", fontSize: 13, fontWeight: "900" },
  approveButton: {
    flex: 1.4,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  approveText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.65 },
});
