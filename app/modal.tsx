import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ModalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="information-circle-outline" size={28} color={COLORS.blueDark} />
        </View>
        <Text style={styles.title}>Information</Text>
        <Text style={styles.text}>Cette fenêtre reprend maintenant le style visuel de Kabod.</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Fermer</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: COLORS.grayLight,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.blueDark, fontSize: 22, fontWeight: "900" },
  text: { color: COLORS.gray, fontSize: 14, lineHeight: 21, textAlign: "center" },
  button: {
    marginTop: 8,
    height: 48,
    alignSelf: "stretch",
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: "900" },
});
