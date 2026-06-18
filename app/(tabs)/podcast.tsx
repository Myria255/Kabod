import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MainTab = "podcasts" | "lives";

export default function PodcastTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>("podcasts");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.title}>Podcasts & lives</Text>
              <Text style={styles.subtitle}>
                Choisissez le type de contenu que vous voulez parcourir dans un espace organise et lisible.
              </Text>
            </View>
            <Pressable style={styles.notificationBtn}>
              <Ionicons name="headset-outline" size={20} color={COLORS.blueDark} />
            </Pressable>
          </View>

          <View style={styles.mainSwitch}>
            <Pressable
              style={[styles.mainSwitchBtn, activeTab === "podcasts" && styles.mainSwitchBtnActive]}
              onPress={() => setActiveTab("podcasts")}
            >
              <Text style={[styles.mainSwitchText, activeTab === "podcasts" && styles.mainSwitchTextActive]}>
                Podcasts
              </Text>
            </Pressable>
            <Pressable
              style={[styles.mainSwitchBtn, activeTab === "lives" && styles.mainSwitchBtnActive]}
              onPress={() => setActiveTab("lives")}
            >
              <Text style={[styles.mainSwitchText, activeTab === "lives" && styles.mainSwitchTextActive]}>
                Lives
              </Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{activeTab === "podcasts" ? "PUBLIES" : "DIFFUSION"}</Text>
            </View>
            <Text style={styles.heroTitle}>
              {activeTab === "podcasts" ? "Explorez les podcasts admin" : "Suivez les lives et replays"}
            </Text>
            <Text style={styles.heroDescription}>
              {activeTab === "podcasts"
                ? "Parcourez les audios et les liens video publies par l'administration."
                : "Retrouvez les directs et les replays dans des vues separees et plus lisibles."}
            </Text> 
          </View>

          {activeTab === "podcasts" ? (
            <View style={styles.dualButtonsRow}>
              <Pressable style={styles.choiceCard} onPress={() => router.push('/podcast/audio')}>
                <View style={styles.choiceIconWrap}>
                  <Ionicons name="musical-notes-outline" size={22} color={COLORS.gold} />
                </View>
                <Text style={styles.choiceTitle}>Audios</Text>
                <Text style={styles.choiceText}>Voir tous les podcasts audio publies.</Text>
              </Pressable>

              <Pressable style={styles.choiceCard} onPress={() => router.push('/podcast/video')}>
                <View style={styles.choiceIconWrap}>
                  <Ionicons name="logo-youtube" size={22} color={COLORS.gold} />
                </View>
                <Text style={styles.choiceTitle}>Lien video</Text>
                <Text style={styles.choiceText}>Voir tous les podcasts video et liens externes.</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.dualButtonsRow}>
              <Pressable style={styles.choiceCard} onPress={() => router.push('/podcast/lives')}>
                <View style={styles.choiceIconWrap}>
                  <Ionicons name="radio-outline" size={22} color={COLORS.gold} />
                </View>
                <Text style={styles.choiceTitle}>Lives</Text>
                <Text style={styles.choiceText}>Voir les directs programmes, en cours ou termines.</Text>
              </Pressable>

              <Pressable style={styles.choiceCard} onPress={() => router.push('/podcast/replays')}>
                <View style={styles.choiceIconWrap}>
                  <Ionicons name="play-circle-outline" size={22} color={COLORS.gold} />
                </View>
                <Text style={styles.choiceTitle}>Replays</Text>
                <Text style={styles.choiceText}>Voir les replays accessibles et les contenus rediffuses.</Text>
              </Pressable>
            </View>
          )}

            {/*<View style={styles.infoStrip}>
            <Ionicons name="sparkles-outline" size={18} color={COLORS.gold} />
          <Text style={styles.infoText}>
              {activeTab === "podcasts"
                ? "Les podcasts sont separes en audio et video pour rendre la navigation plus simple."
                : "Les lives et les replays ont maintenant chacun leur propre vue detaillee."}
            </Text>
          
          </View>*/}
        </View>  
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 36 },
  page: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: { color: COLORS.gray, fontSize: 15, fontWeight: "600" },
  title: { marginTop: 2, color: COLORS.blueDark, fontSize: 28, fontWeight: "800" },
  subtitle: { marginTop: 6, color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mainSwitch: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  mainSwitchBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mainSwitchBtnActive: { backgroundColor: "#FFFFFF" },
  mainSwitchText: { color: COLORS.gray, fontSize: 14, fontWeight: "600" },
  mainSwitchTextActive: { color: COLORS.blueDark, fontWeight: "700" },
  heroCard: {
    backgroundColor: COLORS.blueDark,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  heroBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: { color: COLORS.blueDark, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { marginTop: 12, color: COLORS.white, fontSize: 24, fontWeight: "800" },
  heroDescription: { marginTop: 8, color: "#E2E8F0", fontSize: 14, lineHeight: 21 },
  dualButtonsRow: { flexDirection: "row", gap: 12 },
  choiceCard: {
    flex: 1,
    minHeight: 172,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    padding: 16,
    gap: 12,
    justifyContent: "space-between",
  },
  choiceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "800" },
  choiceText: { color: COLORS.gray, fontSize: 13, lineHeight: 19 },
  infoStrip: {
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, color: COLORS.gray, fontSize: 13, lineHeight: 18 },
});
