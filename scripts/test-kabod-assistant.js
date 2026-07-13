const fs = require("node:fs");

function readEnvValue(name) {
  const env = fs.readFileSync(".env", "utf8");
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return (match?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const supabaseUrl = readEnvValue("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = readEnvValue("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY absent dans .env");
  }

  const host = new URL(supabaseUrl).hostname;
  console.log(`project_ref=${host.split(".")[0]}`);

  const response = await fetch(`${supabaseUrl}/functions/v1/kabod-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      message: "Bonjour, aide-moi à prier en une phrase.",
      history: [],
    }),
  });

  const raw = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Keep raw preview below.
  }

  console.log(`status=${response.status}`);
  console.log(`mode=${parsed?.mode ?? "unknown"}`);
  console.log(`has_message=${Boolean(parsed?.message?.text)}`);
  console.log(`preview=${String(parsed?.message?.text ?? raw).slice(0, 240)}`);
}

main().catch((error) => {
  console.error(`REQUEST_FAILED=${error.message}`);
  if (error.cause) {
    console.error(`CAUSE=${error.cause.code ?? error.cause.message ?? String(error.cause)}`);
  }
  process.exitCode = 1;
});
