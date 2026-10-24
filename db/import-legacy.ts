import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../server/queries/connection";
import { admins, experiences, projects, resumeProfiles, storedFiles } from "./schema";

async function main() {
  const filename = process.env.PORTFOLIO_IMPORT_FILE;
  if (!filename) throw new Error("PORTFOLIO_IMPORT_FILE is required.");
  const source = JSON.parse(await readFile(filename, "utf8")) as Record<string, Record<string, unknown>[]>;
  const db = getDb();
  const current = await db.select({ id: resumeProfiles.id }).from(resumeProfiles).limit(1);
  if (current.length) throw new Error("Import refused: the destination already contains portfolio data.");
  const rows = (name: string) => (source[name] || []).map(row => {
    const value = { ...row };
    for (const key of ["createdAt", "updatedAt", "expiresAt"]) if (typeof value[key] === "string") value[key] = new Date(value[key]);
    for (const key of ["skills", "achievements", "tags", "gallery"]) if (typeof value[key] === "string") value[key] = JSON.parse(value[key]);
    for (const key of ["published", "featured"]) if (value[key] !== undefined) value[key] = Boolean(value[key]);
    return value;
  });
  await db.transaction(async tx => {
    const accounts = rows("admins") as typeof admins.$inferInsert[];
    if (accounts.length) await tx.insert(admins).values(accounts);
    await tx.insert(resumeProfiles).values(rows("resume_profiles") as typeof resumeProfiles.$inferInsert[]);
    const work = rows("experiences") as typeof experiences.$inferInsert[];
    const cases = rows("projects") as typeof projects.$inferInsert[];
    const files = rows("stored_files") as typeof storedFiles.$inferInsert[];
    if (work.length) await tx.insert(experiences).values(work);
    if (cases.length) await tx.insert(projects).values(cases);
    if (files.length) await tx.insert(storedFiles).values(files);
    // Table names are application constants. Active local sessions are intentionally not imported.
    for (const name of ["admins", "resume_profiles", "experiences", "projects", "stored_files"]) {
      await tx.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${name}', 'id'), COALESCE((SELECT MAX(id) FROM "${name}"), 1), EXISTS(SELECT 1 FROM "${name}"))`));
    }
    if (!accounts.length && process.env.PORTFOLIO_OWNER_FILE) {
      const owner = JSON.parse(await readFile(process.env.PORTFOLIO_OWNER_FILE, "utf8")) as { username: string; password: string };
      if (!/^[A-Za-z0-9_.-]{3,64}$/.test(owner.username) || owner.password.length < 20) throw new Error("A strong owner credential is required.");
      await tx.insert(admins).values({ username: owner.username, passwordHash: await bcrypt.hash(owner.password, 12), displayName: "刘振康" });
    }
  });
  console.log("Portfolio data imported; original IDs preserved and owner account initialized.");
}

main().then(() => process.exit(0)).catch(() => {
  console.error("Portfolio import failed; destination data was not overwritten. Check the destination/schema and private input files.");
  process.exit(1);
});
