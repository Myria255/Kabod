import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { supabase } from "@/supabaseClient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CommunityType = "jeune" | "mariee";

type CommunityProfile = {
  belongs: boolean;
  communityType: CommunityType | null;
  situation: string | null;
  age: number | null;
};

export default function CommunauteTabPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [savingChoice, setSavingChoice] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CommunityType | null>(null);
  const [profile, setProfile] = useState<CommunityProfile>({
    belongs: false,
    communityType: null,
    situation: null,
    age: null,
  });

  const isLoggedIn = Boolean(user?.user_id);

  const normalizeText = useCallback((value: string): string => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }, []);

  function toCommunityLabel(type: CommunityType | null): string {
    if (type === "jeune") return "Jeune Chrétien";
    if (type === "mariee") return "Communauté des mariés";
    return "Communauté";
  }

  const getEligibleCommunityTypes = useCallback((situation: string | null, age: number | null): CommunityType[] => {
    if (!situation) return [];
    const normalized = normalizeText(situation);
    const result: CommunityType[] = [];

    if (normalized.includes("marie") || normalized.includes("married")) result.push("mariee");
    if (
      (normalized.includes("celibataire") || normalized.includes("single")) &&
      typeof age === "number" &&
      age >= 15 &&
      age <= 40
    ) {
      result.push("jeune");
    }

    return result;
  }, [normalizeText]);

  const eligibleTypes = useMemo(
    () => getEligibleCommunityTypes(profile.situation, profile.age),
    [getEligibleCommunityTypes, profile.situation, profile.age]
  );

  const communityLabel = useMemo(() => toCommunityLabel(profile.communityType), [profile.communityType]);
  const needsChoice = isLoggedIn && (!profile.belongs || !profile.communityType);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setAuthUserId(null);
        setProfile({ belongs: false, communityType: null, situation: null, age: null });
        setLoading(false);
        return;
      }

      setAuthUserId(authUser.id);
      const result = await supabase
        .from("users_profile")
        .select("appartient_communaute, type_communaute, situation, age")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (!result.error && result.data) {
        const typedCommunity =
          result.data.type_communaute === "jeune" || result.data.type_communaute === "mariee"
            ? result.data.type_communaute
            : null;
        const parsedAge =
          typeof result.data.age === "number"
            ? result.data.age
            : typeof result.data.age === "string"
            ? Number(result.data.age)
            : null;

        setProfile({
          belongs: result.data.appartient_communaute === true,
          communityType: typedCommunity,
          situation: typeof result.data.situation === "string" ? result.data.situation : null,
          age: Number.isFinite(parsedAge as number) ? (parsedAge as number) : null,
        });
        setSelectedType(typedCommunity);
      }

      setLoading(false);
    };

    load();
  }, []);

  async function requireAuth(onSuccess: () => void) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      onSuccess();
      return;
    }

    Alert.alert("Connexion requise", "Connectez-vous pour continuer.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se connecter", onPress: () => router.push("/(auth)/login") },
    ]);
  }

  async function saveCommunityChoice() {
    if (!authUserId) {
      router.push("/(auth)/login");
      return;
    }

    if (!selectedType) {
      Alert.alert("Choix requis", "Sélectionnez une communauté.");
      return;
    }

    setSavingChoice(true);
    const updateResult = await supabase
      .from("users_profile")
      .update({
        appartient_communaute: true,
        type_communaute: selectedType,
      })
      .eq("user_id", authUserId)
      .select("appartient_communaute, type_communaute")
      .single();

    if (updateResult.error) {
      setSavingChoice(false);
      Alert.alert("Mise à jour impossible", "Votre choix n'a pas pu être enregistré.");
      return;
    }

    setProfile((prev) => ({
      ...prev,
      belongs: updateResult.data.appartient_communaute === true,
      communityType:
        updateResult.data.type_communaute === "jeune" || updateResult.data.type_communaute === "mariee"
          ? updateResult.data.type_communaute
          : prev.communityType,
    }));
    setSavingChoice(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require("@/assets/images/fond3.jpg")}
          imageStyle={styles.heroImage}
          style={styles.hero}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.header}>
              <Text style={styles.title}>Communauté</Text>
              <Text style={styles.subtitle}>Avançons ensemble dans la foi.</Text>
            </View>
          </View>
        </ImageBackground>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.muted}>Chargement...</Text>
          </View>
        ) : (
          <View style={styles.communityCard}>
            <View style={styles.cardTop}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Groupe de Foi</Text>
              </View>
              <Pressable
                style={[styles.joinButton, savingChoice && styles.disabled]}
                disabled={savingChoice}
                onPress={() => {
                  if (!isLoggedIn) {
                    router.push("/(auth)/login");
                    return;
                  }
                  if (needsChoice && eligibleTypes.length > 0) {
                    saveCommunityChoice();
                  }
                }}
              >
                <Text style={styles.joinText}>
                  {!isLoggedIn ? "Rejoindre" : needsChoice ? "Valider" : "Membre"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.cardTitle}>{isLoggedIn ? communityLabel : "Jeune Chrétien"}</Text>
            <View style={styles.meta}>
              <Ionicons name="globe-outline" size={16} color={COLORS.gold} />
              <Text style={styles.metaText}>{profile.belongs ? "Membre actif" : "Groupe public"} · 1.2k membres</Text>
            </View>

            <Text style={styles.description}>
              Un espace pour grandir dans la foi, partager des témoignages et avancer avec d’autres croyants.
            </Text>

            {isLoggedIn && needsChoice && eligibleTypes.length > 0 && (
              <View style={styles.choices}>
                {eligibleTypes.map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.choice, selectedType === type && styles.choiceActive]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.choiceText, selectedType === type && styles.choiceTextActive]}>
                      {toCommunityLabel(type)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {isLoggedIn && needsChoice && eligibleTypes.length === 0 && (
              <View style={styles.alertBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.gray} />
                <Text style={styles.alertText}>Mettez votre profil à jour pour voir les communautés disponibles.</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Espaces partagés</Text>
            <Pressable onPress={() => requireAuth(() => Alert.alert("Bientôt disponible", "Le fil arrive bientôt."))}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>

          <View style={styles.listCard}>
            <Action icon="person-circle-outline" text="Mon profil" onPress={() => requireAuth(() => router.push("/profil"))} />
            <Action
              icon="chatbubble-outline"
              text="Fil communauté"
              onPress={() => requireAuth(() => Alert.alert("Bientôt disponible", "Le fil arrive bientôt."))}
            />
            <Action
              icon="calendar-outline"
              text="Événements"
              isLast
              onPress={() => requireAuth(() => Alert.alert("Bientôt disponible", "Les événements arrivent bientôt."))}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({
  icon,
  text,
  onPress,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable style={[styles.action, isLast && styles.actionLast]} onPress={onPress}>
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons
          name={icon === "person-circle-outline" ? "account-circle-outline" : icon === "chatbubble-outline" ? "message-outline" : "calendar-outline"}
          size={22}
          color={COLORS.blueDark}
        />
      </View>
      <Text style={styles.actionText}>{text}</Text>
      <View style={styles.actionChevron}>
        <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingBottom: 30,
  },
  hero: {
    height: 220,
    overflow: "hidden",
    backgroundColor: COLORS.blueDark,
  },
  heroImage: { opacity: 0.8 },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(16,24,39,0.3)",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    gap: 4,
  },
  title: { color: COLORS.white, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.white, fontSize: 14, opacity: 0.9 },
  loading: {
    marginTop: -30,
    marginHorizontal: 18,
    minHeight: 140,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  communityCard: {
    marginTop: -30,
    marginHorizontal: 18,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    gap: 16,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pill: {
    borderRadius: 999,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  joinButton: {
    minWidth: 112,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.65 },
  joinText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  cardTitle: { color: COLORS.blueDark, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { color: COLORS.gray, fontSize: 13, fontWeight: "800" },
  description: { color: COLORS.gray, fontSize: 14, lineHeight: 22, opacity: 0.9 },
  choices: { gap: 10, marginTop: 4 },
  choice: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  choiceText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "800" },
  choiceTextActive: { color: COLORS.white },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  alertText: { flex: 1, color: COLORS.gray, fontSize: 13, lineHeight: 18 },
  muted: { color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  section: {
    paddingHorizontal: 18,
    marginTop: 26,
    gap: 12,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900" },
  seeAll: { color: COLORS.blue, fontSize: 13, fontWeight: "900" },
  listCard: {
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  action: {
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
  },
  actionLast: {
    marginBottom: 0,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { flex: 1, color: COLORS.blueDark, fontSize: 15, fontWeight: "800" },
  actionChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
