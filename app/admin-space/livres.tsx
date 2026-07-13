import { COLORS } from "@/src/constants/colors";
import {
  deleteBook,
  fileTypeFromName,
  getAdminBooks,
  saveBook,
  scopeLabel,
  statusLabel,
  type BookFileType,
  type BookScope,
  type BookStatus,
  type LibraryBook,
  type LocalBookAsset,
  uploadBookAsset,
} from "@/src/services/bookLibrarySupabase";
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
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCOPES: BookScope[] = ["general", "jeune", "mariee"];
const STATUSES: BookStatus[] = ["published", "draft", "archived"];

function formatSize(value: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function AdminBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("fr");
  const [targetScope, setTargetScope] = useState<BookScope>("general");
  const [status, setStatus] = useState<BookStatus>("published");
  const [isDownloadable, setIsDownloadable] = useState(true);
  const [fileType, setFileType] = useState<BookFileType>("pdf");
  const [coverObjectKey, setCoverObjectKey] = useState<string | null>(null);
  const [fileObjectKey, setFileObjectKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [selectedCover, setSelectedCover] = useState<LocalBookAsset | null>(null);
  const [selectedFile, setSelectedFile] = useState<LocalBookAsset | null>(null);
  const [coverPreviewUri, setCoverPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const rows = await getAdminBooks();
      setBooks(rows);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les livres.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setBookId(null);
    setTitle("");
    setAuthor("");
    setDescription("");
    setCategory("");
    setLanguage("fr");
    setTargetScope("general");
    setStatus("published");
    setIsDownloadable(true);
    setFileType("pdf");
    setCoverObjectKey(null);
    setFileObjectKey(null);
    setFileName(null);
    setFileSize(null);
    setSelectedCover(null);
    setSelectedFile(null);
    setCoverPreviewUri(null);
  }

  function editBook(book: LibraryBook) {
    setBookId(book.id);
    setTitle(book.title);
    setAuthor(book.author ?? "");
    setDescription(book.description ?? "");
    setCategory(book.category ?? "");
    setLanguage(book.language);
    setTargetScope(book.targetScope);
    setStatus(book.status);
    setIsDownloadable(book.isDownloadable);
    setFileType(book.fileType);
    setCoverObjectKey(book.coverObjectKey);
    setFileObjectKey(book.fileObjectKey);
    setFileName(book.fileName);
    setFileSize(book.fileSize);
    setSelectedCover(null);
    setSelectedFile(null);
    setCoverPreviewUri(null);
  }

  async function pickCover() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedCover({
        uri: asset.uri,
        name: asset.fileName ?? `cover-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        size: asset.fileSize ?? null,
      });
      setCoverPreviewUri(asset.uri);
    }
  }

  async function pickBookFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/epub+zip",
        "application/octet-stream",
        "audio/mpeg",
        "audio/mp4",
        "audio/aac",
        "audio/wav",
        "audio/ogg",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size ?? null,
      });
      setFileName(asset.name);
      setFileSize(asset.size ?? null);
      setFileType(fileTypeFromName(asset.name));
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Titre requis", "Ajoutez un titre au livre.");
      return;
    }

    if (!selectedFile && !fileObjectKey) {
      Alert.alert("Fichier requis", "Ajoutez le fichier PDF, EPUB ou audio.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Session expirée.");

      let nextCoverKey = coverObjectKey;
      let nextFileKey = fileObjectKey;

      if (selectedCover) {
        nextCoverKey = await uploadBookAsset(user.id, "covers", selectedCover);
      }

      if (selectedFile) {
        nextFileKey = await uploadBookAsset(user.id, "files", selectedFile);
      }

      if (!nextFileKey) throw new Error("Fichier du livre indisponible.");

      await saveBook({
        id: bookId,
        userId: user.id,
        title,
        author,
        description,
        category,
        language,
        targetScope,
        status,
        isDownloadable,
        fileType,
        fileName,
        fileSize,
        coverObjectKey: nextCoverKey,
        fileObjectKey: nextFileKey,
      });

      if (status === "published") {
        notifyUsersFromAdmin({
          title: "Nouveau livre disponible",
          body: title.trim(),
          targetScope: targetScope === "general" ? "all" : targetScope,
          data: { type: "book", route: "/bibliotheque/livres" },
        }).catch((error) => console.warn("Notification livre failed", error));
      }

      resetForm();
      await loadPage();
      Alert.alert(status === "published" ? "Livre publié" : "Livre sauvegardé");
    } catch (error: any) {
      Alert.alert("Enregistrement impossible", error?.message ?? "Le livre n’a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(book: LibraryBook) {
    Alert.alert("Supprimer ce livre ?", book.title, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBook(book.id);
            if (bookId === book.id) resetForm();
            await loadPage();
          } catch (error: any) {
            Alert.alert("Suppression impossible", error?.message ?? "Le livre n’a pas pu être supprimé.");
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
            <Text style={styles.eyebrow}>Bibliothèque</Text>
            <Text style={styles.title}>Livres & documents</Text>
            <Text style={styles.subtitle}>Ajoutez les ressources que les membres pourront lire ou télécharger.</Text>
          </View>
          <Pressable style={styles.addButton} onPress={resetForm}>
            <Ionicons name="add" size={22} color={COLORS.gold} />
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <MaterialCommunityIcons name="book-plus-outline" size={22} color={COLORS.gold} />
            <Text style={styles.formTitle}>{bookId ? "Modifier le livre" : "Nouveau livre"}</Text>
          </View>

          <Pressable style={styles.coverPicker} onPress={pickCover}>
            {coverPreviewUri ? (
              <Image source={{ uri: coverPreviewUri }} style={styles.coverPreview} />
            ) : (
              <View style={styles.coverEmpty}>
                <Ionicons name="image-outline" size={24} color={COLORS.gold} />
                <Text style={styles.coverText}>{coverObjectKey ? "Changer la couverture" : "Ajouter une couverture"}</Text>
              </View>
            )}
          </Pressable>

          <TextInput value={title} onChangeText={setTitle} placeholder="Titre du livre" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={author} onChangeText={setAuthor} placeholder="Auteur" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={category} onChangeText={setCategory} placeholder="Catégorie ex: Foi, Couple, Jeunesse..." placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={language} onChangeText={setLanguage} placeholder="Langue ex: fr" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.area]}
            multiline
            textAlignVertical="top"
          />

          <Pressable style={styles.filePicker} onPress={pickBookFile}>
            <Ionicons name={fileType === "audio" ? "headset-outline" : "document-attach-outline"} size={20} color={COLORS.gold} />
            <View style={styles.fileCopy}>
              <Text style={styles.fileTitle}>{fileName ?? "Ajouter le fichier PDF / EPUB / audio"}</Text>
              <Text style={styles.fileText}>{fileName ? `${fileType.toUpperCase()} ${formatSize(fileSize)}` : "Le fichier sera envoyé vers Cloudflare R2"}</Text>
            </View>
          </Pressable>

          <Text style={styles.choiceLabel}>Visible pour</Text>
          <View style={styles.choiceRow}>
            {SCOPES.map((scope) => (
              <Pressable key={scope} style={[styles.choice, targetScope === scope && styles.choiceActive]} onPress={() => setTargetScope(scope)}>
                <Text style={[styles.choiceText, targetScope === scope && styles.choiceTextActive]}>{scopeLabel(scope)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.choiceLabel}>Statut</Text>
          <View style={styles.choiceRow}>
            {STATUSES.map((item) => (
              <Pressable key={item} style={[styles.choice, status === item && styles.choiceActive]} onPress={() => setStatus(item)}>
                <Text style={[styles.choiceText, status === item && styles.choiceTextActive]}>{statusLabel(item)}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.checkRow} onPress={() => setIsDownloadable((value) => !value)}>
            <Ionicons name={isDownloadable ? "checkbox" : "square-outline"} size={20} color={isDownloadable ? COLORS.gold : COLORS.gray} />
            <Text style={styles.checkText}>Autoriser le téléchargement</Text>
          </Pressable>

          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Livres</Text>
          <Text style={styles.sectionCount}>{books.length}</Text>
        </View>

        {loading ? (
          <View style={styles.centerCard}><ActivityIndicator color={COLORS.gold} /></View>
        ) : books.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun livre</Text>
            <Text style={styles.emptyText}>Ajoutez votre premier livre pour alimenter la bibliothèque.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {books.map((book) => (
              <Pressable key={book.id} style={styles.bookItem} onPress={() => editBook(book)}>
                <View style={styles.bookIcon}>
                  <MaterialCommunityIcons name="book-open-page-variant-outline" size={20} color={COLORS.gold} />
                </View>
                <View style={styles.bookCopy}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                  <Text style={styles.bookMeta} numberOfLines={1}>
                    {scopeLabel(book.targetScope)} · {statusLabel(book.status)} · {book.fileType.toUpperCase()}
                  </Text>
                </View>
                <Pressable style={styles.deleteButton} onPress={() => confirmDelete(book)}>
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
  title: { color: COLORS.blueDark, fontSize: 28, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  addButton: {
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
  coverPicker: {
    height: 190,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverPreview: { width: "100%", height: "100%" },
  coverEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  coverText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
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
  area: { minHeight: 110, paddingTop: 14, lineHeight: 20 },
  filePicker: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(217,183,95,0.4)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  fileCopy: { flex: 1, gap: 3 },
  fileTitle: { color: COLORS.blueDark, fontSize: 13.5, fontWeight: "900" },
  fileText: { color: COLORS.gray, fontSize: 12, fontWeight: "700" },
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
  checkRow: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 42 },
  checkText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "800" },
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
  centerCard: { minHeight: 130, borderRadius: 22, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  emptyCard: { borderRadius: 22, backgroundColor: "#F8FAFC", padding: 20, alignItems: "center", gap: 7 },
  emptyTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: "center" },
  list: { gap: 10 },
  bookItem: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bookIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  bookCopy: { flex: 1, gap: 4 },
  bookTitle: { color: COLORS.blueDark, fontSize: 14.5, fontWeight: "900" },
  bookMeta: { color: COLORS.gray, fontSize: 11.5, fontWeight: "700" },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#FEF3F2",
    alignItems: "center",
    justifyContent: "center",
  },
});
