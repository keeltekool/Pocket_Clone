export default async function handler(req: Request) {
  return Response.json({ ok: true, method: req.method });
}
