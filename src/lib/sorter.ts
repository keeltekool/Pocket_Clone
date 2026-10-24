import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import ids from "../../agent/ids.json";

// Dispatch to the Managed Agent `pocket-sorter` (SPEC §7.3). The server never holds the event stream: the agent
// writes its result through /api/mcp (pocket_file_item), and the UI polls for the change. Sessions are started after
// the response (`after()`), so a slow Anthropic API never holds a save, a bucket create or the main page.
const STUCK_MINUTES = 10;
const MAX_ATTEMPTS = 2;
const BUDGET_CENTS = "100"; // $1 per session, hard cap at list prices

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 }));

async function startSession(title: string, message: string): Promise<string | null> {
  // Local runs (`POCKET_AGENT=off` in .env.local): the agent can only reach the deployed /api/mcp, so no session is
  // started; the counted attempt then goes stale and the stuck rule turns the item Unsorted.
  if (process.env.POCKET_AGENT === "off") return null;
  try {
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

async function sortSession(number: number) {
  const sessionId = await startSession(`sort #${number}`, `Sort item #${number}.`);
  if (sessionId) await db.update(items).set({ sortSessionId: sessionId }).where(eq(items.number, number));
}

// One session per save; the save already counted and timed the attempt (sortAttempts 1, sortedAt now).
export const dispatchSort = (number: number) => after(() => sortSession(number));

// Bucket created by the owner (SPEC §6.5): the agent checks every Unsorted link against the new bucket only.
export const dispatchBucketCreated = (name: string) =>
  after(() => startSession(`bucket "${name}"`, `Bucket "${name}" was created. Move the Unsorted links that belong in it.`));

// Stuck items (SPEC §6.4), run whenever the main list is rendered or fetched: still `sorting` 10 min after the last
// dispatch (sortedAt) → dispatch again while attempts < 2, otherwise Unsorted. No cron, no error UI. One batch (one
// round trip): out-of-attempts items flip first, then the rest are claimed in a single UPDATE that bumps attempts and
// time, so two devices loading at once start one session, not two. Cutoffs are computed in SQL: a JS Date in an
// untyped comparison goes out in local time. sortedAt is bumped so an open page's poll sees the change.
export async function retryStuck(): Promise<void> {
  const overdue = and(
    eq(items.status, "sorting"),
    lt(sql`coalesce(${items.sortedAt}, ${items.createdAt}) + ${sql.raw(`interval '${STUCK_MINUTES} minutes'`)}`, sql`now()`),
  );
  const [, claimed] = await db.batch([
    db.update(items).set({ status: "unsorted", sortedAt: sql`now()` }).where(and(overdue, gte(items.sortAttempts, MAX_ATTEMPTS))),
    db
      .update(items)
      .set({ sortAttempts: sql`${items.sortAttempts} + 1`, sortedAt: sql`now()` })
      .where(and(overdue, lt(items.sortAttempts, MAX_ATTEMPTS)))
      .returning({ number: items.number }),
  ]);
  for (const { number } of claimed) after(() => sortSession(number));
}
