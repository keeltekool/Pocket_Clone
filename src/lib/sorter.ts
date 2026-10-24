import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import ids from "../../agent/ids.json";

// Dispatch to the Managed Agent `pocket-sorter` (SPEC §7.3). The server never holds the event stream: the agent
// writes its result through /api/mcp (pocket_file_item), and the UI polls for the change.
const STUCK_MINUTES = 10;
const MAX_ATTEMPTS = 2;
const BUDGET_CENTS = "100"; // $1 per session, hard cap at list prices

let client: Anthropic | undefined;
// Short timeout: a stalled session create must not hold the save or bucket-create request (the stuck rule covers it).
const anthropic = () => (client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 }));

async function startSession(title: string, message: string): Promise<string | null> {
  try {
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
  } catch (e) {
    console.error(`session "${title}" failed:`, e);
    return null;
  }
}

const sortSession = (number: number) => startSession(`sort #${number}`, `Sort item #${number}.`);

// One session per save. A failed dispatch still counts as an attempt: the stuck rule retries once, then the item becomes
// Unsorted (SPEC §6.4). The item's status is left alone: the agent may have filed it before this update lands.
export async function dispatchSort(number: number): Promise<void> {
  const sessionId = await sortSession(number);
  await db
    .update(items)
    .set({ sortSessionId: sessionId ?? undefined, sortAttempts: sql`${items.sortAttempts} + 1` })
    .where(eq(items.number, number));
}

// Bucket created by the owner (SPEC §6.5): the agent checks every Unsorted link against the new bucket only.
export async function dispatchBucketCreated(name: string): Promise<void> {
  await startSession(`bucket "${name}"`, `Bucket "${name}" was created. Move the Unsorted links that belong in it.`);
}

// Stuck items (SPEC §6.4), run whenever the main list is rendered or fetched: still `sorting` 10 min after the last
// dispatch → dispatch again while attempts < 2, otherwise Unsorted. No cron, no error UI. The claim is one UPDATE
// (attempts bumped in the same statement), so two devices loading at once start one session, not two. The cutoff is
// computed in SQL: a JS Date in an untyped comparison goes out in local time and a timestamp column drops the offset.
export async function retryStuck(): Promise<void> {
  const overdue = and(eq(items.status, "sorting"), lt(sql`${items.createdAt} + ${items.sortAttempts} * ${sql.raw(`interval '${STUCK_MINUTES} minutes'`)}`, sql`now()`));
  // Out of attempts first (a just-claimed item must not be flipped in the same pass). sortedAt is bumped so an open
  // page's changedSince poll picks the change up and stops.
  await db.update(items).set({ status: "unsorted", sortedAt: new Date() }).where(and(overdue, gte(items.sortAttempts, MAX_ATTEMPTS)));
  const claimed = await db
    .update(items)
    .set({ sortAttempts: sql`${items.sortAttempts} + 1` })
    .where(and(overdue, lt(items.sortAttempts, MAX_ATTEMPTS)))
    .returning({ number: items.number });
  for (const { number } of claimed) {
    const sessionId = await sortSession(number);
    if (sessionId) await db.update(items).set({ sortSessionId: sessionId }).where(eq(items.number, number));
  }
}
