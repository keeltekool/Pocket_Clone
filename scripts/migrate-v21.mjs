// v2.1 migration (SPEC §5, plan Tasks 1.1 + 2.2). Explicit SQL, adds only, safe to run twice.
//   node scripts/migrate-v21.mjs              adds items.favourite
//   node scripts/migrate-v21.mjs --refetch    also re-fetches every item's page text with paragraphs (page_text only;
//                                             a page that no longer answers keeps its old text)
import { neon } from "@neondatabase/serverless";
import { fetchPage } from "../src/lib/page.ts";

process.loadEnvFile(new URL("../.env.local", import.meta.url));
const sql = neon(process.env.DATABASE_URL);

await sql`alter table items add column if not exists favourite boolean not null default false`;
const cols = await sql`select data_type, column_default from information_schema.columns where table_name = 'items' and column_name = 'favourite'`;
console.log("items.favourite:", JSON.stringify(cols));

if (process.argv.includes("--refetch")) {
  for (const { id, number, url, old } of await sql`select id, number, url, length(page_text) as old from items order by number`) {
    const { text } = await fetchPage(url);
    if (text) await sql`update items set page_text = ${text} where id = ${id}`;
    console.log(`#${number}: ${old ?? 0} → ${text ? `${text.length} chars, ${text.split("\n\n").length} paragraphs` : "no text, kept"}`);
  }
}
