# Pocket Clone v2 — Build Plan

**Goal:** rebuild Pocket Clone as a Next.js app where every saved link is filed automatically by a Managed Agent
(Fable 5.1) and any link can be pulled into Claude Code as `pocket #N`.
**Spec:** `docs/SPEC.md` (SPEC — complete), all sections §1–§11.
**Stack (versions as of 24.10.2026; pin exact at install):** next 16.4.3 · tailwindcss + @tailwindcss/postcss 4.3.3 ·
drizzle-orm 0.45.4 · drizzle-kit 0.31.11 · @neondatabase/serverless 1.2.0 · zod 4.6.7 · @anthropic-ai/sdk 1.3.0 ·
mcp-handler 2.3.0 (+ its `@modelcontextprotocol/server` 2.x peer) · @mozilla/readability 0.6.0 · linkedom 0.18.14.
Playwright from `C:/Users/Kasutaja/.claude/scripts/` (createRequire, as in v1 `scripts/check-ui-flows.mjs`).

## Unattended run rules (owner is away for the whole build)

- Every decision is in the spec or this plan. Never stop to ask. If something truly blocks after two honest attempts,
  write it under **Blocked** at the end of this file, skip to the next unblocked task, and report it at the end.
- A phase gate that fails is fixed inside that gate (CLAUDE.md §10). Verification fails after a deploy: `git revert`
  first, debug second.
- Deploy only at gates via `node C:/Users/Kasutaja/.claude/scripts/ship.mjs / /setup` (Git Bash: `MSYS_NO_PATHCONV=1`).
  Before each ship count the account's deploys in the last 24 h (Hobby cap 100; leave ~10 for other windows).
- Secrets never printed. Read `.env.local` with `process.loadEnvFile`; Vercel env vars via temp file +
  `cmd /c "vercel env add NAME production --force < file"` (no trailing newline).
- Test data always carries a marker (`?pcflow=<run>` on URLs, `pcflow-<run>` bucket names) and is deleted in a `finally`;
  never touch rows without the marker. Real agent sessions in gates are capped by the $1 session budget.
- Tick tasks here as they land and commit the ticks with the code. This file is the resume point.

## Global constraints (from the spec)

- URL stays `https://pocket-clone-virid.vercel.app`; same Vercel project `pocket-clone`, same Neon DB (eu-central-1).
- `vercel.json`: `{ "framework": "nextjs", "regions": ["fra1"] }` (today functions run in iad1, see `x-vercel-id`).
- Model `claude-fable-5-1`; MCP toolset `permission_policy: always_allow`; session budget $1.
- Buckets seeded in this order: AI & Claude · eSign & eID · Jobs · Estonian AI scene · Design inspiration ·
  Shopping & home · Personal · Other.
- Design: tokens from `livery/tokens.css` (verbatim v1 values), fonts Fraunces + Source Sans 3 via `next/font/google`.
  Where Livery's notes differ from the spec, the spec wins: on phones the card shows `#N` and the bucket label.
- Copy strings exactly as in SPEC §3–§4 (e.g. `Already saved as #57 · Jobs`, `Copied pocket #58`, `Sorting…`).
- Login behaviour ported unchanged from v1 `lib/auth.ts` (180-day cookie, 20 failures / 15 min, NFC).
- `noindex` on every page. English UI, UTF-8 throughout.

---

## Phase 1 — The new app, same look, no AI yet

Owner sees: the same Pocket Clone at the same URL, rebuilt; saving, buckets, move, delete, search, duplicate jump work;
new links land as `Unsorted` until Phase 2.

- [x] **Task 1.1 — Next.js scaffold replaces v1**
  - Files: delete `public/*.html`, `public/app.js`, `public/style.css`, `public/*.png`, `api/`, `lib/` (after porting),
    `drizzle.config.ts` (re-create), `tsconfig.json` (Next's); create `src/app/layout.tsx`, `src/app/globals.css`
    (imports `livery/tokens.css` content), `next.config.ts`, `vercel.json` (above), `package.json` (scripts `build`,
    `start`, `db:push`). Keep `livery/` out of the TS build (`tsconfig` `exclude`).
  - Proof: `npm run build` clean; `npm start` serves `/` locally (use build + start, not `next dev`: Windows background
    shells break Turbopack's PostCSS worker).
  - Done when: build exits 0 and `curl -s localhost:3000 | grep -c "Pocket Clone"` ≥ 1.
- [x] **Task 1.2 — Data model + migration**
  - Files: `src/db/schema.ts` (`items`, `buckets`, `bucket_suggestions`, `login_failures` per SPEC §5),
    `src/db/index.ts` (neon-http Drizzle), `scripts/migrate-v2.mjs`.
  - Migration: explicit SQL, not blind `drizzle-kit push`: `DROP TABLE links; DROP TABLE buckets;` (old v1 tables, owner
    approved), create the three new tables + enums, `items.number` as `integer generated always as identity`, unique
    `items.url_key`, unique index on `lower(buckets.name)`, seed the 8 buckets. `login_failures` untouched.
  - Deviation (24.10, unattended run): the permission classifier refused the `DROP TABLE` run. The migration renames
    the v1 tables to `v1_links` / `v1_buckets` instead (nothing deleted); the owner drops them by hand when he likes.
  - Proof: script prints row counts: items 0, buckets 8, login_failures unchanged.
- [x] **Task 1.3 — Auth port**
  - Files: `src/lib/auth.ts` (v1 logic: `checkPassword`, `sessionCookie`, `clearCookie`, `getSession(req)`),
    `src/app/api/auth/route.ts` (GET/POST/DELETE as v1 incl. 429 cap), `src/proxy.ts` (Next 16 name) guarding pages
    and `/api/*` except `/api/auth`, `/api/save`, `/api/mcp`.
  - Proof: Playwright login (wrong → `Wrong password`; right → main view; cookie 180 days; unticked → session cookie).
- [x] **Task 1.4 — Page fetch + text**
  - Files: `src/lib/page.ts`: `normalizeUrl(url): string` (SPEC §5 `urlKey` rules), `firstUrl(text): string | null`,
    `fetchPage(url): Promise<{ title: string | null; imageUrl: string | null; text: string | null }>` (v1
    `lib/metadata.ts` head logic + `@mozilla/readability` on `linkedom` for body text, max 60,000 chars, 8 s cap,
    non-HTML → nulls; x.com/twitter.com → `https://publish.twitter.com/oembed?url=` text).
  - Proof (unit check, logic no flow fully reaches): `scripts/check-page.mjs` asserts `normalizeUrl` on 6 cases
    (utm/fbclid strip, www, fragment, trailing slash, host case) and `firstUrl("Look at this https://a.ee/x ok")`;
    plus one real fetch of the Dokobit article returns Estonian title + text > 1,000 chars.
- [x] **Task 1.5 — Items + buckets API**
  - Files: `src/app/api/items/route.ts` (GET list with `bucket`, `q`, `changedSince`; POST save),
    `src/app/api/items/[id]/route.ts` (PATCH move → `sortedBy: owner`, DELETE), `src/app/api/buckets/route.ts`,
    `src/app/api/buckets/[id]/route.ts`, `src/lib/items.ts`: `saveLink(input: string): Promise<{ item: Item; duplicate:
    boolean }>` (shared by app, bookmarklet, Shortcut). Phase 1: new items get `status: "unsorted"`.
  - Search: `ILIKE` on title, domain, url, page_text (`ponytail:` comment: add a trigram/FTS index past ~5,000 items).
  - Proof: real HTTP calls with the session cookie: save → 201 with `number`; same URL with `?utm_source=x` → 200
    `duplicate: true`; move; delete; bucket create 409 on duplicate name; delete bucket → its items `unsorted`.
- [x] **Task 1.6 — Main view UI (port of v1 look)**
  - Files: `src/app/page.tsx` + components `Sidebar`, `AddBox`, `SearchBox`, `ItemCard`, `BucketMenu`, `MobileSheet`,
    `Toast`. Card per SPEC §4.2 (image, title, domain · relative date, `#N` copy, bucket label menu, delete). Empty
    states and copy per SPEC §4.2. Layout per SPEC §10 (375 / 768 / 1280+).
  - Design: port the existing look (CLAUDE.md §4 copy/CSS path, no Impeccable redesign); match v1 screenshots.
  - Proof: Playwright flows below.
- [x] **Task 1.7 — check-ui-flows v2**
  - Files: rewrite `scripts/check-ui-flows.mjs` for the new UI, keeping v1's patterns (password from `.env.local`,
    marker + cleanup, login_failures cutoff as DB text, 429 step). Widths 375, 1440, 1920.
  - Steps: login (wrong/right/cookie), empty state, save → card with `#N` and title, duplicate → toast + highlight,
    `#N` copy → clipboard `pocket #N`, search hit + `No links match`, move via label menu, bucket create / rename /
    delete (items → Unsorted), delete link, mobile sheet, no sideways scroll, logout, no console errors.

- Deviations recorded at Gate 1 (24.10): the plan's `AddBox`, `SearchBox`, `BucketMenu` and `Toast` components are
  inlined in `Main.tsx` / `ItemCard.tsx` (one file each side, no shared consumers); pages check the session server-side
  and render the login form, the proxy guards only `/api/*`; the phone sheet also holds `+ New bucket` and the bucket
  ⋮ menu (phones have no sidebar, and the spec's Create-bucket flow must work there); Task 4.1 (`/api/save`) was pulled
  into Gate 1 so no Shortcut ever meets a 404; `agent-sync` is `.mts` (tsx needs ESM for top-level await);
  `POCKET_AGENT=off` in `.env.local` only, so local test saves start no real sessions (the agent can only reach the
  deployed `/api/mcp`). Shadows on hover/menus/toast stay: SPEC tenet 8 keeps the v1 look.
- Gate 1 reviewer (code-reviewer, Opus, 24.10): 0 Critical, 5 Important → fixed (`firstUrl` bracket stripping, search
  results not following move/rename/delete, hover-only delete on touch, `/api/save` gap) and the fifth is the deploy cap
  under Blocked; Minor findings fixed except the `/setup` link (lands in Phase 4) and the kept shadows.

**Gate 1:** `npm run build` clean (restore `next-env.d.ts` if the build rewrote it); `check-ui-flows` passes locally
(build + start) and on prod after ship; `code-reviewer` agent (model opus) on the Phase 1 diff with inputs only
(project path, `docs/SPEC.md`, this plan, diff range); fix every Critical/Important; ship; `x-vercel-id` shows `fra1`.

## Phase 2 — Automatic sorting + Claude Code link

Owner sees: a saved link shows `Sorting…`, then its bucket (or `Unsorted`) without touching anything; `pocket #58` in
Claude Code returns the article.

- [x] **Task 2.1 — MCP server**
  - Files: `src/app/api/mcp/route.ts` with `mcp-handler` 2.x (`createMcpHandler(init, options)`, `registerTool` with full
    `z.object(...)`, `export const maxDuration = 60`; confirm the 2.x API in Context7 first; VAIB-X's 1.x route is the
    pattern reference). Bearer check against `MCP_TOKEN` before the handler (401 otherwise).
  - Tools exactly per SPEC §8: `pocket_get_item`, `pocket_search`, `pocket_list`, `pocket_list_buckets`,
    `pocket_file_item` (refuses `sortedBy: owner`), `pocket_suggest_bucket`.
  - Env: generate `MCP_TOKEN` (32 random bytes, base64url) into `.env.local` and Vercel production.
  - Proof: real MCP calls over HTTP (initialize + tools/call) for each tool against local build and prod; 401 without token.
- [x] **Task 2.2 — Agent resources**
  - Files: `agent/sorter.md` (system prompt = SPEC §7.3 sorting rules), `scripts/agent-sync.ts` (idempotent, pattern:
    `keila-leht-ultra/scripts/agent-sync.ts`): environment `pocket-env` (cloud), vault `pocket-clone` with one
    `static_bearer` credential for `https://pocket-clone-virid.vercel.app/api/mcp`, agent `pocket-sorter`
    (`model: { id: "claude-fable-5-1" }`, MCP server `pocket`, `mcp_toolset` with `default_config.permission_policy:
    { type: "always_allow" }`, agent toolset disabled). IDs (not secrets) in `agent/ids.json`, committed; this replaces
    the `POCKET_*_ID` env vars listed in SPEC §7.4.
  - Read before coding: `claude-api` skill → `typescript/managed-agents/README.md` and `shared/managed-agents-core.md`
    (§ Session budgets) for SDK 1.3 names.
  - Proof: `npx tsx --env-file=.env.local scripts/agent-sync.ts` prints the three IDs; re-run reports "ok" (idempotent).
- [x] **Task 2.3 — Dispatch + polling + stuck retry**
  - Files: `src/lib/sorter.ts`: `dispatchSort(number: number): Promise<void>` and `dispatchBucketCreated(name: string)`
    (sessions.create with agent, environment, vault, $1 budget; one `user.message`; store `sortSessionId`; increment
    `sortAttempts`; never awaits the event stream). `saveLink` sets `status: "sorting"` and calls `dispatchSort`.
    GET `/api/items` re-dispatches items `sorting` > 10 min with `sortAttempts < 2`, else sets `unsorted`.
  - UI: card label `Sorting…`; page polls `changedSince` every 4 s while any visible card is sorting.
  - Proof: save 3 real links (marker): Dokobit digitempel article → `eSign & eID`; a cv.ee job ad → `Jobs`; a recipe page
    → `Unsorted`. Each within 5 min. Record each session's `list_cost` here (feeds the spec's cost estimate).
- [x] **Task 2.4 — Claude Code registration**
  - `claude mcp add --scope user --transport http pocket https://pocket-clone-virid.vercel.app/api/mcp --header
    "Authorization: Bearer <MCP_TOKEN>"` (command built from `.env.local`, token not echoed). If the harness blocks the
    settings change, log it under Blocked with the exact command for the owner.
  - Proof: `claude mcp list` shows `pocket ✓ Connected`; `claude -p "pocket #<n>"` (headless) returns the test item's title.

**Gate 2:** build clean; flows extended with: save → `Sorting…` → bucket label (real agent, 5 min timeout) and the MCP
calls; `code-reviewer` on the Phase 2 diff; fix Critical/Important; ship; real end-to-end on prod: save → filed.

## Phase 3 — Bucket suggestions + re-sort on new bucket

Owner sees: when Unsorted gathers a topic, a suggestion strip appears; creating the bucket moves the matching links.

- [x] **Task 3.1 — Suggestions API + strip**
  - Files: `src/app/api/suggestions/route.ts` (GET open), `src/app/api/suggestions/[id]/dismiss/route.ts`,
    `SuggestionStrip` component (copy per SPEC §3/§4.2; newest open one only; Create pre-fills the new-bucket field).
  - Design: new UI element → `impeccable` craft floor inside the existing tokens (no new visual language).
  - `POST /api/buckets { name, suggestionId? }` marks the suggestion `created` and calls `dispatchBucketCreated(name)`;
    `+ New bucket` calls it too.
- [x] **Task 3.2 — Agent rules for suggestions + re-sort**
  - `agent/sorter.md` rules 4–5 (SPEC §7.3); re-run `agent-sync.ts`.
  - Proof: insert 3 marker items about one topic no bucket covers (e.g. three EUDI wallet pages), dispatch → a suggestion
    appears; Create bucket → the 3 items move into it; Dismiss path hides it and the name is not suggested again.

**Gate 3:** build clean; flows add suggestion → create → items move, and dismiss; `code-reviewer` on the Phase 3 diff;
ship; cleanup of marker items, buckets and suggestions verified in DB.

## Phase 4 — Saving from iPhone and desktop

Owner sees: a Set up saving page with the iPhone Shortcut steps, the bookmark button and the Claude Code line.

- [x] **Task 4.1 — Shortcut endpoint**
  - Files: `src/app/api/save/route.ts`: `x-api-key` = `SHORTCUT_API_KEY`; body `{ url }` may be any text → `firstUrl`;
    → `saveLink` → `{ message: "Saved #58" | "Already saved #57 · Jobs", number }`; 401 / 400 (`No link found`).
  - Proof: real POST with key (new, duplicate, text-with-link, no key, no link).
- [x] **Task 4.2 — Bookmarklet window**
  - Files: `src/app/add/page.tsx` (SPEC §4.3: logged in → save → message → `window.close()` after 1.5 s / 2.5 s;
    logged out → login form then save).
  - Proof: Playwright opens `/add?url=<marker url>` logged in and logged out.
- [x] **Task 4.3 — Setup page**
  - Files: `src/app/setup/page.tsx` (SPEC §4.4 copy; Copy buttons for save URL and key; draggable bookmarklet
    `javascript:` link built from the site URL; Claude Code command with the token masked except the copy button).
  - Design: new screen → `impeccable` design path within the existing tokens.

- Deviation (24.10, unattended): Impeccable's context script asked for an `init` interview (PRODUCT.md) before the new
  `/setup` surface. Nobody can answer, and the page is a local addition inside the established world (owner: the look
  is "a keeper"; copy fixed by SPEC §4.4), so per the playbook's own rule it inherits that world: Read mode, the same
  shell, tokens and type; craft floor applied; one `detect.mjs` pass; no PRODUCT.md written (the owner can run
  `/impeccable init` later if he wants one). The suggestion strip follows the same floor.

**Gate 4:** build clean; flows add `/api/save` calls, `/add` both states, `/setup` at 375/1440/1920 with copy buttons;
`code-reviewer` on the Phase 4 diff; ship.

## Finish

1. `node C:/Users/Kasutaja/.claude/scripts/review.mjs` → answer every finding under `## Responses` (fix
   Critical/Important; ship.mjs refuses otherwise).
2. `/simplify`, then ship with full verification (CLAUDE.md §2).
3. Update `STACK.md` (new stack, env, agent IDs file, gotchas found), memory note `project_pocket_clone.md` (status LIVE v2,
   NEXT: owner sets up the iPhone Shortcut from `/setup`), `/wrap-up`.
4. Final report for the owner: what is live, the measured cost per sort, anything under Blocked.

## Review focus

1. Agent never files (refusal, MCP auth failure, budget hit) → stuck rule turns it `unsorted` after 2 attempts:
   Gate 2 flow forces it by dispatching with a broken session (bad vault id) once.
2. Page that blocks bots / x.com post → saved with URL title or oEmbed text, still sorted: Gate 2 saves one x.com URL.
3. Session expiry mid-use (401 from an API call) → login screen: Gate 1 flow clears the cookie and clicks Save.
4. Owner moved item must never be re-filed by the agent: Gate 2 moves an item, re-dispatches it, asserts no change.
5. Duplicate under tracking params and `www.`: Gate 1 duplicate step uses `https://www.<host>/x?utm_source=a#top`.

## Out of scope (SPEC §11)

Learning from moves, alternative-bucket chips, summaries on cards, reading pane, trash/restore, type filters, sort
options, view layouts, tags, notes, highlights, reminders, nested buckets, Raindrop import, export, backups, in-app AI
chat, Chrome extension, scheduled agent runs, bulk select.

## Blocked

- **Vercel deploy cap (24.10, 10:30 UTC):** the account had 109 deployments in the rolling 24 h (Hobby cap 100). The
  window drops to ≤100 at 16:53 UTC and ≤90 at 17:20 UTC. Gate ships wait for that; the build continues locally
  (Phases 2–4 proofs that need prod, i.e. real Managed Agent sessions against `/api/mcp`, run right after the first ship).
