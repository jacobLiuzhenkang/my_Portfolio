import { z } from "zod";
export const messageStatus = z.enum(["new", "read", "spam"]);
export const contactInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z
    .string()
    .trim()
    .max(320)
    .email()
    .transform(v => v.toLowerCase()),
  company: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1).max(2000),
  website: z.string().max(200).default(""),
  openedAt: z.number().int().nonnegative(),
});
