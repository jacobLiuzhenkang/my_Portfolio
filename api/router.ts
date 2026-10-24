import { authRouter } from "./authRouter";
import { contentRouter } from "./contentRouter";
import { createRouter, publicQuery } from "./middleware";
import { storageRouter } from "./storageRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  content: contentRouter,
  storage: storageRouter,
});

export type AppRouter = typeof appRouter;
