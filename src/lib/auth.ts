import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Single-owner app: one password (APP_PASSWORD), no accounts. Guessing is capped in /api/auth (login_failures).
// Ported unchanged from v1 lib/auth.ts.
const COOKIE = "pc_session";
const REMEMBER_DAYS = 180;
const DAY_MS = 86_400_000;

// Keyed by the password itself, so changing APP_PASSWORD signs every device out.
const sign = (exp: string) => createHmac("sha256", process.env.APP_PASSWORD!).update(exp).digest("base64url");

// Constant-time compare of two secrets of any length (both hashed first). False when either is missing.
export function secretMatches(given: string | null | undefined, expected: string | null | undefined): boolean {
  if (!given || !expected) return false;
  return timingSafeEqual(createHash("sha256").update(given).digest(), createHash("sha256").update(expected).digest());
}

// NFC: "ü" typed as one code point or as u + combining mark must match the same password.
export function checkPassword(password: unknown): boolean {
  return typeof password === "string" && secretMatches(password.normalize("NFC"), process.env.APP_PASSWORD?.normalize("NFC"));
}

// remember → persistent cookie for REMEMBER_DAYS; otherwise a browser-session cookie the server caps at one day.
export function sessionCookie(remember: boolean): string {
  const exp = String(Date.now() + (remember ? REMEMBER_DAYS : 1) * DAY_MS);
  const maxAge = remember ? `; Max-Age=${REMEMBER_DAYS * 86_400}` : "";
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Lax${maxAge}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// True when a Cookie header (or `cookies().toString()`) carries a valid, unexpired session.
export function hasSession(cookieHeader: string | null | undefined): boolean {
  const raw = String(cookieHeader || "")
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const [exp, sig] = (raw || "").split(".");
  if (!exp || !sig || !process.env.APP_PASSWORD || Number(exp) < Date.now()) return false;
  return secretMatches(sig, sign(exp));
}

export const getSession = (req: Request) => hasSession(req.headers.get("cookie"));
