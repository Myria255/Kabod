import { COLORS } from "@/src/constants/colors";
import {
  deleteDailyPrayerTopic,
  getDailyPrayerTopics,
  type DailyPrayerTopicRecord,
  type DailyPrayerTopicStatus,
  saveDailyPrayerTopic,
} from "@/src/services/dailyPrayerTopicSupabase";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
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
  TouchableOpacity,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function DailyPrayerTopicAdminPage() {
  const router = useRouter();
  const [topicId, setTopicId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [message, setMessage] = useState("");
  const [topicDate, setTopicDate] = useState(getTodayDateValue());
  const [topics, setTopics] = useState<DailyPrayerTopicRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPage(); }, []);

  async function loadPage() {
    try {
      const list = await getDailyPrayerTopics();
      setTopics(list);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Erreur technique.");
    }
  }

  function resetForm() {
    setTopicId(null); setTitle(""); setTheme("");
    setMessage(""); setTopicDate(getTodayDateValue());
  }

  function hydrateForm(record: DailyPrayerTopicRecord) {
    setTopicId(record.id); setTitle(record.title);
    setTheme(record.theme); setMessage(record.message);
    setTopicDate(record.topicDate ?? getTodayDateValue());
  }

  async function handleSave(nextStatus: DailyPrayerTopicStatus) {
    const cleanTitle = title.trim();
    const cleanTheme = theme.trim();
    const cleanMessage = message.trim();
    const cleanDate = topicDate.trim();

    if (!cleanTitle || !cleanTheme || !cleanMessage || !cleanDate) {
      return Alert.alert("Champs requis", "Renseignez le titre, le thème, le message et la date.");
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session introuvable.");

      await saveDailyPrayerTopic({
        id: topicId, userId: user.id, title: cleanTitle,
        theme: cleanTheme, message: cleanMessage,
        topicDate: cleanDate, status: nextStatus,
      });

      resetForm(); await loadPage();
      Alert.alert(nextStatus === "published" ? "Sujet publié" : "Brouillon enregistré");
    } catch (error: any) {
      Alert.alert("Erreur", error?.message ?? "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: DailyPrayerTopicRecord) {
    if (!record.id) return Alert.alert("Erreur", "Identifiant invalide.");
    Alert.alert("Supprimer ce sujet", "Le sujet sera retiré de la liste. Continuer ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try {
          await deleteDailyPrayerTopic(record.id!);
          if (topicId === record.id) resetForm();
          await loadPage();
        } catch (error: any) {
          Alert.alert("Échec", error?.message ?? "Erreur de suppression.");
        }
      }}
    ]);
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
            <Text style={styles.headerTitle}>SUJET JOURNALIER</Text>
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
           <Text style={styles.introSubtitle}>Préparez et publiez le sujet de prière du jour pour toute la communauté.</Text>
        </View>

        {/* CONSOLE DE RÉDACTION DUAL-TONE */}
        <View style={styles.formArea}>
          <View style={[styles.formCard, { borderColor: topicId ? COLORS.gold : COLORS.blueDark }]}>
             <View style={[styles.formCardHeader, { backgroundColor: topicId ? COLORS.gold : COLORS.blueDark }]}>
                <Text style={[styles.formCardHeaderText, { color: topicId ? COLORS.blueDark : '#FFF' }]}>
                  {topicId ? "MODIFIER LE SUJET" : "NOUVEAU SUJET DU JOUR"}
                </Text>
             </View>
             
             <View style={styles.formBody}>
                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="format-title" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Titre du sujet</Text>
                   </View>
                   <TextInput
                     value={title} onChangeText={setTitle}
                     placeholder="Ex: Prier pour la paix des familles" placeholderTextColor="#94A3B8"
                     style={styles.sacredInput}
                   />
                </View>

                <View style={styles.compactRow}>
                   <View style={[styles.fieldBlock, { flex: 1.2 }]}>
                      <View style={styles.labelRow}>
                         <MaterialCommunityIcons name="tag-outline" size={14} color={COLORS.gold} />
                         <Text style={styles.label}>Thème</Text>
                      </View>
                      <TextInput
                        value={theme} onChangeText={setTheme}
                        placeholder="Ex: Paix, Guérison..." placeholderTextColor="#94A3B8"
                        style={styles.sacredInput}
                      />
                   </View>
                   <View style={[styles.fieldBlock, { flex: 1 }]}>
                      <View style={styles.labelRow}>
                         <MaterialCommunityIcons name="calendar-outline" size={14} color={COLORS.gold} />
                         <Text style={styles.label}>Date</Text>
                      </View>
                      <TextInput
                        value={topicDate} onChangeText={setTopicDate}
                        placeholder="AAAA-MM-JJ" placeholderTextColor="#94A3B8"
                        style={styles.sacredInput}
                      />
                   </View>
                </View>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="script-text-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Orientation du jour</Text>
                   </View>
                   <TextInput
                     value={message} onChangeText={setMessage}
                     placeholder="Développez ici le fil conducteur de la prière..." placeholderTextColor="#94A3B8"
                     style={[styles.sacredInput, styles.messageArea]} multiline
                   />
                </View>

                <View style={styles.formFooter}>
                   <TouchableOpacity style={styles.btnDraft} onPress={() => handleSave("draft")} disabled={saving}>
                      <Text style={styles.btnDraftText}>ENREGISTRER BROUILLON</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.btnPublish} onPress={() => handleSave("published")} disabled={saving}>
                      <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.btnPublishGrad}>
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPublishText}>PUBLIER LE SUJET</Text>}
                      </LinearGradient>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        </View>

        {/* HISTORIQUE RÉCENT (PREMIUM LIST) */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <View style={styles.libraryHeaderText}>
               <Text style={styles.libraryTitle}>Historique des sujets</Text>
               <Text style={styles.librarySubtitle}>Retrouvez et gérez vos précédentes publications.</Text>
            </View>
            <View style={styles.countBadge}>
               <Text style={styles.countText}>{topics.length}</Text>
            </View>
          </View>

          {topics.length === 0 ? (
            <Text style={styles.empty}>Aucun sujet enregistré pour le moment.</Text>
          ) : (
            <View style={styles.list}>
              {topics.map((item) => (
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
                    style={[styles.listItem, { borderColor: item.id === topicId ? COLORS.gold : '#F1F5F9' }]}
                    onPress={() => hydrateForm(item)}
                  >
                    <View style={styles.leftBar} />
                    
                    <View style={styles.itemIconBox}>
                       <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.itemIconGrad}>
                          <MaterialCommunityIcons name="weather-sunny" size={26} color={COLORS.gold} />
                       </LinearGradient>
                    </View>

                    <View style={styles.itemContent}>
                       <Text style={styles.itemTitleText} numberOfLines={1}>{item.title}</Text>
                       <View style={styles.itemMeta}>
                          <View style={[styles.statusBadge, { backgroundColor: item.status === 'published' ? '#10B981' : '#94A3B8' }]}>
                             <Text style={styles.statusLabel}>{item.status === 'published' ? 'Publié' : 'Brouillon'}</Text>
                          </View>
                          <Text style={styles.themeLabel}>{item.theme}</Text>
                       </View>
                       <Text style={styles.itemDate}>{formatDate(item.topicDate)}</Text>
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
  compactRow: { flexDirection: 'row', gap: 12 },
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
  messageArea: { height: 160, paddingTop: 18, textAlignVertical: 'top' },

  formFooter: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnDraft: { flex: 1, height: 62, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  btnDraftText: { fontSize: 10, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 1.2, textAlign: 'center' },
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
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  itemDate: { fontSize: 10, color: '#94A3B8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  themeLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gold, textTransform: 'uppercase' },
  itemActions: { flexDirection: 'row', gap: 10 },
  miniBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  deleteSwipeBtn: { backgroundColor: '#EF4444', width: 100, borderRadius: 24, marginLeft: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteSwipeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  empty: { textAlign: 'center', color: COLORS.gray, fontStyle: 'italic', marginTop: 20 }
});
