import { z } from "zod";
export const publicPath = z
  .string()
  .max(100)
  .regex(/^(?:\/(?:growth|guestbook)?|\/work\/[a-z0-9-]{1,80})$/);
export const eventSchema = z
  .object({
    name: z.enum(["page_view", "case_open", "pdf_view", "outbound_click"]),
    path: publicPath,
    projectSlug: z
      .string()
      .regex(/^[a-z0-9-]{1,80}$/)
      .optional(),
    visitorId: z.uuid(),
    sessionId: z.uuid().optional(),
    referrer: z.string().max(2048).optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(100).optional(),
  })
  .strict()
  .refine(
    e => !["case_open", "pdf_view"].includes(e.name) || Boolean(e.projectSlug),
    { message: "案例事件需要 slug" }
  );
export const trackSchema = z.array(eventSchema).min(1).max(20);
export type AnalyticsEvent = z.infer<typeof eventSchema>;
