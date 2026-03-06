import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Palette de couleurs Premium
const COLORS = {
  blue: "#0F172A",
  blueLight: "#1E293B",
  gold: "#D4AF37",
  white: "#FFFFFF",
  grayLight: "#F8FAFC",
  grayBg: "#F1F5F9",
  grayText: "#64748B",
  border: "#E2E8F0",
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

  // Pour Android
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

  const [countries, setCountries] = useState<{ label: string; value: string }[]>([]);
  const [cities, setCities] = useState<{ label: string; value: string }[]>([]);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const verseAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  const texts = {
    fr: {
      languageLabel: 'FR',
      verse: 'Car Dieu a tant aimé le monde qu’il a donné son Fils unique,\nafin que quiconque croit en lui ne périsse point,\nmais qu’il ait la vie éternelle.',
      verseRef: 'Jean 3:16',
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
      precedent: 'Précédent',
      suivant: 'Suivant',
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
      verse: 'For God so loved the world that he gave his one and only Son,\nthat whoever believes in him shall not perish\nbut have eternal life.',
      verseRef: 'John 3:16',
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
      precedent: 'Previous',
      suivant: 'Next',
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

  const formStyle = { opacity: formAnim };

  const handleNext = async () => {
    if (!prenom || !nom || !email || !password) {
      alert('Veuillez remplir au moins prénom, nom, email et mot de passe.');
      return;
    }

    const userData = {
      prenom, nom, sexe, age, situation, profession, pays, ville,
      email: email.trim(), password,
    };

    try {
      await AsyncStorage.setItem('tempRegisterData', JSON.stringify(userData));
      router.push('/(auth)/register-step2');
    } catch (error) {
      alert('Erreur sauvegarde temporaire');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F8FAFC', '#FFFFFF']} 
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Changer langue */}
        <TouchableOpacity 
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} 
          style={styles.languageButton}
        >
          <Ionicons name="language" size={18} color={COLORS.gold} />
          <Text style={styles.languageText}>{t.languageLabel}</Text>
        </TouchableOpacity>

        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.logoCircle}
          >
            <View style={styles.logoInner}>
              <Image 
                source={require('../../assets/images/Kabod.png')} 
                style={styles.logo} 
                resizeMode="contain" 
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Verset */}
        <Animated.View style={[styles.verseContainer, verseStyle]}>
          <View style={styles.quoteIconTop}>
            <Ionicons name="book" size={18} color={COLORS.gold} />
          </View>
          <Text style={styles.verseText}>{t.verse}</Text>
          <View style={styles.verseRefContainer}>
            <View style={styles.goldLine} />
            <Text style={styles.verseRef}>{t.verseRef}</Text>
            <View style={styles.goldLine} />
          </View>
        </Animated.View>

        {/* Formulaire */}
        <Animated.View style={[styles.formContainer, formStyle]}>
          {/* Prénom */}
          <View style={styles.inputWrapper}>
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

          {/* Nom */}
          <View style={styles.inputWrapper}>
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

          {/* SEXE */}
          <SelectField
            label={t.sexe}
            value={sexe}
            onValueChange={setSexe}
            options={t.selectSexe}
            iconName="male-female-outline"
          />

          {/* Age */}
          <View style={styles.inputWrapper}>
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

          {/* Situation */}
          <SelectField
            label={t.situation}
            value={situation}
            onValueChange={setSituation}
            options={t.selectSituation}
            iconName="heart-outline"
          />

          {/* Profession */}
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

          {/* Pays */}
          <SelectField
            label={t.pays}
            value={pays}
            onValueChange={setPays}
            options={countries}
            iconName="flag-outline"
          />

          {/* Ville */}
          <SelectField
            label={cities.length > 0 ? t.ville : '...'}
            value={ville}
            onValueChange={setVille}
            options={cities}
            iconName="location-outline"
            enabled={cities.length > 0}
          />

          {/* Email */}
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

          {/* Password */}
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
        </Animated.View>

        {/* Boutons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={COLORS.grayText} />
            <Text style={styles.backButtonText}>{t.precedent}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} activeOpacity={0.9}>
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 40,
  },
  languageButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    marginBottom: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  languageText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  logoInner: {
    width: 118,
    height: 118,
    borderRadius: 70,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
  verseContainer: {
    alignItems: 'center',
    marginBottom: 36,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  quoteIconTop: {
    position: 'absolute',
    top: -14,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  verseText: {
    fontSize: 14.5,
    color: COLORS.blue,
    textAlign: 'center',
    lineHeight: 23,
    fontStyle: 'italic',
    marginTop: 12,
    fontWeight: '400',
  },
  verseRefContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  goldLine: {
    width: 30,
    height: 1,
    backgroundColor: COLORS.gold,
  },
  verseRef: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1,
  },
  formContainer: {
    gap: 18,
  },
  inputWrapper: {
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF9E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingLeft: 56,
    paddingRight: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.blue,
    height: 56,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 36,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  backButtonText: {
    color: COLORS.grayText,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Styles pour SelectField iOS
  selectButton: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingLeft: 56,
    paddingRight: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  selectButtonDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.6,
  },
  selectText: {
    fontSize: 15,
    color: COLORS.blue,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.grayText,
  },
  disabledText: {
    color: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.blue,
  },
  cancelText: {
    fontSize: 17,
    color: COLORS.grayText,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gold,
  },
  pickerItem: {
    fontSize: 20,
    height: 120,
    color: COLORS.blue,
  },
  // Styles pour Android Picker
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingLeft: 56,
    justifyContent: 'center',
    height: 56,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  pickerWrapperDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.6,
  },
  picker: {
    color: COLORS.blue,
    height: 56,
    width: '100%',
  },
});