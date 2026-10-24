import { assertSameOrigin } from "./security";
import { z } from "zod";
import { adminQuery, createRouter, publicQuery } from "../middleware";
import {
  postInput,
  commentInput,
  reportInput,
  IMAGE_TYPES,
  IMAGE_MAX_BYTES,
} from "@contracts/guestbook";
import * as service from "./service";
import {
  prepareImage,
  finalizeImage,
  cleanupMedia,
  purgePostImages,
} from "./media";
const target = z.object({ type: z.enum(["post", "comment"]), id: z.uuid() });
export const guestbookRouter = createRouter({
  status: publicQuery.query(({ ctx }) => service.status(ctx)),
  identity: publicQuery
    .input(z.object({ website: z.string().max(200).default("") }))
    .mutation(({ ctx, input }) => service.identity(ctx, input.website)),
  feed: publicQuery
    .input(z.object({ cursor: z.uuid().optional() }).optional())
    .query(({ ctx, input }) => service.feed(ctx, input?.cursor)),
  createPost: publicQuery
    .input(postInput)
    .mutation(({ ctx, input }) => service.createPost(ctx, input)),
  setLike: publicQuery
    .input(z.object({ id: z.uuid(), liked: z.boolean() }))
    .mutation(({ ctx, input }) => service.setLike(ctx, input.id, input.liked)),
  comments: publicQuery
    .input(z.object({ postId: z.uuid(), cursor: z.uuid().optional() }))
    .query(({ ctx, input }) =>
      service.comments(ctx, input.postId, input.cursor)
    ),
  comment: publicQuery
    .input(commentInput)
    .mutation(({ ctx, input }) => service.addComment(ctx, input)),
  remove: publicQuery
    .input(target)
    .mutation(({ ctx, input }) => service.remove(ctx, input.type, input.id)),
  report: publicQuery
    .input(reportInput)
    .mutation(({ ctx, input }) => service.report(ctx, input)),
  prepareImage: publicQuery
    .input(
      z.object({
        mime: z.enum(IMAGE_TYPES),
        size: z.number().int().positive().max(IMAGE_MAX_BYTES),
      })
    )
    .mutation(({ ctx, input }) => prepareImage(ctx, input)),
  finalizeImage: publicQuery
    .input(z.object({ id: z.uuid() }))
    .mutation(({ ctx, input }) => finalizeImage(ctx, input.id)),
  adminList: adminQuery.query(({ ctx }) => service.adminList(ctx)),
  moderate: adminQuery
    .input(target.extend({ state: z.enum(["published", "hidden"]) }))
    .mutation(({ ctx, input }) =>
      service.moderate(ctx, input.type, input.id, input.state)
    ),
  block: adminQuery
    .input(z.object({ visitorId: z.uuid(), blocked: z.boolean() }))
    .mutation(({ ctx, input }) =>
      service.block(ctx, input.visitorId, input.blocked)
    ),
  settings: adminQuery
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ ctx, input }) => service.settings(ctx, input.enabled)),
  purgeImages: adminQuery
    .input(z.object({ postId: z.uuid() }))
    .mutation(({ ctx, input }) => purgePostImages(ctx, input.postId)),
  cleanup: adminQuery.mutation(async ({ ctx }) => {
    assertSameOrigin(ctx.req);
    await cleanupMedia(true);
    return { ok: true };
  }),
});
