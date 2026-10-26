import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { splitFeaturedProjects } from "../../src/lib/featured-work";

/** Same order content.public uses: sortOrder, then id. Flags match the live catalog. */
const catalog = [
  { id: 6, title: "VIFORM · AI 创作工作台", category: "AI 产品", featured: true, sortOrder: 0 },
  { id: 7, title: "SAC · 微光成炬", category: "产品设计", featured: true, sortOrder: 0 },
  { id: 1, title: "夏商到家视觉升级", category: "产品设计", featured: true, sortOrder: 1 },
  { id: 2, title: "MemoRing 智能指环", category: "AI 产品", featured: false, sortOrder: 2 },
  { id: 3, title: "食刻 · 食谱社区 0—1", category: "产品设计", featured: false, sortOrder: 3 },
  { id: 4, title: "夏商 IP 形象设计", category: "视觉设计", featured: false, sortOrder: 4 },
  { id: 5, title: "商业平面设计合集", category: "视觉设计", featured: false, sortOrder: 5 },
];

describe("splitFeaturedProjects", () => {
  it("keeps every CMS featured project in 精选, in content order", () => {
    const { featured, earlier } = splitFeaturedProjects(catalog);
    expect(featured.map(project => project.id)).toEqual([6, 7, 1]);
    expect(earlier.map(project => project.id)).toEqual([2, 3, 4, 5]);
  });

  it("follows a featured toggle without a separate list", () => {
    const hidden = catalog.map(project =>
      project.id === 1 ? { ...project, featured: false } : project
    );
    expect(splitFeaturedProjects(hidden).featured.map(project => project.id)).toEqual([
      6, 7,
    ]);
    expect(splitFeaturedProjects(hidden).earlier.map(project => project.id)).toEqual([
      1, 2, 3, 4, 5,
    ]);

    const promoted = catalog.map(project =>
      project.id === 2 ? { ...project, featured: true } : project
    );
    expect(splitFeaturedProjects(promoted).featured.map(project => project.id)).toEqual([
      6, 7, 1, 2,
    ]);
    expect(splitFeaturedProjects(promoted).earlier.map(project => project.id)).toEqual([
      3, 4, 5,
    ]);
  });

  it("applies the same flag inside a category filter", () => {
    const productDesign = catalog.filter(project => project.category === "产品设计");
    const { featured, earlier } = splitFeaturedProjects(productDesign);
    expect(featured.map(project => project.title)).toEqual([
      "SAC · 微光成炬",
      "夏商到家视觉升级",
    ]);
    expect(earlier.map(project => project.id)).toEqual([3]);
  });

  it("leaves 精选 empty when nothing is featured", () => {
    const plain = catalog.map(project => ({ ...project, featured: false }));
    const { featured, earlier } = splitFeaturedProjects(plain);
    expect(featured).toEqual([]);
    expect(earlier).toEqual(plain);
  });
});

describe("homepage 精选 wiring", () => {
  it("reads the shared split and does not cap featured projects at two", async () => {
    const source = await readFile("src/pages/Home.tsx", "utf8");
    expect(source).toContain("splitFeaturedProjects(visible)");
    expect(source).not.toMatch(/\.slice\(\s*0\s*,\s*2\s*\)/);
  });
});
