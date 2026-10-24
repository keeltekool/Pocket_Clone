import { checkPassword, sessionCookie, clearCookie, getUserId, methodNotAllowed } from "../../lib/auth";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ authed: !!getUserId(req) });
  }

  if (req.method === "POST") {
    const { password, remember } = req.body || {};
    if (!checkPassword(password)) return res.status(401).json({ error: "Wrong password" });
    res.setHeader("Set-Cookie", sessionCookie(remember !== false));
    return res.status(200).json({ authed: true });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie);
    return res.status(200).json({ authed: false });
  }

  return methodNotAllowed(res);
}
