import {
  bigint,
  boolean,
  int,
  json,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const admins = mysqlTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const adminSessions = mysqlTable("admin_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  adminId: bigint("adminId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resumeProfiles = mysqlTable("resume_profiles", {
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
  skills: json("skills").$type<string[]>().notNull(),
  resumeFileKey: varchar("resumeFileKey", { length: 512 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const experiences = mysqlTable("experiences", {
  id: serial("id").primaryKey(),
  company: varchar("company", { length: 180 }).notNull(),
  role: varchar("role", { length: 140 }).notNull(),
  period: varchar("period", { length: 100 }).notNull(),
  summary: text("summary").notNull(),
  achievements: json("achievements").$type<string[]>().notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  coverImage: varchar("coverImage", { length: 512 }),
  coverKey: varchar("coverKey", { length: 512 }),
  gallery: json("gallery").$type<string[]>().notNull(),
  demoUrl: varchar("demoUrl", { length: 1024 }),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const storedFiles = mysqlTable("stored_files", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 512 }).notNull().unique(),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true })
    .references(() => admins.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  size: int("size").notNull(),
  contentType: varchar("contentType", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type ResumeProfile = typeof resumeProfiles.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type StoredFile = typeof storedFiles.$inferSelect;
