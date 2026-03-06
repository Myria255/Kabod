import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const isAdmin = user?.isAdmin === true;

  function normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function toCommunityLabel(type: CommunityType | null): string {
    if (type === "jeune") return "Communaute Jeune";
    if (type === "mariee") return "Communaute des maries";
    return "Aucune";
  }

  function getEligibleCommunityTypes(
    situation: string | null,
    age: number | null
  ): CommunityType[] {
    if (!situation) return [];
    const normalized = normalizeText(situation);
    const result: CommunityType[] = [];

    const isMarried = normalized.includes("marie") || normalized.includes("married");
    const isSingle = normalized.includes("celibataire") || normalized.includes("single");

    if (isMarried) result.push("mariee");
    if (isSingle && typeof age === "number" && age >= 15 && age <= 40) {
      result.push("jeune");
    }

    return result;
  }

  const eligibleTypes = useMemo(
    () => getEligibleCommunityTypes(profile.situation, profile.age),
    [profile.situation, profile.age]
  );

  const communityLabel = useMemo(() => {
    return toCommunityLabel(profile.communityType);
  }, [profile.communityType]);

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

    Alert.alert(
      "Connexion requise",
      "Connectez-vous pour rejoindre une communaute et interagir.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se connecter", onPress: () => router.push("/(auth)/login") },
      ]
    );
  }

  async function saveCommunityChoice() {
    if (!authUserId) {
      router.push("/(auth)/login");
      return;
    }

    if (!selectedType) {
      Alert.alert("Choix requis", "Selectionnez une communaute pour continuer.");
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
      Alert.alert(
        "Mise a jour impossible",
        "Le choix de communaute n'a pas pu etre enregistre."
      );
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
    Alert.alert("Enregistre", "Votre communaute a ete mise a jour.");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={14} color={COLORS.gold} />
              <Text style={styles.badgeText}>Espace Communaute</Text>
            </View>
            {isAdmin && (
              <View style={styles.adminTag}>
                <Text style={styles.adminTagText}>Admin</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>Grandissez ensemble</Text>
          <Text style={styles.subtitle}>
            Retrouvez votre groupe, suivez les activites et partagez vos temps forts.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.gold} />
            <Text style={styles.loadingText}>Chargement de votre communaute...</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mon statut</Text>
              <Text style={styles.cardValue}>
                {isLoggedIn ? (profile.belongs ? "Membre actif" : "Non membre") : "Invite"}
              </Text>
              <Text style={styles.cardHint}>Type: {isLoggedIn ? communityLabel : "Connexion requise"}</Text>
            </View>

            {isLoggedIn && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Communautes de votre ressort</Text>
                {eligibleTypes.length === 0 ? (
                  <Text style={styles.cardHint}>
                    Aucune communaute detectee selon votre profil (situation/age). Mettez votre profil a jour.
                  </Text>
                ) : (
                  <View style={styles.choiceList}>
                    {eligibleTypes.map((type) => {
                      const active = selectedType === type;
                      return (
                        <Pressable
                          key={type}
                          style={[styles.choiceBtn, active && styles.choiceBtnActive]}
                          onPress={() => setSelectedType(type)}
                        >
                          <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                            {toCommunityLabel(type)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {eligibleTypes.length > 0 && (
                  <Pressable
                    style={[styles.primaryBtn, savingChoice && styles.primaryBtnDisabled]}
                    disabled={savingChoice || !selectedType}
                    onPress={saveCommunityChoice}
                  >
                    <Text style={styles.primaryBtnText}>
                      {savingChoice
                        ? "Enregistrement..."
                        : needsChoice
                        ? "Rejoindre cette communaute"
                        : "Mettre a jour ma communaute"}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Actions rapides</Text>
              <View style={styles.actionList}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => requireAuth(() => router.push("/profil"))}
                >
                  <Ionicons name="person-circle-outline" size={18} color={COLORS.blueDark} />
                  <Text style={styles.actionText}>Mon profil</Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtn}
                  onPress={() =>
                    requireAuth(() =>
                      Alert.alert("Bientot disponible", "Le fil de communaute arrive bientot.")
                    )
                  }
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.blueDark} />
                  <Text style={styles.actionText}>Fil communaute</Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtn}
                  onPress={() =>
                    requireAuth(() =>
                      Alert.alert("Bientot disponible", "Le calendrier des evenements arrive bientot.")
                    )
                  }
                >
                  <Ionicons name="calendar-clear-outline" size={18} color={COLORS.blueDark} />
                  <Text style={styles.actionText}>Evenements</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    gap: 14,
  },
  hero: {
    borderRadius: 18,
    backgroundColor: COLORS.blueDark,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: { color: COLORS.gold, fontSize: 12, fontWeight: "700" },
  adminTag: {
    borderRadius: 999,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminTagText: { color: COLORS.blueDark, fontSize: 11, fontWeight: "800" },
  title: { color: COLORS.white, fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#D8DFEE", fontSize: 13, lineHeight: 19 },
  loadingWrap: {
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  loadingText: { color: COLORS.gray, fontSize: 13, fontWeight: "600" },
  section: { gap: 12 },
  card: {
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8,
  },
  cardTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "800" },
  cardValue: { color: COLORS.blueDark, fontSize: 18, fontWeight: "800" },
  cardHint: { color: COLORS.gray, fontSize: 13 },
  choiceList: { marginTop: 2, gap: 8 },
  choiceBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  choiceBtnActive: {
    borderColor: COLORS.blueDark,
    backgroundColor: "#EEF2FF",
  },
  choiceText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "700" },
  choiceTextActive: { color: COLORS.blueDark },
  primaryBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "800" },
  actionList: { gap: 8 },
  actionBtn: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  actionText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "700" },
});
