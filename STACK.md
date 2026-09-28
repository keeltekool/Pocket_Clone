# Pocket Clone — STACK.md

> Save-for-later link manager with AI categorization and iOS shortcut.
> Last updated: 2026-09-28

## Services & Env Vars (5 on Vercel)

| Service | Purpose | Env Var(s) |
|---------|---------|------------|
| Clerk | Auth (Email + Google) | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| Neon | PostgreSQL (buckets, links) | `DATABASE_URL` |
| Anthropic | `claude-haiku-4-5` — AI link categorization (3.5 Haiku retired 19.02.2026; categorize failed until 28.09.2026) | `ANTHROPIC_API_KEY` |
| — | iOS shortcut authentication | `SHORTCUT_API_KEY` |

Env vars stored in: Vercel (production), `.env.local` (local dev)

## Gotchas

| Issue | Fix |
|-------|-----|
| `FUNCTION_INVOCATION_FAILED` (tsconfig) | Use `module: "CommonJS"` + `moduleResolution: "node"` |
| `FUNCTION_INVOCATION_FAILED` (handler format) | Use Vercel `(req, res)` format, NOT Web API `Request`/`Response` |
| `@clerk #crypto` error | Use Node.js runtime — Edge runtime can't run `@clerk/backend` |
| API key mismatch | `vercel env add` piped with `echo` adds `\n` — use `printf` (no trailing newline) |
| Frontend data empty | Drizzle returns camelCase, code expected snake_case — match property names |
| `dotenv` loads wrong file | Use `config({ path: ".env.local" })`, not `import "dotenv/config"` |
| Slow link saving (~30s) | Save instantly, fetch metadata in background via CORS proxy |

## Deployment

```bash
vercel --prod --yes                                    # deploy
printf "value-here" | vercel env add VAR_NAME production  # add env var (use printf, NOT echo)
npx drizzle-kit push                                   # push DB schema
```
