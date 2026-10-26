import { describe, expect, it } from "vitest";
import {
  caseCloseUsesHistoryBack,
  caseSlugFromPath,
  findProjectBySlug,
  isCaseSurface,
  projectPath,
  projectSlug,
} from "../../src/lib/project-slug";

const projects = [
  { id: 1, title: "夏商到家视觉升级", coverImage: "/images/seashine/cover.webp" },
  { id: 2, title: "MemoRing 智能指环", coverImage: "/images/memoring/cover.webp" },
  { id: 3, title: "食刻 · 食谱社区 0—1", coverImage: "/images/shike/cover.webp" },
  { id: 4, title: "夏商 IP 形象设计", coverImage: "/images/ip/cover.webp" },
  { id: 5, title: "商业平面设计合集", coverImage: "/images/other/cover.webp" },
  { id: 6, title: "VIFORM · AI 创作工作台", coverImage: "/images/viform/workspace.png" },
  { id: 7, title: "SAC · 微光成炬", coverImage: "/images/sac/home.png" },
];

describe("case deep links", () => {
  it("builds stable slugs from the local cover folder", () => {
    expect(projects.map(projectSlug)).toEqual([
      "seashine",
      "memoring",
      "shike",
      "ip",
      "other",
      "viform",
      "sac",
    ]);
    expect(projectPath(projects[5])).toBe("/work/viform");
    expect(caseSlugFromPath("/work/viform")).toBe("viform");
    expect(caseSlugFromPath("/work/SAC/")).toBe("SAC");
    expect(caseSlugFromPath("/growth")).toBeUndefined();
    expect(caseSlugFromPath("/work")).toBeUndefined();
  });

  it("keeps a known project shareable after the cover becomes a remote file", () => {
    expect(
      projectSlug({
        id: 6,
        title: "VIFORM · AI 创作工作台",
        coverImage: null,
        coverUrl: "https://example.blob.vercel-storage.com/private/cover.png",
      })
    ).toBe("viform");
  });

  it("falls back to a stable id slug for projects without a known name", () => {
    expect(projectSlug({ id: 12, title: "新的委托", coverUrl: null })).toBe("p12");
    expect(
      findProjectBySlug(
        [{ id: 12, title: "新的委托", coverUrl: null }],
        "p12"
      )?.id
    ).toBe(12);
  });

  it("resolves the canonical slug, the id, and an unknown value", () => {
    expect(findProjectBySlug(projects, "SAC")?.title).toContain("微光成炬");
    expect(findProjectBySlug(projects, "7")?.id).toBe(7);
    expect(findProjectBySlug(projects, "missing")).toBeUndefined();
    expect(new Set(projects.map(projectSlug)).size).toBe(projects.length);
  });

  it("treats the home page and case links as one surface", () => {
    expect(isCaseSurface("/")).toBe(true);
    expect(isCaseSurface("/work/viform")).toBe(true);
    expect(isCaseSurface("/growth")).toBe(false);
    expect(isCaseSurface("/guestbook")).toBe(false);
    expect(isCaseSurface("/workspace")).toBe(false);
  });

  it("uses history back only for a case opened inside the current visit", () => {
    expect(caseCloseUsesHistoryBack(2, 2)).toBe(true);
    expect(caseCloseUsesHistoryBack(0, 0)).toBe(false);
    expect(caseCloseUsesHistoryBack(2, 1)).toBe(false);
    expect(caseCloseUsesHistoryBack(1, null)).toBe(false);
  });
});
