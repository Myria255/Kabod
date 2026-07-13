import { COLORS } from "@/src/constants/colors";
import {
  deleteChurchEvent,
  getChurchEvents,
  saveChurchEvent,
  type ChurchEventRecord,
  type ChurchEventStatus,
} from "@/src/services/churchEventSupabase";
import { supabase } from "@/supabaseClient";
import { notifyUsersFromAdmin } from "@/src/services/pushNotifications";
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

export default function EventAdminPage() {
  const router = useRouter();
  const [eventId, setEventId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState(getDefaultDateTimeValue());
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [status, setStatus] = useState<ChurchEventStatus>("draft");
  const [items, setItems] = useState<ChurchEventRecord[]>([]);
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPage(); }, []);

  async function loadPage() {
    try {
      const list = await getChurchEvents();
      setItems(list);
    } catch (error: any) {
      Alert.alert("Chargement impossible", error?.message ?? "Erreur technique.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEventId(null); setTitle(""); setDescription("");
    setLocation(""); setEventDate(getDefaultDateTimeValue());
    setRegistrationUrl(""); setStatus("draft");
  }

  function hydrateForm(item: ChurchEventRecord) {
    setEventId(item.id); setTitle(item.title);
    setDescription(item.description); setLocation(item.location);
    setEventDate(item.eventDate ?? ""); setRegistrationUrl(item.registrationUrl ?? "");
    setStatus(item.status);
  }

  async function handleSave(nextStatus: ChurchEventStatus) {
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanLoc = location.trim();
    const cleanDate = eventDate.trim();
    const cleanRegUrl = registrationUrl.trim();

    if (!cleanTitle || !cleanDesc || !cleanLoc || !cleanDate) {
      return Alert.alert("Champs requis", "Titre, lieu, date et description obligatoires.");
    }

    if (!isValidUrl(cleanRegUrl)) {
      return Alert.alert("Lien invalide", "Vérifiez l'URL d'inscription.");
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session introuvable.");

      await saveChurchEvent({
        id: eventId, userId: user.id, title: cleanTitle,
        description: cleanDesc, location: cleanLoc,
        eventDate: cleanDate, registrationUrl: cleanRegUrl || null,
        status: nextStatus,
      });

      if (nextStatus === "published") {
        notifyUsersFromAdmin({
          title: "Nouvel événement Kabod",
          body: cleanTitle,
          targetScope: "all",
          data: { type: "event", route: "/communaute/evenements" },
        }).catch((error) => console.warn("Notification événement failed", error));
      }

      resetForm(); await loadPage();
      Alert.alert("Événement enregistré", "Le calendrier a été mis à jour.");
    } catch (error: any) {
      Alert.alert("Erreur", error?.message ?? "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ChurchEventRecord) {
    if (!item.id) return;
    Alert.alert("Supprimer cet événement", "L'événement sera retiré de la liste.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try {
          await deleteChurchEvent(item.id!);
          if (eventId === item.id) resetForm();
          await loadPage();
        } catch {
          Alert.alert("Échec", "La suppression a échoué.");
        }
      }}
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER ROYAL */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.blueDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>ÉVÉNEMENTS À VENIR</Text>
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
           <Text style={styles.introSubtitle}>Publiez les rencontres importantes et gérez le calendrier de la communauté.</Text>
        </View>

        {/* CONSOLE DE RÉDACTION DUAL-TONE */}
        <View style={styles.formArea}>
          <View style={[styles.formCard, { borderColor: eventId ? COLORS.gold : COLORS.blueDark }]}>
             <View style={[styles.formCardHeader, { backgroundColor: eventId ? COLORS.gold : COLORS.blueDark }]}>
                <Text style={[styles.formCardHeaderText, { color: eventId ? COLORS.blueDark : '#FFF' }]}>
                  {eventId ? "MODIFIER L'ÉVÉNEMENT" : "NOUVEL ÉVÉNEMENT"}
                </Text>
             </View>
             
             <View style={styles.formBody}>
                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="format-title" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Titre de l’événement</Text>
                   </View>
                   <TextInput
                     value={title} onChangeText={setTitle}
                     placeholder="Ex: Culte d'Action de Grâce" placeholderTextColor="#94A3B8"
                     style={styles.sacredInput}
                   />
                </View>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Lieu</Text>
                   </View>
                   <TextInput
                     value={location} onChangeText={setLocation}
                     placeholder="Ex: Temple Kabod, Paris" placeholderTextColor="#94A3B8"
                     style={styles.sacredInput}
                   />
                </View>

                <View style={styles.compactRow}>
                   <View style={[styles.fieldBlock, { flex: 1 }]}>
                      <View style={styles.labelRow}>
                         <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.gold} />
                         <Text style={styles.label}>Date & Heure</Text>
                      </View>
                      <TextInput
                        value={eventDate} onChangeText={setEventDate}
                        placeholder="AAAA-MM-JJ HH:MM" placeholderTextColor="#94A3B8"
                        style={styles.sacredInput}
                      />
                   </View>
                </View>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="link-variant" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Lien d’inscription (Optionnel)</Text>
                   </View>
                   <TextInput
                     value={registrationUrl} onChangeText={setRegistrationUrl}
                     placeholder="Lien Eventbrite, Google Form..." placeholderTextColor="#94A3B8"
                     style={styles.sacredInput} autoCapitalize="none"
                   />
                </View>

                <View style={styles.fieldBlock}>
                   <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="script-text-outline" size={14} color={COLORS.gold} />
                      <Text style={styles.label}>Description</Text>
                   </View>
                   <TextInput
                     value={description} onChangeText={setDescription}
                     placeholder="Détails de l'événement..." placeholderTextColor="#94A3B8"
                     style={[styles.sacredInput, styles.descArea]} multiline
                   />
                </View>

                {/* STATUS SELECTOR PREMIUM */}
                <View style={styles.statusSection}>
                   <Text style={styles.label}>VISIBILITÉ</Text>
                   <View style={styles.statusChipsGrid}>
                      {(["draft", "published"] as ChurchEventStatus[]).map((s) => (
                        <TouchableOpacity 
                          key={s} 
                          style={[styles.statusChip, status === s && styles.statusChipActive]}
                          onPress={() => setStatus(s)}
                        >
                           <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
                              {s === "published" ? "PUBLIÉ" : "BROUILLON"}
                           </Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>

                <View style={styles.formFooter}>
                   <TouchableOpacity style={styles.btnSecondary} onPress={() => handleSave("draft")} disabled={saving}>
                      <Text style={styles.btnSecondaryText}>BROUILLON</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.btnPrimary} onPress={() => handleSave("published")} disabled={saving}>
                      <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.btnPrimaryGrad}>
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>PUBLIER L’ÉVÉNEMENT</Text>}
                      </LinearGradient>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        </View>

        {/* CALENDRIER PUBLIÉ (PREMIUM LIST) */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <View style={styles.libraryHeaderText}>
               <Text style={styles.libraryTitle}>Calendrier des Événements</Text>
               <Text style={styles.librarySubtitle}>Gérez les prochaines rencontres de l’église.</Text>
            </View>
            <View style={styles.countBadge}>
               <Text style={styles.countText}>{items.length}</Text>
            </View>
          </View>

          {items.length === 0 ? (
            <Text style={styles.empty}>Aucun événement programmé pour le moment.</Text>
          ) : (
            <View style={styles.list}>
              {items.map((item) => (
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
                    style={[styles.listItem, { borderColor: item.id === eventId ? COLORS.gold : '#F1F5F9' }]}
                    onPress={() => hydrateForm(item)}
                  >
                    <View style={styles.leftBar} />
                    
                    <View style={styles.itemIconBox}>
                       <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.itemIconGrad}>
                          <MaterialCommunityIcons name="calendar-star" size={26} color={COLORS.gold} />
                       </LinearGradient>
                    </View>

                    <View style={styles.itemContent}>
                       <Text style={styles.itemTitleText} numberOfLines={1}>{item.title}</Text>
                       <View style={styles.itemMeta}>
                          <View style={[styles.statusBadge, { backgroundColor: item.status === 'published' ? '#10B981' : '#94A3B8' }]}>
                             <Text style={styles.statusLabel}>{item.status === 'published' ? 'PUBLIÉ' : 'BROUILLON'}</Text>
                          </View>
                          <Text style={styles.itemDateLabel}>{formatDate(item.eventDate)}</Text>
                       </View>
                       
                       <View style={styles.itemLocationBox}>
                          <MaterialCommunityIcons name="map-marker" size={12} color={COLORS.gold} />
                          <Text style={styles.itemLocationText} numberOfLines={1}>{item.location}</Text>
                       </View>
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
  descArea: { height: 100, paddingTop: 18, textAlignVertical: 'top' },

  statusSection: { marginTop: 10, marginBottom: 20 },
  statusChipsGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  statusChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: '#F1F5F9' },
  statusChipActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  statusChipText: { fontSize: 10, fontWeight: '900', color: COLORS.blueDark },
  statusChipTextActive: { color: '#FFF' },

  formFooter: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnSecondary: { flex: 1, height: 62, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontSize: 10, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 1.2 },
  btnPrimary: { flex: 1.8, height: 62, borderRadius: 20, overflow: 'hidden' },
  btnPrimaryGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.2 },

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
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  itemDateLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusLabel: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  
  itemLocationBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemLocationText: { fontSize: 11, fontWeight: '700', color: COLORS.gold },

  itemActions: { flexDirection: 'row', gap: 10 },
  miniBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  deleteSwipeBtn: { backgroundColor: '#EF4444', width: 100, borderRadius: 24, marginLeft: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteSwipeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  empty: { textAlign: 'center', color: COLORS.gray, fontStyle: 'italic', marginTop: 20 }
});
