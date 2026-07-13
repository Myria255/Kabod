import { COLORS } from "@/src/constants/colors";
import {
  deleteCommunityFeedPost,
  getAdminCommunityFeedPosts,
  kindLabel,
  type LocalCommunityFeedMedia,
  saveCommunityFeedPost,
  scopeLabel,
  uploadCommunityFeedMedia,
  type CommunityFeedKind,
  type CommunityFeedPost,
  type CommunityFeedScope,
  type CommunityFeedStatus,
} from "@/src/services/communityFeedSupabase";
import { supabase } from "@/supabaseClient";
import { notifyUsersFromAdmin } from "@/src/services/pushNotifications";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCOPES: CommunityFeedScope[] = ["general", "jeune", "mariee"];
const KINDS: CommunityFeedKind[] = ["announcement", "encouragement", "prayer", "event", "testimony"];
const STATUSES: CommunityFeedStatus[] = ["published", "draft", "archived"];

function statusLabel(status: CommunityFeedStatus) {
  if (status === "draft") return "Brouillon";
  if (status === "archived") return "Archivé";
  return "Publié";
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

export default function AdminCommunityFeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetScope, setTargetScope] = useState<CommunityFeedScope>("general");
  const [kind, setKind] = useState<CommunityFeedKind>("announcement");
  const [status, setStatus] = useState<CommunityFeedStatus>("published");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LocalCommunityFeedMedia | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<LocalCommunityFeedMedia | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const rows = await getAdminCommunityFeedPosts("all");
      setPosts(rows);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger le fil communauté.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedId(null);
    setTargetScope("general");
    setKind("announcement");
    setStatus("published");
    setTitle("");
    setBody("");
    setPinned(false);
    setSelectedImage(null);
    setSelectedAudio(null);
    setImageUrl(null);
    setImagePath(null);
    setAudioUrl(null);
    setAudioPath(null);
  }

  function editPost(post: CommunityFeedPost) {
    setSelectedId(post.id);
    setTargetScope(post.targetScope);
    setKind(post.kind);
    setStatus(post.status);
    setTitle(post.title);
    setBody(post.body);
    setPinned(post.pinned);
    setSelectedImage(null);
    setSelectedAudio(null);
    setImageUrl(post.imageUrl);
    setImagePath(post.imagePath);
    setAudioUrl(post.audioUrl);
    setAudioPath(post.audioPath);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName ?? `affiche-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      setImageUrl(asset.uri);
    }
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
      setAudioUrl(asset.uri);
    }
  }

  async function savePost() {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Champs requis", "Ajoutez un titre et un contenu.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Session expirée.");

      let nextImageUrl = imageUrl;
      let nextImagePath = imagePath;
      let nextAudioUrl = audioUrl;
      let nextAudioPath = audioPath;

      if (selectedImage) {
        const uploaded = await uploadCommunityFeedMedia(user.id, "images", selectedImage);
        nextImageUrl = uploaded.url;
        nextImagePath = uploaded.path;
      }

      if (selectedAudio) {
        const uploaded = await uploadCommunityFeedMedia(user.id, "audios", selectedAudio);
        nextAudioUrl = uploaded.url;
        nextAudioPath = uploaded.path;
      }

      await saveCommunityFeedPost({
        id: selectedId,
        userId: user.id,
        targetScope,
        title,
        body,
        kind,
        status,
        pinned,
        imageUrl: nextImageUrl,
        imagePath: nextImagePath,
        audioUrl: nextAudioUrl,
        audioPath: nextAudioPath,
      });

      if (status === "published") {
        notifyUsersFromAdmin({
          title: "Nouvelle publication Kabod",
          body: title.trim(),
          targetScope: targetScope === "general" ? "all" : targetScope,
          data: { type: "community_feed", route: "/communaute/fil" },
        }).catch((error) => console.warn("Notification publication failed", error));
      }

      resetForm();
      await loadPage();
      Alert.alert(status === "published" ? "Publication envoyée" : "Publication sauvegardée");
    } catch (error: any) {
      Alert.alert("Enregistrement impossible", error?.message ?? "La publication n’a pas pu être sauvegardée.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(post: CommunityFeedPost) {
    Alert.alert("Supprimer la publication ?", post.title, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCommunityFeedPost(post.id);
            if (selectedId === post.id) resetForm();
            await loadPage();
          } catch (error: any) {
            Alert.alert("Suppression impossible", error?.message ?? "La publication n’a pas pu être supprimée.");
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
            <Text style={styles.eyebrow}>Communauté</Text>
            <Text style={styles.title}>Fil communauté</Text>
            <Text style={styles.subtitle}>Publiez dans le fil général ou dans une communauté précise.</Text>
          </View>
          <Pressable style={styles.resetButton} onPress={resetForm}>
            <Ionicons name="add" size={22} color={COLORS.gold} />
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <MaterialCommunityIcons name="message-text-outline" size={22} color={COLORS.gold} />
            <Text style={styles.formTitle}>{selectedId ? "Modifier une publication" : "Nouvelle publication"}</Text>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message à publier..."
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.area]}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.mediaPanel}>
            <View style={styles.mediaActions}>
              <Pressable style={styles.mediaButton} onPress={pickImage}>
                <Ionicons name="image-outline" size={18} color={COLORS.gold} />
                <Text style={styles.mediaButtonText}>{imageUrl ? "Changer l’affiche" : "Ajouter une affiche"}</Text>
              </Pressable>
              <Pressable style={styles.mediaButton} onPress={pickAudio}>
                <Ionicons name="mic-outline" size={18} color={COLORS.gold} />
                <Text style={styles.mediaButtonText}>{audioUrl ? "Changer l’audio" : "Ajouter un audio"}</Text>
              </Pressable>
            </View>

            {!!imageUrl && (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                <Pressable
                  style={styles.removeMediaButton}
                  onPress={() => {
                    setSelectedImage(null);
                    setImageUrl(null);
                    setImagePath(null);
                  }}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </Pressable>
              </View>
            )}

            {!!audioUrl && (
              <View style={styles.audioPreview}>
                <Ionicons name="musical-notes-outline" size={18} color={COLORS.gold} />
                <Text style={styles.audioPreviewText} numberOfLines={1}>
                  {selectedAudio?.name ?? "Audio attaché à cette publication"}
                </Text>
                <Pressable
                  onPress={() => {
                    setSelectedAudio(null);
                    setAudioUrl(null);
                    setAudioPath(null);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.choiceLabel}>Publier pour</Text>
          <View style={styles.choiceRow}>
            {SCOPES.map((scope) => (
              <Pressable
                key={scope}
                style={[styles.choice, targetScope === scope && styles.choiceActive]}
                onPress={() => setTargetScope(scope)}
              >
                <Text style={[styles.choiceText, targetScope === scope && styles.choiceTextActive]}>{scopeLabel(scope)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.choiceLabel}>Type</Text>
          <View style={styles.wrapRow}>
            {KINDS.map((item) => (
              <Pressable
                key={item}
                style={[styles.smallChoice, kind === item && styles.smallChoiceActive]}
                onPress={() => setKind(item)}
              >
                <Text style={[styles.smallChoiceText, kind === item && styles.smallChoiceTextActive]}>{kindLabel(item)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.choiceLabel}>Statut</Text>
          <View style={styles.choiceRow}>
            {STATUSES.map((item) => (
              <Pressable
                key={item}
                style={[styles.choice, status === item && styles.choiceActive]}
                onPress={() => setStatus(item)}
              >
                <Text style={[styles.choiceText, status === item && styles.choiceTextActive]}>{statusLabel(item)}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.pinRow} onPress={() => setPinned((value) => !value)}>
            <Ionicons name={pinned ? "checkbox" : "square-outline"} size={20} color={pinned ? COLORS.gold : COLORS.gray} />
            <Text style={styles.pinText}>Épingler en haut du fil</Text>
          </Pressable>

          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={savePost} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Publications</Text>
          <Text style={styles.sectionCount}>{posts.length}</Text>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune publication</Text>
            <Text style={styles.emptyText}>Créez une première publication pour alimenter le fil.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {posts.map((post) => (
              <Pressable key={post.id} style={styles.postItem} onPress={() => editPost(post)}>
                <View style={styles.postIcon}>
                  <MaterialCommunityIcons name="message-text-outline" size={19} color={COLORS.gold} />
                </View>
                <View style={styles.postBody}>
                  <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
                  <Text style={styles.postMeta} numberOfLines={1}>
                    {scopeLabel(post.targetScope)} · {kindLabel(post.kind)} · {statusLabel(post.status)} · {formatDate(post.updatedAt)}
                  </Text>
                </View>
                <Pressable style={styles.deleteButton} onPress={() => confirmDelete(post)}>
                  <Ionicons name="trash-outline" size={17} color="#B42318" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
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
  title: { color: COLORS.blueDark, fontSize: 29, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  formTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
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
  area: { minHeight: 120, paddingTop: 14, lineHeight: 20 },
  mediaPanel: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
  },
  mediaActions: { flexDirection: "row", gap: 8 },
  mediaButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  mediaButtonText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900", textAlign: "center" },
  imagePreviewWrap: {
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.blueDark,
  },
  imagePreview: { width: "100%", height: 190 },
  removeMediaButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(16,24,39,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioPreview: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  audioPreviewText: { flex: 1, color: COLORS.blueDark, fontSize: 12.5, fontWeight: "800" },
  choiceLabel: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  choiceActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  choiceText: { color: COLORS.gray, fontSize: 11.5, fontWeight: "900", textAlign: "center" },
  choiceTextActive: { color: COLORS.white },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallChoice: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallChoiceActive: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.gold },
  smallChoiceText: { color: COLORS.gray, fontSize: 12, fontWeight: "900" },
  smallChoiceTextActive: { color: COLORS.blueDark },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 42 },
  pinText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "800" },
  saveButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  sectionCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    color: COLORS.blueDark,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "900",
    overflow: "hidden",
  },
  centerCard: {
    minHeight: 130,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    padding: 20,
    alignItems: "center",
    gap: 7,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center" },
  list: { gap: 10 },
  postItem: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  postIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  postBody: { flex: 1, gap: 4 },
  postTitle: { color: COLORS.blueDark, fontSize: 14.5, fontWeight: "900" },
  postMeta: { color: COLORS.gray, fontSize: 11.5, fontWeight: "700" },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#FEF3F2",
    alignItems: "center",
    justifyContent: "center",
  },
});
