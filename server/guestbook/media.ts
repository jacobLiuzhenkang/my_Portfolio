import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../context";
import { getPool } from "../queries/connection";
import { storage } from "../lib/storage";
import { env } from "../lib/env";
import {
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  type BoardImage,
} from "@contracts/guestbook";
import { guest, locked, rows, write } from "./service";
import { assertSameOrigin, digest } from "./security";

sharp.cache(false);
sharp.concurrency(1);
export const SOURCE_LEASE_MS = 6 * 60_000;
export function sourceLeaseExpired(createdAt: Date, now = Date.now()) {
  return createdAt.getTime() + SOURCE_LEASE_MS < now;
}
export function mediaNamespace() {
  return process.env.VERCEL_ENV === "production"
    ? "production/guestbook/"
    : process.env.VERCEL_ENV === "preview"
      ? "preview-" +
        digest(
          process.env.VERCEL_GIT_COMMIT_REF ||
            process.env.VERCEL_GIT_COMMIT_SHA ||
            "preview"
        ).slice(0, 12) +
        "/guestbook/"
      : "local/guestbook/";
}
export function localMedia() {
  return (
    !env.isProduction &&
    !process.env.BLOB_STORE_ID &&
    !process.env.BLOB_READ_WRITE_TOKEN
  );
}
function disk(key: string) {
  if (
    !key.startsWith(mediaNamespace()) ||
    key.includes("..") ||
    !/^[-a-zA-Z0-9/._]+$/.test(key)
  )
    throw new Error("Invalid guestbook object key");
  const root = path.resolve(
    process.env.GUESTBOOK_LOCAL_MEDIA_DIR || "/tmp/portfolio-guestbook"
  );
  const file = path.resolve(root, key);
  if (!file.startsWith(root + path.sep))
    throw new Error("Invalid guestbook object path");
  return file;
}
async function erase(key: string) {
  if (!key.startsWith(mediaNamespace()))
    throw new Error("Cross-environment media deletion rejected");
  if (localMedia()) await rm(disk(key), { force: true });
  else await storage.deleteFile({ fileKey: key });
}
export async function boundedBytes(
  body: ReadableStream<Uint8Array> | null,
  max: number
) {
  if (!body)
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片内容为空。" });
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) {
        await reader.cancel();
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "图片不能超过2 MB。",
        });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!total)
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片内容为空。" });
  return Buffer.concat(chunks, total);
}
export async function normalizeImage(bytes: Buffer, mime: string) {
  try {
    const matches =
      mime === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : mime === "image/webp" &&
            bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP";
    if (!matches) throw new Error("Unsupported raster signature");
    const input = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
      animated: false,
    });
    const metadata = await input.metadata();
    const expected: { [key: string]: string } = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (
      metadata.format !== expected[mime] ||
      (metadata.pages || 1) > 1 ||
      !metadata.width ||
      !metadata.height
    )
      throw new Error("Unsupported image");
    for (const quality of [82, 68]) {
      const output = await sharp(bytes, {
        limitInputPixels: 20_000_000,
        failOn: "warning",
        animated: false,
      })
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 3 })
        .timeout({ seconds: 6 })
        .toBuffer({ resolveWithObject: true });
      if (output.data.length <= IMAGE_MAX_BYTES)
        return {
          bytes: output.data,
          width: output.info.width,
          height: output.info.height,
        };
    }
  } catch {
    /* Do not echo decoder internals or file contents. */
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "无法识别这张图片，请换一张 JPG、PNG 或 WebP 图片。",
  });
}
export async function cleanupMedia(force = false) {
  const prefix = mediaNamespace();
  const tasks = await locked(async db => {
    const last = (
      await rows(db, "SELECT value FROM gb_settings WHERE key='cleanup_at'")
    )[0]?.value;
    if (!force && last && Date.now() - Number(last) < 5 * 60_000) return [];
    await db.query(
      "INSERT INTO gb_settings(key,value) VALUES('cleanup_at',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",
      [String(Date.now())]
    );
    return rows(
      db,
      "SELECT * FROM gb_media WHERE source_key LIKE $1 AND created_at<$2 AND ((post_id IS NULL AND expires_at<now() AND state<>'expired') OR state='purging' OR (state IN ('ready','attached') AND reserved_bytes>final_size)) ORDER BY created_at LIMIT 8",
      [prefix + "%", new Date(Date.now() - SOURCE_LEASE_MS)]
    );
  });
  for (const item of tasks) {
    try {
      if (item.state === "purging") {
        await erase(item.source_key);
        await erase(item.final_key);
        await getPool().query(
          "UPDATE gb_media SET state='expired',reserved_bytes=0 WHERE id=$1 AND state='purging'",
          [item.id]
        );
      } else if (
        item.post_id === null &&
        new Date(item.expires_at) < new Date()
      ) {
        const claim = await rows(
          getPool(),
          "UPDATE gb_media SET state='cleaning' WHERE id=$1 AND post_id IS NULL AND expires_at<now() RETURNING id",
          [item.id]
        );
        if (!claim.length) continue;
        await erase(item.source_key);
        await erase(item.final_key);
        await getPool().query(
          "UPDATE gb_media SET state='expired',reserved_bytes=0 WHERE id=$1 AND state='cleaning'",
          [item.id]
        );
      } else {
        await erase(item.source_key);
        await getPool().query(
          "UPDATE gb_media SET reserved_bytes=final_size WHERE id=$1 AND state IN ('ready','attached')",
          [item.id]
        );
      }
    } catch {
      /* Reservation stays charged until cleanup has succeeded. */
    }
  }
}
export async function prepareImage(
  ctx: TrpcContext,
  input: { mime: (typeof IMAGE_TYPES)[number]; size: number }
) {
  assertSameOrigin(ctx.req);
  if (!(await guest(ctx.req))) throw new TRPCError({ code: "UNAUTHORIZED" });
  await cleanupMedia();
  const token = randomBytes(32).toString("base64url");
  const item = await write(ctx, "image", async (db, actor) => {
    const used = Number(
      (
        await rows(
          db,
          "SELECT COALESCE(sum(reserved_bytes),0) AS used FROM gb_media WHERE state<>'expired'"
        )
      )[0].used
    );
    if (used + input.size + IMAGE_MAX_BYTES > 700 * 1024 * 1024)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "图片空间暂时不足，可以先发文字留言。",
      });
    const id = randomUUID(),
      prefix = mediaNamespace() + actor.id + "/" + id + "/";
    const record = {
      id,
      sourceKey: prefix + "source",
      finalKey: prefix + "image.webp",
      visitorId: actor.id,
    };
    await db.query(
      "INSERT INTO gb_media(id,visitor_id,source_key,final_key,mime,size,reserved_bytes,upload_token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        id,
        actor.id,
        record.sourceKey,
        record.finalKey,
        input.mime,
        input.size,
        input.size + IMAGE_MAX_BYTES,
        digest(token),
        new Date(Date.now() + 30 * 60_000),
      ]
    );
    return record;
  });
  const url = localMedia()
    ? "/api/guestbook/uploads/" + item.id + "?token=" + token
    : (
        await storage.createUploadUrl({
          key: item.sourceKey,
          contentType: input.mime,
          maximumSizeInBytes: input.size,
        })
      ).url;
  return { id: item.id, url };
}
export async function localUpload(req: Request, id: string, token: string) {
  if (!localMedia()) throw new TRPCError({ code: "NOT_FOUND" });
  assertSameOrigin(req);
  const actor = await guest(req);
  const item = (
    await rows(
      getPool(),
      "SELECT * FROM gb_media WHERE id=$1 AND visitor_id=$2 AND state='reserved' AND expires_at>now() AND created_at>now()-interval '5 minutes'",
      [id, actor?.id || null]
    )
  )[0];
  if (
    !item ||
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    digest(token) !== item.upload_token_hash
  )
    throw new TRPCError({ code: "FORBIDDEN" });
  if (req.headers.get("content-type") !== item.mime)
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片类型不匹配。" });
  const bytes = await boundedBytes(
    req.body,
    Math.min(item.size, IMAGE_MAX_BYTES)
  );
  if (bytes.length !== item.size)
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片上传不完整。" });
  const file = disk(item.source_key);
  await mkdir(path.dirname(file), { recursive: true });
  try {
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    throw new TRPCError({
      code: "CONFLICT",
      message: "图片已经上传，请勿重复上传。",
    });
  }
  return { ok: true };
}
export async function finalizeImage(
  ctx: TrpcContext,
  id: string
): Promise<BoardImage> {
  assertSameOrigin(ctx.req);
  const actor = await guest(ctx.req);
  if (!actor) throw new TRPCError({ code: "UNAUTHORIZED" });
  const item = await write(ctx, "decode", async (db, actor) => {
    const value = (
      await rows(
        db,
        "SELECT * FROM gb_media WHERE id=$1 AND visitor_id=$2 FOR UPDATE",
        [id, actor.id]
      )
    )[0];
    if (
      !value ||
      !value.source_key.startsWith(mediaNamespace()) ||
      value.expires_at < new Date() ||
      !["reserved", "ready"].includes(value.state)
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "图片未完成或已过期，请重新选择。",
      });
    if (actor.blocked_until && actor.blocked_until > new Date())
      throw new TRPCError({ code: "FORBIDDEN" });
    if (value.state === "reserved")
      await db.query("UPDATE gb_media SET state='processing' WHERE id=$1", [
        id,
      ]);
    return value;
  });
  if (item.state === "ready")
    return {
      id,
      url: "/api/guestbook/media/" + id,
      width: item.width,
      height: item.height,
    };
  try {
    let bytes: Buffer;
    if (localMedia()) {
      if ((await stat(disk(item.source_key))).size !== item.size)
        throw new Error("Size mismatch");
      bytes = await readFile(disk(item.source_key));
    } else {
      const info = await storage.headFile(item.source_key);
      if (info.size !== item.size || info.contentType !== item.mime)
        throw new Error("Invalid stored image");
      const response = await fetch(
        (await storage.getPresignedUrl({ key: item.source_key })).url,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!response.ok) throw new Error("Image unavailable");
      bytes = await boundedBytes(response.body, IMAGE_MAX_BYTES);
    }
    if (bytes.length !== item.size || bytes.length > IMAGE_MAX_BYTES)
      throw new Error("Invalid image length");
    const clean = await normalizeImage(bytes, item.mime);
    if (localMedia()) {
      await mkdir(path.dirname(disk(item.final_key)), { recursive: true });
      await writeFile(disk(item.final_key), clean.bytes, { mode: 0o600 });
    } else
      await put(item.final_key, clean.bytes, {
        access: "private",
        contentType: "image/webp",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    await getPool().query(
      "UPDATE gb_media SET state='ready',width=$2,height=$3,final_size=$4,reserved_bytes=size+$4,expires_at=$5 WHERE id=$1 AND state='processing'",
      [
        id,
        clean.width,
        clean.height,
        clean.bytes.length,
        new Date(Date.now() + 2 * 3600000),
      ]
    );
    try {
      // Keep the source while its PUT capability is live, so it cannot be recreated outside the budget.
      if (!sourceLeaseExpired(new Date(item.created_at)))
        return {
          id,
          url: "/api/guestbook/media/" + id,
          width: clean.width,
          height: clean.height,
        };
      await erase(item.source_key);
      await getPool().query(
        "UPDATE gb_media SET reserved_bytes=final_size WHERE id=$1 AND state='ready'",
        [id]
      );
    } catch {
      /* Cleanup will retry; quota remains reserved. */
    }
    return {
      id,
      url: "/api/guestbook/media/" + id,
      width: clean.width,
      height: clean.height,
    };
  } catch (error) {
    await getPool().query(
      "UPDATE gb_media SET state='reserved' WHERE id=$1 AND state='processing'",
      [id]
    );
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "图片校验未通过或上传中断，请重新选择图片。",
    });
  }
}
export async function publicImage(req: Request, id: string, admin: boolean) {
  const actor = await guest(req);
  const item = (
    await rows(
      getPool(),
      "SELECT m.*,p.state AS post_state FROM gb_media m LEFT JOIN gb_posts p ON p.id=m.post_id WHERE m.id=$1 AND m.state IN ('ready','attached')",
      [id]
    )
  )[0];
  if (!item) throw new TRPCError({ code: "NOT_FOUND" });
  const publicPost = item.post_state === "published";
  const ownDraft =
    item.visitor_id === actor?.id &&
    ((item.state === "ready" && item.expires_at > new Date()) ||
      item.post_state === "held");
  if (!publicPost && !ownDraft && !admin)
    throw new TRPCError({ code: "NOT_FOUND" });
  if (localMedia()) return { bytes: await readFile(disk(item.final_key)) };
  return { url: (await storage.getPresignedUrl({ key: item.final_key })).url };
}

export async function purgePostImages(ctx: TrpcContext, postId: string) {
  assertSameOrigin(ctx.req);
  if (!ctx.admin) throw new TRPCError({ code: "UNAUTHORIZED" });
  const items = await locked(async db => {
    const post = (
      await rows(db, "SELECT state FROM gb_posts WHERE id=$1 FOR UPDATE", [
        postId,
      ])
    )[0];
    if (!post || !["hidden", "deleted"].includes(post.state))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "先隐藏或撤回留言，再清理图片。",
      });
    const media = await rows(
      db,
      "SELECT * FROM gb_media WHERE post_id=$1 AND state<>'expired' FOR UPDATE",
      [postId]
    );
    if (media.some(item => !item.source_key.startsWith(mediaNamespace())))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "请在文件所属环境清理图片。",
      });
    await db.query(
      "UPDATE gb_media SET state='purging' WHERE post_id=$1 AND state<>'expired'",
      [postId]
    );
    return media;
  });
  for (const item of items) await erase(item.final_key);
  await cleanupMedia(true);
  return {
    ok: true,
    pending: !!(
      await rows(
        getPool(),
        "SELECT id FROM gb_media WHERE post_id=$1 AND state='purging' LIMIT 1",
        [postId]
      )
    ).length,
  };
}
