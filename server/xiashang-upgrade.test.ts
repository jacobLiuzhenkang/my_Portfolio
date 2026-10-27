import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isXiashangCase,
  normalizeXiashangContent,
  planXiashangUpdate,
  xiashangBaseline,
  xiashangCase,
} from "../db/xiashang-case";

const nextContent = async () =>
  normalizeXiashangContent(await readFile("public/posts/project1.md", "utf8"));

describe("夏商到家 delivery copy", () => {
  it("uses the confirmed summary, shipped tag, and a bounded retrospective", async () => {
    expect(xiashangCase.description).toBe(
      "在第三方 SaaS 约束下完成视觉规范与 O2O 购买路径并上线小程序；会员码/一码付打通线上下权益。"
    );
    expect(xiashangCase.tags).toEqual([
      "Mobile Design",
      "SaaS",
      "Visual Upgrade",
      "已上线交付",
    ]);
    const content = await nextContent();
    expect(content).toContain("视觉规范与组件心智已上线");
    expect(content).toContain("首页、分类与凑单相关改版已上线");
    expect(content).toContain("模块化营销模版体系已上线");
    expect(content).toContain("不对外提供转化、留存或客单数字");
    expect(content).not.toContain("有效提升");
    expect(content).not.toContain("转化率");
    expect(content).not.toContain("年轻用户");
    expect(content).not.toContain("客单价");
    const source = await readFile("src/pages/Home.tsx", "utf8");
    const statusPattern = source.match(
      /const status = project\.tags\.find\(tag => \/([^/]+)\/\.test\(tag\)\);/
    );
    expect(statusPattern).not.toBeNull();
    const statusRegex = new RegExp(statusPattern![1]);
    expect(xiashangCase.tags.find(tag => statusRegex.test(tag))).toBe(
      "已上线交付"
    );
  });

  it("keeps the MasterGo demo and does not leave the old summary in the seed", async () => {
    const seed = await readFile("db/seed.ts", "utf8");
    expect(seed).toContain("description: xiashangCase.description");
    expect(seed).toContain("[...xiashangCase.tags]");
    expect(seed).toContain(
      "https://mastergo.com/goto/PLmm4r8s?page_id=M&layer_id=260:9229&proto=1&shared=true"
    );
    expect(seed).not.toContain(xiashangBaseline.description);
  });
});

describe("planXiashangUpdate", () => {
  const oldCopy = {
    description: xiashangBaseline.description,
    content: xiashangBaseline.content,
    tags: [...xiashangBaseline.tags],
  };

  it("upgrades an untouched import and recognizes the previous line endings", async () => {
    const next = {
      description: xiashangCase.description,
      content: await nextContent(),
      tags: [...xiashangCase.tags],
    };
    expect(next.content).not.toBe(oldCopy.content);
    expect(xiashangBaseline.content).toContain(
      "有效提升了用户在生鲜品类的转化率"
    );
    expect(planXiashangUpdate(oldCopy, next)).toEqual({
      patch: next,
      customFieldsKept: [],
    });
    expect(
      planXiashangUpdate(
        { ...oldCopy, content: oldCopy.content.replaceAll("\n", "\r\n") },
        next
      ).patch.content
    ).toBe(next.content);
  });

  it("keeps each administrator edit and still refreshes the untouched fields", async () => {
    const next = {
      description: xiashangCase.description,
      content: await nextContent(),
      tags: [...xiashangCase.tags],
    };
    expect(
      planXiashangUpdate(
        { ...oldCopy, description: "管理员维护的摘要。" },
        next
      )
    ).toEqual({
      patch: { content: next.content, tags: next.tags },
      customFieldsKept: ["description"],
    });
    expect(
      planXiashangUpdate(
        { ...oldCopy, content: oldCopy.content + "\n\n管理员补充。" },
        next
      )
    ).toEqual({
      patch: { description: next.description, tags: next.tags },
      customFieldsKept: ["content"],
    });
    expect(
      planXiashangUpdate(
        { ...oldCopy, tags: ["Mobile Design", "管理员标签"] },
        next
      )
    ).toEqual({
      patch: { description: next.description, content: next.content },
      customFieldsKept: ["tags"],
    });
    expect(
      planXiashangUpdate(
        { ...oldCopy, tags: [...xiashangBaseline.tags].reverse() },
        next
      ).patch.tags
    ).toBeUndefined();
  });

  it("leaves a fully customized case and an already updated case unchanged", async () => {
    const next = {
      description: xiashangCase.description,
      content: await nextContent(),
      tags: [...xiashangCase.tags],
    };
    expect(
      planXiashangUpdate(
        { description: "自定义摘要", content: "自定义正文", tags: ["自定义"] },
        next
      )
    ).toEqual({
      patch: {},
      customFieldsKept: ["description", "content", "tags"],
    });
    expect(planXiashangUpdate(next, next)).toEqual({
      patch: {},
      customFieldsKept: [],
    });
  });

  it("identifies this case without matching the other 夏商 projects", () => {
    expect(
      isXiashangCase({
        title: xiashangCase.title,
        coverImage: null,
        content: "管理员改过的正文",
      })
    ).toBe(true);
    expect(
      isXiashangCase({
        title: "重命名后的夏商到家",
        coverImage: xiashangCase.coverImage,
        content: "管理员改过的正文",
      })
    ).toBe(true);
    expect(
      isXiashangCase({
        title: "旧标题",
        coverImage: "/images/archive.webp",
        content: xiashangBaseline.content,
      })
    ).toBe(true);
    expect(
      isXiashangCase({
        title: "夏商 IP 形象设计",
        coverImage: "/images/ip/cover.webp",
        content: "夏商咖啡 IP",
      })
    ).toBe(false);
    expect(
      isXiashangCase({
        title: "商业平面设计合集",
        coverImage: "/images/other/cover.webp",
        content: "夏商有机",
      })
    ).toBe(false);
  });

  it("wires the guarded update through content upgrade without touching the demo link", async () => {
    const source = await readFile("db/upgrade-portfolio.ts", "utf8");
    expect(source).toContain('readFile("public/posts/project1.md", "utf8")');
    expect(source).toContain("existingProjects.filter(isXiashangCase)");
    expect(source).toContain("planXiashangUpdate");
    expect(source).not.toContain("demoUrl");
  });
});
