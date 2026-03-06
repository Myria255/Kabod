import { Ionicons } from "@expo/vector-icons";
import { getBooks, getChapters, getVerses } from "@/src/constants/bible";
import { supabase } from "@/supabaseClient";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Meditation = {
  id: string;
  date: string;
  title?: string;
  content: string;
  reference?: string;
};

type RawMeditationRow = Record<string, any>;

const COLORS = {
  primary: "#0F172A",
  gold: "#D4AF37",
  gray: "#6B6F8A",
  grayLight: "#F2F3F7",
  white: "#FFFFFF",
  blueSoft: "#EEF3FF",
  goldSoft: "#FFF8E1",
  mintSoft: "#ECFDF5",
};

const TABLE_MEDITATIONS = "meditations";

export default function MeditationCarnet() {
  const router = useRouter();
  const [entries, setEntries] = useState<Meditation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [openedEntry, setOpenedEntry] = useState<Meditation | null>(null);
  const [editingEntry, setEditingEntry] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reference, setReference] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedVerse, setSelectedVerse] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editReference, setEditReference] = useState("");

  const availableBooks = useMemo(() => getBooks(), []);
  const availableChapters = useMemo(
    () => (selectedBook ? getChapters(selectedBook) : []),
    [selectedBook]
  );
  const availableVerses = useMemo(() => {
    if (!selectedBook || !selectedChapter) return [];
    return Object.keys(getVerses(selectedBook, selectedChapter));
  }, [selectedBook, selectedChapter]);

  function normalizeMeditation(row: RawMeditationRow): Meditation {
    const id = String(row.id ?? row.uuid ?? Date.now());
    const date = String(
      row.date_creation ?? row.created_at ?? row.date ?? new Date().toISOString()
    );
    const rawTitle = row.titre ?? row.title;
    const rawContent = row.contenu ?? row.content ?? "";
    const rawReference = row.reference ?? row.reference_biblique;
    return {
      id,
      date,
      title: typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : undefined,
      content: String(rawContent ?? ""),
      reference:
        typeof rawReference === "string" && rawReference.trim()
          ? rawReference.trim()
          : undefined,
    };
  }

  async function fetchEntries(uid: string) {
    const primary = await supabase
      .from(TABLE_MEDITATIONS)
      .select("*")
      .eq("utilisateur_id", uid)
      .order("date_creation", { ascending: false });

    if (!primary.error && primary.data) {
      setEntries(primary.data.map(normalizeMeditation));
      return;
    }

    const fallback = await supabase
      .from(TABLE_MEDITATIONS)
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!fallback.error && fallback.data) {
      setEntries(fallback.data.map(normalizeMeditation));
      return;
    }

    throw primary.error ?? fallback.error ?? new Error("Chargement impossible");
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          router.replace("/(auth)/login" as any);
          return;
        }
        const profile = await supabase
          .from("users_profile")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile.error || !profile.data?.id) {
          Alert.alert(
            "Profil introuvable",
            "Votre profil utilisateur est manquant. Reconnectez-vous ou contactez l'administrateur."
          );
          setEntries([]);
          return;
        }

        setProfileId(profile.data.id);
        await fetchEntries(profile.data.id);
      } catch {
        Alert.alert(
          "Erreur",
          "Impossible de charger le carnet. Verifie la table meditations et les regles RLS."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const saveEntry = async () => {
    if (!profileId) {
      router.replace("/(auth)/login" as any);
      return;
    }

    if (!content.trim()) {
      Alert.alert("Contenu requis", "Ecrivez votre meditation.");
      return;
    }

    const nowIso = new Date().toISOString();
    const trimmedTitle = title.trim() || null;
    const trimmedReference = reference.trim() || null;
    const trimmedContent = content.trim();

    setSaving(true);
    try {
      const primaryInsert = await supabase
        .from(TABLE_MEDITATIONS)
        .insert({
          utilisateur_id: profileId,
          titre: trimmedTitle,
          contenu: trimmedContent,
          reference: trimmedReference,
          date_creation: nowIso,
        })
        .select("*")
        .single();

      let inserted = primaryInsert;
      if (primaryInsert.error) {
        inserted = await supabase
          .from(TABLE_MEDITATIONS)
          .insert({
            user_id: profileId,
            title: trimmedTitle,
            content: trimmedContent,
            reference: trimmedReference,
            created_at: nowIso,
          })
          .select("*")
          .single();
      }

      if (inserted.error || !inserted.data) {
        throw inserted.error ?? new Error("Insertion impossible");
      }

      const newEntry = normalizeMeditation(inserted.data);
      setEntries((prev) => [newEntry, ...prev]);
      setTitle("");
      setContent("");
      setReference("");
      setSelectedBook(availableBooks[0] ?? "");
      setSelectedChapter("");
      setSelectedVerse("");
      setModalVisible(false);
    } catch (e: any) {
      const details =
        e?.message || e?.details || e?.hint || "Erreur inconnue";
      Alert.alert(
        "Enregistrement impossible",
        `Votre note n'a pas pu etre enregistree.\n\nDetail: ${details}`
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (id: string) => {
    if (!profileId) return;
    Alert.alert("Supprimer", "Supprimer cette meditation ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const primaryDelete = await supabase
            .from(TABLE_MEDITATIONS)
            .delete()
            .eq("id", id)
            .eq("utilisateur_id", profileId);

          if (primaryDelete.error) {
            const fallbackDelete = await supabase
              .from(TABLE_MEDITATIONS)
              .delete()
              .eq("id", id)
              .eq("user_id", profileId);

            if (fallbackDelete.error) {
              Alert.alert("Suppression impossible", "Cette note n'a pas pu etre supprimee.");
              return;
            }
          }

          setEntries((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  const startEditingOpenedEntry = () => {
    if (!openedEntry) return;
    setEditTitle(openedEntry.title || "");
    setEditContent(openedEntry.content || "");
    setEditReference(openedEntry.reference || "");
    setEditingEntry(true);
  };

  const cancelEditingOpenedEntry = () => {
    setEditingEntry(false);
    setEditTitle("");
    setEditContent("");
    setEditReference("");
  };

  const saveOpenedEntryEdits = async () => {
    if (!openedEntry || !profileId) return;
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      Alert.alert("Contenu requis", "Le contenu de la meditation est obligatoire.");
      return;
    }

    setSavingEdit(true);
    const nowIso = new Date().toISOString();
    try {
      const primaryUpdate = await supabase
        .from(TABLE_MEDITATIONS)
        .update({
          titre: editTitle.trim() || null,
          contenu: trimmedContent,
          reference: editReference.trim() || null,
          updated_at: nowIso,
        })
        .eq("id", openedEntry.id)
        .eq("utilisateur_id", profileId)
        .select("*")
        .single();

      let updated = primaryUpdate;
      if (primaryUpdate.error) {
        updated = await supabase
          .from(TABLE_MEDITATIONS)
          .update({
            title: editTitle.trim() || null,
            content: trimmedContent,
            reference: editReference.trim() || null,
            updated_at: nowIso,
          })
          .eq("id", openedEntry.id)
          .eq("user_id", profileId)
          .select("*")
          .single();
      }

      if (updated.error || !updated.data) {
        throw updated.error ?? new Error("Mise a jour impossible");
      }

      const normalized = normalizeMeditation(updated.data);
      setEntries((prev) => prev.map((entry) => (entry.id === normalized.id ? normalized : entry)));
      setOpenedEntry(normalized);
      cancelEditingOpenedEntry();
    } catch (e: any) {
      const details = e?.message || e?.details || e?.hint || "Erreur inconnue";
      Alert.alert(
        "Modification impossible",
        `La note n'a pas pu etre modifiee.\n\nDetail: ${details}`
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const applyVerseReference = () => {
    if (!selectedBook || !selectedChapter || !selectedVerse) {
      Alert.alert("Reference incomplete", "Renseigne Livre, Chapitre et Verset.");
      return;
    }
    const chapterNumber = Number(selectedChapter);
    const verseNum = Number(selectedVerse);
    if (
      !Number.isFinite(chapterNumber) ||
      chapterNumber < 1 ||
      !Number.isFinite(verseNum) ||
      verseNum < 1
    ) {
      Alert.alert(
        "Reference invalide",
        "Chapitre et Verset doivent etre des nombres positifs."
      );
      return;
    }
    setReference(`${selectedBook} ${chapterNumber}:${verseNum}`);
  };

  const openReference = (referenceValue?: string) => {
    if (!referenceValue) return;
    const parsed = referenceValue.trim().match(/^(.*)\s+(\d+):(\d+)$/);
    if (!parsed) {
      Alert.alert("Reference invalide", "Impossible d'ouvrir cette reference.");
      return;
    }
    const book = parsed[1].trim();
    const chapter = parsed[2].trim();
    const verse = parsed[3].trim();
    if (!availableBooks.includes(book)) {
      Alert.alert("Livre introuvable", "Ce livre n'existe pas dans la Bible chargee.");
      return;
    }
    router.push({
      pathname: "/bible/[bookId]/[chapterId]",
      params: {
        bookId: book,
        bookName: book,
        chapterId: chapter,
        verse,
      },
    });
  };

  useEffect(() => {
    if (!modalVisible) return;
    if (!selectedBook && availableBooks.length > 0) {
      setSelectedBook(availableBooks[0]);
    }
  }, [availableBooks, modalVisible, selectedBook]);

  useEffect(() => {
    if (!selectedBook) return;
    const chapters = getChapters(selectedBook);
    const firstChapter = chapters[0] ?? "";
    if (!selectedChapter || !chapters.includes(selectedChapter)) {
      setSelectedChapter(firstChapter);
      return;
    }
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    const verses = Object.keys(getVerses(selectedBook, selectedChapter));
    const firstVerse = verses[0] ?? "";
    if (!selectedVerse || !verses.includes(selectedVerse)) {
      setSelectedVerse(firstVerse);
    }
  }, [selectedBook, selectedChapter, selectedVerse]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carnet de meditations</Text>
        <Pressable onPress={() => setModalVisible(true)} disabled={loading}>
          <Ionicons name="add-circle" size={28} color={COLORS.gold} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.gold} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={entries}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="book-outline" size={22} color={COLORS.gray} />
              <Text style={styles.empty}>Aucune meditation enregistree</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.cardShell}
              onPress={() => setOpenedEntry(item)}
            >
              <View style={styles.card}>
                <View style={styles.cardAccent} />
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      deleteEntry(item.id);
                    }}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.gray} />
                  </Pressable>
                </View>

                <Text style={styles.cardTitle}>{item.title || "Meditation"}</Text>
                <Text style={styles.cardContent}>{item.content}</Text>
                {item.reference && (
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      openReference(item.reference);
                    }}
                    style={styles.referencePill}
                  >
                    <Ionicons name="bookmarks-outline" size={14} color={COLORS.gold} />
                    <Text style={styles.cardRef}>{item.reference}</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!openedEntry} animationType="slide" transparent>
        <View style={styles.detailOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>
                {editingEntry ? "Modifier la note" : openedEntry?.title || "Meditation"}
              </Text>
              <Pressable
                onPress={() => {
                  cancelEditingOpenedEntry();
                  setOpenedEntry(null);
                }}
                style={styles.deleteBtn}
              >
                <Ionicons name="close" size={18} color={COLORS.gray} />
              </Pressable>
            </View>
            <Text style={styles.detailDate}>
              {openedEntry ? new Date(openedEntry.date).toLocaleDateString() : ""}
            </Text>
            {editingEntry ? (
              <View style={styles.editForm}>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Titre"
                  style={styles.editInput}
                />
                <TextInput
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Contenu de la meditation"
                  multiline
                  style={[styles.editInput, styles.editContentInput]}
                />
                <TextInput
                  value={editReference}
                  onChangeText={setEditReference}
                  placeholder="Reference biblique"
                  style={styles.editInput}
                />
              </View>
            ) : (
              <Text style={styles.detailContent}>{openedEntry?.content || ""}</Text>
            )}
            {!editingEntry && openedEntry?.reference && (
              <Pressable
                style={styles.referencePill}
                onPress={() => openReference(openedEntry.reference)}
              >
                <Ionicons name="bookmarks-outline" size={14} color={COLORS.gold} />
                <Text style={styles.cardRef}>{openedEntry.reference}</Text>
              </Pressable>
            )}
            <View style={styles.detailActionsRow}>
              {editingEntry ? (
                <>
                  <Pressable style={styles.detailSecondaryBtn} onPress={cancelEditingOpenedEntry}>
                    <Text style={styles.detailSecondaryText}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.detailPrimaryBtn, savingEdit && styles.saveBtnDisabled]}
                    onPress={saveOpenedEntryEdits}
                    disabled={savingEdit}
                  >
                    <Text style={styles.detailPrimaryText}>
                      {savingEdit ? "Enregistrement..." : "Enregistrer"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.detailPrimaryBtn} onPress={startEditingOpenedEntry}>
                  <Text style={styles.detailPrimaryText}>Modifier le contenu</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouvelle meditation</Text>

            <TextInput
              placeholder="Titre (optionnel)"
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              placeholder="Ecrivez votre meditation..."
              multiline
              style={[styles.input, { minHeight: 120 }]}
              value={content}
              onChangeText={setContent}
            />

            <TextInput
              placeholder="Reference biblique (ex: Jean 3:16)"
              style={styles.input}
              value={reference}
              onChangeText={setReference}
            />

            <Text style={styles.sectionLabel}>Referencer un verset</Text>
            <View style={styles.pickerWrap}>
              <Text style={styles.pickerLabel}>Livre</Text>
              <Picker
                selectedValue={selectedBook}
                onValueChange={(value) => setSelectedBook(String(value))}
                style={styles.picker}
              >
                {availableBooks.map((book) => (
                  <Picker.Item key={book} label={book} value={book} />
                ))}
              </Picker>
            </View>
            <View style={styles.verseRow}>
              <View style={[styles.pickerWrap, styles.pickerHalf]}>
                <Text style={styles.pickerLabel}>Chapitre</Text>
                <Picker
                  selectedValue={selectedChapter}
                  onValueChange={(value) => setSelectedChapter(String(value))}
                  style={styles.picker}
                >
                  {availableChapters.map((chapter) => (
                    <Picker.Item key={chapter} label={chapter} value={chapter} />
                  ))}
                </Picker>
              </View>
              <View style={[styles.pickerWrap, styles.pickerHalf]}>
                <Text style={styles.pickerLabel}>Verset</Text>
                <Picker
                  selectedValue={selectedVerse}
                  onValueChange={(value) => setSelectedVerse(String(value))}
                  style={styles.picker}
                >
                  {availableVerses.map((verse) => (
                    <Picker.Item key={verse} label={verse} value={verse} />
                  ))}
                </Picker>
              </View>
            </View>
            <Pressable style={styles.verseApplyBtn} onPress={applyVerseReference}>
              <Text style={styles.verseApplyText}>Utiliser ce verset</Text>
            </Pressable>

            <View style={styles.modalBtns}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.cancel}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={saveEntry}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? "Enregistrement..." : "Enregistrer"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyCard: {
    marginTop: 28,
    paddingVertical: 26,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  cardShell: {
    borderRadius: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    minHeight: 120,
  },
  cardAccent: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 6,
    height: 28,
    borderRadius: 99,
    backgroundColor: COLORS.gold,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 14,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: "600",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
    paddingLeft: 14,
  },
  cardContent: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.primary,
    paddingLeft: 14,
  },
  referencePill: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 14,
  },
  cardRef: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  detailModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  detailTitle: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "800",
    paddingRight: 10,
  },
  detailDate: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  detailContent: {
    color: COLORS.primary,
    fontSize: 16,
    lineHeight: 25,
  },
  editForm: {
    gap: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.primary,
    backgroundColor: "#F8FAFC",
  },
  editContentInput: {
    minHeight: 140,
    textAlignVertical: "top",
  },
  detailActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  detailSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  detailSecondaryText: {
    color: COLORS.gray,
    fontWeight: "700",
    fontSize: 14,
  },
  detailPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  detailPrimaryText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  verseRow: {
    flexDirection: "row",
    gap: 8,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  pickerHalf: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  picker: {
    height: 54,
  },
  verseApplyBtn: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  verseApplyText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
  },
  cancel: {
    color: COLORS.gray,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
