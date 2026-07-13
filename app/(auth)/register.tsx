import { saveRegistrationDraft } from "@/src/services/registration";
import { signInWithGoogle } from "@/src/services/authOAuth";
import { getSupabaseErrorMessage } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RGPD_CONSENT_TEXT_VERSION = "2026-07-13-v1";

const COLORS = {
  white: "#FFFFFF",
  cream: "#FAF7EF",
  navy: "#0F172A",
  gold: "#D4AF37",
  goldSoft: "#F8EFCB",
  text: "#111827",
  muted: "#667085",
  border: "#E7E2D4",
  input: "#FFFCF6",
  red: "#D92D20",
  green: "#15803D",
};

type Option = { label: string; value: string };
type CountryApiRow = { country: string; cities?: string[] };

const GENDER_OPTIONS: Option[] = [
  { label: "Homme", value: "Homme" },
  { label: "Femme", value: "Femme" },
];

const SITUATION_OPTIONS: Option[] = [
  { label: "Célibataire", value: "Célibataire" },
  { label: "Marié(e)", value: "Marié(e)" },
];

const FALLBACK_COUNTRIES: Option[] = [
  { label: "Côte d’Ivoire", value: "Côte d’Ivoire" },
  { label: "France", value: "France" },
  { label: "Canada", value: "Canada" },
  { label: "Belgique", value: "Belgique" },
  { label: "Suisse", value: "Suisse" },
  { label: "RDC", value: "RDC" },
  { label: "Cameroun", value: "Cameroun" },
  { label: "Sénégal", value: "Sénégal" },
];

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { score: 0, label: "8 caractères minimum", color: COLORS.muted };
  if (score <= 1) return { score, label: "Faible", color: COLORS.red };
  if (score <= 3) return { score, label: "Correct", color: COLORS.gold };
  return { score, label: "Fort", color: COLORS.green };
}

function AuthField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
  right,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  right?: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <Ionicons name={icon} size={19} color={COLORS.gold} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A19A8D"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
        {right}
      </View>
    </View>
  );
}

function SelectField({
  label,
  icon,
  value,
  options,
  onChange,
  enabled = true,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string | null;
  options: Option[];
  onChange: (value: string | null) => void;
  enabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [tempValue, setTempValue] = useState<string | null>(value);
  const selectedLabel = value ? options.find((item) => item.value === value)?.label ?? value : label;

  if (Platform.OS !== "ios") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.selectAndroid, !enabled && styles.disabledInput]}>
          <Ionicons name={icon} size={19} color={COLORS.gold} />
          <Picker
            enabled={enabled}
            selectedValue={value}
            onValueChange={onChange}
            style={styles.picker}
            dropdownIconColor={COLORS.muted}
          >
            <Picker.Item label={label} value={null} color="#A19A8D" />
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.86}
        disabled={!enabled}
        style={[styles.inputBox, !enabled && styles.disabledInput]}
        onPress={() => {
          setTempValue(value);
          setVisible(true);
        }}
      >
        <Ionicons name={icon} size={19} color={COLORS.gold} />
        <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => {
                  onChange(tempValue);
                  setVisible(false);
                }}
              >
                <Text style={styles.modalOk}>OK</Text>
              </TouchableOpacity>
            </View>
            <Picker selectedValue={tempValue} onValueChange={setTempValue} itemStyle={styles.pickerItem}>
              <Picker.Item label={label} value={null} />
              {options.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [sexe, setSexe] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [situation, setSituation] = useState<string | null>(null);
  const [profession, setProfession] = useState("");
  const [pays, setPays] = useState<string | null>(null);
  const [ville, setVille] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [countriesData, setCountriesData] = useState<CountryApiRow[]>([]);
  const [countries, setCountries] = useState<Option[]>(FALLBACK_COUNTRIES);
  const [cities, setCities] = useState<Option[]>([]);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const isSmallScreen = width < 380;
  const shouldStackRows = width < 430;
  const isShortScreen = height < 720;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries")
      .then((response) => response.json())
      .then((payload) => {
        const rows = Array.isArray(payload?.data) ? (payload.data as CountryApiRow[]) : [];
        if (rows.length === 0) return;
        setCountriesData(rows);
        setCountries(rows.map((item) => ({ label: item.country, value: item.country })));
      })
      .catch(() => setCountries(FALLBACK_COUNTRIES));
  }, []);

  useEffect(() => {
    setVille(null);
    if (!pays) {
      setCities([]);
      return;
    }

    const selected = countriesData.find((item) => item.country === pays);
    setCities(selected?.cities?.map((city) => ({ label: city, value: city })) ?? []);
  }, [countriesData, pays]);

  const canSubmit =
    prenom.trim().length > 0 &&
    nom.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    password === confirmPassword &&
    rgpdConsent;

  async function handleNext() {
    const normalizedEmail = email.trim().toLowerCase();
    const ageNumber = age ? Number.parseInt(age, 10) : null;

    if (!prenom.trim() || !nom.trim() || !normalizedEmail || !password) {
      Alert.alert("Inscription", "Renseignez au minimum prénom, nom, email et mot de passe.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert("Email invalide", "Veuillez saisir une adresse email valide.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Mot de passe trop court", "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Confirmation incorrecte", "Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (ageNumber !== null && (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120)) {
      Alert.alert("Âge invalide", "Veuillez saisir un âge valide.");
      return;
    }

    if (!rgpdConsent) {
      Alert.alert("Consentement requis", "Vous devez accepter les conditions et la collecte des données nécessaires.");
      return;
    }

    await saveRegistrationDraft({
      prenom: prenom.trim(),
      nom: nom.trim(),
      sexe,
      age,
      situation,
      profession: profession.trim(),
      pays,
      ville,
      email: normalizedEmail,
      password,
      rgpdConsent: true,
      rgpdConsentTextVersion: RGPD_CONSENT_TEXT_VERSION,
      rgpdConsentAcceptedAt: new Date().toISOString(),
    });

    router.push("/(auth)/register-step2");
  }

  async function handleGoogleRegister() {
    try {
      const nextRoute = await signInWithGoogle();
      if (nextRoute) {
        router.replace(nextRoute);
      }
    } catch (error) {
      Alert.alert("Inscription Google impossible", getSupabaseErrorMessage(error));
    }
  }

  const rowStyle = [styles.row, shouldStackRows && styles.rowStack];
  const rowItemStyle = [styles.rowItem, shouldStackRows && styles.rowStackItem];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Image
        source={require("../../assets/images/fond1.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(15,23,42,0.18)", "rgba(255,255,255,0.44)", "rgba(255,252,246,0.97)"]}
        locations={[0, 0.34, 0.7]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingHorizontal: isSmallScreen ? 14 : 18,
                paddingTop: isShortScreen ? 2 : 6,
                paddingBottom: isShortScreen ? 24 : 34,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slide }] }]}>
              <View style={[styles.topBar, isSmallScreen && styles.topBarSmall]}>
                <TouchableOpacity style={[styles.backButton, isSmallScreen && styles.backButtonSmall]} onPress={() => router.back()}>
                  <Ionicons name="chevron-back" size={21} color={COLORS.navy} />
                </TouchableOpacity>
                <View style={[styles.logoFrame, isSmallScreen && styles.logoFrameSmall]}>
                  <Image
                    source={require("../../assets/images/kabod relook-04.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.backGhost, isSmallScreen && styles.backButtonSmall]} />
              </View>

              <View style={[styles.intro, isSmallScreen && styles.introSmall]}>
                <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Créer un compte</Text>
              </View>

              <View style={[styles.card, isSmallScreen && styles.cardSmall]}>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Identité</Text>
                  </View>
                  <View style={rowStyle}>
                    <View style={rowItemStyle}>
                      <AuthField label="Prénom" icon="person-outline" value={prenom} onChangeText={setPrenom} placeholder="Prénom" autoCapitalize="words" />
                    </View>
                    <View style={rowItemStyle}>
                      <AuthField label="Nom" icon="people-outline" value={nom} onChangeText={setNom} placeholder="Nom" autoCapitalize="words" />
                    </View>
                  </View>
                  <View style={rowStyle}>
                    <View style={[styles.rowWide, shouldStackRows && styles.rowStackItem]}>
                      <SelectField label="Sexe" icon="male-female-outline" value={sexe} options={GENDER_OPTIONS} onChange={setSexe} />
                    </View>
                    <View style={[styles.rowNarrow, shouldStackRows && styles.rowStackItem]}>
                      <AuthField label="Âge" icon="calendar-outline" value={age} onChangeText={setAge} placeholder="Âge" keyboardType="numeric" />
                    </View>
                  </View>
                  <SelectField label="Situation matrimoniale" icon="heart-outline" value={situation} options={SITUATION_OPTIONS} onChange={setSituation} />
                  <AuthField label="Profession" icon="briefcase-outline" value={profession} onChangeText={setProfession} placeholder="Profession" />
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Localisation</Text>
                  </View>
                  <View style={rowStyle}>
                    <View style={rowItemStyle}>
                      <SelectField label="Pays" icon="flag-outline" value={pays} options={countries} onChange={setPays} />
                    </View>
                    <View style={rowItemStyle}>
                      <SelectField
                        label={pays ? "Ville" : "Choisir un pays"}
                        icon="location-outline"
                        value={ville}
                        options={cities}
                        onChange={setVille}
                        enabled={Boolean(pays && cities.length > 0)}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Connexion</Text>
                  </View>
                  <AuthField
                    label="Email"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="votre@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <AuthField
                    label="Mot de passe"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="8 caractères minimum"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    right={
                      <TouchableOpacity onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                        <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.muted} />
                      </TouchableOpacity>
                    }
                  />
                  <View style={[styles.strengthRow, isSmallScreen && styles.strengthRowStack]}>
                    <View style={styles.strengthTrack}>
                      {[1, 2, 3, 4].map((item) => (
                        <View key={item} style={[styles.strengthBar, item <= strength.score && { backgroundColor: strength.color }]} />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, isSmallScreen && styles.strengthTextSmall, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  </View>
                  <AuthField
                    label="Confirmation"
                    icon="shield-checkmark-outline"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirmer"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    right={
                      <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} hitSlop={10}>
                        <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.muted} />
                      </TouchableOpacity>
                    }
                  />
                  {!passwordsMatch && <Text style={styles.errorText}>Les mots de passe ne correspondent pas.</Text>}
                </View>

                <Pressable style={({ pressed }) => [styles.consentBox, pressed && styles.buttonPressed]} onPress={() => setRgpdConsent((value) => !value)}>
                  <View style={[styles.checkbox, rgpdConsent && styles.checkboxOn]}>
                    {rgpdConsent && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                  <View style={styles.consentTextWrap}>
                    <Text style={styles.consentText}>
                      J’accepte les conditions d’utilisation et la collecte des données nécessaires à mon compte Kabod.
                    </Text>
                    <View style={styles.legalRow}>
                      <TouchableOpacity onPress={() => router.push("/legal/privacy" as any)}>
                        <Text style={styles.legalLink}>Confidentialité</Text>
                      </TouchableOpacity>
                      <Text style={styles.legalDot}>•</Text>
                      <TouchableOpacity onPress={() => router.push("/legal/terms" as any)}>
                        <Text style={styles.legalLink}>Conditions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  disabled={!canSubmit}
                  onPress={handleNext}
                  style={({ pressed }) => [styles.primaryButton, (!canSubmit || pressed) && styles.buttonPressed]}
                >
                  <Text style={styles.primaryText}>Créer un compte</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.gold} />
                </Pressable>

                <Pressable style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]} onPress={handleGoogleRegister}>
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.googleText}>S’inscrire avec Google</Text>
                </Pressable>
              </View>

              <View style={styles.footerLink}>
                <Text style={styles.footerMuted}>Déjà un compte ?</Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
                  <Text style={styles.footerAction}>Se connecter</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navy },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { width: "100%", maxWidth: 560, alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  topBarSmall: { marginBottom: 8 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonSmall: { width: 38, height: 38, borderRadius: 14 },
  backGhost: { width: 42, height: 42 },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  logoFrameSmall: { width: 82, height: 82, borderRadius: 24, padding: 8 },
  logo: { width: "100%", height: "100%" },
  intro: { alignItems: "center", marginBottom: 10 },
  introSmall: { marginBottom: 8 },
  title: { marginTop: 2, color: COLORS.navy, fontSize: 31, lineHeight: 36, fontWeight: "900", letterSpacing: -0.7 },
  titleSmall: { fontSize: 27, lineHeight: 32 },
  subtitle: { marginTop: 8, color: COLORS.muted, fontSize: 14, lineHeight: 21, textAlign: "center", fontWeight: "600" },
  subtitleSmall: { fontSize: 13, lineHeight: 19 },
  card: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
    gap: 16,
  },
  cardSmall: { padding: 14, borderRadius: 26, gap: 15 },
  section: { gap: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  row: { flexDirection: "row", gap: 10 },
  rowStack: { flexDirection: "column" },
  rowItem: { flex: 1, minWidth: 0 },
  rowWide: { flex: 1.25, minWidth: 0 },
  rowNarrow: { flex: 0.75, minWidth: 0 },
  rowStackItem: { flex: 0, width: "100%" },
  field: { gap: 7 },
  label: { color: COLORS.navy, fontSize: 12, fontWeight: "900" },
  inputBox: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: "700", paddingVertical: 0, minWidth: 0 },
  selectText: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: "700", minWidth: 0 },
  placeholder: { color: "#A19A8D" },
  disabledInput: { opacity: 0.55 },
  selectAndroid: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingLeft: 13,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  picker: { flex: 1, color: COLORS.text, marginLeft: -8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 32 },
  modalHeader: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.navy, fontSize: 16, fontWeight: "900" },
  modalCancel: { color: COLORS.muted, fontSize: 15, fontWeight: "700" },
  modalOk: { color: COLORS.gold, fontSize: 15, fontWeight: "900" },
  pickerItem: { fontSize: 18, height: 150 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4 },
  strengthRowStack: { alignItems: "stretch", flexDirection: "column", gap: 6 },
  strengthTrack: { flex: 1, flexDirection: "row", gap: 5 },
  strengthBar: { flex: 1, height: 5, borderRadius: 999, backgroundColor: COLORS.border },
  strengthText: { minWidth: 110, textAlign: "right", fontSize: 12, fontWeight: "900" },
  strengthTextSmall: { minWidth: 0, textAlign: "left" },
  errorText: { color: COLORS.red, fontSize: 12, fontWeight: "800", marginTop: -6 },
  consentBox: {
    flexDirection: "row",
    gap: 11,
    padding: 13,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: "#EFE1A7",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: COLORS.gold },
  consentTextWrap: { flex: 1 },
  consentText: { color: COLORS.navy, fontSize: 13, lineHeight: 19, fontWeight: "800" },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" },
  legalLink: { color: COLORS.navy, fontSize: 12, fontWeight: "900", textDecorationLine: "underline" },
  legalDot: { color: COLORS.muted, fontWeight: "900" },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },
  googleButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleG: { color: "#4285F4", fontSize: 17, fontWeight: "900" },
  googleText: { color: COLORS.navy, fontSize: 15, fontWeight: "900" },
  footerLink: { marginTop: 20, flexDirection: "row", justifyContent: "center", gap: 6, flexWrap: "wrap" },
  footerMuted: { color: COLORS.muted, fontSize: 14, fontWeight: "700" },
  footerAction: { color: COLORS.gold, fontSize: 14, fontWeight: "900" },
});
