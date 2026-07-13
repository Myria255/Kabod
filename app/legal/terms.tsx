import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. Objet de l’application",
    body:
      "Kabod est une application destinée à accompagner les utilisateurs dans la lecture biblique, la prière, les contenus spirituels, la vie communautaire, les témoignages, les événements, les podcasts, les livres et les échanges avec l’administration.",
  },
  {
    title: "2. Compte utilisateur",
    body:
      "L’utilisateur doit fournir des informations exactes lors de l’inscription et garder ses identifiants confidentiels. Toute activité réalisée depuis son compte est présumée faite par lui, sauf preuve contraire.",
  },
  {
    title: "3. Respect dans la communauté",
    body:
      "Les contenus haineux, violents, diffamatoires, discriminatoires, frauduleux ou contraires à l’esprit de l’application sont interdits. L’administration peut refuser, modifier, masquer ou supprimer un contenu soumis à modération.",
  },
  {
    title: "4. Témoignages et contenus envoyés",
    body:
      "Les témoignages, messages, audios et demandes envoyés par l’utilisateur peuvent être relus par les administrateurs. Un témoignage n’apparaît publiquement qu’après validation administrative.",
  },
  {
    title: "5. Dons et offrandes",
    body:
      "La fonctionnalité dons et offrandes permet de transmettre une intention à l’administration. L’application ne remplace pas les justificatifs officiels, reçus ou procédures financières propres à l’organisation.",
  },
  {
    title: "6. Contenus et ressources",
    body:
      "Les livres, podcasts, vidéos, replays et autres ressources sont proposés pour un usage personnel. Toute reproduction, redistribution ou exploitation non autorisée peut être interdite selon les droits attachés à chaque contenu.",
  },
  {
    title: "7. Disponibilité",
    body:
      "L’équipe Kabod cherche à maintenir l’application disponible et fiable, mais ne garantit pas une disponibilité permanente. Des interruptions peuvent survenir pour maintenance, incident technique ou évolution du service.",
  },
  {
    title: "8. Modification des conditions",
    body:
      "Ces conditions peuvent évoluer. En cas de modification importante, les utilisateurs pourront être informés dans l’application ou par tout moyen approprié.",
  },
];

export default function TermsPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.blueDark} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={28} color={COLORS.gold} />
          </View>
          <Text style={styles.title}>Conditions d’utilisation</Text>
          <Text style={styles.subtitle}>Dernière mise à jour : 13 juillet 2026</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Ces conditions posent les règles d’usage de Kabod. Elles doivent être relues et validées par le responsable légal avant publication officielle.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  container: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "800" },
  hero: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { color: COLORS.blueDark, fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { color: COLORS.gray, fontSize: 13, fontWeight: "700", marginTop: 6 },
  notice: {
    backgroundColor: COLORS.goldSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F4E5AD",
  },
  noticeText: { color: COLORS.blueDark, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900", marginBottom: 8 },
  body: { color: COLORS.gray, fontSize: 14, lineHeight: 21, fontWeight: "600" },
});
