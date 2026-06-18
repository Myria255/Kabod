import { COLORS } from "@/src/constants/colors";
import { useUser } from "@/src/context/UserContext";
import {
  createKabodAssistantConversation,
  createUserMessage,
  createWelcomeMessage,
  deleteKabodAssistantConversation,
  loadKabodAssistantConversationMessages,
  loadKabodAssistantConversations,
  saveKabodAssistantConversationMessages,
  type KabodAssistantConversation,
  type KabodAssistantForm,
  type KabodAssistantMessage,
  sendKabodAssistantMessage,
  type KabodAssistantStatus,
} from "@/src/services/kabodAssistant";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const STARTER_PROMPTS = [
  "Aide-moi à réfléchir à une situation.",
  "Pose-moi trois questions de discernement.",
  "Transforme ma situation en prière.",
  "Je veux contacter un responsable.",
];

const GUIDANCE_PATHS = [
  {
    id: "discern",
    title: "Discerner",
    subtitle: "Questions guidées",
    icon: "compass-outline" as const,
    prompt: "Aide-moi à discerner une situation avec des questions simples.",
  },
  {
    id: "pray",
    title: "Prier",
    subtitle: "Mettre des mots",
    icon: "heart-outline" as const,
    prompt: "Aide-moi à transformer ce que je vis en prière.",
  },
  {
    id: "bible",
    title: "Comprendre",
    subtitle: "Avec une référence",
    icon: "book-outline" as const,
    prompt: "Explique Jean 3 16 sans inventer de verset.",
  },
];

function formatConversationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(value: Date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(value, yesterday);
}

type PendingForm = {
  form: KabodAssistantForm;
  values: Record<string, string>;
};

export default function GuidanceTabPage() {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const [conversations, setConversations] = useState<KabodAssistantConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<KabodAssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<KabodAssistantStatus>("demo");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [pendingForm, setPendingForm] = useState<PendingForm | null>(null);

  const userId = user?.user_id ?? null;
  const userName = user?.nom ?? null;
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.title} ${conversation.preview}`.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);
  const todayConversations = filteredConversations.filter((conversation) =>
    isSameDay(new Date(conversation.updatedAt), new Date())
  );
  const yesterdayConversations = filteredConversations.filter((conversation) =>
    isYesterday(new Date(conversation.updatedAt))
  );
  const olderConversations = filteredConversations.filter((conversation) => {
    const updatedAt = new Date(conversation.updatedAt);
    return !isSameDay(updatedAt, new Date()) && !isYesterday(updatedAt);
  });

  const statusLabel = useMemo(() => {
    if (isTyping) return "Kabod écrit...";
    if (status === "online") return "Connecté";
    if (status === "offline") return "Hors connexion";
    return "Mode démonstration";
  }, [isTyping, status]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function hydrate() {
        setLoadingHistory(true);
        const stored = await loadKabodAssistantConversations(userId);
        if (!active) return;
        setConversations(stored);
        setActiveConversationId(null);
        setMessages([]);
        setLoadingHistory(false);
      }

      hydrate();
      return () => {
        active = false;
      };
    }, [userId])
  );

  async function persist(
    nextMessages: KabodAssistantMessage[],
    nextStatus: KabodAssistantStatus = status,
    conversationId = activeConversationId
  ) {
    setMessages(nextMessages);
    if (conversationId) {
      const nextConversations = await saveKabodAssistantConversationMessages(
        userId,
        conversationId,
        nextMessages,
        nextStatus
      );
      setConversations(nextConversations);
    }
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  async function openConversation(conversationId: string) {
    setLoadingHistory(true);
    const conversation = conversations.find((item) => item.id === conversationId);
    const storedMessages = await loadKabodAssistantConversationMessages(userId, conversationId);
    setActiveConversationId(conversationId);
    setStatus(conversation?.status ?? "demo");
    setMessages(storedMessages.length > 0 ? storedMessages : [createWelcomeMessage(userName)]);
    setLoadingHistory(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
  }

  async function startConversation(prompt?: string) {
    const welcome = createWelcomeMessage(userName);
    const conversation = await createKabodAssistantConversation(userId, [welcome]);
    const nextConversations = await loadKabodAssistantConversations(userId);
    setConversations(nextConversations);
    setActiveConversationId(conversation.id);
    setStatus("demo");
    setMessages([welcome]);
    if (prompt) {
      requestAnimationFrame(() => submitMessage(prompt, conversation.id, [welcome]));
    }
  }

  async function submitMessage(
    text: string,
    conversationId = activeConversationId,
    currentMessages = messages
  ) {
    const trimmed = text.trim();
    if (!trimmed || isTyping || !conversationId) return;

    setInput("");
    setError(null);
    const userMessage = createUserMessage(trimmed);
    const nextMessages = [...currentMessages, userMessage];
    await persist(nextMessages, status, conversationId);
    setIsTyping(true);

    try {
      const response = await sendKabodAssistantMessage({
        userId,
        message: trimmed,
        history: nextMessages,
      });
      setStatus(response.status);
      await persist([...nextMessages, response.message], response.status, conversationId);
    } catch {
      setStatus("offline");
      setError("Impossible de joindre l'assistant. Le mode démonstration reste disponible.");
    } finally {
      setIsTyping(false);
    }
  }

  async function resetConversation() {
    if (!activeConversationId) return;
    Alert.alert(
      "Supprimer cette discussion",
      "Voulez-vous vraiment supprimer cette discussion ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const nextConversations = await deleteKabodAssistantConversation(userId, activeConversationId);
            setConversations(nextConversations);
            setActiveConversationId(null);
            setMessages([]);
          },
        },
      ]
    );
  }

  function updateFormValue(formId: string, fieldId: string, value: string) {
    setFormValues((prev) => ({
      ...prev,
      [formId]: {
        ...(prev[formId] ?? {}),
        [fieldId]: value,
      },
    }));
  }

  function prepareForm(form: KabodAssistantForm) {
    const values = formValues[form.id] ?? {};
    const missing = form.fields.find((field) => !values[field.id]?.trim());
    if (missing) {
      Alert.alert("Champ requis", `Complétez le champ : ${missing.label}`);
      return;
    }

    if (form.requiresConfirmation) {
      setPendingForm({ form, values });
      Alert.alert(
        "Confirmer l'action",
        "Cette demande peut être transmise à un responsable Kabod. Confirmez-vous l'envoi ?",
        [
          { text: "Annuler", style: "cancel", onPress: () => setPendingForm(null) },
          {
            text: "Confirmer",
            onPress: () => confirmForm(form, values),
          },
        ]
      );
      return;
    }

    confirmForm(form, values);
  }

  async function confirmForm(form: KabodAssistantForm, values: Record<string, string>) {
    setPendingForm(null);
    const summary = Object.entries(values)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    await submitMessage(`Demande confirmée: ${form.title}\n${summary}`);
  }

  function renderMessage(message: KabodAssistantMessage) {
    const isUser = message.role === "user";
    return (
      <View key={message.id} style={[styles.messageWrap, isUser ? styles.messageWrapUser : styles.messageWrapAssistant]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={15} color={COLORS.blueDark} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.text}</Text>

          {message.cards && message.cards.length > 0 && (
            <View style={styles.cards}>
              {message.cards.map((card) => (
                <Pressable
                  key={card.id}
                  style={styles.card}
                  onPress={() => card.actionPrompt && submitMessage(card.actionPrompt)}
                >
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardBody}>{card.body}</Text>
                  {card.actionLabel && (
                    <View style={styles.cardAction}>
                      <Text style={styles.cardActionText}>{card.actionLabel}</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.blueDark} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {message.reflection && (
            <View style={styles.reflectionBox}>
              <Text style={styles.reflectionTitle}>{message.reflection.title}</Text>
              <View style={styles.reflectionSteps}>
                {message.reflection.steps.map((step, index) => (
                  <Pressable
                    key={`${message.reflection?.id}-${step.title}`}
                    style={styles.reflectionStep}
                    onPress={() => submitMessage(step.prompt)}
                  >
                    <View style={styles.reflectionNumber}>
                      <Text style={styles.reflectionNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.reflectionBody}>
                      <Text style={styles.reflectionStepTitle}>{step.title}</Text>
                      <Text style={styles.reflectionPrompt}>{step.prompt}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {message.form && (
            <View style={styles.formBox}>
              <Text style={styles.formTitle}>{message.form.title}</Text>
              <Text style={styles.formDescription}>{message.form.description}</Text>
              {message.form.fields.map((field) => (
                <View key={field.id} style={styles.formField}>
                  <Text style={styles.formLabel}>{field.label}</Text>
                  <TextInput
                    value={formValues[message.form!.id]?.[field.id] ?? ""}
                    onChangeText={(value) => updateFormValue(message.form!.id, field.id, value)}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.gray}
                    multiline={field.multiline}
                    style={[styles.formInput, field.multiline && styles.formInputMultiline]}
                  />
                </View>
              ))}
              <Pressable style={styles.formSubmit} onPress={() => prepareForm(message.form!)}>
                <Text style={styles.formSubmitText}>{message.form.submitLabel}</Text>
              </Pressable>
            </View>
          )}

          {!isUser && message.quickReplies && message.quickReplies.length > 0 && (
            <View style={styles.quickReplies}>
              {message.quickReplies.map((reply) => (
                <Pressable key={reply.id} style={styles.quickReply} onPress={() => submitMessage(reply.prompt)}>
                  <Text style={styles.quickReplyText}>{reply.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  function confirmDeleteConversation(conversation: KabodAssistantConversation) {
    Alert.alert("Supprimer la discussion", `Supprimer "${conversation.title}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const nextConversations = await deleteKabodAssistantConversation(userId, conversation.id);
          setConversations(nextConversations);
          if (activeConversationId === conversation.id) {
            setActiveConversationId(null);
            setMessages([]);
          }
        },
      },
    ]);
  }

  function renderConversationItem(conversation: KabodAssistantConversation) {
    return (
      <Pressable
        key={conversation.id}
        style={styles.conversationItem}
        onPress={() => openConversation(conversation.id)}
      >
        <View style={styles.conversationIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.blueDark} />
        </View>
        <View style={styles.conversationCopy}>
          <View style={styles.conversationTopLine}>
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {conversation.title}
            </Text>
            <Text style={styles.conversationDate}>{formatConversationDate(conversation.updatedAt)}</Text>
          </View>
          <Text style={styles.conversationPreview} numberOfLines={2}>
            {conversation.preview}
          </Text>
        </View>
        <Pressable
          style={styles.conversationDelete}
          onPress={() => confirmDeleteConversation(conversation)}
        >
          <Ionicons name="trash-outline" size={17} color={COLORS.gray} />
        </Pressable>
      </Pressable>
    );
  }

  function renderConversationSection(title: string, items: KabodAssistantConversation[]) {
    if (items.length === 0) return null;
    return (
      <View style={styles.historySection} key={title}>
        <Text style={styles.historySectionTitle}>{title}</Text>
        <View style={styles.conversationList}>
          {items.map(renderConversationItem)}
        </View>
      </View>
    );
  }

  function renderGuidanceNav() {
    return (
      <View style={[styles.guidanceNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={styles.navItem} onPress={() => startConversation()}>
          <Ionicons name="chatbubble-outline" size={20} color={activeConversationId ? COLORS.gold : COLORS.gray} />
          <Text style={[styles.navText, activeConversationId && styles.navTextActive]}>Chat</Text>
        </Pressable>
        <Pressable style={[styles.navItem, !activeConversationId && styles.navItemActive]} onPress={() => setActiveConversationId(null)}>
          <Ionicons name="time-outline" size={20} color={!activeConversationId ? COLORS.blueDark : COLORS.gray} />
          <Text style={[styles.navText, !activeConversationId && styles.navTextActive]}>Historique</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push("/bibliotheque")}>
          <Ionicons name="book-outline" size={20} color={COLORS.gray} />
          <Text style={styles.navText}>Bible</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push("/communaute")}>
          <Ionicons name="people-outline" size={20} color={COLORS.gray} />
          <Text style={styles.navText}>Communaute</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerIconButton} onPress={() => (activeConversationId ? setActiveConversationId(null) : undefined)}>
            <Ionicons name={activeConversationId ? "chevron-back" : "menu"} size={22} color={COLORS.blueDark} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Kabod</Text>
            {activeConversationId && <Text style={styles.headerSubtitle}>{statusLabel}</Text>}
          </View>
          <Pressable
            style={styles.profileButton}
            onPress={() => (activeConversationId ? resetConversation() : startConversation())}
          >
            <Ionicons
              name={activeConversationId ? "trash-outline" : "add"}
              size={activeConversationId ? 18 : 21}
              color={activeConversationId ? COLORS.gray : COLORS.gold}
            />
          </Pressable>
        </View>

        {loadingHistory ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: 18 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {!activeConversationId && (
              <>
                <View style={styles.historyIntro}>
                  <Text style={styles.historyTitle}>Historique</Text>
                  <Text style={styles.historyText}>Retrouvez vos echanges spirituels passes.</Text>
                </View>

                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color={COLORS.gray} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Rechercher une conversation..."
                    placeholderTextColor={COLORS.gray}
                    style={styles.searchInput}
                  />
                </View>

                <View style={styles.pathGrid}>
                  {GUIDANCE_PATHS.map((path) => (
                    <Pressable key={path.id} style={styles.intentChip} onPress={() => startConversation(path.prompt)}>
                      <Ionicons name={path.icon} size={16} color={COLORS.blueDark} />
                      <Text style={styles.intentChipText}>{path.title}</Text>
                    </Pressable>
                  ))}
                </View>

                {filteredConversations.length > 0 ? (
                  <>
                    {renderConversationSection("AUJOURD'HUI", todayConversations)}
                    {renderConversationSection("HIER", yesterdayConversations)}
                    {renderConversationSection("PLUS ANCIEN", olderConversations)}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={24} color={COLORS.gold} />
                    <Text style={styles.emptyTitle}>Aucune discussion trouvee</Text>
                    <Text style={styles.emptyText}>Commencez une nouvelle conversation avec Kabod.</Text>
                  </View>
                )}

                <Pressable style={styles.floatingStartButton} onPress={() => startConversation()}>
                  <Ionicons name="add" size={26} color={COLORS.white} />
                </Pressable>
              </>
            )}
            {false && (
              <>
                <View style={styles.heroPanel}>
                  <View style={styles.heroMark}>
                    <Ionicons name="sparkles" size={22} color={COLORS.blueDark} />
                  </View>
                  <Text style={styles.heroTitle}>Un espace pour réfléchir avec Dieu</Text>
                  <Text style={styles.heroText}>
                    Kabod ne répond pas seulement. Il vous aide à nommer, discerner et poser un prochain pas.
                  </Text>
                </View>

                <View style={styles.pathGrid}>
                  <Pressable style={styles.primaryStartCard} onPress={() => startConversation()}>
                    <View style={styles.primaryStartIcon}>
                      <Ionicons name="add" size={20} color={COLORS.blueDark} />
                    </View>
                    <View style={styles.primaryStartCopy}>
                      <Text style={styles.primaryStartTitle}>Nouvelle discussion</Text>
                      <Text style={styles.primaryStartText}>Écrire librement à Kabod</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                  </Pressable>
                </View>

                <View style={styles.pathGrid}>
                  {GUIDANCE_PATHS.map((path) => (
                    <Pressable key={path.id} style={styles.pathCard} onPress={() => startConversation(path.prompt)}>
                      <View style={styles.pathIcon}>
                        <Ionicons name={path.icon} size={19} color={COLORS.blueDark} />
                      </View>
                      <Text style={styles.pathTitle}>{path.title}</Text>
                      <Text style={styles.pathSubtitle}>{path.subtitle}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Vos discussions</Text>
                  <Text style={styles.sectionCount}>{conversations.length}</Text>
                </View>

                {conversations.length > 0 ? (
                  <View style={styles.conversationList}>
                    {conversations.map(renderConversationItem)}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={24} color={COLORS.gold} />
                    <Text style={styles.emptyTitle}>Aucune discussion pour le moment</Text>
                    <Text style={styles.emptyText}>Commencez par une question, une priÃ¨re ou une rÃ©flexion.</Text>
                  </View>
                )}

                <View style={styles.starters}>
                  {STARTER_PROMPTS.map((prompt) => (
                    <Pressable key={prompt} style={styles.starter} onPress={() => startConversation(prompt)}>
                      <Ionicons name="add-circle-outline" size={17} color={COLORS.gold} />
                      <Text style={styles.starterText}>{prompt}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {activeConversationId && (
              <View style={styles.todayChip}>
                <Text style={styles.todayChipText}>{"AUJOURD'HUI"}</Text>
              </View>
            )}
            {messages.map(renderMessage)}
            {isTyping && (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={COLORS.gold} />
                <Text style={styles.typingText}>Kabod écrit...</Text>
              </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {pendingForm && <Text style={styles.pendingText}>Confirmation en attente pour : {pendingForm.form.title}</Text>}
          </ScrollView>
        )}

        {activeConversationId && <View style={[styles.inputDock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputBox}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Écrivez librement..."
              placeholderTextColor={COLORS.gray}
              style={styles.input}
              multiline
            />
            <Pressable
              style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
              disabled={!input.trim() || isTyping}
              onPress={() => submitMessage(input)}
            >
              <Ionicons name="send" size={17} color={COLORS.white} />
            </Pressable>
          </View>
        </View>}
        {!activeConversationId && renderGuidanceNav()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  keyboard: { flex: 1 },
  header: {
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.gold, fontSize: 16, fontWeight: "900" },
  headerSubtitle: { color: COLORS.gray, fontSize: 10.5, fontWeight: "700", marginTop: 2 },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  agentRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  agentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  agentCopy: { flex: 1, minWidth: 0, gap: 4 },
  agentName: { color: COLORS.blueDark, fontSize: 19, fontWeight: "900" },
  agentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.emerald },
  statusDotOffline: { backgroundColor: "#B91C1C" },
  agentStatusText: { color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  messagesContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingTop: 18,
    gap: 12,
  },
  historyIntro: {
    paddingHorizontal: 4,
    paddingTop: 18,
    gap: 5,
  },
  historyTitle: { color: COLORS.blueDark, fontSize: 22, fontWeight: "900" },
  historyText: { color: COLORS.gray, fontSize: 13.5, lineHeight: 20, fontWeight: "600" },
  searchBox: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(230,234,242,0.78)",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: COLORS.blueDark,
    fontSize: 14,
    paddingVertical: 8,
  },
  intentChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  intentChipText: { color: COLORS.blueDark, fontSize: 11.5, fontWeight: "800" },
  historySection: { gap: 10, marginTop: 8 },
  historySectionTitle: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    paddingHorizontal: 2,
  },
  todayChip: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginBottom: 4,
  },
  todayChipText: { color: COLORS.gray, fontSize: 10.5, fontWeight: "900" },
  floatingStartButton: {
    position: "absolute",
    right: 20,
    bottom: 22,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  heroPanel: {
    borderRadius: 24,
    backgroundColor: COLORS.blueDark,
    padding: 20,
    gap: 12,
    marginBottom: 2,
  },
  heroMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: COLORS.white, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  heroText: { color: COLORS.blueSoft, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  pathGrid: { flexDirection: "row", gap: 9 },
  primaryStartCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryStartIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryStartCopy: { flex: 1, minWidth: 0 },
  primaryStartTitle: { color: COLORS.blueDark, fontSize: 15, fontWeight: "900" },
  primaryStartText: { color: COLORS.gray, fontSize: 12.5, fontWeight: "700", marginTop: 3 },
  pathCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    justifyContent: "space-between",
  },
  pathIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pathTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  pathSubtitle: { color: COLORS.gray, fontSize: 11.5, lineHeight: 16, fontWeight: "700" },
  starters: { gap: 9, marginBottom: 4 },
  starter: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  starterText: { flex: 1, color: COLORS.blueDark, fontSize: 13, fontWeight: "700" },
  sectionHeader: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: COLORS.blueDark, fontSize: 16, fontWeight: "900" },
  sectionCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.goldSoft,
    color: COLORS.blueDark,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 12,
    fontWeight: "900",
    paddingTop: Platform.OS === "ios" ? 6 : 0,
  },
  conversationList: { gap: 9 },
  conversationItem: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(230,234,242,0.82)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  conversationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationCopy: { flex: 1, minWidth: 0, gap: 5 },
  conversationTopLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  conversationTitle: { flex: 1, color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  conversationDate: { color: COLORS.gray, fontSize: 11.5, fontWeight: "700" },
  conversationPreview: { color: COLORS.gray, fontSize: 12.5, lineHeight: 17, fontWeight: "600" },
  conversationDelete: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900", textAlign: "center" },
  emptyText: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18, fontWeight: "600", textAlign: "center" },
  messageWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageWrapUser: { justifyContent: "flex-end" },
  messageWrapAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { maxWidth: "86%", borderRadius: 18, padding: 13, gap: 10 },
  assistantBubble: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: COLORS.blueDark,
    borderBottomRightRadius: 6,
  },
  messageText: { color: COLORS.blueDark, fontSize: 14, lineHeight: 21, fontWeight: "500" },
  userMessageText: { color: COLORS.white },
  quickReplies: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickReply: {
    borderRadius: 999,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  quickReplyText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "800" },
  cards: { gap: 8 },
  card: {
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  cardTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  cardBody: { marginTop: 4, color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
  cardAction: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  cardActionText: { color: COLORS.blueDark, fontSize: 12, fontWeight: "900" },
  reflectionBox: {
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: "#F2DF9A",
    padding: 12,
    gap: 10,
  },
  reflectionTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  reflectionSteps: { gap: 8 },
  reflectionStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    padding: 10,
  },
  reflectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  reflectionNumberText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  reflectionBody: { flex: 1 },
  reflectionStepTitle: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  reflectionPrompt: { color: COLORS.gray, fontSize: 12, lineHeight: 17, marginTop: 2 },
  formBox: {
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
  },
  formTitle: { color: COLORS.blueDark, fontSize: 14, fontWeight: "900" },
  formDescription: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
  formField: { gap: 5 },
  formLabel: { color: COLORS.blueDark, fontSize: 12, fontWeight: "800" },
  formInput: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    color: COLORS.blueDark,
  },
  formInputMultiline: { minHeight: 78, paddingTop: 10, textAlignVertical: "top" },
  formSubmit: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  formSubmitText: { color: COLORS.blueDark, fontSize: 13, fontWeight: "900" },
  typingRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: { color: COLORS.gray, fontSize: 13, fontWeight: "700" },
  errorText: { color: "#B91C1C", fontSize: 12.5, fontWeight: "700" },
  pendingText: { color: COLORS.gray, fontSize: 12.5, fontWeight: "700" },
  inputDock: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  inputBox: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    minHeight: 54,
    maxHeight: 116,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 7,
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.blueDark,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 92,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.45 },
  guidanceNav: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    minHeight: 70,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navItem: {
    flex: 1,
    minHeight: 48,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  navItemActive: {
    backgroundColor: COLORS.goldSoft,
  },
  navText: { color: COLORS.gray, fontSize: 10.5, fontWeight: "800" },
  navTextActive: { color: COLORS.blueDark },
});
