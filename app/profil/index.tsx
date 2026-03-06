import { useUser } from "@/src/context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  blueDark: "#0F172A",
  gold: "#D4AF37",
  white: "#FFFFFF",
  gray: "#6B6F8A",
  grayLight: "#F2F3F7",
  danger: "#EF4444",
};

export default function ProfilePage() {
 const { user, loading: userLoading } = useUser();
 const userName = user?.nom ?? "Utilisateur";
  const userInitial = userName.charAt(0).toUpperCase();
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/(auth)/login");

  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= PROFIL ================= */}
        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
                {userLoading ? "…" : userInitial}
            </Text>
          </View>

          <Text style={styles.name}>
             {userLoading ? "Chargement..." : userName}
          </Text>
        </View>

        {/* ================= ACTIVITÉ ================= */}
        <Section title="Activité">
          <Item
            icon="book-outline"
            label="Lecture"
            onPress={() => router.push("/bible")}
          />
          <Item
            icon="star-outline"
            label="Favoris"
            onPress={() => {}}
          />
          <Item
            icon="document-text-outline"
            label="Notes"
            onPress={() => {}}
          />
        </Section>

        {/* ================= RÉGLAGES ================= */}
        <Section title="Réglages">
          <Item
            icon="settings-outline"
            label="Paramètres"
            onPress={() => {}}
          />
          <Item
            icon="cloud-outline"
            label="Synchronisation"
            onPress={() => {}}
          />
          <Item
            icon="help-circle-outline"
            label="Aide"
            onPress={() => {}}
          />
        </Section>

        {/* ================= COMPTE ================= */}
        <Section title="Compte">
          <TouchableOpacity style={styles.logout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= COMPOSANTS ================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
        <Ionicons name={icon} size={22} color={COLORS.gold} />
        <Text style={styles.itemText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  /* Profil */
  profileBox: {
    alignItems: "center",
    marginBottom: 32,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "700",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.blueDark,
  },

   /* Sections */
  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray,
    marginBottom: 10,
  },

  sectionBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  itemText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.blueDark,
  },

  /* Déconnexion */
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.danger,
  },
});
