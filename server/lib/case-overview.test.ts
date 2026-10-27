import { describe, expect, it } from "vitest";
import { caseOverview } from "../../src/lib/case-overview";
import { recentProjects } from "../../db/portfolio-content";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CaseStudy from "../../src/components/CaseStudy";

describe("case overview editorial evidence", () => {
  it("shows short leads before media and keeps full evidence in disclosures", () => {
    const html = renderToStaticMarkup(
      createElement(CaseStudy, {
        title: "Case",
        content:
          "### 项目背景\n现有背景。具体痛点。\n\n### 我的贡献\n已有方法。实现边界。\n\n### 当前阶段\n完成本地验证。尚未上线。\n\n![图](/images/case.png)",
        gallery: [],
      })
    );
    expect(html).toContain("<p>完成本地验证。</p>");
    expect(html).toContain("展开成果与当前阶段原文");
    expect(html).toContain("完成本地验证。尚未上线。");
    expect(html.indexOf("成果与当前阶段")).toBeLessThan(html.indexOf("<img"));
  });
  it("preserves current-stage caveats instead of inferring a launch or metrics", () => {
    for (const project of recentProjects) {
      const overview = caseOverview(project.content, project.description);
      expect(overview.map(item => item.label)).toEqual([
        "问题",
        "做法",
        "结果",
      ]);
      const result = overview[2].text;
      expect(result).toMatch(/本地|可演示交付物/);
      expect(project.content).toContain(result);
      expect(overview.map(item => item.text).join("\n")).not.toContain("![");
    }
  });

  it("uses numbered historical headings without moving original images", async () => {
    for (let id = 1; id <= 5; id++) {
      const content = await readFile(`public/posts/project${id}.md`, "utf8");
      const overview = caseOverview(content);
      expect(overview[0].label).toBe("问题");
      expect(overview.at(-1)?.label).toBe("结果");
      expect(overview[0].text).not.toContain("项目时间");
      expect(overview.map(item => item.text).join("\n")).not.toContain("![");
    }
  });

  it("keeps three slots without treating a description or role as a result", () => {
    const empty = caseOverview("", "现有项目描述");
    expect(empty.map(item => item.label)).toEqual(["问题", "做法", "结果"]);
    expect(empty.every(item => item.text === "")).toBe(true);
    const methodOnly = caseOverview(
      "### 我的贡献\n交互设计\n\n### 验证方式\n待验收"
    );
    expect(methodOnly.map(item => item.text)).toEqual(["", "交互设计", ""]);
    const html = renderToStaticMarkup(
      createElement(CaseStudy, {
        title: "Case",
        content: "",
        description: "现有项目描述",
        gallery: [],
      })
    );
    for (const label of ["问题", "做法", "结果"]) expect(html).toContain(label);
    expect(html.match(/详见下文/g)).toHaveLength(3);
    expect(html).not.toContain("<details");
    expect(html).not.toContain("现有项目描述");
  });

  it("uses real method evidence from the graphic collection body", async () => {
    const content = await readFile("public/posts/project5.md", "utf8");
    const overview = caseOverview(content);
    expect(overview.map(item => item.label)).toEqual(["问题", "做法", "结果"]);
    const method = overview[1].text;
    expect(method).toContain("形意合一");
    for (const brand of ["国旅环球", "夏商", "蒙牛"])
      expect(method).toContain(brand);
    expect(content.replaceAll("**", "")).toContain(method);
    const html = renderToStaticMarkup(
      createElement(CaseStudy, {
        title: "商业平面设计合集",
        content,
        gallery: [],
      })
    );
    const overviewHtml = html.slice(0, html.indexOf("<h3>01."));
    expect(overviewHtml.indexOf("问题")).toBeLessThan(
      overviewHtml.indexOf("做法")
    );
    expect(overviewHtml.indexOf("做法")).toBeLessThan(
      overviewHtml.indexOf("结果")
    );
    expect(html).toContain("展开方法与过程原文");
    expect(html).not.toContain("详见下文");
    expect(content).toContain("/downloads/portfolio-2025.pdf");
    expect(html).toContain("查看完整 PDF");
    expect(html).not.toContain("<iframe");
  });
});
