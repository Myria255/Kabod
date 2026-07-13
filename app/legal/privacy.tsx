import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. Données collectées",
    body:
      "Kabod collecte les informations nécessaires à la création et à l’utilisation du compte : prénom, nom, email, mot de passe sécurisé par Supabase Auth, âge si renseigné, sexe, situation, profession, pays, ville, communauté choisie, préférences de notifications et contenus envoyés volontairement dans l’application.",
  },
  {
    title: "2. Pourquoi ces données sont utilisées",
    body:
      "Ces données servent à créer le compte, sécuriser la connexion, personnaliser l’expérience, gérer les communautés, afficher les contenus, envoyer les notifications demandées et permettre aux administrateurs de modérer les témoignages, demandes de soutien, dons et publications.",
  },
  {
    title: "3. Données sensibles",
    body:
      "Kabod est une application à dimension spirituelle. Les messages, témoignages, demandes de prière ou contenus partagés peuvent révéler des convictions religieuses. L’utilisateur choisit librement ce qu’il partage. Les contenus soumis à modération peuvent être lus par les administrateurs autorisés.",
  },
  {
    title: "4. Hébergement et sous-traitants",
    body:
      "Les données applicatives sont principalement traitées via Supabase. Les livres et documents peuvent être stockés via Cloudflare R2. Les notifications peuvent utiliser les services Expo et les plateformes mobiles. Ces services sont utilisés uniquement pour faire fonctionner l’application.",
  },
  {
    title: "5. Durée de conservation",
    body:
      "Les données du compte sont conservées tant que le compte existe. Les contenus publiés ou soumis peuvent être conservés jusqu’à suppression par l’utilisateur, refus, archivage ou suppression administrative. Les demandes RGPD sont conservées le temps nécessaire à leur traitement et à la preuve de réponse.",
  },
  {
    title: "6. Vos droits",
    body:
      "Vous pouvez demander l’accès, la correction, la suppression ou la limitation du traitement de vos données. Une page dédiée est disponible dans Profil > Mes données personnelles.",
  },
  {
    title: "7. Sécurité",
    body:
      "Kabod utilise l’authentification Supabase, des politiques de sécurité côté base de données et des droits d’accès différenciés entre membres et administrateurs. Aucun système n’est parfait, mais l’application limite l’accès aux données selon les rôles.",
  },
  {
    title: "8. Contact",
    body:
      "Pour toute question sur les données personnelles, utilisez la page Mes données personnelles dans l’application ou contactez l’équipe Kabod par le canal officiel communiqué par l’organisation.",
  },
];

export default function PrivacyPolicyPage() {
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
            <Ionicons name="shield-checkmark-outline" size={28} color={COLORS.gold} />
          </View>
          <Text style={styles.title}>Politique de confidentialité</Text>
          <Text style={styles.subtitle}>Dernière mise à jour : 13 juillet 2026</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Cette page explique simplement quelles données Kabod collecte et comment elles sont utilisées.
            Elle devra être validée par le responsable légal de l’application avant publication officielle.
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
    backgroundColor: COLORS.blueSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDE6FF",
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
