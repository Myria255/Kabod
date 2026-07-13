import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACTIVITY_ITEMS = [
  { icon: "book-outline" as const, label: "Lecture biblique", route: "/bible" },
  { icon: "heart-outline" as const, label: "Centre de prière", route: "/priere/priere" },
  { icon: "journal-outline" as const, label: "Carnet de méditation", route: "/meditation/carnet" },
];

const SETTINGS_ITEMS = [
  { icon: "notifications-circle-outline" as const, label: "Notifications reçues", route: "/notifications" },
  { icon: "notifications-outline" as const, label: "Notifications spirituelles", route: "/profil/notifications" },
  { icon: "person-circle-outline" as const, label: "Mes données personnelles", route: "/profil/donnees" },
  { icon: "shield-checkmark-outline" as const, label: "Politique de confidentialité", route: "/legal/privacy" },
  { icon: "document-text-outline" as const, label: "Conditions d’utilisation", route: "/legal/terms" },
];

export default function ProfilePage() {
  const { user, loading: userLoading, signOut } = useUser();
  const router = useRouter();
  const userName = user?.nom ?? "Utilisateur";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    Alert.alert("Déconnexion", "Souhaitez-vous quitter votre session ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/(auth)/login");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Déconnexion impossible.";
            Alert.alert("Erreur", message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[COLORS.blueDark, COLORS.blueMid]} style={styles.profileHero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userLoading ? "..." : userInitial}</Text>
          </View>
          <Text style={styles.name}>{userLoading ? "Chargement..." : userName}</Text>
          <Text style={styles.role}>{user?.isAdmin ? "Administrateur Kabod" : "Compagnon de foi"}</Text>

          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>Actif</Text>
              <Text style={styles.profileStatLabel}>Compte</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{user?.isAdmin ? "Admin" : "Membre"}</Text>
            <Text style={styles.profileStatLabel}>Rôle</Text>
            </View>
          </View>
        </LinearGradient>

        <Section title="Mon activité">
          {ACTIVITY_ITEMS.map((item) => (
            <Item
              key={item.label}
              icon={item.icon}
              label={item.label}
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </Section>

        <Section title="Réglages">
          {SETTINGS_ITEMS.map((item) => (
            <Item
              key={item.label}
              icon={item.icon}
              label={item.label}
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </Section>

        {user?.isAdmin && (
          <TouchableOpacity style={styles.adminCard} onPress={() => router.push("/admin-space")}>
            <View style={styles.adminIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.gold} />
            </View>
            <View style={styles.adminBody}>
              <Text style={styles.adminTitle}>Tableau de bord Admin</Text>
              <Text style={styles.adminText}>Gérer les contenus, lives, prières et événements.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}

        <Section title="Compte">
          <TouchableOpacity style={styles.logout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBox}>{children}</View>
    </View>
  );
}

function Item({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.itemIcon}>
          <Ionicons name={icon} size={20} color={COLORS.blueDark} />
        </View>
        <Text style={styles.itemText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  container: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 36,
    gap: 18,
  },
  profileHero: {
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    minHeight: 270,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  name: { marginTop: 14, fontSize: 24, fontWeight: "900", color: COLORS.white },
  role: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#D7DEEA" },
  profileStats: {
    marginTop: 20,
    width: "100%",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    paddingVertical: 14,
  },
  profileStat: { flex: 1, alignItems: "center" },
  profileStatValue: { color: COLORS.gold, fontSize: 15, fontWeight: "900" },
  profileStatLabel: { marginTop: 3, color: "#D7DEEA", fontSize: 11, fontWeight: "700" },
  profileDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.16)" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: COLORS.blueDark },
  sectionBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 66,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1, fontSize: 15, fontWeight: "800", color: COLORS.blueDark },
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  adminBody: { flex: 1 },
  adminTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  adminText: { marginTop: 3, color: COLORS.gray, fontSize: 13, lineHeight: 18 },
  logout: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingHorizontal: 16 },
  logoutText: { fontSize: 16, fontWeight: "900", color: "#DC2626" },
});
