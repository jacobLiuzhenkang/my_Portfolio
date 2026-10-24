import {
  pgTable,
  varchar,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
const date = (name: string) => timestamp(name, { withTimezone: true });
export const gbSettings = pgTable("gb_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
});
export const gbVisitors = pgTable("gb_visitors", {
  id: uuid("id").primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: date("expires_at").notNull(),
  blockedUntil: date("blocked_until"),
  createdAt: date("created_at").defaultNow().notNull(),
});
export const gbPosts = pgTable(
  "gb_posts",
  {
    id: uuid("id").primaryKey(),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => gbVisitors.id),
    adminId: integer("admin_id"),
    nickname: varchar("nickname", { length: 32 }).notNull(),
    body: text("body").notNull(),
    state: varchar("state", { length: 16 }).notNull().default("published"),
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    createdAt: date("created_at").defaultNow().notNull(),
  },
  t => [index("gb_posts_feed").on(t.state, t.createdAt, t.id)]
);
export const gbMedia = pgTable(
  "gb_media",
  {
    id: uuid("id").primaryKey(),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => gbVisitors.id),
    postId: uuid("post_id").references(() => gbPosts.id),
    sourceKey: text("source_key").notNull(),
    finalKey: text("final_key").notNull(),
    mime: varchar("mime", { length: 48 }).notNull(),
    size: integer("size").notNull(),
    reservedBytes: integer("reserved_bytes").notNull(),
    finalSize: integer("final_size"),
    width: integer("width"),
    height: integer("height"),
    state: varchar("state", { length: 16 }).notNull().default("reserved"),
    uploadTokenHash: varchar("upload_token_hash", { length: 64 }).notNull(),
    expiresAt: date("expires_at").notNull(),
    createdAt: date("created_at").defaultNow().notNull(),
  },
  t => [
    index("gb_media_post").on(t.postId),
    index("gb_media_expiry").on(t.state, t.expiresAt),
  ]
);
export const gbLikes = pgTable(
  "gb_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => gbPosts.id),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => gbVisitors.id),
    createdAt: date("created_at").defaultNow().notNull(),
  },
  t => [primaryKey({ columns: [t.postId, t.visitorId] })]
);
export const gbComments = pgTable(
  "gb_comments",
  {
    id: uuid("id").primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => gbPosts.id),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => gbVisitors.id),
    adminId: integer("admin_id"),
    nickname: varchar("nickname", { length: 32 }).notNull(),
    body: text("body").notNull(),
    state: varchar("state", { length: 16 }).notNull().default("published"),
    flags: jsonb("flags").$type<string[]>().notNull().default([]),
    createdAt: date("created_at").defaultNow().notNull(),
  },
  t => [index("gb_comments_post").on(t.postId, t.state, t.createdAt)]
);
export const gbReports = pgTable(
  "gb_reports",
  {
    id: uuid("id").primaryKey(),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => gbVisitors.id),
    targetType: varchar("target_type", { length: 10 }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: varchar("reason", { length: 32 }).notNull(),
    resolvedAt: date("resolved_at"),
    createdAt: date("created_at").defaultNow().notNull(),
  },
  t => [
    uniqueIndex("gb_reports_once").on(t.visitorId, t.targetType, t.targetId),
    index("gb_reports_target").on(t.targetType, t.targetId),
  ]
);
export const gbLimits = pgTable(
  "gb_limits",
  {
    key: varchar("key", { length: 200 }).primaryKey(),
    count: integer("count").notNull(),
    resetsAt: date("resets_at").notNull(),
  },
  t => [index("gb_limits_expiry").on(t.resetsAt)]
);
