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
      expect(result).toContain("本地");
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

  it("hides missing blocks and never treats a description or role as a result", () => {
    expect(caseOverview("", "现有项目描述")).toEqual([
      { label: "问题", source: "背景与痛点", text: "现有项目描述" },
    ]);
    expect(
      caseOverview("### 我的贡献\n交互设计\n\n### 验证方式\n待验收")
    ).toEqual([{ label: "做法", source: "方法与过程", text: "交互设计" }]);
    expect(caseOverview("")).toEqual([]);
  });
});
