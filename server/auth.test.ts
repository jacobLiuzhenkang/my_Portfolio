import { describe, expect, it, vi } from "vitest";
const getDb = vi.hoisted(() => vi.fn());
vi.mock("./queries/connection", () => ({ getDb }));
import { getAdminFromRequest } from "./auth";

describe("invalid session cookies", () => {
  it("keeps malformed cookies from breaking public content", async () => {
    for (const cookie of ["lz_admin_session=%", "lz_admin_session=short", "other=value"]) {
      await expect(getAdminFromRequest(new Request("https://portfolio.test", { headers: { cookie } }))).resolves.toBeUndefined();
    }
    expect(getDb).not.toHaveBeenCalled();
  });
});
