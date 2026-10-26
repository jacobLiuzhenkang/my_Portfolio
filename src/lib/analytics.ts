/// <reference lib="dom" />
import type { AnalyticsEvent } from "@contracts/analytics";
import { caseSlugFromPath } from "./project-slug";
let visitor: string | undefined;
let session: string | undefined;
export function track(
  name: AnalyticsEvent["name"],
  payload: { projectSlug?: string } = {}
) {
  try {
    if (location.pathname.startsWith("/admin")) return;
    visitor ||=
      localStorage.getItem("portfolio_visitor") || crypto.randomUUID();
    localStorage.setItem("portfolio_visitor", visitor);
    session ||=
      sessionStorage.getItem("portfolio_session") || crypto.randomUUID();
    sessionStorage.setItem("portfolio_session", session);
    const query = new URLSearchParams(location.search);
    const event: AnalyticsEvent = {
      name,
      path: location.pathname,
      visitorId: visitor,
      sessionId: session,
      projectSlug: payload.projectSlug || caseSlugFromPath(location.pathname),
      referrer: document.referrer.slice(0, 2048),
      utmSource: query.get("utm_source")?.slice(0, 100),
      utmMedium: query.get("utm_medium")?.slice(0, 100),
      utmCampaign: query.get("utm_campaign")?.slice(0, 100),
    };
    const body = JSON.stringify({ json: [event] });
    const endpoint = "/api/trpc/analytics.track";
    if (
      navigator.sendBeacon?.(
        endpoint,
        new Blob([body], { type: "application/json" })
      )
    )
      return;
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Collection never blocks public browsing. */
  }
}
