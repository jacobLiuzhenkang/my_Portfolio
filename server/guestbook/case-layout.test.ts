import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CaseStudy from "../../src/components/CaseStudy";
import {
  inlineImageSources,
  recentCaseLayout,
} from "../../contracts/project-content";
describe("project text and image relationships", () => {
  it("keeps every old inline picture between its corresponding sections without duplicate galleries", async () => {
    for (let id = 1; id <= 5; id++) {
      const source = await readFile(
        "public/posts/project" + id + ".md",
        "utf8"
      );
      const images = [...inlineImageSources(source)];
      const html = renderToStaticMarkup(
        createElement(CaseStudy, {
          content: source,
          gallery: images,
          title: "Project",
        })
      );
      expect((html.match(/<img\s/g) || []).length).toBe(images.length);
      for (let i = 1; i < images.length; i++)
        expect(html.indexOf(images[i])).toBeGreaterThan(
          html.indexOf(images[i - 1])
        );
    }
    const source = await readFile("public/posts/project1.md", "utf8");
    const html = renderToStaticMarkup(
      createElement(CaseStudy, { content: source, gallery: [], title: "Case" })
    );
    expect(html.indexOf("/images/seashine/2.webp")).toBeGreaterThan(
      html.indexOf("03. 视觉语言系统")
    );
    expect(html.indexOf("/images/seashine/2.webp")).toBeLessThan(
      html.indexOf("04. 核心界面设计")
    );
  });
  it("does not execute raw HTML or javascript links in case markdown", () => {
    const html = renderToStaticMarkup(
      createElement(CaseStudy, {
        content: "<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))",
        gallery: [],
        title: "Case",
      })
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });
  it("places current screenshots before tradeoffs and does not duplicate them on repeat", () => {
    const content = "项目背景\n背景\n\n我的贡献\n贡献\n\n关键取舍\n取舍";
    const updated = recentCaseLayout(content, "viform");
    expect(updated.indexOf("workspace.png")).toBeLessThan(
      updated.indexOf("### 关键取舍")
    );
    expect(recentCaseLayout(updated, "viform")).toBe(updated);
  });
});
