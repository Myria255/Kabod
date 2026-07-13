// @ts-nocheck

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  role: ChatRole;
  text: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "claude-sonnet-5";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      text: sanitizeText(item.text, 1200),
    }))
    .filter((item) => item.text)
    .slice(-12);
}

function quickReplies() {
  return [
    { id: "discern", label: "Discerner", prompt: "Pose-moi trois questions pour discerner cette situation." },
    { id: "pray", label: "Prière", prompt: "Aide-moi à formuler une prière courte." },
    { id: "bible", label: "Verset", prompt: "Aide-moi à comprendre un passage biblique sans l’inventer." },
    { id: "human", label: "Responsable", prompt: "Je veux contacter un responsable." },
  ];
}

function demoResponse(message?: string) {
  return json({
    mode: "demo",
    message: {
      text:
        message ??
        "Mode démonstration actif. Configurez ANTHROPIC_API_KEY dans les secrets Supabase pour activer les réponses Claude.",
      quickReplies: quickReplies(),
    },
  });
}

function buildSystemPrompt() {
  return [
    "Tu es Kabod Assistant, un assistant de guidance intégré dans une application chrétienne.",
    "Réponds toujours en français, avec un ton chaleureux, sobre, pastoral, clair et non culpabilisant.",
    "Tu aides l’utilisateur à clarifier ce qu’il vit, discerner, prier, comprendre un passage biblique et choisir un prochain pas sage.",
    "Ne remplace jamais un pasteur, un responsable, un médecin, un juriste ou un professionnel de santé mentale.",
    "Pour les situations sensibles, dangereuses, violentes, suicidaires, abusives ou urgentes, encourage l’utilisateur à contacter immédiatement une personne de confiance, un responsable humain ou les services d’urgence locaux.",
    "Ne promets jamais le secret absolu dans une situation de danger.",
    "Ne donne pas de diagnostic médical, juridique, financier ou psychologique.",
    "Ne cite jamais un verset biblique précis si la référence ou le texte n’est pas fourni. Si tu n’es pas sûr, dis-le et demande la référence exacte.",
    "Commence souvent par une courte reformulation de ce que l’utilisateur exprime.",
    "Pose une seule question principale à la fois quand la situation est confuse.",
    "Propose ensuite 2 ou 3 petits choix d’action simples.",
    "Ne sois pas long : privilégie des réponses utiles, respirables et directement applicables.",
  ].join("\n");
}

function toClaudeMessages(history: ChatMessage[], message: string) {
  return [
    ...history.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.text,
    })),
    {
      role: "user",
      content: message,
    },
  ];
}

function extractClaudeText(data: any) {
  const content = data?.content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const message = sanitizeText(body.message, 2400);
  const history = sanitizeHistory(body.history);

  if (!message) {
    return json({ error: "Message is required" }, 400);
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const claudeModel = Deno.env.get("CLAUDE_MODEL") || DEFAULT_MODEL;

  if (!anthropicApiKey) {
    return demoResponse();
  }

  const endpoint = "https://api.anthropic.com/v1/messages";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: claudeModel,
        system: buildSystemPrompt(),
        messages: toClaudeMessages(history, message),
        temperature: 0.45,
        max_tokens: 850,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Claude request failed", response.status, detail.slice(0, 600));
      return demoResponse("Claude n’est pas joignable pour le moment. Le mode démonstration reste disponible.");
    }

    const data = await response.json();
    const text = extractClaudeText(data);

    if (!text) {
      return demoResponse("Je n’ai pas pu formuler une réponse IA pour le moment. Le mode démonstration reste disponible.");
    }

    return json({
      mode: "claude",
      message: {
        text,
        quickReplies: quickReplies(),
      },
    });
  } catch (error) {
    console.error("Kabod assistant error", error);
    return demoResponse("Connexion IA indisponible pour le moment. Le mode démonstration reste disponible.");
  }
});
