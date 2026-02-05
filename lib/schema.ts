import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const buckets = pgTable("buckets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("buckets_user_name_idx").on(table.userId, table.name),
  index("idx_buckets_user_id").on(table.userId),
]);

export const links = pgTable("links", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  url: text("url").notNull(),
  title: text("title"),
  imageUrl: text("image_url"),
  domain: varchar("domain", { length: 255 }),
  bucketId: uuid("bucket_id").references(() => buckets.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_links_user_id").on(table.userId),
  index("idx_links_created_at").on(table.createdAt),
  index("idx_links_bucket_id").on(table.bucketId),
]);

export type Bucket = typeof buckets.$inferSelect;
export type NewBucket = typeof buckets.$inferInsert;
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
