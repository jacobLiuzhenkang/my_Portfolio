import { createHash, createHmac } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { env } from "../lib/env";
export const COOKIE = "lz_guest_session";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function readGuestToken(req: Request) {
  const raw = (req.headers.get("cookie") || "")
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  if (!raw) return undefined;
  try {
    const value = decodeURIComponent(raw);
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
export function guestCookie(token: string) {
  return (
    COOKIE +
    "=" +
    token +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000" +
    (env.isProduction ? "; Secure" : "")
  );
}
export function assertSameOrigin(req: Request) {
  let valid = false;
  try {
    const origin = req.headers.get("origin");
    valid =
      !!origin &&
      new URL(origin).host === new URL(req.url).host &&
      ["https:", "http:"].includes(new URL(origin).protocol);
  } catch {
    /* Invalid origins fail closed. */
  }
  if (!valid || req.headers.get("sec-fetch-site") === "cross-site")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "请从本站页面进行操作。",
    });
}
export function networkKey(req: Request, secret: string, now = Date.now()) {
  const ip =
    (process.env.VERCEL ? req.headers.get("x-vercel-forwarded-for") : null) ||
    req.headers.get("x-forwarded-for") ||
    "local";
  return createHmac("sha256", secret)
    .update(
      new Date(now).toISOString().slice(0, 10) +
        ":" +
        ip.split(",")[0].trim().slice(0, 100)
    )
    .digest("hex");
}
export function moderateText(text: string) {
  const value = text
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "");
  const flags: string[] = [];
  if (
    /傻[逼比]|操你[妈媽]|草你[妈媽]|去死[吧啊！!]|弄死你|杀[了死]你|fuck\s+you|kill\s+yourself/i.test(
      value
    )
  )
    flags.push("辱骂或威胁");
  if (
    /忽略.{0,15}(之前|以上|所有|系统).{0,10}(指令|规则|提示)|ignore\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts)|<\|(?:im_start|system|endoftext)\|>|泄[露漏].{0,12}(密钥|密码|令牌)|reveal\s+(your\s+)?(system\s+prompt|secrets|api\s*keys)|执行.{0,8}(shell|终端|命令)|(?:curl|wget)\s+https?:\/\//i.test(
      value
    )
  )
    flags.push("可疑指令");
  if (
    /<\s*(script|iframe|object|embed|svg|math)\b|javascript\s*:|on(?:error|load|click)\s*=/i.test(
      value
    )
  )
    flags.push("可疑网页代码");
  if ((value.match(/https?:\/\//gi) || []).length > 3)
    flags.push("疑似垃圾推广");
  return flags;
}
export function rejectTrap(website: string) {
  if (website)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "本次提交未通过校验。",
    });
}
