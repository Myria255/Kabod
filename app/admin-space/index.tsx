import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import {
  getAdminDashboardCounts,
  markAdminRouteSeen,
  type AdminDashboardCounts,
} from "@/src/services/adminDashboardSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ADMIN_MODULES = [
  {
    id: "priere",
    icon: "hands-pray" as const,
    title: "Espace Prière",
    text: "Gérer les podcasts, les prières de l'administrateur et les sujets journaliers.",
    route: "/admin-space/priere",
  },
  {
    id: "lives",
    icon: "broadcast" as const,
    title: "Lives & Diffusion",
    text: "Lancer vos directs, préparer les cultes en streaming et organiser les replays.",
    route: "/admin-space/lives",
  },
  {
    id: "evenements",
    icon: "calendar-star" as const,
    title: "Événements",
    text: "Publier les rendez-vous à venir et gérer le calendrier de la communauté.",
    route: "/admin-space/evenements",
  },
  {
    id: "livres",
    icon: "book-open-page-variant-outline" as const,
    title: "Livres & documents",
    text: "Ajouter des PDF, EPUB et ressources à lire ou télécharger.",
    route: "/admin-space/livres",
  },
  {
    id: "communaute",
    icon: "account-group" as const,
    title: "Communauté",
    text: "Gérer les groupes, créer de nouvelles communautés et suivre les membres.",
    route: "/admin-space/communaute-management",
  },
  {
    id: "fil-communaute",
    icon: "message-text-outline" as const,
    title: "Fil communautaire",
    text: "Publier des annonces, encouragements et messages par communauté.",
    route: "/admin-space/fil-communaute",
  },
  {
    id: "temoignages",
    icon: "message-star-outline" as const,
    title: "Témoignages",
    text: "Relire, corriger, approuver ou refuser les témoignages des membres.",
    route: "/admin-space/temoignages",
  },
  {
    id: "requetes-soutien",
    icon: "heart-pulse" as const,
    title: "Requêtes & soutien",
    text: "Lire et traiter les demandes de prière, soutien et accompagnement.",
    route: "/admin-space/requetes-soutien",
  },
  {
    id: "dons",
    icon: "hand-heart-outline" as const,
    title: "Dons & offrandes",
    text: "Suivre les intentions de dons, dîmes, offrandes et soutiens.",
    route: "/admin-space/dons",
  },
  {
    id: "donnees-rgpd",
    icon: "shield-check-outline" as const,
    title: "Demandes RGPD",
    text: "Traiter les demandes d’accès, correction, suppression ou limitation des données.",
    route: "/admin-space/donnees-rgpd",
  },
];

const EMPTY_COUNTS: AdminDashboardCounts = {
  testimonies: 0,
  supportRequests: 0,
  donationIntents: 0,
  privacyRequests: 0,
  total: 0,
};

export default function AdminHomePage() {
  const { user } = useUser();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [counts, setCounts] = useState<AdminDashboardCounts>(EMPTY_COUNTS);

  // Charger la photo locale
  useEffect(() => {
    const loadLocalPhoto = async () => {
      try {
        if (user?.user_id) {
          const savedImage = await AsyncStorage.getItem(`profile_image_${user.user_id}`);
          if (savedImage) setProfileImage(savedImage);
        }
      } catch {
        // La photo locale est optionnelle : on garde simplement l'avatar par défaut.
      }
    };
    loadLocalPhoto();
  }, [user?.user_id]);

  const loadDashboardCounts = useCallback(async () => {
    try {
      setCounts(await getAdminDashboardCounts());
    } catch {
      setCounts(EMPTY_COUNTS);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardCounts();
    }, [loadDashboardCounts])
  );

  const getModuleBadge = (id: string) => {
    if (id === "temoignages") return counts.testimonies;
    if (id === "requetes-soutien") return counts.supportRequests;
    if (id === "dons") return counts.donationIntents;
    if (id === "donnees-rgpd") return counts.privacyRequests;
    return 0;
  };

  const openModule = async (route: string) => {
    try {
      await markAdminRouteSeen(route);
      await loadDashboardCounts();
    } catch {
      // La navigation reste prioritaire : si le marquage échoue, l'admin peut quand même traiter.
    }
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HEADER ROYAL ACCUEIL */}
        <View style={styles.header}>
          <View style={styles.headerProfileBox}>
             <TouchableOpacity 
               onPress={() => router.push("/admin-space/profil")}
               style={styles.avatarBox}
             >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient colors={[COLORS.gold, '#F9E79F']} style={styles.avatarGrad}>
                    <Text style={styles.avatarText}>{(user?.nom?.[0] ?? "A").toUpperCase()}</Text>
                  </LinearGradient>
                )}
             </TouchableOpacity>
             <View>
                <Text style={styles.welcomeText}>PAIX ET GRÂCE,</Text>
                <Text style={styles.adminName}>{user?.nom ?? "Administrateur"}</Text>
             </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push("/admin-space/notifications" as any)}>
               <Ionicons name="notifications-outline" size={22} color={COLORS.blueDark} />
               {counts.total > 0 ? (
                 <View style={styles.headerBadge}>
                   <Text style={styles.headerBadgeText}>{counts.total > 99 ? "99+" : counts.total}</Text>
                 </View>
               ) : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/admin-space/profil")}>
               <Ionicons name="settings-outline" size={22} color={COLORS.blueDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* HERO SACRED */}
        <View style={styles.heroBox}>
           <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.heroGrad}>
              <View style={styles.heroContent}>
                 <View style={styles.badge}>
                    <MaterialCommunityIcons name="shield-check" size={12} color={COLORS.gold} />
                    <Text style={styles.badgeText}>CONSOLE DE GESTION KABOD</Text>
                 </View>
                 <Text style={styles.heroTitle}>Pilotez votre Vision</Text>
                 <Text style={styles.heroSubtitle}>Gérez les contenus et la diffusion de l’application depuis votre espace sécurisé.</Text>
              </View>
              {/* Cercles décoratifs or */}
              <View style={[styles.decorCircle, { top: -40, right: -40 }]} />
              <View style={[styles.decorCircle, { bottom: -60, left: -20, opacity: 0.1 }]} />
           </LinearGradient>
        </View>

        {/* STATS ROW PRESTIGE */}
        <View style={styles.statsRow}>
           <View style={styles.statCard}>
              <View style={styles.statIconBox}>
                 <MaterialCommunityIcons name="view-dashboard-outline" size={18} color={COLORS.gold} />
              </View>
              <View>
                 <Text style={styles.statValue}>{ADMIN_MODULES.length}</Text>
                 <Text style={styles.statLabel}>MODULES ACTIFS</Text>
              </View>
           </View>
           <View style={styles.statCard}>
              <View style={styles.statIconBox}>
                 <MaterialCommunityIcons name="bell-badge-outline" size={18} color={COLORS.gold} />
              </View>
              <View>
                 <Text style={styles.statValue}>{counts.total}</Text>
                 <Text style={styles.statLabel}>A TRAITER</Text>
              </View>
           </View>
        </View>

        {/* MODULES GRID */}
        <View style={styles.modulesSection}>
           <Text style={styles.sectionTitle}>TABLEAU DE BORD</Text>
           <View style={styles.modulesGrid}>
              {ADMIN_MODULES.map((item) => {
                const badgeCount = getModuleBadge(item.id);
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.sacredCard}
                    onPress={() => openModule(item.route)}
                  >
                    <View style={styles.leftBar} />
                    {badgeCount > 0 ? (
                      <View style={styles.moduleBadge}>
                        <Text style={styles.moduleBadgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
                      </View>
                    ) : null}
                    <View style={styles.cardTop}>
                       <View style={styles.iconBox}>
                          <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.iconGrad}>
                             <MaterialCommunityIcons name={item.icon as any} size={24} color={COLORS.gold} />
                          </LinearGradient>
                       </View>
                       <View style={styles.cardContent}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <Text style={styles.cardSubtitle}>{item.text}</Text>
                       </View>
                       <Ionicons name="chevron-forward" size={18} color={COLORS.gold} />
                    </View>
                  </TouchableOpacity>
                );
              })}
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingBottom: 40 },

  header: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginTop: 10,
  },
  headerProfileBox: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarBox: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.gold },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.blueDark, fontSize: 18, fontWeight: '900' },
  avatarImage: { width: '100%', height: '100%' },
  welcomeText: { fontSize: 10, fontWeight: '900', color: COLORS.gold, letterSpacing: 1.5 },
  adminName: { fontSize: 18, fontWeight: '900', color: COLORS.blueDark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notificationBtn: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  settingsBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },

  heroBox: { paddingHorizontal: 20, marginTop: 10 },
  heroGrad: { borderRadius: 32, padding: 25, position: 'relative', overflow: 'hidden' },
  heroContent: { zIndex: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText: { color: COLORS.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  heroSubtitle: { fontSize: 12, color: '#D1D5DB', lineHeight: 18, maxWidth: '80%' },
  decorCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.gold, opacity: 0.15 },

  statsRow: { flexDirection: 'row', gap: 15, paddingHorizontal: 20, marginTop: 25 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 2, borderColor: '#F1F5F9', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statValue: { fontSize: 18, fontWeight: '900', color: COLORS.blueDark },
  statLabel: { fontSize: 8, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },

  modulesSection: { marginTop: 35, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: COLORS.gold, letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  modulesGrid: { gap: 16 },
  sacredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  moduleBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    zIndex: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moduleBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  leftBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: COLORS.gold },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconBox: { width: 54, height: 54, borderRadius: 16, overflow: 'hidden' },
  iconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: COLORS.blueDark, marginBottom: 2 },
  cardSubtitle: { fontSize: 11, color: '#64748B', lineHeight: 16 },
});
