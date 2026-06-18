import { BIBLE, getVerses } from "@/src/constants/bible";
import { COLORS } from "@/src/constants/colors";
import {
  type AdminPrayerRecord,
  type AdminPrayerStatus,
  deleteAdminPrayer,
  getAdminPrayers,
  saveAdminPrayer,
} from "@/src/services/adminPrayerSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');
const BOOK_NAMES = Object.keys(BIBLE);

type VerseSuggestion = {
  label: string;
  value: string;
  verseText: string;
};

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseVerseReference(reference: string) {
  const clean = reference.trim();
  // Support single verse (4:6) and range (4:6-7)
  const match = clean.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, rawBook, rawChapter, startVerse, endVerse] = match;
  const matchedBook = BOOK_NAMES.find(
    (book) => normalizeSearch(book) === normalizeSearch(rawBook.trim())
  );

  if (!matchedBook) return null;

  return {
    bookId: matchedBook,
    chapter: rawChapter,
    start: parseInt(startVerse),
    end: endVerse ? parseInt(endVerse) : parseInt(startVerse),
  };
}

export default function AdminPrayerMessagePage() {
  const router = useRouter();
  const [prayerId, setPrayerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [verseReference, setVerseReference] = useState("");
  const [verseText, setVerseText] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<AdminPrayerStatus>("draft");
  const [prayers, setPrayers] = useState<AdminPrayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVerseSuggestions, setShowVerseSuggestions] = useState(false);

  const verseSuggestions = useMemo<VerseSuggestion[]>(() => {
    const input = verseReference.trim();
    if (!input) return [];

    const parsedPrefix = input.match(/^(.+?)\s+(\d+):?$/);
    if (parsedPrefix) {
      const [, rawBook, rawChapter] = parsedPrefix;
      const matchedBook = BOOK_NAMES.find(
        (book) => normalizeSearch(book) === normalizeSearch(rawBook.trim())
      );

      if (matchedBook) {
        const verses = Object.keys(getVerses(matchedBook, rawChapter));
        return verses.slice(0, 12).map((verse) => ({
          label: `${matchedBook} ${rawChapter}:${verse}`,
          value: `${matchedBook} ${rawChapter}:${verse}`,
          verseText: getVerses(matchedBook, rawChapter)[verse] ?? "",
        }));
      }
    }

    const normalizedInput = normalizeSearch(input);
    return BOOK_NAMES.filter((book) => normalizeSearch(book).includes(normalizedInput))
      .slice(0, 8)
      .map((book) => ({
        label: book,
        value: `${book} 1:`,
        verseText: "",
      }));
  }, [verseReference]);

  useEffect(() => {
    const parsed = parseVerseReference(verseReference);
    if (!parsed) return;

    const versesMap = getVerses(parsed.bookId, parsed.chapter);
    let combinedText = "";
    
    for (let i = parsed.start; i <= parsed.end; i++) {
      const txt = versesMap[i.toString()];
      if (txt) {
        combinedText += (combinedText ? " " : "") + txt;
      }
    }

    if (combinedText && combinedText !== verseText) {
      setVerseText(combinedText);
      setShowVerseSuggestions(false);
    }
  }, [verseReference, verseText]);

  useEffect(() => { loadPage(); }, []);

  async function loadPage() {
    try {
      const list = await getAdminPrayers();
      setPrayers(list);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Impossible de charger les prières.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setPrayerId(null); setTitle(""); setVerseReference("");
    setVerseText(""); setContent(""); setStatus("draft");
    setShowVerseSuggestions(false);
  }

  function hydrateForm(record: AdminPrayerRecord) {
    setPrayerId(record.id); setTitle(record.title);
    setVerseReference(record.verseReference); setVerseText(record.verseText);
    setContent(record.content); setStatus(record.status);
    setShowVerseSuggestions(false);
  }

  function formatDate(value: string | null) {
    if (!value) return "Date inconnue";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date inconnue";
    return parsed.toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  async function handleDelete(record: AdminPrayerRecord) {
    if (!record.id) return Alert.alert("Erreur", "Identifiant invalide.");
    Alert.alert("Supprimer cette prière", "La prière sera retirée de la liste. Continuer ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try {
          await deleteAdminPrayer(record.id!);
          if (prayerId === record.id) resetForm();
          await loadPage();
        } catch (error: any) {
          Alert.alert("Échec", error?.message ?? "La suppression a échoué.");
        }
      }}
    ]);
  }

  async function handleSave(nextStatus: AdminPrayerStatus) {
    const cleanTitle = title.trim();
    const cleanRef = verseReference.trim();
    const cleanText = verseText.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanRef || !cleanText || !cleanContent) {
      return Alert.alert("Champs requis", "Renseignez le titre, la référence, le texte et le contenu.");
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session introuvable.");

      await saveAdminPrayer({
        id: prayerId, userId: user.id, title: cleanTitle, content: cleanContent,
        verseReference: cleanRef, verseText: cleanText,
        bookId: "", chapter: 0, verseNumber: 0, status: nextStatus,
      });

      resetForm(); await loadPage();
      Alert.alert(nextStatus === "published" ? "Prière publiée" : "Brouillon enregistré");
    } catch (error: any) {
      Alert.alert("Erreur", error?.message ?? "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER ROYAL D'OR */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.blueDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>PRIÈRE DE L’ADMINISTRATEUR</Text>
            <View style={styles.goldLine} />
          </View>
          <TouchableOpacity onPress={resetForm} style={styles.addSealBtn}>
            <LinearGradient colors={[COLORS.gold, '#F9E79F']} style={styles.addSealGrad}>
              <MaterialCommunityIcons name="plus-thick" size={28} color={COLORS.blueDark} />
            </LinearGradient>
            <View style={styles.sealRing} />
          </TouchableOpacity>
        </View>

        {/* INTRO TEXT */}
        <View style={styles.introBox}>
           <Text style={styles.introSubtitle}>Ecrivez et publiez vos prières dans une interface claire, simple et confortable.</Text>
        </View>

        {/* CONSOLE DE RÉDACTION DUAL-TONE */}
        <View style={styles.formArea}>
          <View style={[styles.formCard, { borderColor: prayerId ? COLORS.gold : COLORS.blueDark }]}>
             <View style={[styles.formCardHeader, { backgroundColor: prayerId ? COLORS.gold : COLORS.blueDark }]}>
                <Text style={[styles.formCardHeaderText, { color: prayerId ? COLORS.blueDark : '#FFF' }]}>
                  {prayerId ? "MODIFIER UNE PRIERE" : "NOUVELLE PRIERE"}
                </Text>
             </View>
             
             <View style={styles.formBody}>
                <Text style={styles.panelSubtitle}>
                   {prayerId ? "Vous etes en train de modifier une priere existante." : "Ajoutez une nouvelle priere sans remplacer les anciennes."}
                </Text>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="pencil-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Titre</Text>
                   </View>
                   <TextInput
                     value={title} onChangeText={setTitle}
                     placeholder="Ex: Priere pour la paix du coeur" placeholderTextColor="#94A3B8"
                     style={styles.sacredInput}
                   />
                </View>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="book-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Référence du verset (ex: 4:6-7)</Text>
                   </View>
                   <View style={styles.verseInputBox}>
                     <TextInput
                       value={verseReference} 
                       onChangeText={(val) => { setVerseReference(val); setShowVerseSuggestions(val.length > 0); }}
                       placeholder="Ex: Philippiens 4:6-7" placeholderTextColor="#94A3B8"
                       style={styles.sacredInput}
                     />
                     <Ionicons name="search" size={18} color={COLORS.gold} style={styles.verseSearchIcon} />
                   </View>
                </View>

                {showVerseSuggestions && verseSuggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {verseSuggestions.map((s) => (
                      <TouchableOpacity key={s.label} style={styles.suggestionItem} onPress={() => {
                        setVerseReference(s.value);
                        if (s.verseText) setVerseText(s.verseText);
                        setShowVerseSuggestions(false);
                      }}>
                        <MaterialCommunityIcons name="book-open-variant" size={16} color={COLORS.gold} />
                        <Text style={styles.suggestionLabel}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="text-box-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Texte du verset</Text>
                   </View>
                   <TextInput
                     value={verseText} onChangeText={setVerseText}
                     placeholder="Le texte s'affichera automatiquement ici..." placeholderTextColor="#94A3B8"
                     style={[styles.sacredInput, styles.verseArea]} multiline
                   />
                </View>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="hands-pray" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Contenu de la prière</Text>
                   </View>
                   <TextInput
                     value={content} onChangeText={setContent}
                     placeholder="Redigez ici la priere de l'administrateur" placeholderTextColor="#94A3B8"
                     style={[styles.sacredInput, styles.prayerArea]} multiline
                   />
                </View>

                <View style={styles.formFooter}>
                   <TouchableOpacity style={styles.btnDraft} onPress={() => handleSave("draft")} disabled={saving}>
                      <Text style={styles.btnDraftText}>ENREGISTRER BROUILLON</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.btnPublish} onPress={() => handleSave("published")} disabled={saving}>
                      <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.btnPublishGrad}>
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPublishText}>PUBLIER LA PRIÈRE</Text>}
                      </LinearGradient>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        </View>

        {/* BIBLIOTHÈQUE DES PRIÈRES */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <View style={styles.libraryHeaderText}>
               <Text style={styles.libraryTitle}>Bibliothèque des prières</Text>
               <Text style={styles.librarySubtitle}>Toutes les prieres enregistrees avec leur verset de reference.</Text>
            </View>
            <View style={styles.countBadge}>
               <Text style={styles.countText}>{prayers.length}</Text>
            </View>
          </View>

          {prayers.length === 0 ? (
            <Text style={styles.empty}>Aucune prière enregistrée pour le moment.</Text>
          ) : (
            <View style={styles.list}>
              {prayers.map((item) => (
                <Swipeable
                  key={item.id}
                  overshootRight={false}
                  renderRightActions={() => (
                    <Pressable style={styles.deleteSwipeBtn} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={24} color="#FFF" />
                      <Text style={styles.deleteSwipeText}>Supprimer</Text>
                    </Pressable>
                  )}
                >
                  <TouchableOpacity 
                    style={[styles.listItem, { borderColor: item.id === prayerId ? COLORS.gold : '#F1F5F9' }]}
                    onPress={() => hydrateForm(item)}
                  >
                    <View style={styles.leftBar} />
                    
                    <View style={styles.itemIconBox}>
                       <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.itemIconGrad}>
                          <Ionicons name="sparkles" size={26} color={COLORS.gold} />
                       </LinearGradient>
                    </View>

                    <View style={styles.itemContent}>
                       <Text style={styles.itemTitleText} numberOfLines={1}>{item.title}</Text>
                       <View style={styles.itemMeta}>
                          <View style={[styles.statusBadge, { backgroundColor: item.status === 'published' ? '#10B981' : '#94A3B8' }]}>
                             <Text style={styles.statusLabel}>{item.status === 'published' ? 'Publié' : 'Brouillon'}</Text>
                          </View>
                          <Text style={styles.verseRefLabel}>{item.verseReference}</Text>
                       </View>
                       {item.verseText ? (
                         <Text style={styles.itemVerseText} numberOfLines={2}>« {item.verseText} »</Text>
                       ) : null}
                       <Text style={styles.itemDate}>{formatDate(item.updatedAt)}</Text>
                    </View>

                    <View style={styles.itemActions}>
                       <TouchableOpacity onPress={() => hydrateForm(item)} style={styles.miniBtn}>
                          <Ionicons name="create-outline" size={16} color={COLORS.blueDark} />
                       </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 60 },

  header: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginTop: 10,
  },
  backBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 3 },
  goldLine: { width: 25, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginTop: 4 },
  addSealBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  addSealGrad: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sealRing: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.4)', zIndex: 1 },

  introBox: { paddingHorizontal: 25, marginTop: 10, marginBottom: 15 },
  introSubtitle: { fontSize: 13, color: '#5D6475', lineHeight: 20, textAlign: 'center' },

  formArea: { paddingHorizontal: 20 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 32, borderWidth: 2, overflow: 'hidden' },
  formCardHeader: { height: 45, alignItems: 'center', justifyContent: 'center' },
  formCardHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  formBody: { padding: 22 },
  panelSubtitle: { color: "#5D6475", fontSize: 13, lineHeight: 18, marginBottom: 20, textAlign: 'center' },
  
  fieldBlock: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { color: "#162033", fontSize: 12, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 },
  sacredInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    height: 56,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.blueDark,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  verseInputBox: { position: 'relative' },
  verseSearchIcon: { position: 'absolute', right: 18, top: 18 },
  suggestionsBox: { backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1.5, borderColor: '#F1F5F9', marginBottom: 16, padding: 10 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  suggestionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.blueDark },
  verseArea: { height: 85, paddingTop: 18, textAlignVertical: 'top' },
  prayerArea: { height: 160, paddingTop: 18, textAlignVertical: 'top' },

  formFooter: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnDraft: { flex: 1, height: 62, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  btnDraftText: { fontSize: 10, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 1.2 },
  btnPublish: { flex: 1.8, height: 62, borderRadius: 20, overflow: 'hidden' },
  btnPublishGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnPublishText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.2 },

  librarySection: { marginTop: 55, paddingHorizontal: 20 },
  libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  libraryHeaderText: { flex: 1 },
  libraryTitle: { fontSize: 16, fontWeight: '900', color: COLORS.blueDark },
  librarySubtitle: { fontSize: 12, color: '#5D6475', marginTop: 2 },
  countBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '900', color: COLORS.blueDark },

  list: { gap: 16 },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  leftBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: COLORS.gold },
  itemIconBox: { width: 58, height: 58, borderRadius: 18, overflow: 'hidden' },
  itemIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, marginLeft: 15 },
  itemTitleText: { fontSize: 15, fontWeight: '900', color: COLORS.blueDark, marginBottom: 5 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  itemVerseText: { fontSize: 12, color: '#5D6475', fontStyle: 'italic', lineHeight: 18, marginBottom: 6 },
  itemDate: { fontSize: 10, color: '#94A3B8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  verseRefLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray },
  itemActions: { flexDirection: 'row', gap: 10 },
  miniBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  deleteSwipeBtn: { backgroundColor: '#EF4444', width: 100, borderRadius: 24, marginLeft: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteSwipeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  empty: { textAlign: 'center', color: COLORS.gray, fontStyle: 'italic', marginTop: 20 }
});
