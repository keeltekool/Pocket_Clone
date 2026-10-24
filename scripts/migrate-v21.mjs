// v2.1 migration (SPEC §5, plan Task 1.1): adds items.favourite. Explicit SQL, adds only, safe to run twice.
//   node scripts/migrate-v21.mjs
import { neon } from "@neondatabase/serverless";

process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);

await sql`alter table items add column if not exists favourite boolean not null default false`;
const cols = await sql`select data_type, column_default from information_schema.columns where table_name = 'items' and column_name = 'favourite'`;
console.log("items.favourite:", JSON.stringify(cols));
