// Real MCP calls over Streamable HTTP against /api/mcp (plan Task 2.1): 401 without the token, initialize, then every
// tool. Writes only marker rows (?pcflow=<run>, pcflow-<run>) and removes them in `finally`.
//   node scripts/check-mcp.mjs [baseUrl]        (default http://localhost:3100)
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const RUN = Date.now().toString(36);
const URL_A = `https://www.dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust?pcflow=${RUN}`;
const SUGGEST = `pcflow-${RUN}`;

let id = 0;
async function rpc(method, params, token = process.env.MCP_TOKEN) {
  const r = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  if (r.status === 401) return { status: 401 };
  const raw = await r.text();
  // Streamable HTTP answers either plain JSON or an SSE stream with the JSON in `data:` lines.
  const line = raw.trim().startsWith("{") ? raw : raw.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).pop();
  return { status: r.status, body: JSON.parse(line) };
}
const call = async (name, args) => {
  const { body } = await rpc("tools/call", { name, arguments: args });
  assert.ok(!body.error, `${name}: ${JSON.stringify(body.error)}`);
  const text = body.result.content?.[0]?.text;
  return { isError: !!body.result.isError, data: text ? JSON.parse(text) : null };
};
let n = 0;
const ok = (label) => console.log(`  ✓ ${++n} ${label}`);

try {
  assert.equal((await rpc("initialize", {}, null)).status, 401);
  assert.equal((await rpc("initialize", {}, "wrong-token")).status, 401);
  ok("no / wrong bearer → 401");

  const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check-mcp", version: "1" } });
  assert.equal(init.body.result?.serverInfo?.name, "pocket", JSON.stringify(init.body).slice(0, 200));
  const tools = (await rpc("tools/list", {})).body.result.tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ["pocket_file_item", "pocket_get_item", "pocket_list", "pocket_list_buckets", "pocket_search", "pocket_suggest_bucket"]);
  ok("initialize → server pocket; 6 tools listed");

  // A marker item saved through the Shortcut endpoint (no session needed), settled as Unsorted.
  const saved = await fetch(`${BASE}/api/save`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.SHORTCUT_API_KEY }, body: JSON.stringify({ url: URL_A }) }).then((r) => r.json());
  const number = saved.number;
  assert.ok(number > 0, JSON.stringify(saved));
  // On the deployed app the real agent sorts this save; let it finish before the tool is driven by hand.
  if (!/localhost|127\.0\.0\.1/.test(BASE)) {
    for (let i = 0; i < 150; i++) {
      const [row] = await sql`select status from items where number = ${number}`;
      if (row.status !== "sorting") break;
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  await sql`update items set status = 'unsorted', bucket_id = null, sorted_by = 'agent', sorted_at = now() where number = ${number}`;

  const got = (await call("pocket_get_item", { item: `#${number}`, maxChars: 20_000 })).data;
  assert.ok(/digitempl/i.test(got.title) && got.pageText.length > 1000 && got.bucket === "Unsorted", JSON.stringify(got).slice(0, 200));
  assert.equal((await call("pocket_get_item", { item: URL_A })).data.number, number);
  assert.equal((await call("pocket_get_item", { item: "#999999999" })).isError, true);
  ok(`pocket_get_item by #, by URL, not found (#${number}, ${got.pageText.length} chars)`);

  const found = (await call("pocket_search", { query: `pcflow=${RUN}` })).data.items;
  assert.ok(found.length === 1 && found[0].number === number);
  ok("pocket_search");

  const unsorted = (await call("pocket_list", { bucket: "unsorted", limit: 100 })).data.items;
  assert.ok(unsorted.some((i) => i.number === number));
  assert.equal((await call("pocket_list", { bucket: "no-such-bucket" })).isError, true);
  ok("pocket_list unsorted; unknown bucket → error");

  const lb = (await call("pocket_list_buckets", {})).data;
  assert.ok(lb.buckets.length >= 8 && lb.buckets[0].name === "AI & Claude" && Array.isArray(lb.buckets[0].recentTitles) && typeof lb.unsortedCount === "number");
  ok(`pocket_list_buckets (${lb.buckets.length} buckets, unsorted ${lb.unsortedCount})`);

  const filed = (await call("pocket_file_item", { number, bucket: "esign & eid" })).data;
  assert.equal(filed.bucket, "eSign & eID");
  const [row] = await sql`select status, sorted_by from items where number = ${number}`;
  assert.ok(row.status === "sorted" && row.sorted_by === "agent", JSON.stringify(row));
  assert.equal((await call("pocket_file_item", { number, bucket: "Nope" })).isError, true);
  const again = await call("pocket_file_item", { number, bucket: "Jobs" });
  assert.ok(again.isError && again.data.error === "already_filed", "a link already in a bucket must not be re-filed");
  await sql`update items set status = 'unsorted', bucket_id = null where number = ${number}`;
  const back = (await call("pocket_file_item", { number, bucket: "unsorted" })).data;
  assert.equal(back.bucket, "Unsorted");
  ok("pocket_file_item: case-insensitive bucket, unknown bucket refused, filed link not re-filed, unsorted ok");

  await sql`update items set sorted_by = 'owner' where number = ${number}`;
  const refused = await call("pocket_file_item", { number, bucket: "Jobs" });
  assert.ok(refused.isError && refused.data.error === "owner_filed");
  ok("owner-moved item is refused (Review focus 4)");

  const s = (await call("pocket_suggest_bucket", { name: SUGGEST, reason: "Three unsorted links are about the same test topic.", itemNumbers: [number] })).data;
  assert.ok(s.suggestionId);
  assert.equal((await call("pocket_suggest_bucket", { name: SUGGEST.toUpperCase(), reason: "again and again", itemNumbers: [number] })).data.error, "already_suggested");
  assert.equal((await call("pocket_suggest_bucket", { name: "Jobs", reason: "exists already", itemNumbers: [number] })).data.error, "bucket_exists");
  const lb2 = (await call("pocket_list_buckets", {})).data;
  assert.ok(lb2.suggestions.open.includes(SUGGEST));
  ok("pocket_suggest_bucket: created, duplicate refused, existing bucket refused, listed as open");
  console.log(`\ncheck-mcp: ${n} steps passed`);
} finally {
  await sql`delete from items where url like ${"%pcflow=" + RUN + "%"}`;
  await sql`delete from bucket_suggestions where name like ${SUGGEST + "%"}`;
}
