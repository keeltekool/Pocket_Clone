// Real-agent proof on the deployed app (plan Task 2.3): saves three links through /api/save (as the iPhone Shortcut
// does), waits for pocket-sorter to file each, prints the bucket and the session's list cost, pulls one link into
// Claude Code with `claude -p "pocket #N"`, then deletes the rows. Marker rows only (?pcflow=<run>).
//   node scripts/check-agent.mjs [baseUrl]        (default https://pocket-clone-virid.vercel.app)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";

process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);
const client = new Anthropic();
const BASE = (process.argv[2] ?? "https://pocket-clone-virid.vercel.app").replace(/\/$/, "");
const RUN = Date.now().toString(36);
const LINKS = [
  ["https://www.dokobit.com/et/blog/kuidas-kasutada-digitemplit-naited-reaalsest-elust", "eSign & eID"],
  ["https://www.workinestonia.com/jobs/", "Jobs"],
  ["https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/", "Unsorted"],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const costOf = (usage) => usage?.list_cost?.amount ? `$${(Number(usage.list_cost.amount) / 100).toFixed(2)}` : JSON.stringify(usage);

const saved = [];
try {
  for (const [url, expected] of LINKS) {
    const r = await fetch(`${BASE}/api/save`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.SHORTCUT_API_KEY }, body: JSON.stringify({ url: `${url}?pcflow=${RUN}` }) });
    const body = await r.json();
    if (r.status !== 201) throw new Error(`save ${url} → ${r.status} ${JSON.stringify(body)}`);
    saved.push({ number: body.number, url, expected, started: Date.now() });
    console.log(`saved #${body.number} ${url}`);
  }

  for (const s of saved) {
    let row;
    for (let i = 0; i < 150; i++) {
      [row] = await sql`select i.status, i.sort_session_id, i.sort_attempts, b.name as bucket from items i left join buckets b on b.id = i.bucket_id where i.number = ${s.number}`;
      if (row.status !== "sorting") break;
      await sleep(2_000);
    }
    const label = row.status === "sorting" ? "STILL SORTING" : (row.bucket ?? "Unsorted");
    const secs = Math.round((Date.now() - s.started) / 1000);
    let cost = "no session";
    if (row.sort_session_id) {
      const session = await client.beta.sessions.retrieve(row.sort_session_id);
      cost = costOf(session.usage);
      s.cost = session.usage?.list_cost?.amount ? Number(session.usage.list_cost.amount) / 100 : null;
    }
    console.log(`  #${s.number} → ${label} (expected ${s.expected}) in ${secs}s · attempts ${row.sort_attempts} · session cost ${cost}`);
    s.label = label;
  }

  const first = saved[0];
  const exe = join(process.env.APPDATA ?? "", "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
  const cc = spawnSync(existsSync(exe) ? exe : "claude", ["-p", `Use the pocket MCP tool to fetch pocket #${first.number} and reply with exactly its title and its bucket, nothing else.`, "--allowedTools", "mcp__pocket__pocket_get_item"], { encoding: "utf8", timeout: 180_000 });
  console.log(`\nclaude -p "pocket #${first.number}" →`, (cc.stdout || cc.stderr).trim().slice(0, 300));

  const costs = saved.map((s) => s.cost).filter((c) => c != null);
  if (costs.length) console.log(`\ncost per sort: ${costs.map((c) => `$${c.toFixed(2)}`).join(", ")} · average $${(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(2)}`);
  const ok = saved.every((s) => s.label !== "STILL SORTING");
  console.log(ok ? "\ncheck-agent: every link was filed" : "\ncheck-agent: a link is still sorting after 5 min");
  process.exitCode = ok ? 0 : 1;
} finally {
  await sql`delete from items where url like ${"%pcflow=" + RUN + "%"}`;
  await sql`delete from bucket_suggestions where ${RUN} = any(select unnest(string_to_array('', ',')))`;
}
