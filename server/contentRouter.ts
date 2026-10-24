import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { experiences, projects, resumeProfiles } from "@db/schema";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { storage } from "./lib/storage";

const profileInput = z.object({
  fullName: z.string().trim().min(1).max(100),
  englishName: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(255),
  role: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(60).nullable(),
  introduction: z.string().trim().min(1),
  transitionStory: z.string().trim().min(1),
  workingStyle: z.string().trim().min(1),
  education: z.string().trim().min(1),
  skills: z.array(z.string().trim().min(1)).max(40),
  resumeFileKey: z.string().max(512).nullable(),
});

const experienceInput = z.object({
  company: z.string().trim().min(1).max(180),
  role: z.string().trim().min(1).max(140),
  period: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1),
  achievements: z.array(z.string().trim().min(1)).max(30),
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
});

const projectInput = z.object({
  title: z.string().trim().min(1).max(180),
  subtitle: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1),
  content: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).max(20),
  coverImage: z.string().trim().max(512).nullable(),
  coverKey: z.string().max(512).nullable(),
  gallery: z.array(z.string().trim().min(1)).max(30),
  demoUrl: z.string().trim().max(1024).refine((v) => !v || /^https?:\/\//.test(v), "链接需以 http:// 或 https:// 开头").nullable(),
  featured: z.boolean(),
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

async function withCoverUrl<T extends { coverImage: string | null; coverKey: string | null }>(project: T) {
  if (!project.coverKey) return { ...project, coverUrl: project.coverImage };
  try {
    const { url } = await storage.getPresignedUrl({ key: project.coverKey });
    return { ...project, coverUrl: url };
  } catch {
    return { ...project, coverUrl: project.coverImage };
  }
}

async function getContent(onlyPublished: boolean) {
  const [profile] = await getDb().select().from(resumeProfiles).orderBy(asc(resumeProfiles.id)).limit(1);
  const allExperiences = await getDb().select().from(experiences).orderBy(asc(experiences.sortOrder), asc(experiences.id));
  const allProjects = await getDb().select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
  const visibleProjects = onlyPublished ? allProjects.filter((item) => item.published) : allProjects;
  return {
    profile: profile ?? null,
    experiences: onlyPublished ? allExperiences.filter((item) => item.published) : allExperiences,
    projects: await Promise.all(visibleProjects.map(withCoverUrl)),
  };
}

export const contentRouter = createRouter({
  public: publicQuery.query(() => getContent(true)),
  admin: adminQuery.query(() => getContent(false)),

  updateProfile: adminQuery.input(profileInput).mutation(async ({ input }) => {
    const [profile] = await getDb().select().from(resumeProfiles).orderBy(asc(resumeProfiles.id)).limit(1);
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "简历尚未初始化" });
    await getDb().update(resumeProfiles).set({ ...input, updatedAt: new Date() }).where(eq(resumeProfiles.id, profile.id));
    return { ok: true };
  }),

  createExperience: adminQuery.input(experienceInput).mutation(async ({ input }) => {
    const [{ id }] = await getDb().insert(experiences).values(input).returning({ id: experiences.id });
    return { id };
  }),
  updateExperience: adminQuery.input(z.object({ id: z.number().int().positive(), data: experienceInput })).mutation(async ({ input }) => {
    await getDb().update(experiences).set({ ...input.data, updatedAt: new Date() }).where(eq(experiences.id, input.id));
    return { ok: true };
  }),
  deleteExperience: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await getDb().delete(experiences).where(eq(experiences.id, input.id));
    return { ok: true };
  }),

  createProject: adminQuery.input(projectInput).mutation(async ({ input }) => {
    const [{ id }] = await getDb().insert(projects).values(input).returning({ id: projects.id });
    return { id };
  }),
  updateProject: adminQuery.input(z.object({ id: z.number().int().positive(), data: projectInput })).mutation(async ({ input }) => {
    await getDb().update(projects).set({ ...input.data, updatedAt: new Date() }).where(eq(projects.id, input.id));
    return { ok: true };
  }),
  deleteProject: adminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await getDb().delete(projects).where(eq(projects.id, input.id));
    return { ok: true };
  }),
});
