import { applyPasswordRecoveryUrl } from "@/src/services/authOAuth";
import { getSupabaseErrorMessage, supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  white: "#FFFFFF",
  navy: "#0F172A",
  gold: "#D4AF37",
  text: "#111827",
  muted: "#667085",
  border: "#E7E2D4",
};

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const canSubmit = password.length >= 8 && password === confirmPassword && !saving;

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (url) {
          await applyPasswordRecoveryUrl(url);
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          Alert.alert(
            "Lien invalide",
            "Le lien de réinitialisation est expiré ou incomplet. Demandez un nouvel email."
          );
          router.replace("/(auth)/login");
          return;
        }

        if (mounted) setReady(true);
      } catch (error) {
        Alert.alert("Réinitialisation impossible", getSupabaseErrorMessage(error));
        router.replace("/(auth)/login");
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router, url]);

  async function savePassword() {
    if (password.length < 8) {
      Alert.alert("Mot de passe trop court", "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Confirmation incorrecte", "Les mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      Alert.alert("Erreur", getSupabaseErrorMessage(error));
      return;
    }

    Alert.alert("Mot de passe modifié", "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.");
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={require("../../assets/images/fond1.png")} style={styles.backgroundImage} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(15,23,42,0.20)", "rgba(255,255,255,0.45)", "rgba(255,252,246,0.96)"]}
        locations={[0, 0.42, 0.78]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.center}>
          <View style={styles.logoFrame}>
            <Image source={require("../../assets/images/kabod relook-04.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>Choisissez un mot de passe sécurisé pour votre compte.</Text>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={19} color={COLORS.gold} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Nouveau mot de passe"
                placeholderTextColor="#A19A8D"
                secureTextEntry={!showPassword}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.strengthRow}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={[styles.strengthBar, item <= strength && styles.strengthBarOn]} />
              ))}
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="shield-checkmark-outline" size={19} color={COLORS.gold} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmer"
                placeholderTextColor="#A19A8D"
                secureTextEntry={!showPassword}
                style={styles.input}
              />
            </View>

            <Pressable
              disabled={!canSubmit}
              onPress={savePassword}
              style={({ pressed }) => [styles.primaryButton, (!canSubmit || pressed) && styles.buttonPressed]}
            >
              <Text style={styles.primaryText}>{saving ? "Enregistrement..." : "Enregistrer"}</Text>
              <Ionicons name="checkmark" size={18} color={COLORS.gold} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navy },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  logoFrame: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginBottom: 14,
  },
  logo: { width: "100%", height: "100%" },
  card: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    borderRadius: 28,
    padding: 20,
    gap: 15,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: 25, fontWeight: "900", textAlign: "center" },
  subtitle: { color: COLORS.muted, fontSize: 13, fontWeight: "600", lineHeight: 19, textAlign: "center" },
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
  strengthRow: { flexDirection: "row", gap: 5 },
  strengthBar: { flex: 1, height: 5, borderRadius: 999, backgroundColor: COLORS.border },
  strengthBarOn: { backgroundColor: COLORS.gold },
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
});
