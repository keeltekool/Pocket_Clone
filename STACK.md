# Pocket Clone — STACK.md

> Save-for-later link manager: the owner adds a link (iPhone Shortcut, desktop bookmarklet, paste box), a Claude Managed
> Agent on Fable 5.1 reads the page and files it into one of his buckets, `pocket #N` pulls it into Claude Code over MCP.
> Single owner, password gate. v2 (Next.js rebuild) built 24.10.2026 from `docs/SPEC.md` + `docs/plans/2026-10-24-pocket-clone-v2.md`.
> Last updated: 2026-10-24

## Stack

Next.js 16.4.3 (App Router, `src/`), Tailwind 4.3 (tokens imported from `livery/tokens.css`, the Livery package of this
look), Drizzle 0.45 + `@neondatabase/serverless` (neon-http), `mcp-handler` 2.3 + `@modelcontextprotocol/server` 2.3,
`@anthropic-ai/sdk` 1.3 (Managed Agents beta), `@mozilla/readability` + `linkedom` for page text, zod 4. Fonts Fraunces +
Source Sans 3 via `next/font/google`. Vercel functions in `fra1` (`vercel.json`), Neon in eu-central-1.

## Services & Env Vars (5 on Vercel)

| Service | Purpose | Env Var(s) |
|---------|---------|------------|
| — | Password gate (`src/lib/auth.ts`): HMAC-signed HttpOnly cookie, 180 days with "Remember this device", else browser session; 20 wrong passwords / 15 min close new logins (`login_failures`). Changing the value signs every device out. | `APP_PASSWORD` |
| Neon | PostgreSQL: `items`, `buckets`, `bucket_suggestions`, `login_failures` (+ the old v1 tables renamed `v1_links` / `v1_buckets`, kept for the owner to drop) | `DATABASE_URL` |
| Anthropic Managed Agents | Agent `pocket-sorter` (Fable 5.1, effort medium) files every save through the app's MCP server; one session per save, $1 list-cost cap. Resource IDs (env, vault, credential, agent) in `agent/ids.json`, prompt in `agent/sorter.md`, sync with `npm run agent:sync`. Key "Pocket-Clone 2" in the $100/mo credit org. | `ANTHROPIC_API_KEY` |
| — | iPhone Shortcut: `POST /api/save` with header `x-api-key`; body `{ url }` may be any shared text containing a link | `SHORTCUT_API_KEY` |
| — | Bearer token for `/api/mcp` (Claude Code user-scope server `pocket` + the agent's vault `static_bearer` credential) | `MCP_TOKEN` |
| — | Local only (`.env.local`): `POCKET_AGENT=off` starts no agent sessions from a dev machine (the agent can only reach the deployed `/api/mcp`); a save then counts a failed attempt and the stuck rule turns it Unsorted | `POCKET_AGENT` |

Env vars stored in: Vercel (production), `.env.local` (local). `vercel env add` via temp file + `cmd /c "... < file"`.

## Scripts

```bash
npm run build && npx next start -p 3100      # local checks (never `next dev` from a background shell on Windows)
node scripts/check-page.mjs                  # normalizeUrl / firstUrl / one real fetch (Dokobit) / PDF → nulls
node scripts/check-api.mjs http://localhost:3100    # 16 HTTP steps incl. /api/save
node scripts/check-mcp.mjs http://localhost:3100    # 401 + initialize + all six pocket_* tools
node scripts/check-ui-flows.mjs [baseUrl]    # click-through 375/1440/1920; on prod waits for the real agent (5 min)
node scripts/check-agent.mjs                 # prod: 3 real saves → filed buckets, cost per sort, claude -p "pocket #N"
npm run agent:sync                           # idempotent Managed Agents setup (env, vault + token, agent prompt/model)
node ~/.claude/scripts/ship.mjs / /setup     # push → Vercel git deploy → verify-deploy + check-ui-flows on prod
```

Measured 24.10.2026 on prod: a sort takes 6–9 s and costs $0.03–0.06 at list prices (average $0.04); the spec estimated
$0.20–0.50. The v1 → v2 migration (`scripts/migrate-v2.mjs`, explicit SQL, seeds the 8 buckets) ran once on 24.10 and was
removed; `src/db/schema.ts` is the schema record.

Flow scripts write only marker rows (`?pcflow=<run>` URLs, `pcflow-<run>` buckets/suggestions) and delete them in `finally`.

## Gotchas

| Issue | Fix |
|-------|-----|
| Untyped Date in a Drizzle comparison (`lt(sql\`…\`, new Date())`) went out in local time (+03:00) and a `timestamp` column dropped the offset → `retryStuck` re-dispatched fresh items 3 h early | Compute cutoffs in SQL (`now()`, `interval`); column-typed params (`items.sortedAt: new Date()`) are fine |
| Drizzle wraps Neon errors (`DrizzleQueryError`), so `e.code` is undefined | Read `e.cause?.code ?? e.code` (`src/lib/buckets.ts` `pgCode`) |
| Next route files may export only HTTP handlers + config (`maxDuration`); a helper export fails the build | Helpers live in `src/lib/` |
| `tsx` runs `.ts` as CommonJS without `"type": "module"` → top-level await = TransformError | Scripts with top-level await are `.mts` (`scripts/agent-sync.mts`) |
| mcp-handler 2.x: `createMcpHandler(init, options)`, `registerTool` with a full `z.object`, no `basePath`/`maxDuration` options | Mount at `src/app/api/mcp/route.ts`, `export const maxDuration`, bearer check before the handler |
| Managed Agents MCP toolset defaults to `always_ask` → an unattended session stalls on the first tool call | `default_config.permission_policy: { type: "always_allow" }` on the `mcp_toolset` |
| `claude mcp add … --header "Authorization: Bearer <t>"` through `spawnSync(..., { shell: true })` splits the header at the space | Spawn `claude.exe` directly without a shell |
| Playwright strict-mode "resolved to 2 elements" when a card renders mobile and desktop copies of its actions | One actions row placed by the CSS grid (`col-start`/`row-start`), not two copies |
| The unattended run's permission classifier refused `DROP TABLE links/buckets` | Migration renames them to `v1_*`; owner drops by hand |
| Vercel Hobby: 100 deployments per rolling 24 h for the whole account | Count first (`ad-hoc-analysis/security-sweep-2026-10/deps-scripts/vcount.mjs`); ship only at gates |
| Login box blank (Oct 2026, v1): `clerk-js@latest` became v6 | Clerk removed for the password gate; never load CDN scripts as `@latest` |
| x.com / LinkedIn give no text to bots | x.com via `publish.twitter.com/oembed`; others sort on title + URL |
| Page `/add` is a 420×260 popup | The compact login variant (`<Login compact>`) fits it; test at that viewport |

## Deployment

Commit → `node ~/.claude/scripts/ship.mjs / /setup` from the repo root (Git Bash: `MSYS_NO_PATHCONV=1`). Vercel project
`pocket-clone`, git-linked, functions in `fra1` (check `x-vercel-id`). A failed check → `git revert` first. The prod
click-through starts real agent sessions (about $0.15 per run); the bookmarklet step runs on `/setup?pcflow=…` because the
main view rewrites its URL on load.
