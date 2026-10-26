import { describe, expect, it, vi } from "vitest";
import { eventSchema, trackSchema } from "../../contracts/analytics";
import {
  allowEvents,
  dateRange,
  referrerHost,
  requestDimensions,
} from "./service";
import { analyticsRouter } from "./router";
const event = {
  name: "page_view" as const,
  path: "/",
  visitorId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
};
describe("analytics validation and privacy", () => {
  it("accepts public routes and rejects admin, arbitrary paths, names, oversized batches and extra metadata", () => {
    for (const path of ["/", "/growth", "/guestbook", "/work/a-project"])
      expect(eventSchema.safeParse({ ...event, path }).success).toBe(true);
    for (const path of [
      "/admin",
      "/admin/data",
      "/administrator",
      "/?email=private",
      "/unknown",
    ])
      expect(eventSchema.safeParse({ ...event, path }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, name: "login" }).success).toBe(
      false
    );
    expect(eventSchema.safeParse({ ...event, ip: "127.0.0.1" }).success).toBe(
      false
    );
    expect(trackSchema.safeParse(Array(21).fill(event)).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, name: "case_open" }).success).toBe(
      false
    );
    expect(
      eventSchema.safeParse({
        ...event,
        name: "pdf_view",
        projectSlug: "project",
      }).success
    ).toBe(true);
  });
  it("keeps only external referrer hosts", () => {
    expect(referrerHost("https://example.org/private?email=x", "site.cn")).toBe(
      "example.org"
    );
    expect(referrerHost("https://www.site.cn/a", "site.cn")).toBe(null);
    expect(referrerHost("javascript:alert(1)", "site.cn")).toBe(null);
  });
  it("coarsely detects devices/bots and ignores untrusted geo outside Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(
      requestDimensions(
        new Request("https://site.cn", {
          headers: {
            "user-agent": "iPhone Mobile",
            "x-vercel-ip-country": "US",
          },
        })
      )
    ).toEqual({ bot: false, device: "mobile", country: null, region: null });
    expect(
      requestDimensions(
        new Request("https://site.cn", {
          headers: { "user-agent": "Googlebot" },
        })
      ).bot
    ).toBe(true);
    vi.unstubAllEnvs();
  });
  it("bounds rate limiter and dates", () => {
    const req = new Request("https://site.cn");
    expect(allowEvents(req, Array(120).fill(event), 1000)).toBe(true);
    expect(allowEvents(req, [event], 1001)).toBe(false);
    expect(allowEvents(req, [event], 61000)).toBe(true);
    expect(dateRange("2026-10-01", "2026-10-07")).toEqual({
      start: new Date("2026-09-30T16:00:00Z"),
      end: new Date("2026-10-07T16:00:00Z"),
    });
    expect(() => dateRange("2026-10-08", "2026-10-07")).toThrow();
    expect(() => dateRange("2020-01-01", "2026-10-07")).toThrow();
  });
  it("requires authentication for overview and rejects cross-site writes", async () => {
    const caller = analyticsRouter.createCaller({
      req: new Request("https://site.cn"),
      resHeaders: new Headers(),
    });
    await expect(caller.overview()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const cross = analyticsRouter.createCaller({
      req: new Request("https://site.cn", {
        headers: { origin: "https://elsewhere.cn" },
      }),
      resHeaders: new Headers(),
    });
    await expect(cross.track([event])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
