import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PodcastTab() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="mic-outline" size={28} color={COLORS.gold} />
        </View>
        <Text style={styles.title}>Podcast</Text>
        <Text style={styles.subtitle}>Retrouvez ici vos audios de meditation et de priere.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  title: {
    marginTop: 14,
    color: COLORS.blueDark,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
