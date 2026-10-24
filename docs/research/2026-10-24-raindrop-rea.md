# Raindrop analysis for the Pocket Clone spec

24.10.2026. Input for `/spec`. Raindrop is a source of ideas, not a template: the premise stays the owner's want
(save a link → AI sorts it into buckets from the main list → `pocket #N` pulls the article into Claude Code via MCP),
and the existing Pocket Clone is reused where it holds up.

Three sources, kept apart below:
1. **Owner's data**: all 383 Raindrop bookmarks, read through his session (read-only).
2. **Live walkthrough**: his logged-in Raindrop in his Chrome; menus and panels opened, nothing saved or changed.
3. **REA**: Raindrop's web app source (public, MIT, `github.com/raindropio/app`) and the shipped bundle, analysed with REA.

## 1. What the owner's data says

- 383 saves, 2025: 181 · 2026: 202 (about one a day).
- 378 in Unsorted. 2 collections (Egert_AI 5, Vitt 0). 0 tags, 0 notes, 0 highlights, 0 reminders.
- Types (Raindrop's own detection): links 285, articles 86, documents 5, videos 4, audios 2, images 1.
- Topics: AI and Claude tooling (x.com 22, claude.ai/.com 23, github 11), e-signature and eID work (Scrive, Dokobit,
  dvv.fi, Telia Sign, EU Commission, ETSI), job ads (cv.ee 13, CV Keskus 7, Swedbank, LinkedIn), the Estonian AI scene
  (AI Hüpe, EGI, Agentik, Pragmatiq), design inspiration (Mobbin, Dribbble), shopping and home (IKEA, Bauhaus, Jysk),
  entertainment and personal.

**Reading:** Raindrop is used as an inbox. The organising tools exist and go unused, because sorting by hand never
happens. The feature that matters is the one Raindrop leaves to the user: putting each save in the right place.

## 2. Live walkthrough (owner's account, free plan)

| Area | What is there |
|---|---|
| Layout | Sidebar (All, Unsorted, Trash, Collections, Filters with counts) · list · optional third pane for one item |
| List row | Cover left, title, then `collection · domain · date`. Hover shows: select checkbox, Preview (eye), Edit, Delete. "More…" button loads the next page |
| Item pane | Tabs **Edit · Ask · Web · Web archive**, plus expand and open-in-new-tab. Web = the live site in a frame; Web archive = saved copy (PRO) |
| Edit tab | Cover, title, description, Note (Markdown), Collection picker, Tags, URL, Favourite (heart), Reminder (bell), saved date, Delete |
| Views | List · Cards · Headlines · Moodboard; "Apply to all"; toggles for what a row shows (cover, title, note, description, highlights, tags, bookmark info); cover left/right |
| Sort | Date ↑/↓ · Name A–Z/Z–A · Site A–Z/Z–A |
| Search | Filter suggestions under the box: Type, Date of creation, In title/description, In URL, Without tags; a leading `-` excludes a condition |
| Sidebar filters | By type (Links, Articles, Documents, Videos, Audios, Images) and "Without tags", each with a count |
| Bulk select | Toolbar: Move · Add tags · Delete · Export · Open · more · Cancel |
| Add | Small popover: one URL field, Submit. The arrow next to Add: "Upload file…" |
| Ask ("Stella", beta) | Chat with bookmarks (summaries, key points, translation); actions in plain language (create, move, delete, tag); "keep it tidy" (find misplaced bookmarks, merge duplicate tags, spot gaps). Runs on open-source models on Raindrop's servers. PRO |
| Upsell | "AI assistant, semantic search, web archive and more… Upgrade to PRO" |

## 3. REA findings (Raindrop's code)

**Basis.** Source `raindropio/app` commit `a3e44eb` (13.10.2026, "fix embed and rss links", v5.8.3). The live bundle
(`app.5cb0b0c1….js`) carries the same version string `5.8.3` and all 43 API paths found in the source, so the repo is what
runs today. REA runs: static analysis of the source tree (663 files, 0 parse failures, `ev_c84f90b7…`), live bundle captured
in a separate logged-out headless browser (`ev_f938b747…`) and exported and analysed (`ev_f7bb0e08…`). REA's
source-to-bundle comparison cannot run on Windows (`unsupported_host`), so the match rests on the version string and API
literals, not a byte comparison. Raindrop's server is closed: parsing, the suggestion model, search, broken-link and
duplicate detection are visible only as the calls the app makes.

| Area | How Raindrop does it (source) | For Pocket Clone |
|---|---|---|
| **AI sorting** | Opening an item asks the server for suggestions (`raindrop/{id}/suggest`). Up to 5 collections and some tags come back and show as one-click chips under the Collection and Tags fields; one click sets the collection and saves. Nothing is applied automatically. PRO only. Settings copy: "You get your own private AI categorization model based on your data." (`co/bookmarks/edit/form/collection/*`, `data/sagas/bookmarks/single.js`, `en.json:359`) | The chip pattern is the right correction tool. Pocket Clone's premise goes one step further: file every save automatically, then offer the alternatives as one-click chips |
| **Ask ("Stella")** | A separate AI service in a frame (`beta-ai.raindrop.io`). It changes data with tools; the app reloads lists when told a tool ran (`co/stella/index.js`) | Pocket Clone's equivalent is Claude Code over MCP (`pocket #N`) plus the Managed Agent "Sort" run. No in-app chat needed for v1 |
| **Save** | Item is created at once and metadata fills in on the server afterwards. Before creating, it checks whether the URL is already saved and opens the existing item instead. Add box takes several URLs at once and reads the clipboard. Links and files can be dropped on the list. The extension saves with Ctrl+Shift+S, can save all open tabs, and reads title/description/image from the page itself (`data/sagas/bookmarks/draft.js`, `co/bookmarks/add/*`, `target/extension/*`) | Instant save + background fill already exists. Duplicate check is cheap and worth having |
| **Organise** | Unsorted (id -1) is the inbox; Trash (id -99) restores to Unsorted. Collections nest. Items can be dragged onto a sidebar collection. Bulk select uses one server call for either the selected ids or the whole filtered result (`data/reducers/collections`, `data/sagas/bookmarks/selectMode.js`) | Inbox + trash semantics are simple and proven. Nesting and drag-drop are optional |
| **Find** | Search runs on the server. Query tokens: `#tag`, `type:`, `created:`, `link:`, `"phrase"`, `-exclude`, `notag:true`, `duplicate:true`, `broken:true`, favourites. Free search covers title, description, URL, tags and notes; full page text is PRO (help page, not code). Sort: manual, date, title, site, relevance | Postgres full-text over the saved page text gives the PRO tier for free |
| **Views** | List, grid, simple, masonry per collection, "apply to all", per-view field toggles, configurable click action (`co/bookmarks/items/view/*`) | One good list view plus the item pane covers the owner's use |
| **Reading** | Item tabs: Edit · Ask · Preview (server-made reader of the saved text) · Web (live page in a frame) · Web archive (saved copy, PRO). Highlights in four colours are stored on the item (`routes/my/item/*`, `co/highlights/*`) | A reader built from the saved page text comes almost free once the text is stored; highlights are unused (0 of 383) |
| **Maintenance** | Server flags broken links (strictness setting) and duplicates; export as HTML/CSV/TXT; on-demand and daily backups (`co/bookmarks/export/*`, `routes/settings/*`) | Dead-link flag and export are cheap later additions |
| **Phone** | Same app; three panes collapse with CSS only. Below 500 px the sidebar becomes an overlay. Hover effects only with a mouse; touch gets larger targets (`co/screen/splitview/*`) | Same approach fits: one responsive app, no separate mobile build |
| **Shortcuts** | Almost none in the web app: Ctrl/Cmd+F search, Esc closes, Enter opens, Delete removes, arrow keys move, Shift-click selects a range | Nothing to copy beyond the basics |

## 5. Decisions for the spec

Defaults are recommendations; each needs the owner's answer before or during `/spec`.

1. **Auto-sort behaviour.** Default: every save is filed into a bucket straight away from the saved page text, and the
   card shows the AI's choice plus up to 3 alternative buckets as one-click chips to correct it (Raindrop's chip pattern,
   applied after the fact instead of waiting for a click).
2. **Bucket set.** Default: a fixed list the AI picks from, seeded from the corpus (AI & Claude, eSign & eID, Jobs,
   Estonian AI scene, Design inspiration, Shopping & home, Personal, Other). The AI may propose a new bucket; it appears only
   after the owner approves it.
3. **Managed Agent role.** Default: a "Sort" button in the main list starts a Managed Agent run over everything unsorted or
   uncertain; the Claude API call does the per-save filing. Weekly tidy (merge/split proposals, dead links) is suggestion 7.
4. **Front end.** Default: keep the backend pieces (auth, Neon/Drizzle, page fetch, save endpoint, flow check) and rebuild the
   UI. Tailwind is required on all web projects (CLAUDE.md §3), and the current UI is plain CSS.
5. **Visual style.** Keep the warm paper look (Fraunces, terracotta) or design fresh. Owner's call.
6. **Capture.** How does the owner save to Raindrop today: phone share sheet, Chrome extension, or both? Default: finish the
   iPhone Shortcut (share sheet) and add a desktop bookmarklet.
7. **Suggestions from 24.10 (yes/no each):** type filters · full-text search over saved text · keep a text copy (reader +
   dead-link safety) · one-line AI summary per card · duplicate warning on save · trash with restore · weekly librarian
   agent · desktop bookmarklet.

## 4. Existing Pocket Clone: what can be reused

State after 24.10.2026 (commits d4ba104, 79885a1, 7bc0267): about 2,700 lines, vanilla JS front end (`public/app.js`
855 lines), Vercel Node functions in `api/`, Neon via Drizzle, live and verified (21-step click-through).

| Part | Verdict | Why |
|---|---|---|
| Password gate (`lib/auth.ts`, `api/auth`) | Keep as is | Built and tested today: 180-day remembered device, attempt cap, Unicode-safe |
| Neon database + Drizzle (`links`, `buckets`) | Keep, extend | Add item number, saved page text, summary, sort status; the tables and hosting already work |
| Server-side page fetch (`lib/metadata.ts`) | Keep, extend | Already fetches title and image; add readable-text extraction for sorting, search and MCP |
| iPhone save endpoint (`api/save`, `save.html`) | Keep, finish | Server side works; the Shortcut itself was never made (placeholder link) |
| Flow check (`scripts/check-ui-flows.mjs`) | Keep, extend | Real login, every flow, 1440 + 375, cleans up after itself |
| AI sorting (`api/categorize`) | Rewrite | Sees title and URL only and invents a bucket per link (6 links → 6 buckets on 24.10) |
| Front end (`public/app.js`, `style.css`) | Spec decision | Works, but the UI the spec asks for (item pane, search, filters, numbers, phone layout) is most of a new front end |
| Visual language (warm paper palette, Fraunces + Source Sans 3, terracotta accent) | Spec / design decision | Distinctive and finished; keep or redo is the owner's call |

The MCP server does not force a framework change: an MCP endpoint can run as one more Vercel function next to the
existing ones. The MCP TypeScript SDK runs a stateless Streamable HTTP endpoint on plain Node `req`/`res`
(`NodeStreamableHTTPServerTransport` with `sessionIdGenerator: undefined`, then `handleRequest(req, res, body)`;
Context7 `/modelcontextprotocol/typescript-sdk`, read 24.10.2026). The real fork is the front end: evolve the vanilla app, or rebuild the UI on a framework while keeping
the backend pieces above.
