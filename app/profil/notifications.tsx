import { COLORS } from "@/src/constants/colors";
import {
  applySpiritualNotificationSettings,
  formatReminderTime,
  loadSpiritualNotificationSettings,
  saveSpiritualNotificationSettings,
  type SpiritualNotificationSettings,
  type SpiritualReminder,
  type SpiritualReminderId,
} from "@/src/services/spiritualNotifications";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ORDER: SpiritualReminderId[] = ["dailyVerse", "morningMeditation", "prayerReminder", "faithChallenge"];

function iconFor(id: SpiritualReminderId): keyof typeof MaterialCommunityIcons.glyphMap {
  if (id === "dailyVerse") return "book-open-page-variant-outline";
  if (id === "morningMeditation") return "weather-sunset-up";
  if (id === "faithChallenge") return "run-fast";
  return "hands-pray";
}

export default function SpiritualNotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SpiritualNotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSpiritualNotificationSettings().then(setSettings);
  }, []);

  async function updateReminder(id: SpiritualReminderId, patch: Partial<SpiritualReminder>) {
    if (!settings) return;
    const next = {
      ...settings,
      [id]: {
        ...settings[id],
        ...patch,
      },
    };
    setSettings(next);
    await saveSpiritualNotificationSettings(next);
  }

  function normalizeHour(value: number) {
    if (value < 0) return 23;
    if (value > 23) return 0;
    return value;
  }

  function normalizeMinute(value: number) {
    if (value < 0) return 55;
    if (value > 55) return 0;
    return value;
  }

  function changeHour(id: SpiritualReminderId, currentHour: number, delta: number) {
    updateReminder(id, { hour: normalizeHour(currentHour + delta) });
  }

  function changeMinute(id: SpiritualReminderId, currentMinute: number, delta: number) {
    updateReminder(id, { minute: normalizeMinute(currentMinute + delta) });
  }

  async function saveAndApply() {
    if (!settings) return;
    setSaving(true);
    try {
      const scheduled = await applySpiritualNotificationSettings(settings);
      if (scheduled) {
        Alert.alert("Notifications activées", "Vos rappels spirituels sont configurés.");
      } else {
        Alert.alert(
          "Réglages enregistrés",
          "Les réglages sont sauvegardés, mais le téléphone n’a pas encore autorisé les notifications. Vérifiez les permissions dans les réglages de l’app, puis réessayez sur un vrai téléphone."
        );
      }
    } catch (error: any) {
      Alert.alert("Configuration impossible", error?.message ?? "Les notifications n’ont pas pu être configurées.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const enabledCount = ORDER.filter((id) => settings[id].enabled).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Rythme spirituel</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Choisissez les rappels qui vous aident sans surcharger votre journée.</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications-outline" size={28} color={COLORS.blueDark} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{enabledCount} rappel{enabledCount > 1 ? "s" : ""} actif{enabledCount > 1 ? "s" : ""}</Text>
            <Text style={styles.heroText}>Vous gardez la main : chaque rappel peut être activé séparément.</Text>
          </View>
        </View>

        <View style={styles.list}>
          {ORDER.map((id) => {
            const reminder = settings[id];
            return (
              <View key={id} style={[styles.card, reminder.enabled && styles.cardActive]}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, reminder.enabled && styles.cardIconActive]}>
                    <MaterialCommunityIcons
                      name={iconFor(id)}
                      size={22}
                      color={reminder.enabled ? COLORS.blueDark : COLORS.gold}
                    />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{reminder.title}</Text>
                    <Text style={styles.cardText}>{reminder.description}</Text>
                  </View>
                  <Pressable
                    style={[styles.switch, reminder.enabled && styles.switchOn]}
                    onPress={() => updateReminder(id, { enabled: !reminder.enabled })}
                  >
                    <View style={[styles.switchDot, reminder.enabled && styles.switchDotOn]} />
                  </Pressable>
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Heure choisie : {formatReminderTime(reminder.hour, reminder.minute)}</Text>
                  <View style={styles.timePicker}>
                    <View style={styles.timeUnit}>
                      <Text style={styles.timeUnitLabel}>Heure</Text>
                      <View style={styles.stepper}>
                        <Pressable style={styles.stepperButton} onPress={() => changeHour(id, reminder.hour, -1)}>
                          <Ionicons name="remove" size={17} color={COLORS.blueDark} />
                        </Pressable>
                        <Text style={styles.stepperValue}>{String(reminder.hour).padStart(2, "0")}</Text>
                        <Pressable style={styles.stepperButton} onPress={() => changeHour(id, reminder.hour, 1)}>
                          <Ionicons name="add" size={17} color={COLORS.blueDark} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.timeSeparator}>
                      <Text style={styles.timeSeparatorText}>:</Text>
                    </View>
                    <View style={styles.timeUnit}>
                      <Text style={styles.timeUnitLabel}>Minute</Text>
                      <View style={styles.stepper}>
                        <Pressable style={styles.stepperButton} onPress={() => changeMinute(id, reminder.minute, -5)}>
                          <Ionicons name="remove" size={17} color={COLORS.blueDark} />
                        </Pressable>
                        <Text style={styles.stepperValue}>{String(reminder.minute).padStart(2, "0")}</Text>
                        <Pressable style={styles.stepperButton} onPress={() => changeMinute(id, reminder.minute, 5)}>
                          <Ionicons name="add" size={17} color={COLORS.blueDark} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveAndApply} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.blueDark} /> : <Text style={styles.saveText}>Enregistrer les rappels</Text>}
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.gray} />
          <Text style={styles.infoText}>
            Les notifications locales dépendent des permissions du téléphone. Sur simulateur ou web, elles peuvent ne pas s’afficher.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.grayLight },
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
  eyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: COLORS.blueDark, fontSize: 30, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  heroCard: {
    borderRadius: 26,
    backgroundColor: COLORS.blueDark,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { color: COLORS.white, fontSize: 19, fontWeight: "900" },
  heroText: { color: "#D1D5DB", fontSize: 13, lineHeight: 19 },
  list: { gap: 12 },
  card: {
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 13,
  },
  cardActive: { borderColor: "rgba(217,183,95,0.55)", backgroundColor: "#FFFDF7" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconActive: { backgroundColor: COLORS.gold },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: COLORS.blueDark, fontSize: 15.5, fontWeight: "900" },
  cardText: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
    padding: 3,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: COLORS.blueDark },
  switchDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white },
  switchDotOn: { transform: [{ translateX: 20 }], backgroundColor: COLORS.gold },
  timeRow: { gap: 9 },
  timeLabel: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  timePicker: {
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeUnit: { flex: 1, gap: 7 },
  timeUnitLabel: { color: COLORS.gray, fontSize: 10.5, fontWeight: "900", textTransform: "uppercase" },
  stepper: {
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 7,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { minWidth: 34, textAlign: "center", color: COLORS.blueDark, fontSize: 17, fontWeight: "900" },
  timeSeparator: { paddingTop: 18 },
  timeSeparatorText: { color: COLORS.blueDark, fontSize: 22, fontWeight: "900" },
  saveButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.7 },
  infoBox: {
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  infoText: { flex: 1, color: COLORS.gray, fontSize: 12.5, lineHeight: 19, fontWeight: "600" },
});
