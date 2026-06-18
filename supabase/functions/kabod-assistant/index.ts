// @ts-nocheck

type ChatMessage = {
  role: "user" | "assistant" | "system";
  text: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      role: item.role === "user" || item.role === "assistant" ? item.role : "user",
      text: typeof item.text === "string" ? item.text.slice(0, 1200) : "",
    }))
    .filter((item) => item.text.trim())
    .slice(-12);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const history = sanitizeHistory(body.history);

  if (!message) {
    return json({ error: "Message is required" }, 400);
  }

  if (!openAiKey) {
    return json({
      mode: "demo",
      message: {
        text: "Mode démonstration actif. Configurez OPENAI_API_KEY côté Supabase Edge Function pour activer les réponses IA.",
      },
    });
  }

  const systemPrompt = [
    "Quand l'utilisateur te salue, reponds naturellement avant de proposer une suite.",
    "Garde le contexte de la conversation et adapte ton ton a la maniere dont l'utilisateur parle.",
    "Ne sois pas generique : aide l'utilisateur a reflechir par des questions courtes, concretes et bienveillantes.",
    "Reformule toujours une partie concrete de ce que l'utilisateur vient de dire avant de conseiller.",
    "Propose une seule question principale a la fois, puis 2 ou 3 actions rapides adaptees au contexte.",
    "Si le message parle d'une relation, d'une decision, d'une fatigue, d'une culpabilite ou d'une peur, reponds specifiquement a ce theme.",
    "Ne sois jamais agressif, culpabilisant ou pressant.",
    "Tu es l'assistant Kabod, intégré dans une application chrétienne.",
    "Réponds en français, avec un ton professionnel, chaleureux, sobre et pastoral.",
    "Ne donne pas de diagnostic médical, légal ou financier.",
    "Demande confirmation avant toute action sensible, notamment transfert à un humain, demande de contact ou conservation d'informations sensibles.",
    "Ne cite jamais un verset biblique si la référence exacte n'est pas fournie dans le contexte utilisateur.",
    "Si tu n'es pas certain d'un verset, dis que tu ne veux pas l'inventer et demande la référence exacte.",
    "Propose un transfert vers un responsable humain quand la situation semble sensible, urgente ou pastorale.",
  ].join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((item) => ({
      role: item.role,
      content: item.text,
    })),
    { role: "user", content: message },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return json({ error: "OpenAI request failed", detail }, 502);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  return json({
    mode: "openai",
    message: {
      text: typeof text === "string" ? text : "Je n'ai pas pu formuler de réponse pour le moment.",
      quickReplies: [
        { id: "pray", label: "Prière", prompt: "Aide-moi à formuler une prière courte." },
        { id: "explain", label: "Expliquer un verset", prompt: "Explique un verset biblique sans l'inventer." },
        { id: "human", label: "Responsable", prompt: "Je veux contacter un responsable." },
      ],
    },
  });
});
