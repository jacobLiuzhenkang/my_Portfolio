import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  adminId: integer("adminId")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const resumeProfiles = pgTable("resume_profiles", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 100 }).notNull(),
  englishName: varchar("englishName", { length: 120 }).notNull(),
  headline: varchar("headline", { length: 255 }).notNull(),
  role: varchar("role", { length: 120 }).notNull(),
  company: varchar("company", { length: 160 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 60 }),
  introduction: text("introduction").notNull(),
  transitionStory: text("transitionStory").notNull(),
  workingStyle: text("workingStyle").notNull(),
  education: text("education").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  resumeFileKey: varchar("resumeFileKey", { length: 512 }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  company: varchar("company", { length: 180 }).notNull(),
  role: varchar("role", { length: 140 }).notNull(),
  period: varchar("period", { length: 100 }).notNull(),
  summary: text("summary").notNull(),
  achievements: jsonb("achievements").$type<string[]>().notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  coverImage: varchar("coverImage", { length: 512 }),
  coverKey: varchar("coverKey", { length: 512 }),
  gallery: jsonb("gallery").$type<string[]>().notNull(),
  demoUrl: varchar("demoUrl", { length: 1024 }),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const storedFiles = pgTable("stored_files", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),
  ownerId: integer("ownerId")
    .references(() => admins.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  size: integer("size").notNull(),
  contentType: varchar("contentType", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type ResumeProfile = typeof resumeProfiles.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type StoredFile = typeof storedFiles.$inferSelect;
