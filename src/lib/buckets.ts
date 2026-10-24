export const cleanName = (name: unknown) => (typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 60) : "");
// Postgres unique_violation from buckets_name_lower_idx (case-insensitive). Drizzle wraps the Neon error, so the code
// sits on `cause`; raw neon errors carry it directly.
const pgCode = (e: unknown) => (e as { code?: string; cause?: { code?: string } })?.cause?.code ?? (e as { code?: string })?.code;
export const duplicateName = (e: unknown) => pgCode(e) === "23505";
export const conflict = () => Response.json({ error: "A bucket with this name already exists" }, { status: 409 });
