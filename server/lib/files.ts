import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { resumeProfiles, storedFiles } from "@db/schema";
import { getDb } from "../queries/connection";
import { storage } from "./storage";
import {
  ALLOWED_FILE_TYPES,
  UPLOAD_MAX_BYTES,
  type UploadPurpose,
} from "@contracts/files";

export function uploadPrefix(ownerId: number) {
  const environment =
    process.env.VERCEL_ENV === "production"
      ? "production"
      : process.env.VERCEL_ENV === "preview"
        ? `preview-${(process.env.VERCEL_GIT_COMMIT_SHA || "branch").slice(0, 12)}`
        : "local";
  return `${environment}/u/${ownerId}/`;
}

export function makeUploadKey(
  ownerId: number,
  name: string,
  purpose: UploadPurpose
) {
  // Blob delegation scopes currently decode non-ASCII paths differently from
  // presigned URLs. Keep the object key ASCII; preserve the original name in DB.
  const extension = name.match(/\.[A-Za-z0-9]{1,10}$/)?.[0].toLowerCase() || "";
  const stem = name
    .slice(0, name.length - extension.length)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
  const cleanName = `${stem}${extension}`;
  const folder =
    purpose === "resume"
      ? "resumes"
      : purpose === "project"
        ? "projects"
        : "files";
  return `${uploadPrefix(ownerId)}${folder}/${randomUUID()}/${cleanName}`;
}

export function checkFile(
  contentType: string,
  size: number,
  purpose: UploadPurpose
) {
  if (
    !ALLOWED_FILE_TYPES.includes(
      contentType as (typeof ALLOWED_FILE_TYPES)[number]
    )
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "仅支持 JPG、PNG、WebP、GIF 图片或 PDF。",
    });
  if (size <= 0 || size > UPLOAD_MAX_BYTES)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "文件不能为空，且不能超过 25 MB。",
    });
  if (purpose === "resume" && contentType !== "application/pdf")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "简历文件必须为 PDF。",
    });
}

export async function registerUploadedFile(
  ownerId: number,
  input: { key: string; name: string; purpose: UploadPurpose }
) {
  const folder =
    input.purpose === "resume"
      ? "resumes"
      : input.purpose === "project"
        ? "projects"
        : "files";
  if (!input.key.startsWith(`${uploadPrefix(ownerId)}${folder}/`))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "不能引用其他账号或其他环境的上传文件。",
    });
  const metadata = await storage.headFile(input.key);
  checkFile(metadata.contentType, metadata.size, input.purpose);
  const db = getDb();
  await db.transaction(async tx => {
    await tx
      .insert(storedFiles)
      .values({
        key: input.key,
        ownerId,
        name: input.name,
        size: metadata.size,
        contentType: metadata.contentType,
      })
      .onConflictDoNothing({ target: storedFiles.key });
    const [file] = await tx
      .select()
      .from(storedFiles)
      .where(eq(storedFiles.key, input.key))
      .limit(1);
    if (!file || file.ownerId !== ownerId)
      throw new TRPCError({ code: "FORBIDDEN" });
    if (input.purpose === "resume") {
      const [profile] = await tx
        .select()
        .from(resumeProfiles)
        .orderBy(asc(resumeProfiles.id))
        .limit(1);
      if (!profile)
        throw new TRPCError({ code: "NOT_FOUND", message: "简历尚未初始化。" });
      await tx
        .update(resumeProfiles)
        .set({ resumeFileKey: input.key, updatedAt: new Date() })
        .where(eq(resumeProfiles.id, profile.id));
    }
  });
  return { key: input.key, size: metadata.size, etag: metadata.etag };
}
