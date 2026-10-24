import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { admins, adminSessions, storedFiles } from "@db/schema";
import { createSession, destroySession } from "./auth";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";

const credentials = z.object({
  username: z.string().trim().min(3, "账号至少 3 个字符").max(64).regex(/^[A-Za-z0-9_.-]+$/, "账号仅支持字母、数字、点、下划线与连字符"),
  password: z.string().min(10, "密码至少 10 位").max(128),
});
const attempts = new Map<string, { failures: number; lockedUntil: number }>();

function clientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function assertCanLogin(key: string) {
  const record = attempts.get(key);
  if (record && record.lockedUntil > Date.now()) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "尝试次数过多，请稍后再试" });
  }
}

async function hasAdmin() {
  const [row] = await getDb().select({ value: count() }).from(admins);
  return Number(row?.value ?? 0) > 0;
}

export const authRouter = createRouter({
  status: publicQuery.query(async ({ ctx }) => ({
    configured: await hasAdmin(),
    user: ctx.admin ? { username: ctx.admin.username, displayName: ctx.admin.displayName } : null,
  })),

  setup: publicQuery.input(credentials).mutation(async ({ ctx, input }) => {
    if (await hasAdmin()) throw new TRPCError({ code: "FORBIDDEN", message: "管理员已初始化，请直接登录" });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const [{ id }] = await getDb().insert(admins).values({
      username: input.username,
      passwordHash,
      displayName: "刘振康",
    }).$returningId();
    await getDb().update(storedFiles).set({ ownerId: id }).where(isNull(storedFiles.ownerId));
    await createSession(id, ctx.resHeaders);
    return { ok: true };
  }),

  login: publicQuery.input(credentials).mutation(async ({ ctx, input }) => {
    const key = clientKey(ctx.req);
    assertCanLogin(key);
    const user = await getDb().query.admins.findFirst({ where: eq(admins.username, input.username) });
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !valid) {
      const record = attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
      record.failures += 1;
      if (record.failures >= 8) record.lockedUntil = Date.now() + 15 * 60 * 1000;
      attempts.set(key, record);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "账号或密码不正确" });
    }
    attempts.delete(key);
    await getDb().delete(adminSessions).where(eq(adminSessions.adminId, user.id));
    await createSession(user.id, ctx.resHeaders);
    return { ok: true };
  }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    await destroySession(ctx.req, ctx.resHeaders);
    return { ok: true };
  }),

  changePassword: adminQuery.input(z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10, "新密码至少 10 位").max(128),
  })).mutation(async ({ ctx, input }) => {
    const valid = await bcrypt.compare(input.currentPassword, ctx.admin.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "当前密码不正确" });
    await getDb().update(admins).set({
      passwordHash: await bcrypt.hash(input.newPassword, 12),
      updatedAt: new Date(),
    }).where(eq(admins.id, ctx.admin.id));
    await getDb().delete(adminSessions).where(eq(adminSessions.adminId, ctx.admin.id));
    await createSession(ctx.admin.id, ctx.resHeaders);
    return { ok: true };
  }),
});
