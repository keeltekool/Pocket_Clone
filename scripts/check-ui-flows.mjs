// Click-through of Pocket Clone's user flows (CLAUDE.md §2).
//   node scripts/check-ui-flows.mjs [baseUrl]        (default https://pocket-clone-virid.vercel.app)
// 1440 then 375. Logs in with APP_PASSWORD from .env.local. The owner's rows are only read: every link this script
// saves carries ?pcflow=<run>, every bucket it makes is named pcflow-<run>, and the AI may add one bucket. All of
// those are deleted at the end (UI first, then a DB sweep as backstop). Screenshots → %TEMP%/pocket-clone-flows/.
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
const BUCKET = `pcflow-${RUN}`;
const RENAMED = `${BUCKET}-renamed`;
const bucketsBefore = new Set((await sql`select id from buckets where user_id = 'owner'`).map((r) => r.id));
// login_failures rows from this run are removed at the end. Kept as DB text: a JS Date goes out with the local +03:00
// offset, which a timestamp-without-zone column drops, shifting the cutoff three hours ahead.
const [{ runStart }] = await sql`select now()::timestamp::text as "runStart"`;

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

async function newPage(width) {
  const ctx = await browser.newContext(
    width < 500 ? { viewport: { width, height: 812 }, isMobile: true, hasTouch: true } : { viewport: { width, height: 900 } },
  );
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${width}: ${m.text().slice(0, 200)}`); });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? RENAMED : undefined));
  return { ctx, page };
}

async function login(page, remember) {
  await page.fill("#password-input", process.env.APP_PASSWORD);
  if (!remember) await page.uncheck("#remember-input");
  await page.click("#auth-btn");
  await page.locator("#main-section").waitFor({ state: "visible", timeout: 10_000 });
}

const card = (page) => page.locator(`.link-card:has(a[href="${TEST_URL}"])`);

try {
  // ── Desktop 1440 ──────────────────────────────────────────────
  console.log("1440");
  const { ctx, page } = await newPage(1440);

  await step("logged out: password form renders", async () => {
    await page.goto(BASE, { waitUntil: "load" });
    await page.locator("#auth-form").waitFor({ state: "visible", timeout: 10_000 });
    expect(await page.locator("#main-section").isHidden(), "main app visible while logged out");
    await page.screenshot({ path: join(OUT, "1440-login.png") });
  });

  await step("API refuses requests without a session", async () => {
    const r = await page.request.get(`${BASE}/api/links`, { headers: { cookie: "" } });
    expect(r.status() === 401, `GET /api/links → ${r.status()}`);
  });

  await step("wrong password shows an error and stays locked", async () => {
    const before = consoleErrors.length;
    await page.fill("#password-input", "definitely-wrong");
    await page.click("#auth-btn");
    await page.locator("#auth-error").waitFor({ state: "visible", timeout: 5_000 });
    expect(await page.locator("#main-section").isHidden(), "unlocked with a wrong password");
    // The browser logs the deliberate 401 as a console error; drop exactly that, keep anything else.
    const added = consoleErrors.splice(before);
    consoleErrors.push(...added.filter((e) => !e.includes("status of 401")));
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
    expect(c.httpOnly && c.secure, "cookie not HttpOnly+Secure");
    const days = (c.expires * 1000 - Date.now()) / 86_400_000;
    expect(days > 179 && days < 181, `cookie lasts ${days.toFixed(1)} days`);
    await page.screenshot({ path: join(OUT, "1440-app.png") });
  });

  await step("save a link → card appears", async () => {
    await page.fill("#url-input", TEST_URL);
    await page.click("#add-btn");
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
  });

  await step("server fetches the page title", async () => {
    await page.waitForFunction(
      (u) => { const t = document.querySelector(`.link-card a[href="${u}"] .card-title`)?.textContent; return t && t !== u; },
      TEST_URL, { timeout: 20_000 },
    );
  });

  await step("AI files the link into a bucket", async () => {
    await page.waitForFunction(
      (u) => { const c = [...document.querySelectorAll(".link-card")].find((x) => x.querySelector(`a[href="${u}"]`)); const t = c?.querySelector(".bucket-dropdown-text")?.textContent.trim(); return t && t !== "No bucket"; },
      TEST_URL, { timeout: 30_000 },
    );
  });

  await step("reload keeps the session and the link", async () => {
    await page.reload({ waitUntil: "load" });
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
  });

  await step("create a bucket from the sidebar", async () => {
    await page.click(".new-bucket-btn");
    await page.fill("#new-bucket-input", BUCKET);
    await page.press("#new-bucket-input", "Enter");
    await page.locator(`.bucket-item .bucket-name:text-is("${BUCKET}")`).waitFor({ timeout: 10_000 });
  });

  await step("move the link into it from the card menu", async () => {
    await card(page).locator(".bucket-dropdown-btn").click();
    await card(page).locator(`.bucket-option:text-is("${BUCKET}")`).click();
    await card(page).locator(`.bucket-dropdown-text:text-is("${BUCKET}")`).waitFor({ timeout: 10_000 });
  });

  await step("filter by the bucket shows the link", async () => {
    await page.click(`.bucket-item .bucket-name:text-is("${BUCKET}")`);
    await card(page).waitFor({ state: "visible", timeout: 10_000 });
    expect((await page.locator(".link-card").count()) === 1, "bucket view shows other links");
  });

  // Rename + delete from the All Links view: the card's label must follow without a reload.
  await step("rename the bucket → card label follows", async () => {
    await page.click('.bucket-item .bucket-name:text-is("All Links")');
    await page.locator(`.bucket-item:has(.bucket-name:text-is("${BUCKET}")) .bucket-menu-btn`).click();
    await page.click('#bucket-context-menu button:has-text("Rename")');
    await page.locator(`.bucket-item .bucket-name:text-is("${RENAMED}")`).waitFor({ timeout: 10_000 });
    await card(page).locator(`.bucket-dropdown-text:text-is("${RENAMED}")`).waitFor({ timeout: 5_000 });
  });

  await step("delete the bucket → card shows No bucket", async () => {
    await page.locator(`.bucket-item:has(.bucket-name:text-is("${RENAMED}")) .bucket-menu-btn`).click();
    await page.click('#bucket-context-menu button:has-text("Delete")');
    await page.locator(`.bucket-item .bucket-name:text-is("${RENAMED}")`).waitFor({ state: "detached", timeout: 10_000 });
    await card(page).locator('.bucket-dropdown-text:text-is("No bucket")').waitFor({ timeout: 5_000 });
  });

  await step("delete the link", async () => {
    await card(page).locator(".delete-btn").click();
    await card(page).waitFor({ state: "detached", timeout: 10_000 });
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
    await m.page.locator("#auth-form").waitFor({ state: "visible", timeout: 10_000 });
    await m.page.screenshot({ path: join(OUT, "375-login.png") });
    await login(m.page, false);
    const c = (await m.ctx.cookies()).find((x) => x.name === "pc_session");
    expect(c && c.expires === -1, `expected a session cookie, got expires=${c?.expires}`);
  });

  await step("no sideways scroll at 375", async () => {
    const w = await m.page.evaluate(() => document.documentElement.scrollWidth);
    expect(w <= 375, `page is ${w}px wide`);
    await m.page.screenshot({ path: join(OUT, "375-app.png") });
  });

  await step("mobile bucket sheet opens and closes", async () => {
    await m.page.click("#mobile-filter-btn");
    await m.page.locator("#mobile-bucket-sheet.open").waitFor({ timeout: 5_000 });
    await m.page.click("#mobile-bucket-sheet .sheet-close");
    await m.page.locator("#mobile-bucket-sheet.open").waitFor({ state: "detached", timeout: 5_000 });
  });

  await step("logout at 375", async () => {
    await m.page.click("#logout-btn");
    await m.page.locator("#auth-form").waitFor({ state: "visible", timeout: 5_000 });
  });
  await m.ctx.close();

  await step("no console errors", async () => {
    expect(consoleErrors.length === 0, consoleErrors.join(" | "));
  });
} finally {
  await browser.close();
  // Backstop: remove anything this run left behind (test links, test buckets, empty buckets the AI created)
  await sql`delete from links where user_id = 'owner' and url like ${"%pcflow=" + RUN}`;
  await sql`delete from login_failures where created_at >= ${runStart}::timestamp`;
  const after = await sql`select b.id, b.name, count(l.id)::int n from buckets b left join links l on l.bucket_id = b.id where b.user_id = 'owner' group by b.id`;
  for (const b of after) {
    if (!bucketsBefore.has(b.id) && (b.name.startsWith(BUCKET) || b.n === 0)) await sql`delete from buckets where id = ${b.id}`;
  }
}

console.log(`\n${passed} passed, ${failures.length} failed${failures.length ? `\n  - ${failures.join("\n  - ")}` : ""}\nScreenshots: ${OUT}`);
process.exit(failures.length ? 1 : 0);
