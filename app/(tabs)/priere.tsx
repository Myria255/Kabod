import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ITEMS = [
  { icon: "sunny-outline" as const, title: "Prière du jour", text: "Recevoir une direction pour aujourd’hui." },
  { icon: "create-outline" as const, title: "Mes sujets", text: "Garder les intentions importantes." },
  { icon: "timer-outline" as const, title: "Temps calme", text: "Démarrer un moment de 3 minutes." },
];

export default function PrayerTabPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Respirer et prier</Text>
          <Text style={styles.title}>Prière</Text>
          <Text style={styles.subtitle}>Un lieu simple pour déposer vos pensées et revenir à l’essentiel.</Text>
        </View>

        <Pressable onPress={() => router.push("/priere/priere")}>
          <View style={styles.mainCard}>
            <View style={styles.mainIcon}>
              <Ionicons name="heart-outline" size={24} color={COLORS.blueDark} />
            </View>
            <View style={styles.mainBody}>
              <Text style={styles.mainLabel}>Espace dédié</Text>
              <Text style={styles.mainTitle}>Centre de prière</Text>
              <Text style={styles.mainText}>Prière du jour, sujets personnels et minuteur.</Text>
            </View>
            <View style={styles.mainBadge}>
              <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
            </View>
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/priere/requetes" as any)}>
          <View style={styles.requestCard}>
            <View style={styles.requestIcon}>
              <Ionicons name="chatbox-ellipses-outline" size={24} color={COLORS.gold} />
            </View>
            <View style={styles.mainBody}>
              <Text style={styles.mainLabel}>Besoin d’aide ?</Text>
              <Text style={styles.requestTitle}>Requête de prière / soutien</Text>
              <Text style={styles.requestText}>Envoyer une demande confidentielle à l’équipe Kabod.</Text>
            </View>
            <View style={styles.requestBadge}>
              <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
            </View>
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos outils</Text>
          <View style={styles.listCard}>
            {ITEMS.map((item) => (
              <View key={item.title} style={styles.item}>
                <View style={styles.itemIcon}>
                  <Ionicons name={item.icon} size={20} color={COLORS.blueDark} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 22,
  },
  header: { gap: 4 },
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  mainCard: {
    minHeight: 132,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  mainIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBody: { flex: 1 },
  mainLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  mainTitle: { color: COLORS.blueDark, fontSize: 23, fontWeight: "900", marginTop: 3 },
  mainText: { color: COLORS.gray, fontSize: 13, lineHeight: 19, marginTop: 5 },
  mainBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  requestCard: {
    minHeight: 118,
    borderRadius: 24,
    backgroundColor: COLORS.blueDark,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  requestIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217,183,95,0.3)",
  },
  requestTitle: { color: COLORS.white, fontSize: 20, fontWeight: "900", marginTop: 3 },
  requestText: { color: "#D1D5DB", fontSize: 13, lineHeight: 19, marginTop: 5 },
  requestBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: 12 },
  sectionTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  listCard: {
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.grayLight,
    gap: 14,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: { flex: 1 },
  itemTitle: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  itemText: { marginTop: 2, color: COLORS.gray, fontSize: 12, fontWeight: "600", lineHeight: 17 },
});
