import { expect, it, vi } from "vitest";
import type { Admin } from "@db/schema";
import { analyticsRouter } from "./router";
vi.mock("../queries/connection", () => ({
  getDb: () => {
    throw new Error("Database must not be reached");
  },
}));
const context = {
  req: new Request("http://localhost"),
  resHeaders: new Headers(),
};
it("rejects unauthenticated project queries", async () => {
  await expect(
    analyticsRouter.createCaller(context).project({ slug: "example" })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
it("rejects invalid, reversed and oversized dates before querying", async () => {
  const caller = analyticsRouter.createCaller({
    ...context,
    admin: { id: 1 } as Admin,
  });
  for (const [from, to] of [
    ["2026-02-30", "2026-03-01"],
    ["2026-10-02", "2026-10-01"],
    ["2020-01-01", "2026-10-01"],
  ]) {
    await expect(
      caller.project({ slug: "example", from, to })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  }
});
