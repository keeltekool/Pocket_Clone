import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

// Every /api route needs the session cookie except: /api/auth (login itself), /api/save (iPhone Shortcut, x-api-key,
// checked in its route) and /api/mcp (bearer token, checked in its route). Pages check the cookie server-side and
// render the login form instead (SPEC §4.1).
const OPEN = ["/api/auth", "/api/save", "/api/mcp"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || getSession(req)) return NextResponse.next();
  return unauthorized();
}

export const config = { matcher: "/api/:path*" };
