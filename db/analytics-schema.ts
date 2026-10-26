import {
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    name: varchar("name", { length: 24 }).notNull(),
    path: varchar("path", { length: 100 }).notNull(),
    projectSlug: varchar("project_slug", { length: 80 }),
    visitorId: varchar("visitor_id", { length: 36 }).notNull(),
    sessionId: varchar("session_id", { length: 36 }),
    referrerHost: varchar("referrer_host", { length: 253 }),
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    device: varchar("device", { length: 10 }).notNull(),
    country: varchar("country", { length: 64 }),
    region: varchar("region", { length: 100 }),
  },
  table => [
    index("analytics_occurred_idx").on(table.occurredAt),
    index("analytics_name_occurred_idx").on(table.name, table.occurredAt),
    index("analytics_project_occurred_idx").on(
      table.projectSlug,
      table.occurredAt
    ),
  ]
);
