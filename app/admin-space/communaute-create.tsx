import { COLORS } from "@/src/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunauteCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("account-group");
  const [status, setStatus] = useState<'active' | 'draft'>("active");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !description.trim()) {
      return Alert.alert("Champs requis", "Veuillez remplir tous les champs obligatoires.");
    }

    setSaving(true);
    // Simulation d'enregistrement
    setTimeout(() => {
      setSaving(false);
      Alert.alert("Succès", "La nouvelle communauté a été créée.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    }, 1500);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER ROYAL DÉDIÉ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.blueDark} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>NOUVELLE COMMUNAUTÉ</Text>
          <View style={styles.goldLine} />
        </View>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HERO ICON BOX */}
        <View style={styles.heroIconArea}>
          <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.heroIconCircle}>
            <MaterialCommunityIcons name={icon as any || "account-group"} size={44} color={COLORS.gold} />
          </LinearGradient>
          <Text style={styles.heroLabel}>APERÇU DE L'ICÔNE</Text>
          <View style={styles.decorRing} />
        </View>

        {/* CONSOLE DIVINE */}
        <View style={styles.consoleContainer}>
          <View style={styles.fieldCard}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons name="tag-multiple" size={16} color={COLORS.gold} />
              <Text style={styles.label}>IDENTITÉ DU GROUPE</Text>
            </View>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Nom de la communauté..." placeholderTextColor="#94A3B8"
              style={styles.premiumInput}
            />
          </View>

          <View style={styles.fieldCard}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color={COLORS.gold} />
              <Text style={styles.label}>MISSION & DESCRIPTION</Text>
            </View>
            <TextInput
              value={description} onChangeText={setDescription}
              placeholder="Décrivez l'objectif de ce groupe..." placeholderTextColor="#94A3B8"
              style={[styles.premiumInput, styles.textArea]} multiline
            />
          </View>

          <View style={styles.fieldCard}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons name="emoticon-happy" size={16} color={COLORS.gold} />
              <Text style={styles.label}>ICÔNE DE NAVIGATION</Text>
            </View>
            <TextInput
              value={icon} onChangeText={setIcon}
              placeholder="Nom d'icône (ex: heart, star, account-group)..." placeholderTextColor="#94A3B8"
              style={styles.premiumInput} autoCapitalize="none"
            />
            <Text style={styles.inputHint}>Utilisez les noms standards MaterialCommunityIcons.</Text>
          </View>

          {/* VISIBILITY SELECTOR */}
          <View style={styles.statusSection}>
            <Text style={styles.label}>DISPONIBILITÉ IMMÉDIATE</Text>
            <View style={styles.statusGrid}>
              <TouchableOpacity
                style={[styles.statusBox, status === 'active' && styles.statusBoxActive]}
                onPress={() => setStatus('active')}
              >
                <Ionicons name="eye-outline" size={18} color={status === 'active' ? '#FFF' : COLORS.blueDark} />
                <Text style={[styles.statusText, status === 'active' && styles.statusTextActive]}>PUBLIQUE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusBox, status === 'draft' && styles.statusBoxActive]}
                onPress={() => setStatus('draft')}
              >
                <Ionicons name="eye-off-outline" size={18} color={status === 'draft' ? '#FFF' : COLORS.blueDark} />
                <Text style={[styles.statusText, status === 'draft' && styles.statusTextActive]}>BROUILLON</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ACTION BUTTON */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={[COLORS.gold, '#F9E79F']} style={styles.submitGrad}>
              {saving ? (
                <ActivityIndicator color={COLORS.blueDark} />
              ) : (
                <>
                  <Text style={styles.submitText}>CRÉER LA COMMUNAUTÉ</Text>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.blueDark} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 60 },
  header: { height: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, marginTop: 10 },
  backBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { fontSize: 12, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 2 },
  goldLine: { width: 25, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginTop: 4 },
  heroIconArea: { alignItems: 'center', marginTop: 20, marginBottom: 30, position: 'relative' },
  heroIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  heroLabel: { fontSize: 9, fontWeight: '900', color: COLORS.gold, letterSpacing: 2, marginTop: 12 },
  decorRing: { position: 'absolute', top: -10, width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)', zIndex: 1 },
  consoleContainer: { paddingHorizontal: 20, gap: 20 },
  fieldCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 2, borderColor: '#F1F5F9', padding: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 1 },
  premiumInput: { fontSize: 16, fontWeight: '700', color: COLORS.blueDark, backgroundColor: '#F8FAFC', borderRadius: 16, height: 56, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#F1F5F9' },
  textArea: { height: 110, paddingTop: 16, textAlignVertical: 'top' },
  inputHint: { fontSize: 10, color: '#94A3B8', marginTop: 8, marginLeft: 4 },
  statusSection: { marginTop: 10 },
  statusGrid: { flexDirection: 'row', gap: 15, marginTop: 15 },
  statusBox: { flex: 1, height: 70, borderRadius: 20, borderWidth: 2, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statusBoxActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  statusText: { fontSize: 10, fontWeight: '900', color: COLORS.blueDark },
  statusTextActive: { color: '#FFF' },
  submitBtn: { height: 74, borderRadius: 24, overflow: 'hidden', marginTop: 20 },
  submitGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  submitText: { fontSize: 12, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 1.5 },
});
