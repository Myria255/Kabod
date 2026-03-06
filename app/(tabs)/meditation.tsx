import { COLORS } from "@/src/constants/colors";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HomeTab = "meditation" | "priere";

type QuickAction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

type PrayerAction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

export default function MeditationHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HomeTab>("meditation");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon apres-midi";
    return "Bonsoir";
  }, []);

  async function requireAuth(onSuccess: () => void) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      onSuccess();
      return;
    }

    Alert.alert(
      "Connexion requise",
      "Vous devez vous connecter pour acceder a cette section.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se connecter", onPress: () => router.push("/(auth)/login") },
      ]
    );
  }

  const quickActions: QuickAction[] = [
    {
      id: "bible",
      icon: "book-outline",
      label: "Bible",
      onPress: () => requireAuth(() => router.push("/bible")),
    },
    {
      id: "carnet",
      icon: "journal-outline",
      label: "Carnet",
      onPress: () => requireAuth(() => router.push("/meditation/carnet")),
    },
    {
      id: "programme",
      icon: "calendar-outline",
      label: "Programme",
      onPress: () => requireAuth(() => router.push("/meditation/programme")),
    },
    {
      id: "lecture",
      icon: "library-outline",
      label: "Lecture",
      onPress: () => requireAuth(() => router.push("/meditation/lecture")),
    },
  ];

  const prayerActions: PrayerAction[] = [
    {
      id: "jour",
      icon: "heart-outline",
      title: "Priere du jour",
      description: "Une priere guidee pour commencer avec Dieu.",
      onPress: () => requireAuth(() => router.push("/priere/priere")),
    },
    {
      id: "sujets",
      icon: "list-outline",
      title: "Sujets de priere",
      description: "Ajoutez vos intentions et suivez-les chaque jour.",
      onPress: () => requireAuth(() => router.push("/priere/priere")),
    },
    {
      id: "audio",
      icon: "volume-high-outline",
      title: "Audio de priere",
      description: "Ecoutez une priere et priez avec concentration.",
      onPress: () => requireAuth(() => router.push("/priere/priere")),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.title}>Temps spirituel</Text>
              <Text style={styles.subtitle}>Prenez un moment pour lire, mediter et prier.</Text>
            </View>
            <Pressable style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.blueDark} />
            </Pressable>
          </View>

          <View style={styles.tabSwitch}>
            <Pressable
              style={[styles.tabBtn, activeTab === "meditation" && styles.tabBtnActive]}
              onPress={() => setActiveTab("meditation")}
            >
              <Text style={[styles.tabText, activeTab === "meditation" && styles.tabTextActive]}>
                Meditation
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === "priere" && styles.tabBtnActive]}
              onPress={() => setActiveTab("priere")}
            >
              <Text style={[styles.tabText, activeTab === "priere" && styles.tabTextActive]}>
                Priere
              </Text>
            </Pressable>
          </View>

          {activeTab === "meditation" ? (
            <>
              <Pressable
                style={styles.heroCard}
                onPress={() => requireAuth(() => router.push("/meditation/lecture"))}
              >
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>AUJOURD&apos;HUI</Text>
                </View>
                <Text style={styles.heroTitle}>Continuer votre parcours</Text>
                <Text style={styles.heroDescription}>
                  Ouvrez votre lecture du jour et gardez votre progression.
                </Text>
                <View style={styles.heroActionRow}>
                  <Text style={styles.heroActionText}>Ouvrir le plan</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.gold} />
                </View>
              </Pressable>

              <View style={styles.quickGrid}>
                {quickActions.map((action) => (
                  <Pressable key={action.id} style={styles.quickCard} onPress={action.onPress}>
                    <View style={styles.quickIconWrap}>
                      <Ionicons name={action.icon} size={22} color={COLORS.blueDark} />
                    </View>
                    <Text style={styles.quickLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.prayerList}>
              {prayerActions.map((action) => (
                <Pressable key={action.id} style={styles.prayerCard} onPress={action.onPress}>
                  <View style={styles.prayerIconWrap}>
                    <Ionicons name={action.icon} size={20} color={COLORS.gold} />
                  </View>
                  <View style={styles.prayerTextWrap}>
                    <Text style={styles.prayerTitle}>{action.title}</Text>
                    <Text style={styles.prayerDescription}>{action.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 36 },
  page: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    color: COLORS.gray,
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    marginTop: 2,
    color: COLORS.blueDark,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.blueDark,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: COLORS.blueDark,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  heroBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: COLORS.blueDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroTitle: {
    marginTop: 12,
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "800",
  },
  heroDescription: {
    marginTop: 8,
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
  },
  heroActionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroActionText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: "48%",
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    justifyContent: "space-between",
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: "700",
  },
  prayerList: {
    gap: 12,
  },
  prayerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  prayerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  prayerTextWrap: { flex: 1 },
  prayerTitle: {
    color: COLORS.blueDark,
    fontSize: 15,
    fontWeight: "700",
  },
  prayerDescription: {
    marginTop: 3,
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 18,
  },
});
