import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { useRouter } from "expo-router";
import { BookOpen, Calendar, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  blue: "#6B85C6",
  blueDark: "#0F172A",
  gold: "#D4AF37",
  white: "#FFFFFF",
  black: "#0F0F14",
  grayLight: "#F2F3F7",
  gray: "#6B6F8A",
};

type TypePlan = "annuel" | "mensuel";
const PLAN_START_KEY = "PLAN_START_DATE_V1";
const PLAN_TYPE_CACHE_KEY = "PLAN_TYPE_CACHE_V1";
const PLAN_UNREAD_NOTIFICATION_KEY = "PLAN_UNREAD_NOTIFICATION_V1";
const READING_PROGRESS_CACHE_KEY = "READING_PROGRESS_CACHE_V1";
const READING_PROGRESS_PENDING_KEY = "READING_PROGRESS_PENDING_V1";
const READING_POSITION_KEY = "READING_POSITION_V1";
const LEGACY_MONTHLY_READ_KEY = "MONTHLY_BOOK_READ_V1";
const ANNUAL_DAY_READ_KEY = "ANNUAL_DAY_READ_V1";
const READING_DELAY_ALERT_KEY = "READING_DELAY_ALERT_V1";

export default function IndexLecture() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [planEnCours, setPlanEnCours] = useState<TypePlan | null>(null);
  const [afficherChoix, setAfficherChoix] = useState(false);

  useEffect(() => {
    verifierPlan();
  }, []);

  async function clearPlanChoiceCache(userId: string) {
    const allKeys = await AsyncStorage.getAllKeys();
    const dynamicKeys = allKeys.filter((key) =>
      key.startsWith(`${ANNUAL_DAY_READ_KEY}:${userId}:`) ||
      key.startsWith(`${READING_DELAY_ALERT_KEY}:${userId}:`) ||
      key.startsWith(`${READING_POSITION_KEY}:${userId}:`) ||
      key.startsWith(`${LEGACY_MONTHLY_READ_KEY}:${userId}:`)
    );

    const staticKeys = [
      `${PLAN_TYPE_CACHE_KEY}:${userId}`,
      `${PLAN_START_KEY}:${userId}:annuel`,
      `${PLAN_START_KEY}:${userId}:mensuel`,
      `${PLAN_UNREAD_NOTIFICATION_KEY}:${userId}:annuel`,
      `${PLAN_UNREAD_NOTIFICATION_KEY}:${userId}:mensuel`,
      `${READING_PROGRESS_CACHE_KEY}:${userId}:annuel`,
      `${READING_PROGRESS_CACHE_KEY}:${userId}:mensuel`,
      READING_PROGRESS_PENDING_KEY,
    ];

    await AsyncStorage.multiRemove([...new Set([...staticKeys, ...dynamicKeys])]);
  }

  async function verifierPlan() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login" as any);
        return;
      }

      const cacheKey = `${PLAN_TYPE_CACHE_KEY}:${user.id}`;
      const { data, error } = await supabase
        .from("plan_lecture_utilisateur")
        .select("type_plan")
        .eq("utilisateur_id", user.id)
        .order("date_creation", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      const row = data?.[0];
      if (row) {
        const resolvedType = row.type_plan as TypePlan;
        await AsyncStorage.setItem(cacheKey, resolvedType);
        rediriger(resolvedType);
      } else {
        await AsyncStorage.removeItem(cacheKey);
        setAfficherChoix(true);
      }
    } catch (e) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cacheKey = `${PLAN_TYPE_CACHE_KEY}:${user.id}`;
        const cachedType = (await AsyncStorage.getItem(cacheKey)) as TypePlan | null;
        if (cachedType === "annuel" || cachedType === "mensuel") {
          rediriger(cachedType);
          return;
        }
      }
      setAfficherChoix(true);
    } finally {
      setChargement(false);
    }
  }

  async function choisirPlan(type: TypePlan) {
    setPlanEnCours(type); // Feedback visuel
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setPlanEnCours(null);
      router.replace("/(auth)/login" as any);
      return;
    }

    try {
      await clearPlanChoiceCache(user.id);
      const nowIso = new Date().toISOString();
      const storageKey = `${PLAN_START_KEY}:${user.id}:${type}`;

      const { data: existingRows, error: existingError } = await supabase
        .from("plan_lecture_utilisateur")
        .select("utilisateur_id")
        .eq("utilisateur_id", user.id)
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      const updatePayload = {
        type_plan: type,
        jour_actuel: 1,
      };

      if ((existingRows?.length ?? 0) > 0) {
        const updateResp = await supabase
          .from("plan_lecture_utilisateur")
          .update(updatePayload)
          .eq("utilisateur_id", user.id);

        if (updateResp.error) {
          throw updateResp.error;
        }
      } else {
        const insertResp = await supabase
          .from("plan_lecture_utilisateur")
          .insert({
            utilisateur_id: user.id,
            ...updatePayload,
            date_creation: nowIso,
          })
          .select("utilisateur_id")
          .single();

        if (insertResp.error) {
          throw insertResp.error;
        }
      }

      await AsyncStorage.setItem(`${PLAN_TYPE_CACHE_KEY}:${user.id}`, type);
      await AsyncStorage.setItem(storageKey, nowIso);
      rediriger(type);
    } catch (e: any) {
      console.error("Erreur sauvegarde plan:", e?.message || e);
      Alert.alert(
        "Sauvegarde impossible",
        "Le choix du plan n'a pas ete enregistre. Verifie la table plan_lecture_utilisateur et les regles RLS."
      );
    } finally {
      setPlanEnCours(null);
    }
  }

  function rediriger(type: TypePlan) {
    const route = type === "annuel" ? "/meditation/lecture/annuel" : "/meditation/lecture/mensuel";
    router.replace(route as any);
  }

  if (chargement) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={COLORS.gold} />
      </View>
    );
  }

  if (!afficherChoix) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.surTitre}>VOTRE PROGRAMME</Text>
        <Text style={styles.titre}>Comment souhaitez-vous explorer la Parole ?</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.cardsContainer}>
        {/* Option Annuel */}
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={planEnCours !== null}
          style={styles.carte}
          onPress={() => choisirPlan("annuel")}
        >
          <View style={styles.iconCircle}>
            {planEnCours === "annuel" ? (
              <ActivityIndicator size="small" color={COLORS.gold} />
            ) : (
              <BookOpen size={22} color={COLORS.gold} strokeWidth={1.5} />
            )}
          </View>
          <View style={styles.textContent}>
            <Text style={styles.titreCarte}>Plan Annuel</Text>
            <Text style={styles.description}>La Bible complète en un an, de la Genèse à l’Apocalypse.</Text>
          </View>
          <ChevronRight size={18} color={COLORS.blue} opacity={0.4} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Option Mensuel */}
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={planEnCours !== null}
          style={styles.carte}
          onPress={() => choisirPlan("mensuel")}
        >
          <View style={styles.iconCircle}>
            {planEnCours === "mensuel" ? (
              <ActivityIndicator size="small" color={COLORS.gold} />
            ) : (
              <Calendar size={22} color={COLORS.gold} strokeWidth={1.5} />
            )}
          </View>
          <View style={styles.textContent}>
            <Text style={styles.titreCarte}>Plan Mensuel</Text>
            <Text style={styles.description}>Un focus profond sur un livre spécifique chaque mois.</Text>
          </View>
          <ChevronRight size={18} color={COLORS.blue} opacity={0.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>Ce choix personnalisera votre expérience de lecture.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 30 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.white },
  header: { marginTop: 40, marginBottom: 30 },
  surTitre: { fontSize: 11, fontWeight: "700", color: COLORS.blue, letterSpacing: 2, marginBottom: 8 },
  titre: { fontSize: 26, fontWeight: "700", color: COLORS.blueDark, lineHeight: 34 },
  line: { width: 40, height: 3, backgroundColor: COLORS.gold, marginTop: 20, borderRadius: 2 },
  cardsContainer: { marginTop: 10 },
  carte: { flexDirection: "row", alignItems: "center", paddingVertical: 25 },
  iconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: COLORS.grayLight, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  textContent: { flex: 1, marginLeft: 20, marginRight: 10 },
  titreCarte: { fontSize: 18, fontWeight: "700", color: COLORS.blueDark, marginBottom: 4 },
  description: { fontSize: 14, color: COLORS.gray, lineHeight: 20 },
  divider: { height: 1, backgroundColor: COLORS.grayLight },
  footer: { marginTop: "auto", paddingBottom: 20 },
  footerNote: { textAlign: "center", color: COLORS.gray, fontSize: 13, opacity: 0.6 },
});

