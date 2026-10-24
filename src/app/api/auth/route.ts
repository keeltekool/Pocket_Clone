import { count, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { loginFailures } from "@/db/schema";
import { checkPassword, clearCookie, getSession, sessionCookie } from "@/lib/auth";

// Global cap, not per IP: one owner, and spreading guesses over many IPs gains nothing.
// Remembered devices keep working while it is closed; only new logins wait.
const MAX_FAILURES = 20;
const WINDOW_MS = 15 * 60_000;

export async function GET(req: Request) {
  return Response.json({ authed: getSession(req) });
}

export async function POST(req: Request) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [{ recent }] = await db.select({ recent: count() }).from(loginFailures).where(gt(loginFailures.createdAt, since));
  if (recent >= MAX_FAILURES) {
    return Response.json({ error: "Too many wrong passwords. Try again in 15 minutes." }, { status: 429 });
  }

  const { password, remember } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) {
    await db.insert(loginFailures).values({});
    await db.delete(loginFailures).where(lt(loginFailures.createdAt, new Date(Date.now() - 86_400_000)));
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  return Response.json({ authed: true }, { headers: { "Set-Cookie": sessionCookie(remember !== false) } });
}

export async function DELETE() {
  return Response.json({ authed: false }, { headers: { "Set-Cookie": clearCookie } });
}
