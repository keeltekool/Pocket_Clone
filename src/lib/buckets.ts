export const cleanName = (name: unknown) => (typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 60) : "");
export const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
// Postgres error code. Drizzle wraps the Neon error, so the code sits on `cause`; raw neon errors carry it directly.
export const pgCode = (e: unknown) => (e as { code?: string; cause?: { code?: string } })?.cause?.code ?? (e as { code?: string })?.code;
// unique_violation from buckets_name_lower_idx (case-insensitive).
export const duplicateName = (e: unknown) => pgCode(e) === "23505";
