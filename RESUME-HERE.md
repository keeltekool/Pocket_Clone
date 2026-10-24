# Pocket Clone — RESUME HERE

> Updated 24.10.2026 after the v2 build. The unattended build in `docs/plans/2026-10-24-pocket-clone-v2.md` is complete
> and live; do not restart it.

## State

- **Prod:** https://pocket-clone-virid.vercel.app runs **v2** (Next.js 16, fra1). Every phase gate and the finish review
  are answered in the plan and `docs/reviews/`. Prod proofs: `check-ui-flows` 40/40, `check-mcp` 9/9, `check-agent`
  (3 links filed in 6–9 s, $0.03–0.06 per sort), `claude mcp list` → `pocket ✔ Connected`.
- **Repo:** github.com/keeltekool/Pocket_Clone, branch `master`, tree clean after the final ship.
- **Read next:** `STACK.md` (stack, env, scripts, gotchas), `docs/SPEC.md` (what it does), the plan (what was built,
  deviations, review notes).

## Next build (owner's pick, 24.10.2026 evening): Reader view + Favourite

From `docs/research/2026-10-24-raindrop-next-features.md` the owner chose **#1 Reader view** and **#9 Favourite**.
Both come from the Raindrop analysis (`docs/research/2026-10-24-raindrop-rea.md`, §2 walkthrough and §3 REA table, rows
"Reading" and "Organise"); the new window reads that doc first and uses REA on `raindropio/app` (public, MIT, v5.8.3,
commit `a3e44eb`) for the two patterns before writing the spec: how the item pane's **Preview** tab renders the saved text
(`routes/my/item/*`, the reader's typography and controls) and how **Favourite** is placed and filtered (heart in the
edit form, sidebar filter). Copy the proven pattern, not the look: the warm-paper design stays.

Scope, as plain clicks (defaults for the spec; the owner confirms in chat, short approvals):
- **Reader** `/read/<number>`: the saved page text (`items.pageText`) in Fraunces, phone-first, with the title, domain,
  `#N`, a link to the original and the bucket label; empty text → "No text was saved for this link" + the original
  link. Entry: one control on the card (default: a small "Read" button beside `#N`, on the phone row too). Logged out →
  the login form, as on `/setup`.
- **Favourite**: a heart on the card (toggles `items.favourite`, default false); a **Favourites** row in the sidebar and
  the phone sheet between Unsorted and the buckets, with a count; `/?view=favourites`. The agent never touches it.
  MCP: `pocket_list` accepts `bucket: "favourites"`; `pocket_get_item` returns `favourite`.
- Schema change by an explicit SQL script (add columns only; no drops — the unattended-run classifier refuses them).
- Everything else unchanged. Out: notes, highlights, tags, reading progress, summaries.

Pipeline: `/spec` (small, chat approvals) → `/build-plan` → build with gates (extend `scripts/check-ui-flows.mjs`:
reader at 375/1440/1920 logged in and out, heart toggle + Favourites filter + count, phone row) → `ship.mjs / /setup`
(count deploys first; the prod flows start real agent sessions, ~$0.15 a run) → `/wrap-up`. Settled decisions below
still hold.

### Continuation prompt (paste into the fresh window)

```
Pocket Clone: build the two features the owner picked. Read C:\Users\Kasutaja\Claude_Projects\Pocket_Clone\RESUME-HERE.md
first (section "Next build": Reader view + Favourite) and follow it; settled decisions are settled, do not re-ask them.
Before the spec, read docs/research/2026-10-24-raindrop-rea.md and run a targeted REA pass on raindropio/app for the
two patterns named there (reader/Preview tab, Favourite), then /spec with short chat approvals, /build-plan, build with
the gates (flows at 375/1440/1920 in scripts/check-ui-flows.mjs, code-reviewer per phase), ship with
MSYS_NO_PATHCONV=1 node C:/Users/Kasutaja/.claude/scripts/ship.mjs / /setup after counting the Vercel deploy window
(ad-hoc-analysis/security-sweep-2026-10/deps-scripts/vcount.mjs), then /wrap-up.
```

## Owner items

- [ ] Set up the iPhone Shortcut from https://pocket-clone-virid.vercel.app/setup (a few taps, once).
- [ ] Drop the old tables: `drop table v1_links; drop table v1_buckets;` — the permission classifier refused the drop
  twice (24.10, also on the owner's explicit go), so it has to be run by hand (Neon SQL editor or `neonctl psql`).
- [ ] Optional: delete the unused Clerk application `better-ferret-13` (the live-browser connection was not available
  when tried on 24.10).

## Settled decisions (do not re-ask)

Automatic sorting by a Managed Agent on Fable 5.1 through the app's MCP server; one long main list, buckets as filters;
no fit → Unsorted; the AI suggests buckets, the owner creates them; plain Move, no learning, no chips; `pocket #N` copy
+ MCP is a hard requirement; password gate, no accounts; the existing warm-paper design; v1 is the minimum
(SPEC §11 lists what is out).
