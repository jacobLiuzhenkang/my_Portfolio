import { createHmac, randomBytes } from "node:crypto";
// Per-process ephemeral salt: raw IP/email never retained in limiter keys or DB.
const salt = randomBytes(32);
const buckets = new Map<string, { count: number; expires: number }>();
export function allowContact(req: Request, email: string, now = Date.now()) {
  for (const [key, b] of buckets) if (b.expires <= now) buckets.delete(key);
  // Vercel overwrites this header. Outside Vercel all clients share a bucket.
  const ip =
    (process.env.VERCEL
      ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : null) || "local";
  const keys = ["ip:" + ip, "email:" + email.trim().toLowerCase()].map(v =>
    createHmac("sha256", salt).update(v).digest("hex")
  );
  if (
    buckets.size + keys.length > 10000 ||
    keys.some(k => (buckets.get(k)?.count || 0) >= 5)
  )
    return false;
  for (const k of keys) {
    const b = buckets.get(k) || { count: 0, expires: now + 3600000 };
    b.count++;
    buckets.set(k, b);
  }
  return true;
}
