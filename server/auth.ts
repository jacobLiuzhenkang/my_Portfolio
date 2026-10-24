import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { admins, adminSessions, type Admin } from "@db/schema";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";

export const SESSION_COOKIE = "lz_admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readToken(req: Request) {
  const cookies = req.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [name, ...rest] = item.trim().split("=");
    if (name === SESSION_COOKIE) {
      try { const token = decodeURIComponent(rest.join("=")); return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : undefined; }
      catch { return undefined; }
    }
  }
  return undefined;
}

function cookie(value: string, maxAge: number) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${env.isProduction ? "; Secure" : ""}`;
}

export async function getAdminFromRequest(req: Request): Promise<Admin | undefined> {
  const token = readToken(req);
  if (!token) return undefined;
  const rows = await getDb()
    .select({ admin: admins })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.admin;
}

export async function createSession(adminId: number, resHeaders: Headers) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await getDb().insert(adminSessions).values({ tokenHash: hashToken(token), adminId, expiresAt });
  resHeaders.append("Set-Cookie", cookie(token, SESSION_SECONDS));
}

export async function destroySession(req: Request, resHeaders: Headers) {
  const token = readToken(req);
  if (token) await getDb().delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
  resHeaders.append("Set-Cookie", cookie("", 0));
}
