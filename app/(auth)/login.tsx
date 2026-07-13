import { getDefaultRouteForUser } from "@/src/services/authRedirect";
import { getPasswordResetRedirectUrl, signInWithGoogle } from "@/src/services/authOAuth";
import { getSupabaseErrorMessage, hasSupabaseConfig, supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
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
};

function AuthField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  right,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
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
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {right}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const isSmallScreen = width < 380;
  const isShortScreen = height < 700;
  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !isLoading;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      Alert.alert("Connexion", "Renseignez votre email et votre mot de passe.");
      return;
    }

    if (!hasSupabaseConfig) {
      Alert.alert("Configuration", getSupabaseErrorMessage(new Error("Configuration Supabase absente.")));
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    setIsLoading(false);

    if (error) {
      Alert.alert("Connexion impossible", getSupabaseErrorMessage(error));
      return;
    }

    if (data.user) {
      const nextRoute = await getDefaultRouteForUser(data.user.id);
      router.replace(nextRoute);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert("Email requis", "Entrez votre email avant de demander la réinitialisation.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) {
      Alert.alert("Réinitialisation impossible", getSupabaseErrorMessage(error));
      return;
    }

    Alert.alert("Email envoyé", "Si ce compte existe, un lien de réinitialisation vient d’être envoyé.");
  }

  async function handleGoogleLogin() {
    try {
      const nextRoute = await signInWithGoogle();
      if (nextRoute) {
        router.replace(nextRoute);
      }
    } catch (error) {
      Alert.alert("Connexion Google impossible", getSupabaseErrorMessage(error));
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Image
        source={require("../../assets/images/fond1.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(15,23,42,0.18)", "rgba(255,255,255,0.40)", "rgba(255,252,246,0.96)"]}
        locations={[0, 0.42, 0.78]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingHorizontal: isSmallScreen ? 16 : 22,
                paddingTop: isShortScreen ? 4 : 10,
                paddingBottom: isShortScreen ? 22 : 34,
                justifyContent: isShortScreen ? "flex-start" : "center",
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slide }] }]}>
              <View style={[styles.logoWrap, isShortScreen && styles.logoWrapCompact]}>
                <View style={[styles.logoFrame, isSmallScreen && styles.logoFrameSmall]}>
                  <Image
                    source={require("../../assets/images/kabod relook-04.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={[styles.card, isSmallScreen && styles.cardSmall]}>
                <View style={styles.header}>
                  <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Heureux de te revoir</Text>
                  <Text style={styles.subtitle}>Continuez votre marche avec Dieu.</Text>
                </View>

                <AuthField
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.com"
                  keyboardType="email-address"
                />

                <AuthField
                  label="Mot de passe"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Votre mot de passe"
                  secureTextEntry={!showPassword}
                  right={
                    <TouchableOpacity onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                      <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.muted} />
                    </TouchableOpacity>
                  }
                />

                <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <Pressable
                  disabled={!canSubmit}
                  onPress={handleLogin}
                  style={({ pressed }) => [styles.primaryButton, (!canSubmit || pressed) && styles.buttonPressed]}
                >
                  <Text style={styles.primaryText}>{isLoading ? "Connexion..." : "Se connecter"}</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.gold} />
                </Pressable>

                <Pressable style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]} onPress={handleGoogleLogin}>
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.googleText}>Continuer avec Google</Text>
                </Pressable>

                <View style={styles.footerLink}>
                  <Text style={styles.footerMuted}>Pas encore de compte ?</Text>
                  <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)}>
                    <Text style={styles.footerAction}>S’inscrire</Text>
                  </TouchableOpacity>
                </View>
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
  content: { width: "100%", maxWidth: 500, alignSelf: "center" },
  logoWrap: { alignItems: "center", marginBottom: 14 },
  logoWrapCompact: { marginBottom: 8 },
  logoFrame: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  logoFrameSmall: { width: 76, height: 76, borderRadius: 23, padding: 7 },
  logo: { width: "100%", height: "100%" },
  card: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
    gap: 16,
  },
  cardSmall: { borderRadius: 26, padding: 17, gap: 14 },
  header: { marginBottom: 4, alignItems: "center" },
  title: { color: COLORS.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.4, textAlign: "center" },
  titleSmall: { fontSize: 22 },
  subtitle: { marginTop: 4, color: COLORS.muted, fontSize: 12.5, fontWeight: "600", lineHeight: 18, textAlign: "center" },
  field: { gap: 7 },
  label: { color: COLORS.navy, fontSize: 13, fontWeight: "900" },
  inputBox: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: "700", paddingVertical: 0 },
  forgotButton: { alignSelf: "flex-end", marginTop: -4 },
  forgotText: { color: COLORS.gold, fontSize: 13, fontWeight: "900" },
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
  footerLink: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 2, flexWrap: "wrap" },
  footerMuted: { color: COLORS.muted, fontSize: 14, fontWeight: "700" },
  footerAction: { color: COLORS.gold, fontSize: 14, fontWeight: "900" },
});
