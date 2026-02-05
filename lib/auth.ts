import { verifyToken } from "@clerk/backend";

export async function getUserId(req: any): Promise<string | null> {
  const authHeader = req.headers.authorization || req.headers["Authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return verifiedToken.sub;
  } catch {
    return null;
  }
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
