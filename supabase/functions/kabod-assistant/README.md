# Kabod Assistant avec Claude

Cette Edge Function garde la clé Claude/Anthropic côté Supabase, jamais dans l’application Expo.

## Secrets Supabase à configurer

```bash
supabase secrets set ANTHROPIC_API_KEY=ta_cle_anthropic
supabase secrets set CLAUDE_MODEL=claude-sonnet-5
```

`CLAUDE_MODEL` est optionnel. La fonction utilise `claude-sonnet-5` par défaut.

## Déploiement

```bash
supabase functions deploy kabod-assistant
```

L’application appelle déjà cette fonction via :

```ts
supabase.functions.invoke("kabod-assistant", ...)
```

Si `ANTHROPIC_API_KEY` n’est pas configurée ou si Claude est indisponible, l’app garde le mode démonstration.
