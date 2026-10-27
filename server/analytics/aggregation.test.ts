import { afterAll, beforeAll, expect, it } from "vitest";
import { getDb, getPool } from "../queries/connection";
import { analyticsEvents } from "@db/schema";
import { analyticsRouter } from "./router";
import type { Admin } from "@db/schema";
import { readFile } from "node:fs/promises";
// Dedicated disposable Docker database only. Never point this at production.
const enabled = process.env.ANALYTICS_TEST_DB === "1";
beforeAll(async () => {
  if (!enabled) return;
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    !["127.0.0.1", "localhost", "postgres"].includes(url.hostname) ||
    url.pathname !== "/analytics_test"
  )
    throw new Error(
      "Integration tests require a disposable local analytics_test database"
    );
  await getPool().query(await readFile("db/analytics.sql", "utf8"));
  await getPool().query("TRUNCATE analytics_events");
  await getPool().query(
    "CREATE TABLE IF NOT EXISTS projects (id serial PRIMARY KEY, title varchar(180) NOT NULL, published boolean DEFAULT true)"
  );
});
afterAll(async () => {
  if (enabled) await getPool().end();
});
it.skipIf(!enabled)(
  "aggregates interval UV/PV, daily gaps, project, source and region in Postgres",
  async () => {
    const base = {
      path: "/",
      visitorId: "visitor-a",
      device: "desktop",
      occurredAt: new Date("2026-01-01T12:00:00Z"),
    };
    await getDb()
      .insert(analyticsEvents)
      .values([
        { ...base, name: "page_view" },
        { ...base, name: "page_view" },
        { ...base, name: "case_open", projectSlug: "example" },
        { ...base, name: "pdf_view", projectSlug: "example" },
        {
          ...base,
          name: "page_view",
          visitorId: "visitor-b",
          country: "CN",
          region: "SH",
          referrerHost: "example.org",
        },
        {
          ...base,
          name: "page_view",
          occurredAt: new Date("2026-01-02T12:00:00Z"),
        },
        {
          ...base,
          name: "page_view",
          occurredAt: new Date("2025-01-01T12:00:00Z"),
        },
      ]);
    const caller = analyticsRouter.createCaller({
      req: new Request("http://localhost"),
      resHeaders: new Headers(),
      admin: { id: 1 } as Admin,
    });
    const result = await caller.overview({
      from: "2026-01-01",
      to: "2026-01-03",
    });
    expect(result.cards).toEqual({ uv: 2, pv: 4, caseOpen: 1, pdfView: 1 });
    expect(result.series).toEqual([
      { date: "2026-01-01", uv: 2, pv: 3 },
      { date: "2026-01-02", uv: 1, pv: 1 },
      { date: "2026-01-03", uv: 0, pv: 0 },
    ]);
    expect(result.topProjects).toEqual([
      { slug: "example", title: "example", opens: 1, pdfs: 1 },
    ]);
    expect(result.sources).toContainEqual({ label: "直接访问", count: 3 });
    expect(result.regions).toContainEqual({ label: "CN · SH", count: 1 });
  }
);

it.skipIf(!enabled)(
  "deduplicates nested project funnels and isolates slugs, dates and Beijing days",
  async () => {
    await getPool().query("TRUNCATE analytics_events");
    const base = {
      path: "/",
      device: "mobile",
      occurredAt: new Date("2026-01-01T16:00:00Z"),
      projectSlug: "example",
    };
    await getDb()
      .insert(analyticsEvents)
      .values([
        ...[
          "case_open",
          "case_open",
          "pdf_view",
          "pdf_view",
          "outbound_click",
        ].map(name => ({ ...base, name, visitorId: "a" })),
        ...["case_open", "pdf_view"].map(name => ({
          ...base,
          name,
          visitorId: "b",
        })),
        ...["case_open", "outbound_click"].map(name => ({
          ...base,
          name,
          visitorId: "c",
        })),
        ...["pdf_view", "outbound_click"].map(name => ({
          ...base,
          name,
          visitorId: "d",
        })),
        {
          ...base,
          name: "case_open",
          visitorId: "other",
          projectSlug: "other",
        },
        {
          ...base,
          name: "case_open",
          visitorId: "old",
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
        {
          ...base,
          name: "case_open",
          visitorId: "end",
          occurredAt: new Date("2026-01-03T16:00:00Z"),
        },
      ]);
    const caller = analyticsRouter.createCaller({
      req: new Request("http://localhost"),
      resHeaders: new Headers(),
      admin: { id: 1 } as Admin,
    });
    await getPool().query(
      "INSERT INTO projects (title, published) VALUES ('Example', true)"
    );
    const result = await caller.project({
      slug: "example",
      from: "2026-01-01",
      to: "2026-01-03",
    });
    expect(result.title).toBe("Example");
    expect(result.cards).toEqual({
      uv: 4,
      caseOpen: 4,
      pdfView: 4,
      outboundClick: 3,
    });
    expect(result.funnel).toEqual({
      caseOpen: 3,
      pdfView: 2,
      outboundClick: 1,
      pdfRate: 2 / 3,
      outboundRate: 0.5,
    });
    expect(result.series).toEqual([
      { date: "2026-01-01", caseOpen: 0, pdfView: 0, outboundClick: 0 },
      { date: "2026-01-02", caseOpen: 4, pdfView: 4, outboundClick: 3 },
      { date: "2026-01-03", caseOpen: 0, pdfView: 0, outboundClick: 0 },
    ]);
    expect(result.devices).toEqual([{ label: "mobile", count: 11 }]);
    expect(result.sources).toEqual([{ label: "直接访问", count: 11 }]);
    const unknown = await caller.project({
      slug: "unknown",
      from: "2026-01-01",
      to: "2026-01-03",
    });
    expect(unknown.title).toBe("unknown");
    expect(unknown.cards).toEqual({
      uv: 0,
      caseOpen: 0,
      pdfView: 0,
      outboundClick: 0,
    });
    expect(unknown.funnel).toEqual({
      caseOpen: 0,
      pdfView: 0,
      outboundClick: 0,
      pdfRate: null,
      outboundRate: null,
    });
  }
);
