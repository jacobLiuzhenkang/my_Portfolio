import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { analyticsEvents, projects } from "@db/schema";
import { trackSchema } from "../../contracts/analytics";
import { adminQuery, createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  allowEvents,
  dateRange,
  referrerHost,
  requestDimensions,
} from "./service";
import { projectSlug } from "../../src/lib/project-slug";

export const analyticsRouter = createRouter({
  track: publicQuery.input(trackSchema).mutation(async ({ ctx, input }) => {
    const { bot, ...dimensions } = requestDimensions(ctx.req);
    if (bot || !allowEvents(ctx.req, input)) return { ok: true };
    await getDb()
      .insert(analyticsEvents)
      .values(
        input.map(({ referrer, ...event }) => ({
          ...event,
          ...dimensions,
          referrerHost: referrerHost(referrer, new URL(ctx.req.url).hostname),
        }))
      );
    return { ok: true };
  }),
  overview: adminQuery
    .input(
      z
        .object({ from: z.iso.date().optional(), to: z.iso.date().optional() })
        .optional()
    )
    .query(async ({ input }) => {
      let range;
      try {
        range = dateRange(input?.from, input?.to);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "日期区间须在 366 天内",
        });
      }
      const db = getDb();
      const where = sql`occurred_at >= ${range.start} AND occurred_at < ${range.end}`;
      const [cards, series, topProjects, sources, regions, devices, titles] =
        await Promise.all([
          db.execute<{
            uv: number;
            pv: number;
            caseOpen: number;
            pdfView: number;
          }>(
            sql`SELECT count(distinct visitor_id)::int AS uv, count(*) FILTER (WHERE name='page_view')::int AS pv, count(*) FILTER (WHERE name='case_open')::int AS "caseOpen", count(*) FILTER (WHERE name='pdf_view')::int AS "pdfView" FROM analytics_events WHERE ${where}`
          ),
          db.execute<{ date: string; uv: number; pv: number }>(
            sql`SELECT to_char(occurred_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS date, count(distinct visitor_id)::int AS uv, count(*) FILTER (WHERE name='page_view')::int AS pv FROM analytics_events WHERE ${where} GROUP BY 1 ORDER BY 1`
          ),
          db.execute<{ slug: string; opens: number; pdfs: number }>(
            sql`SELECT project_slug AS slug, count(*) FILTER (WHERE name='case_open')::int AS opens, count(*) FILTER (WHERE name='pdf_view')::int AS pdfs FROM analytics_events WHERE ${where} AND project_slug IS NOT NULL AND name IN ('case_open','pdf_view') GROUP BY 1 ORDER BY opens DESC, pdfs DESC, slug LIMIT 10`
          ),
          db.execute<{ label: string; count: number }>(
            sql`SELECT coalesce(nullif(utm_source,''), referrer_host, '直接访问') AS label, count(*)::int AS count FROM analytics_events WHERE ${where} AND name='page_view' GROUP BY 1 ORDER BY count DESC, label LIMIT 10`
          ),
          db.execute<{ label: string; count: number }>(
            sql`SELECT coalesce(nullif(concat_ws(' · ', country, region),''), '未知地区') AS label, count(*)::int AS count FROM analytics_events WHERE ${where} AND name='page_view' GROUP BY 1 ORDER BY count DESC, label LIMIT 10`
          ),
          db.execute<{ label: string; count: number }>(
            sql`SELECT device AS label, count(*)::int AS count FROM analytics_events WHERE ${where} AND name='page_view' GROUP BY 1 ORDER BY count DESC`
          ),
          db
            .select({ id: projects.id, title: projects.title })
            .from(projects)
            .where(eq(projects.published, true)),
        ]);
      const titleMap = new Map(
        titles.map(p => [projectSlug(p, titles), p.title])
      );
      const days = new Map(series.rows.map(row => [row.date, row]));
      const filled = [];
      for (let time = +range.start; time < +range.end; time += 86400000) {
        const date = new Date(time + 8 * 3600000).toISOString().slice(0, 10);
        filled.push(days.get(date) || { date, uv: 0, pv: 0 });
      }
      return {
        cards: cards.rows[0],
        series: filled,
        topProjects: topProjects.rows.map(p => ({
          ...p,
          title: titleMap.get(p.slug) || p.slug,
        })),
        sources: sources.rows,
        regions: regions.rows,
        devices: devices.rows,
      };
    }),
});
