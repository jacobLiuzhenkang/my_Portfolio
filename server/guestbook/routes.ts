import { Hono } from "hono";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAdminFromRequest } from "../auth";
import { localUpload, publicImage } from "./media";
export const guestbookRoutes = new Hono();
guestbookRoutes.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "no-store");
  await next();
});
guestbookRoutes.put("/uploads/:id", async c => {
  const id = z.uuid().parse(c.req.param("id"));
  return c.json(await localUpload(c.req.raw, id, c.req.query("token") || ""));
});
guestbookRoutes.get("/media/:id", async c => {
  const id = z.uuid().parse(c.req.param("id"));
  const result = await publicImage(
    c.req.raw,
    id,
    !!(await getAdminFromRequest(c.req.raw))
  );
  if (result.url) return c.redirect(result.url, 302);
  return c.body(new Uint8Array(result.bytes!), 200, {
    "Content-Type": "image/webp",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "X-Content-Type-Options": "nosniff",
  });
});
guestbookRoutes.onError((error, c) => {
  const status =
    error instanceof TRPCError
      ? (
          {
            NOT_FOUND: 404,
            FORBIDDEN: 403,
            UNAUTHORIZED: 401,
            CONFLICT: 409,
            PAYLOAD_TOO_LARGE: 413,
          } as const
        )[error.code as "NOT_FOUND"] || 400
      : 400;
  return c.json(
    { error: status === 404 ? "图片暂时不可见。" : "图片请求未通过校验。" },
    status as 400
  );
});
