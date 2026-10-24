import { randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { PoolClient, QueryResultRow } from "pg";
import type { TrpcContext } from "../context";
import { getPool } from "../queries/connection";
import {
  assertSameOrigin,
  digest,
  guestCookie,
  moderateText,
  networkKey,
  readGuestToken,
  rejectTrap,
} from "./security";
import type { BoardPost, BoardComment, BoardImage } from "@contracts/guestbook";

export type Visitor = { id: string; blocked_until: Date | null };
type ModerationRow = {
  id: string;
  post_id: string;
  nickname: string;
  body: string;
  created_at: Date;
  state: string;
  flags: string[];
  visitor_id: string;
  owner: boolean;
  blocked_until: Date | null;
  reports: number;
  media_count?: number;
};
export type Sql = Pick<PoolClient, "query">;
export async function rows<T extends QueryResultRow = QueryResultRow>(
  db: Sql,
  text: string,
  args: unknown[] = []
): Promise<T[]> {
  return (await db.query<T>(text, args)).rows;
}
export async function locked<T>(
  fn: (db: PoolClient) => Promise<T>
): Promise<T> {
  const db = await getPool().connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(17302402)");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
let secretPromise: Promise<string> | undefined;
async function secret() {
  secretPromise ??= rows(
    getPool(),
    "SELECT value FROM gb_settings WHERE key='security_key'"
  )
    .then(r => {
      if (!r[0]?.value) throw new Error("Guestbook migration is required");
      return String(r[0].value);
    })
    .catch(e => {
      secretPromise = undefined;
      throw e;
    });
  return secretPromise;
}
export async function guest(
  req: Request,
  db: Sql = getPool()
): Promise<Visitor | undefined> {
  const token = readGuestToken(req);
  if (!token) return undefined;
  return (
    await rows<Visitor>(
      db,
      "SELECT id,blocked_until FROM gb_visitors WHERE token_hash=$1 AND expires_at>now()",
      [digest(token)]
    )
  )[0];
}
export async function charge(
  db: Sql,
  key: string,
  max: number,
  windowMs: number,
  amount = 1
) {
  const now = Date.now(),
    bucket = Math.floor(now / windowMs),
    reset = new Date((bucket + 1) * windowMs);
  const result = await rows(
    db,
    "INSERT INTO gb_limits(key,count,resets_at) SELECT $1,$2,$3 WHERE $2::integer<=$4::integer ON CONFLICT(key) DO UPDATE SET count=gb_limits.count+EXCLUDED.count WHERE gb_limits.count+EXCLUDED.count<=$4 RETURNING count",
    [key + ":" + bucket, amount, reset, max]
  );
  if (!result.length)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "操作有点频繁，请稍后再试。",
    });
}
const minute = 60000,
  day = 86400000;
const limits = {
  post: [2, 10, 20, 100],
  comment: [5, 50, 100, 500],
  like: [30, 300, 600, 5000],
  image: [9, 30, 60, 100],
  decode: [12, 60, 120, 200],
  report: [5, 20, 40, 200],
  retract: [10, 100, 200, 1000],
} as const;
export async function write<T>(
  ctx: TrpcContext,
  action: keyof typeof limits,
  fn: (db: PoolClient, actor: Visitor) => Promise<T>,
  amount = 1
) {
  assertSameOrigin(ctx.req);
  const net = networkKey(ctx.req, await secret());
  return locked(async db => {
    const actor = await guest(ctx.req, db);
    if (!actor)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "请重新点击发布或互动按钮。",
      });
    if (
      action !== "retract" &&
      actor.blocked_until &&
      actor.blocked_until > new Date()
    )
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "当前访客暂时不能发布内容。",
      });
    if (
      action !== "retract" &&
      (
        await rows(
          db,
          "SELECT value FROM gb_settings WHERE key='writes_enabled'"
        )
      )[0]?.value !== "true"
    )
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "留言互动暂时休息中，已有内容仍可浏览。",
      });
    const [perMinute, perDay, networkDay, globalDay] = limits[action];
    await charge(db, "v:" + actor.id + ":" + action, perMinute, minute, amount);
    await charge(db, "vd:" + actor.id + ":" + action, perDay, day, amount);
    await charge(db, "n:" + net + ":" + action, networkDay, day, amount);
    await charge(db, "all:" + action, globalDay, day, amount);
    return fn(db, actor);
  });
}
export async function identity(ctx: TrpcContext, website: string) {
  assertSameOrigin(ctx.req);
  rejectTrap(website);
  const net = networkKey(ctx.req, await secret());
  return locked(async db => {
    const existing = await guest(ctx.req, db);
    if (existing) return { ready: true };
    await charge(db, "new:" + net, 20, 3600000);
    await charge(db, "new:all", 400, day);
    await db.query(
      "DELETE FROM gb_limits WHERE resets_at<now()-interval '48 hours'"
    );
    const token = randomBytes(32).toString("base64url");
    await db.query(
      "INSERT INTO gb_visitors(id,token_hash,expires_at) VALUES($1,$2,$3)",
      [randomUUID(), digest(token), new Date(Date.now() + 180 * day)]
    );
    ctx.resHeaders.append("Set-Cookie", guestCookie(token));
    return { ready: true };
  });
}
export async function status(ctx: TrpcContext) {
  const [actor, setting] = await Promise.all([
    guest(ctx.req),
    rows(getPool(), "SELECT value FROM gb_settings WHERE key='writes_enabled'"),
  ]);
  return {
    ready: !!actor,
    owner: !!ctx.admin,
    writesEnabled: setting[0]?.value === "true",
  };
}
const postColumns =
  "p.id,p.nickname,p.body,p.created_at,p.admin_id IS NOT NULL AS owner,p.state,p.visitor_id=$2::uuid AS mine,(SELECT count(*)::int FROM gb_likes l WHERE l.post_id=p.id) AS likes,EXISTS(SELECT 1 FROM gb_likes l WHERE l.post_id=p.id AND l.visitor_id=$2::uuid) AS liked,(SELECT count(*)::int FROM gb_comments c WHERE c.post_id=p.id AND c.state='published') AS comments";
export async function imageViews(
  postIds: string[],
  db: Sql = getPool()
): Promise<Map<string, BoardImage[]>> {
  const images = await rows(
    db,
    "SELECT id,post_id,width,height FROM gb_media WHERE post_id=ANY($1::uuid[]) AND state='attached' ORDER BY created_at,id",
    [postIds]
  );
  const result = new Map<string, BoardImage[]>();
  for (const image of images) {
    const list = result.get(image.post_id) || [];
    list.push({
      id: image.id,
      url: "/api/guestbook/media/" + image.id,
      width: image.width,
      height: image.height,
    });
    result.set(image.post_id, list);
  }
  return result;
}
export async function feed(ctx: TrpcContext, cursor?: string) {
  const actor = await guest(ctx.req);
  const data = await rows(
    getPool(),
    "SELECT " +
      postColumns +
      " FROM gb_posts p WHERE (p.state='published' OR (p.state='held' AND p.visitor_id=$2::uuid)) AND ($1::uuid IS NULL OR (p.created_at,p.id)<(SELECT created_at,id FROM gb_posts WHERE id=$1)) ORDER BY p.created_at DESC,p.id DESC LIMIT 13",
    [cursor || null, actor?.id || null]
  );
  const hasMore = data.length > 12;
  const visible = data.slice(0, 12);
  const images = await imageViews(visible.map(p => p.id));
  const posts: BoardPost[] = visible.map(p => ({
    id: p.id,
    nickname: p.nickname,
    body: p.body,
    createdAt: p.created_at.toISOString(),
    owner: p.owner,
    mine: !!p.mine,
    state: p.state,
    images: images.get(p.id) || [],
    likes: p.likes,
    liked: p.liked,
    comments: p.comments,
  }));
  return {
    untrustedContent: true as const,
    posts,
    nextCursor: hasMore ? posts.at(-1)?.id : undefined,
  };
}
async function requirePost(db: Sql, id: string, actor?: Visitor) {
  const p = (await rows(db, "SELECT * FROM gb_posts WHERE id=$1", [id]))[0];
  if (
    !p ||
    (p.state !== "published" &&
      !(p.state === "held" && p.visitor_id === actor?.id))
  )
    throw new TRPCError({ code: "NOT_FOUND", message: "这条留言暂时不可见。" });
  return p;
}
export async function createPost(
  ctx: TrpcContext,
  input: {
    id: string;
    nickname: string;
    body: string;
    images: string[];
    website: string;
  }
) {
  rejectTrap(input.website);
  return write(ctx, "post", async (db, actor) => {
    const existing = (
      await rows(db, "SELECT id,state,visitor_id FROM gb_posts WHERE id=$1", [
        input.id,
      ])
    )[0];
    if (existing) {
      if (existing.visitor_id !== actor.id)
        throw new TRPCError({ code: "CONFLICT" });
      return { id: existing.id, state: existing.state };
    }
    const ids = [...new Set(input.images)];
    if (ids.length !== input.images.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "请勿重复添加同一张图片。",
      });
    const images = ids.length
      ? await rows(
          db,
          "SELECT * FROM gb_media WHERE id=ANY($1::uuid[]) AND visitor_id=$2 AND state='ready' AND post_id IS NULL AND expires_at>now() FOR UPDATE",
          [ids, actor.id]
        )
      : [];
    if (
      images.length !== ids.length ||
      images.reduce((n, i) => n + Number(i.final_size), 0) > 12 * 1024 * 1024
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "图片未上传完成、已失效或总大小超出限制，请重新选择。",
      });
    const flags = moderateText(input.nickname + "\n" + input.body);
    const state = flags.length ? "held" : "published";
    await db.query(
      "INSERT INTO gb_posts(id,visitor_id,admin_id,nickname,body,state,flags) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        input.id,
        actor.id,
        ctx.admin?.id || null,
        ctx.admin ? ctx.admin.displayName : input.nickname,
        input.body,
        state,
        JSON.stringify(flags),
      ]
    );
    if (ids.length)
      await db.query(
        "UPDATE gb_media SET post_id=$1,state='attached' WHERE id=ANY($2::uuid[])",
        [input.id, ids]
      );
    return { id: input.id, state };
  });
}
export async function setLike(ctx: TrpcContext, id: string, liked: boolean) {
  return write(ctx, "like", async (db, actor) => {
    await requirePost(db, id, actor);
    if (liked)
      await db.query(
        "INSERT INTO gb_likes(post_id,visitor_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [id, actor.id]
      );
    else
      await db.query(
        "DELETE FROM gb_likes WHERE post_id=$1 AND visitor_id=$2",
        [id, actor.id]
      );
    return {
      liked,
      likes: (
        await rows(
          db,
          "SELECT count(*)::int AS count FROM gb_likes WHERE post_id=$1",
          [id]
        )
      )[0].count,
    };
  });
}
export async function comments(
  ctx: TrpcContext,
  postId: string,
  cursor?: string
) {
  const actor = await guest(ctx.req);
  await requirePost(getPool(), postId, actor);
  const data = await rows(
    getPool(),
    "SELECT id,post_id,nickname,body,created_at,state,admin_id IS NOT NULL AS owner,visitor_id=$2::uuid AS mine FROM gb_comments WHERE post_id=$1 AND (state='published' OR (state='held' AND visitor_id=$2::uuid)) AND ($3::uuid IS NULL OR (created_at,id)>(SELECT created_at,id FROM gb_comments WHERE id=$3 AND post_id=$1)) ORDER BY created_at,id LIMIT 21",
    [postId, actor?.id || null, cursor || null]
  );
  const visible = data.slice(0, 20);
  const items: BoardComment[] = visible.map(c => ({
    id: c.id,
    postId: c.post_id,
    nickname: c.nickname,
    body: c.body,
    createdAt: c.created_at.toISOString(),
    owner: c.owner,
    mine: !!c.mine,
    state: c.state,
  }));
  return {
    untrustedContent: true as const,
    items,
    nextCursor: data.length > 20 ? items.at(-1)?.id : undefined,
  };
}
export async function addComment(
  ctx: TrpcContext,
  input: {
    id: string;
    postId: string;
    nickname: string;
    body: string;
    website: string;
  }
) {
  rejectTrap(input.website);
  return write(ctx, "comment", async (db, actor) => {
    await requirePost(db, input.postId, actor);
    const existing = (
      await rows(
        db,
        "SELECT id,state,visitor_id,post_id FROM gb_comments WHERE id=$1",
        [input.id]
      )
    )[0];
    if (existing) {
      if (existing.visitor_id !== actor.id || existing.post_id !== input.postId)
        throw new TRPCError({ code: "CONFLICT" });
      return { id: existing.id, state: existing.state };
    }
    const flags = moderateText(input.nickname + "\n" + input.body);
    const state = flags.length ? "held" : "published";
    await db.query(
      "INSERT INTO gb_comments(id,post_id,visitor_id,admin_id,nickname,body,state,flags) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        input.id,
        input.postId,
        actor.id,
        ctx.admin?.id || null,
        ctx.admin ? ctx.admin.displayName : input.nickname,
        input.body,
        state,
        JSON.stringify(flags),
      ]
    );
    return { id: input.id, state };
  });
}
export async function remove(
  ctx: TrpcContext,
  type: "post" | "comment",
  id: string
) {
  return write(ctx, "retract", async (db, actor) => {
    const table = type === "post" ? "gb_posts" : "gb_comments";
    const result = await rows(
      db,
      "UPDATE " +
        table +
        " SET state='deleted' WHERE id=$1 AND visitor_id=$2 AND state IN ('published','held','hidden') RETURNING id",
      [id, actor.id]
    );
    if (!result.length)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "只能撤回自己发布的内容。",
      });
    if (type === "post")
      await db.query(
        "UPDATE gb_media SET state='purging' WHERE post_id=$1 AND state<>'expired'",
        [id]
      );
    return { ok: true };
  });
}
export async function report(
  ctx: TrpcContext,
  input: { type: "post" | "comment"; id: string; reason: string }
) {
  return write(ctx, "report", async (db, actor) => {
    if (input.type === "post") await requirePost(db, input.id);
    else {
      const c = (
        await rows(
          db,
          "SELECT c.id FROM gb_comments c JOIN gb_posts p ON p.id=c.post_id WHERE c.id=$1 AND c.state='published' AND p.state='published'",
          [input.id]
        )
      )[0];
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
    }
    await db.query(
      "INSERT INTO gb_reports(id,visitor_id,target_type,target_id,reason) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      [randomUUID(), actor.id, input.type, input.id, input.reason]
    );
    return { ok: true };
  });
}
export async function adminList(ctx: TrpcContext) {
  if (!ctx.admin) throw new TRPCError({ code: "UNAUTHORIZED" });
  const data = await rows<ModerationRow>(
    getPool(),
    "SELECT p.id,p.id AS post_id,p.nickname,p.body,p.created_at,p.state,p.flags,p.visitor_id,p.admin_id IS NOT NULL AS owner,v.blocked_until,(SELECT count(*)::int FROM gb_media m WHERE m.post_id=p.id AND m.state<>'expired') AS media_count,(SELECT count(*)::int FROM gb_reports r WHERE r.target_type='post' AND r.target_id=p.id AND r.resolved_at IS NULL) AS reports FROM gb_posts p JOIN gb_visitors v ON v.id=p.visitor_id ORDER BY reports DESC,(p.state='held') DESC,p.created_at DESC LIMIT 100"
  );
  const children = await rows<ModerationRow>(
    getPool(),
    "SELECT c.id,c.post_id,c.nickname,c.body,c.created_at,c.state,c.flags,c.visitor_id,v.blocked_until,(SELECT count(*)::int FROM gb_reports r WHERE r.target_type='comment' AND r.target_id=c.id AND r.resolved_at IS NULL) AS reports FROM gb_comments c JOIN gb_visitors v ON v.id=c.visitor_id ORDER BY reports DESC,(c.state='held') DESC,c.created_at DESC LIMIT 200"
  );
  const images = await imageViews(data.map(p => p.id));
  return {
    untrustedContent: true as const,
    posts: data.map(p => ({ ...p, images: images.get(p.id) || [] })),
    comments: children,
    writesEnabled:
      (
        await rows(
          getPool(),
          "SELECT value FROM gb_settings WHERE key='writes_enabled'"
        )
      )[0]?.value === "true",
  };
}
export async function moderate(
  ctx: TrpcContext,
  type: "post" | "comment",
  id: string,
  state: "published" | "hidden"
) {
  assertSameOrigin(ctx.req);
  if (!ctx.admin) throw new TRPCError({ code: "UNAUTHORIZED" });
  return locked(async db => {
    if (
      type === "post" &&
      state === "published" &&
      (
        await rows(
          db,
          "SELECT id FROM gb_media WHERE post_id=$1 AND state='purging' LIMIT 1",
          [id]
        )
      ).length
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "图片正在清理，请稍后再公开。",
      });
    const table = type === "post" ? "gb_posts" : "gb_comments";
    if (
      !(
        await rows(
          db,
          "UPDATE " +
            table +
            " SET state=$2 WHERE id=$1 AND state<>'deleted' RETURNING id",
          [id, state]
        )
      ).length
    )
      throw new TRPCError({ code: "NOT_FOUND" });
    await db.query(
      "UPDATE gb_reports SET resolved_at=now() WHERE target_type=$1 AND target_id=$2",
      [type, id]
    );
    return { ok: true };
  });
}
export async function block(
  ctx: TrpcContext,
  visitorId: string,
  blocked: boolean
) {
  assertSameOrigin(ctx.req);
  if (!ctx.admin) throw new TRPCError({ code: "UNAUTHORIZED" });
  await getPool().query("UPDATE gb_visitors SET blocked_until=$2 WHERE id=$1", [
    visitorId,
    blocked ? new Date(Date.now() + 7 * day) : null,
  ]);
  return { ok: true };
}
export async function settings(ctx: TrpcContext, enabled: boolean) {
  assertSameOrigin(ctx.req);
  if (!ctx.admin) throw new TRPCError({ code: "UNAUTHORIZED" });
  await getPool().query(
    "UPDATE gb_settings SET value=$1 WHERE key='writes_enabled'",
    [String(enabled)]
  );
  return { ok: true };
}
