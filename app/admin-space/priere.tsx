import { COLORS } from "@/src/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  StatusBar,
  Dimensions,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

export default function AdminPrayerPage() {
  const router = useRouter();

  const ModuleCard = ({ title, icon, onPress, subtitle }: any) => (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={styles.moduleCard} 
      onPress={onPress}
    >
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon} size={32} color={COLORS.gold} />
      </View>
      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.moduleSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Navigation */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={22} color={COLORS.blueDark} />
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>ESPACE DE PRIÈRE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Intro Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bienvenue dans votre</Text>
          <Text style={styles.mainTitle}>Ministère de Prière</Text>
          <View style={styles.accentLine} />
        </View>

        {/* Modules Grid */}
        <View style={styles.grid}>
          <ModuleCard 
            title="Podcast" 
            subtitle="Méditations audio"
            icon="microphone" 
            onPress={() => router.push("/admin-space/podcast-priere")} 
          />
          <ModuleCard 
            title="Prière Admin" 
            subtitle="Textes officiels"
            icon="heart-outline" 
            onPress={() => router.push("/admin-space/priere-administrateur")} 
          />
          <ModuleCard 
            title="Sujet du Jour" 
            subtitle="Thème quotidien"
            icon="calendar-check" 
            onPress={() => router.push("/admin-space/sujet-journalier")} 
          />
        </View>

        {/* Motivation Section */}
        <View style={styles.motivationSection}>
           <Text style={styles.motivationTitle}>VOTRE MISSION</Text>
           <Text style={styles.motivationText}>
             « La prière fervente a une grande efficace. » Chaque contenu publié ici soutient la foi de milliers de fidèles à travers le monde.
           </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  navbar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbarTitle: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: COLORS.blueDark, 
    letterSpacing: 1.5 
  },
  
  scrollContent: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 20,
  },
  greeting: { fontSize: 16, color: COLORS.gray, fontWeight: '600' },
  mainTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: COLORS.blueDark, 
    marginTop: 6,
    letterSpacing: -0.5
  },
  accentLine: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gold,
    marginTop: 12,
    borderRadius: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginTop: 20,
  },
  moduleCard: {
    width: CARD_SIZE,
    height: CARD_SIZE + 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: COLORS.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  moduleTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: COLORS.blueDark,
    textAlign: 'center'
  },
  moduleSubtitle: { 
    fontSize: 13, 
    color: COLORS.gray, 
    marginTop: 6, 
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  },

  motivationSection: {
    marginTop: 30,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  motivationTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
  }
});
