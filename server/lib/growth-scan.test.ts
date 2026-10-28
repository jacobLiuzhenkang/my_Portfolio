import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { profileCopy, currentExperience } from "../../db/portfolio-content";

const profile = {
  ...profileCopy,
  fullName: "刘振康",
  englishName: "Liu Zhenkang",
  role: "AI 产品工程师",
  location: "厦门",
  company: "当前公司",
  skills: [
    "Agent 协作｜上下文工程",
    "AI 产品｜产品定义",
    "AI 工作流｜多模态创作",
    "工程实现｜前端实现",
  ],
  education: "厦门大学 · 本科\n2015—2019\n长教育叙述",
};
vi.mock("@/providers/trpc-client", () => ({
  trpc: {
    content: {
      public: {
        useQuery: () => ({
          data: {
            profile,
            experiences: [
              {
                id: 1,
                company: "当前公司",
                role: "AI 产品工程师",
                period: "现任",
                ...currentExperience,
                achievements: [
                  ...currentExperience.achievements,
                  "第四条应收敛",
                ],
              },
              {
                id: 2,
                company: "厦门夏商民兴超市有限公司",
                role: "UI 设计师",
                period: "2024—2025",
                summary: "零售数字化",
                achievements: ["代表一", "代表二", "代表三", "夏商第四条"],
              },
              {
                id: 3,
                company: "厦门鼎燚购科技有限公司",
                role: "UI 设计师",
                period: "2023—2024",
                summary: "AI 产品",
                achievements: ["历史成就"],
              },
            ],
          },
        }),
      },
    },
  },
}));
vi.mock("@/hooks/use-phone-layout", () => ({ usePhoneLayout: () => false }));
vi.mock("@/components/PortfolioUI", () => ({
  PortfolioHeader: () => null,
  PortfolioFooter: () => null,
  PublicLoading: () => null,
}));
import Growth from "../../src/pages/Growth";
import PhoneGrowthHero from "../../src/components/mobile/PhoneGrowthHero";

function render(component: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, component));
}
for (const [name, component] of [
  ["desktop", () => createElement(Growth)],
  ["phone", () => createElement(PhoneGrowthHero, { profile })],
] as const) {
  it(`${name} hero exposes identity, evidence and both actions without company or open story`, () => {
    const html = render(component());
    const hero = html.slice(
      html.indexOf("<section"),
      html.indexOf("</section>")
    );
    for (const text of [
      "刘振康",
      "AI 产品工程师",
      "厦门",
      "夏商 · 已上线交付",
      "VIFORM · 可商业交付",
      "MemoRing · App Store",
      "联系我",
      "下载简历",
      "UI/UX → 产品 → Agent 协作实现",
    ])
      expect(hero).toContain(text);
    expect(hero).toContain('href="/#contact"');
    expect(hero).toContain('href="/api/resume/download"');
    expect(hero).not.toContain("当前公司");
    expect(hero).not.toMatch(/<details[^>]*\bopen/);
  });
}
describe("Growth scan", () => {
  it("keeps historical work collapsed, caps current and Xiashang highlights, and groups skills", () => {
    const html = render(createElement(Growth));
    expect(html).toContain("厦门鼎燚购科技有限公司");
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    expect(html).not.toContain("第四条");
    expect(html).not.toContain("长教育叙述");
    expect(html).toContain("多模态创作");
    expect(html).toContain(">交付</h3>");
    expect(html).toContain(">Agent</h3>");
  });
});
