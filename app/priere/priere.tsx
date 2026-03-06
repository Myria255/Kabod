import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/src/constants/colors";
import { supabase } from "@/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PrayerOfDay = {
  title: string;
  verse: string;
  text: string;
};

const SUBJECTS_KEY_PREFIX = "PRAYER_SUBJECTS_V1";
const PRAYER_POOL: PrayerOfDay[] = [
  {
    title: "Priere de confiance",
    verse: "Proverbes 3:5-6",
    text: "Seigneur, je te confie mes decisions et mes pas aujourd'hui. Conduis-moi dans ta voie.",
  },
  {
    title: "Priere de paix",
    verse: "Philippiens 4:6-7",
    text: "Pere, je depose mes inquietudes devant toi. Remplis mon coeur de ta paix.",
  },
  {
    title: "Priere de sagesse",
    verse: "Jacques 1:5",
    text: "Donne-moi ta sagesse dans mes paroles, mes choix et mes relations.",
  },
  {
    title: "Priere de force",
    verse: "Esaie 41:10",
    text: "Quand je suis faible, soutiens-moi. Fortifie-moi pour rester fidele a ta Parole.",
  },
  {
    title: "Priere de reconnaissance",
    verse: "Psaume 103:2",
    text: "Merci pour tes bienfaits visibles et invisibles. Je choisis de te benir en tout temps.",
  },
  {
    title: "Priere d'obeissance",
    verse: "Jacques 1:22",
    text: "Aide-moi a vivre ce que j'entends. Que ma foi produise des actions concretes.",
  },
  {
    title: "Priere d'amour",
    verse: "Jean 13:34-35",
    text: "Apprends-moi a aimer comme toi: avec verite, patience et compassion.",
  },
];

function dateSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function toMMSS(totalSeconds: number) {
  const min = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export default function PrierePage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(180);
  const [running, setRunning] = useState(false);

  const prayerOfDay = useMemo(() => {
    const seed = dateSeed(new Date());
    return PRAYER_POOL[seed % PRAYER_POOL.length];
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const identity = user?.id ?? "guest";
        const key = `${SUBJECTS_KEY_PREFIX}:${identity}`;
        setStorageKey(key);

        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          setSubjects(Array.isArray(parsed) ? parsed : []);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, running]);

  async function persistSubjects(next: string[]) {
    setSubjects(next);
    if (!storageKey) return;
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function addSubject() {
    const value = newSubject.trim();
    if (!value) return;
    if (subjects.includes(value)) {
      setNewSubject("");
      return;
    }
    const next = [value, ...subjects].slice(0, 20);
    await persistSubjects(next);
    setNewSubject("");
  }

  async function removeSubject(value: string) {
    await persistSubjects(subjects.filter((s) => s !== value));
  }

  function startPrayerTimer() {
    if (remaining <= 0) setRemaining(180);
    setRunning(true);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Priere du jour</Text>
          <Text style={styles.heroTitle}>{prayerOfDay.title}</Text>
          <Text style={styles.heroVerse}>{prayerOfDay.verse}</Text>
          <Text style={styles.heroText}>{prayerOfDay.text}</Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.sectionTitle}>Temps de priere</Text>
          <Text style={styles.timer}>{toMMSS(remaining)}</Text>
          <View style={styles.timerActions}>
            <Pressable
              style={[styles.primaryBtn, running && styles.disabledBtn]}
              onPress={startPrayerTimer}
              disabled={running}
            >
              <Text style={styles.primaryBtnText}>{running ? "En cours..." : "Demarrer 3 min"}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                setRunning(false);
                setRemaining(180);
              }}
            >
              <Text style={styles.secondaryBtnText}>Reinitialiser</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.subjectsCard}>
          <Text style={styles.sectionTitle}>Sujets de priere</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={newSubject}
              onChangeText={setNewSubject}
              placeholder="Ajouter un sujet..."
              style={styles.input}
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
              onSubmitEditing={addSubject}
            />
            <Pressable style={styles.addBtn} onPress={addSubject}>
              <Ionicons name="add" size={18} color={COLORS.white} />
            </Pressable>
          </View>

          <View style={styles.subjectList}>
            {subjects.length === 0 && (
              <Text style={styles.emptyText}>Aucun sujet pour le moment.</Text>
            )}
            {subjects.map((subject) => (
              <View key={subject} style={styles.subjectItem}>
                <Text style={styles.subjectText}>{subject}</Text>
                <Pressable onPress={() => removeSubject(subject)}>
                  <Ionicons name="close" size={16} color={COLORS.gray} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FB" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6FB",
  },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14 },
  hero: {
    backgroundColor: COLORS.blueDark,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  heroLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: { marginTop: 6, color: COLORS.white, fontSize: 22, fontWeight: "800" },
  heroVerse: { marginTop: 4, color: COLORS.gold, fontSize: 13, fontWeight: "700" },
  heroText: { marginTop: 10, color: "#E2E8F0", fontSize: 14, lineHeight: 22 },
  timerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "800" },
  timer: { marginTop: 8, fontSize: 36, fontWeight: "800", color: COLORS.blueDark },
  timerActions: { marginTop: 10, flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueDark,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  secondaryBtn: {
    width: 120,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  secondaryBtnText: { color: COLORS.gray, fontWeight: "700", fontSize: 13 },
  disabledBtn: { opacity: 0.7 },
  subjectsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  inputRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.blueDark,
    fontSize: 14,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold,
  },
  subjectList: { marginTop: 10, gap: 8 },
  emptyText: { color: COLORS.gray, fontSize: 13 },
  subjectItem: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  subjectText: { flex: 1, color: COLORS.blueDark, fontSize: 14, fontWeight: "600" },
});
