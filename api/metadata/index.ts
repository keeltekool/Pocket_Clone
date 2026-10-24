import { getUserId, unauthorized, methodNotAllowed, badRequest } from "../../lib/auth";
import { fetchMeta } from "../../lib/metadata";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return methodNotAllowed(res);
  if (!getUserId(req)) return unauthorized(res);

  const url = String(req.query.url || "");
  if (!/^https?:\/\//i.test(url)) return badRequest(res, "An http(s) url is required");

  return res.status(200).json(await fetchMeta(url));
}
