import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CaseStudy from "../../src/components/CaseStudy";
import CasePdf from "../../src/components/CasePdf";
import {
  inlineImageSources,
  recentCaseLayout,
} from "../../contracts/project-content";
import { isPdfReference } from "../../contracts/pdf-asset";
describe("project text and image relationships", () => {
  it("keeps every old inline picture between its corresponding sections without duplicate galleries", async () => {
    for (let id = 1; id <= 5; id++) {
      const source = await readFile(
        "public/posts/project" + id + ".md",
        "utf8"
      );
      const images = [...inlineImageSources(source)].filter(
        src => !isPdfReference(src)
      );
      const html = renderToStaticMarkup(
        createElement(CaseStudy, {
          content: source,
          gallery: images,
          title: "Project",
        })
      );
      const shown = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
        .map(match => match[1])
        .filter(src => !src.endsWith(".preview.webp"));
      expect(shown).toEqual(images);
      expect(html).not.toMatch(
        /\b(?:src|href|data)="[^"]+\.pdf(?:[?#][^"]*)?"/i
      );
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
  it("keeps an existing image with a revised caption in its original position", () => {
    const content =
      "### 我的贡献\n贡献\n\n![新的图片说明](/images/viform/workspace.png)\n\n### 关键取舍\n取舍";
    const updated = recentCaseLayout(content, "viform");
    expect(updated).toBe(content);
    const html = renderToStaticMarkup(
      createElement(CaseStudy, {
        content: updated,
        gallery: ["/images/viform/workspace.png"],
        title: "VIFORM",
      })
    );
    expect((html.match(/<img\s/g) || []).length).toBe(1);
  });
  it("shows a cover for a case PDF and does not request the file until it is opened", () => {
    const html = renderToStaticMarkup(
      createElement(CaseStudy, {
        content:
          "### 案例文档\n\n[商业平面设计合集](/downloads/portfolio-2025.pdf)\n\n![说明](/images/other/1.webp)",
        gallery: [
          "/images/other/1.webp",
          "/downloads/portfolio-2025.pdf",
          "https://files.example/deck.pdf",
        ],
        title: "平面",
      })
    );
    expect(html).toContain("/downloads/portfolio-2025.preview.webp");
    expect(html).toContain("查看完整 PDF");
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("<iframe");
    expect(html).not.toMatch(/\b(?:src|href|data)="[^"]+\.pdf/i);
    expect(html).not.toContain("https://files.example/deck.preview.webp");
    expect(html.match(/查看完整 PDF/g)?.length).toBe(2);
    const opened = renderToStaticMarkup(
      createElement(CasePdf, {
        href: "/downloads/portfolio-2025.pdf",
        label: "商业平面设计合集",
        initiallyOpen: true,
      })
    );
    expect(opened).toContain(
      '<iframe class="case-pdf-frame" title="商业平面设计合集" src="/downloads/portfolio-2025.pdf"'
    );
    const external = renderToStaticMarkup(
      createElement(CasePdf, {
        href: "https://files.example/deck.pdf",
        label: "外链",
        initiallyOpen: true,
      })
    );
    expect(external).not.toContain("<iframe");
    expect(external).toContain('href="https://files.example/deck.pdf"');
  });
});
