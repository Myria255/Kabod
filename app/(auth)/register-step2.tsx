import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabaseClient';

export default function RegisterStep2Screen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const [tempData, setTempData] = useState<any>(null);
  const [communityType, setCommunityType] = useState<'jeune' | 'mariee' | null>(null);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const texts = {
    fr: {
      languageLabel: 'FR',
      title: 'Rejoindre une communauté ?',
      jeuneTitle: 'Intégrer la communauté jeune',
      jeuneDesc: 'Rejoignez les jeunes de 15 à 40 ans pour des moments de partage, d’adoration et de croissance spirituelle.',
      marieeTitle: 'Intégrer la communauté des mariés',
      marieeDesc: 'Rejoignez les couples mariés pour des enseignements, prières et activités dédiées à la famille chrétienne.',
      yes: 'Oui, je veux rejoindre',
      no: 'Non, peut-être plus tard',
      precedent: 'Précédent',
    },
    en: {
      languageLabel: 'ENG',
      title: 'Join a community?',
      jeuneTitle: 'Join the youth community',
      jeuneDesc: 'Join young people aged 15-40 for moments of sharing, worship and spiritual growth.',
      marieeTitle: 'Join the married community',
      marieeDesc: 'Join married couples for teachings, prayers and activities dedicated to the Christian family.',
      yes: 'Yes, I want to join',
      no: 'No, maybe later',
      precedent: 'Previous',
    },
  };

  const t = texts[language];

  // Chargement des données temporaires + détermination de la communauté
  useEffect(() => {
    const loadTempData = async () => {
      try {
        const json = await AsyncStorage.getItem('tempRegisterData');
        if (json) {
          const data = JSON.parse(json);
          setTempData(data);

          const ageNum = data.age ? parseInt(data.age) : 0;

          if (data.situation === 'Marié(e)' || data.situation === 'Married') {
            setCommunityType('mariee');
          } else if (
            (data.situation === 'Célibataire' || data.situation === 'Single') &&
            ageNum >= 15 &&
            ageNum <= 40
          ) {
            setCommunityType('jeune');
          } else {
            // Pas éligible → inscription finale directe sans cette page
            await handleFinalRegister(data, false, null);
          }
        } else {
          router.replace('/(auth)/register');
        }
      } catch (error) {
        console.error(error);
        router.replace('/(auth)/register');
      }
    };

    loadTempData();
  }, []);

  // Animations
  useEffect(() => {
    Animated.stagger(300, [
      Animated.timing(logoAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, []);

  const logoStyle = {
    opacity: logoAnim,
    transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
  };

  const contentStyle = {
    opacity: contentAnim,
    transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
  };

  // Fonction finale d'inscription complète dans Supabase
  const handleFinalRegister = async (data: any, join: boolean, typeComm: string | null) => {
    const { email, password, ...profileData } = data;

    // 1. Création de l'utilisateur Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      alert('Erreur inscription : ' + authError.message);
      return;
    }

    if (authData.user) {
      // 2. Insertion du profil complet avec choix communauté
      const { error: profileError } = await supabase.from('users_profile').insert({
        user_id: authData.user.id,
        ...profileData,
        appartient_communaute: join,
        type_communaute: join ? typeComm : null,
      });

      if (profileError) {
        alert('Erreur création profil : ' + profileError.message);
      } else {
        // Nettoyage des données temporaires
        await AsyncStorage.removeItem('tempRegisterData');
        alert('Inscription terminée avec succès ! Bienvenue sur Kabod.');
        router.replace('/(tabs)');
      }
    }
  };

  // Gestion du choix Oui / Non
  const handleChoice = (join: boolean) => {
    if (!tempData || !communityType) return;

    handleFinalRegister(tempData, join, join ? communityType : null);
  };

  if (!communityType) {
    return null; // Chargement ou redirection automatique si non éligible
  }

  const communityText = communityType === 'jeune' ? t.jeuneTitle : t.marieeTitle;
  const communityDesc = communityType === 'jeune' ? t.jeuneDesc : t.marieeDesc;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E6F7FF', '#FFFFFF', '#F0F9FF']} style={styles.backgroundGradient} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bouton langue */}
        <TouchableOpacity onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} style={styles.languageButtonVertical}>
          <View style={styles.languageButtonInner}>
            <Text style={styles.languageText}>{t.languageLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* Logo animé */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoCircle}>
            <Image source={require('../../assets/images/Kabod.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>

        {/* Contenu animé */}
        <Animated.View style={[styles.contentContainer, contentStyle]}>
          <Text style={styles.title}>{t.title}</Text>

          <View style={styles.card}>
            <Text style={styles.communityTitle}>{communityText}</Text>
            <Text style={styles.communityDesc}>{communityDesc}</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity onPress={() => handleChoice(true)} style={styles.yesButton}>
              <LinearGradient colors={['#87CEEB', '#5FB8E0', '#4A9FD4']} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>{t.yes}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleChoice(false)} style={styles.noButton}>
              <Text style={styles.noButtonText}>{t.no}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backText}>{t.precedent}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // léger fond gris clair
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
    paddingTop: 30,
    paddingBottom: 60,
  },
  languageButtonVertical: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -50 }],
    zIndex: 10,
  },
  languageButtonInner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4A9FD4',
    shadowColor: '#4A9FD4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    transform: [{ rotate: '-90deg' }],
  },
  languageText: {
    color: '#4A9FD4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoCircle: {
    width: 118,
    height: 118,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9FD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
     elevation: 12,
  },
  logo: {
    width: 80,
    height: 80,
  },
  contentContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#09122a', 
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#4A9FD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
    marginBottom: 40,
  },
  communityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A', // bleu vibrant
    textAlign: 'center',
    marginBottom: 12,
  },
  communityDesc: {
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  yesButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  noButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  noButtonText: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 24,
  },
  backText: {
    color: '#64748B',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
