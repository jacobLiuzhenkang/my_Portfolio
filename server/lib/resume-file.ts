import { readFile } from "node:fs/promises";
import path from "node:path";

/** Fixed application-owned paths; request input never selects a filesystem path. */
export async function loadBundledResume(
  root = process.cwd(),
  production = process.env.NODE_ENV === "production"
) {
  const directories = production
    ? ["dist/public", "public"]
    : ["public", "dist/public"];
  for (const directory of directories) {
    try {
      return new Uint8Array(
        await readFile(path.join(root, directory, "downloads/resume-cn.pdf"))
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}
