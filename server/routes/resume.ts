import { Hono } from "hono";
import { asc } from "drizzle-orm";
import { resumeProfiles } from "@db/schema";
import { getDb } from "../queries/connection";
import { storage, StorageError } from "../lib/storage";
import { loadBundledResume } from "../lib/resume-file";

export const resumeRoutes = new Hono();

resumeRoutes.get("/download", async c => {
  const [profile] = await getDb()
    .select()
    .from(resumeProfiles)
    .orderBy(asc(resumeProfiles.id))
    .limit(1);
  const preview = c.req.query("preview") === "1";
  if (profile?.resumeFileKey) {
    try {
      const { url } = await storage.getPresignedUrl({
        key: profile.resumeFileKey,
        download: !preview,
      });
      return c.redirect(url, 302);
    } catch (error) {
      if (
        !(error instanceof StorageError) ||
        error.code !== "STORAGE_NOT_PROVISIONED"
      )
        throw error;
    }
  }
  const pdf = await loadBundledResume();
  if (!pdf) return c.json({ error: "Resume PDF is not available" }, 404);
  return c.body(pdf, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="liu-zhenkang-resume.pdf"; filename*=UTF-8''${encodeURIComponent("刘振康-中文简历.pdf")}`,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
});
