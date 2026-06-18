import AsyncStorage from "@react-native-async-storage/async-storage";

import { BIBLE } from "@/src/constants/bible";
import { supabase } from "@/supabaseClient";

export type KabodAssistantRole = "user" | "assistant" | "system";

export type KabodAssistantQuickReply = {
  id: string;
  label: string;
  prompt: string;
};

export type KabodAssistantCard = {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionPrompt?: string;
};

export type KabodAssistantReflection = {
  id: string;
  title: string;
  steps: {
    title: string;
    prompt: string;
  }[];
};

export type KabodAssistantFormField = {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

export type KabodAssistantForm = {
  id: string;
  title: string;
  description: string;
  submitLabel: string;
  requiresConfirmation?: boolean;
  fields: KabodAssistantFormField[];
};

export type KabodAssistantMessage = {
  id: string;
  role: KabodAssistantRole;
  text: string;
  createdAt: string;
  quickReplies?: KabodAssistantQuickReply[];
  cards?: KabodAssistantCard[];
  reflection?: KabodAssistantReflection;
  form?: KabodAssistantForm;
};

export type KabodAssistantStatus = "online" | "demo" | "offline";

export type KabodAssistantConversation = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  status: KabodAssistantStatus;
};

export type KabodAssistantRequest = {
  userId?: string | null;
  message: string;
  history: KabodAssistantMessage[];
};

export type KabodAssistantResponse = {
  message: KabodAssistantMessage;
  status: KabodAssistantStatus;
};

const HISTORY_KEY = "KABOD_ASSISTANT_HISTORY_V1";
const CONVERSATIONS_KEY = "KABOD_ASSISTANT_CONVERSATIONS_V1";
const CONVERSATION_MESSAGES_KEY = "KABOD_ASSISTANT_CONVERSATION_MESSAGES_V1";
const MAX_HISTORY_ITEMS = 40;
const MAX_CONVERSATIONS = 24;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ");
}

function buildHistoryKey(userId?: string | null) {
  return `${HISTORY_KEY}:${userId || "guest"}`;
}

function buildConversationsKey(userId?: string | null) {
  return `${CONVERSATIONS_KEY}:${userId || "guest"}`;
}

function buildConversationMessagesKey(userId: string | null | undefined, conversationId: string) {
  return `${CONVERSATION_MESSAGES_KEY}:${userId || "guest"}:${conversationId}`;
}

function conversationTitleFrom(messages: KabodAssistantMessage[]) {
  const firstUserText = messages.find((item) => item.role === "user")?.text.trim();
  if (!firstUserText) return "Nouvelle discussion";
  return firstUserText.length > 42 ? `${firstUserText.slice(0, 42).trim()}...` : firstUserText;
}

function conversationPreviewFrom(messages: KabodAssistantMessage[]) {
  const lastMessage = [...messages].reverse().find((item) => item.role !== "system")?.text.trim();
  if (!lastMessage) return "Commencez un échange avec Kabod";
  return lastMessage.length > 78 ? `${lastMessage.slice(0, 78).trim()}...` : lastMessage;
}

const BOOK_ALIASES: Record<string, string[]> = {
  Apocalypse: ["revelation", "revelations", "apocalipse", "apoc"],
  Psaumes: ["psaume", "ps"],
  Proverbes: ["proverbe", "prov"],
  Matthieu: ["mathieu", "matthew", "mt"],
  Marc: ["mark", "mc"],
  Luc: ["luke", "lc"],
  Jean: ["john", "jn"],
  Romains: ["romain", "romans"],
  Éphésiens: ["ephesiens", "ephesien"],
  Hébreux: ["hebreux"],
};

function bookSearchNames(book: string) {
  return [book, ...(BOOK_ALIASES[book] ?? [])].map(normalize);
}

function findVerseReference(input: string) {
  const compact = normalize(input)
    .replace(/(\d+)\s*v\s*(\d+)/g, "$1 $2")
    .replace(/(\d+)\s*v\b/g, "$1 ")
    .replace(/\b(chapitre|chap|ch|verset|verse|v)\b/g, " ")
    .replace(/[:.,;!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const books = Object.keys(BIBLE).sort((a, b) => normalize(b).length - normalize(a).length);
  let found: { book: string; index: number; nameLength: number } | null = null;

  for (const candidate of books) {
    for (const name of bookSearchNames(candidate)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = compact.match(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`));
      if (!match || match.index === undefined) continue;
      const index = match.index + (match[0].startsWith(" ") ? 1 : 0);
      if (!found || index < found.index || (index === found.index && name.length > found.nameLength)) {
        found = { book: candidate, index, nameLength: name.length };
      }
    }
  }

  if (!found) return null;

  const afterBook = compact.slice(found.index + found.nameLength).trim();
  const match = afterBook.match(/^(\d+)\s+(\d+)\b/);
  if (!match) return null;

  const [, rawChapter, rawVerse] = match;
  const verse = BIBLE[found.book]?.[rawChapter]?.[rawVerse];
  if (!verse) return null;

  return {
    label: `${found.book} ${rawChapter}:${rawVerse}`,
    text: verse,
  };
}

function intentOf(message: string) {
  const text = normalize(message);
  const hasAny = (words: string[]) => words.some((word) => text.includes(normalize(word)));

  if (hasAny(["salut", "bonjour", "bonsoir", "coucou", "hello", "hey"]) && text.length < 32) return "greeting";
  if (hasAny(["oui", "ok", "d accord", "dac", "continue", "je sais pas", "je ne sais pas"]) && text.length < 48) {
    return "continue";
  }
  if (hasAny(["responsable", "pasteur", "berger", "leader", "contact", "humain", "parler a quelqu un"])) return "human";
  if (hasAny(["prie", "priere", "prier", "intercession", "dieu aide moi", "seigneur aide moi"])) return "prayer";
  if (hasAny(["explique", "comprendre", "verset", "passage", "psaume", "proverbe", "jean", "romains", "matthieu", "bible"])) return "bible";
  if (hasAny(["lecture", "plan", "chapitre", "mediter", "meditation", "lire"])) return "reading";
  if (hasAny(["choix", "decision", "hesite", "quoi faire", "choisir", "direction", "orientation", "discernement"])) return "decision";
  if (hasAny(["mari", "femme", "couple", "ami", "amie", "famille", "parent", "enfant", "relation", "frere", "soeur", "dispute", "conflit"])) return "relationship";
  if (hasAny(["pardon", "culp", "faute", "peche", "honte", "repent", "tombe", "rechute", "condamn"])) return "repentance";
  if (hasAny(["reflech", "discern", "question", "clarifier", "comprendre ce que je ressens", "aide moi a penser"])) return "reflection";
  if (hasAny(["encourage", "fatigu", "peur", "triste", "stress", "angoisse", "anxieux", "anxiete", "seul", "solitude", "mal", "pleure", "decourage", "epuise", "vide"])) return "encouragement";
  if (hasAny(["cherche", "recherche", "contenu", "podcast", "audio", "video", "theme"])) return "search";
  if (
    ["salut", "bonjour", "bonsoir", "coucou", "hello", "hey"].some(
      (greeting) => text === greeting || text.startsWith(`${greeting} `)
    )
  ) {
    return "greeting";
  }
  if (["oui", "ok", "d'accord", "dac", "je sais pas", "je ne sais pas", "continue"].includes(text)) {
    return "continue";
  }
  if (text.includes("responsable") || text.includes("pasteur") || text.includes("contact") || text.includes("humain")) {
    return "human";
  }
  if (text.includes("prie") || text.includes("prière") || text.includes("priere")) return "prayer";
  if (text.includes("explique") || text.includes("comprendre") || text.includes("verset")) return "bible";
  if (text.includes("lecture") || text.includes("plan")) return "reading";
  if (
    text.includes("choix") ||
    text.includes("decision") ||
    text.includes("décision") ||
    text.includes("hesite") ||
    text.includes("hésite") ||
    text.includes("sais pas quoi faire")
  ) {
    return "decision";
  }
  if (
    text.includes("mari") ||
    text.includes("femme") ||
    text.includes("couple") ||
    text.includes("ami") ||
    text.includes("famille") ||
    text.includes("parent") ||
    text.includes("relation")
  ) {
    return "relationship";
  }
  if (
    text.includes("pardon") ||
    text.includes("culp") ||
    text.includes("faute") ||
    text.includes("peche") ||
    text.includes("péché") ||
    text.includes("honte")
  ) {
    return "repentance";
  }
  if (text.includes("réfléch") || text.includes("reflech") || text.includes("discern") || text.includes("question")) {
    return "reflection";
  }
  if (text.includes("encourage") || text.includes("fatigu") || text.includes("peur") || text.includes("triste")) {
    return "encouragement";
  }
  if (text.includes("cherche") || text.includes("recherche") || text.includes("contenu") || text.includes("podcast")) {
    return "search";
  }
  return "general";
}

function baseQuickReplies(): KabodAssistantQuickReply[] {
  return [
    { id: "discern", label: "M'aider à réfléchir", prompt: "Aide-moi à réfléchir à ce que je vis avec des questions." },
    { id: "pray", label: "Prière", prompt: "Aide-moi à formuler une prière courte." },
    { id: "explain", label: "Verset", prompt: "Explique Jean 3 16 sans inventer de verset." },
    { id: "human", label: "Responsable", prompt: "Je veux contacter un responsable." },
  ];
}

function quickRepliesForIntent(intent: string): KabodAssistantQuickReply[] {
  if (intent === "decision") {
    return [
      { id: "clarify-choice", label: "Clarifier le choix", prompt: "Aide-moi a poser clairement les options devant moi." },
      { id: "discern-peace", label: "Discerner la paix", prompt: "Aide-moi a discerner ce qui apporte la paix et ce qui me presse." },
      { id: "pray-choice", label: "Prier ce choix", prompt: "Aide-moi a prier pour cette decision." },
    ];
  }
  if (intent === "relationship") {
    return [
      { id: "name-wound", label: "Nommer la tension", prompt: "Aide-moi a nommer ce qui me blesse dans cette relation." },
      { id: "wise-words", label: "Trouver les mots", prompt: "Aide-moi a formuler une parole calme et vraie." },
      { id: "pray-relation", label: "Prier pour elle", prompt: "Aide-moi a prier pour cette relation." },
    ];
  }
  if (intent === "repentance") {
    return [
      { id: "receive-grace", label: "Recevoir la grace", prompt: "Aide-moi a accueillir le pardon sans me condamner." },
      { id: "repair-step", label: "Reparer", prompt: "Aide-moi a voir s'il y a une action juste a poser." },
      { id: "confession-prayer", label: "Priere simple", prompt: "Aide-moi a formuler une priere de repentance." },
    ];
  }
  if (intent === "encouragement") {
    return [
      { id: "breathe", label: "Me poser", prompt: "Aide-moi a ralentir et a mettre des mots sur ce que je ressens." },
      { id: "small-step", label: "Un petit pas", prompt: "Aide-moi a choisir un petit pas possible aujourd'hui." },
      { id: "ask-help", label: "Besoin d'aide", prompt: "Je pense avoir besoin de parler a un responsable." },
    ];
  }
  return baseQuickReplies();
}

function shortUserEcho(message: string) {
  const clean = message.trim().replace(/\s+/g, " ");
  if (!clean) return "ce que vous venez de partager";
  return clean.length > 88 ? `${clean.slice(0, 88).trim()}...` : clean;
}

function explainFoundVerse(reference: string, verseText: string) {
  return `${reference} : "${verseText}"\n\nCe passage met l'accent sur ce que le texte affirme directement. On peut le regarder simplement : ce que Dieu revele, ce que cela produit dans le coeur, puis comment le vivre aujourd'hui.`;
}

export function createWelcomeMessage(userName?: string | null): KabodAssistantMessage {
  return {
    id: "welcome",
    role: "assistant",
    createdAt: nowIso(),
    text: `Bonjour${userName ? ` ${userName}` : ""}. Je suis là. Vous pouvez me parler simplement, comme vous le feriez avec quelqu'un qui vous écoute vraiment. Je peux vous aider à réfléchir, prier, comprendre un passage biblique ou préparer une demande à un responsable.`,
    quickReplies: baseQuickReplies(),
    reflection: {
      id: "welcome-reflection",
      title: "Commencer avec calme",
      steps: [
        {
          title: "Nommer",
          prompt: "Aide-moi à nommer ce que je ressens en ce moment.",
        },
        {
          title: "Discerner",
          prompt: "Pose-moi trois questions pour discerner la prochaine bonne action.",
        },
        {
          title: "Prier",
          prompt: "Transforme ma situation en prière courte.",
        },
      ],
    },
    cards: [
      {
        id: "discern-card",
        title: "Chemin de réflexion",
        body: "Avancer par questions simples : ce que je ressens, ce que je crois, ce que je peux faire.",
        actionLabel: "Commencer",
        actionPrompt: "Aide-moi à réfléchir à une situation avec des questions.",
      },
      {
        id: "bible-card",
        title: "Comprendre un passage",
        body: "Donnez une référence exacte. Je ne citerai pas de verset que je ne retrouve pas.",
        actionLabel: "Expliquer",
        actionPrompt: "Explique Jean 3 16 sans inventer de verset.",
      },
    ],
  };
}

export function createUserMessage(text: string): KabodAssistantMessage {
  return {
    id: createId("user"),
    role: "user",
    text,
    createdAt: nowIso(),
  };
}

export async function loadKabodAssistantHistory(userId?: string | null) {
  const raw = await AsyncStorage.getItem(buildHistoryKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as KabodAssistantMessage[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

export async function saveKabodAssistantHistory(userId: string | null | undefined, messages: KabodAssistantMessage[]) {
  await AsyncStorage.setItem(
    buildHistoryKey(userId),
    JSON.stringify(messages.slice(-MAX_HISTORY_ITEMS))
  );
}

export async function clearKabodAssistantHistory(userId?: string | null) {
  await AsyncStorage.removeItem(buildHistoryKey(userId));
}

export async function loadKabodAssistantConversations(userId?: string | null) {
  const raw = await AsyncStorage.getItem(buildConversationsKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as KabodAssistantConversation[];
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item?.id && item?.title)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, MAX_CONVERSATIONS)
      : [];
  } catch {
    return [];
  }
}

async function saveKabodAssistantConversations(
  userId: string | null | undefined,
  conversations: KabodAssistantConversation[]
) {
  const sorted = conversations
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_CONVERSATIONS);
  await AsyncStorage.setItem(buildConversationsKey(userId), JSON.stringify(sorted));
  return sorted;
}

export async function loadKabodAssistantConversationMessages(
  userId: string | null | undefined,
  conversationId: string
) {
  const raw = await AsyncStorage.getItem(buildConversationMessagesKey(userId, conversationId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as KabodAssistantMessage[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

export async function createKabodAssistantConversation(
  userId: string | null | undefined,
  messages: KabodAssistantMessage[]
) {
  const now = nowIso();
  const conversation: KabodAssistantConversation = {
    id: createId("conversation"),
    title: conversationTitleFrom(messages),
    preview: conversationPreviewFrom(messages),
    createdAt: now,
    updatedAt: now,
    status: "demo",
  };
  const conversations = await loadKabodAssistantConversations(userId);
  await AsyncStorage.setItem(
    buildConversationMessagesKey(userId, conversation.id),
    JSON.stringify(messages.slice(-MAX_HISTORY_ITEMS))
  );
  await saveKabodAssistantConversations(userId, [conversation, ...conversations]);
  return conversation;
}

export async function saveKabodAssistantConversationMessages(
  userId: string | null | undefined,
  conversationId: string,
  messages: KabodAssistantMessage[],
  status: KabodAssistantStatus
) {
  await AsyncStorage.setItem(
    buildConversationMessagesKey(userId, conversationId),
    JSON.stringify(messages.slice(-MAX_HISTORY_ITEMS))
  );
  const conversations = await loadKabodAssistantConversations(userId);
  const updatedAt = nowIso();
  const next = conversations.map((conversation) =>
    conversation.id === conversationId
      ? {
          ...conversation,
          title: conversationTitleFrom(messages),
          preview: conversationPreviewFrom(messages),
          updatedAt,
          status,
        }
      : conversation
  );
  return saveKabodAssistantConversations(userId, next);
}

export async function deleteKabodAssistantConversation(userId: string | null | undefined, conversationId: string) {
  const conversations = await loadKabodAssistantConversations(userId);
  await AsyncStorage.removeItem(buildConversationMessagesKey(userId, conversationId));
  return saveKabodAssistantConversations(
    userId,
    conversations.filter((conversation) => conversation.id !== conversationId)
  );
}

function demoResponseFor(request: KabodAssistantRequest): KabodAssistantResponse {
  const intent = intentOf(request.message);
  const verse = findVerseReference(request.message);
  const echo = shortUserEcho(request.message);
  const previousUserMessage = request.history
    .filter((item) => item.role === "user")
    .slice(-2, -1)[0]?.text;

  let text = "Je vous écoute. Prenez votre temps : vous pouvez écrire comme ça vient, même si ce n'est pas encore très clair.";
  let cards: KabodAssistantCard[] | undefined;
  let reflection: KabodAssistantReflection | undefined;
  let form: KabodAssistantForm | undefined;

  if (intent === "greeting") {
    text = "Bonjour, je suis là avec vous. Comment ça va aujourd'hui ? Vous pouvez me dire en quelques mots ce que vous avez sur le coeur, ou choisir une piste pour commencer.";
    reflection = {
      id: "greeting-reflection",
      title: "Ouvrir l'échange",
      steps: [
        { title: "Parler librement", prompt: "J'aimerais parler librement de ce que je vis." },
        { title: "Être guidé", prompt: "Pose-moi quelques questions pour m'aider à réfléchir." },
        { title: "Prier", prompt: "Aide-moi à commencer par une courte prière." },
      ],
    };
  }

  if (intent === "continue") {
    text = previousUserMessage
      ? "D'accord, on garde le fil de ce que vous venez de dire. Je vous propose d'avancer doucement : clarifier ce qui se passe, discerner ce qui compte, puis choisir un petit pas concret."
      : "D'accord. On peut avancer doucement. Dites-moi simplement ce qui vous occupe le plus en ce moment, meme avec peu de mots.";
    reflection = {
      id: "continue-reflection",
      title: "Continuer ensemble",
      steps: [
        { title: "Clarifier", prompt: "Aide-moi a clarifier ce que je ressens vraiment." },
        { title: "Discerner", prompt: "Pose-moi des questions pour comprendre ce que Dieu peut m'apprendre ici." },
        { title: "Agir", prompt: "Aide-moi a choisir un prochain pas simple pour aujourd'hui." },
      ],
    };
  }

  if (intent === "general" || intent === "reflection") {
    text = "Je ne vais pas répondre trop vite. On peut prendre la situation pas à pas : ce que vous ressentez, ce qui compte vraiment, puis le prochain pas possible.";
    text = `Je vous suis. Quand vous dites "${echo}", je ne veux pas vous donner une reponse automatique. On peut le regarder ensemble : ce que cela reveille en vous, ce que vous esperez, et le prochain pas qui serait juste.`;
    reflection = {
      id: "general-reflection",
      title: "Réfléchir en 3 pas",
      steps: [
        {
          title: "Ce que je vis",
          prompt: "Aide-moi à clarifier ce que je vis en ce moment.",
        },
        {
          title: "Ce qui compte",
          prompt: "Aide-moi à identifier ce qui est important dans cette situation.",
        },
        {
          title: "Prochain pas",
          prompt: "Aide-moi à choisir un prochain pas concret et sage.",
        },
      ],
    };
  }

  if (intent === "prayer") {
    text = "Avant d'écrire la prière, je peux vous aider à la rendre personnelle. Choisissez ce que vous voulez poser devant Dieu.";
    reflection = {
      id: "prayer-reflection",
      title: "Construire la prière",
      steps: [
        { title: "Reconnaître", prompt: "Aide-moi à reconnaître ce que je ressens devant Dieu." },
        { title: "Demander", prompt: "Aide-moi à formuler ma demande principale." },
        { title: "Confier", prompt: "Écris une prière courte à partir de ce que je t'ai dit." },
      ],
    };
  }

  if (intent === "bible") {
    text = verse
      ? `${verse.label} dit : "${verse.text}"\n\nJe peux expliquer ce passage à partir de ce texte. Je ne citerai pas de verset absent de la Bible locale.`
      : "Indiquez une référence précise, par exemple `Jean 3 16`. Je peux expliquer un passage existant dans la Bible locale, mais je ne vais pas inventer de verset.";
    if (verse) {
      text = explainFoundVerse(verse.label, verse.text);
    }
    reflection = verse
      ? {
          id: "bible-reflection",
          title: "Observer le passage",
          steps: [
            { title: "Observer", prompt: `Que remarque-t-on dans ${verse.label} ?` },
            { title: "Comprendre", prompt: `Explique ${verse.label} avec des mots simples.` },
            { title: "Appliquer", prompt: `Comment appliquer ${verse.label} aujourd'hui ?` },
          ],
        }
      : undefined;
  }

  if (intent === "reading") {
    text = "Je vous propose un rythme simple : un chapitre par jour, puis une courte note : ce que le texte révèle, ce qu'il corrige, et une action concrète pour aujourd'hui.";
    cards = [
      {
        id: "monthly-plan",
        title: "Plan mensuel",
        body: "Reprendre votre programme mensuel dans Kabod.",
        actionLabel: "Continuer le plan",
        actionPrompt: "Aide-moi à continuer mon plan mensuel.",
      },
      {
        id: "annual-plan",
        title: "Plan annuel",
        body: "Avancer plus lentement avec une lecture régulière.",
        actionLabel: "Plan annuel",
        actionPrompt: "Explique-moi le plan annuel.",
      },
    ];
  }

  if (intent === "decision") {
    text = `Je vous entends sur ceci : "${echo}". Avant de chercher une reponse rapide, on peut regarder ce choix avec calme : ce qui vous attire, ce qui vous inquiete, et ce qui semble juste devant Dieu.`;
    reflection = {
      id: "decision-reflection",
      title: "Discerner une decision",
      steps: [
        { title: "Les options", prompt: "Aide-moi a poser clairement les options devant moi." },
        { title: "La paix", prompt: "Aide-moi a distinguer la paix profonde de la peur ou de la pression." },
        { title: "Le pas sage", prompt: "Aide-moi a choisir le prochain pas le plus sage, sans me precipiter." },
      ],
    };
  }

  if (intent === "relationship") {
    text = `Ce que vous dites touche a une relation, donc je vais y aller doucement. Dans "${echo}", il y a peut-etre une blessure, une attente ou une parole difficile a poser. On peut clarifier cela sans accuser ni vous ecraser.`;
    reflection = {
      id: "relationship-reflection",
      title: "Regarder la relation",
      steps: [
        { title: "Ce qui blesse", prompt: "Aide-moi a nommer ce qui me blesse ou me fatigue dans cette relation." },
        { title: "Ma part", prompt: "Aide-moi a voir ma part sans culpabilite excessive." },
        { title: "Une parole", prompt: "Aide-moi a preparer une parole calme, vraie et respectueuse." },
      ],
    };
  }

  if (intent === "repentance") {
    text = "Je ne vais pas vous enfoncer. Si vous parlez de faute, de honte ou de pardon, on peut avancer avec verite et grace : reconnaitre ce qui doit l'etre, recevoir le pardon, puis poser une action juste si necessaire.";
    reflection = {
      id: "repentance-reflection",
      title: "Verite et grace",
      steps: [
        { title: "Reconnaitre", prompt: "Aide-moi a nommer sobrement ce qui n'etait pas juste." },
        { title: "Recevoir", prompt: "Aide-moi a accueillir le pardon de Dieu sans inventer de verset." },
        { title: "Reparer", prompt: "Aide-moi a voir s'il y a une reparation concrete a faire." },
      ],
    };
  }

  if (intent === "encouragement") {
    text = "Prenons cela doucement. Je peux vous aider à distinguer ce qui vous pèse, ce qui vous soutient, et le prochain petit pas possible.";
    reflection = {
      id: "encouragement-reflection",
      title: "Retrouver un appui",
      steps: [
        { title: "Alléger", prompt: "Aide-moi à nommer ce qui me pèse le plus." },
        { title: "Recevoir", prompt: "Aide-moi à identifier une source d'encouragement aujourd'hui." },
        { title: "Avancer", prompt: "Propose-moi un petit pas concret pour aujourd'hui." },
      ],
    };
  }

  if (intent === "search") {
    text = "Je peux vous aider à rechercher un thème dans vos contenus Kabod. Essayez un mot-clé comme prière, paix, foi, lecture ou podcast.";
    cards = [
      {
        id: "search-prayer",
        title: "Recherche de contenu",
        body: "Décrivez le thème que vous cherchez.",
        actionLabel: "Chercher un thème",
        actionPrompt: "Je cherche du contenu sur la paix.",
      },
    ];
  }

  if (intent === "human") {
    text = "Je peux préparer une demande de contact. Avant tout transfert, une confirmation sera demandée.";
    form = {
      id: "human-transfer",
      title: "Contacter un responsable",
      description: "Votre demande sera préparée pour être transmise à un responsable Kabod après confirmation.",
      submitLabel: "Préparer la demande",
      requiresConfirmation: true,
      fields: [
        { id: "subject", label: "Sujet", placeholder: "Ex: besoin de prière, accompagnement..." },
        { id: "details", label: "Message", placeholder: "Décrivez brièvement votre besoin", multiline: true },
      ],
    };
  }

  return {
    status: "demo",
    message: {
      id: createId("assistant"),
      role: "assistant",
      createdAt: nowIso(),
      text,
      quickReplies: quickRepliesForIntent(intent),
      cards,
      reflection,
      form,
    },
  };
}

export async function sendKabodAssistantMessage(request: KabodAssistantRequest): Promise<KabodAssistantResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("kabod-assistant", {
      body: {
        message: request.message,
        history: request.history.slice(0, -1).slice(-12).map((item) => ({
          role: item.role,
          text: item.text,
        })),
      },
    });

    if (error || data?.mode === "demo" || !data?.message?.text) {
      return demoResponseFor(request);
    }

    return {
      status: "online",
      message: {
        id: createId("assistant"),
        role: "assistant",
        createdAt: nowIso(),
        text: String(data.message.text),
        quickReplies: Array.isArray(data.message.quickReplies) ? data.message.quickReplies : baseQuickReplies(),
        cards: Array.isArray(data.message.cards) ? data.message.cards : undefined,
        reflection: data.message.reflection,
        form: data.message.form,
      },
    };
  } catch {
    return demoResponseFor(request);
  }
}
