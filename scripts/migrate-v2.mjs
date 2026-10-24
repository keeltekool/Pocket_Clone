// One-time v1 → v2 migration (SPEC §5). Moves the v1 `links` and `buckets` tables aside as `v1_links` / `v1_buckets`
// (the plan said drop; the unattended run's permission classifier refused a table drop, so they are kept for the owner
// to drop by hand), creates the v2 schema matching src/db/schema.ts, seeds the 8 buckets. `login_failures` is untouched.
// Refuses to run twice: once `items` exists the data is the owner's.
//   node scripts/migrate-v2.mjs
import { neon } from "@neondatabase/serverless";

process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);

const [{ exists }] = await sql`select exists (select 1 from information_schema.tables where table_name = 'items') as exists`;
if (exists) {
  console.log("items already exists: v2 schema is in place, nothing to do");
  process.exit(0);
}

const statements = [
  `alter table links rename to v1_links`,
  `alter table buckets rename to v1_buckets`,
  `alter index if exists buckets_user_name_idx rename to v1_buckets_user_name_idx`,
  `create type item_status as enum ('sorting', 'sorted', 'unsorted')`,
  `create type sorted_by as enum ('agent', 'owner')`,
  `create type suggestion_status as enum ('open', 'dismissed', 'created')`,
  `create table buckets (
     id uuid primary key default gen_random_uuid(),
     name varchar(60) not null,
     created_at timestamp not null default now()
   )`,
  `create unique index buckets_name_lower_idx on buckets (lower(name))`,
  `create table items (
     id uuid primary key default gen_random_uuid(),
     number integer generated always as identity not null unique,
     url text not null,
     url_key text not null unique,
     title text not null,
     domain text not null,
     image_url text,
     page_text text,
     status item_status not null default 'sorting',
     bucket_id uuid references buckets(id) on delete set null,
     sorted_by sorted_by,
     sort_attempts integer not null default 0,
     sort_session_id text,
     created_at timestamp not null default now(),
     sorted_at timestamp
   )`,
  `create table bucket_suggestions (
     id uuid primary key default gen_random_uuid(),
     name varchar(60) not null,
     reason text not null,
     item_numbers integer[] not null,
     status suggestion_status not null default 'open',
     created_at timestamp not null default now()
   )`,
  // Seeded in this order (SPEC §5); created_at carries the order.
  `insert into buckets (name, created_at) values
     ('AI & Claude', now()),
     ('eSign & eID', now() + interval '1 ms'),
     ('Jobs', now() + interval '2 ms'),
     ('Estonian AI scene', now() + interval '3 ms'),
     ('Design inspiration', now() + interval '4 ms'),
     ('Shopping & home', now() + interval '5 ms'),
     ('Personal', now() + interval '6 ms'),
     ('Other', now() + interval '7 ms')`,
];
await sql.transaction(statements.map((s) => sql.query(s)));

for (const t of ["items", "buckets", "bucket_suggestions", "login_failures"]) {
  const [{ n }] = await sql.query(`select count(*)::int as n from ${t}`);
  console.log(`${t}: ${n}`);
}
