import pg from "pg";
import { recentProjects } from "./portfolio-content";
import { planRecentProjectUpdate } from "./recent-project-upgrade";
import { storage } from "../server/lib/storage";

const releaseRequested = process.env.PORTFOLIO_RELEASE_COPY_20261025 === "1";
const dryRun = process.argv.includes("--dry-run");
let step = "preflight";

type LiveProject = {
  id: number;
  title: string;
  description: string;
  content: string;
  tags: string[];
  coverImage: string | null;
};

function plans(rows: LiveProject[]) {
  return recentProjects.map((next, index) => {
    const id = index + 6;
    const row = rows.find(project => project.id === id);
    if (
      !row ||
      (row.title !== next.title && row.coverImage !== next.coverImage)
    )
      throw new Error("CASE_IDENTITY_MISMATCH");
    return {
      row,
      ...planRecentProjectUpdate(row, next, index === 0 ? "viform" : "sac"),
    };
  });
}

async function publishRecentProjects() {
  // Ordinary builds never connect to the database or write content.
  if (!releaseRequested && !dryRun) return;
  if (releaseRequested && process.env.VERCEL_ENV !== "production")
    throw new Error("PRODUCTION_RELEASE_REQUIRED");
  const url = new URL(
    process.env.DATABASE_URL || process.env.POSTGRES_URL || ""
  );
  if (!/^postgres(?:ql)?:$/.test(url.protocol))
    throw new Error("POSTGRES_REQUIRED");
  const local = ["postgres", "localhost", "127.0.0.1"].includes(url.hostname);
  for (const key of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "channel_binding",
  ])
    url.searchParams.delete(key);
  const db = new pg.Client({
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true },
    enableChannelBinding: !local,
    connectionTimeoutMillis: 15000,
  });
  let transaction = false;
  await db.connect();
  try {
    step = "plan";
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transaction = true;
    const initial = plans(
      (
        await db.query<LiveProject>(
          'SELECT id, title, description, content, tags, "coverImage" FROM projects WHERE id IN (6, 7) ORDER BY id'
        )
      ).rows
    );
    if (dryRun || !initial.some(plan => Object.keys(plan.patch).length)) {
      await db.query("COMMIT");
      transaction = false;
      console.log(
        "Recent case publication:",
        JSON.stringify({
          dryRun,
          changes: initial.map(plan => ({
            id: plan.row.id,
            fields: Object.keys(plan.patch),
            protectedFields: plan.customFieldsKept,
          })),
        })
      );
      return;
    }

    step = "backup-read";
    const names = (
      await db.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
      )
    ).rows;
    const tables: Record<string, unknown[]> = {};
    for (const { tablename } of names) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      tables[tablename] = (
        await db.query("SELECT * FROM public." + quoted)
      ).rows;
    }
    await db.query("COMMIT");
    transaction = false;
    const backup = JSON.stringify({
      format: "portfolio-database-backup/v1",
      createdAt: new Date().toISOString(),
      tables,
    });
    const bytes = Buffer.byteLength(backup);
    if (bytes > 20 * 1024 * 1024)
      throw new Error("BACKUP_EXCEEDS_RELEASE_LIMIT");
    step = "backup-store";
    const saved = await storage.uploadFile({
      fileContent: backup,
      fileName: `private-backups/portfolio-case-release-${Date.now()}.json`,
      contentType: "application/json",
    });
    const verified = await storage.headFile(saved.key);
    if (verified.size !== bytes)
      throw new Error("PRIVATE_BACKUP_VERIFICATION_FAILED");

    // Re-read under row locks so edits made while backing up remain protected.
    step = "apply";
    await db.query("BEGIN");
    transaction = true;
    await db.query("SELECT pg_advisory_xact_lock(17302501)");
    const current = plans(
      (
        await db.query<LiveProject>(
          'SELECT id, title, description, content, tags, "coverImage" FROM projects WHERE id IN (6, 7) ORDER BY id FOR UPDATE'
        )
      ).rows
    );
    const updated: number[] = [];
    for (const plan of current) {
      if (!Object.keys(plan.patch).length) continue;
      const result = await db.query(
        'UPDATE projects SET description=$1, content=$2, tags=$3, "updatedAt"=NOW() WHERE id=$4',
        [
          plan.patch.description ?? plan.row.description,
          plan.patch.content ?? plan.row.content,
          JSON.stringify(plan.patch.tags ?? plan.row.tags),
          plan.row.id,
        ]
      );
      if (result.rowCount !== 1) throw new Error("CASE_UPDATE_COUNT_MISMATCH");
      updated.push(plan.row.id);
    }
    await db.query("COMMIT");
    transaction = false;
    console.log(
      "Recent case publication:",
      JSON.stringify({
        backupVerified: true,
        backupKey: saved.key,
        backupBytes: bytes,
        updatedCaseIds: updated,
        protectedFields: current
          .filter(plan => plan.customFieldsKept.length)
          .map(plan => ({ id: plan.row.id, fields: plan.customFieldsKept })),
      })
    );
  } catch (error) {
    if (transaction) await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

publishRecentProjects().catch(error => {
  // Never print database URLs, credentials, backup payloads or visitor text in build logs.
  const code =
    error?.code ||
    (/^[A-Z_]+$/.test(error?.message || "") ? error.message : error?.name);
  console.error(
    "Recent case publication aborted:",
    JSON.stringify({ step, code })
  );
  process.exitCode = 1;
});
