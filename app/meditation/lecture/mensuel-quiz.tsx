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
  const progressPercent = Math.min(100, Math.round((answeredCount / Math.max(questions.length, 1)) * 100));
  const scoreLabel = result?.passed ? "Mois validé" : "À reprendre";
  const currentQuestion = questions[currentIndex];
  const hasAnsweredCurrent = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const isLastQuestion = currentIndex >= Math.max(questions.length - 1, 0);
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const showValidateAction = allAnswered || isLastQuestion;
  const showQuestionNav = Boolean(currentQuestion) && !result;

  function selectAnswer(option: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
    if (!isLastQuestion) {
      setTimeout(() => {
        setCurrentIndex((prev) => (prev === currentIndex ? Math.min(questions.length - 1, prev + 1) : prev));
      }, 260);
    }
  }

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
        <View style={styles.loadingIcon}>
          <Feather name="book-open" size={22} color={COLORS.gold} />
        </View>
        <Text style={styles.loadingTitle}>Préparation du quiz</Text>
        <Text style={styles.loadingText}>Nous construisons vos questions à partir du livre terminé.</Text>
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

      <ScrollView
        contentContainerStyle={[styles.content, showQuestionNav && styles.contentWithFixedNav]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Quiz du mois {safeMonth}</Text>
            <Text style={styles.heroTitle}>{title || "Livre"}</Text>
            <Text style={styles.heroSub}>Validez votre lecture avec un quiz simple et progressif.</Text>

            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{answeredCount}/{questions.length}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.questionDots}
            >
              {questions.map((question, index) => {
                const active = index === currentIndex;
                const answered = answers[question.id] !== undefined;
                return (
                  <TouchableOpacity
                    key={question.id}
                    activeOpacity={0.75}
                    style={[
                      styles.questionDot,
                      answered && styles.questionDotAnswered,
                      active && styles.questionDotActive,
                    ]}
                    onPress={() => setCurrentIndex(index)}
                  >
                    <Text
                      style={[
                        styles.questionDotText,
                        answered && styles.questionDotTextAnswered,
                        active && styles.questionDotTextActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {currentQuestion && (
            <View style={styles.quizItem}>
              <View style={styles.questionTop}>
                <View>
                  <Text style={styles.stepText}>Question {currentIndex + 1}</Text>
                  <Text style={styles.stepSubText}>sur {questions.length}</Text>
                </View>
                {hasAnsweredCurrent && (
                  <Text style={styles.answeredText}>Répondu</Text>
                )}
              </View>

              <Text style={[styles.quizQuestion, isSmallScreen && styles.quizQuestionSmall]}>
                {currentQuestion.prompt}
              </Text>

              <View style={styles.verseBox}>
                <Text style={styles.quizRef}>{currentQuestion.verseReference}</Text>
                <Text style={[styles.quizVerse, isSmallScreen && styles.quizVerseSmall]}>
                  {currentQuestion.verseWithBlank}
                </Text>
              </View>

              <View style={styles.optionsRow}>
                {currentQuestion.options.map((opt, index) => {
                  const active = answers[currentQuestion.id] === opt;
                  return (
                    <TouchableOpacity
                      key={`${currentQuestion.id}-${opt}`}
                      activeOpacity={0.82}
                      style={[styles.optionBtn, active && styles.optionBtnActive]}
                      onPress={() => selectAnswer(opt)}
                    >
                      <Text style={[styles.optionIndexText, active && styles.optionIndexTextActive]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                      <Text
                        style={[
                          styles.optionText,
                          isSmallScreen && styles.optionTextSmall,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </View>
          )}

          {result && (
            <View style={[styles.resultCard, result.passed ? styles.resultCardPassed : styles.resultCardFailed]}>
              <View style={styles.resultTop}>
                <View style={styles.resultBody}>
                  <Text style={styles.resultKicker}>{scoreLabel}</Text>
                  <Text style={styles.resultText}>{result.score}%</Text>
                </View>
              </View>

              <Text style={styles.resultHint}>
                {result.passed
                  ? "Votre score atteint le seuil demandé. Le mois peut être validé."
                  : `Vous devez atteindre ${PASS_SCORE}% pour valider ce mois.`}
              </Text>

              {!result.passed && (
                <TouchableOpacity style={styles.retryPrimaryBtn} onPress={relaunchQuiz}>
                  <View style={styles.ctaIcon}>
                    <Feather name="refresh-cw" size={16} color={COLORS.blueDark} />
                  </View>
                  <Text style={styles.retryPrimaryText}>Nouveau quiz</Text>
                </TouchableOpacity>
              )}

              {validationSaved && (
                <View style={styles.resultNoticeSuccess}>
                  <Feather name="check-circle" size={16} color="#166534" />
                  <Text style={styles.resultSuccess}>Validation enregistrée. Le livre est validé.</Text>
                </View>
              )}
              {validationError && (
                <View style={styles.resultNoticeError}>
                  <Feather name="alert-circle" size={16} color="#B91C1C" />
                  <Text style={styles.resultError}>{validationError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.toggleCorrectionsBtn}
                onPress={() => setShowCorrections((prev) => !prev)}
              >
                <Feather name={showCorrections ? "eye-off" : "list"} size={16} color={COLORS.blueDark} />
                <Text style={styles.toggleCorrectionsText}>
                  {showCorrections ? "Masquer les corrections" : "Voir les corrections"}
                </Text>
              </TouchableOpacity>

              {showCorrections && (
                <View style={styles.correctionsList}>
                  {result.corrections.map((c, index) => (
                    <View key={c.id} style={[styles.correctionItem, c.isCorrect ? styles.correctionOk : styles.correctionKo]}>
                      <View style={styles.correctionTop}>
                        <Text style={styles.correctionNumber}>{index + 1}</Text>
                        <Feather
                          name={c.isCorrect ? "check-circle" : "x-circle"}
                          size={16}
                          color={c.isCorrect ? "#166534" : "#B91C1C"}
                        />
                      </View>
                      <Text style={styles.correctionPrompt}>{c.prompt}</Text>
                      <Text style={styles.correctionRef}>{c.verseReference}</Text>
                      <Text style={styles.correctionLine}>Votre réponse: {c.userAnswer}</Text>
                      <Text style={styles.correctionLine}>Bonne réponse: {c.correctAnswer}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

        {result?.passed && (
          <View style={[styles.actions, isSmallScreen && styles.actionsStack]}>
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                styles.newQuizBtn,
                isSmallScreen && styles.fullWidthBtn,
              ]}
              onPress={relaunchQuiz}
            >
              <Text style={[styles.secondaryBtnText, styles.newQuizBtnText]}>
                Nouveau quiz
              </Text>
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
              <Feather name="chevron-left" size={16} color={COLORS.blueDark} />
              <Text style={styles.navBtnGhostText}>Précédent</Text>
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
                <View style={styles.ctaIcon}>
                  <Feather name="check" size={16} color={COLORS.blueDark} />
                </View>
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
                <View style={styles.ctaIcon}>
                  <Feather name="chevron-right" size={16} color={COLORS.blueDark} />
                </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    paddingHorizontal: 28,
  },
  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  loadingTitle: { color: COLORS.blueDark, fontSize: 20, fontWeight: "900", marginBottom: 6 },
  loadingText: { color: COLORS.gray, fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 21 },
  headerSafe: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
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
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { color: COLORS.blueDark, fontSize: 18, fontWeight: "900" },
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 32 },
  contentWithFixedNav: { paddingBottom: 120 },
  contentInner: { width: "100%", alignSelf: "center" },
  heroCard: {
    paddingTop: 4,
    paddingBottom: 18,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  heroIcon: { display: "none" },
  monthPill: { display: "none" },
  monthPillText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "800" },
  heroEyebrow: { color: COLORS.gold, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  heroTitle: { marginTop: 6, fontSize: 28, lineHeight: 34, fontWeight: "900", color: COLORS.blueDark },
  heroSub: { marginTop: 6, color: COLORS.gray, fontSize: 14, lineHeight: 21 },
  statsRow: { display: "none" },
  statBox: { display: "none" },
  statValue: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  statLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "700" },
  progressRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  progressText: { color: COLORS.gray, fontWeight: "800", fontSize: 13, minWidth: 52, textAlign: "right" },
  questionDots: {
    gap: 8,
    paddingTop: 14,
    paddingRight: 8,
  },
  questionDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  questionDotAnswered: {
    backgroundColor: "#F8FAFC",
    borderColor: COLORS.gold,
  },
  questionDotActive: {
    backgroundColor: COLORS.blueDark,
    borderColor: COLORS.blueDark,
  },
  questionDotText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "900",
  },
  questionDotTextAnswered: {
    color: COLORS.blueDark,
  },
  questionDotTextActive: {
    color: COLORS.white,
  },
  quizItem: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    marginBottom: 12,
  },
  questionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  stepText: { fontSize: 12, fontWeight: "900", color: COLORS.gold, textTransform: "uppercase" },
  stepSubText: { fontSize: 12, color: COLORS.gray, fontWeight: "700", marginTop: 2 },
  answeredText: { color: COLORS.gray, fontSize: 12, fontWeight: "800" },
  answerBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  answerBadgeDone: { backgroundColor: COLORS.blueDark },
  quizQuestion: { fontSize: 18, color: COLORS.blueDark, fontWeight: "800", marginBottom: 12, lineHeight: 26 },
  quizQuestionSmall: { fontSize: 16, lineHeight: 23 },
  verseBox: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  quizRef: { fontSize: 11, color: COLORS.gray, marginBottom: 7, fontWeight: "900", textTransform: "uppercase" },
  quizVerse: {
    fontSize: 15,
    color: COLORS.blueDark,
    fontStyle: "italic",
    lineHeight: 22,
  },
  quizVerseSmall: { fontSize: 14, lineHeight: 21 },
  optionsRow: { gap: 10 },
  optionBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    minHeight: 52,
  },
  optionBtnLarge: {
    minWidth: "47%",
  },
  optionBtnActive: { backgroundColor: "#F8FAFC", borderColor: COLORS.gold },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionIndexActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  optionIndexText: { color: COLORS.gray, fontSize: 13, fontWeight: "900", width: 18, textAlign: "center" },
  optionIndexTextActive: { color: COLORS.gold },
  optionText: { flex: 1, color: COLORS.blueDark, fontWeight: "700", fontSize: 15, lineHeight: 21 },
  optionTextSmall: { fontSize: 13, lineHeight: 18 },
  optionTextActive: { color: COLORS.blueDark },
  bottomSafe: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  fixedNavWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
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
  navBtnGhostText: { color: COLORS.blueDark, fontWeight: "800", fontSize: 14 },
  navBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  navBtnPrimaryDisabled: { opacity: 0.65 },
  navBtnPrimaryText: { color: COLORS.blueDark, fontWeight: "900", fontSize: 14 },
  ctaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultCard: {
    marginTop: 2,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 16,
  },
  resultCardPassed: { borderColor: "#D9E8D8" },
  resultCardFailed: { borderColor: "#F4D6D6" },
  resultTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  resultIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIconPassed: { backgroundColor: "#166534" },
  resultIconFailed: { backgroundColor: "#B91C1C" },
  resultBody: { flex: 1 },
  resultKicker: { color: COLORS.gray, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  resultText: { color: COLORS.blueDark, fontWeight: "900", fontSize: 28, lineHeight: 34 },
  resultHint: { marginTop: 12, color: COLORS.gray, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  retryPrimaryBtn: {
    marginTop: 14,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  retryPrimaryText: {
    color: COLORS.blueDark,
    fontSize: 15,
    fontWeight: "900",
  },
  resultNoticeSuccess: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    padding: 10,
  },
  resultNoticeError: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    padding: 10,
  },
  resultSuccess: { flex: 1, color: "#166534", fontSize: 13, fontWeight: "800" },
  resultError: { flex: 1, color: "#B91C1C", fontSize: 13, fontWeight: "800" },
  toggleCorrectionsBtn: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  toggleCorrectionsText: { color: COLORS.blueDark, fontWeight: "900", fontSize: 13 },
  correctionsList: { marginTop: 12, gap: 10 },
  correctionItem: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  correctionOk: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  correctionKo: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  correctionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  correctionNumber: { color: COLORS.gray, fontSize: 12, fontWeight: "900" },
  correctionPrompt: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900", lineHeight: 19 },
  correctionRef: { marginTop: 4, color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  correctionLine: { marginTop: 4, color: COLORS.blueDark, fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  actionsStack: { flexDirection: "column" },
  fullWidthBtn: { width: "100%" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: { color: COLORS.gray, fontWeight: "800", fontSize: 14 },
  newQuizBtn: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  newQuizBtnText: {
    color: COLORS.blueDark,
    fontWeight: "900",
  },
  retryBtn: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  retryBtnText: {
    color: COLORS.blueDark,
    fontWeight: "900",
  },
  backPlanBtn: {
    marginTop: 10,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.blueDark,
  },
  backPlanBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 14 },
});
