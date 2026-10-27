import {
  check,
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const guestbookMessages = pgTable(
  "guestbook_messages",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    company: varchar("company", { length: 160 }),
    body: text("body").notNull(),
    status: varchar("status", { length: 8 })
      .$type<"new" | "read" | "spam">()
      .default("new")
      .notNull(),
  },
  t => [
    index("guestbook_messages_created_idx").on(t.createdAt, t.id),
    check(
      "guestbook_messages_status_check",
      sql`${t.status} IN ('new', 'read', 'spam')`
    ),
    check(
      "guestbook_messages_body_check",
      sql`length(${t.body}) BETWEEN 1 AND 2000`
    ),
  ]
);
