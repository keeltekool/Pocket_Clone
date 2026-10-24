// Backend proof over real HTTP (plan Task 1.5): login cookie, save, duplicate under www/utm/fragment, invalid input,
// buckets (409 on a case-insensitive duplicate), move, filters, search, rename, delete bucket → Unsorted, delete link.
//   node scripts/check-api.mjs [baseUrl]        (default http://localhost:3100)
// Every row it writes carries the ?pcflow=<run> marker / pcflow-<run> name and is removed in `finally`.
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const RUN = Date.now().toString(36);
const URL_A = `https://en.wikipedia.org/wiki/Bookmark_(digital)?pcflow=${RUN}`;
const URL_DUP = `https://www.en.wikipedia.org/wiki/Bookmark_(digital)/?utm_source=a&pcflow=${RUN}#top`;
const BUCKET = `pcflow-${RUN}`;

let cookie = "";
const api = async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { "content-type": "application/json", cookie, ...(init.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body, headers: r.headers };
};
const json = (data) => ({ body: JSON.stringify(data) });
let n = 0;
const ok = (label) => console.log(`  ✓ ${++n} ${label}`);

try {
  assert.equal((await api("/api/items")).status, 401);
  ok("no cookie → 401");

  const login = await api("/api/auth", { method: "POST", ...json({ password: process.env.APP_PASSWORD, remember: true }) });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.ok(/Max-Age=15552000/.test(login.headers.get("set-cookie")), "180-day cookie");
  ok("login → 180-day cookie");

  const saved = await api("/api/items", { method: "POST", ...json({ url: URL_A }) });
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
  const item = saved.body.item;
  assert.ok(item.number > 0 && item.status === "unsorted" && item.bucket === null && item.title !== URL_A, JSON.stringify(item));
  assert.equal(item.domain, "en.wikipedia.org");
  ok(`save → 201 #${item.number} "${item.title}"`);

  const dup = await api("/api/items", { method: "POST", ...json({ url: URL_DUP }) });
  assert.equal(dup.status, 200);
  assert.ok(dup.body.duplicate === true && dup.body.item.number === item.number, JSON.stringify(dup.body));
  ok("same link under www/utm/fragment/slash → duplicate");

  const bad = await api("/api/items", { method: "POST", ...json({ url: "not a link" }) });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, "That doesn't look like a link.");
  ok("invalid input → 400");

  let counts = await api("/api/buckets");
  assert.equal(counts.body.buckets.length >= 8, true);
  assert.equal(counts.body.buckets[0].name, "AI & Claude", "seed order");
  assert.ok(counts.body.total >= 1 && counts.body.unsortedCount >= 1);
  ok(`buckets → ${counts.body.buckets.length} buckets, total ${counts.body.total}, unsorted ${counts.body.unsortedCount}`);

  const created = await api("/api/buckets", { method: "POST", ...json({ name: BUCKET }) });
  assert.equal(created.status, 201);
  const bucket = created.body.bucket;
  assert.equal((await api("/api/buckets", { method: "POST", ...json({ name: BUCKET.toUpperCase() }) })).status, 409);
  ok("create bucket → 201; same name in caps → 409");

  const moved = await api(`/api/items/${item.id}`, { method: "PATCH", ...json({ bucketId: bucket.id }) });
  assert.equal(moved.status, 200);
  assert.ok(moved.body.item.bucket?.name === BUCKET && moved.body.item.status === "sorted" && moved.body.item.sortedBy === "owner", JSON.stringify(moved.body));
  ok("move → sorted by owner");

  const inBucket = (await api(`/api/items?bucket=${bucket.id}`)).body.items;
  assert.ok(inBucket.some((i) => i.id === item.id) && inBucket.every((i) => i.bucket?.id === bucket.id));
  const unsorted = (await api("/api/items?bucket=unsorted")).body.items;
  assert.ok(!unsorted.some((i) => i.id === item.id));
  ok("bucket filter shows it, Unsorted does not");

  const hit = (await api(`/api/items?q=pcflow%3D${RUN}`)).body.items;
  assert.ok(hit.length === 1 && hit[0].id === item.id, "search by url");
  const page = (await api("/api/items?q=bookmark")).body.items;
  assert.ok(page.some((i) => i.id === item.id), "search by title/page text");
  assert.equal((await api("/api/items?q=zzzzqqqq-nothing")).body.items.length, 0);
  ok("search: url hit, text hit, no hit");

  const since = new Date(Date.now() - 60_000).toISOString();
  assert.ok((await api(`/api/items?changedSince=${encodeURIComponent(since)}`)).body.items.some((i) => i.id === item.id));
  ok("changedSince returns the fresh item");

  const renamed = await api(`/api/buckets/${bucket.id}`, { method: "PATCH", ...json({ name: `${BUCKET}-renamed` }) });
  assert.equal(renamed.body.bucket.name, `${BUCKET}-renamed`);
  ok("rename bucket");

  assert.equal((await api(`/api/buckets/${bucket.id}`, { method: "DELETE" })).status, 200);
  const after = (await api("/api/items?bucket=unsorted")).body.items.find((i) => i.id === item.id);
  assert.ok(after && after.bucket === null && after.status === "unsorted", JSON.stringify(after));
  ok("delete bucket → its link is Unsorted");

  assert.equal((await api(`/api/items/${item.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api(`/api/items/${item.id}`, { method: "DELETE" })).status, 404);
  assert.ok(!(await api("/api/items")).body.items.some((i) => i.id === item.id));
  ok("delete link → gone, second delete 404");

  const out = await api("/api/auth", { method: "DELETE" });
  assert.ok(/Max-Age=0/.test(out.headers.get("set-cookie")));
  ok("logout clears the cookie");
  console.log(`\ncheck-api: ${n} steps passed`);
} finally {
  await sql`delete from items where url like ${"%pcflow=" + RUN + "%"}`;
  await sql`delete from buckets where name like ${BUCKET + "%"}`;
}
