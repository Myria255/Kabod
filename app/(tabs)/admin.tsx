import { useUser } from "@/src/context/UserContext";
import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AdminAction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
};

const PUBLICATION_ACTIONS: AdminAction[] = [
  {
    id: "contenus",
    icon: "document-text-outline",
    title: "Contenus",
    subtitle: "Creer et modifier vos publications.",
    route: "/admin/contenus",
  },
  {
    id: "podcast",
    icon: "mic-outline",
    title: "Podcast",
    subtitle: "Gerer les episodes et descriptions.",
    route: "/podcast",
  },
];

const EXPERIENCE_ACTIONS: AdminAction[] = [
  {
    id: "programme",
    icon: "calendar-outline",
    title: "Programme",
    subtitle: "Piloter les etapes quotidiennes.",
    route: "/meditation/programme",
  },
  {
    id: "lecture",
    icon: "library-outline",
    title: "Plan de lecture",
    subtitle: "Ajuster les parcours mensuel/annuel.",
    route: "/meditation/lecture",
  },
  {
    id: "carnet",
    icon: "journal-outline",
    title: "Carnet",
    subtitle: "Verifier les notes de meditation.",
    route: "/meditation/carnet",
  },
];

export default function AdminTabPage() {
  const router = useRouter();
  const { user } = useUser();

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.blockedWrap}>
          <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} />
          <Text style={styles.blockedTitle}>Acces reserve</Text>
          <Text style={styles.blockedText}>Cette section est uniquement disponible pour les administrateurs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.gold} />
            <Text style={styles.heroBadgeText}>Mode administrateur</Text>
          </View>
          <Text style={styles.title}>Centre d'administration</Text>
          <Text style={styles.subtitle}>
            Publiez, mettez a jour et pilotez les contenus de l'application depuis un seul espace.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Publication</Text>
          {PUBLICATION_ACTIONS.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(item.route as any)}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color={COLORS.gold} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience spirituelle</Text>
          {EXPERIENCE_ACTIONS.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(item.route as any)}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color={COLORS.gold} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 26, gap: 14 },
  hero: {
    borderRadius: 18,
    backgroundColor: COLORS.blueDark,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBadgeText: { color: COLORS.gold, fontSize: 12, fontWeight: "700" },
  title: { color: COLORS.white, fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#D8DFEE", fontSize: 13, lineHeight: 19 },
  section: { gap: 10 },
  sectionTitle: { color: COLORS.blueDark, fontSize: 15, fontWeight: "800", paddingLeft: 2 },
  card: {
    minHeight: 88,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { color: COLORS.blueDark, fontSize: 15, fontWeight: "800" },
  cardSubtitle: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
  blockedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  blockedTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "800" },
  blockedText: { color: COLORS.gray, fontSize: 14, textAlign: "center" },
});
