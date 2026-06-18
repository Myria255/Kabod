import { COLORS } from "@/src/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LIVE_SECTIONS = [
  {
    id: "stream",
    icon: "broadcast" as const,
    title: "Streaming de cultes",
    text: "Programmer un direct, le passer en live puis le terminer quand la diffusion est finie.",
    btnText: "OUVRIR LE DIRECT",
  },
  {
    id: "replay",
    icon: "play-box-multiple-outline" as const,
    title: "Replay des événements",
    text: "Retrouver les directs terminés et leur associer un vrai lien replay dans un espace séparé.",
    btnText: "OUVRIR LES REPLAYS",
  },
];

export default function AdminLivesPage() {
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
            <Text style={styles.headerTitle}>LIVES & DIFFUSION</Text>
            <View style={styles.goldLine} />
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* HERO SECTION */}
        <View style={styles.hero}>
           <Text style={styles.heroSubtitle}>Gérez tout le cycle de vie de vos diffusions en direct et l’organisation des replays.</Text>
        </View>

        {/* SECTION CARDS */}
        <View style={styles.menuGrid}>
          {LIVE_SECTIONS.map((item) => (
            <View key={item.id} style={styles.sacredCard}>
              <View style={styles.leftBar} />
              
              <View style={styles.cardHeader}>
                 <View style={styles.iconBox}>
                    <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.iconGrad}>
                       <MaterialCommunityIcons name={item.icon as any} size={26} color={COLORS.gold} />
                    </LinearGradient>
                 </View>
                 <View style={styles.headerText}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                 </View>
              </View>

              <Text style={styles.cardSubtitle}>{item.text}</Text>

              <TouchableOpacity 
                style={styles.actionBtnWrapper}
                onPress={() => router.push(item.id === "stream" ? "/admin-space/live-cultes" : "/admin-space/replay-evenements")}
              >
                 <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>{item.btnText}</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.gold} />
                 </LinearGradient>
              </TouchableOpacity>
            </View>
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
  cardHeader: { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 56, height: 56, borderRadius: 18, overflow: 'hidden' },
  iconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: COLORS.blueDark },
  cardSubtitle: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 20 },
  
  actionBtnWrapper: { marginTop: 5 },
  actionBtn: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});
