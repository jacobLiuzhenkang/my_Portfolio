import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { projects, resumeProfiles, storedFiles } from "@db/schema";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { storage } from "./lib/storage";
import { checkFile, makeUploadKey, registerUploadedFile, uploadPrefix } from "./lib/files";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

export const storageRouter = createRouter({
  prepareUpload: adminQuery.input(z.object({ name: z.string().min(1).max(255), contentType: z.string().max(160), size: z.number().int().positive(), purpose: z.enum(["resume", "project", "file"]).default("file") })).mutation(async ({ ctx, input }) => {
    checkFile(input.contentType, input.size, input.purpose);
    const key = makeUploadKey(ctx.admin.id, input.name, input.purpose);
    const { url } = await storage.createUploadUrl({ key, contentType: input.contentType, maximumSizeInBytes: input.size });
    return { key, url };
  }),

  finalizeUpload: adminQuery.input(z.object({ key: z.string().min(1).max(512), name: z.string().min(1).max(255), purpose: z.enum(["resume", "project", "file"]).default("file") })).mutation(({ ctx, input }) => registerUploadedFile(ctx.admin.id, input)),
  upload: adminQuery.input(z.object({
    name: z.string().min(1).max(255),
    contentBase64: z.string().max(36_000_000),
    contentType: z.string().max(160),
    purpose: z.enum(["resume", "project", "file"]).default("file"),
  })).mutation(async ({ ctx, input }) => {
    if (!allowedTypes.has(input.contentType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "仅支持 JPG、PNG、WebP、GIF 图片或 PDF" });
    }
    const bytes = Uint8Array.from(Buffer.from(input.contentBase64, "base64"));
    checkFile(input.contentType, bytes.length, input.purpose);
    if (!bytes.length || bytes.length > 25 * 1024 * 1024) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "文件不能为空，且不能超过 25 MB" });
    }
    const saved = await storage.uploadFile({
      fileContent: bytes,
      fileName: makeUploadKey(ctx.admin.id, input.name, input.purpose),
      contentType: input.contentType,
    });
    await getDb().insert(storedFiles).values({
      key: saved.key,
      ownerId: ctx.admin.id,
      name: input.name,
      size: saved.size,
      contentType: saved.contentType || input.contentType,
    });
    if (input.purpose === "resume") {
      const [profile] = await getDb().select().from(resumeProfiles).orderBy(asc(resumeProfiles.id)).limit(1);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "简历尚未初始化" });
      await getDb().update(resumeProfiles).set({ resumeFileKey: saved.key, updatedAt: new Date() }).where(eq(resumeProfiles.id, profile.id));
    }
    return { key: saved.key, size: saved.size, etag: saved.etag };
  }),

  list: adminQuery.query(async ({ ctx }) => {
    const files = await getDb().select().from(storedFiles).where(eq(storedFiles.ownerId, ctx.admin.id)).orderBy(asc(storedFiles.id));
    return Promise.all(files.map(async (file) => {
      const { url } = await storage.getPresignedUrl({ key: file.key });
      return { ...file, url, canDelete: file.key.startsWith(uploadPrefix(ctx.admin.id)) };
    }));
  }),

  remove: adminQuery.input(z.object({ key: z.string().min(1).max(512) })).mutation(async ({ ctx, input }) => {
    const file = await getDb().query.storedFiles.findFirst({ where: eq(storedFiles.key, input.key) });
    if (!file || file.ownerId !== ctx.admin.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (!file.key.startsWith(uploadPrefix(ctx.admin.id))) throw new TRPCError({ code: "FORBIDDEN", message: "请在文件所属环境的后台删除，预览环境不会删除正式文件。" });
    const [profile] = await getDb().select().from(resumeProfiles).where(eq(resumeProfiles.resumeFileKey, input.key)).limit(1);
    const [project] = await getDb().select().from(projects).where(eq(projects.coverKey, input.key)).limit(1);
    if (profile || project) throw new TRPCError({ code: "CONFLICT", message: "文件正在使用中，请先在简历或作品中取消引用" });
    await storage.deleteFile({ fileKey: input.key });
    await getDb().delete(storedFiles).where(eq(storedFiles.id, file.id));
    return { ok: true };
  }),
});
