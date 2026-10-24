# Reader + Favourite (v2.1) — Build Plan

**Goal:** a heart and a Favourites view on the main list, and a Reader page `/read/<number>` that shows a link's saved
text in paragraphs, with the same heart.
**Spec:** `docs/SPEC.md` v2.1: header note, §3 Controls, §4.2, §4.5, §4.6, §5 (`pageText`, `favourite`, migration,
reserved names), §6.6a, §6.6b, §6.10, §8, §10, §11, §12.
**Stack:** Next.js 16.4.3, React 19.3.1, Tailwind 4.3.3, Drizzle 0.45.4 + `@neondatabase/serverless` 1.2.0,
`@mozilla/readability` 0.6.0, `linkedom` 0.18.14, `mcp-handler` 2.3.0, zod 4.6.7.

## Global constraints

- Column `items.favourite boolean not null default false`; added by explicit SQL, no drops.
- `pageText`: paragraphs joined by `\n\n`, whitespace inside a paragraph collapsed, max 60,000 chars (`MAX_TEXT`).
- Copy: `Add #58 to favourites` · `Remove #58 from favourites` · `Couldn't update. Try again.` · `No favourites yet.` /
  `Tap the heart on a link to keep it here.` · `Favourites` · `Read` · `← Back` · `Open original ↗` / `Original ↗` ·
  `No text was saved for this link.` + `Open the original ↗` · `The saved text ends here.` + `Read the rest on the
  original ↗` · `No link #999.` + `← All links` · `That name is reserved.` · `Copied pocket #58`.
- Reserved bucket names (case-insensitive): `Unsorted`, `Favourites`.
- Reader body: Fraunces, 18 px / 1.65 below 768 px, 20 px / 1.7 from 768 px, measure ~66ch; rail 220 px (260 px from
  1280 px); same max-width container as the main view. Page title `<title> · Pocket Clone`.
- Heart: outline = off, filled terracotta = on, `aria-pressed`; desktop outline heart hover/focus-only, filled always;
  touch always visible. PATCH sends the new value, never a toggle.
- Viewports verified: 375, 1440, 1920. Flow scripts touch only `pcflow` marker rows.

## Phase 1 — Favourite (heart, Favourites view, API, MCP)

- [x] **Task 1.1 — Migration + schema**
  - Files: create `scripts/migrate-v21.mjs` (explicit SQL: `alter table items add column if not exists favourite boolean
    not null default false`); modify `src/db/schema.ts` (`favourite: boolean("favourite").notNull().default(false)`).
  - Proof: `node scripts/migrate-v21.mjs` twice (idempotent), then `select column_name, data_type, column_default from
    information_schema.columns where table_name='items' and column_name='favourite'` → one row `boolean`, `false`.
    Additive, so the live v2 deploy keeps working (it selects named columns).
- [x] **Task 1.2 — Data layer, API, reserved names**
  - Files: `src/lib/items.ts` (`favourite` in `cardColumns` → `Card.favourite: boolean`; `ListFilter.bucket` accepts
    `"favourites"` → `eq(items.favourite, true)`; new `setFavourite(id: string, favourite: boolean): Promise<boolean>`
    that updates only `favourite`); `src/app/api/items/[id]/route.ts` (PATCH: exactly one of `bucketId` / `favourite`
    (boolean) else 400 `bucketId or favourite required`); `src/lib/buckets.ts` (`reservedName(name: string): boolean`);
    `src/app/api/buckets/route.ts` + `[id]/route.ts` (400 `That name is reserved.`).
  - Proof: `scripts/check-api.mjs` new steps: PATCH `{favourite:true}` → `item.favourite === true`, `status`/`bucket`/
    `sortedBy` unchanged; `GET /api/items?bucket=favourites` contains it; PATCH with both keys → 400; PATCH
    `{favourite:"yes"}` → 400; POST bucket `favourites` and `UNSORTED` → 400 `That name is reserved.`; rename → 400.
- [x] **Task 1.3 — MCP**
  - Files: `src/app/api/mcp/route.ts`: `pocket_get_item` returns `favourite`; `pocket_list` maps `bucket` `favourites`
    (case-insensitive) to the filter, description names it; `pocket_suggest_bucket` refuses reserved names
    (`fail("reserved_name")`).
  - Proof: `scripts/check-mcp.mjs` new steps: favourite a marker item through the API → `pocket_list {bucket:
    "favourites"}` contains its number; `pocket_get_item` → `favourite: true`; `pocket_suggest_bucket {name:
    "Favourites"}` → isError.
- [x] **Task 1.4 — UI: heart on the card, Favourites row, view**
  - Files: `src/components/ui.tsx` (`IconHeart({ filled })`); `src/components/types.ts` (`View` gains
    `{ kind: "favourites" }`); `src/components/ItemCard.tsx` (heart button in the actions row after `#N`, prop
    `onFavourite: () => void`); `src/components/Main.tsx` (`favourite(item)` optimistic flip + revert + toast;
    `inView`, `counts.favourites`, URL `/?view=favourites`, empty state); `src/components/Sidebar.tsx` +
    `MobileSheet.tsx` (Favourites row between Unsorted and the divider; `viewName`); `src/app/page.tsx`
    (`?view=favourites` → view).
  - Proof: flows below.

**Gate 1:** `npm run build` clean; `check-api`, `check-mcp` (local `next start -p 3100`) pass; `check-ui-flows.mjs`
locally gains and passes: heart on → filled + `aria-pressed=true`, Favourites count 1, `/?view=favourites` shows only it,
reload keeps it; heart off in the Favourites view → card leaves, empty state copy; desktop outline heart hidden until
hover, filled heart visible without hover; 375: heart + `#N` + label on one row, no sideways scroll, Favourites row in
the sheet; 1920 composition unchanged; failure revert (route `**/api/items/*` PATCH aborted via `page.route`) → card
flips back + toast. Screenshots 375/1440/1920. `code-reviewer` on the Phase 1 diff. Owner sees: hearts and a Favourites
filter (after ship).

**Gate 1 result (24.10.2026):** build clean; `check-api` 18/18, `check-mcp` 10/10, `check-ui-flows` 46/46 locally
(1440/375/1920 + an 820 touch tablet). `code-reviewer` verdict "not ready" → answered:
- I1 poll could undo a heart → fixed: `Main.tsx` keeps hearts awaiting a save in a ref; polls keep the owner's value,
  and the override clears only on a poll that started after the PATCH settled. I2 the flow did not reach the race →
  rewritten: it holds a `changedSince` answer that read the row before the PATCH and releases it after; it failed on
  the old build ("a stale poll flipped the heart back") and passes on the fix.
- I3 empty-state proof skipped → the skip came from owner row #125, hearted by the builder's ad-hoc debug script (not
  a flow), reset to false the same hour; the step ran in the gate run and logs when real favourites make it skip.
- M1 quick double clicks → saves per card are queued in click order; a failed save reverts only when no newer click
  replaced it. M2 null/primitive PATCH body → 400. M7 unknown id → 404 asserted. Tablet (unverified) → flow step at 820
  touch. 1920 hover-hide → asserted.
- Not changed: M3/M4 (no bucket or suggestion named Unsorted/Favourites exists: checked with `pocket_list_buckets`);
  M5 (the global `:focus-visible` rule in `livery/tokens.css` already gives every button the terracotta ring);
  M6 deviation noted: `check-mcp` sets `favourite` by SQL because MCP has no write path for it by design; the PATCH is
  proved in `check-api`. Session expiry on the card heart goes through the shared `api` 401 path covered by the
  existing "session expiry mid-use" step.

## Phase 2 — Reader (paragraph text, `/read/<number>`, Read button)

- [ ] **Task 2.1 — Paragraph-keeping text**
  - Files: `src/lib/page.ts`: `paragraphs(root: Element): string | null` walks the node tree, emits a break at block
    elements (`p, div, section, article, h1–h6, li, blockquote, pre, figcaption, dt, dd, tr, br`), collapses whitespace
    per paragraph, drops empty ones, joins with `\n\n`, cuts at `MAX_TEXT`. Used for the Readability result (check
    Readability 0.6.0's `serializer` option in Context7 to get the element instead of an HTML string) and the body
    fallback; x.com oEmbed keeps one paragraph. Title/meta extraction unchanged.
  - Proof: `scripts/check-page.mjs`: the Dokobit fetch has ≥ 5 `\n\n` breaks, no paragraph contains `\n`, no run of
    3+ newlines; a fixture HTML string (`<p>a  b</p><ul><li>c</li><li>d</li></ul>`) → `"a b\n\nc\n\nd"`.
- [ ] **Task 2.2 — Re-fetch existing text**
  - Files: extend `scripts/migrate-v21.mjs` with `--refetch`: for every item, `fetchPage(url)`; non-null text →
    `update items set page_text = $1 where id = $2`; null → keep old text. Prints `#N: old → new chars, paragraphs`.
  - Proof: run once; `select number, position(E'\n\n' in page_text) > 0 from items` → true for the prod item(s) with text.
- [ ] **Task 2.3 — Reader page**
  - Design: invoke `impeccable` (new screen, CLAUDE.md §4) before the first UI edit; the warm-paper system and the
    `/setup` page composition are the base.
  - Files: create `src/app/read/[number]/page.tsx` (server: `hasSession`; logged out → `<Login onAuthed=reload>` via the
    client; `number` not `^\d+$` or no row → `notFound()`; `generateMetadata` title); create
    `src/app/read/[number]/not-found.tsx` (`No link #N.` needs the number → render the not-found state from the page
    itself with status 404 if `not-found.tsx` cannot read params); create `src/components/ReaderClient.tsx`
    (`{ item: Card & { pageText: string | null } | null }`: back, original link, `#N` copy + toast, heart (same PATCH
    and revert as Main), bucket label text, paragraphs, empty and cap states). `src/lib/items.ts`
    `getReaderItem(number: number)` returns the card plus `pageText`.
  - Proof: flows below.
- [ ] **Task 2.4 — Read button on the card**
  - Files: `src/components/ItemCard.tsx`: `<a href="/read/58" class="card-read">Read</a>` styled like `#N`, after `#N`,
    always visible (also while Sorting…).
  - Proof: flows below.

**Gate 2:** `npm run build` clean; `check-page` passes; `check-ui-flows.mjs` gains and passes at 375, 1440, 1920:
Read on the saved test card → `/read/N` with title, domain, `#N`, bucket label, ≥ 2 `<p>` paragraphs, Original link
`target=_blank` to the URL; `#N` copies `pocket #N`; heart on the Reader → back on the list the card shows filled;
`← Back` returns to the filtered view it came from (`/?view=…` kept); a PDF marker link → `No text was saved for this
link.`; a marker row with `page_text` set to 60,000 chars (SQL) → `The saved text ends here.`; `/read/999999999` and
`/read/abc` → 404 + `No link #…`; logged out `/read/N` → login form, unlock → the reader; 375 no sideways scroll and the
phone card row (`#N` · Read · heart · label) on one line; 1440/1920 rail visible and sticky beside the text. Screenshots
per viewport. `code-reviewer` on the Phase 2 diff. Owner sees: Read on every card and the reader on the phone.

## Finish

`node ~/.claude/scripts/review.mjs` → respond to every finding in `docs/reviews/`; `/simplify`; count the Vercel window
(`ad-hoc-analysis/security-sweep-2026-10/deps-scripts/vcount.mjs`); `MSYS_NO_PATHCONV=1 node
~/.claude/scripts/ship.mjs / /setup` (prod flows start real agent sessions, ~$0.15); `check-mcp` against prod; `/wrap-up`.

## Review focus

1. Favourite poll drift: the live-update poll merges whole cards; a poll result older than a just-clicked heart must not
   flip it back. Covered: Gate 1 step clicks the heart while a card is Sorting… (poll running) and checks it stays on.
2. Search results and the Favourites view: un-hearting inside a search in Favourites removes the card from both lists.
   Covered: Gate 1 step with a search term in the Favourites view.
3. Session expiry on the Reader heart → login form, not a silent revert. Covered: Gate 2 step clears the cookie, clicks
   the heart, expects the login form.
4. Hostile page text: the Reader renders text nodes only (React escaping), never `dangerouslySetInnerHTML`. Covered:
   Gate 2 sets a marker row's `page_text` to `<img src=x onerror=alert(1)>` and expects it shown as literal text.
5. `/read/<n>` beyond int range (`/read/99999999999`) → 404, not a 500. Covered: Gate 2 404 step uses that value too.

## Out of scope (SPEC §11, v2.1)

- ❌ AI summaries on cards, a reading pane beside the list
- ❌ Reader settings (font, size, theme), reading progress, offline reading, images and formatting in the Reader,
  highlights and notes
- ❌ Favourite through MCP, sorting by favourite, bulk favourite
- ❌ Everything else in §11 as in v2.
