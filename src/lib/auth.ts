import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Single-owner app: one password (APP_PASSWORD), no accounts. Guessing is capped in /api/auth (login_failures).
// Ported unchanged from v1 lib/auth.ts.
const COOKIE = "pc_session";
const REMEMBER_DAYS = 180;
const DAY_MS = 86_400_000;

// Keyed by the password itself, so changing APP_PASSWORD signs every device out.
const sign = (exp: string) => createHmac("sha256", process.env.APP_PASSWORD!).update(exp).digest("base64url");
const same = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

// NFC: "ü" typed as one code point or as u + combining mark must match the same password.
export function checkPassword(password: unknown): boolean {
  const expected = process.env.APP_PASSWORD;
  return typeof password === "string" && !!expected && same(password.normalize("NFC"), expected.normalize("NFC"));
}

// remember → persistent cookie for REMEMBER_DAYS; otherwise a browser-session cookie the server caps at one day.
export function sessionCookie(remember: boolean): string {
  const exp = String(Date.now() + (remember ? REMEMBER_DAYS : 1) * DAY_MS);
  const maxAge = remember ? `; Max-Age=${REMEMBER_DAYS * 86_400}` : "";
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Lax${maxAge}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// True when the Cookie header carries a valid, unexpired session. Works for Request, NextRequest and the
// `cookies()` header string alike: pass the raw header.
export function hasSession(cookieHeader: string | null | undefined): boolean {
  const raw = String(cookieHeader || "")
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const [exp, sig] = (raw || "").split(".");
  if (!exp || !sig || !process.env.APP_PASSWORD || Number(exp) < Date.now()) return false;
  return same(sig, sign(exp));
}

export const getSession = (req: Request) => hasSession(req.headers.get("cookie"));

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
export const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });
