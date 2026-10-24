import { describe, expect, it } from "vitest";
import { caseMarkdown, recentCaseLayout } from "../contracts/project-content";
import { recentProjects } from "../db/portfolio-content";
import {
  recentProjectBaselines,
  recentDetailedProjectBaselines,
} from "../db/recent-project-baselines";
import { planRecentProjectUpdate } from "../db/recent-project-upgrade";

for (const [index, kind] of (["viform", "sac"] as const).entries()) {
  const original = recentProjectBaselines[kind];
  const next = recentProjects[index];
  describe(`${kind} case content upgrade`, () => {
    it("upgrades the delivered detailed version and preserves an edited version", () => {
      const detailed = recentDetailedProjectBaselines[kind];
      expect(planRecentProjectUpdate(detailed, next, kind)).toEqual({
        patch: { content: next.content },
        customFieldsKept: [],
      });
      expect(
        planRecentProjectUpdate(
          { ...detailed, content: detailed.content + "\n\n新增的管理员记录。" },
          next,
          kind
        )
      ).toEqual({ patch: {}, customFieldsKept: ["content"] });
    });
    it("upgrades the original import and both known layout versions", () => {
      for (const content of [
        original.content,
        caseMarkdown(original.content),
        recentCaseLayout(original.content, kind),
      ]) {
        const { patch, customFieldsKept } = planRecentProjectUpdate(
          { ...original, content },
          next,
          kind
        );
        expect(patch).toEqual({
          description: next.description,
          content: next.content,
        });
        expect(customFieldsKept).toEqual([]);
      }
    });

    it("preserves an administrator's body while updating an unchanged summary", () => {
      const content =
        recentCaseLayout(original.content, kind) + "\n\n管理员补充的实际进展。";
      const result = planRecentProjectUpdate(
        { ...original, content },
        next,
        kind
      );
      expect(result.patch).toEqual({ description: next.description });
      expect(result.customFieldsKept).toEqual(["content"]);
    });

    it("preserves a custom summary while updating the unchanged body", () => {
      const result = planRecentProjectUpdate(
        { ...original, description: "管理员维护的首页摘要。" },
        next,
        kind
      );
      expect(result.patch).toEqual({ content: next.content });
      expect(result.customFieldsKept).toEqual(["description"]);
    });

    it("leaves fully customized cases and already updated cases unchanged", () => {
      const custom = planRecentProjectUpdate(
        { description: "自定义摘要", content: "自定义正文" },
        next,
        kind
      );
      expect(custom.patch).toEqual({});
      expect(custom.customFieldsKept).toEqual(["description", "content"]);
      expect(planRecentProjectUpdate(next, next, kind)).toEqual({
        patch: {},
        customFieldsKept: [],
      });
    });
  });
}
