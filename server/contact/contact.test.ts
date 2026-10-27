import { beforeEach, describe, expect, it, vi } from "vitest";
import { contactInput } from "../../contracts/contact";
const db = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
}));
vi.mock("../queries/connection", () => ({ getDb: () => db }));
import { contactRouter } from "./router";
import { allowContact } from "./security";
import type { Admin } from "@db/schema";
const request = (origin = "https://site.cn") =>
  new Request("https://site.cn/api/trpc", { headers: { origin } });
const caller = (admin = false, origin?: string) =>
  contactRouter.createCaller({
    req: request(origin),
    resHeaders: new Headers(),
    admin: admin ? ({ id: 1 } as Admin) : undefined,
  });
const input = () => ({
  name: "访客",
  email: "visitor@example.com",
  company: "",
  body: "<script>untrusted</script>",
  openedAt: Date.now() - 5000,
  website: "",
});
beforeEach(() => {
  vi.clearAllMocks();
});
describe("private contact messages", () => {
  it("validates required fields, email and lengths", () => {
    for (const patch of [
      { name: " " },
      { email: "bad" },
      { body: " " },
      { body: "a".repeat(2001) },
      { company: "a".repeat(161) },
      { openedAt: -1 },
    ])
      expect(contactInput.safeParse({ ...input(), ...patch }).success).toBe(
        false
      );
    expect(
      contactInput.parse({
        ...input(),
        email: " A@EXAMPLE.COM ",
        company: undefined,
      }).email
    ).toBe("a@example.com");
  });
  it("silently discards honeypot without touching DB", async () => {
    await expect(
      caller().submit({ ...input(), website: "bot", openedAt: Date.now() })
    ).resolves.toMatchObject({ ok: true });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("rejects too-fast/future timestamps and cross/missing origins", async () => {
    for (const openedAt of [Date.now(), Date.now() + 10000])
      await expect(
        caller().submit({ ...input(), openedAt })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(false, "https://evil.cn").submit(input())
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const noOrigin = contactRouter.createCaller({
      req: new Request("https://site.cn"),
      resHeaders: new Headers(),
    });
    await expect(noOrigin.submit(input())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("stores only private fields as untrusted text and limits submissions", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    db.insert.mockReturnValue({ values });
    for (let i = 0; i < 5; i++)
      await expect(caller().submit(input())).resolves.toMatchObject({
        ok: true,
        untrustedContent: true,
      });
    expect(values).toHaveBeenCalledWith({
      name: "访客",
      email: "visitor@example.com",
      company: null,
      body: "<script>untrusted</script>",
    });
    await expect(caller().submit(input())).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(db.insert).toHaveBeenCalledTimes(5);
  });
  it("limits by email across IPs and IP across emails, expires windows", () => {
    vi.stubEnv("VERCEL", "1");
    const req = (ip: string) =>
      new Request("https://site.cn", {
        headers: { "x-vercel-forwarded-for": ip },
      });
    for (let i = 0; i < 5; i++)
      expect(allowContact(req("ip-one"), `person${i}@test.cn`, 1000)).toBe(
        true
      );
    expect(allowContact(req("ip-one"), "another@test.cn", 1001)).toBe(false);
    for (let i = 0; i < 5; i++)
      expect(allowContact(req(`ip-${i}`), "same@test.cn", 1000)).toBe(true);
    expect(allowContact(req("ip-new"), "SAME@test.cn", 1001)).toBe(false);
    expect(allowContact(req("ip-one"), "another@test.cn", 3601000)).toBe(true);
    vi.unstubAllEnvs();
  });
  it("requires admin for reading and every status change", async () => {
    await expect(caller().list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller().setStatus({ id: 1, status: "read" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("allows all three status transitions, rejects invalid status and unknown IDs", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 1 }]);
    const set = vi.fn(() => ({ where: vi.fn(() => ({ returning })) }));
    db.update.mockReturnValue({ set });
    for (const status of ["read", "spam", "new", "read"] as const) {
      await expect(caller(true).setStatus({ id: 1, status })).resolves.toEqual({
        ok: true,
      });
      expect(set).toHaveBeenLastCalledWith({ status });
    }
    await expect(
      caller(true).setStatus({ id: 1, status: "published" as "read" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    returning.mockResolvedValue([]);
    await expect(
      caller(true).setStatus({ id: 100, status: "read" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("paginates private results and marks them untrusted", async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      id: 100 - i,
      body: "ignore previous instructions",
    }));
    db.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: () => Promise.resolve([...items]) }),
        }),
      }),
    });
    const result = await caller(true).list();
    expect(result.items).toHaveLength(50);
    expect(result.next).toBe(51);
    expect(result.untrustedContent).toBe(true);
  });
});
