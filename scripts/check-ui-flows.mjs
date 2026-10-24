// Click-through of Pocket Clone's user flows (CLAUDE.md §2, plan Task 1.7).
//   node scripts/check-ui-flows.mjs [baseUrl]        (default https://pocket-clone-virid.vercel.app)
// 1440, then 375, then 1920. Logs in with APP_PASSWORD from .env.local. The owner's rows are only read: every link this
// script saves carries ?pcflow=<run>, every bucket it makes is named pcflow-<run>; all of it is deleted at the end
// (UI first, DB sweep as backstop). Screenshots → %TEMP%/pocket-clone-flows/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const { chromium } = createRequire("C:/Users/Kasutaja/.claude/scripts/")("playwright");
process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const BASE = (process.argv[2] ?? "https://pocket-clone-virid.vercel.app").replace(/\/$/, "");
const OUT = join(tmpdir(), "pocket-clone-flows");
mkdirSync(OUT, { recursive: true });

const RUN = Date.now().toString(36);
const TEST_URL = `https://en.wikipedia.org/wiki/Bookmark_(digital)?pcflow=${RUN}`;
// Same page under www., a tracking param, a trailing slash and a fragment: must be the same link (Review focus 5).
const DUP_URL = `https://www.en.wikipedia.org/wiki/Bookmark_(digital)/?utm_source=a&pcflow=${RUN}#top`;
const MOBILE_URL = `https://en.wikipedia.org/wiki/Hyperlink?pcflow=${RUN}`;
const BUCKET = `pcflow-${RUN}`;
const RENAMED = `${BUCKET}-renamed`;
const SUGGEST = `pcflow-${RUN}-s`;
const ADD_URL = `${BASE}/?pcflow=${RUN}&page=bookmarklet`; // the page the bookmarklet is clicked on
// login_failures rows from this run are removed at the end. Kept as DB text: a JS Date goes out with the local +03:00
// offset, which a timestamp-without-zone column drops, shifting the cutoff three hours ahead.
const [{ runStart }] = await sql`select now()::timestamp::text as "runStart"`;
const SITE = "https://pocket-clone-virid.vercel.app"; // the bookmarklet and the setup page always name the public URL
let filedAs = "Unsorted"; // the label the agent (or the local settle) gave TEST_URL
// Locally no agent can reach /api/mcp (it only exists deployed), so saves are settled by hand; on prod the real agent runs.
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let passed = 0;
const failures = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures.push(`${name}: ${e.message.split("\n")[0]}`);
    console.log(`  ✗ ${name}\n      ${e.message.split("\n")[0]}`);
  }
}
const expect = (ok, msg) => { if (!ok) throw new Error(msg); };

const browser = await chromium.launch();
const consoleErrors = [];
// Deliberate 4xx replies (wrong password, invalid link, cap) are logged by the browser as resource errors; drop those.
const deliberate = (t) => /status of (400|401|409|429)/.test(t);

async function newPage(width) {
  const ctx = await browser.newContext(
    width < 500 ? { viewport: { width, height: 812 }, isMobile: true, hasTouch: true } : { viewport: { width, height: 900 } },
  );
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE }).catch(() => {});
  const page = await ctx.newPage();
  // Console "Failed to load resource" lines carry no URL; failed requests are tracked by URL below instead.
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) consoleErrors.push(`${width}: ${m.text().slice(0, 200)}`); });
  // The favicon fallback asks Google's service, which 404s for hosts without an icon (test URLs on this very site);
  // the card keeps its thumb ground, so that one is expected. Everything else ≥ 400 is reported unless deliberate.
  page.on("response", (r) => {
    if (r.status() < 400 || deliberate(`status of ${r.status()}`) || /gstatic\.com\/faviconV2|google\.com\/s2\/favicons/.test(r.url())) return;
    consoleErrors.push(`${width}: ${r.status()} ${r.url().slice(0, 160)}`);
  });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? RENAMED : undefined));
  return { ctx, page };
}

async function login(page, remember) {
  await page.fill("#password-input", process.env.APP_PASSWORD);
  if (!remember) await page.uncheck("#remember-input");
  await page.click("#auth-btn");
  await page.locator("#url-input").waitFor({ state: "visible", timeout: 15_000 });
}

const card = (page, url = TEST_URL) => page.locator(`.item-card:has(.card-title[href="${url}"])`);
const toast = (page, text) => page.locator(`#toast:has-text("${text}")`).waitFor({ timeout: 5_000 });
const sidebarCount = (page, view) => page.locator(`.sidebar-item[data-view="${view}"] span.ml-2`).innerText();
let number = null;

try {
  // ── Desktop 1440 ──────────────────────────────────────────────
  console.log("1440");
  const { ctx, page } = await newPage(1440);

  await step("logged out: password form renders, no list", async () => {
    await page.goto(BASE, { waitUntil: "load" });
    await page.locator("#auth-form").waitFor({ state: "visible", timeout: 15_000 });
    expect((await page.locator("#url-input").count()) === 0, "main view visible while logged out");
    await page.screenshot({ path: join(OUT, "1440-login.png") });
  });

  await step("API refuses requests without a session", async () => {
    const r = await page.request.get(`${BASE}/api/items`, { headers: { cookie: "" } });
    expect(r.status() === 401, `GET /api/items → ${r.status()}`);
  });

  await step("wrong password shows Wrong password and stays locked", async () => {
    await page.fill("#password-input", "definitely-wrong");
    await page.click("#auth-btn");
    await page.locator('#auth-error:has-text("Wrong password")').waitFor({ timeout: 5_000 });
    expect((await page.locator("#url-input").count()) === 0, "unlocked with a wrong password");
  });

  await step("20 recent wrong passwords block even the right one (429)", async () => {
    await sql`insert into login_failures (created_at) select now() from generate_series(1, 20)`;
    try {
      const r = await page.request.post(`${BASE}/api/auth`, { data: { password: process.env.APP_PASSWORD } });
      expect(r.status() === 429, `POST /api/auth → ${r.status()}`);
    } finally {
      const removed = await sql`delete from login_failures where created_at >= ${runStart}::timestamp returning id`;
      expect(removed.length >= 20, `cleanup removed ${removed.length} rows, logins would stay blocked`);
    }
  });

  await step("right password unlocks; remembered device gets a 180-day cookie", async () => {
    await login(page, true);
    const c = (await ctx.cookies()).find((x) => x.name === "pc_session");
    expect(c, "no pc_session cookie");
    expect(c.httpOnly, "cookie not HttpOnly");
    const days = (c.expires * 1000 - Date.now()) / 86_400_000;
    expect(days > 179 && days < 181, `cookie lasts ${days.toFixed(1)} days`);
    await page.screenshot({ path: join(OUT, "1440-app.png") });
  });

  await step("empty state copy (when the list is empty)", async () => {
    if ((await sidebarCount(page, "all")) !== "0") return console.log("      (list not empty, skipped)");
    await page.locator('text="Nothing saved yet"').waitFor({ timeout: 5_000 });
    await page.locator('text="Paste a link above, or save from your phone or browser."').waitFor({ timeout: 5_000 });
  });

  await step("invalid input → That doesn't look like a link.", async () => {
    await page.fill("#url-input", "not a link at all");
    await page.click("#add-btn");
    await page.locator("#add-error:has-text(\"That doesn't look like a link.\")").waitFor({ timeout: 5_000 });
  });

  await step("save a link → card with #N and the page title", async () => {
    await page.fill("#url-input", TEST_URL);
    await page.click("#add-btn");
    await card(page).waitFor({ state: "visible", timeout: 20_000 });
    number = await card(page).getAttribute("data-number");
    expect(Number(number) > 0, `no number on the card: ${number}`);
    const title = await card(page).locator(".card-title").innerText();
    expect(title && title !== TEST_URL && /bookmark/i.test(title), `title not fetched: ${title}`);
    expect((await card(page).locator(".card-bucket").first().innerText()).trim() === "Sorting…", "new link is not Sorting…");
    expect((await page.inputValue("#url-input")) === "", "link box not cleared");
    await page.screenshot({ path: join(OUT, "1440-card.png") });
  });

  await step(LOCAL ? "settle the card (no agent locally) → Unsorted" : "agent files the link within 5 min (real session)", async () => {
    if (LOCAL) {
      await sql`update items set status = 'unsorted', sorted_at = now() where url = ${TEST_URL}`;
      await page.reload({ waitUntil: "load" });
      await card(page).locator('.card-bucket:text-is("Unsorted")').waitFor({ timeout: 10_000 });
      return;
    }
    // The page polls every 4 s while a card is Sorting…; the agent reads the page and files it.
    await page.waitForFunction(
      (u) => { const c = [...document.querySelectorAll(".item-card")].find((x) => x.querySelector(`.card-title[href="${u}"]`)); const t = c?.querySelector(".card-bucket")?.textContent.trim(); return t && t !== "Sorting…"; },
      TEST_URL, { timeout: 5 * 60_000, polling: 2_000 },
    );
    filedAs = (await card(page).locator(".card-bucket").first().innerText()).trim();
    console.log(`      filed as: ${filedAs}`);
    await page.screenshot({ path: join(OUT, "1440-sorted.png") });
  });

  // Review focus 1: a dispatch that never files (bad vault, refusal, budget) → the stuck rule retries once, then
  // Unsorted. Two marker rows stand in for those sessions: one overdue on its 2nd attempt (→ Unsorted on this load),
  // one overdue on its 1st (→ claimed once: attempts 2, still Sorting… until that attempt is overdue too).
  await step("stuck rule: 2nd failed attempt → Unsorted; 1st → one re-dispatch (Review focus 1)", async () => {
    const stuckUrl = (n) => `https://en.wikipedia.org/wiki/Stuck_${n}?pcflow=${RUN}`;
    await sql`insert into items (url, url_key, title, domain, status, sort_attempts, created_at)
              values (${stuckUrl(2)}, ${`en.wikipedia.org/wiki/Stuck_2?pcflow=${RUN}`}, 'Stuck twice', 'en.wikipedia.org', 'sorting', 2, now() - interval '31 minutes'),
                     (${stuckUrl(1)}, ${`en.wikipedia.org/wiki/Stuck_1?pcflow=${RUN}`}, 'Stuck once', 'en.wikipedia.org', 'sorting', 1, now() - interval '21 minutes')`;
    await page.reload({ waitUntil: "load" });
    await card(page, stuckUrl(2)).locator('.card-bucket:text-is("Unsorted")').waitFor({ timeout: 10_000 });
    await card(page, stuckUrl(1)).locator('.card-bucket:text-is("Sorting…")').waitFor({ timeout: 10_000 });
    const [once] = await sql`select sort_attempts from items where url = ${stuckUrl(1)}`;
    expect(once.sort_attempts === 2, `re-dispatch did not claim the item (attempts ${once.sort_attempts})`);
    await page.reload({ waitUntil: "load" }); // a second load must not claim it again
    const [again] = await sql`select sort_attempts from items where url = ${stuckUrl(1)}`;
    expect(again.sort_attempts === 2, `claimed twice (attempts ${again.sort_attempts})`);
    await sql`delete from items where url like ${`https://en.wikipedia.org/wiki/Stuck_%?pcflow=${RUN}`}`;
  });

  await step("same link under www/utm/fragment/slash → Already saved toast + highlight", async () => {
    await page.reload({ waitUntil: "load" });
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
    await page.fill("#url-input", DUP_URL);
    await page.click("#add-btn");
    await toast(page, `Already saved as #${number} · ${filedAs}`);
    expect((await page.locator(".item-card").count()) === (await page.locator(`.item-card[data-number]`).count()), "card count changed");
    expect((await card(page).getAttribute("class")).includes("border-terracotta"), "duplicate card not highlighted");
  });

  await step("#N copies `pocket #N`", async () => {
    await card(page).locator(".card-number").click();
    await toast(page, `Copied pocket #${number}`);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip === `pocket #${number}`, `clipboard: ${clip}`);
  });

  await step("search: hit, then No links match", async () => {
    await page.fill("#search-input", `pcflow=${RUN}`);
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForFunction(() => document.querySelectorAll(".item-card").length === 1, null, { timeout: 10_000 });
    await page.fill("#search-input", "zzqq-nothing-here");
    await page.locator('text="No links match "zzqq-nothing-here""').waitFor({ timeout: 10_000 });
    await page.fill("#search-input", "");
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
  });

  await step("move via the label menu → Jobs; sidebar count follows", async () => {
    const before = Number(await sidebarCount(page, await page.locator('.sidebar-item:has(.bucket-name:text-is("Jobs"))').getAttribute("data-view")));
    await card(page).locator(".card-bucket-btn").click();
    await page.locator('.bucket-option:has-text("Jobs")').click();
    await card(page).locator('.card-bucket:text-is("Jobs")').first().waitFor({ timeout: 10_000 });
    const jobsId = await page.locator('.sidebar-item:has(.bucket-name:text-is("Jobs"))').getAttribute("data-view");
    expect(Number(await sidebarCount(page, jobsId)) === before + 1, "Jobs count did not grow");
  });

  await step("create a bucket from the sidebar; duplicate name is refused", async () => {
    await page.click("#new-bucket-btn");
    await page.fill("#new-bucket-input", BUCKET);
    await page.press("#new-bucket-input", "Enter");
    await page.locator(`.sidebar-item .bucket-name:text-is("${BUCKET}")`).waitFor({ timeout: 10_000 });
    await page.click(`.sidebar-item:has(.bucket-name:text-is("${BUCKET}"))`);
    await page.locator(`text="No links in ${BUCKET} yet."`).waitFor({ timeout: 5_000 });
    await page.click('.sidebar-item[data-view="all"]');
    await page.click("#new-bucket-btn");
    await page.fill("#new-bucket-input", BUCKET.toUpperCase());
    await page.press("#new-bucket-input", "Enter");
    await page.locator('#new-bucket-form:has-text("already exists")').waitFor({ timeout: 10_000 });
    await page.press("#new-bucket-input", "Escape");
  });

  await step("move into the new bucket; filter shows only it; URL carries ?bucket=", async () => {
    await card(page).locator(".card-bucket-btn").click();
    await page.locator(`.bucket-option:has-text("${BUCKET}")`).click();
    await card(page).locator(`.card-bucket:text-is("${BUCKET}")`).first().waitFor({ timeout: 10_000 });
    await page.click(`.sidebar-item:has(.bucket-name:text-is("${BUCKET}"))`);
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
    expect((await page.locator(".item-card").count()) === 1, "bucket view shows other links");
    expect(page.url().includes("?bucket="), `url: ${page.url()}`);
  });

  await step("rename the bucket → sidebar and card label follow", async () => {
    await page.click('.sidebar-item[data-view="all"]');
    await page.locator(`.sidebar-item:has(.bucket-name:text-is("${BUCKET}"))`).hover();
    await page.locator(`div:has(> .sidebar-item .bucket-name:text-is("${BUCKET}")) .bucket-menu-btn`).click();
    await page.click('#bucket-context-menu button:has-text("Rename")');
    await page.locator(`.sidebar-item .bucket-name:text-is("${RENAMED}")`).waitFor({ timeout: 10_000 });
    await card(page).locator(`.card-bucket:text-is("${RENAMED}")`).first().waitFor({ timeout: 5_000 });
  });

  await step("delete the bucket → its link shows Unsorted", async () => {
    await page.locator(`.sidebar-item:has(.bucket-name:text-is("${RENAMED}"))`).hover();
    await page.locator(`div:has(> .sidebar-item .bucket-name:text-is("${RENAMED}")) .bucket-menu-btn`).click();
    await page.click('#bucket-context-menu button:has-text("Delete")');
    await page.locator(`.sidebar-item .bucket-name:text-is("${RENAMED}")`).waitFor({ state: "detached", timeout: 10_000 });
    await card(page).locator('.card-bucket:text-is("Unsorted")').first().waitFor({ timeout: 5_000 });
    await page.click('.sidebar-item[data-view="unsorted"]');
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
    expect(page.url().includes("view=unsorted"), `url: ${page.url()}`);
    await page.click('.sidebar-item[data-view="all"]');
  });

  // Phase 3: a suggestion strip (inserted as the agent would via pocket_suggest_bucket) → Create bucket pre-fills the
  // field; Enter creates the bucket and the strip goes; on prod the agent then moves the matching Unsorted links.
  await step("suggestion strip → Create bucket → pre-filled field → bucket created, strip gone", async () => {
    const [{ number }] = await sql`select number from items where url = ${TEST_URL}`;
    await sql`insert into bucket_suggestions (name, reason, item_numbers) values (${SUGGEST}, 'Test links share a topic no bucket covers.', ${[number]})`;
    await page.reload({ waitUntil: "load" });
    await page.locator(`#suggestion-strip:has-text("Suggested bucket: ${SUGGEST}")`).waitFor({ timeout: 10_000 });
    await page.screenshot({ path: join(OUT, "1440-suggestion.png") });
    await page.click("#suggestion-strip .suggestion-create");
    await page.locator("#new-bucket-input").waitFor({ timeout: 5_000 });
    expect((await page.inputValue("#new-bucket-input")) === SUGGEST, "field not pre-filled");
    await page.press("#new-bucket-input", "Enter");
    await page.locator(`.sidebar-item .bucket-name:text-is("${SUGGEST}")`).waitFor({ timeout: 10_000 });
    await page.locator("#suggestion-strip").waitFor({ state: "detached", timeout: 5_000 });
    const [s] = await sql`select status from bucket_suggestions where name = ${SUGGEST}`;
    expect(s.status === "created", `suggestion status ${s.status}`);
    await page.locator(`.sidebar-item:has(.bucket-name:text-is("${SUGGEST}"))`).hover();
    await page.locator(`div:has(> .sidebar-item .bucket-name:text-is("${SUGGEST}")) .bucket-menu-btn`).click();
    await page.click('#bucket-context-menu button:has-text("Delete")');
    await page.locator(`.sidebar-item .bucket-name:text-is("${SUGGEST}")`).waitFor({ state: "detached", timeout: 10_000 });
  });

  // Rule 5 (SPEC §6.5): three Unsorted links about one topic, then the owner creates that bucket → on prod the real
  // agent moves them within 5 min; locally (no agent) the step stops at the bucket.
  await step(LOCAL ? "new bucket → re-sort dispatch (no agent locally)" : "new bucket → the agent moves the 3 matching Unsorted links (real session)", async () => {
    const topic = [
      ["EUDI Wallet: what the EU digital identity wallet will do", "The European Digital Identity Wallet (EUDI Wallet) lets every EU citizen store an eID, driving licence, diplomas and payment credentials on the phone and present them to public and private services under eIDAS 2.0. Member states must offer a wallet by the end of 2026; the Architecture and Reference Framework defines the formats and protocols."],
      ["eIDAS 2.0 implementing acts for the EUDI wallet adopted", "The European Commission adopted the implementing regulations that set the technical rules for the EU Digital Identity Wallet: person identification data, electronic attestations of attributes, wallet certification and the trust framework. Wallet providers and relying parties now build against these acts."],
      ["Large-scale pilots test the EUDI wallet across member states", "Four large-scale pilots (POTENTIAL, EWC, NOBID, DC4EU) tried the EU Digital Identity Wallet for travel, payments, education and e-health use cases. The pilots fed back into the Architecture and Reference Framework and the wallet reference implementation."],
    ];
    for (const [i, [title, text]] of topic.entries()) {
      await sql`insert into items (url, url_key, title, domain, page_text, status, sorted_by, sort_attempts)
                values (${`https://ec.europa.eu/eudi-${i}?pcflow=${RUN}`}, ${`ec.europa.eu/eudi-${i}?pcflow=${RUN}`}, ${title}, 'ec.europa.eu', ${text}, 'unsorted', 'agent', 1)`;
    }
    await page.reload({ waitUntil: "load" });
    const name = `EU digital identity (${BUCKET})`;
    await page.click("#new-bucket-btn");
    await page.fill("#new-bucket-input", name);
    await page.press("#new-bucket-input", "Enter");
    await page.locator(`.sidebar-item .bucket-name:text-is("${name}")`).waitFor({ timeout: 10_000 });
    if (!LOCAL) {
      for (let i = 0; i < 3; i++) {
        await card(page, `https://ec.europa.eu/eudi-${i}?pcflow=${RUN}`).locator(`.card-bucket:text-is("${name}")`).waitFor({ timeout: 5 * 60_000 });
      }
      await page.screenshot({ path: join(OUT, "1440-resorted.png") });
    }
    await page.locator(`.sidebar-item:has(.bucket-name:text-is("${name}"))`).hover();
    await page.locator(`div:has(> .sidebar-item .bucket-name:text-is("${name}")) .bucket-menu-btn`).click();
    await page.click('#bucket-context-menu button:has-text("Delete")');
    await page.locator(`.sidebar-item .bucket-name:text-is("${name}")`).waitFor({ state: "detached", timeout: 10_000 });
    await sql`delete from items where url like ${`https://ec.europa.eu/eudi-%?pcflow=${RUN}`}`;
    await page.reload({ waitUntil: "load" });
  });

  await step("suggestion Dismiss hides it and marks it dismissed", async () => {
    const [{ number }] = await sql`select number from items where url = ${TEST_URL}`;
    await sql`insert into bucket_suggestions (name, reason, item_numbers) values (${SUGGEST + "-d"}, 'Dismiss me.', ${[number]})`;
    await page.reload({ waitUntil: "load" });
    await page.locator(`#suggestion-strip:has-text("${SUGGEST}-d")`).waitFor({ timeout: 10_000 });
    await page.click("#suggestion-strip .suggestion-dismiss");
    await page.locator("#suggestion-strip").waitFor({ state: "detached", timeout: 5_000 });
    const [s] = await sql`select status from bucket_suggestions where name = ${SUGGEST + "-d"}`;
    expect(s.status === "dismissed", `suggestion status ${s.status}`);
    await page.reload({ waitUntil: "load" });
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
    expect((await page.locator("#suggestion-strip").count()) === 0, "dismissed suggestion came back");
  });

  await step("session expiry mid-use → login screen (Review focus 3)", async () => {
    await ctx.clearCookies();
    await page.fill("#url-input", `https://example.com/expired?pcflow=${RUN}`);
    await page.click("#add-btn");
    await page.locator("#auth-form").waitFor({ state: "visible", timeout: 10_000 });
    await login(page, true);
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
  });

  // Phase 4: the bookmarklet window. Logged in → saves and reports; the same link again → Already saved; logged out →
  // login form inside the popup, then it saves.
  await step("bookmarklet on a page → popup saves, reports Saved #N · sorting…, closes itself", async () => {
    // The real entry point: the javascript: href from /setup, run on a page whose URL carries the marker. The
    // bookmarklet always targets the public site, so locally it is rewritten to this server.
    await page.goto(`${BASE}/setup`, { waitUntil: "load" });
    const href = (await page.getAttribute("#bookmarklet", "href")).replace(SITE, BASE);
    await page.goto(`${BASE}/?pcflow=${RUN}&page=bookmarklet`, { waitUntil: "load" });
    const [popup] = await Promise.all([ctx.waitForEvent("page"), page.evaluate(href.slice("javascript:".length))]);
    await popup.locator("#add-status:has-text(\"Saved #\")").waitFor({ timeout: 20_000 });
    const text = await popup.locator("#add-status").innerText();
    expect(/^Saved #\d+ · sorting…$/.test(text), `status: ${text}`);
    await popup.screenshot({ path: join(OUT, "add-saved.png") });
    await popup.waitForEvent("close", { timeout: 5_000 });
    await page.goto(BASE, { waitUntil: "load" });
  });

  await step("/add with a saved link → Already saved as #N · <label>", async () => {
    const popup = await ctx.newPage();
    await popup.goto(`${BASE}/add?url=${encodeURIComponent(ADD_URL)}`, { waitUntil: "load" });
    await popup.locator("#add-status:has-text(\"Already saved as #\")").waitFor({ timeout: 20_000 });
    await popup.close();
  });

  await step("/add logged out → login form, then saves", async () => {
    const fresh = await browser.newContext({ viewport: { width: 420, height: 260 } });
    const popup = await fresh.newPage();
    await popup.goto(`${BASE}/add?url=${encodeURIComponent(ADD_URL)}`, { waitUntil: "load" });
    await popup.locator("#auth-form").waitFor({ timeout: 10_000 });
    await popup.screenshot({ path: join(OUT, "add-login.png") });
    await popup.fill("#password-input", process.env.APP_PASSWORD);
    await popup.click("#auth-btn");
    await popup.locator("#add-status:has-text(\"Already saved as #\")").waitFor({ timeout: 20_000 });
    await fresh.close();
  });

  await step("delete the link → Deleted toast", async () => {
    await card(page).hover();
    await card(page).locator(".delete-btn").click();
    await card(page).waitFor({ state: "detached", timeout: 10_000 });
    await toast(page, `Deleted #${number}`);
  });

  await step("/setup (via the header link): three sections, Copy buttons, bookmarklet, masked MCP command", async () => {
    await page.click('header a[href="/setup"]');
    for (const id of ["#iphone", "#desktop", "#claude-code"]) await page.locator(id).waitFor({ timeout: 10_000 });
    await page.click("#copy-save-url");
    expect((await page.evaluate(() => navigator.clipboard.readText())) === `${SITE}/api/save`, "save URL not copied");
    await page.click("#copy-key");
    expect((await page.evaluate(() => navigator.clipboard.readText())) === process.env.SHORTCUT_API_KEY, "key not copied");
    const shown = await page.locator("#mcp-command").innerText();
    expect(shown.includes("••••") && !shown.includes(process.env.MCP_TOKEN), "MCP token visible on the page");
    await page.click("#copy-mcp");
    const cmd = await page.evaluate(() => navigator.clipboard.readText());
    expect(cmd.startsWith("claude mcp add --scope user --transport http pocket ") && cmd.includes(process.env.MCP_TOKEN), "MCP command not copied in full");
    const href = await page.getAttribute("#bookmarklet", "href");
    expect(href?.startsWith("javascript:void(window.open(") && href.includes("/add?url="), `bookmarklet href: ${href?.slice(0, 40)}`);
    await page.screenshot({ path: join(OUT, "1440-setup.png") });
    await page.goto(BASE, { waitUntil: "load" });
    await page.locator("#url-input").waitFor({ timeout: 10_000 });
  });

  await step("logout locks the app, also after reload", async () => {
    await page.click("#logout-btn");
    await page.locator("#auth-form").waitFor({ state: "visible", timeout: 5_000 });
    await page.reload({ waitUntil: "load" });
    await page.locator("#auth-form").waitFor({ state: "visible", timeout: 10_000 });
  });
  await ctx.close();

  // ── Mobile 375 ────────────────────────────────────────────────
  console.log("375");
  const m = await newPage(375);

  await step("login form fits at 375; unremembered device gets a session cookie", async () => {
    await m.page.goto(BASE, { waitUntil: "load" });
    await m.page.locator("#auth-form").waitFor({ state: "visible", timeout: 15_000 });
    await m.page.screenshot({ path: join(OUT, "375-login.png") });
    await login(m.page, false);
    const c = (await m.ctx.cookies()).find((x) => x.name === "pc_session");
    expect(c && c.expires === -1, `expected a session cookie, got expires=${c?.expires}`);
  });

  await step("save on the phone → card shows #N and the bucket label on their own row", async () => {
    await m.page.fill("#url-input", MOBILE_URL);
    await m.page.click("#add-btn");
    await card(m.page, MOBILE_URL).waitFor({ state: "visible", timeout: 20_000 });
    if (LOCAL) {
      await sql`update items set status = 'unsorted', sorted_at = now() where url = ${MOBILE_URL}`;
      await m.page.reload({ waitUntil: "load" });
      await card(m.page, MOBILE_URL).waitFor({ state: "visible", timeout: 10_000 });
    }
    const c = card(m.page, MOBILE_URL);
    expect(await c.locator(".card-number").first().isVisible(), "#N hidden on the phone");
    expect(await c.locator(".card-bucket").first().isVisible(), "bucket label hidden on the phone");
    expect((await c.locator(".delete-btn").count()) === 0 || !(await c.locator(".delete-btn").isVisible()), "desktop delete icon shown on the phone");
    await m.page.screenshot({ path: join(OUT, "375-app.png") });
  });

  await step("no sideways scroll at 375", async () => {
    const w = await m.page.evaluate(() => document.documentElement.scrollWidth);
    expect(w <= 375, `page is ${w}px wide`);
  });

  await step("bucket sheet opens, filters to Unsorted, closes", async () => {
    await m.page.click("#mobile-filter-btn");
    await m.page.locator("#mobile-sheet[data-open]").waitFor({ timeout: 5_000 });
    await m.page.screenshot({ path: join(OUT, "375-sheet.png") });
    await m.page.click('#mobile-sheet .sheet-item:has-text("Unsorted")');
    await m.page.locator("#mobile-sheet[data-open]").waitFor({ state: "detached", timeout: 5_000 });
    expect((await m.page.locator("#mobile-filter-name").innerText()) === "Unsorted", "filter name did not change");
    await card(m.page, MOBILE_URL).waitFor({ state: "visible", timeout: 5_000 });
    await m.page.click("#mobile-filter-btn");
    await m.page.click("#mobile-sheet .sheet-close");
    await m.page.locator("#mobile-sheet[data-open]").waitFor({ state: "detached", timeout: 5_000 });
  });

  await step("suggestion on the phone: stacked buttons, Create opens the sheet pre-filled", async () => {
    const [{ number }] = await sql`select number from items where url = ${MOBILE_URL}`;
    await sql`insert into bucket_suggestions (name, reason, item_numbers) values (${SUGGEST + "-m"}, 'Phone test.', ${[number]})`;
    await m.page.reload({ waitUntil: "load" });
    await m.page.locator(`#suggestion-strip:has-text("${SUGGEST}-m")`).waitFor({ timeout: 10_000 });
    const [a, b] = await Promise.all([m.page.locator(".suggestion-create").boundingBox(), m.page.locator(".suggestion-dismiss").boundingBox()]);
    expect(a && b && b.y > a.y + a.height - 1, "buttons not stacked at 375");
    await m.page.screenshot({ path: join(OUT, "375-suggestion.png") });
    await m.page.click("#suggestion-strip .suggestion-create");
    await m.page.locator("#mobile-sheet[data-open] #sheet-new-bucket-input").waitFor({ timeout: 5_000 });
    expect((await m.page.inputValue("#sheet-new-bucket-input")) === `${SUGGEST}-m`, "sheet field not pre-filled");
    await m.page.press("#sheet-new-bucket-input", "Escape");
    await m.page.click("#mobile-sheet .sheet-close");
    await m.page.click("#suggestion-strip .suggestion-dismiss");
    await m.page.locator("#suggestion-strip").waitFor({ state: "detached", timeout: 5_000 });
  });

  await step("create and delete a bucket from the sheet", async () => {
    await m.page.click("#mobile-filter-btn");
    await m.page.click("#mobile-sheet #sheet-new-bucket-btn");
    await m.page.fill("#mobile-sheet #sheet-new-bucket-input", `${BUCKET}-m`);
    await m.page.press("#mobile-sheet #sheet-new-bucket-input", "Enter");
    const row = m.page.locator(`#mobile-sheet .sheet-item:has-text("${BUCKET}-m")`);
    await row.waitFor({ timeout: 10_000 });
    await m.page.locator(`#mobile-sheet div:has(> .sheet-item:has-text("${BUCKET}-m")) .bucket-menu-btn`).click();
    await m.page.click('#mobile-sheet [role="menu"] button:has-text("Delete")');
    await row.waitFor({ state: "detached", timeout: 10_000 });
    await m.page.click("#mobile-sheet .sheet-close");
  });

  await step("delete from the label menu on the phone", async () => {
    await card(m.page, MOBILE_URL).locator(".card-bucket-btn").first().click();
    await m.page.locator(".delete-option").click();
    await card(m.page, MOBILE_URL).waitFor({ state: "detached", timeout: 10_000 });
  });

  await step("/setup at 375: sections stack, no sideways scroll", async () => {
    await m.page.goto(`${BASE}/setup`, { waitUntil: "load" });
    await m.page.locator("#claude-code").waitFor({ timeout: 10_000 });
    const w = await m.page.evaluate(() => document.documentElement.scrollWidth);
    expect(w <= 375, `setup page is ${w}px wide`);
    await m.page.screenshot({ path: join(OUT, "375-setup.png") });
    await m.page.goto(BASE, { waitUntil: "load" });
    await m.page.locator("#url-input").waitFor({ timeout: 10_000 });
  });

  await step("logout at 375; /setup logged out shows the login form", async () => {
    await m.page.click("#logout-btn");
    await m.page.locator("#auth-form").waitFor({ state: "visible", timeout: 5_000 });
    await m.page.goto(`${BASE}/setup`, { waitUntil: "load" });
    await m.page.locator("#auth-form").waitFor({ state: "visible", timeout: 10_000 });
    expect((await m.page.locator("#shortcut-key").count()) === 0, "key rendered while logged out");
  });
  await m.ctx.close();

  // ── Desktop 1920 ──────────────────────────────────────────────
  console.log("1920");
  const w = await newPage(1920);
  await step("1920: centred 1400px composition with the sidebar", async () => {
    await w.page.goto(BASE, { waitUntil: "load" });
    await w.page.locator("#auth-form").waitFor({ state: "visible", timeout: 15_000 });
    await login(w.page, true);
    const box = await w.page.evaluate(() => {
      const r = document.querySelector("main").parentElement.getBoundingClientRect();
      return { left: r.left, width: r.width, sidebar: !!document.querySelector("aside .sidebar-item")?.offsetParent };
    });
    expect(box.width <= 1400 && box.width > 1200, `content width ${box.width}px`);
    expect(box.left > 200, `content starts at ${box.left}px, not centred`);
    expect(box.sidebar, "sidebar hidden at 1920");
    await w.page.screenshot({ path: join(OUT, "1920-app.png") });
    await w.page.goto(`${BASE}/setup`, { waitUntil: "load" });
    await w.page.locator("#claude-code").waitFor({ timeout: 10_000 });
    expect(await w.page.locator('nav[aria-label="Sections"]').isVisible(), "setup rail hidden at 1920");
    await w.page.screenshot({ path: join(OUT, "1920-setup.png") });
    await w.page.goto(BASE, { waitUntil: "load" });
    await w.page.locator("#logout-btn").waitFor({ timeout: 10_000 });
    await w.page.click("#logout-btn");
    await w.page.locator("#auth-form").waitFor({ state: "visible", timeout: 5_000 });
  });
  await w.ctx.close();

  await step("no console errors", async () => {
    expect(consoleErrors.length === 0, consoleErrors.join(" | "));
  });
} finally {
  await browser.close();
  // Backstop: remove anything this run left behind.
  await sql`delete from items where url like ${"%pcflow=" + RUN + "%"}`;
  await sql`delete from buckets where name like ${"%" + BUCKET + "%"}`;
  await sql`delete from bucket_suggestions where name like ${"%" + BUCKET + "%"}`;
  await sql`delete from login_failures where created_at >= ${runStart}::timestamp`;
}

console.log(`\n${passed} passed, ${failures.length} failed${failures.length ? `\n  - ${failures.join("\n  - ")}` : ""}\nScreenshots: ${OUT}`);
process.exit(failures.length ? 1 : 0);
