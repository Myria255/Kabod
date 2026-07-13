import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import {
  createTestimony,
  getApprovedTestimonies,
  type LocalAudioSelection,
  type TestimonyRecord,
  uploadTestimonyAudio,
} from "@/src/services/testimonySupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function communityLabel(value: TestimonyRecord["communityType"]) {
  if (value === "jeune") return "Jeunes chrétiens";
  if (value === "mariee") return "Couples mariés";
  return "Communauté";
}

export default function CommunityTestimoniesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [items, setItems] = useState<TestimonyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTestimony, setActiveTestimony] = useState<TestimonyRecord | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<LocalAudioSelection | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const rows = await getApprovedTestimonies();
      setItems(rows);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les témoignages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshPage() {
    setRefreshing(true);
    await loadPage();
  }

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedAudio({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
    }
  }

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

  async function submitTestimony() {
    const cleanTitle = title.trim();
    const cleanText = text.trim();

    if (!cleanTitle) {
      Alert.alert("Titre requis", "Ajoutez un petit titre pour aider l'admin à comprendre le témoignage.");
      return;
    }

    if (!cleanText && !selectedAudio) {
      Alert.alert("Témoignage vide", "Ajoutez un texte ou importez un audio.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/(auth)/login");
        return;
      }

      let audioUrl: string | null = null;
      let audioPath: string | null = null;

      if (selectedAudio) {
        const upload = await uploadTestimonyAudio(authUser.id, selectedAudio);
        audioUrl = upload.audioUrl;
        audioPath = upload.audioPath;
      }

      await createTestimony({
        userId: authUser.id,
        authorName: user?.nom ?? authUser.email ?? null,
        communityType: null,
        title: cleanTitle,
        originalText: cleanText || null,
        audioUrl,
        audioPath,
      });

      setTitle("");
      setText("");
      setSelectedAudio(null);
      setShowComposer(false);
      await loadPage();
      Alert.alert(
        "Témoignage envoyé",
        "Merci pour ce partage. Il sera visible dans la communauté après validation par un administrateur."
      );
    } catch (error: any) {
      Alert.alert("Envoi impossible", error?.message ?? "Le témoignage n'a pas pu être envoyé.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshPage} />}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Communauté</Text>
            <Text style={styles.title}>Témoignages</Text>
            <Text style={styles.subtitle}>
              Partagez ce que Dieu fait, et découvrez les encouragements validés par l’équipe.
            </Text>
          </View>
        </View>

        <View style={styles.inviteCard}>
          <View style={styles.inviteIcon}>
            <MaterialCommunityIcons name="heart-plus-outline" size={28} color={COLORS.gold} />
          </View>
          <View style={styles.inviteBody}>
            <Text style={styles.inviteTitle}>Vous avez un témoignage ?</Text>
            <Text style={styles.inviteText}>
              Envoyez-le simplement. L’administrateur le relit, puis il apparaît ici sous forme de bouton lisible.
            </Text>
          </View>
          <Pressable style={styles.inviteButton} onPress={() => setShowComposer((value) => !value)}>
            <Text style={styles.inviteButtonText}>{showComposer ? "Fermer" : "Partager"}</Text>
            <Ionicons name={showComposer ? "chevron-up" : "add"} size={17} color={COLORS.white} />
          </Pressable>
        </View>

        {showComposer && (
        <View style={styles.formCard}>
          <View style={styles.formTop}>
            <View style={styles.formIcon}>
              <MaterialCommunityIcons name="message-star-outline" size={22} color={COLORS.gold} />
            </View>
            <View style={styles.formIntro}>
              <Text style={styles.formTitle}>Envoyer un témoignage</Text>
              <Text style={styles.formText}>Il sera relu avant publication pour garder un espace sain.</Text>
            </View>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre du témoignage"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écrivez votre témoignage ici..."
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
          />

          <Pressable style={styles.audioPicker} onPress={pickAudio}>
            <Ionicons name="mic-outline" size={18} color={COLORS.gold} />
            <Text style={styles.audioPickerText} numberOfLines={1}>
              {selectedAudio ? selectedAudio.name : "Ajouter un audio, si vous préférez parler"}
            </Text>
            {selectedAudio ? (
              <Pressable onPress={() => setSelectedAudio(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={COLORS.gray} />
              </Pressable>
            ) : (
              <Ionicons name="add-circle-outline" size={18} color={COLORS.blueDark} />
            )}
          </Pressable>

          <Pressable
            style={[styles.submitButton, saving && styles.disabled]}
            onPress={submitTestimony}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.submitText}>Envoyer à l’administrateur</Text>
                <Ionicons name="send" size={16} color={COLORS.white} />
              </>
            )}
          </Pressable>
        </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Témoignages publiés</Text>
          <Text style={styles.sectionCount}>{items.length}</Text>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="heart-outline" size={24} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>Aucun témoignage publié</Text>
            <Text style={styles.emptyText}>Les témoignages approuvés apparaîtront ici.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Pressable key={item.id} style={styles.testimonyCard} onPress={() => setActiveTestimony(item)}>
                <View style={styles.testimonyTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.authorName?.[0] ?? "K").toUpperCase()}</Text>
                  </View>
                  <View style={styles.testimonyMeta}>
                    <Text style={styles.testimonyTitle}>{item.title}</Text>
                    <Text style={styles.metaText}>
                      {item.authorName ?? "Membre Kabod"} · {communityLabel(item.communityType)} ·{" "}
                      {formatDate(item.reviewedAt ?? item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.openBadge}>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.blueDark} />
                  </View>
                </View>

         
                <View style={styles.cardFooter}>
                  <Text style={styles.readMore}>Lire le témoignage</Text>
                  {!!item.audioUrl && (
                    <View style={styles.audioBadge}>
                      <Ionicons name="mic-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.audioBadgeText}>Audio</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={activeTestimony !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveTestimony(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <MaterialCommunityIcons name="message-star-outline" size={22} color={COLORS.gold} />
              </View>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalEyebrow}>Témoignage publié</Text>
                <Text style={styles.modalTitle}>{activeTestimony?.title}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setActiveTestimony(null)}>
                <Ionicons name="close" size={20} color={COLORS.blueDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalMeta}>
                {activeTestimony?.authorName ?? "Membre Kabod"} · {communityLabel(activeTestimony?.communityType ?? null)} ·{" "}
                {formatDate(activeTestimony?.reviewedAt ?? activeTestimony?.createdAt ?? null)}
              </Text>

              {!!(activeTestimony?.publishedText || activeTestimony?.originalText) && (
                <Text style={styles.modalText}>{activeTestimony.publishedText || activeTestimony.originalText}</Text>
              )}

              {!!activeTestimony?.audioUrl && (
                <Pressable style={styles.modalListenButton} onPress={() => openAudio(activeTestimony.audioUrl)}>
                  <Ionicons name="play-circle" size={20} color={COLORS.blueDark} />
                  <Text style={styles.modalListenText}>Écouter l’audio</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  content: {
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 18,
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
  inviteCard: {
    borderRadius: 26,
    backgroundColor: COLORS.blueDark,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(217,183,95,0.25)",
  },
  inviteIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBody: { gap: 5 },
  inviteTitle: { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  inviteText: { color: "#D1D5DB", fontSize: 13, lineHeight: 20 },
  inviteButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inviteButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  formIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  formIntro: { flex: 1, gap: 2 },
  formTitle: { color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  formText: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
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
  textArea: {
    minHeight: 120,
    paddingTop: 14,
    lineHeight: 20,
  },
  audioPicker: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  audioPickerText: { flex: 1, color: COLORS.gray, fontSize: 13, fontWeight: "800" },
  submitButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  disabled: { opacity: 0.65 },
  submitText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
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
  centerCard: {
    minHeight: 120,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 22,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center" },
  list: { gap: 12 },
  testimonyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  testimonyTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  openBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.gold, fontSize: 16, fontWeight: "900" },
  testimonyMeta: { flex: 1, gap: 3 },
  testimonyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  metaText: { color: COLORS.gray, fontSize: 11.5, lineHeight: 16 },
  testimonyText: { color: COLORS.blueDark, fontSize: 14, lineHeight: 22 },
  cardFooter: {
    minHeight: 36,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  readMore: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  audioBadge: {
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  audioBadgeText: { color: COLORS.gray, fontSize: 11, fontWeight: "900" },
  listenButton: {
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.goldSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  listenText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,39,0.55)",
    justifyContent: "flex-end",
    padding: 12,
  },
  modalCard: {
    maxHeight: "82%",
    borderRadius: 28,
    backgroundColor: COLORS.white,
    padding: 16,
    gap: 12,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: "center",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleWrap: { flex: 1, gap: 3 },
  modalEyebrow: { color: COLORS.gold, fontSize: 10.5, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  modalTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { marginTop: 4 },
  modalMeta: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18, marginBottom: 14 },
  modalText: { color: COLORS.blueDark, fontSize: 15, lineHeight: 24 },
  modalListenButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  modalListenText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
});
