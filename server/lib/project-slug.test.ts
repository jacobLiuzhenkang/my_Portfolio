import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  caseCloseHref,
  caseSlugFromPath,
  findProjectBySlug,
  isCaseSurface,
  keepsStoredCaseScroll,
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

const readable = [
  "xia-shang-dao-jia-shi-jue-sheng-ji",
  "memoring-zhi-neng-zhi-huan",
  "shi-ke-shi-pu-she-qu-0-1",
  "xia-shang-ip-xing-xiang-she-ji",
  "shang-ye-ping-mian-she-ji-he-ji",
  "viform-ai-chuang-zuo-gong-zuo-tai",
  "sac-wei-guang-cheng-ju",
];

describe("case deep links", () => {
  it("builds a stable readable slug from the title", () => {
    expect(projects.map(project => projectSlug(project, projects))).toEqual(readable);
    expect(projectPath(projects[5], projects)).toBe("/work/viform-ai-chuang-zuo-gong-zuo-tai");
    expect(caseSlugFromPath("/work/sac-wei-guang-cheng-ju")).toBe("sac-wei-guang-cheng-ju");
    expect(caseSlugFromPath("/work/SAC-WEI-GUANG-CHENG-JU/")).toBe("SAC-WEI-GUANG-CHENG-JU");
    expect(caseSlugFromPath("/growth")).toBeUndefined();
    expect(caseSlugFromPath("/work")).toBeUndefined();
  });

  it("keeps the same slug when the cover is missing or remote", () => {
    expect(
      projectSlug(
        {
          id: 6,
          title: "VIFORM · AI 创作工作台",
          coverImage: null,
          coverUrl: "https://example.blob.vercel-storage.com/private/cover.png",
        },
        projects
      )
    ).toBe("viform-ai-chuang-zuo-gong-zuo-tai");
    expect(projectSlug({ id: 12, title: "新的委托", coverUrl: null })).toBe("xin-de-wei-tuo");
  });

  it("disambiguates identical titles by ascending id and never uses p + id", () => {
    const twins = [
      { id: 9, title: "夏商到家视觉升级" },
      { id: 3, title: "夏商到家视觉升级" },
    ];
    expect(projectSlug(twins[0], twins)).toBe("xia-shang-dao-jia-shi-jue-sheng-ji-2");
    expect(projectSlug(twins[1], twins)).toBe("xia-shang-dao-jia-shi-jue-sheng-ji");
    const blank = { id: 12, title: "···" };
    expect(projectSlug(blank)).toMatch(/^case-[0-9a-f]{8}$/);
    expect(projectSlug(blank)).not.toBe(`p${blank.id}`);
    expect(projects.map(project => projectSlug(project, projects)).join(" ")).not.toMatch(
      /(?:^|\s)p\d+(?:\s|$)/
    );
  });

  it("resolves only the canonical title slug", () => {
    expect(findProjectBySlug(projects, "SAC-WEI-GUANG-CHENG-JU")?.title).toContain("微光成炬");
    expect(findProjectBySlug(projects, "7")).toBeUndefined();
    expect(findProjectBySlug(projects, "p7")).toBeUndefined();
    expect(findProjectBySlug(projects, "viform")).toBeUndefined();
    expect(findProjectBySlug(projects, "missing")).toBeUndefined();
    expect(new Set(projects.map(project => projectSlug(project, projects))).size).toBe(
      projects.length
    );
  });

  it("does not keep a numeric id fallback in the slug module", async () => {
    const source = await readFile(
      path.resolve(import.meta.dirname, "../../src/lib/project-slug.ts"),
      "utf8"
    );
    expect(source.includes("p${")).toBe(false);
    expect(source).not.toMatch(/\/work\/p\\d/);
  });

  it("treats the home page and case links as one surface", () => {
    expect(isCaseSurface("/")).toBe(true);
    expect(isCaseSurface("/work/viform-ai-chuang-zuo-gong-zuo-tai")).toBe(true);
    expect(isCaseSurface("/growth")).toBe(false);
    expect(isCaseSurface("/guestbook")).toBe(false);
    expect(isCaseSurface("/workspace")).toBe(false);
  });

  it("closes onto /#work so the work section aligns instead of restoring scroll", async () => {
    expect(caseCloseHref()).toBe("/#work");
    const slug = "/work/shang-ye-ping-mian-she-ji-he-ji";
    expect(keepsStoredCaseScroll(slug, "/", "#work")).toBe(false);
    expect(keepsStoredCaseScroll(slug, "/", "")).toBe(true);
    expect(keepsStoredCaseScroll("/", slug, "")).toBe(true);
    expect(keepsStoredCaseScroll("/growth", "/", "#work")).toBe(false);
    const home = await readFile(
      path.resolve(import.meta.dirname, "../../src/pages/Home.tsx"),
      "utf8"
    );
    expect(home).toContain("navigate(caseCloseHref(), { replace: true })");
    expect(home).not.toContain("navigate(-1)");
  });
});
