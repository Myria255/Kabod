import { COLORS } from "@/src/constants/colors";
import {
  deleteLiveStream,
  getLiveStreams,
  saveLiveStream,
  type LiveStreamRecord,
} from "@/src/services/liveStreamSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

export default function ReplayEvenementsAdminPage() {
  const router = useRouter();
  const [replayId, setReplayId] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTimeValue());
  const [replayUrl, setReplayUrl] = useState("");
  const [items, setItems] = useState<LiveStreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const replayItems = useMemo(
    () => items.filter((item) => item.status === "replay"),
    [items]
  );

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const list = await getLiveStreams();
      setItems(list);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les replays.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setReplayId(null);
    setStreamUrl("");
    setTitle("");
    setDescription("");
    setScheduledAt(getDefaultDateTimeValue());
    setReplayUrl("");
  }

  function hydrateForm(item: LiveStreamRecord) {
    setReplayId(item.id);
    setStreamUrl(item.streamUrl ?? "");
    setTitle(item.title);
    setDescription(item.description);
    setScheduledAt(item.scheduledAt ?? getDefaultDateTimeValue());
    setReplayUrl(item.replayUrl ?? "");
  }

  async function handleSave() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanScheduledAt = scheduledAt.trim();
    const cleanReplayUrl = replayUrl.trim();
    const cleanStreamUrl = streamUrl.trim();

    if (!cleanTitle || !cleanDescription || !cleanScheduledAt || !cleanReplayUrl) {
      Alert.alert("Champs requis", "Renseignez le titre, la description, la date et le lien replay.");
      return;
    }

    if (!isValidUrl(cleanReplayUrl) || !isValidUrl(cleanStreamUrl)) {
      Alert.alert("Lien invalide", "Les liens stream et replay doivent etre valides.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Session introuvable. Reconnectez-vous pour gerer les replays.");
      }

      await saveLiveStream({
        id: replayId,
        userId: user.id,
        title: cleanTitle,
        description: cleanDescription,
        streamUrl: cleanStreamUrl || null,
        replayUrl: cleanReplayUrl,
        scheduledAt: cleanScheduledAt,
        status: "replay",
      });

      resetForm();
      await loadPage();
      Alert.alert(
        replayId ? "Replay mis a jour" : "Replay ajoute",
        replayId
          ? "Le replay a bien ete actualise."
          : "Le replay a bien ete ajoute a la bibliotheque."
      );
    } catch (error: any) {
      Alert.alert("Enregistrement impossible", error?.message ?? "Le replay n'a pas pu etre enregistre.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: LiveStreamRecord) {
    if (!item.id) return;
    Alert.alert("Supprimer ce replay", "Ce replay sera retire de la liste.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLiveStream(item.id!);
            if (replayId === item.id) resetForm();
            await loadPage();
          } catch (error: any) {
            Alert.alert("Suppression impossible", error?.message ?? "Le replay n'a pas pu etre supprime.");
          }
        },
      },
    ]);
  }

  async function openReplay(url: string | null) {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Lien indisponible", "Impossible d'ouvrir ce replay.");
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
          <Text style={styles.heroTitle}>Replay des evenements</Text>
          <Text style={styles.heroSubtitle}>
            Ici, vous pouvez ajouter directement un replay ou modifier un replay deja enregistre.
          </Text>
        </View>

        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <View style={styles.editorCopy}>
              <Text style={styles.editorTitle}>
                {replayId ? "Modifier un replay" : "Nouveau replay"}
              </Text>
              <Text style={styles.editorText}>
                Le replay peut etre ajoute directement sans passer par la page des directs.
              </Text>
            </View>
            <Pressable style={styles.ghostButton} onPress={resetForm}>
              <Text style={styles.ghostButtonText}>Nouveau</Text>
            </Pressable>
          </View>

          <TextInput value={title} onChangeText={setTitle} placeholder="Titre du replay" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={scheduledAt} onChangeText={setScheduledAt} placeholder="Date du culte" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={streamUrl} onChangeText={setStreamUrl} placeholder="Lien du direct (optionnel)" placeholderTextColor="#94A3B8" style={styles.input} autoCapitalize="none" />
          <TextInput value={replayUrl} onChangeText={setReplayUrl} placeholder="Lien replay" placeholderTextColor="#94A3B8" style={styles.input} autoCapitalize="none" />
          <TextInput value={description} onChangeText={setDescription} placeholder="Description du replay" placeholderTextColor="#94A3B8" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />

          <Pressable
            style={[styles.primaryBtn, (saving || loading) && styles.disabledBtn]}
            disabled={saving || loading}
            onPress={handleSave}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? "Enregistrement..." : replayId ? "Mettre a jour le replay" : "Ajouter le replay"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Bibliotheque des replays</Text>
          <View style={styles.listBody}>
            {replayItems.map((item) => (
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
                    <Text style={styles.itemStatus}>Replay</Text>
                  </View>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <View style={styles.itemActions}>
                    <Pressable style={styles.editButton} onPress={() => hydrateForm(item)}>
                      <Text style={styles.editButtonText}>Modifier</Text>
                    </Pressable>
                    <Pressable style={styles.linkButton} onPress={() => openReplay(item.replayUrl)}>
                      <Text style={styles.linkButtonText}>Ecouter / voir</Text>
                    </Pressable>
                  </View>
                </View>
              </Swipeable>
            ))}
            {replayItems.length === 0 && <Text style={styles.emptyText}>Aucun replay disponible pour le moment.</Text>}
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
  editorCard: { borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8EEF5", padding: 16, gap: 12 },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  editorCopy: { flex: 1, gap: 4 },
  editorTitle: { color: "#16324F", fontSize: 16, fontWeight: "800" },
  editorText: { color: "#61758A", fontSize: 13, lineHeight: 18 },
  ghostButton: { height: 38, borderRadius: 10, paddingHorizontal: 14, backgroundColor: "#F3F6FA", alignItems: "center", justifyContent: "center" },
  ghostButtonText: { color: "#16324F", fontSize: 12.5, fontWeight: "800" },
  input: { borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, height: 46, color: "#16324F", fontSize: 14 },
  textArea: { minHeight: 110, height: "auto", paddingTop: 12, paddingBottom: 12 },
  primaryBtn: { height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#16324F" },
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
  linkButton: { height: 38, borderRadius: 10, backgroundColor: "#16324F", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  linkButtonText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
  emptyText: { color: "#61758A", fontSize: 13 },
  deleteAction: { width: 118, marginLeft: 10, borderRadius: 14, backgroundColor: "#C2410C", alignItems: "center", justifyContent: "center", gap: 6 },
  deleteText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
});
