import { COLORS } from "@/src/constants/colors";
import {
  deleteLiveStream,
  getLiveStreams,
  saveLiveStream,
  type LiveStreamRecord,
  type LiveStreamStatus,
} from "@/src/services/liveStreamSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

function isValidUrl(value: string) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getDefaultDateTimeValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} 19:00`;
}

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value: LiveStreamStatus) {
  if (value === "scheduled") return "programme";
  if (value === "live") return "en direct";
  if (value === "terminated") return "termine";
  if (value === "replay") return "replay";
  return "brouillon";
}

export default function LiveCultesAdminPage() {
  const router = useRouter();
  const [liveId, setLiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [replayUrl, setReplayUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTimeValue());
  const [status, setStatus] = useState<LiveStreamStatus>("draft");
  const [items, setItems] = useState<LiveStreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const liveItems = items.filter((item) => item.status !== "replay");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const list = await getLiveStreams();
      setItems(list);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les lives.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setLiveId(null);
    setTitle("");
    setDescription("");
    setStreamUrl("");
    setReplayUrl("");
    setScheduledAt(getDefaultDateTimeValue());
    setStatus("draft");
  }

  function hydrateForm(item: LiveStreamRecord) {
    setLiveId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setStreamUrl(item.streamUrl ?? "");
    setReplayUrl(item.replayUrl ?? "");
    setScheduledAt(item.scheduledAt ?? getDefaultDateTimeValue());
    setStatus(item.status);
  }

  async function handleSave(nextStatus: LiveStreamStatus) {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanStreamUrl = streamUrl.trim();
    const cleanReplayUrl = replayUrl.trim();
    const cleanScheduledAt = scheduledAt.trim();

    if (!cleanTitle || !cleanDescription || !cleanScheduledAt) {
      Alert.alert("Champs requis", "Renseignez le titre, la description et la date du live.");
      return;
    }

    if (!isValidUrl(cleanStreamUrl) || !isValidUrl(cleanReplayUrl)) {
      Alert.alert("Lien invalide", "Les liens du live et du replay doivent etre valides.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Session introuvable. Reconnectez-vous pour gerer les lives.");
      }

      await saveLiveStream({
        id: liveId,
        userId: user.id,
        title: cleanTitle,
        description: cleanDescription,
        streamUrl: cleanStreamUrl || null,
        replayUrl: cleanReplayUrl || null,
        scheduledAt: cleanScheduledAt,
        status: nextStatus,
      });

      resetForm();
      await loadPage();
      Alert.alert(
        "Live enregistre",
        nextStatus === "live"
          ? "Le live est maintenant marque comme en direct."
          : nextStatus === "terminated"
            ? "Le live est maintenant marque comme termine."
            : "Les informations du live ont ete mises a jour."
      );
    } catch (error: any) {
      Alert.alert(
        "Enregistrement impossible",
        error?.message ?? "Verifiez que la table live_streams existe bien dans Supabase."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: LiveStreamRecord) {
    if (!item.id) return;
    Alert.alert("Supprimer ce live", "Ce live sera retire de la liste.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLiveStream(item.id!);
            if (liveId === item.id) resetForm();
            await loadPage();
          } catch (error: any) {
            Alert.alert("Suppression impossible", error?.message ?? "Le live n'a pas pu etre supprime.");
          }
        },
      },
    ]);
  }

  async function handleFinish(item: LiveStreamRecord) {
    if (!item.id) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Session introuvable. Reconnectez-vous pour finaliser ce live.");
      }

      await saveLiveStream({
        id: item.id,
        userId: user.id,
        title: item.title,
        description: item.description,
        streamUrl: item.streamUrl,
        replayUrl: item.replayUrl,
        scheduledAt: item.scheduledAt ?? getDefaultDateTimeValue(),
        status: "terminated",
      });

      if (liveId === item.id) {
        resetForm();
      }

      await loadPage();
      Alert.alert("Live termine", "Le direct reste maintenant dans le streaming avec l'etat termine.");
    } catch (error: any) {
      Alert.alert("Action impossible", error?.message ?? "Le live n'a pas pu etre termine.");
    }
  }

  async function openLink(url: string | null) {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Lien indisponible", "Impossible d'ouvrir ce lien.");
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#16324F" />
          </Pressable>
          <Text style={styles.heroTitle}>Streaming de cultes</Text>
          <Text style={styles.heroSubtitle}>
            Cet espace suit tout le cycle du direct: programme, en direct, puis termine sans quitter la section streaming.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.cardTitle}>{liveId ? "Modifier un live" : "Nouveau live"}</Text>
              <Text style={styles.cardText}>Planifiez un direct, diffusez-le, puis conservez son historique ici meme.</Text>
            </View>
            <Pressable style={styles.ghostButton} onPress={resetForm}>
              <Text style={styles.ghostButtonText}>Nouveau</Text>
            </Pressable>
          </View>

          <TextInput value={title} onChangeText={setTitle} placeholder="Titre du culte" style={styles.input} placeholderTextColor="#94A3B8" />
          <TextInput value={description} onChangeText={setDescription} placeholder="Description du direct" style={[styles.input, styles.textArea]} placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />
          <TextInput value={scheduledAt} onChangeText={setScheduledAt} placeholder="2026-04-05 18:30" style={styles.input} placeholderTextColor="#94A3B8" />
          <TextInput value={streamUrl} onChangeText={setStreamUrl} placeholder="Lien du direct" style={styles.input} placeholderTextColor="#94A3B8" autoCapitalize="none" />
          <TextInput value={replayUrl} onChangeText={setReplayUrl} placeholder="Lien replay si deja connu (optionnel)" style={styles.input} placeholderTextColor="#94A3B8" autoCapitalize="none" />

          <View style={styles.statusRow}>
            {(["draft", "scheduled", "live", "terminated"] as LiveStreamStatus[]).map((item) => (
              <Pressable
                key={item}
                style={[styles.statusChip, status === item && styles.statusChipActive]}
                onPress={() => setStatus(item)}
              >
                <Text style={[styles.statusChipText, status === item && styles.statusChipTextActive]}>
                  {item === "draft"
                    ? "Brouillon"
                    : item === "scheduled"
                      ? "Programme"
                      : item === "live"
                        ? "En direct"
                        : "Termine"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.secondaryBtn, (saving || loading) && styles.disabledBtn]} disabled={saving || loading} onPress={() => handleSave(status)}>
              <Text style={styles.secondaryBtnText}>Enregistrer</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, (saving || loading) && styles.disabledBtn]} disabled={saving || loading} onPress={() => handleSave("live")}>
              <Text style={styles.primaryBtnText}>{saving ? "Enregistrement..." : "Passer en direct"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Lives enregistres</Text>
          <View style={styles.listBody}>
            {liveItems.map((item) => (
              <Swipeable
                key={item.id ?? `${item.title}-${item.updatedAt ?? "na"}`}
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable style={styles.deleteAction} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteText}>Supprimer</Text>
                  </Pressable>
                )}
              >
                <View style={styles.listItem}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemDate}>{formatDate(item.scheduledAt)}</Text>
                    </View>
                    <Text style={styles.itemStatus}>{formatStatus(item.status)}</Text>
                  </View>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <View style={styles.itemActions}>
                    {item.status !== "terminated" && (
                      <Pressable style={styles.editButton} onPress={() => hydrateForm(item)}>
                        <Text style={styles.editButtonText}>Modifier</Text>
                      </Pressable>
                    )}
                    {item.status !== "terminated" && (
                      <Pressable style={styles.finishButton} onPress={() => handleFinish(item)}>
                        <Text style={styles.finishButtonText}>Marquer termine</Text>
                      </Pressable>
                    )}
                    {!!item.streamUrl && item.status !== "terminated" && (
                      <Pressable style={styles.linkButton} onPress={() => openLink(item.streamUrl)}>
                        <Text style={styles.linkButtonText}>Ouvrir le live</Text>
                      </Pressable>
                    )}
                    {!!item.replayUrl && (
                      <Pressable style={styles.linkButton} onPress={() => openLink(item.replayUrl)}>
                        <Text style={styles.linkButtonText}>Voir le replay</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Swipeable>
            ))}
            {liveItems.length === 0 && <Text style={styles.emptyText}>Aucun live actif ou programme pour le moment.</Text>}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 16 },
  hero: { borderRadius: 20, backgroundColor: "#F8FBFF", borderWidth: 1, borderColor: "#E4EDF7", padding: 18, gap: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E4EDF7" },
  heroTitle: { color: "#16324F", fontSize: 24, fontWeight: "800" },
  heroSubtitle: { color: "#61758A", fontSize: 13.5, lineHeight: 20 },
  card: { borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8EEF5", padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  headerCopy: { flex: 1, gap: 4 },
  cardTitle: { color: "#16324F", fontSize: 16, fontWeight: "800" },
  cardText: { color: "#61758A", fontSize: 13, lineHeight: 18 },
  ghostButton: { height: 38, borderRadius: 10, paddingHorizontal: 14, backgroundColor: "#F3F6FA", alignItems: "center", justifyContent: "center" },
  ghostButtonText: { color: "#16324F", fontSize: 12.5, fontWeight: "800" },
  input: { borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, height: 46, color: "#16324F", fontSize: 14 },
  textArea: { minHeight: 110, height: "auto", paddingTop: 12, paddingBottom: 12 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#EEF3F8" },
  statusChipActive: { backgroundColor: COLORS.blueDark },
  statusChipText: { color: "#16324F", fontSize: 12.5, fontWeight: "700" },
  statusChipTextActive: { color: "#FFFFFF" },
  actions: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF5FB" },
  secondaryBtnText: { color: "#16324F", fontSize: 13, fontWeight: "800" },
  primaryBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#16324F" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabledBtn: { opacity: 0.7 },
  listCard: { borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8EEF5", padding: 16, gap: 12 },
  listTitle: { color: "#16324F", fontSize: 16, fontWeight: "800" },
  listBody: { gap: 10 },
  listItem: { borderRadius: 14, backgroundColor: "#FAFCFF", borderWidth: 1, borderColor: "#E8EEF5", padding: 14, gap: 10 },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemMeta: { flex: 1, gap: 2 },
  itemTitle: { color: "#16324F", fontSize: 14, fontWeight: "800" },
  itemDate: { color: "#61758A", fontSize: 12 },
  itemStatus: { color: COLORS.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  itemDescription: { color: "#4D6072", fontSize: 13, lineHeight: 20 },
  itemActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  editButton: { height: 38, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE6F1", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  editButtonText: { color: "#16324F", fontSize: 12.5, fontWeight: "800" },
  finishButton: { height: 38, borderRadius: 10, backgroundColor: "#FEF3C7", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  finishButtonText: { color: "#9A6B00", fontSize: 12.5, fontWeight: "800" },
  linkButton: { height: 38, borderRadius: 10, backgroundColor: "#16324F", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  linkButtonText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
  emptyText: { color: "#61758A", fontSize: 13 },
  deleteAction: { width: 118, marginLeft: 10, borderRadius: 14, backgroundColor: "#C2410C", alignItems: "center", justifyContent: "center", gap: 6 },
  deleteText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
});
