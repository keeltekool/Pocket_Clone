import Anthropic from "@anthropic-ai/sdk";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import ids from "../../agent/ids.json";

// Dispatch to the Managed Agent `pocket-sorter` (SPEC §7.3). The server never holds the event stream: the agent
// writes its result through /api/mcp (pocket_file_item), and the UI polls for the change.
const STUCK_MS = 10 * 60_000;
const MAX_ATTEMPTS = 2;
const BUDGET_CENTS = "100"; // $1 per session, hard cap at list prices

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic());

async function startSession(title: string, message: string): Promise<string> {
  // Local runs (`POCKET_AGENT=off` in .env.local): the agent can only reach the deployed /api/mcp, so no session is
  // started; the item counts a failed attempt and the stuck rule turns it Unsorted.
  if (process.env.POCKET_AGENT === "off") throw new Error("POCKET_AGENT=off");
  const session = await anthropic().beta.sessions.create({
    agent: ids.agent_id,
    environment_id: ids.environment_id,
    vault_ids: [ids.vault_id],
    title,
    budget: { type: "limit", max_list_cost: { amount: BUDGET_CENTS, currency: "USD" } },
    initial_events: [{ type: "user.message", content: [{ type: "text", text: message }] }],
  });
  return session.id;
}

// One session per save (or stuck retry). A failed dispatch still counts as an attempt: the stuck rule retries once,
// then the item becomes Unsorted (SPEC §6.4). Never throws into the save path.
export async function dispatchSort(number: number): Promise<void> {
  let sessionId: string | null = null;
  try {
    sessionId = await startSession(`sort #${number}`, `Sort item #${number}.`);
  } catch (e) {
    console.error(`dispatchSort #${number} failed:`, e);
  }
  await db
    .update(items)
    .set({ status: "sorting", sortSessionId: sessionId ?? undefined, sortAttempts: sql`${items.sortAttempts} + 1` })
    .where(eq(items.number, number));
}

// Bucket created by the owner (SPEC §6.5): the agent checks every Unsorted link against the new bucket only.
export async function dispatchBucketCreated(name: string): Promise<void> {
  try {
    await startSession(`bucket "${name}"`, `Bucket "${name}" was created. Move the Unsorted links that belong in it.`);
  } catch (e) {
    console.error(`dispatchBucketCreated "${name}" failed:`, e);
  }
}

// Stuck items (SPEC §6.4), run when the main list loads: still `sorting` 10 min after its last dispatch → dispatch
// again while attempts < 2, otherwise Unsorted. No cron, no error UI. The cutoff is computed in SQL: a JS Date in an
// untyped comparison goes out in local time and a timestamp column drops the offset (3 h early on this machine).
export async function retryStuck(): Promise<void> {
  const stuck = await db
    .select({ number: items.number, attempts: items.sortAttempts })
    .from(items)
    .where(and(eq(items.status, "sorting"), lt(sql`${items.createdAt} + ${items.sortAttempts} * ${sql.raw(`interval '${STUCK_MS / 60_000} minutes'`)}`, sql`now()`)));
  for (const s of stuck) {
    if (s.attempts < MAX_ATTEMPTS) await dispatchSort(s.number);
    else await db.update(items).set({ status: "unsorted" }).where(eq(items.number, s.number));
  }
}
