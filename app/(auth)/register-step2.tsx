import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  registerUserWithProfile,
  type RegistrationDraft,
} from '@/src/services/registration';

// Palette de couleurs Premium Light
const COLORS = {
  white: "#FFFFFF",
  bgLight: "#F8FAFC",
  deepBlue: "#0F172A",
  gold: "#D4AF37",
  goldLight: "#F3D060",
  grayText: "#64748B",
  border: "#E2E8F0",
};

export default function RegisterStep2Screen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const [tempData, setTempData] = useState<RegistrationDraft | null>(null);
  const [communityType, setCommunityType] = useState<'jeune' | 'mariee' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const texts = {
    fr: {
      languageLabel: 'FR',
      title: 'Rejoindre une communauté ?',
      jeuneTitle: 'Communauté Jeune',
      jeuneDesc: 'Rejoignez les jeunes de 15 à 40 ans pour des moments de partage, d’adoration et de croissance spirituelle.',
      marieeTitle: 'Communauté des Mariés',
      marieeDesc: 'Rejoignez les couples mariés pour des enseignements, prières et activités dédiées à la famille chrétienne.',
      yes: 'OUI, JE REJOINS',
      no: 'PLUS TARD',
      precedent: 'Retour',
    },
    en: {
      languageLabel: 'ENG',
      title: 'Join a community?',
      jeuneTitle: 'Youth Community',
      jeuneDesc: 'Join young people aged 15-40 for moments of sharing, worship and spiritual growth.',
      marieeTitle: 'Married Community',
      marieeDesc: 'Join married couples for teachings, prayers and activities dedicated to the Christian family.',
      yes: 'YES, I JOIN',
      no: 'LATER',
      precedent: 'Back',
    },
  };

  const t = texts[language];

  const handleFinalRegister = useCallback(async (
    data: RegistrationDraft,
    join: boolean,
    typeComm: string | null
  ) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await registerUserWithProfile({
        ...data,
        appartientCommunaute: join,
        typeCommunaute: join ? typeComm : null,
      });

      await clearRegistrationDraft();

      if (result.requiresEmailConfirmation) {
        alert('Compte créé. Consultez votre email pour confirmer votre inscription, puis connectez-vous.');
        router.replace('/(auth)/login');
      } else {
        alert('Inscription terminée avec succès ! Bienvenue sur Kabod.');
        router.replace('/(tabs)');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
      alert(`Inscription impossible : ${message}`);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [router]);

  // Chargement des données temporaires + détermination de la communauté
  useEffect(() => {
    const loadTempData = async () => {
      try {
        const data = await loadRegistrationDraft();
        if (!data) {
          router.replace('/(auth)/register');
          return;
        }

        setTempData(data);

        const ageNum = data.age ? Number.parseInt(data.age, 10) : 0;

        if (data.situation === 'Marié(e)' || data.situation === 'Married') {
          setCommunityType('mariee');
        } else if (
          (data.situation === 'Célibataire' || data.situation === 'Single') &&
          ageNum >= 15 &&
          ageNum <= 40
        ) {
          setCommunityType('jeune');
        } else {
          await handleFinalRegister(data, false, null);
        }
      } catch (error) {
        console.error(error);
        router.replace('/(auth)/register');
      }
    };

    loadTempData();
  }, [handleFinalRegister, router]);

  // Animations
  useEffect(() => {
    Animated.stagger(300, [
      Animated.timing(logoAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, [contentAnim, logoAnim]);

  const logoStyle = {
    opacity: logoAnim,
    transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
  };

  const contentStyle = {
    opacity: contentAnim,
    transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
  };

  const handleChoice = (join: boolean) => {
    if (!tempData || !communityType) return;
    handleFinalRegister(tempData, join, join ? communityType : null);
  };

  if (!communityType) return null;

  const communityText = communityType === 'jeune' ? t.jeuneTitle : t.marieeTitle;
  const communityDesc = communityType === 'jeune' ? t.jeuneDesc : t.marieeDesc;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[COLORS.white, COLORS.bgLight]} style={styles.backgroundGradient} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header: Language */}
        <TouchableOpacity
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          style={styles.languageButton}
        >
          <Ionicons name="language" size={16} color={COLORS.gold} />
          <Text style={styles.languageText}>{t.languageLabel}</Text>
        </TouchableOpacity>

        {/* Logo animé */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/kabod relook-04.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Contenu animé */}
        <Animated.View style={[styles.contentContainer, contentStyle]}>
          <Text style={styles.title}>{t.title}</Text>

          <View style={styles.card}>
            <View style={styles.communityIcon}>
              <Ionicons
                name={communityType === 'jeune' ? "people" : "heart"}
                size={50}
                color={COLORS.gold}
              />
            </View>
            <Text style={styles.communityTitle}>{communityText}</Text>
            <Text style={styles.communityDesc}>{communityDesc}</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={() => handleChoice(true)}
              disabled={isSubmitting}
              activeOpacity={0.9}
              style={styles.yesButton}
            >
              <LinearGradient
                colors={[COLORS.deepBlue, "#1E293B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{t.yes}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleChoice(false)}
              disabled={isSubmitting}
              style={styles.noButton}
            >
              <Text style={styles.noButtonText}>{t.no}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back" size={18} color={COLORS.grayText} />
            <Text style={styles.backText}>{t.precedent}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 60,
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

  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.deepBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    padding: 10,
  },
  logo: { width: '100%', height: '100%' },

  contentContainer: { alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.deepBlue,
    textAlign: 'center',
    marginBottom: 35,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 35,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    width: '100%',
    marginBottom: 40,
    shadowColor: COLORS.deepBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  communityIcon: { marginBottom: 20 },
  communityTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.deepBlue,
    textAlign: 'center',
    marginBottom: 15,
  },
  communityDesc: {
    fontSize: 16,
    color: COLORS.grayText,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: { width: '100%', gap: 15 },
  yesButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.deepBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  noButton: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  noButtonText: { color: COLORS.grayText, fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: 30, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { color: COLORS.grayText, fontSize: 16, fontWeight: '600' },
});
