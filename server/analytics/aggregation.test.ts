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
