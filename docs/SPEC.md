# Pocket Clone v2 — SPEC

| | |
|---|---|
| **Project** | Pocket Clone |
| **One line** | Save a link from phone or desktop in one action; an AI agent reads it and files it into the right bucket; any link can be pulled into Claude Code by its number. |
| **Status** | v2: SPEC — complete (owner confirmed 24.10.2026). **v2.1 (Reader + Favourite): SPEC — complete (owner confirmed in chat 24.10.2026)** |
| **Owner** | egertv@gmail.com |
| **URL** | https://pocket-clone-virid.vercel.app (same Vercel project, same URL) |
| **Repo** | github.com/keeltekool/Pocket_Clone · `C:\Users\Kasutaja\Claude_Projects\Pocket_Clone` |
| **Date** | 24.10.2026 |

This document is self-contained. Read top to bottom; every decision is captured here. Background research (not required
reading): `docs/research/2026-10-24-raindrop-rea.md`.

**v2.1 (24.10.2026, owner's pick from `docs/research/2026-10-24-raindrop-next-features.md`):** a Reader page
(`/read/<number>`, §4.6) and Favourite (a heart on the card, a Favourites view, §4.2). Sections marked **v2.1** below
carry the changes; everything else is v2 as built. Pattern source, Raindrop `raindropio/app` v5.8.3 (`a3e44eb`), REA
pass 24.10.2026:
- **Preview** (`routes/my/item/tab/preview.js`): the reader is a page Raindrop's server renders from the saved copy
  (`/raindrop/preview/{id}`), shown in a frame with the owner's font family, size and colour theme. Pocket Clone renders
  its own saved text instead, with one fixed typography (no reader settings, §11).
- **Favourite** (`important` field): a heart toggle among the card's hover actions (`co/bookmarks/item/actions.js`, copy
  `Add to favorites` / `Remove from favorites`), a filled heart shown on favourited cards at all times
  (`item/info/index.js`), the same toggle in the edit form; the list flips the flag at once and then saves
  (`reducers/bookmarks/single.js`, `sagas/bookmarks/single.js`); a **Favorites** filter with a count sits at the top of
  the sidebar filters (`helpers/filters/normalizeItems.js`).

---

## 1. Why this exists

**The problem.** The owner saves about one link a day (articles, tools, job ads, e-signature/eID material, design
inspiration, shopping). In Raindrop.io he has 383 saves since 2025: 378 sit in Unsorted, with 0 tags, 0 notes and
0 highlights. Sorting by hand never happens, so the collection is a pile. When he wants to work with a saved article in
Claude Code, he copies its text by hand.

**Why existing tools don't solve it.**
- **Raindrop.io**: organising is manual. Its AI only *suggests* a collection as a chip the user must click, and only on
  the paid plan. No link into Claude Code.
- **Pocket**: shut down.
- **Pocket Clone v1** (this repo, Feb 2026): its AI saw only the title and URL and created a new bucket for almost every
  link (6 links → 6 buckets in the 24.10 test). It was also broken for months (retired model, Clerk CDN change).

**Why this approach works.**
1. The owner does one thing: add a link. A Managed Agent running Claude's most capable model (Fable 5.1) reads the actual
   page and files it. No button, no review step.
2. A fixed set of buckets the AI picks from, with Unsorted as the honest fallback, stops bucket sprawl.
3. Every link gets a permanent number. `pocket #57` in any Claude Code window pulls the full article through MCP. This
   pattern is proven in the owner's VAIB-X (`vault #N`) and Tube_Heureka (`heureka #N`).

**User.** One person, the owner. Private, password-protected. Used daily on iPhone and desktop.

**Clean slate.** Nothing is imported: not the Raindrop bookmarks, not the 8 old Pocket Clone links.

---

## 2. Design tenets

1. **The owner only adds.** Everything after the save (reading, filing, suggesting) is the agent's job. No step in the
   product asks the owner to sort.
2. **Nothing leaves the main list.** The main view is every link, newest first. Buckets are filtered views, not
   destinations.
3. **Unsure means Unsorted.** A wrong bucket is worse than no bucket.
4. **The AI never creates buckets.** It suggests; the owner creates.
5. **The number is the handle.** Every link has a permanent `#N`, shown on its card and used by Claude Code.
6. **Saving never needs the app open.** One share action on iPhone, one click on desktop.
7. **V1 is the minimum.** Nothing beyond this spec ships in v1 (owner: "don't overcomplicate, keep V1 optimal").
8. **The current design stays.** The warm paper look (cream background, ink text, terracotta accent, Fraunces titles,
   Source Sans 3 body) is kept as is.

---

## 3. How it works

### The core loop

1. The owner sees something worth keeping.
   - **iPhone:** Share → **Save to Pocket**. A notification says `Saved #58`. The app never opens.
   - **Desktop:** click the **Save to Pocket** bookmark. A small window says `Saved #58 · sorting…` and closes itself.
   - **In the app:** paste the link into the box at the top and press **Save**.
2. The link appears at the top of the main list straight away with its number and the label **Sorting…**.
3. In the background the server has already fetched the page (title, image, readable text). It starts a Managed Agent
   session. The agent reads the link through the app's MCP server and files it:
   - into one of the buckets → the card label changes to that bucket name;
   - or, when nothing fits → the card label changes to **Unsorted**.
4. The link stays in the main list either way. Clicking a bucket in the sidebar shows only that bucket's links.
5. When several Unsorted links share a topic no bucket covers, a suggestion appears above the list:
   `Suggested bucket: EU digital identity · 4 links in Unsorted`. The owner clicks **Create bucket** (or **Dismiss**).
   Creating a bucket makes the agent move the matching Unsorted links into it.
6. To use a link in Claude Code, the owner clicks the card's `#58` (copies `pocket #58`) and pastes it into any Claude
   Code window. Claude pulls the title, URL, bucket and full page text through MCP.

### Primary screen (desktop, 1440)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Pocket Clone                                              Set up saving    Logout     │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ ● All links      58  │ [ Paste a link…                                    ] [ Save ]   │
│   Unsorted        4  │ [ 🔍 Search titles and pages…                                 ] │
│ ──────────────────── │ ┌─────────────────────────────────────────────────────────────┐ │
│ BUCKETS              │ │ Suggested bucket: EU digital identity · 4 links in Unsorted │ │
│   AI & Claude    21  │ │                                [Create bucket]  [Dismiss]   │ │
│   eSign & eID     9  │ └─────────────────────────────────────────────────────────────┘ │
│   Jobs            8  │ ┌──────┬──────────────────────────────────────────────────────┐ │
│   Estonian AI     5  │ │ img  │ Kuidas kasutada digitemplit – näited reaalsest elust │ │
│   Design insp.    3  │ │      │ dokobit.com · 2 min ago      #58  [eSign & eID ▾] 🗑 │ │
│   Shopping & home 4  │ ├──────┼──────────────────────────────────────────────────────┤ │
│   Personal        2  │ │ img  │ PikSpec: Build With AI in Any Website's Style        │ │
│   Other           2  │ │      │ pikspec.com · Sorting…       #57                  🗑 │ │
│ + New bucket         │ ├──────┼──────────────────────────────────────────────────────┤ │
│                      │ │ img  │ AI agents and the future of digital government      │ │
│                      │ │      │ e-estonia.com · Oct 21       #56  [Unsorted ▾]    🗑 │ │
│                      │ └──────┴──────────────────────────────────────────────────────┘ │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### Controls

| Control | What it does |
|---|---|
| **Save** (or Enter in the link box) | Saves the link. Duplicate (same normalised URL) → no new card; toast `Already saved as #57 · Jobs`, the list scrolls to that card and highlights it for 2 s |
| **Search** box | Filters the current view as you type (300 ms debounce) by title, domain, URL and saved page text. Clearing it restores the view |
| **Sidebar item** | Shows All links, Unsorted, or one bucket. The count is the number of links in it |
| **`#58`** on a card | Copies `pocket #58` to the clipboard; toast `Copied pocket #58` |
| **Bucket label ▾** on a card | Menu: every bucket + Unsorted. Picking one moves the link there (owner override). Not shown while Sorting… |
| **🗑** on a card | Deletes the link immediately (as in v1). Toast `Deleted #58` |
| **Card title / image** | Opens the original page in a new tab |
| **Read** on a card (v2.1) | Opens the Reader `/read/58` in the same tab (§4.6) |
| **♡ / ♥** on a card (v2.1) | Toggles Favourite. The card flips at once; on failure it flips back with toast `Couldn't update. Try again.` |
| **Favourites** in the sidebar (v2.1) | Shows only favourited links; the count is how many |
| **+ New bucket** | Inline name field; Enter creates the bucket; the agent then moves matching Unsorted links into it |
| **⋮ on a bucket** (hover) | Rename · Delete. Delete asks `Delete "Jobs"? Its 8 links move to Unsorted.` |
| **Create bucket** (suggestion) | Opens the new-bucket field pre-filled with the suggested name; the owner can edit, Enter creates |
| **Dismiss** (suggestion) | Hides the suggestion; that name is not suggested again |
| **Set up saving** | Opens the setup page (iPhone Shortcut, desktop bookmark, Claude Code) |
| **Logout** | Ends the session on this device |

---

## 4. Screens

UI language: English. Content (titles, pages) is often Estonian; text handling must be UTF-8 throughout.

### 4.1 Login (`/`, logged out) — exists, kept

- **Purpose:** keep the app private.
- **Layout:** centred "Pocket Clone" (Fraunces), tagline "Save links for later", password field, checkbox
  "Remember this device for 180 days" (checked by default), button **Unlock**, error line under it.
- **States:** wrong password → `Wrong password`; 20 wrong passwords in 15 minutes → `Too many wrong passwords. Try again
  in 15 minutes.`; correct → main view.
- Behaviour is already built and tested (`lib/auth.ts`, `api/auth`, commits d4ba104 · 79885a1 · 7bc0267); port as is.

### 4.2 Main view (`/`, `/?bucket=<id>`, `/?view=unsorted`, `/?view=favourites`)

- **Purpose:** see every saved link, find one, copy its number, fix a wrong bucket.
- **Layout:** desktop wireframe in §3. Mobile in §10.
- **Elements:** header (title, **Set up saving**, **Logout**), link box + **Save**, search box, suggestion strip (only when
  an open suggestion exists, max one shown, the newest), list of cards, sidebar.
- **Sidebar (v2.1):** All links · Unsorted · **Favourites** · divider · BUCKETS … The phone sheet (4.5) has the same
  Favourites row in the same place. Favourites is a filter like the others: the search box filters within it.
- **Card fields:** image (og:image or favicon fallback), title (Fraunces), domain · relative date (`2 min ago`, `Oct 21`),
  `#N`, bucket label (`Sorting…`, a bucket name, or `Unsorted`), delete.
- **Card actions row (v2.1):** `#58` · **Read** · heart · bucket label ▾ · 🗑 (desktop). **Read** is a small text button
  styled like `#58`, always visible, also while Sorting…. The heart is an outline heart (`Add #58 to favourites`) or a
  filled terracotta heart (`Remove #58 from favourites`), a toggle button (`aria-pressed`). On desktop the outline heart
  shows on hover and keyboard focus, like 🗑; a filled heart is always visible. On touch both are always visible.
  Favourite is independent of buckets and sorting: favouriting never moves a link, and the agent never changes it.
- **Empty Favourites (v2.1):** `No favourites yet.` / `Tap the heart on a link to keep it here.`
- **Order:** newest saved first, always. No sort options.
- **Loading:** all links load at once (a few hundred rows without page text). *ponytail: no pagination; add cursor paging
  past ~2,000 links.*
- **Live updates:** while any visible card is `Sorting…`, the page re-fetches changed items every 4 s and stops when none
  are left.
- **States:**
  - Empty (no links at all): `Nothing saved yet` / `Paste a link above, or save from your phone or browser.` + link
    `Set up saving`.
  - Empty bucket: `No links in Jobs yet.`
  - Empty Unsorted: `Nothing unsorted. Every link found a bucket.`
  - Search, no results: `No links match "eidas"`.
  - Save failed (network/server): toast `Couldn't save. Try again.`; the link box keeps the URL.
  - Invalid input: `That doesn't look like a link.`
  - Sorting took over 10 minutes and failed twice: the card shows `Unsorted` (see §6.4); no error shown.
- **Data displayed (one card):**

```json
{
  "number": 58,
  "url": "https://www.dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust",
  "title": "Kuidas kasutada digitemplit – näited reaalsest elust - Dokobit",
  "domain": "dokobit.com",
  "imageUrl": "https://signicat.imgix.net/illustrations/dokobit-seo.png",
  "status": "sorted",
  "bucket": { "id": "3b1f…", "name": "eSign & eID" },
  "favourite": false,
  "createdAt": "2026-10-24T09:41:00Z"
}
```

### 4.3 Bookmarklet window (`/add?url=…`)

- **Purpose:** one-click save from any desktop page.
- **Layout:** small popup (420×260): app title, one status line, the link's domain.
- **States:**
  - Logged in → saves immediately → `Saved #58 · sorting…` → closes after 1.5 s.
  - Duplicate → `Already saved as #57 · Jobs` → closes after 2.5 s.
  - Logged out → the login form (4.1) inside the popup; after unlocking it saves and closes.
  - Failure → `Couldn't save. Try again.` with **Retry**; stays open.

### 4.4 Set up saving (`/setup`)

- **Purpose:** one-time setup of the iPhone Shortcut and the desktop bookmark; shows the Claude Code connection.
- **Sections and copy:**
  1. **iPhone — Share → Save to Pocket**
     1. Open **Shortcuts**, tap **+**, name it `Save to Pocket`.
     2. Tap **ⓘ** → turn on **Show in Share Sheet**; accept **URLs**, **Safari web pages** and **Text**.
     3. Add action **Get Contents of URL**: URL `https://pocket-clone-virid.vercel.app/api/save` [Copy], Method **POST**,
        Header `x-api-key` = `<key>` [Copy], Request Body **JSON**: key `url` = **Shortcut Input**.
     4. Add **Get Dictionary Value** → key `message` from **Contents of URL**.
     5. Add **Show Notification** with **Dictionary Value**.
     6. Test: share any page → **Save to Pocket** → you see `Saved #58`.
  2. **Desktop — bookmark button**: a draggable link **Save to Pocket** with the line `Drag this to your bookmarks bar.
     Click it on any page to save that page.`
  3. **Claude Code**: `Connected as MCP server "pocket". In any Claude Code window, paste pocket #58 to pull a link.`
     Shows the registration command [Copy] for re-adding on another machine.
- **States:** the key is shown only to the logged-in owner.

### 4.5 Mobile bucket sheet — exists, kept

- Bottom sheet titled `Filter by bucket`: All links, Unsorted, Favourites (v2.1), buckets with counts; tap selects and
  closes.

### 4.6 Reader (`/read/<number>`) — v2.1

- **Purpose:** read a saved link's text in the app, on the phone first, without the original site's clutter.
- **Entry:** **Read** on a card (same tab). The URL can also be typed or shared (`/read/58`).
- **Content:** the saved `pageText`, split into paragraphs at blank lines, as plain text (no HTML from the page is
  rendered: no images, links, headings or tables). Body in Fraunces, 18 px / 1.65 on phones, 20 px / 1.7 from 768 px,
  measure about 66 characters.
- **Layout, phone (< 768):**

```
┌───────────────────────────────────┐
│ ← Back                Original ↗  │
│                                   │
│ Kuidas kasutada digitemplit –     │
│ näited reaalsest elust - Dokobit  │
│ dokobit.com · 2 min ago           │
│ #58  ♡  ▢ eSign & eID             │
│ ───────────────────────────────── │
│ Digitempel on organisatsiooni     │
│ elektrooniline allkiri, mis …     │
│                                   │
│ Järgmine lõik …                   │
└───────────────────────────────────┘
```

- **Layout, desktop (≥ 768):** the app's two-column page (as on `/setup`): left rail 220 px (260 px from 1280) with
  `← Back`, domain, saved date, `#58`, heart, bucket label and `Open original ↗`, sticky while scrolling; right column the title
  (Fraunces, title size) and the text at the measure. Same max-width container as the main view, so 1440 and 1920 keep
  the rail-plus-text composition.
- **Controls:**
  - `← Back`: returns to the previous page when it was this app (keeps the list's filter and scroll), otherwise goes to `/`.
  - `Open original ↗` / `Original ↗`: the original URL in a new tab.
  - `#58`: copies `pocket #58`, toast `Copied pocket #58` (same as the card).
  - Bucket label: plain text (`eSign & eID`, `Unsorted`, `Sorting…`); no move menu here.
  - Heart: the same toggle as on the card (§6.6a), always visible, beside `#58` (phone: in the `#58` row; desktop: in
    the rail). Flips at once; failure flips back with toast `Couldn't update. Try again.`
- **States:**
  - No text saved (`pageText` null or empty): `No text was saved for this link.` + `Open the original ↗`.
  - Text cut at the 60,000-character cap: after the last paragraph, `The saved text ends here.` + `Read the rest on the
    original ↗`.
  - Unknown or deleted number, or not a number: 404 page `No link #999.` + `← All links`.
  - Logged out: the login form (4.1), as on `/setup`; after unlocking, the reader for that number.
- **Page title:** `<title>Kuidas kasutada digitemplit … · Pocket Clone</title>`; `noindex` like every page.

---

## 5. Data model

Neon PostgreSQL (existing database), Drizzle ORM. Single owner: no user column anywhere.

### `items`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `number` | integer, unique, serial | Permanent `#N`; starts at 1; never reused |
| `url` | text | As saved |
| `urlKey` | text, unique | Normalised for duplicate check: lowercase host, no `www.`, no fragment, no `utm_*` / `fbclid` / `gclid` / `mc_*` params, no trailing slash |
| `title` | text | From the page; falls back to the URL |
| `domain` | text | |
| `imageUrl` | text, null | og:image / twitter:image |
| `pageText` | text, null | Readable text, max 60,000 chars; null if the page gave none. **v2.1:** paragraphs are kept, separated by a blank line (`\n\n`); whitespace inside a paragraph is collapsed. v2 stored one flat line (all whitespace squashed), which the Reader cannot split |
| `favourite` | boolean, default false (v2.1) | Set only by the owner (card heart); never by the agent or MCP |
| `status` | enum `sorting` · `sorted` · `unsorted` | |
| `bucketId` | uuid FK → buckets, null | null when `sorting` or `unsorted`; on bucket delete → null and status `unsorted` |
| `sortedBy` | enum `agent` · `owner`, null | `owner` after a manual Move |
| `sortAttempts` | integer, default 0 | Dispatches so far (max 2) |
| `sortSessionId` | text, null | Last Managed Agent session id |
| `createdAt` | timestamp | |
| `sortedAt` | timestamp, null | |

### `buckets`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | varchar(60), unique (case-insensitive) | |
| `createdAt` | timestamp | |

Seeded at migration, in this order: AI & Claude · eSign & eID · Jobs · Estonian AI scene · Design inspiration ·
Shopping & home · Personal · Other.

### `bucket_suggestions`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | varchar(60) | Suggested bucket name |
| `reason` | text | One sentence from the agent |
| `itemNumbers` | integer[] | Unsorted links that share the topic |
| `status` | enum `open` · `dismissed` · `created` | |
| `createdAt` | timestamp | |

### `login_failures` — exists, kept (attempt cap, `lib/auth.ts`).

### Example

```json
{
  "item": {
    "number": 56,
    "url": "https://e-estonia.com/ai-agents-and-the-future-of-digital-government/",
    "urlKey": "e-estonia.com/ai-agents-and-the-future-of-digital-government",
    "title": "AI agents and the future of digital government",
    "domain": "e-estonia.com",
    "status": "unsorted",
    "bucketId": null,
    "sortedBy": "agent",
    "sortAttempts": 1
  },
  "suggestion": {
    "name": "EU digital identity",
    "reason": "Four unsorted links are about the EUDI wallet and eIDAS implementing acts.",
    "itemNumbers": [44, 49, 53, 56],
    "status": "open"
  }
}
```

**Derived, not stored:** bucket counts, Unsorted count, Favourites count, relative dates.

**Migration v2.1** (one explicit SQL script, adds only, no drops): `alter table items add column if not exists favourite
boolean not null default false`. Then a one-off re-fetch of the page text of every existing item with the
paragraph-keeping extraction (one item in prod on 24.10.2026), updating `pageText` only; an item whose page no longer
answers keeps its old text.

**Reserved names (v2.1):** `Unsorted` and `Favourites` (case-insensitive) cannot be bucket names: create and rename
answer `That name is reserved.`, and `pocket_suggest_bucket` refuses them. Otherwise a bucket could share a name with a
sidebar view and with the MCP `bucket` keywords.

**Migration from v1:** the old `links` and `buckets` tables (user-id based, 8 links and 4 buckets from Feb 2026) are
dropped. `login_failures` stays.

---

## 6. User flows

### 6.1 Save (app box)
Paste → Save → `POST /api/items` → server normalises the URL → duplicate? → toast + scroll (end). New → server fetches
the page (8 s cap) → inserts item (`sorting`) → dispatches the agent (§7.3) → returns the item → card appears at the top
`Sorting…` → polling picks up the agent's result.

The page fetch happens before the insert returns so the agent always has the text. If the fetch fails or times out, the
item is saved with the URL as title and no text; the agent sorts on what it has.

### 6.2 Save (iPhone Shortcut)
Share → Save to Pocket → `POST /api/save` with `x-api-key` and `{ "url": "<shared input>" }`. The server takes the first
http(s) URL found in the input (shared text from some apps contains words around the link). Response
`{ "message": "Saved #58" }` or `{ "message": "Already saved #57 · Jobs" }` → iOS notification. Same pipeline as 6.1.

### 6.3 Save (desktop bookmark)
Click bookmark → popup `/add?url=` → (login if needed) → same pipeline → `Saved #58 · sorting…` → closes.

### 6.4 Agent sorting
Agent session reads `#58` via `pocket_get_item`, reads buckets via `pocket_list_buckets`, decides, calls
`pocket_file_item(58, "eSign & eID")` or `pocket_file_item(58, "unsorted")`. If it filed to Unsorted it checks the
Unsorted pile and may call `pocket_suggest_bucket`. Session ends idle.

**Stuck items.** When the main view loads, any item still `sorting` after 10 minutes is dispatched again
(`sortAttempts` < 2); after the second failed attempt it becomes `unsorted`. No cron, no error UI.

### 6.5 Suggestion → new bucket
Suggestion strip → Create bucket (pre-filled, editable) → Enter → `POST /api/buckets { name, suggestionId }` → bucket
created, suggestion `created` → dispatch a re-sort session: "Bucket X was created; move the Unsorted links that belong
there" → affected cards update via polling. Same re-sort runs when the owner creates a bucket with **+ New bucket**.

### 6.6 Manual move
Bucket label ▾ → pick bucket or Unsorted → `PATCH /api/items/:id` → `sortedBy: owner`. The agent never re-sorts an item
the owner moved.

### 6.6a Favourite (v2.1)
Heart → the card flips at once → `PATCH /api/items/:id { favourite: true }` (the new value, not a toggle) → `{ item }`.
Failure → the card flips back + toast `Couldn't update. Try again.`; 401 → login screen. `sortedBy`, `status` and the
bucket are untouched. In the Favourites view, un-hearting a card removes it from the view at once.

### 6.6b Read (v2.1)
**Read** → `/read/58` (server-rendered with the text; no loading state) → `← Back` → the list as it was.

### 6.7 Delete bucket
⋮ → Delete → confirm → its links become `unsorted` (bucketId null). They are not re-sorted automatically.

### 6.8 Claude Code
Click `#58` → clipboard `pocket #58` → paste in Claude Code → Claude calls `pocket_get_item("58")` → gets title, URL,
bucket, date and page text.

### 6.9 Auth
Covered in 4.1. Session expiry while using the app (rare: 180 days) → next API call returns 401 → the page shows the
login screen.

### 6.10 Edge cases
- Refresh during `Sorting…`: the card still shows `Sorting…`; polling resumes.
- Two saves of the same link at once: the unique `urlKey` makes the second a duplicate.
- Page blocks bots / needs JavaScript (x.com, LinkedIn): x.com and twitter.com links use the public oEmbed endpoint
  (`publish.twitter.com/oembed`) for the post text; others are sorted on title + URL; when that is too thin the agent
  files them as Unsorted.
- PDFs and other non-HTML links: no page text; sorted on title + URL.
- Favourite set on one device while another has the list open: the other shows it after a reload (the live-update poll
  follows saves and sorting only).
- A favourited link that is deleted is gone, favourite included (delete stays immediate).

---

## 7. Architecture & stack

### 7.1 Stack
Same stack as the owner's VAIB-X (Next.js 16.2, `mcp-handler` 1.1, Tailwind 4, Drizzle 0.45, zod 4).

| Part | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| CSS | Tailwind v4; tokens ported from v1 `public/style.css` (`@theme`); fonts Fraunces + Source Sans 3 via `next/font/google` |
| Database | Neon PostgreSQL (existing project), Drizzle ORM |
| Auth | Password gate ported from v1 `lib/auth.ts` (HMAC-signed HttpOnly cookie, 180 days remembered, 20-failure cap) |
| Hosting | Vercel, existing project `pocket-clone`; git push → auto-deploy; `ship.mjs` |
| Page text | v1 `lib/metadata.ts` (server fetch, read to `</head>`, skip non-HTML) extended with `@mozilla/readability` + `linkedom` for the body text; x.com via oEmbed |
| AI | Claude Managed Agents (beta) via `@anthropic-ai/sdk`; model `claude-fable-5-1` |
| MCP | `mcp-handler` Streamable HTTP endpoint at `/api/mcp`, bearer-token protected |

### 7.2 What is reused from v1
Password gate (`lib/auth.ts`, `api/auth`), Neon database + `login_failures`, server-side page fetch (`lib/metadata.ts`),
the iPhone save endpoint idea (`/api/save` + `SHORTCUT_API_KEY`), the flow-check approach (`scripts/check-ui-flows.mjs`),
the visual design. Replaced: the vanilla front end (`public/*`), the per-link Haiku categoriser (`api/categorize`), the
Vercel-functions layout (`api/*`, `vercel.json`).

### 7.3 The sorting agent
- **Agent** `pocket-sorter` (created once, id in `POCKET_AGENT_ID`): model `claude-fable-5-1`, a system prompt with the
  sorting rules below, one MCP server `pocket` → `https://pocket-clone-virid.vercel.app/api/mcp`, and an `mcp_toolset`
  with **`permission_policy: always_allow`**. MCP toolsets default to `always_ask`, which would pause every unattended
  session waiting for an approval nobody sends.
- **Environment** `pocket-env` (id in `POCKET_ENV_ID`): default cloud environment; the agent uses no sandbox tools.
- **Vault** (id in `POCKET_VAULT_ID`): one `static_bearer` credential for the MCP URL holding `MCP_TOKEN`. The token never
  enters the sandbox.
- **Dispatch** (server, on save / bucket create / stuck retry): `sessions.create({ agent, environment_id, vault_ids })`,
  then send one `user.message` (`Sort item #58.` or `Bucket "EU digital identity" was created. Move the Unsorted links
  that belong in it.`). The server does not hold the event stream; the agent writes results through MCP. Store the session
  id on the item.
- **Cost guard:** a session budget of $1 per session (Managed Agents session budgets).
- **Sorting rules (system prompt, summary):**
  1. Read the item (title, domain, page text) and the bucket list with recent titles in each bucket.
  2. File into the single best-fitting bucket. If no bucket clearly fits, file as `unsorted`. Never invent a bucket name.
  3. Never change an item whose `sortedBy` is `owner`.
  4. After filing to Unsorted: if 3 or more Unsorted items share a topic no bucket covers, and no open or dismissed
     suggestion has the same meaning, call `pocket_suggest_bucket` with a short name (max 4 words), a one-sentence
     reason and the item numbers.
  5. On a "bucket created" message: check every Unsorted item against the new bucket only; move those that clearly
     belong.
- **Cost (estimate, to measure in phase 2):** Fable 5.1 is $10 / $50 per million input / output tokens; session running
  time $0.08/hour. Roughly $0.20–0.50 per link → about $10–40 a month at 1–3 saves a day, paid from the owner's $100/month
  API credit. The existing key "Pocket-Clone 2" (created 05.02.2026) is in "Egert's Individual Org", the org that holds
  that credit, and is the key the app already uses (checked 24.10.2026). No new key needed.

### 7.4 Environment variables

| Var | Use |
|---|---|
| `DATABASE_URL` | Neon (exists) |
| `APP_PASSWORD` | Login (exists) |
| `SHORTCUT_API_KEY` | iPhone Shortcut save via `/api/save` (exists) |
| `ANTHROPIC_API_KEY` | Managed Agents (exists: key "Pocket-Clone 2", credit org) |
| `MCP_TOKEN` | Bearer token for `/api/mcp` (Claude Code + the agent's vault) |
| — | Managed Agents resource IDs (agent, environment, vault) live in `agent/ids.json`, committed; they are not secrets |

---

## 8. API routes

All routes except `/api/save` and `/api/mcp` require the session cookie (401 otherwise).

| Route | Method | Purpose | Request → Response |
|---|---|---|---|
| `/api/auth` | GET · POST · DELETE | Session check · login · logout | exists (v1) |
| `/api/items` | GET | List | `?bucket=<id>|unsorted|favourites&q=<text>&changedSince=<iso>` → `{ items: Card[] }` (no page text; each card carries `favourite`) |
| `/api/items` | POST | Save from the app / bookmarklet | `{ url }` → `201 { item }` or `200 { duplicate: true, item }` |
| `/api/items/:id` | PATCH | Manual move · favourite (v2.1) | `{ bucketId | null }` → `{ item }` (`sortedBy: owner`) · `{ favourite: boolean }` → `{ item }` (nothing else changes); a body with both or neither → 400 |
| `/read/:number` | page (v2.1) | Reader | session cookie; logged out → login form; unknown → 404 |
| `/api/items/:id` | DELETE | Delete | → `{ ok: true }` |
| `/api/buckets` | GET | Buckets with counts | → `{ buckets: [{ id, name, count }], unsortedCount, total }` |
| `/api/buckets` | POST | Create (+ re-sort dispatch) | `{ name, suggestionId? }` → `201 { bucket }`; 409 if the name exists |
| `/api/buckets/:id` | PATCH · DELETE | Rename · delete | `{ name }` → `{ bucket }` · → `{ ok: true }` |
| `/api/suggestions` | GET | Open suggestions | → `{ suggestions: [...] }` |
| `/api/suggestions/:id/dismiss` | POST | Dismiss | → `{ ok: true }` |
| `/api/save` | POST | iPhone Shortcut | header `x-api-key`; `{ url }` (any text containing a link) → `{ message, number }` |
| `/api/mcp` | POST/GET | MCP (Streamable HTTP) | header `Authorization: Bearer <MCP_TOKEN>` |

### MCP tools (`/api/mcp`, server name `pocket`)

| Tool | Input | Returns | Used by |
|---|---|---|---|
| `pocket_get_item` | `item`: `"58"`, `"#58"` or a URL; `maxChars?` (default 60,000; the agent asks for 20,000) | number, title, url, domain, bucket, status, sortedBy, **favourite** (v2.1), savedAt, pageText | Claude Code, agent |
| `pocket_search` | `query`, `limit?` (20) | compact list (number, title, domain, bucket, savedAt) | Claude Code |
| `pocket_list` | `bucket?` (name, `unsorted` or **`favourites`**, v2.1), `limit?` (50) | compact list | Claude Code, agent |
| `pocket_list_buckets` | — | buckets with counts and 10 most recent titles each; open/dismissed suggestion names | agent |
| `pocket_file_item` | `number`, `bucket` (name or `unsorted`) | updated item; refuses if `sortedBy` is `owner` | agent |
| `pocket_suggest_bucket` | `name`, `reason`, `itemNumbers[]` | suggestion | agent |

Claude Code registration (done by the builder, user scope):
`claude mcp add --scope user --transport http pocket https://pocket-clone-virid.vercel.app/api/mcp --header "Authorization: Bearer <MCP_TOKEN>"`

---

## 9. Auth & access

- **App:** one password (`APP_PASSWORD`), no accounts, no roles. Logged-out visitors see only the login screen.
- **iPhone Shortcut:** `x-api-key` = `SHORTCUT_API_KEY` on `/api/save` only.
- **MCP:** bearer `MCP_TOKEN` (Claude Code config + the agent vault).
- **Search engines:** `noindex` on every page.

---

## 10. Responsive & devices

Both devices are primary: desktop for browsing and Claude Code, iPhone for saving and quick look-ups. Verified at 375,
1440 and 1920.

| Width | Layout |
|---|---|
| < 768 | No sidebar; a filter button (`All links ▾`) above the list opens the bottom sheet (4.5). Link box and Save on one row. Card: image left, title (2 lines), domain · date, then `#N` and the bucket label **visible** on their own row; delete in the label menu. Suggestion strip full width, buttons stacked |
| 768–1279 | Sidebar 220 px + list |
| ≥ 1280 | Sidebar 260 px + list in a max-width container (1400 px), centred; cards show the full meta row |

Touch: no hover-only controls on touch devices (bucket ⋮ always visible on touch).

**v2.1:** the phone card row becomes `#58` · **Read** · heart · bucket label. At 375 px that leaves the bucket label
about 95 px, so longer bucket names truncate with `…` (they already truncate at 160 px today). The Reader is a single
column below 768 px and rail + text from 768 px (§4.6). Verified at 375, 1440 and 1920, logged in and logged out.

---

## 11. Constraints & exclusions

**Not in v1:**
- ❌ Learning from manual moves, alternative-bucket chips (owner: overkill)
- ❌ AI summaries on cards, a reading pane beside the list (v2.1 adds the Reader as its own page instead)
- ❌ Reader settings (font, size, theme), reading progress, offline reading, images and formatting in the Reader
  (text only), highlights and notes (v2.1 scope, owner)
- ❌ Favourite through MCP, sorting by favourite, bulk favourite (v2.1)
- ❌ Trash / restore (delete is immediate, as in v1)
- ❌ Type filters, sort options, view layouts
- ❌ Tags, notes, highlights, reminders, nested buckets (0 of 383 used in Raindrop)
- ❌ Raindrop import, export, backups
- ❌ In-app AI chat (Claude Code is the chat)
- ❌ Chrome extension (the bookmarklet covers desktop)
- ❌ Scheduled agent runs (everything is triggered by a save or a bucket creation)
- ❌ Bulk select

**Technical constraints:**
- iOS Safari has no web share target, so iPhone saving goes through a Shortcut.
- Managed Agents is beta (`managed-agents-2026-04-01`).
- Pages that block bots or need JavaScript give little or no text (see 6.10).
- Vercel Hobby plan: function timeout limits; the save route does the page fetch (8 s cap) and two short Anthropic calls.

---

## 12. Open decisions

**v2.1:** none. Closed in chat on 24.10.2026 ("All yes but also heart on the reader page i want, go!"):
1. **Paragraphs:** the page fetch keeps paragraph breaks; existing items' text is re-fetched once (§5). Yes.
2. **Phone card row:** keep the **Read** button; the bucket label truncates sooner at 375 px (§10). Yes.
3. **Heart on the Reader:** yes, the same toggle as the card (§4.6).
4. The defaults from `RESUME-HERE.md` "Next build" and the two technical rules (reserved names; the heart sends the new
   value) were presented and accepted.

v2: none. Closed in the grill on 24.10.2026:
1. **Old data:** the v1 `links` and `buckets` tables (8 links, 4 buckets) are dropped. Owner: yes.
2. **API key:** the existing project key "Pocket-Clone 2" is already in the credit org (§7.3). No new key.
3. **Deleting a bucket:** its links go to Unsorted and stay there; no automatic re-sort (§6.7). Owner's choice.
4. The builder's technical calls in §7.3 (Fable via Managed Agents through the app's MCP server, $1 session cap, one
   retry then Unsorted, suggestion at 3+ Unsorted links, x.com via oEmbed) were presented and accepted ("yes to all").
