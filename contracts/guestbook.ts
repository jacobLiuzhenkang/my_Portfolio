import { z } from "zod";

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const POST_MAX_BYTES = 12 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const nicknameInput = z
  .string()
  .trim()
  .min(1, "请填写昵称")
  .max(32, "昵称最多32个字符")
  .refine(value => !value.includes("\0"), "昵称包含不支持的字符");
export const postInput = z
  .object({
    id: z.uuid(),
    nickname: nicknameInput,
    body: z
      .string()
      .trim()
      .max(2000)
      .refine(value => !value.includes("\0"), "内容包含不支持的字符"),
    images: z.array(z.uuid()).max(9),
    website: z.string().max(200).default(""),
  })
  .refine(
    v => v.body.length > 0 || v.images.length > 0,
    "写句话，或者添加一张图片"
  );
export const commentInput = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  nickname: nicknameInput,
  body: z
    .string()
    .trim()
    .min(1, "请填写评论")
    .max(500)
    .refine(value => !value.includes("\0"), "评论包含不支持的字符"),
  website: z.string().max(200).default(""),
});
export const reportInput = z.object({
  type: z.enum(["post", "comment"]),
  id: z.uuid(),
  reason: z.enum(["abuse", "spam", "instructions", "other"]),
});
export type ContentState = "published" | "held" | "hidden" | "deleted";
export type BoardImage = {
  id: string;
  url: string;
  width: number;
  height: number;
};
export type BoardComment = {
  id: string;
  postId: string;
  nickname: string;
  body: string;
  createdAt: string;
  owner: boolean;
  mine: boolean;
  state: string;
};
export type BoardPost = {
  id: string;
  nickname: string;
  body: string;
  createdAt: string;
  owner: boolean;
  mine: boolean;
  state: string;
  images: BoardImage[];
  likes: number;
  liked: boolean;
  comments: number;
};
