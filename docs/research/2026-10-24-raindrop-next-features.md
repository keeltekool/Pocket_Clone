# Pocket Clone — next features from the Raindrop analysis

24.10.2026, after the v2 build went live. Source: `2026-10-24-raindrop-rea.md` (owner's 383 Raindrop saves, the live
walkthrough, REA of `raindropio/app` 5.8.3). For later revision; nothing here is planned or approved.

**Ordering:** by expected value for daily use (what the owner's own data says he would touch) against build effort.
Effort sizes: S = one route or column, one flow step · M = a screen or a schema change plus flows · L = a new agent run.

Already in v2 from the same analysis, so not listed again: instant save with server-side page fetch, duplicate check on
save, full-text search over saved page text, inbox semantics (Unsorted), bookmarklet, phone layout, `pocket #N` via MCP.

## Ranked

| # | Feature | What Raindrop does (REA) | Why it ranks here | Effort |
|---|---|---|---|---|
| 1 | **Reader view** (`/read/58`): the saved page text, Fraunces, phone-first | Item pane tab "Preview" renders a server-made reader of the saved text; "Web archive" keeps a copy (PRO) | The text is already stored for the agent and Claude Code; a reader makes it useful on the phone and survives dead links. One route, no new data | S |
| 2 | **Trash with restore** (30-day purge) | Trash (collection id −99); restore puts the item back in Unsorted; bulk delete goes to Trash first | Delete is instant today; one wrong tap on a phone loses a link for good. `deletedAt` column, a Trash view, restore sets `unsorted` | S–M |
| 3 | **Several links at once + clipboard** in the add box; drop a link on the list | Add popover accepts many URLs, reads the clipboard; links and files can be dropped on the list | Fits "the owner only adds": paste a chat full of links, every URL becomes a card and gets sorted. `firstUrl` → `allUrls` | S |
| 4 | **Type filters with counts** (Articles · Videos · Documents · Links) | Sidebar filters by type, counts from the server; type detected on save | His data: 285 links, 86 articles, 5 documents, 4 videos. A `type` column set at save from content-type and host (YouTube, PDF) and four sidebar rows | S–M |
| 5 | **Search tokens**: `site:`, `type:`, `-word`, `"phrase"`, `is:unsorted` | Server-side query tokens (`type:`, `link:`, `created:`, `-exclude`, `notag:true`, `duplicate:true`) | The search box exists; tokens make it precise once the list is a few hundred long. Parser in `listItems`, no UI | S |
| 6 | **Export** (HTML bookmarks file / CSV) | Export as HTML/CSV/TXT per collection or all; daily backups (PRO) | Cheap insurance; HTML export imports into any browser. One route, Setup page link | S |
| 7 | **Dead-link flag** | Server marks broken links (strictness setting); filter `broken:true` | Shows which saves are gone; the reader (1) still has the text. Needs a periodic HEAD check — a plain Vercel cron, not an agent run; the owner ruled out scheduled *agent* runs, so this is his call | M |
| 8 | **Sort options** (date · title · site) and a Cards view | Four views with per-view field toggles, "apply to all"; sort by date, name, site, relevance | Only once the list is long; the owner cut sort/view options from v1 and the data shows no need yet | S (sort) · M (view) |
| 9 | **Favourite** (heart) + `is:favourite` filter | Favourite flag on the item, filter in the sidebar | Cheap, but no signal in the data that he would use it | S |
| 10 | **Keyboard**: `/` focuses search, `Esc` closes, arrows move, `Enter` opens | Raindrop has almost none beyond these | Desktop nicety; nothing to copy beyond the basics | S |

## Declined for v1 — revisit only if the owner asks

- **Alternative-bucket chips** on the card (Raindrop's one-click suggestion chips). Owner: "overkill, don't overengineer".
- **One-line AI summary per card.** The agent already reads the page; one more field would cost nothing per sort, but
  summaries were cut from v1 together with the reading pane.
- **Learning from manual moves.** Cut ("keep V1 optimal").
- **"Keep it tidy" librarian run** (Raindrop's Stella: find misplaced links, merge duplicates, spot gaps). Would be an
  on-demand or weekly agent session; scheduled agent runs are out of v1.
- **Chrome extension** (save all tabs, Ctrl+Shift+S). The bookmarklet covers desktop.
- **In-app chat** over the saves. Claude Code over MCP is the chat.

## Not recommended — the owner's data says no

Tags, notes, highlights, reminders, nested collections, moodboard/masonry views: 0 of 383 Raindrop saves used any of them.
