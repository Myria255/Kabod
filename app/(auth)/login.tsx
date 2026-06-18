import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { getSupabaseErrorMessage, hasSupabaseConfig, supabase } from '../../supabaseClient';
import { getDefaultRouteForUser } from '@/src/services/authRedirect';
import { Ionicons } from '@expo/vector-icons';

// Palette de couleurs Ultra-Premium
const COLORS = {
  white: "#FFFFFF",
  gold: "#D4AF37",
  goldLight: "#F3D060",
  deepBlue: "#0F172A",
  grayText: "#E2E8F0",
  glass: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.25)",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [isLoading, setIsLoading] = useState(false);

  const formSlideAnim = useRef(new Animated.Value(20)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  const texts = {
    fr: {
      languageLabel: 'FR',
      welcome: 'Connexion',
      subtitle: 'Entrez dans la présence de Dieu',
      email: 'Email',
      password: 'Mot de passe',
      login: 'SE CONNECTER',
      noAccount: 'Pas encore membre ? S\'inscrire',
      forgotPassword: 'Mot de passe oublié ?',
    },
    en: {
      languageLabel: 'EN',
      welcome: 'Sign In',
      subtitle: 'Enter the presence of God',
      email: 'Email',
      password: 'Password',
      login: 'SIGN IN',
      noAccount: 'Not a member? Sign up',
      forgotPassword: 'Forgot password?',
    },
  };

  const t = texts[language];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formFadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(formSlideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, [formFadeAnim, formSlideAnim]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;

    if (!hasSupabaseConfig) {
      alert(getSupabaseErrorMessage(new Error("Configuration Supabase absente.")));
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);
    if (error) alert(getSupabaseErrorMessage(error));
    else {
      const nextRoute = await getDefaultRouteForUser(data.user.id);
      router.replace(nextRoute);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Email requis", "Entrez votre adresse email avant de demander la réinitialisation.");
      return;
    }

    if (!hasSupabaseConfig) {
      Alert.alert("Configuration", getSupabaseErrorMessage(new Error("Configuration Supabase absente.")));
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      Alert.alert("Réinitialisation impossible", getSupabaseErrorMessage(error));
      return;
    }

    Alert.alert("Email envoyé", "Si ce compte existe, un lien de réinitialisation vient d’être envoyé.");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Section avec SEULEMENT le premier fond local */}
      <View style={styles.backgroundContainer}>
        <Image 
          source={require('../../assets/images/fond1.png')} 
          style={styles.backgroundImage} 
          resizeMode="cover"
        />
        <LinearGradient 
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']} 
          style={styles.backgroundOverlay} 
        />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              style={styles.langButton}
            >
              <Text style={styles.langText}>{t.languageLabel}</Text>
            </TouchableOpacity>
            
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/images/kabod relook-04.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Form Card Centrée */}
          <Animated.View 
            style={[
              styles.formCard, 
              { opacity: formFadeAnim, transform: [{ translateY: formSlideAnim }] }
            ]}
          >
            <View style={styles.headerText}>
              <Text style={styles.title}>{t.welcome}</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.subtitle}>{t.subtitle}</Text>
            </View>

            <View style={styles.inputArea}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.email.toUpperCase()}</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.gold} style={styles.icon} />
                  <TextInput
                    placeholder={t.email}
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.password.toUpperCase()}</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.gold} style={styles.icon} />
                  <TextInput
                    placeholder={t.password}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="rgba(255,255,255,0.5)" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>{t.forgotPassword}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleLogin} 
              disabled={isLoading}
              activeOpacity={0.85} 
              style={styles.mainBtn}
            >
              <LinearGradient
                colors={[COLORS.gold, "#B8860B"]}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>{isLoading ? '...' : t.login}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity style={styles.linkBtn}>
                <Text style={styles.linkText}>{t.noAccount}</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundContainer: { ...StyleSheet.absoluteFillObject },
  backgroundImage: { width: '100%', height: '100%' },
  backgroundOverlay: { ...StyleSheet.absoluteFillObject },
  
  overlay: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    paddingVertical: 50,
  },
  
  topBar: {
    position: 'absolute',
    top: 50,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  langButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  logoCircle: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 8,
  },
  logo: { width: '100%', height: '100%' },
  
  formCard: {
    backgroundColor: COLORS.glass,
    borderRadius: 35,
    padding: 30,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerText: { alignItems: 'center', marginBottom: 35 },
  title: { color: COLORS.white, fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  titleUnderline: { width: 40, height: 3, backgroundColor: COLORS.gold, marginTop: 8, marginBottom: 12 },
  subtitle: { color: COLORS.grayText, fontSize: 14, opacity: 0.8 },
  
  inputArea: { gap: 20 },
  inputGroup: {},
  label: { color: COLORS.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, opacity: 0.9 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    height: 55,
  },
  icon: { marginRight: 15 },
  input: { 
    flex: 1, 
    color: COLORS.white, 
    fontSize: 16, 
    fontWeight: '500',
    paddingVertical: 0,
    paddingRight: 10,
  },
  
  forgotBtn: { alignSelf: 'flex-end', marginTop: 15, marginBottom: 30 },
  forgotText: { color: COLORS.white, fontSize: 12, opacity: 0.6 },
  
  mainBtn: { borderRadius: 18, overflow: 'hidden' },
  btnGradient: { paddingVertical: 18, alignItems: 'center' },
  btnText: { color: COLORS.white, fontWeight: '900', letterSpacing: 2, fontSize: 16 },
  
  linkBtn: { marginTop: 25, alignItems: 'center' },
  linkText: { color: COLORS.white, fontSize: 14, fontWeight: '600', opacity: 0.9 },
});
