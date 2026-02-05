import { db } from "../lib/db";
import { buckets } from "../lib/schema";

export default async function handler(req: any, res: any) {
  try {
    const data = await db.select().from(buckets).limit(1);
    res.status(200).json({ ok: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
