import { xiashangBaselineContent } from "./xiashang-baseline";

/** Confirmed delivery copy for the featured 夏商到家 case. */
export const xiashangCase = {
  title: "夏商到家视觉升级",
  coverImage: "/images/seashine/cover.webp",
  description:
    "在第三方 SaaS 约束下完成视觉规范与 O2O 购买路径并上线小程序；会员码/一码付打通线上下权益。",
  tags: ["Mobile Design", "SaaS", "Visual Upgrade", "已上线交付"],
} as const;

/** Copy currently shipped from seed / project1.md. Anything else is an admin edit. */
export const xiashangBaseline = {
  description:
    "在第三方 SaaS 限制下重塑视觉规范与 O2O 体验，建立线上线下统一的品牌心智。",
  tags: ["Mobile Design", "SaaS", "Visual Upgrade"],
  content: xiashangBaselineContent,
} as const;

export type XiashangCopy = {
  description: string;
  content: string;
  tags: readonly string[];
};

export function normalizeXiashangContent(content: string) {
  return content.replaceAll("\r\n", "\n").trim();
}

function sameList(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

/** Title, local cover, or the known old body. Other 夏商 cases do not match. */
export function isXiashangCase(project: {
  title: string;
  coverImage: string | null;
  content: string;
}) {
  return (
    project.title === xiashangCase.title ||
    project.coverImage === xiashangCase.coverImage ||
    normalizeXiashangContent(project.content) === xiashangBaseline.content
  );
}

/**
 * Replace description, body, and tags only when each field is still the known
 * import. Administrator edits stay put and are listed for the update report.
 */
export function planXiashangUpdate(existing: XiashangCopy, next: XiashangCopy) {
  const patch: Partial<{
    description: string;
    content: string;
    tags: string[];
  }> = {};
  const customFieldsKept: ("description" | "content" | "tags")[] = [];

  if (existing.description !== next.description) {
    if (existing.description === xiashangBaseline.description)
      patch.description = next.description;
    else customFieldsKept.push("description");
  }

  const content = normalizeXiashangContent(existing.content);
  const nextContent = normalizeXiashangContent(next.content);
  if (content !== nextContent) {
    if (content === xiashangBaseline.content) patch.content = nextContent;
    else customFieldsKept.push("content");
  }

  const tags = Array.isArray(existing.tags) ? existing.tags : null;
  if (!tags || !sameList(tags, next.tags)) {
    if (tags && sameList(tags, xiashangBaseline.tags))
      patch.tags = [...next.tags];
    else customFieldsKept.push("tags");
  }

  return { patch, customFieldsKept };
}
