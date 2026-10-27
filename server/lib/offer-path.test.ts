import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { recentProjects } from "../../db/portfolio-content";

describe("recruiter entry points", () => {
  it("keeps work primary, contact secondary and growth as a quiet link on both heroes", async () => {
    for (const file of ["src/pages/Home.tsx", "src/components/mobile/PhoneHomeHero.tsx"]) {
      const source = await readFile(file, "utf8");
      expect(source).toMatch(/to="\/#work">\s*查看近期作品/);
      expect(source).toMatch(/to="\/#contact">\s*联系我/);
      expect(source).toMatch(/className="pf-hero-resume-link" to="\/growth">\s*经历与简历/);
      expect(source).not.toContain("了解我的经历");
    }
  });

  it("replaces the contact route with the homepage contact anchor", async () => {
    const source = await readFile("src/App.tsx", "utf8");
    expect(source).toContain('<Route path="/contact" element={<Navigate to="/#contact" replace />} />');
    const layout = await readFile("src/components/PublicLayout.tsx", "utf8");
    expect(layout).toContain("location.hash");
  });

  it("explains moderation before a public guestbook submission", async () => {
    const source = await readFile("src/components/guestbook/Composer.tsx", "utf8");
    expect(source).toContain("提交后需站长审核才会公开。请友善交流，保护自己和他人的隐私。");
    expect(source).not.toContain("发布后所有访客可见");
  });

  it("shows the delivery claims as desktop featured-card status badges", async () => {
    const source = await readFile("src/pages/Home.tsx", "utf8");
    const statusPattern = source.match(/const status = project\.tags\.find\(tag => \/([^/]+)\/\.test\(tag\)\);/);
    expect(statusPattern).not.toBeNull();
    const statusRegex = new RegExp(statusPattern![1]);
    const [viform, sac] = recentProjects;
    expect(viform.tags.find(tag => statusRegex.test(tag))).toBe("可恢复工作流");
    expect(sac.tags.find(tag => statusRegex.test(tag))).toBe("可演示交付");
    expect(source).toMatch(/<span className="pf-status">\s*<i \/>\s*\{status\}/);
  });

  it("states demonstrable deliverables and their acceptance boundaries", () => {
    const [viform, sac] = recentProjects;
    expect(viform.tags).toEqual(["AI 创作", "工作台设计", "任务恢复", "可恢复工作流"]);
    expect(viform.content).toContain("参考→参数→生成→比较→恢复");
    expect(viform.content).toContain("真实模型效果与生产部署仍按具体工具和样本分阶段验收");
    expect(sac.tags).toContain("可演示交付");
    expect(sac.description).toContain("正式报名、投稿、短信及生产审核服务尚未接入");
    expect(sac.content).toContain("可演示交付物已齐");
    expect(sac.content).toContain("仍待配置接入及实际业务验收");
    for (const project of [viform, sac]) {
      expect(project.tags).not.toContain("本地验证");
      expect(project.tags).not.toContain("前端审阅版");
    }
  });
});
