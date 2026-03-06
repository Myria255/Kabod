import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabaseClient';

const { width } = Dimensions.get('window');

// Palette Premium
const COLORS = {
  blue: "#6B85C6",
  blueDark: "#4F63B8",
  gold: "#D4AF37",
  white: "#FFFFFF",
  black: "#0F0F14",
  grayLight: "#F2F3F7",
  grayText: "#6B6F8A",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const texts = {
    fr: {
      languageLabel: 'FR',
      slideTitle: 'Expérience Spirituelle Privée',
      email: 'Adresse Email',
      password: 'Mot de passe',
      login: 'SE CONNECTER',
      noAccount: 'Créer un compte',
    },
    en: {
      languageLabel: 'EN',
      slideTitle: 'Private Spiritual Experience',
      email: 'Email Address',
      password: 'Password',
      login: 'SIGN IN',
      noAccount: 'Create account',
    },
  };

  const t = texts[language];

  const slides = [
    { id: '1', url: 'https://static.vecteezy.com/system/resources/thumbnails/071/129/461/small/hands-folded-in-prayer-position-illuminated-by-soft-light-conveying-peace-and-spirituality-photo.jpg' },
    { id: '2', url: 'https://thumbs.dreamstime.com/b/open-bible-glowing-light-wooden-table-warm-atmosphere-open-bible-radiates-warm-glow-resting-wooden-surface-329538570.jpg' },
    { id: '3', url: 'https://thumbs.dreamstime.com/b/christian-worship-raised-hand-music-concert-youth-pray-to-god-church-hands-people-raised-up-worship-to-god-119063525.jpg' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) alert(error.message);
    else router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[COLORS.grayLight, COLORS.white]} style={styles.backgroundGradient} />

      {/* Header: Language & Logo */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          style={styles.langToggle}
        >
          <Text style={styles.langText}>{t.languageLabel}</Text>
          <View style={styles.langDot} />
        </TouchableOpacity>
        
        <View style={styles.logoWrapper}>
           <Image
            source={require('../../assets/images/Kabod.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Hero Carousel */}
      <View style={styles.carouselSection}>
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={{ uri: item.url }} style={styles.slideImage} />
              <LinearGradient 
                colors={['transparent', 'rgba(15,15,20,0.8)']} 
                style={styles.slideOverlay} 
              />
            </View>
          )}
        />
        <View style={styles.titleOverlay}>
            <Animated.Text style={[styles.premiumTitle, { opacity: fadeAnim }]}>
                {t.slideTitle}
            </Animated.Text>
            <View style={styles.indicatorRow}>
                {slides.map((_, i) => (
                    <View key={i} style={[styles.dot, currentIndex === i && styles.activeDot]} />
                ))}
            </View>
        </View>
      </View>

      {/* Login Form */}
      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.email.toUpperCase()}</Text>
          <TextInput
            placeholder="entrez votre email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor={COLORS.grayText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.password.toUpperCase()}</Text>
          <TextInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor={COLORS.grayText}
          />
        </View>

        <TouchableOpacity onPress={handleLogin} activeOpacity={0.9} style={styles.mainButton}>
          <LinearGradient
            colors={[COLORS.blue, COLORS.blueDark]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>{t.login}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t.noAccount}</Text>
            <View style={styles.underline} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  header: {
    marginTop: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  langToggle: {
    position: 'absolute',
    left: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: { fontSize: 12, fontWeight: '700', color: COLORS.blue, letterSpacing: 1 },
  langDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginLeft: 4 },
  logoWrapper: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  logo: { width: '100%', height: '100%' },
  
  carouselSection: {
    height: 260,
    marginTop: 30,
    marginHorizontal: 20,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  slide: { width: width - 40, height: 260 },
  slideImage: { width: '100%', height: '100%' },
  slideOverlay: { ...StyleSheet.absoluteFillObject },
  titleOverlay: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  premiumTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 15,
  },
  indicatorRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { backgroundColor: COLORS.gold, width: 20 },

  formSection: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  inputGroup: { marginBottom: 25 },
  inputLabel: {
    fontSize: 10,
    color: COLORS.blue,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 5,
    fontSize: 16,
    color: COLORS.black,
  },
  mainButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700', letterSpacing: 2, fontSize: 14 },
  secondaryButton: { marginTop: 25, alignItems: 'center' },
  secondaryButtonText: { color: COLORS.grayText, fontSize: 13, letterSpacing: 0.5 },
  underline: { width: 40, height: 2, backgroundColor: COLORS.gold, marginTop: 4 },
});