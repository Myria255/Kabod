import { COLORS } from "@/src/constants/colors";
import {
  createDonationIntent,
  paymentMethodLabel,
  type DonationGiftType,
  type DonationPaymentMethod,
} from "@/src/services/donationIntentSupabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Frequency = "once" | "monthly";

const AMOUNTS = [5, 10, 25, 50, 100];
const PAYMENT_METHODS: DonationPaymentMethod[] = ["mobile_money", "paypal", "virement", "especes", "a_definir"];

const GIFT_TYPES: {
  id: DonationGiftType;
  title: string;
  text: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    id: "offrande",
    title: "Offrande",
    text: "Soutenir la mission spirituelle et les contenus Kabod.",
    icon: "hand-heart-outline",
  },
  {
    id: "dime",
    title: "Dîme",
    text: "Exprimer votre fidélité et votre reconnaissance.",
    icon: "church-outline",
  },
  {
    id: "don",
    title: "Don libre",
    text: "Participer librement au développement de l’application.",
    icon: "gift-outline",
  },
  {
    id: "solidarite",
    title: "Solidarité",
    text: "Contribuer aux actions d’aide et de soutien communautaire.",
    icon: "account-heart-outline",
  },
  {
    id: "mission",
    title: "Mission",
    text: "Soutenir l’évangélisation et les projets missionnaires.",
    icon: "earth",
  },
];

export default function DonationPage() {
  const router = useRouter();
  const [giftType, setGiftType] = useState<DonationGiftType>("offrande");
  const [frequency, setFrequency] = useState<Frequency>("once");
  const [paymentMethod, setPaymentMethod] = useState<DonationPaymentMethod>("a_definir");
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const finalAmount = useMemo(() => {
    const parsed = Number(customAmount.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : selectedAmount;
  }, [customAmount, selectedAmount]);

  async function sendDonationIntent() {
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert("Montant requis", "Choisissez ou saisissez un montant.");
      return;
    }

    setSending(true);
    try {
      await createDonationIntent({
        giftType,
        amount: finalAmount,
        frequency,
        paymentMethod,
        note,
      });

      Alert.alert(
        "Demande envoyée",
        "Votre intention de don a été transmise à l’administration. Vous serez recontacté pour finaliser la contribution.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’envoyer votre intention de don.";
      Alert.alert("Envoi impossible", message);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Communauté</Text>
            <Text style={styles.title}>Don / offrande</Text>
            <Text style={styles.subtitle}>Envoyez une intention de contribution à l’administration.</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="heart-multiple-outline" size={30} color={COLORS.blueDark} />
          </View>
          <Text style={styles.heroTitle}>Votre générosité construit l’œuvre.</Text>
          <Text style={styles.heroText}>
            Chaque contribution aide à rendre les ressources spirituelles plus accessibles aux communautés.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Je veux contribuer pour</Text>
          <View style={styles.typeList}>
            {GIFT_TYPES.map((type) => (
              <Pressable
                key={type.id}
                style={[styles.typeCard, giftType === type.id && styles.typeCardActive]}
                onPress={() => setGiftType(type.id)}
              >
                <View style={[styles.typeIcon, giftType === type.id && styles.typeIconActive]}>
                  <MaterialCommunityIcons
                    name={type.icon}
                    size={23}
                    color={giftType === type.id ? COLORS.blueDark : COLORS.gold}
                  />
                </View>
                <View style={styles.typeCopy}>
                  <Text style={[styles.typeTitle, giftType === type.id && styles.typeTitleActive]}>{type.title}</Text>
                  <Text style={[styles.typeText, giftType === type.id && styles.typeTextActive]}>{type.text}</Text>
                </View>
                <Ionicons
                  name={giftType === type.id ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={giftType === type.id ? COLORS.gold : COLORS.gray}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Montant</Text>
          <View style={styles.amountGrid}>
            {AMOUNTS.map((amount) => (
              <Pressable
                key={amount}
                style={[styles.amountButton, !customAmount && selectedAmount === amount && styles.amountButtonActive]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
              >
                <Text style={styles.amountText}>{amount} €</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={customAmount}
            onChangeText={setCustomAmount}
            keyboardType="decimal-pad"
            placeholder="Autre montant"
            placeholderTextColor={COLORS.gray}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fréquence</Text>
          <View style={styles.frequencyRow}>
            <Pressable
              style={[styles.frequencyButton, frequency === "once" && styles.frequencyButtonActive]}
              onPress={() => setFrequency("once")}
            >
              <Text style={[styles.frequencyText, frequency === "once" && styles.frequencyTextActive]}>Une fois</Text>
            </Pressable>
            <Pressable
              style={[styles.frequencyButton, frequency === "monthly" && styles.frequencyButtonActive]}
              onPress={() => setFrequency("monthly")}
            >
              <Text style={[styles.frequencyText, frequency === "monthly" && styles.frequencyTextActive]}>Mensuel</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moyen prévu</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method}
                style={[styles.paymentButton, paymentMethod === method && styles.paymentButtonActive]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextActive]}>
                  {paymentMethodLabel(method)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note optionnelle</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ex : pour la mission, les jeunes, une action solidaire..."
            placeholderTextColor={COLORS.gray}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.noteInput]}
          />
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total indiqué</Text>
            <Text style={styles.summaryAmount}>{finalAmount.toFixed(2)} €</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{frequency === "monthly" ? "Mensuel" : "Une fois"}</Text>
          </View>
        </View>

        <Pressable style={[styles.continueButton, sending && styles.disabled]} onPress={sendDonationIntent} disabled={sending}>
          {sending ? (
            <ActivityIndicator color={COLORS.blueDark} />
          ) : (
            <>
              <Text style={styles.continueText}>Envoyer à l’administration</Text>
              <Ionicons name="send-outline" size={16} color={COLORS.blueDark} />
            </>
          )}
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.gray} />
          <Text style={styles.infoText}>
            Cette page envoie une intention de don. Le paiement direct pourra être branché plus tard avec un prestataire sécurisé.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F3EA" },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 16,
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  heroCard: { borderRadius: 30, backgroundColor: COLORS.blueDark, padding: 22, gap: 12 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: COLORS.white, fontSize: 26, lineHeight: 32, fontWeight: "900" },
  heroText: { color: "#D1D5DB", fontSize: 14, lineHeight: 22 },
  section: { gap: 10 },
  sectionTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  typeList: { gap: 10 },
  typeCard: {
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeCardActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconActive: { backgroundColor: COLORS.gold },
  typeCopy: { flex: 1, gap: 3 },
  typeTitle: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  typeTitleActive: { color: COLORS.white },
  typeText: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
  typeTextActive: { color: "#D1D5DB" },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  amountButton: {
    minWidth: 74,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  amountButtonActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  amountText: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  input: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: "700",
  },
  noteInput: { minHeight: 94, paddingTop: 14, lineHeight: 20 },
  frequencyRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 5,
    gap: 5,
  },
  frequencyButton: { flex: 1, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  frequencyButtonActive: { backgroundColor: COLORS.blueDark },
  frequencyText: { color: COLORS.gray, fontSize: 13, fontWeight: "900" },
  frequencyTextActive: { color: COLORS.white },
  paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paymentButton: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentButtonActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  paymentText: { color: COLORS.gray, fontSize: 12, fontWeight: "900" },
  paymentTextActive: { color: COLORS.white },
  summaryCard: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  summaryAmount: { color: COLORS.blueDark, fontSize: 27, fontWeight: "900", marginTop: 2 },
  summaryPill: { borderRadius: 999, backgroundColor: COLORS.goldSoft, paddingHorizontal: 12, paddingVertical: 7 },
  summaryPillText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  continueButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueText: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  infoBox: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  infoText: { flex: 1, color: COLORS.gray, fontSize: 12.5, lineHeight: 19, fontWeight: "600" },
});
