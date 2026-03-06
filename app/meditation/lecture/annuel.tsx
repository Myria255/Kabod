import { BIBLE } from "@/src/constants/bible";
import { COLORS as THEME_COLORS } from "@/src/constants/colors";
import {
  generateReliableQuizForReadings,
  type ReliableQuizQuestion,
} from "@/src/services/quizGenerator";
import {
  getDelayNotificationMessage,
} from "@/src/services/planNotifications";
import {
  ensureLocalNotificationPermission,
  sendImmediateLocalNotification,
} from "@/src/services/localDeviceNotifications";
import { markDayAsCompleted } from "@/src/services/readingSync";
import { getCompletedDays } from "@/src/stockage/readingProgress";
import { supabase } from "@/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  Trophy,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  blue: THEME_COLORS.blue,
  blueDark: THEME_COLORS.blueDark,
  gold: THEME_COLORS.gold,
  white: THEME_COLORS.white,
  grayLight: THEME_COLORS.grayLight,
  grayBorder: "#E2E8F0",
  gray: THEME_COLORS.gray,
  bg: "#F8FAFC",
  surfaceAlt: "#EFF3F8",
};

const NOMBRE_JOURS = 365;
const ANNUAL_DAY_READ_KEY = "ANNUAL_DAY_READ_V1";
const PLAN_START_KEY = "PLAN_START_DATE_V1";
const PLAN_UNREAD_NOTIFICATION_KEY = "PLAN_UNREAD_NOTIFICATION_V1";

type ChapitrePlan = {
  jour: number;
  bookId: string;
  chapter: number;
};
type QuizCorrection = {
  id: string;
  questionType: ReliableQuizQuestion["questionType"];
  prompt: string;
  verseReference: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

function genererPlanCanonique(): ChapitrePlan[] {
  const chapitres: { bookId: string; chapter: number }[] = [];

  Object.entries(BIBLE).forEach(([bookId, livre]) => {
    Object.keys(livre).forEach((chapter) => {
      chapitres.push({ bookId, chapter: Number(chapter) });
    });
  });

  const total = chapitres.length;
  const parJour = Math.ceil(total / NOMBRE_JOURS);

  const plan: ChapitrePlan[] = [];
  let jour = 1;
  let index = 0;

  while (index < total && jour <= NOMBRE_JOURS) {
    for (let i = 0; i < parJour && index < total; i++) {
      plan.push({ jour, ...chapitres[index] });
      index++;
    }
    jour++;
  }

  return plan;
}

export default function PlanAnnuel() {
  const router = useRouter();

  const [chapitresDuJour, setChapitresDuJour] = useState<ChapitrePlan[]>([]);
  const [joursValides, setJoursValides] = useState<number[]>([]);
  const [jourActuel, setJourActuel] = useState<number>(1);
  const [chargement, setChargement] = useState<boolean>(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [joursCompletes, setJoursCompletes] = useState<number>(0);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  const [lastNotif, setLastNotif] = useState<{ title: string; body: string } | null>(null);
  const [retardJours, setRetardJours] = useState(0);
  const [waitingNextDay, setWaitingNextDay] = useState(false);
  const [nextLectureDate, setNextLectureDate] = useState("");
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<ReliableQuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    corrections: QuizCorrection[];
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      initialiser();
    }, [])
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const subscribeRealtime = async () => {
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;
      if (!user || !active) return;

      channel = supabase
        .channel(`progression-annuel-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "progression_lecture",
            filter: `utilisateur_id=eq.${user.id}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old ?? {}) as { plan?: string };
            if (row.plan === "annuel") {
              initialiser();
            }
          }
        )
        .subscribe();
    };

    subscribeRealtime();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function openNotificationInbox() {
    if (lastNotif) {
      Alert.alert(lastNotif.title, lastNotif.body);
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;
      if (user) {
        await AsyncStorage.removeItem(`${PLAN_UNREAD_NOTIFICATION_KEY}:${user.id}:annuel`);
      }
      setHasUnreadNotif(false);
      setLastNotif(null);
      return;
    }

    Alert.alert("Notifications", "Aucune notification a lire.");
  }

  async function initialiser() {
    setChargement(true);
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;

      if (!user) {
        router.replace("/(auth)/login" as any);
        return;
      }

      const plan = genererPlanCanonique();
      const completedDays = await getCompletedDays(user.id, "annuel");
      const normalized = [...new Set(completedDays)]
        .filter((d) => d >= 1 && d <= NOMBRE_JOURS)
        .sort((a, b) => a - b);
      setJoursValides(normalized);
      const notifAllowed = await ensureLocalNotificationPermission();
      setNotifEnabled(notifAllowed);
      const unreadKey = `${PLAN_UNREAD_NOTIFICATION_KEY}:${user.id}:annuel`;
      const unreadRaw = await AsyncStorage.getItem(unreadKey);
      if (unreadRaw) {
        try {
          const parsed = JSON.parse(unreadRaw) as { title: string; body: string };
          setLastNotif(parsed);
          setHasUnreadNotif(true);
        } catch {
          setLastNotif(null);
          setHasUnreadNotif(false);
        }
      } else {
        setLastNotif(null);
        setHasUnreadNotif(false);
      }

      const startKey = `${PLAN_START_KEY}:${user.id}:annuel`;
      let startIso = await AsyncStorage.getItem(startKey);
      if (!startIso) {
        startIso = new Date().toISOString();
        await AsyncStorage.setItem(startKey, startIso);
      }
      const startDate = new Date(startIso);
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const elapsedDays = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      const expectedDays = Math.min(Math.max(elapsedDays, 1), NOMBRE_JOURS);
      const retard = Math.max(0, expectedDays - normalized.length);
      setRetardJours(retard);
      const nextDate = new Date(startDate.getTime() + expectedDays * 24 * 60 * 60 * 1000);
      setNextLectureDate(nextDate.toLocaleDateString("fr-FR"));
      const shouldWaitNextDay = normalized.length >= expectedDays && retard <= 0;
      if (shouldWaitNextDay) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setNextLectureDate(tomorrow.toLocaleDateString("fr-FR"));
      }

      if (notifAllowed && retard > 0) {
        const alertKey = `READING_DELAY_ALERT_V1:${user.id}:annuel:${today}`;
        const alerted = await AsyncStorage.getItem(alertKey);
        if (!alerted) {
          const message = getDelayNotificationMessage("annuel", retard);
          await sendImmediateLocalNotification(message);
          await AsyncStorage.setItem(alertKey, "1");
          await AsyncStorage.setItem(unreadKey, JSON.stringify(message));
          setLastNotif(message);
          setHasUnreadNotif(true);
        }
      }

      const doneSet = new Set(normalized);
      let jour = NOMBRE_JOURS + 1;
      for (let i = 1; i <= NOMBRE_JOURS; i++) {
        if (!doneSet.has(i)) {
          jour = i;
          break;
        }
      }
      setWaitingNextDay(shouldWaitNextDay);

      setJoursCompletes(normalized.length);
      setJourActuel(jour);
      if (shouldWaitNextDay) {
        setChapitresDuJour([]);
        setCheckedItems({});
      } else {
        const chapitres = plan.filter((p) => p.jour === jour);
        setChapitresDuJour(chapitres);
      }

      if (!shouldWaitNextDay && jour <= NOMBRE_JOURS) {
        const key = `${ANNUAL_DAY_READ_KEY}:${user.id}:${jour}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          try {
            setCheckedItems(JSON.parse(raw) as Record<string, boolean>);
          } catch {
            setCheckedItems({});
          }
        } else {
          setCheckedItems({});
        }
      } else {
        setCheckedItems({});
      }
    } finally {
      setChargement(false);
    }
  }

  const isDayComplete =
    chapitresDuJour.length > 0 &&
    chapitresDuJour.every((c) => checkedItems[`${c.bookId}-${c.chapter}`]);

  const progressionPrecise = Math.min((joursCompletes / NOMBRE_JOURS) * 100, 100);
  const progression = Math.max(
    joursCompletes > 0 ? 1 : 0,
    Math.min(Math.round(progressionPrecise), 100)
  );
  const progressionLabel = `${progressionPrecise.toFixed(1)}%`;
  const joursAVenir = Math.max(NOMBRE_JOURS - joursCompletes, 0);
  const hasLectureToday = chapitresDuJour.length > 0;
  const previewStartDay = Math.max(1, jourActuel - (waitingNextDay ? 3 : 1));
  const parcoursPreview = Array.from({ length: 7 }, (_, i) => previewStartDay + i)
    .filter((day) => day <= NOMBRE_JOURS)
    .map((day) => {
    const isDone = joursValides.includes(day);
    const isCurrent = day === jourActuel && !waitingNextDay;
    return { day, isDone, isCurrent };
  });

  function ouvrirQuiz() {
    const questions = generateReliableQuizForReadings(chapitresDuJour, 6);
    if (questions.length === 0) {
      Alert.alert("Quiz indisponible", "Impossible de generer le quiz pour ces chapitres.");
      return;
    }
    setQuizQuestions(questions);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizVisible(true);
  }

  function lancerNouveauTest() {
    const questions = generateReliableQuizForReadings(chapitresDuJour, 6);
    if (questions.length === 0) {
      Alert.alert("Quiz indisponible", "Impossible de generer un nouveau test.");
      return;
    }
    setQuizQuestions(questions);
    setQuizAnswers({});
    setQuizResult(null);
  }

  async function soumettreQuiz() {
    if (quizQuestions.some((q) => quizAnswers[q.id] === undefined)) {
      Alert.alert("Quiz incomplet", "Repondez a toutes les questions avant de valider.");
      return;
    }

    const total = quizQuestions.length;
    const correctCount = quizQuestions.filter((q) => quizAnswers[q.id] === q.correctAnswer).length;
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= 80;
    const corrections: QuizCorrection[] = quizQuestions.map((q) => ({
        id: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        verseReference: q.verseReference,
        userAnswer: quizAnswers[q.id] ?? "-",
        correctAnswer: q.correctAnswer,
        isCorrect: quizAnswers[q.id] === q.correctAnswer,
      }));

    setQuizResult({ score, passed, corrections });

    if (!passed) {
      Alert.alert("Score insuffisant", `Vous avez ${score}%. Il faut 80% minimum.`);
      return;
    }

    setQuizLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;
      if (!user) {
        router.replace("/(auth)/login" as any);
        return;
      }

      await markDayAsCompleted(user.id, "annuel", jourActuel);
      setJoursCompletes((prev) => Math.min(prev + 1, NOMBRE_JOURS));
      setQuizVisible(false);
      Alert.alert("Validation reussie", `Score ${score}% - lecture du jour validee.`);
      await initialiser();
    } finally {
      setQuizLoading(false);
    }
  }

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="small" color={COLORS.gold} />
      </View>
    );
  }

  if (jourActuel > NOMBRE_JOURS) {
    return (
      <SafeAreaView style={styles.finishedSafe}>
        <View style={styles.finishedCard}>
          <Trophy size={46} color={COLORS.gold} />
          <Text style={styles.titleEnd}>Felicitations</Text>
          <Text style={styles.subtitleEnd}>Vous avez termine le plan annuel.</Text>
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => router.replace("/(tabs)/meditation" as any)}
          >
            <Text style={styles.completeBtnText}>Retour a la meditation</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={22} color={COLORS.blueDark} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Programme annuel</Text>
          <TouchableOpacity onPress={openNotificationInbox} style={styles.backButton}>
            <Bell
              size={18}
              color={hasUnreadNotif ? COLORS.gold : notifEnabled ? COLORS.blueDark : COLORS.gray}
              fill={hasUnreadNotif ? COLORS.gold : "none"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.badgeLabel}>
              <Text style={styles.badgeText}>PLAN 365 JOURS</Text>
            </View>
            <Text style={styles.heroTitle}>Parcours annuel</Text>
            <Text style={styles.heroSub}>Progression reelle basee sur vos lectures completes.</Text>

            <View style={styles.progressRow}>
              <View style={styles.miniProgressContainer}>
                <View style={[styles.miniProgressBar, { width: `${progression}%` }]} />
              </View>
              <Text style={styles.progressStat}>{progressionLabel}</Text>
            </View>
          </View>
        </View>

        {retardJours > 0 && (
          <View style={styles.delayBanner}>
            <Bell size={14} color={COLORS.gold} />
            <Text style={styles.delayBannerText}>
              Retard: {retardJours} jour{retardJours > 1 ? "s" : ""} a rattraper
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jour {jourActuel}</Text>
          <View style={styles.lineDecor} />
          <View style={styles.dayPill}>
            <Zap size={14} color={COLORS.gold} />
            <Text style={styles.dayPillText}>{joursCompletes}/365</Text>
          </View>
        </View>

        <View style={styles.parcoursCard}>
          <Text style={styles.parcoursTitle}>Parcours</Text>
          <View style={styles.parcoursStatsRow}>
            <View style={styles.parcoursStat}>
              <Text style={styles.parcoursStatLabel}>Valides</Text>
              <Text style={styles.parcoursStatValue}>{joursCompletes}</Text>
            </View>
            <View style={styles.parcoursStat}>
              <Text style={styles.parcoursStatLabel}>En cours</Text>
              <Text style={styles.parcoursStatValue}>{waitingNextDay ? "-" : jourActuel}</Text>
            </View>
            <View style={styles.parcoursStat}>
              <Text style={styles.parcoursStatLabel}>A venir</Text>
              <Text style={styles.parcoursStatValue}>{joursAVenir}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.parcoursDaysRow}>
            {parcoursPreview.map((d) => (
              <View
                key={d.day}
                style={[
                  styles.parcoursDayChip,
                  d.isDone && styles.parcoursDayChipDone,
                  d.isCurrent && styles.parcoursDayChipCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.parcoursDayText,
                    (d.isDone || d.isCurrent) && styles.parcoursDayTextLight,
                  ]}
                >
                  J{d.day}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {hasLectureToday && (
          <View style={styles.planContainer}>
              {chapitresDuJour.map((item, index) => {
                const id = `${item.bookId}-${item.chapter}`;
                const isChecked = !!checkedItems[id];
                const bookName = item.bookId.charAt(0).toUpperCase() + item.bookId.slice(1);

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    style={[styles.itemCard, isChecked && styles.itemCardCompleted]}
                    onPress={() =>
                      router.push({
                        pathname: "/bible/[bookId]/[chapterId]",
                        params: {
                          bookId: item.bookId,
                          chapterId: String(item.chapter),
                          bookName,
                          planType: "annuel",
                          day: String(jourActuel),
                          totalReadings: String(chapitresDuJour.length),
                        },
                      })
                    }
                  >
                    <View style={[styles.monthBox, isChecked && styles.monthBoxCompleted]}>
                      <BookOpen size={20} color={isChecked ? COLORS.white : COLORS.blueDark} />
                    </View>

                    <View style={styles.contentBox}>
                      <Text style={[styles.bookName, isChecked && styles.textWhite]}>{bookName}</Text>
                      <Text style={[styles.chapterDetail, isChecked && styles.textWhiteOpacity]}>
                        Chapitre {item.chapter}
                      </Text>
                    </View>

                    <View style={styles.actionBox}>
                      {isChecked ? (
                        <View style={styles.donePill}>
                          <Check size={14} color={COLORS.white} />
                        </View>
                      ) : (
                        <ChevronLeft size={18} color={COLORS.gray} style={styles.chevronRight} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
        )}

        {!hasLectureToday && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Aucun livre a lire maintenant</Text>
            <Text style={styles.emptyStateText}>
              Revenez le prochain jour pour continuer votre parcours.
            </Text>
          </View>
        )}

        {hasLectureToday && (
          <TouchableOpacity
            style={[
              styles.infoBar,
              isDayComplete && !waitingNextDay ? styles.infoBarDone : styles.infoBarDisabled,
            ]}
            onPress={ouvrirQuiz}
            disabled={!isDayComplete || waitingNextDay}
          >
            <Text
              style={[
                styles.infoBarText,
                isDayComplete && !waitingNextDay ? styles.infoBarTextDone : styles.infoBarTextMuted,
              ]}
            >
              {waitingNextDay
                ? `Lecture validee. Prochaine lecture le ${nextLectureDate || "demain"}.`
                : isDayComplete
                ? "Ouvrir le formulaire (quiz)"
                : "Formulaire indisponible: lisez tous les chapitres"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={quizVisible} transparent animationType="slide">
        <View style={styles.quizOverlay}>
          <View style={styles.quizCard}>
            <Text style={styles.quizTitle}>Verification de lecture</Text>
            <Text style={styles.quizSubtitle}>Repondez avant de valider votre journee.</Text>

            <ScrollView
              style={styles.quizList}
              contentContainerStyle={styles.quizListContent}
              showsVerticalScrollIndicator={false}
            >
              {quizQuestions.map((q, index) => {
                return (
                  <View key={q.id} style={styles.quizItem}>
                    <View style={styles.quizQuestionRow}>
                      <View style={styles.quizNumberPill}>
                        <Text style={styles.quizNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.quizQuestion}>{q.prompt}</Text>
                    </View>
                    <Text style={[
                      styles.quizTypeBadge,
                      q.questionType === "word" && styles.quizTypeWord,
                      q.questionType === "verse_number" && styles.quizTypeVerse,
                      q.questionType === "verse_count" && styles.quizTypeCount,
                    ]}>
                      {q.questionType === "word"
                        ? "Mot manquant"
                        : q.questionType === "verse_number"
                        ? "Numero de verset"
                        : "Comptage de versets"}
                    </Text>
                    <Text style={styles.quizRef}>{q.verseReference}</Text>
                    <Text style={styles.quizVerse}>{q.verseWithBlank}</Text>
                    <Text style={styles.quizSectionTitle}>Choisissez votre reponse</Text>
                    <View style={styles.quizOptionsRow}>
                      {q.options.map((opt) => {
                        const active = quizAnswers[q.id] === opt;
                        return (
                          <TouchableOpacity
                            key={`${q.id}-${opt}`}
                            style={[
                              styles.quizOption,
                              active && styles.quizOptionActive,
                              active && q.questionType === "word" && styles.quizOptionWordActive,
                              active && q.questionType === "verse_number" && styles.quizOptionVerseActive,
                              active && q.questionType === "verse_count" && styles.quizOptionCountActive,
                            ]}
                            onPress={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          >
                            <Text style={[styles.quizOptionText, active && styles.quizOptionTextActive]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.quizActions}>
              <TouchableOpacity style={styles.quizCancel} onPress={() => setQuizVisible(false)}>
                <Text style={styles.quizCancelText}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quizValidate, quizLoading && styles.quizValidateDisabled]}
                onPress={quizResult && !quizResult.passed ? lancerNouveauTest : soumettreQuiz}
                disabled={quizLoading}
              >
                <Text style={styles.quizValidateText}>
                  {quizLoading
                    ? "Validation..."
                    : quizResult
                    ? quizResult.passed
                      ? "Validation terminee"
                      : "Refaire un test"
                    : "Envoyer mes reponses"}
                </Text>
              </TouchableOpacity>
            </View>

            {quizResult && (
              <View style={styles.quizResultBox}>
                <Text style={styles.quizResultTitle}>
                  Resultat: {quizResult.score}% {quizResult.passed ? "(Valide)" : "(Non valide)"}
                </Text>
                {quizResult.corrections.length > 0 ? (
                  <ScrollView style={styles.correctionsScroll} showsVerticalScrollIndicator={false}>
                    {quizResult.corrections.map((c) => (
                      <View key={c.id} style={[styles.correctionItem, c.isCorrect && styles.correctionItemOk]}>
                        <View style={styles.correctionHeader}>
                          <Text style={styles.correctionPrompt}>{c.prompt}</Text>
                          <Text style={[styles.correctionState, c.isCorrect ? styles.correctionStateOk : styles.correctionStateKo]}>
                            {c.isCorrect ? "Correct" : "Faux"}
                          </Text>
                        </View>
                        <Text style={styles.correctionRef}>{c.verseReference}</Text>
                        <View style={styles.correctionRow}>
                          <Text style={styles.correctionLabel}>Votre reponse</Text>
                          <Text style={c.isCorrect ? styles.correctionRight : styles.correctionWrong}>
                            {c.userAnswer}
                          </Text>
                        </View>
                        <View style={styles.correctionRow}>
                          <Text style={styles.correctionLabel}>Bonne reponse</Text>
                          <Text style={styles.correctionRight}>{c.correctAnswer}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.correctionPerfect}>Toutes les reponses sont correctes.</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centre: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 30,
  },
  finishedSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    padding: 20,
  },
  finishedCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  titleEnd: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.blueDark,
  },
  subtitleEnd: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
  },
  headerSafe: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },

  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  heroContent: { width: "100%" },
  badgeLabel: {
    backgroundColor: COLORS.gold + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  badgeText: { color: COLORS.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: "800", color: COLORS.blueDark },
  heroSub: { fontSize: 14, color: COLORS.gray, marginTop: 8, lineHeight: 20 },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 12 },
  miniProgressContainer: { flex: 1, height: 6, backgroundColor: COLORS.grayLight, borderRadius: 3 },
  miniProgressBar: { height: 6, backgroundColor: COLORS.gold, borderRadius: 3 },
  progressStat: { fontSize: 12, fontWeight: "700", color: COLORS.blueDark },
  delayBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  delayBannerText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "600" },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 1 },
  lineDecor: { flex: 1, height: 1, backgroundColor: COLORS.grayLight },
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  dayPillText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "700" },
  parcoursCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    padding: 12,
    marginBottom: 14,
  },
  parcoursTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  parcoursStatsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  parcoursStat: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  parcoursStatLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "600" },
  parcoursStatValue: { color: COLORS.blueDark, fontSize: 16, fontWeight: "800", marginTop: 2 },
  parcoursDaysRow: { gap: 8, paddingRight: 6 },
  parcoursDayChip: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  parcoursDayChipDone: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  parcoursDayChipCurrent: {
    backgroundColor: COLORS.blueDark,
    borderColor: COLORS.blueDark,
  },
  parcoursDayText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "700" },
  parcoursDayTextLight: { color: COLORS.white },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  emptyStateTitle: {
    color: COLORS.blueDark,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyStateText: {
    color: COLORS.gray,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  planContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingVertical: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 8,
  },
  itemCardCompleted: {
    backgroundColor: COLORS.blue,
  },
  monthBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  monthBoxCompleted: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  contentBox: { flex: 1, paddingLeft: 14 },
  bookName: { fontSize: 18, fontWeight: "700", color: COLORS.blueDark },
  chapterDetail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  actionBox: { paddingRight: 4 },
  donePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  chevronRight: {
    transform: [{ rotate: "180deg" }],
  },
  textWhite: { color: COLORS.white },
  textWhiteOpacity: { color: "rgba(255,255,255,0.65)" },

  infoBar: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    alignItems: "center",
  },
  infoBarDone: {
    backgroundColor: COLORS.blueDark,
    borderColor: COLORS.blueDark,
  },
  infoBarText: { color: COLORS.gray, fontSize: 14, fontWeight: "600" },
  infoBarTextDone: { color: COLORS.white },
  infoBarTextMuted: { color: COLORS.gray },
  infoBarDisabled: {
    opacity: 0.85,
  },
  quizOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  quizCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    maxHeight: "92%",
  },
  quizTitle: { fontSize: 18, fontWeight: "800", color: COLORS.blueDark },
  quizSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4, marginBottom: 12 },
  quizList: { flexGrow: 0, maxHeight: 380 },
  quizListContent: { paddingBottom: 8 },
  quizItem: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  quizQuestionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  quizNumberPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quizNumberText: { color: COLORS.blueDark, fontWeight: "700", fontSize: 11 },
  quizQuestion: { color: COLORS.blueDark, fontWeight: "700", fontSize: 13, flex: 1 },
  quizTypeBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    overflow: "hidden",
    color: COLORS.white,
  },
  quizTypeWord: { backgroundColor: "#6B85C6", color: COLORS.white },
  quizTypeVerse: { backgroundColor: "#4C6FB8", color: COLORS.white },
  quizTypeCount: { backgroundColor: "#2F4F88", color: COLORS.white },
  quizRef: { color: COLORS.gray, fontSize: 12, marginBottom: 6 },
  quizVerse: { color: COLORS.blueDark, fontSize: 13, lineHeight: 20, marginBottom: 8, fontStyle: "italic" },
  quizSectionTitle: { color: COLORS.gray, fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" },
  quizOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quizOption: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  quizOptionActive: {
    borderColor: COLORS.blueDark,
    backgroundColor: COLORS.blueDark,
  },
  quizOptionWordActive: { backgroundColor: "#6B85C6", borderColor: "#6B85C6" },
  quizOptionVerseActive: { backgroundColor: "#4C6FB8", borderColor: "#4C6FB8" },
  quizOptionCountActive: { backgroundColor: "#2F4F88", borderColor: "#2F4F88" },
  quizOptionText: { color: COLORS.blueDark, fontWeight: "700", fontSize: 12 },
  quizOptionTextActive: { color: COLORS.white },
  quizActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 },
  quizCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  quizCancelText: { color: COLORS.gray, fontWeight: "600" },
  quizValidate: {
    flex: 1,
    backgroundColor: COLORS.blueDark,
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  quizValidateDisabled: { opacity: 0.6 },
  quizValidateText: { color: COLORS.white, fontWeight: "700" },
  quizResultBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 10,
    maxHeight: 210,
    backgroundColor: COLORS.white,
  },
  quizResultTitle: { fontSize: 13, fontWeight: "800", color: COLORS.blueDark, marginBottom: 8 },
  correctionsScroll: { maxHeight: 150 },
  correctionItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 8,
    marginTop: 8,
  },
  correctionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  correctionItemOk: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  correctionState: { fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  correctionStateOk: { backgroundColor: "#E7F5EC", color: "#166534" },
  correctionStateKo: { backgroundColor: "#FDECEC", color: "#B91C1C" },
  correctionPrompt: { fontSize: 12, fontWeight: "700", color: COLORS.blueDark },
  correctionRef: { fontSize: 11, color: COLORS.gray, marginBottom: 4 },
  correctionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  correctionLabel: { fontSize: 11, color: COLORS.gray },
  correctionWrong: { fontSize: 12, color: "#B91C1C", fontWeight: "700" },
  correctionRight: { fontSize: 12, color: "#166534", fontWeight: "700" },
  correctionPerfect: { fontSize: 12, color: COLORS.blueDark },

  completeBtn: {
    backgroundColor: COLORS.blueDark,
    flexDirection: "row",
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  completeBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
});
