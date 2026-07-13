import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { saveRegistrationDraft } from '@/src/services/registration';

const RGPD_CONSENT_TEXT_VERSION = "2026-07-13-v1";

// Palette de couleurs Premium Light
const COLORS = {
  white: "#FFFFFF",
  bgLight: "#F8FAFC",
  deepBlue: "#0F172A",
  gold: "#D4AF37",
  goldLight: "#F3D060",
  grayText: "#64748B",
  border: "#E2E8F0",
  inputBg: "#FFFFFF",
};

// Composant SelectField iOS-compatible
interface SelectFieldProps {
  label: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: { label: string; value: string }[];
  iconName: any;
  enabled?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onValueChange,
  options,
  iconName,
  enabled = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempValue, setTempValue] = useState<string | null>(value);

  const handleConfirm = () => {
    onValueChange(tempValue);
    setShowModal(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setShowModal(false);
  };

  const displayText = value
    ? options.find(o => o.value === value)?.label
    : label;

  if (Platform.OS === 'ios') {
    return (
      <>
        <View style={styles.inputWrapper}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={20} color={COLORS.gold} />
          </View>
          <TouchableOpacity
            style={[styles.selectButton, !enabled && styles.selectButtonDisabled]}
            onPress={() => enabled && setShowModal(true)}
            disabled={!enabled}
          >
            <Text style={[
              styles.selectText,
              !value && styles.placeholderText,
              !enabled && styles.disabledText
            ]}>
              {displayText}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={enabled ? COLORS.grayText : '#CBD5E1'}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showModal}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.confirmText}>OK</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={tempValue}
                onValueChange={(itemValue) => setTempValue(itemValue)}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label={label} value={null} />
                {options.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.inputWrapper}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={20} color={COLORS.gold} />
      </View>
      <View style={[styles.pickerWrapper, !enabled && styles.pickerWrapperDisabled]}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={styles.picker}
          enabled={enabled}
        >
          <Picker.Item label={label} value={null} color={COLORS.grayText} />
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

export default function RegisterScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [sexe, setSexe] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [situation, setSituation] = useState<string | null>(null);
  const [profession, setProfession] = useState('');
  const [pays, setPays] = useState<string | null>(null);
  const [ville, setVille] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rgpdConsent, setRgpdConsent] = useState(false);

  const [countries, setCountries] = useState<{ label: string; value: string }[]>([]);
  const [cities, setCities] = useState<{ label: string; value: string }[]>([]);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const verseAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  const texts = {
    fr: {
      languageLabel: 'FR',
      verse: 'Tout est possible à celui qui croit.',
      verseRef: 'Marc 9:23',
      prenom: 'Prénom',
      nom: 'Nom de famille',
      sexe: 'Sexe',
      age: 'Âge',
      situation: 'Situation matrimoniale',
      profession: 'Profession',
      pays: 'Pays',
      ville: 'Ville',
      email: 'Email',
      password: 'Mot de passe',
      privacyTitle: 'Protection des données',
      privacyConsent:
        "J'accepte que Kabod collecte et utilise mes données d'inscription pour créer mon compte, gérer mon accès à l'application, mes communautés, mes contenus et mes notifications.",
      privacyNotice:
        "Vous pourrez demander l’accès, la modification ou la suppression de vos données.",
      privacyRequired: 'Vous devez accepter la collecte des données nécessaires pour créer votre compte.',
      precedent: 'Retour',
      suivant: 'Continuer',
      selectSexe: [
        { label: 'Homme', value: 'Homme' },
        { label: 'Femme', value: 'Femme' },
      ],
      selectSituation: [
        { label: 'Célibataire', value: 'Célibataire' },
        { label: 'Marié(e)', value: 'Marié(e)' },
      ],
    },
    en: {
      languageLabel: 'ENG',
      verse: 'Everything is possible for one who believes.',
      verseRef: 'Mark 9:23',
      prenom: 'First name',
      nom: 'Last name',
      sexe: 'Gender',
      age: 'Age',
      situation: 'Marital status',
      profession: 'Profession',
      pays: 'Country',
      ville: 'City',
      email: 'Email',
      password: 'Password',
      privacyTitle: 'Data protection',
      privacyConsent:
        'I agree that Kabod may collect and use my registration data to create my account, manage my app access, communities, content and notifications.',
      privacyNotice:
        'You may request access, correction or deletion of your data.',
      privacyRequired: 'You must accept the data collection required to create your account.',
      precedent: 'Back',
      suivant: 'Continue',
      selectSexe: [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
      ],
      selectSituation: [
        { label: 'Single', value: 'Single' },
        { label: 'Married', value: 'Married' },
      ],
    },
  };

  const t = texts[language];

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(logoAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(verseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [logoAnim, verseAnim, formAnim]);

  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries')
      .then((response) => response.json())
      .then((data) => {
        if (data.data) {
          const formattedCountries = data.data.map((item: any) => ({
            label: item.country,
            value: item.country,
          }));
          setCountries(formattedCountries);
        }
      })
      .catch((error) => console.error('Error fetching countries:', error));
  }, []);

  useEffect(() => {
    if (pays) {
      fetch('https://countriesnow.space/api/v0.1/countries')
        .then((response) => response.json())
        .then((data) => {
          const selected = data.data.find((item: any) => item.country === pays);
          if (selected && selected.cities) {
            const formattedCities = selected.cities.map((city: string) => ({
              label: city,
              value: city,
            }));
            setCities(formattedCities);
          } else {
            setCities([]);
          }
          setVille(null);
        })
        .catch((error) => console.error('Error fetching cities:', error));
    } else {
      setCities([]);
      setVille(null);
    }
  }, [pays]);

  const logoStyle = {
    opacity: logoAnim,
    transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
  };

  const verseStyle = {
    opacity: verseAnim,
    transform: [{ translateY: verseAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  };

  const formStyle = {
    opacity: formAnim,
  };

  const handleNext = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const ageNumber = age ? Number.parseInt(age, 10) : null;

    if (!prenom.trim() || !nom.trim() || !normalizedEmail || !password) {
      alert('Veuillez remplir au moins prénom, nom, email et mot de passe.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      alert('Veuillez saisir une adresse email valide.');
      return;
    }

    if (password.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (ageNumber !== null && (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120)) {
      alert('Veuillez saisir un âge valide.');
      return;
    }

    if (!rgpdConsent) {
      alert(t.privacyRequired);
      return;
    }

    const userData = {
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
    };

    try {
      await saveRegistrationDraft(userData);
      router.push('/(auth)/register-step2');
    } catch (error) {
      alert('Erreur sauvegarde temporaire');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[COLORS.white, COLORS.bgLight]}
        style={styles.backgroundGradient}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header: Language */}
        <TouchableOpacity
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          style={styles.languageButton}
        >
          <Ionicons name="language" size={18} color={COLORS.gold} />
          <Text style={styles.languageText}>{t.languageLabel}</Text>
        </TouchableOpacity>

        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/kabod relook-04.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Verse */}
        <Animated.View style={[styles.verseContainer, verseStyle]}>
          <FontAwesome name="quote-left" size={20} color={COLORS.gold} style={styles.quoteIcon} />
          <Text style={styles.verseText}>{t.verse}</Text>
          <View style={styles.verseRefContainer}>
            <View style={styles.goldLine} />
            <Text style={styles.verseRef}>{t.verseRef}</Text>
            <View style={styles.goldLine} />
          </View>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.formContainer, formStyle]}>
          <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>

          <View style={styles.inputRow}>
            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.gold} />
              </View>
              <TextInput
                placeholder={t.prenom}
                value={prenom}
                onChangeText={setPrenom}
                style={styles.input}
                placeholderTextColor={COLORS.grayText}
              />
            </View>
            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <View style={styles.iconContainer}>
                <Ionicons name="people-outline" size={20} color={COLORS.gold} />
              </View>
              <TextInput
                placeholder={t.nom}
                value={nom}
                onChangeText={setNom}
                style={styles.input}
                placeholderTextColor={COLORS.grayText}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={{ flex: 1.5 }}>
              <SelectField
                label={t.sexe}
                value={sexe}
                onValueChange={setSexe}
                options={t.selectSexe}
                iconName="male-female-outline"
              />
            </View>
            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.gold} />
              </View>
              <TextInput
                placeholder={t.age}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={COLORS.grayText}
              />
            </View>
          </View>

          <SelectField
            label={t.situation}
            value={situation}
            onValueChange={setSituation}
            options={t.selectSituation}
            iconName="heart-outline"
          />

          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <Ionicons name="briefcase-outline" size={20} color={COLORS.gold} />
            </View>
            <TextInput
              placeholder={t.profession}
              value={profession}
              onChangeText={setProfession}
              style={styles.input}
              placeholderTextColor={COLORS.grayText}
            />
          </View>

          <Text style={styles.sectionTitle}>LOCALISATION & CONTACT</Text>

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <SelectField
                label={t.pays}
                value={pays}
                onValueChange={setPays}
                options={countries}
                iconName="flag-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label={cities.length > 0 ? t.ville : '...'}
                value={ville}
                onValueChange={setVille}
                options={cities}
                iconName="location-outline"
                enabled={cities.length > 0}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.gold} />
            </View>
            <TextInput
              placeholder={t.email}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={COLORS.grayText}
            />
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gold} />
            </View>
            <TextInput
              placeholder={t.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              placeholderTextColor={COLORS.grayText}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={COLORS.grayText}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.gold} />
              <Text style={styles.privacyTitle}>{t.privacyTitle}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.checkboxRow}
              onPress={() => setRgpdConsent((value) => !value)}
            >
              <View style={[styles.checkbox, rgpdConsent && styles.checkboxChecked]}>
                {rgpdConsent ? <Ionicons name="checkmark" size={16} color={COLORS.white} /> : null}
              </View>
              <Text style={styles.checkboxText}>{t.privacyConsent}</Text>
            </TouchableOpacity>

            <Text style={styles.privacyNotice}>{t.privacyNotice}</Text>

            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => router.push("/legal/privacy" as any)}>
                <Text style={styles.legalLinkText}>Politique de confidentialité</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity onPress={() => router.push("/legal/terms" as any)}>
                <Text style={styles.legalLinkText}>Conditions d’utilisation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={COLORS.grayText} />
            <Text style={styles.backButtonText}>{t.precedent}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} activeOpacity={0.9}>
            <LinearGradient
              colors={rgpdConsent ? [COLORS.deepBlue, "#1E293B"] : ["#94A3B8", "#64748B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>{t.suivant}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.gold} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  languageButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: 20,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  languageText: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },

  logoContainer: { alignItems: 'center', marginBottom: 10 },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    padding: 6,
  },
  logo: { width: '100%', height: '100%' },

  verseContainer: {
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '85%',
    alignSelf: 'center',
  },
  quoteIcon: { marginBottom: 4 },
  verseText: {
    fontSize: 13,
    color: COLORS.deepBlue,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  verseRefContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  goldLine: { width: 20, height: 1, backgroundColor: COLORS.gold },
  verseRef: { fontSize: 11, fontWeight: '700', color: COLORS.gold, letterSpacing: 1 },

  formContainer: { gap: 15 },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.deepBlue,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 5,
    opacity: 0.6
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputWrapper: { position: 'relative' },
  iconContainer: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 1,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingLeft: 45,
    paddingRight: 15,
    fontSize: 16,
    color: COLORS.deepBlue,
    height: 55,
  },
  eyeIcon: { position: 'absolute', right: 14, top: 14 },

  // SelectField styles
  selectButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingLeft: 45,
    paddingRight: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 55,
  },
  selectButtonDisabled: { backgroundColor: COLORS.bgLight, opacity: 0.6 },
  selectText: { fontSize: 16, color: COLORS.deepBlue, flex: 1 },
  placeholderText: { color: COLORS.grayText },
  disabledText: { color: COLORS.grayText },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.deepBlue },
  cancelText: { fontSize: 16, color: COLORS.grayText },
  confirmText: { fontSize: 16, fontWeight: '700', color: COLORS.gold },
  pickerItem: { fontSize: 18, height: 150 },

  pickerWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingLeft: 40,
    justifyContent: 'center',
    height: 55,
    overflow: 'hidden'
  },
  pickerWrapperDisabled: { backgroundColor: COLORS.bgLight, opacity: 0.6 },
  picker: { color: COLORS.deepBlue, width: '110%', marginLeft: -10 },

  privacyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  privacyTitle: {
    color: COLORS.deepBlue,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  checkboxText: {
    flex: 1,
    color: COLORS.deepBlue,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  privacyNotice: {
    color: COLORS.grayText,
    fontSize: 12,
    lineHeight: 17,
    paddingLeft: 34,
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingLeft: 34,
  },
  legalLinkText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    color: COLORS.grayText,
    fontSize: 12,
    fontWeight: "900",
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    alignItems: 'center',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButtonText: { color: COLORS.grayText, fontSize: 16, fontWeight: '600' },
  nextButton: {
    borderRadius: 15,
    paddingHorizontal: 35,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: COLORS.deepBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
