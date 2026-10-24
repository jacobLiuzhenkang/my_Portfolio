import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundledResume } from "./resume-file";
import {
  planProfileUpdate,
  removeRetiredTraining,
} from "../../db/upgrade-portfolio";
import { profileCopy, workflowSkill } from "../../db/portfolio-content";

describe("bundled resume paths", () => {
  it("resolves both development and production copies, and handles a missing file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resume-files-"));
    try {
      expect(await loadBundledResume(root)).toBeNull();
      await mkdir(path.join(root, "public/downloads"), { recursive: true });
      await mkdir(path.join(root, "dist/public/downloads"), {
        recursive: true,
      });
      await writeFile(
        path.join(root, "public/downloads/resume-cn.pdf"),
        "development"
      );
      await writeFile(
        path.join(root, "dist/public/downloads/resume-cn.pdf"),
        "production"
      );
      expect(
        new TextDecoder().decode((await loadBundledResume(root, false))!)
      ).toBe("development");
      expect(
        new TextDecoder().decode((await loadBundledResume(root, true))!)
      ).toBe("production");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("historical content updates", () => {
  it("updates an original field while keeping administrator-written copy and skills", () => {
    const result = planProfileUpdate({
      ...profileCopy,
      headline: "1 Person + AI，从设计走向产品交付",
      introduction: "后台补充的最新介绍。",
      skills: ["个人定制能力", "AI 工作流｜LoRA / DreamBooth 训练"],
    });
    expect(result.patch.headline).toBe(profileCopy.headline);
    expect(result.patch.introduction).toBeUndefined();
    expect(result.patch.skills).toEqual(["个人定制能力", workflowSkill]);
    expect(result.customFieldsKept).toContain("introduction");
  });
  it("plans no writes for already updated profile content", () => {
    expect(
      planProfileUpdate({ ...profileCopy, skills: [workflowSkill] }).patch
    ).toEqual({});
  });
  it("preserves custom clauses outside the retired training claim", () => {
    expect(
      removeRetiredTraining(
        "梳理商品素材流程；训练 LoRA 与 DreamBooth 模型；负责团队协作。"
      )
    ).toBe("梳理商品素材流程；负责团队协作。");
    expect(removeRetiredTraining("保留我在后台另行补充的工作。")).toBe(
      "保留我在后台另行补充的工作。"
    );
  });
});
