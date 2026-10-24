import { db } from "../../lib/db";
import { loginFailures } from "../../lib/schema";
import { checkPassword, sessionCookie, clearCookie, getUserId, methodNotAllowed } from "../../lib/auth";
import { count, gt, lt } from "drizzle-orm";

// Global cap, not per IP: one owner, and spreading guesses over many IPs gains nothing.
// Remembered devices keep working while it is closed; only new logins wait.
const MAX_FAILURES = 20;
const WINDOW_MS = 15 * 60_000;

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ authed: !!getUserId(req) });
  }

  if (req.method === "POST") {
    const since = new Date(Date.now() - WINDOW_MS);
    const [{ recent }] = await db.select({ recent: count() }).from(loginFailures).where(gt(loginFailures.createdAt, since));
    if (recent >= MAX_FAILURES) {
      return res.status(429).json({ error: "Too many wrong passwords. Try again in 15 minutes." });
    }

    const { password, remember } = req.body || {};
    if (!checkPassword(password)) {
      await db.insert(loginFailures).values({});
      await db.delete(loginFailures).where(lt(loginFailures.createdAt, new Date(Date.now() - 86_400_000)));
      return res.status(401).json({ error: "Wrong password" });
    }

    res.setHeader("Set-Cookie", sessionCookie(remember !== false));
    return res.status(200).json({ authed: true });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie);
    return res.status(200).json({ authed: false });
  }

  return methodNotAllowed(res);
}
