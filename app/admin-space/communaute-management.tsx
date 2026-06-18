import { COLORS } from "@/src/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');

type CommunityRecord = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'draft';
  memberCount: number;
};

export default function CommunauteManagementPage() {
  const router = useRouter();

  const [items, setItems] = useState<CommunityRecord[]>([
    { id: '1', name: 'Communauté Jeune', description: 'Groupe dédié aux jeunes de 15 à 40 ans, célibataires.', icon: 'account-multiple', status: 'active', memberCount: 124 },
    { id: '2', name: 'Communauté des Mariés', description: 'Espace d\'échange et de partage pour les couples mariés.', icon: 'heart', status: 'active', memberCount: 86 },
  ]);

  async function handleDelete(item: CommunityRecord) {
    Alert.alert("Supprimer", `Voulez-vous supprimer la communauté "${item.name}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: () => {
          setItems(items.filter(it => it.id !== item.id));
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER ROYAL */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.blueDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>COMMUNAUTÉ</Text>
            <View style={styles.goldLine} />
          </View>
          <TouchableOpacity onPress={() => router.push("/admin-space/communaute-create")} style={styles.addSealBtn}>
            <LinearGradient colors={[COLORS.gold, '#F9E79F']} style={styles.addSealGrad}>
              <MaterialCommunityIcons name="plus-thick" size={28} color={COLORS.blueDark} />
            </LinearGradient>
            <View style={styles.sealRing} />
          </TouchableOpacity>
        </View>

        {/* LISTE DES COMMUNAUTÉS (PREMIUM) */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <View style={styles.libraryHeaderText}>
              <Text style={styles.libraryTitle}>Vos Groupes & Ministères</Text>
              <Text style={styles.librarySubtitle}>Gérez les espaces d'échange de votre église.</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          </View>

          <View style={styles.list}>
            {items.map((item) => (
              <Swipeable
                key={item.id}
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable style={styles.deleteSwipeBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                    <Text style={styles.deleteSwipeText}>Supprimer</Text>
                  </Pressable>
                )}
              >
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => { }} // Pourrait ouvrir l'édition
                >
                  <View style={styles.leftBar} />

                  <View style={styles.itemIconBox}>
                    <LinearGradient colors={[COLORS.blueDark, '#1E293B']} style={styles.itemIconGrad}>
                      <MaterialCommunityIcons name={(item.icon || "account-group") as any} size={26} color={COLORS.gold} />
                    </LinearGradient>
                  </View>

                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitleText} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemDescText} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.itemMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#10B981' : '#94A3B8' }]}>
                        <Text style={styles.statusLabel}>{item.status === 'active' ? 'ACTIF' : 'BROUILLON'}</Text>
                      </View>
                      <View style={styles.memberBox}>
                        <Ionicons name="people" size={10} color="#64748B" />
                        <Text style={styles.memberCountText}>{item.memberCount} membres</Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="rgba(15, 23, 42, 0.15)" />
                </TouchableOpacity>
              </Swipeable>
            ))}
          </View>
        </View>

        {/* TIPS SECTION */}
        <View style={styles.tipsBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.gold} />
          <Text style={styles.tipsText}>Glissez vers la gauche sur une communauté pour la supprimer définitivement.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 60 },

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
  headerTitle: { fontSize: 12, fontWeight: '900', color: COLORS.blueDark, letterSpacing: 2 },
  goldLine: { width: 25, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginTop: 4 },
  addSealBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  addSealGrad: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sealRing: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.4)', zIndex: 1 },

  librarySection: { marginTop: 30, paddingHorizontal: 20 },
  libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  libraryHeaderText: { flex: 1 },
  libraryTitle: { fontSize: 18, fontWeight: '900', color: COLORS.blueDark },
  librarySubtitle: { fontSize: 12, color: '#5D6475', marginTop: 2 },
  countBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '900', color: COLORS.blueDark },

  list: { gap: 16 },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  leftBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: COLORS.gold },
  itemIconBox: { width: 58, height: 58, borderRadius: 18, overflow: 'hidden' },
  itemIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, marginLeft: 15 },
  itemTitleText: { fontSize: 16, fontWeight: '900', color: COLORS.blueDark, marginBottom: 2 },
  itemDescText: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusLabel: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  memberBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCountText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  deleteSwipeBtn: { backgroundColor: '#EF4444', width: 100, borderRadius: 24, marginLeft: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteSwipeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  tipsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, marginTop: 40, opacity: 0.6 },
  tipsText: { fontSize: 11, color: '#64748B', flex: 1, lineHeight: 16 },
});
