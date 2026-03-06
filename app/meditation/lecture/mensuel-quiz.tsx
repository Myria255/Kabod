import { getChapters } from "@/src/constants/bible";
import {
  generateReliableQuizForReadings,
  type ReliableQuizQuestion,
} from "@/src/services/quizGenerator";
import { markDayAsCompleted } from "@/src/services/readingSync";
import { supabase } from "@/supabaseClient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  blueDark: "#0F172A",
  gold: "#D4AF37",
  white: "#FFFFFF",
  grayLight: "#F1F5F9",
  gray: "#64748B",
  bg: "#F8FAFC",
};
const MIN_QUESTIONS = 20;
const PASS_SCORE = 85;

type QuizCorrection = {
  id: string;
  prompt: string;
  verseReference: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

function ensureMinimumQuestions(
  questions: ReliableQuizQuestion[],
  minCount: number
): ReliableQuizQuestion[] {
  if (questions.length >= minCount) return questions.slice(0, minCount);
  if (questions.length === 0) return [];

  const expanded: ReliableQuizQuestion[] = [];
  let idx = 0;
  while (expanded.length < minCount) {
    const base = questions[idx % questions.length];
    expanded.push({
      ...base,
      id: `${base.id}-dup-${idx}`,
    });
    idx++;
  }
  return expanded;
}

export default function MensuelQuizPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bookId, bookName, month } = useLocalSearchParams<{
    bookId?: string;
    bookName?: string;
    month?: string;
  }>();

  const safeBookId = (Array.isArray(bookId) ? bookId[0] : bookId) ?? "";
  const safeBookName = (Array.isArray(bookName) ? bookName[0] : bookName) ?? "";
  const safeMonth = Number((Array.isArray(month) ? month[0] : month) ?? "");
  const title = safeBookName || (safeBookId ? safeBookId.charAt(0).toUpperCase() + safeBookId.slice(1) : "");
  const isSmallScreen = width < 380;
  const contentMaxWidth = Math.min(720, width - 24);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<ReliableQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    corrections: QuizCorrection[];
  } | null>(null);
  const [showCorrections, setShowCorrections] = useState(false);
  const [validationSaved, setValidationSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [answers, questions]
  );
  const currentQuestion = questions[currentIndex];
  const hasAnsweredCurrent = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const isLastQuestion = currentIndex >= Math.max(questions.length - 1, 0);
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const showValidateAction = allAnswered || isLastQuestion;
  const showQuestionNav = Boolean(currentQuestion) && !result;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (!safeBookId || !Number.isFinite(safeMonth) || safeMonth < 1 || safeMonth > 12) {
          Alert.alert("Quiz indisponible", "Informations du quiz invalides.");
          router.back();
          return;
        }

        const chapters = getChapters(safeBookId)
          .map((chapter) => Number(chapter))
          .filter((chapter) => Number.isFinite(chapter) && chapter >= 1);
        const readings = chapters.map((chapter) => ({ bookId: safeBookId, chapter }));
        const generated = generateReliableQuizForReadings(readings, 60);
        const finalQuestions = ensureMinimumQuestions(generated, MIN_QUESTIONS);

        if (finalQuestions.length < MIN_QUESTIONS) {
          Alert.alert("Quiz indisponible", `Impossible de generer ${MIN_QUESTIONS} questions pour ce livre.`);
          router.back();
          return;
        }

        setQuestions(finalQuestions);
        setAnswers({});
        setCurrentIndex(0);
        setResult(null);
        setShowCorrections(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router, safeBookId, safeMonth]);

  async function submitQuiz() {
    if (questions.some((q) => answers[q.id] === undefined)) {
      Alert.alert("Quiz incomplet", "Repondez aux 20 questions avant de valider.");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    const total = questions.length;
    const correctCount = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= PASS_SCORE;
    const corrections: QuizCorrection[] = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      verseReference: q.verseReference,
      userAnswer: answers[q.id] ?? "-",
      correctAnswer: q.correctAnswer,
      isCorrect: answers[q.id] === q.correctAnswer,
    }));
    setResult({ score, passed, corrections });
    setShowCorrections(false);
    setValidationSaved(false);
    setValidationError(null);

    if (!passed) {
      return;
    }

    setSubmitting(true);
    try {
      await markDayAsCompleted(user.id, "mensuel", safeMonth);
      setValidationSaved(true);
    } catch (e: any) {
      setValidationError(e?.message ?? "Echec lors de la sauvegarde de la validation.");
    } finally {
      setSubmitting(false);
    }
  }

  function relaunchQuiz() {
    const chapters = getChapters(safeBookId)
      .map((chapter) => Number(chapter))
      .filter((chapter) => Number.isFinite(chapter) && chapter >= 1);
    const readings = chapters.map((chapter) => ({ bookId: safeBookId, chapter }));
    const generated = generateReliableQuizForReadings(readings, 60);
    const finalQuestions = ensureMinimumQuestions(generated, MIN_QUESTIONS);
    if (finalQuestions.length < MIN_QUESTIONS) {
      Alert.alert("Quiz indisponible", "Impossible de generer un nouveau quiz.");
      return;
    }
    setQuestions(finalQuestions);
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setShowCorrections(false);
    setValidationSaved(false);
    setValidationError(null);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Chargement du quiz...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={22} color={COLORS.blueDark} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Quiz mensuel</Text>
          <View style={styles.backButton} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={[styles.content, showQuestionNav && styles.contentWithFixedNav]} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{title || "Livre"}</Text>
          <Text style={styles.heroSub}>
            {MIN_QUESTIONS} questions minimum pour valider le mois {safeMonth}.
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.round((answeredCount / Math.max(questions.length, 1)) * 100))}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{answeredCount}/{questions.length}</Text>
          </View>
        </View>

        {currentQuestion && (
          <View style={styles.quizItem}>
            <Text style={styles.stepText}>
              Question {currentIndex + 1} / {questions.length}
            </Text>
            <Text style={[styles.quizQuestion, isSmallScreen && styles.quizQuestionSmall]}>
              {currentQuestion.prompt}
            </Text>
            <Text style={styles.quizRef}>{currentQuestion.verseReference}</Text>
            <Text style={[styles.quizVerse, isSmallScreen && styles.quizVerseSmall]}>
              {currentQuestion.verseWithBlank}
            </Text>
            <View style={styles.optionsRow}>
              {currentQuestion.options.map((opt) => {
                const active = answers[currentQuestion.id] === opt;
                return (
                  <TouchableOpacity
                    key={`${currentQuestion.id}-${opt}`}
                    style={[
                      styles.optionBtn,
                      !isSmallScreen && styles.optionBtnLarge,
                      active && styles.optionBtnActive,
                    ]}
                    onPress={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt }))}
                  >
                    <Text style={[styles.optionText, isSmallScreen && styles.optionTextSmall, active && styles.optionTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

          </View>
        )}

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>
              Resultat: {result.score}% {result.passed ? "(Valide)" : "(Non valide)"} - seuil {PASS_SCORE}%
            </Text>
            {!result.passed && (
              <Text style={styles.resultHint}>
                Vous n'avez pas atteint {PASS_SCORE}%. Corrigez et relancez un nouveau quiz.
              </Text>
            )}
            {validationSaved && (
              <Text style={styles.resultSuccess}>
                Validation enregistree. Le livre est valide.
              </Text>
            )}
            {validationError && (
              <Text style={styles.resultError}>{validationError}</Text>
            )}

            <TouchableOpacity
              style={styles.toggleCorrectionsBtn}
              onPress={() => setShowCorrections((prev) => !prev)}
            >
              <Text style={styles.toggleCorrectionsText}>
                {showCorrections ? "Masquer les corrections" : "Voir les corrections"}
              </Text>
            </TouchableOpacity>

            {showCorrections && (
              <View style={styles.correctionsList}>
                {result.corrections.map((c) => (
                  <View key={c.id} style={[styles.correctionItem, c.isCorrect ? styles.correctionOk : styles.correctionKo]}>
                    <Text style={styles.correctionPrompt}>{c.prompt}</Text>
                    <Text style={styles.correctionRef}>{c.verseReference}</Text>
                    <Text style={styles.correctionLine}>Votre reponse: {c.userAnswer}</Text>
                    <Text style={styles.correctionLine}>Bonne reponse: {c.correctAnswer}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {result && (
          <View style={[styles.actions, isSmallScreen && styles.actionsStack]}>
            <TouchableOpacity style={[styles.secondaryBtn, isSmallScreen && styles.fullWidthBtn]} onPress={relaunchQuiz}>
              <Text style={styles.secondaryBtnText}>Nouveau quiz</Text>
            </TouchableOpacity>
          </View>
        )}
        {validationSaved && (
          <TouchableOpacity
            style={styles.backPlanBtn}
            onPress={() => router.replace("/meditation/lecture/mensuel" as any)}
          >
            <Text style={styles.backPlanBtnText}>Retour au plan mensuel</Text>
          </TouchableOpacity>
        )}
        </View>
      </ScrollView>

      {showQuestionNav && (
        <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
          <View style={styles.fixedNavWrap}>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnGhost, currentIndex === 0 && styles.navBtnDisabled]}
              disabled={currentIndex === 0}
              onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            >
              <Text style={styles.navBtnGhostText}>Precedent</Text>
            </TouchableOpacity>
            {showValidateAction ? (
              <TouchableOpacity
                style={[
                  styles.navBtnPrimary,
                  (submitting || (!allAnswered && !hasAnsweredCurrent)) && styles.navBtnPrimaryDisabled,
                ]}
                disabled={submitting || (!allAnswered && !hasAnsweredCurrent)}
                onPress={submitQuiz}
              >
                <Text style={styles.navBtnPrimaryText}>
                  {submitting ? "Validation..." : "Valider le quiz"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navBtnPrimary}
                onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                <Text style={styles.navBtnPrimaryText}>Suivant</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.white },
  loadingText: { color: COLORS.gray, fontSize: 14, fontWeight: "600" },
  headerSafe: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
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
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "800" },
  content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 30 },
  contentWithFixedNav: { paddingBottom: 120 },
  contentInner: { width: "100%", alignSelf: "center" },
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    padding: 18,
    marginBottom: 14,
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: COLORS.blueDark },
  heroSub: { marginTop: 6, color: COLORS.gray, fontSize: 15, lineHeight: 22 },
  progressRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.grayLight,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  progressText: { color: COLORS.blueDark, fontWeight: "700", fontSize: 13, minWidth: 44, textAlign: "right" },
  quizItem: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    padding: 16,
    marginBottom: 10,
  },
  quizQuestion: { fontSize: 16, color: COLORS.blueDark, fontWeight: "800", marginBottom: 6, lineHeight: 23 },
  quizQuestionSmall: { fontSize: 15, lineHeight: 22 },
  stepText: { fontSize: 12, fontWeight: "700", color: COLORS.gray, marginBottom: 6 },
  quizRef: { fontSize: 12, color: COLORS.gray, marginBottom: 6, fontWeight: "700", textTransform: "uppercase" },
  quizVerse: {
    fontSize: 15,
    color: COLORS.blueDark,
    marginBottom: 10,
    fontStyle: "italic",
    lineHeight: 22,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quizVerseSmall: { fontSize: 14, lineHeight: 21 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    minHeight: 44,
  },
  optionBtnLarge: {
    minWidth: "47%",
  },
  optionBtnActive: { backgroundColor: COLORS.blueDark, borderColor: COLORS.blueDark },
  optionText: { color: COLORS.blueDark, fontWeight: "700", fontSize: 14, lineHeight: 20 },
  optionTextSmall: { fontSize: 13, lineHeight: 18 },
  optionTextActive: { color: COLORS.white },
  bottomSafe: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  fixedNavWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  navBtnGhost: {
    backgroundColor: COLORS.white,
    borderColor: "#CBD5E1",
  },
  navBtnDisabled: { opacity: 0.45 },
  navBtnGhostText: { color: COLORS.blueDark, fontWeight: "700", fontSize: 14 },
  navBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gold,
  },
  navBtnPrimaryDisabled: { opacity: 0.65 },
  navBtnPrimaryText: { color: COLORS.blueDark, fontWeight: "800", fontSize: 13 },
  resultCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 12,
  },
  resultText: { color: COLORS.blueDark, fontWeight: "800", fontSize: 15 },
  resultHint: { marginTop: 6, color: COLORS.gray, fontSize: 13 },
  resultSuccess: { marginTop: 6, color: "#166534", fontSize: 13, fontWeight: "700" },
  resultError: { marginTop: 6, color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  toggleCorrectionsBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  toggleCorrectionsText: { color: COLORS.blueDark, fontWeight: "700", fontSize: 13 },
  correctionsList: { marginTop: 10, gap: 8 },
  correctionItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#F8FAFC",
  },
  correctionOk: { borderColor: "#BBF7D0" },
  correctionKo: { borderColor: "#FECACA" },
  correctionPrompt: { color: COLORS.blueDark, fontSize: 13, fontWeight: "700" },
  correctionRef: { marginTop: 2, color: COLORS.gray, fontSize: 12 },
  correctionLine: { marginTop: 3, color: COLORS.blueDark, fontSize: 12 },
  actions: { flexDirection: "row", gap: 10 },
  actionsStack: { flexDirection: "column" },
  fullWidthBtn: { width: "100%" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: { color: COLORS.gray, fontWeight: "700", fontSize: 14 },
  backPlanBtn: {
    marginTop: 10,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.blueDark,
  },
  backPlanBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
});
