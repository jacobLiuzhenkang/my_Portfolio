import { createHash } from "node:crypto";
import type { AnalyticsEvent } from "../../contracts/analytics";

export function referrerHost(value: string | undefined, host: string) {
  try {
    const url = new URL(value || "");
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const normalized = url.hostname.toLowerCase().replace(/^www\./, "");
    return normalized === host.replace(/^www\./, "") ? null : normalized;
  } catch {
    return null;
  }
}
export function requestDimensions(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  // Only Vercel's overwritten geo headers are trusted, and only on Vercel.
  const geo = (key: string, max: number) => {
    if (!process.env.VERCEL) return null;
    try {
      return (
        decodeURIComponent(req.headers.get(key) || "")
          .replace(/[^\p{L}\p{N} ._-]/gu, "")
          .slice(0, max) || null
      );
    } catch {
      return null;
    }
  };
  return {
    bot: /bot|crawler|spider|headless|preview|slurp/i.test(ua),
    device: /ipad|tablet|android(?!.*mobile)/i.test(ua)
      ? "tablet"
      : /mobile|iphone|ipod/i.test(ua)
        ? "mobile"
        : "desktop",
    country: geo("x-vercel-ip-country", 64),
    region: geo("x-vercel-ip-country-region", 100),
  };
}
const buckets = new Map<string, { count: number; expires: number }>();
export function allowEvents(
  req: Request,
  events: AnalyticsEvent[],
  now = Date.now()
) {
  for (const [key, bucket] of buckets)
    if (bucket.expires <= now) buckets.delete(key);
  const ip = process.env.VERCEL
    ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]
    : undefined;
  const keys = [...new Set(events.map(e => `visitor:${e.visitorId}`))];
  if (ip) keys.push(`ip:${createHash("sha256").update(ip).digest("hex")}`);
  if (buckets.size + keys.length > 10000) return false;
  if (keys.some(key => (buckets.get(key)?.count || 0) + events.length > 120))
    return false;
  for (const key of keys) {
    const bucket = buckets.get(key) || { count: 0, expires: now + 60000 };
    bucket.count += events.length;
    buckets.set(key, bucket);
  }
  return true;
}
export function dateRange(from?: string, to?: string, now = new Date()) {
  const end = to
    ? new Date(`${to}T00:00:00+08:00`)
    : new Date(
        `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)}T00:00:00+08:00`
      );
  const start = from
    ? new Date(`${from}T00:00:00+08:00`)
    : new Date(end.getTime() - 6 * 86400000);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    +start > +end ||
    +end - +start > 365 * 86400000
  )
    throw new Error("日期区间须在 366 天内");
  return { start, end: new Date(+end + 86400000) };
}
