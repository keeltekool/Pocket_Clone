import { sql } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

// Single owner: no user column anywhere. Created by scripts/migrate-v2.mjs (explicit SQL, same shape as here).

const itemStatus = pgEnum("item_status", ["sorting", "sorted", "unsorted"]);
const sortedBy = pgEnum("sorted_by", ["agent", "owner"]);
const suggestionStatus = pgEnum("suggestion_status", ["open", "dismissed", "created"]);

export const buckets = pgTable(
  "buckets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 60 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("buckets_name_lower_idx").on(sql`lower(${t.name})`)],
);

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Permanent #N shown on the card and used by `pocket #N`; never reused.
  number: integer("number").generatedAlwaysAsIdentity().notNull().unique(),
  url: text("url").notNull(),
  // Normalised URL for the duplicate check (lib/page.ts normalizeUrl).
  urlKey: text("url_key").notNull().unique(),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  imageUrl: text("image_url"),
  pageText: text("page_text"),
  status: itemStatus("status").notNull().default("sorting"),
  bucketId: uuid("bucket_id").references(() => buckets.id, { onDelete: "set null" }),
  sortedBy: sortedBy("sorted_by"),
  sortAttempts: integer("sort_attempts").notNull().default(0),
  sortSessionId: text("sort_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sortedAt: timestamp("sorted_at"),
});

export const bucketSuggestions = pgTable("bucket_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  reason: text("reason").notNull(),
  itemNumbers: integer("item_numbers").array().notNull(),
  status: suggestionStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One row per wrong password; /api/auth refuses logins while too many are recent. Kept from v1.
export const loginFailures = pgTable(
  "login_failures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_login_failures_created_at").on(t.createdAt)],
);
