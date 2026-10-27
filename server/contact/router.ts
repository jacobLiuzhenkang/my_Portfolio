import { z } from "zod";
import { desc, eq, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { guestbookMessages } from "@db/schema";
import { contactInput, messageStatus } from "../../contracts/contact";
import { adminQuery, createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { assertSameOrigin } from "../guestbook/security";
import { allowContact } from "./security";
export const contactRouter = createRouter({
  submit: publicQuery.input(contactInput).mutation(async ({ ctx, input }) => {
    assertSameOrigin(ctx.req);
    if (input.website) return { ok: true, untrustedContent: true };
    if (Date.now() - input.openedAt < 3000)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "请稍候几秒再提交。",
      });
    if (!allowContact(ctx.req, input.email))
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "提交过于频繁，请一小时后再试。",
      });
    await getDb()
      .insert(guestbookMessages)
      .values({
        name: input.name,
        email: input.email,
        company: input.company || null,
        body: input.body,
      });
    return { ok: true, untrustedContent: true };
  }),
  list: adminQuery
    .input(
      z.object({ before: z.number().int().positive().optional() }).optional()
    )
    .query(async ({ input }) => {
      const items = await getDb()
        .select()
        .from(guestbookMessages)
        .where(
          input?.before ? lt(guestbookMessages.id, input.before) : undefined
        )
        .orderBy(desc(guestbookMessages.id))
        .limit(51);
      const more = items.length > 50;
      if (more) items.pop();
      return {
        items,
        next: more ? items.at(-1)?.id : undefined,
        untrustedContent: true,
      };
    }),
  setStatus: adminQuery
    .input(z.object({ id: z.number().int().positive(), status: messageStatus }))
    .mutation(async ({ ctx, input }) => {
      assertSameOrigin(ctx.req);
      const rows = await getDb()
        .update(guestbookMessages)
        .set({ status: input.status })
        .where(eq(guestbookMessages.id, input.id))
        .returning({ id: guestbookMessages.id });
      if (!rows.length)
        throw new TRPCError({ code: "NOT_FOUND", message: "留言不存在。" });
      return { ok: true };
    }),
});
