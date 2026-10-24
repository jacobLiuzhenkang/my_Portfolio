import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("./lib/env", () => ({ env: { isProduction: true, databaseUrl: "" } }));
vi.mock("./queries/connection", () => ({ getDb: state.db }));
import { authRouter } from "./authRouter";

beforeEach(() => state.db.mockReset());
describe("production administrator initialization", () => {
  it("cannot be claimed by the first public visitor", async () => {
    const caller = authRouter.createCaller({ req: new Request("https://portfolio.test/api/trpc"), resHeaders: new Headers(), admin: undefined });
    await expect(caller.setup({ username: "attacker", password: "a-strong-test-password" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.db).not.toHaveBeenCalled();
  });
  it("rejects cross-site credential mutations before touching the database", async () => {
    const caller = authRouter.createCaller({ req: new Request("https://portfolio.test/api/trpc", { headers: { origin: "https://another.test" } }), resHeaders: new Headers(), admin: undefined });
    await expect(caller.login({ username: "jacob", password: "a-strong-test-password" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.db).not.toHaveBeenCalled();
  });
});
