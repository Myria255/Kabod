import { useUser } from "@/src/context/UserContext";
import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminContentsPage() {
  const router = useRouter();
  const { user } = useUser();

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={24} color={COLORS.gray} />
          <Text style={styles.title}>Acces reserve</Text>
          <Text style={styles.subtitle}>Cette page est reservee aux administrateurs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Gestion des contenus</Text>
        <Text style={styles.subtitle}>
          Module pret pour la partie client: ajout et modification de vos publications.
        </Text>

        <View style={styles.note}>
          <Ionicons name="construct-outline" size={18} color={COLORS.gold} />
          <Text style={styles.noteText}>
            Etape suivante: brancher la liste, le formulaire d'ajout et la modification sur Supabase.
          </Text>
        </View>

        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Retour au centre</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 18, gap: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  title: { color: COLORS.blueDark, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  note: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, color: COLORS.blueDark, fontSize: 13, lineHeight: 19 },
  button: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
