# Pocket Clone — STACK.md

> Save-for-later link manager with AI categorization and iOS shortcut. Single owner, password gate.
> Last updated: 2026-10-24

## Services & Env Vars (4 on Vercel)

| Service | Purpose | Env Var(s) |
|---------|---------|------------|
| — | Password gate (`lib/auth.ts`): HMAC-signed HttpOnly cookie, 180 days with "Remember this device", else browser session. Changing the value signs every device out. | `APP_PASSWORD` |
| Neon | PostgreSQL (buckets, links); all rows use `user_id = 'owner'` | `DATABASE_URL` |
| Anthropic | `claude-haiku-4-5` — AI link categorization (3.5 Haiku retired 19.02.2026; categorize failed until 28.09.2026) | `ANTHROPIC_API_KEY` |
| — | iOS shortcut authentication (`/save.html?key=…&url=…`) | `SHORTCUT_API_KEY` |

Env vars stored in: Vercel (production), `.env.local` (local dev)

## Gotchas

| Issue | Fix |
|-------|-----|
| Login box blank (Oct 2026) | Was Clerk loaded as `clerk-js@latest`; v6 moved the UI to `@clerk/ui`. Clerk removed 24.10.2026 for the password gate. Never load CDN scripts as `@latest`. |
| Titles never filled (Oct 2026) | Public CORS proxy `api.allorigins.win` died (522). Metadata is fetched server-side: `lib/metadata.ts` via `/api/metadata` and `/api/save`. |
| `vercel dev` DEV_RECURSIVE_INVOCATION | Don't add a `dev` script that calls `vercel dev`. It also doesn't load `.env.local`: `set -a; . ./.env.local; set +a; vercel dev --listen 4820` |
| `FUNCTION_INVOCATION_FAILED` (tsconfig) | Use `module: "CommonJS"` + `moduleResolution: "node"` |
| `FUNCTION_INVOCATION_FAILED` (handler format) | Use Vercel `(req, res)` format, NOT Web API `Request`/`Response` |
| API key mismatch | `vercel env add` with a trailing newline breaks the value: temp file + `cmd /c "vercel env add NAME production < file"` |
| Frontend data empty | Drizzle returns camelCase, code expected snake_case — match property names |
| `dotenv` loads wrong file | Use `config({ path: ".env.local" })`, not `import "dotenv/config"` |
| Slow link saving (~30s) | Save instantly, fetch metadata in background |

## Deployment

```bash
node ~/.claude/scripts/ship.mjs /                      # push → Vercel git deploy → verify-deploy + check-ui-flows
node scripts/check-ui-flows.mjs [baseUrl]              # click-through (password login, 1440 + 375), cleans up its rows
npx drizzle-kit push                                   # push DB schema
```
