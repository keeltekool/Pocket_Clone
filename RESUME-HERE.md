# Pocket Clone — RESUME HERE

> Fresh-session entry point. Read top to bottom, then the "Read next" files in order.
> Settled decisions are settled — do not re-ask, do not re-litigate. Updated 24.10.2026.

## State

- **Prod:** https://pocket-clone-virid.vercel.app runs **v1** (vanilla JS + Vercel functions) with the new password gate.
  Click-through `scripts/check-ui-flows.mjs` passes 21/21 on prod (last ship `242e84a`).
- **Repo:** github.com/keeltekool/Pocket_Clone, branch `master`. Last commit `a7dd200` (build plan). Tree clean.
- **Where we stopped:** spec complete, build plan approved by the owner ("go"), handover written. **The v2 build has not
  started.** Next: Phase 1, Task 1.1 of the plan.

## What this project is (30 seconds)

The owner's personal save-for-later app, replacing his Raindrop.io. He adds a link (iPhone share sheet, desktop bookmark
button, or paste); a Claude Managed Agent running Fable 5.1 reads the page and files it into one of his buckets, or
Unsorted; the main list keeps every link, newest first. Every link has a permanent number; `pocket #58` in any Claude Code
window pulls the full article through the app's MCP server. Single owner, password login, warm paper design.

## Current state — done / undone

**Done this session (24.10.2026):**
| Commit | What |
|---|---|
| d4ba104 | v1 revived: Clerk (broken by `clerk-js@latest` v6) replaced by a password gate; page metadata fetched server-side (public CORS proxy allorigins is dead); card bucket menus refresh; first `check-ui-flows.mjs` |
| 79885a1 | Owner's password set; 20 wrong attempts / 15 min lock (`login_failures` table); NFC-normalised compare |
| 7bc0267 | Flow-check cleanup fix (timezone trap, see Gotchas) |
| c7f913e | `docs/research/2026-10-24-raindrop-rea.md` (Raindrop analysis; background only) |
| 242e84a | `docs/SPEC.md` complete |
| 353f2f7 | `livery/` design package (pushed to Livery from another window) |
| a7dd200 | `docs/plans/2026-10-24-pocket-clone-v2.md` build plan, approved |

**Undone:** the entire v2 build: Phases 1–4 + Finish in the plan. Nothing of v2 exists in code yet.

## Read next (in this order)

1. `docs/plans/2026-10-24-pocket-clone-v2.md` — the build plan: unattended run rules, phases, tasks, gates. Tick tasks as
   they land; it is the progress record.
2. `docs/SPEC.md` — what to build: every screen, copy string, data model, route, MCP tool, agent rule.
3. `STACK.md` (project) and `C:\Users\Kasutaja\Claude_Projects\STACK.md` (global) — gotchas (mcp-handler 2.x, Next 16
   proxy rename, region, deploy cap, Managed Agents MCP permission default).
4. `livery/tokens.css` + `livery/DESIGN.md` — the design tokens and rules to port (the spec wins where they differ:
   on phones the card shows `#N` and the bucket label).
5. Reference code (read, do not copy blindly):
   - `C:\Users\Kasutaja\Claude_Projects\keila-leht-ultra\scripts\agent-sync.ts` — idempotent Managed Agents setup
     (environment, vault + static_bearer MCP credential, agent; IDs in `agent/ids.json`).
   - `C:\Users\Kasutaja\Claude_Projects\vaib-x\src\app\api\[transport]\route.ts` — MCP card-number pattern (mcp-handler 1.x;
     v2 must use the 2.x API).
   - v1 `lib/auth.ts`, `lib/metadata.ts`, `scripts/check-ui-flows.mjs` — logic to port.

## Critical context that must not be lost

**The build runs unattended.** Owner, verbatim: "nb! actual build from that point on of pasting prompt has to run
automatic start to end i wont be here!" Do not stop to ask anything. Blockers go under **Blocked** in the plan; continue
with the next unblocked task; report at the end.

**Owner decisions (verbatim quotes, 24.10.2026):**
- Sorting: "AI sorting to buckets has to be automatic i only insert to main view agent sorts from there but listings also
  remain in main view as longeining list they wont dissapear from there!"
- Model: "We will hook up the most capable model via claaude api the fable one to ensure best availalbe sorting!"
- Autonomy: "We use Managed Agents and my API credits its full autonomic here not me doing something manually for soriting"
- No fit: "If there is now suitable pocket the listing goes to unsorted view"
- Suggestions: "if unsorted starts getting trends - show in main UI below some "suggestion" - for additional bins
  creations - user will create himself though!!!"
- Claude Code link: "This is CLI to claude copy is still requirement and click/copy on each link article to claude code!!!"
- Clean slate: "nothing moves in its clean sleet i start additg from zero, even the current pocket clone listings are not
  that important bc, of outdated"
- Auth: "i dont need user login, app can be simple password protect with featrure of keeping the known device logged in
  for longer period" and "Clerck is overkill here"
- Design: "The desing of existing I like and thats a keeper"
- Capture: "I save from both, this also means that the build scope will have to make and cater from saving from iphone as
  easy as possible"
- Scope discipline: "Yellow is already overkilll - please dont overengineer stuffff!" (about alternative-bucket chips +
  learning from corrections) and "I still think dont overcomplicate lets keep V1 optimal!"
- Buckets: "I think its valid list yes!" (the 8 starting buckets)
- Grill answers: "yes to all expect Q2  - delete puts them to unsorted just" (old v1 data is dropped; deleting a bucket
  sends its links to Unsorted, no re-sort; all builder technical calls accepted)
- Raindrop: "Raindrop is not 1:1  - The main premise is still what I iterated first and the potential reusability of
  existing pocketclone!"

**What follows from those (settled):** no manual Sort button; no alternative-bucket chips; no learning from manual moves
(plain Move only); no summaries, reading pane, trash, type filters, tags/notes/highlights, import/export, Chrome extension,
scheduled runs, bulk select (SPEC §11). Anything not in the spec is not built; an idea gets one line in the final report.

**Facts checked this session:**
- `ANTHROPIC_API_KEY` in `.env.local` / Vercel is the console key "Pocket-Clone 2" in "Egert's Individual Org", the org
  holding the owner's $100/month API credit (prefix/suffix match, 24.10). No new key needed.
- Managed Agents runs all Claude 4.5+ models incl. `claude-fable-5-1`; Fable $10 / $50 per MTok; session time $0.08/h.
- Vercel functions currently run in `iad1`; Neon is `eu-central-1` → plan pins `fra1`.
- Vercel project `pocket-clone` is git-linked (pushes deploy; ship.mjs works).
- `.env.local` holds: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SHORTCUT_API_KEY`, `APP_PASSWORD`. Vercel production holds the
  same four. `MCP_TOKEN` is created in Phase 2. Never print values.

**Data:** Neon tables today: v1 `links` (8 old rows), v1 `buckets` (4), `login_failures`. Phase 1 drops `links` and
`buckets` (owner-approved) and creates the v2 schema. The owner's v2 list starts empty; flow checks write only marker rows
and delete them.

**Standing rules (CLAUDE.md):** gates per plan (Playwright click-through at 375 / 1440 / 1920, `code-reviewer` agent on
Opus with inputs only, ship via `ship.mjs`); revert first if a deploy fails verification; subagents never write code in this
repo; `review.mjs` + `/simplify` + `/wrap-up` at the end; no Workflow tool.

## Gotchas from this session

| What burned time | Resolution |
|---|---|
| `clerk-js@latest` became v6, which moved sign-in UI to `@clerk/ui`; login box rendered blank | Clerk removed. Never load CDN scripts as `@latest` |
| Public CORS proxy `api.allorigins.win` dead (522) | Fetch pages server-side |
| JS `Date` passed to raw `neon` SQL against a `timestamp` (no zone) column shifted 3 h (local +03:00 offset dropped) | Use DB-side `now()` or text cutoffs (`now()::timestamp::text`); Drizzle builders send UTC and are fine |
| Flow-check rows in `login_failures` left behind → real logins got 429 | Cleanup by DB-side cutoff; step asserts it removed ≥ 20 rows; clear with `delete from login_failures` if ever stuck |
| `vercel dev` refused (`dev` script called itself) and ignored `.env.local` | v2 uses `next build` + `next start` for local checks (global STACK: `next dev` breaks from background shells on Windows) |
| Managed Agents MCP toolsets default to `always_ask` → an unattended session stalls on the first MCP call | `default_config.permission_policy: { type: "always_allow" }` on the `mcp_toolset` |
| `mcp-handler` 2.x changed API (peers on `@modelcontextprotocol/server` v2) | Check Context7 at the installed version; global STACK has the notes |
| Git Bash mangles `/route` arguments for ship.mjs | `MSYS_NO_PATHCONV=1` + Windows path to the script |
| Vercel Hobby: 100 deploys / 24 h across all projects | Ship only at gates; count first (global STACK) |
| x.com / LinkedIn pages give no text without JS | x.com via `publish.twitter.com/oembed`; others sort on title + URL |

## Pending owner items

- [ ] After the build: set up the iPhone Shortcut from the app's `/setup` page (a few taps, once).
- [ ] Optional: delete the unused Clerk application `better-ferret-13` in the Clerk dashboard (Clerk is no longer used).

## The continuation prompt (paste into the fresh window)

```
Build Pocket Clone v2. Read C:\Users\Kasutaja\Claude_Projects\Pocket_Clone\RESUME-HERE.md first and follow it exactly —
settled decisions are settled, do not re-ask them.

Mission: execute the approved build plan C:\Users\Kasutaja\Claude_Projects\Pocket_Clone\docs\plans\2026-10-24-pocket-clone-v2.md
from Phase 1 Task 1.1 through Phase 4 and the Finish section, against C:\Users\Kasutaja\Claude_Projects\Pocket_Clone\docs\SPEC.md.

This run is UNATTENDED: the owner is away. Do not stop to ask anything. Follow the plan's "Unattended run rules": a blocker
goes under "Blocked" in the plan after two honest attempts, then continue with the next unblocked task. Tick tasks in the
plan file and commit the ticks with the code.

Gates exactly as written in the plan: clean build, Playwright click-through at 375/1440/1920 kept in
scripts/check-ui-flows.mjs, code-reviewer agent (Opus, inputs only) on each phase's diff with every Critical/Important
fixed, ship via ship.mjs, revert first if verification fails. Finish with review.mjs (answer every finding), /simplify,
final ship + CLAUDE.md §2 verification, /wrap-up, and a short final report for the owner (what is live, measured cost per
sort, anything Blocked). Go.
```
