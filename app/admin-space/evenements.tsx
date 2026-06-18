import { COLORS } from "@/src/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EVENT_SECTIONS = [
  {
    id: "calendar",
    icon: "calendar-clock",
    title: "Événements à venir",
    text: "Préparer les rendez-vous, cultes, rencontres et temps forts de la communauté.",
    btnText: "OUVRIR LE CALENDRIER",
  }
];

export default function AdminEventsPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HEADER ROYAL */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.blueDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>ÉVÉNEMENTS</Text>
            <View style={styles.goldLine} />
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* HERO SECTION */}
        <View style={styles.hero}>
           <Text style={styles.heroSubtitle}>Planifiez et diffusez les prochains moments forts de la vie de l'église.</Text>
        </View>

        {/* MENU CARDS */}
        <View style={styles.menuGrid}>
          {EVENT_SECTIONS.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.sacredCard}
              onPress={() => router.push("/admin-space/evenement-a-venir")}
            >
              <View style={styles.leftBar} />
              <View style={styles.cardHeader}>
                 <View style={styles.iconBox}>
                    <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.iconGrad}>
                       <MaterialCommunityIcons name={item.icon as any} size={26} color={COLORS.gold} />
                    </LinearGradient>
                 </View>
                 <View style={styles.headerText}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.text}</Text>
                 </View>
              </View>

              <View style={styles.cardFooter}>
                 <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>{item.btnText}</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.gold} />
                 </LinearGradient>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingBottom: 40 },
  
  header: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginTop: 10,
  },
  backBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 3 },
  goldLine: { width: 25, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginTop: 4 },
  headerPlaceholder: { width: 45 },

  hero: { paddingHorizontal: 25, marginTop: 10, marginBottom: 30 },
  heroSubtitle: { fontSize: 14, color: '#5D6475', lineHeight: 22, textAlign: 'center' },

  menuGrid: { paddingHorizontal: 20, gap: 20 },
  sacredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  leftBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: COLORS.gold },
  cardHeader: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  iconBox: { width: 62, height: 62, borderRadius: 20, overflow: 'hidden' },
  iconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.blueDark, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  
  cardFooter: { marginTop: 22 },
  actionBtn: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});
