import { COLORS } from "@/src/constants/colors";
import {
  type LocalAudioSelection,
  type PrayerPodcastRecord,
  type PrayerPodcastSourceType,
  type PrayerPodcastStatus,
  deletePrayerPodcast,
  getLatestPrayerPodcast,
  getPrayerPodcasts,
  savePrayerPodcastRecord,
  uploadPrayerPodcastAudio,
} from "@/src/services/prayerPodcastSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminPrayerPodcastPage() {
  const router = useRouter();
  const [podcastId, setPodcastId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<PrayerPodcastSourceType>("upload");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<LocalAudioSelection | null>(null);
  const [existingAudioName, setExistingAudioName] = useState<string>("");
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [existingAudioPath, setExistingAudioPath] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<PrayerPodcastRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPage(); }, []);

  async function loadPage() {
    try {
      const [, list] = await Promise.all([getLatestPrayerPodcast(), getPrayerPodcasts()]);
      setPodcasts(list);
    } catch { Alert.alert("Erreur", "Chargement échoué."); }
  }

  function resetForm() {
    setPodcastId(null); setTitle(""); setDescription(""); setSourceType("upload");
    setExternalUrl(""); setSelectedAudio(null); setExistingAudioName("");
    setExistingAudioUrl(null); setExistingAudioPath(null);
  }

  function hydrateForm(record: PrayerPodcastRecord) {
    setPodcastId(record.id); setTitle(record.title); setDescription(record.description);
    setSourceType(record.sourceType); setExternalUrl(record.externalUrl ?? "");
    setExistingAudioUrl(record.audioUrl); setExistingAudioPath(record.audioPath);
    setExistingAudioName(record.audioPath ? record.audioPath.split("/").pop() ?? "" : "");
  }

  async function pickAudio() {
    const res = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true, multiple: false });
    if (!res.canceled) {
      const asset = res.assets[0];
      setSelectedAudio({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    }
  }

  async function openPodcast(record: PrayerPodcastRecord) {
    const url = record.sourceType === "external" ? record.externalUrl : record.audioUrl;
    if (url && await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Erreur", "Source introuvable.");
  }

  async function handleDelete(record: PrayerPodcastRecord) {
    Alert.alert("Confirmer", "Supprimer ce contenu ?", [
      { text: "Non", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try {
          await deletePrayerPodcast(record);
          if (podcastId === record.id) resetForm();
          await loadPage();
        } catch { Alert.alert("Erreur", "La suppression a échoué."); }
      }}
    ]);
  }

  async function handleSave(nextStatus: PrayerPodcastStatus) {
    if (!title.trim() || !description.trim()) return Alert.alert("Champs requis", "Remplissez le titre et la description.");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      let audioUrl = existingAudioUrl; let audioPath = existingAudioPath;
      if (sourceType === "upload" && selectedAudio) {
        const up = await uploadPrayerPodcastAudio(user.id, selectedAudio);
        audioUrl = up.audioUrl; audioPath = up.audioPath;
      }

      await savePrayerPodcastRecord({
        id: podcastId, userId: user.id, title: title.trim(), description: description.trim(),
        status: nextStatus, sourceType, externalUrl: sourceType === "external" ? externalUrl.trim() : null,
        audioUrl: sourceType === "upload" ? audioUrl : null, audioPath: sourceType === "upload" ? audioPath : null,
      });

      resetForm(); await loadPage();
      Alert.alert(nextStatus === "published" ? "Publié" : "Brouillon sauvegardé");
    } catch { Alert.alert("Erreur", "Échec enregistrement."); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ROYAL HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.blueDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>PODCASTS</Text>
            <View style={styles.goldLine} />
          </View>
          
          {/* NOUVELLE ICÔNE AJOUTER : LE SCEAU D'OR ROYAL */}
          <TouchableOpacity onPress={resetForm} style={styles.addSealBtn}>
            <LinearGradient colors={[COLORS.gold, '#F9E79F']} style={styles.addSealGrad}>
              <MaterialCommunityIcons name="plus-thick" size={28} color={COLORS.blueDark} />
            </LinearGradient>
            <View style={styles.sealRing} />
          </TouchableOpacity>
        </View>

        {/* CONSOLE DE CRÉATION */}
        <View style={styles.formContainer}>
          <View style={[styles.formCard, { borderColor: podcastId ? COLORS.gold : COLORS.blueDark }]}>
            <View style={[styles.formHeader, { backgroundColor: podcastId ? COLORS.gold : COLORS.blueDark }]}>
               <Text style={[styles.formHeaderText, { color: podcastId ? COLORS.blueDark : '#FFF' }]}>
                 {podcastId ? "MODIFIER L'ÉDIFICATION" : "NOUVELLE ÉDIFICATION"}
               </Text>
            </View>
            
            <View style={styles.formBody}>
              <TextInput
                value={title} onChangeText={setTitle}
                placeholder="Titre du message..." placeholderTextColor="#94A3B8"
                style={styles.sacredInput}
              />
              <TextInput
                value={description} onChangeText={setDescription}
                placeholder="Description spirituelle..." placeholderTextColor="#94A3B8"
                style={[styles.sacredInput, styles.sacredArea]} multiline
              />

              <View style={styles.typeSelector}>
                <TouchableOpacity onPress={() => setSourceType("upload")} style={[styles.typeBtn, sourceType === "upload" && styles.typeBtnActive]}>
                  <Text style={[styles.typeLabel, sourceType === "upload" && styles.typeLabelActive]}>AUDIO</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSourceType("external")} style={[styles.typeBtn, sourceType === "external" && styles.typeBtnActive]}>
                  <Text style={[styles.typeLabel, sourceType === "external" && styles.typeLabelActive]}>LIEN</Text>
                </TouchableOpacity>
              </View>

              {sourceType === "upload" ? (
                <TouchableOpacity style={styles.uploadStrip} onPress={pickAudio}>
                  <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.uploadInner}>
                    <MaterialCommunityIcons name="cloud-upload" size={22} color={COLORS.gold} />
                    <Text style={styles.uploadText} numberOfLines={1}>{selectedAudio ? selectedAudio.name : (existingAudioName || "Sélectionner un audio")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.urlInputBox}>
                  <Ionicons name="link" size={18} color={COLORS.gold} />
                  <TextInput
                    value={externalUrl} onChangeText={setExternalUrl}
                    placeholder="Lien externe (YouTube...)" placeholderTextColor="#94A3B8"
                    style={styles.urlInput} autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.btnDraft} onPress={() => handleSave("draft")} disabled={saving}>
                  <Text style={styles.btnDraftText}>BROUILLON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPublish} onPress={() => handleSave("published")} disabled={saving}>
                  <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.btnPublishGrad}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPublishText}>PUBLIER MAINTENANT</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* MÉDIATHÈQUE - STYLE LISTE PREMIUM */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>VOTRE MÉDIATHÈQUE</Text>
            <View style={styles.line} />
          </View>

          {podcasts.length === 0 ? (
            <Text style={styles.empty}>Médiathèque vide.</Text>
          ) : (
            <View style={styles.list}>
              {podcasts.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.listItem, { borderColor: item.id === podcastId ? COLORS.gold : '#F1F5F9' }]}
                  onPress={() => hydrateForm(item)}
                >
                  <View style={styles.leftBar} />
                  
                  <View style={styles.itemIconBox}>
                     <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.itemIconGrad}>
                        <MaterialCommunityIcons 
                          name={item.sourceType === 'external' ? 'play-circle' : 'microphone'} 
                          size={28} color={COLORS.gold} 
                        />
                     </LinearGradient>
                  </View>

                  <View style={styles.itemContent}>
                     <Text style={styles.itemTitleText} numberOfLines={1}>{item.title}</Text>
                     <View style={styles.itemMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: item.status === 'published' ? '#10B981' : '#94A3B8' }]}>
                           <Text style={styles.statusLabel}>{item.status === 'published' ? 'PUBLIC' : 'BROUILLON'}</Text>
                        </View>
                        <Text style={styles.sourceTypeLabel}>{item.sourceType === 'upload' ? 'AUDIO' : 'VIDEO'}</Text>
                     </View>
                  </View>

                  <View style={styles.itemActions}>
                     <TouchableOpacity onPress={() => openPodcast(item)} style={styles.miniBtn}>
                        <Ionicons name="play" size={16} color={COLORS.blueDark} />
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => handleDelete(item)} style={styles.miniBtn}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                     </TouchableOpacity>
                  </View>
                </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 5 },
  goldLine: { width: 30, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginTop: 4 },
  
  // STYLE DE L'ICÔNE AJOUTER (SCEAU ROYAL)
  addSealBtn: { width: 50, height: 50, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  addSealGrad: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sealRing: { 
    position: 'absolute', 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 1.5, 
    borderColor: 'rgba(212, 175, 55, 0.4)', 
    zIndex: 1 
  },

  formContainer: { paddingHorizontal: 20, marginTop: 15 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 32, borderWidth: 2, overflow: 'hidden' },
  formHeader: { height: 45, alignItems: 'center', justifyContent: 'center' },
  formHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  formBody: { padding: 22 },
  sacredInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.blueDark,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  sacredArea: { height: 110, paddingTop: 20, textAlignVertical: 'top' },

  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, height: 48, borderRadius: 15, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  typeBtnActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  typeLabel: { fontSize: 11, fontWeight: '900', color: COLORS.gray, letterSpacing: 1 },
  typeLabelActive: { color: '#FFFFFF' },

  uploadStrip: { height: 62, borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', overflow: 'hidden', marginBottom: 16 },
  uploadInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  uploadText: { fontSize: 14, fontWeight: '800', color: COLORS.blueDark, maxWidth: '70%' },

  urlInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', paddingHorizontal: 18, marginBottom: 16 },
  urlInput: { flex: 1, height: 60, color: COLORS.blueDark, fontWeight: '700', marginLeft: 12 },

  formActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnDraft: { flex: 1, height: 62, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  btnDraftText: { fontSize: 11, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 1.5 },
  btnPublish: { flex: 1.8, height: 62, borderRadius: 20, overflow: 'hidden' },
  btnPublishGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnPublishText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },

  librarySection: { marginTop: 55, paddingHorizontal: 20 },
  libraryHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
  libraryTitle: { fontSize: 11, fontWeight: '900', color: COLORS.gray, letterSpacing: 2 },
  line: { flex: 1, height: 2, backgroundColor: '#F1F5F9' },

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
  itemIconBox: { width: 62, height: 62, borderRadius: 18, overflow: 'hidden' },
  itemIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, marginLeft: 15 },
  itemTitleText: { fontSize: 15, fontWeight: '900', color: COLORS.blueDark, marginBottom: 5 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  sourceTypeLabel: { fontSize: 10, fontWeight: '700', color: COLORS.gray },
  itemActions: { flexDirection: 'row', gap: 10 },
  miniBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  empty: { textAlign: 'center', color: COLORS.gray, fontStyle: 'italic', marginTop: 20 }
});
