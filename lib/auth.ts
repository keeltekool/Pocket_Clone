import { createHash, createHmac, timingSafeEqual } from "crypto";

// Single-owner app: one password (APP_PASSWORD), no user accounts. Every row belongs to OWNER.
// ponytail: no login rate limit; a long random APP_PASSWORD is the defence. Add one if the password gets short.
export const OWNER = "owner";
const COOKIE = "pc_session";
const REMEMBER_DAYS = 180;
const DAY_MS = 86_400_000;

// Keyed by the password itself, so changing APP_PASSWORD signs every device out.
const sign = (exp: string) => createHmac("sha256", process.env.APP_PASSWORD!).update(exp).digest("base64url");
const same = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export function checkPassword(password: unknown): boolean {
  return typeof password === "string" && !!process.env.APP_PASSWORD && same(password, process.env.APP_PASSWORD);
}

// remember → persistent cookie for REMEMBER_DAYS; otherwise a browser-session cookie the server caps at one day.
export function sessionCookie(remember: boolean): string {
  const exp = String(Date.now() + (remember ? REMEMBER_DAYS : 1) * DAY_MS);
  const maxAge = remember ? `; Max-Age=${REMEMBER_DAYS * 86_400}` : "";
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Lax${maxAge}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function getUserId(req: any): string | null {
  const raw = String(req.headers.cookie || "")
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const [exp, sig] = (raw || "").split(".");
  if (!exp || !sig || !process.env.APP_PASSWORD || Number(exp) < Date.now()) return null;
  return same(sig, sign(exp)) ? OWNER : null;
}

export function unauthorized(res: any) {
  return res.status(401).json({ error: "Unauthorized" });
}

export function methodNotAllowed(res: any) {
  return res.status(405).json({ error: "Method not allowed" });
}

export function badRequest(res: any, message: string) {
  return res.status(400).json({ error: message });
}
