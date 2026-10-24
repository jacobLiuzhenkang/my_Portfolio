import { asc, eq } from "drizzle-orm";
import { getDb } from "../server/queries/connection";
import { experiences, projects, resumeProfiles } from "./schema";
import {
  currentExperience,
  historicalWorkflow,
  profileCopy,
  recentProjects,
  workflowSkill,
} from "./portfolio-content";

const originalProfile = {
  headline: "1 Person + AI，从设计走向产品交付",
  introduction:
    "6 年设计与产品实践，近 3 年深入 AI 工作流。经历覆盖 AI 工具、智能硬件与零售数字化，现在以 AI 产品工程师身份，借助多类 Agent 工具把需求分析、产品设计、视觉化工程与前后端 vibecoding 连成一条交付链路。",
  transitionStory:
    "AI 时代，1 Person + AI 可以完成过去需要多个角色协作的事情。我不再只停留在 UI/UX 的表达层，而是继续向前理解需求、定义产品，向后完成视觉化工程和前后端代码产出。\n我并非程序员出身，但通过 Agent 协作与 vibecoding，具备了直接产出可运行产品的能力。设计背景让我更关注用户、场景与体验，工程实践则让这些判断不止于方案，而能变成真实可用的产品。",
  workingStyle:
    "我以 FDE 的方式深入业务现场，从真实问题出发，通过 Agent 工具拆解任务、组织上下文并快速形成产品验证。直接产出产品后，再交付后端部署工程师进行代码审查、优化、联调与部署。对我而言，这不是角色的模糊，而是一条边界清晰、责任明确的现代协作链路。",
};
const originalCurrentSummary =
  "从 UI/UX 扩展到 AI 产品的完整交付链路，以 1 Person + AI 连接业务需求与可运行产品。";
const originalCurrentAchievements = [
  "承担需求分析、产品设计、视觉化工程以及前端、后端代码产出。",
  "通过多类 Agent 工具协作与 vibecoding 直接形成产品，并以 FDE 思路深入业务场景，缩短从问题到验证的距离。",
  "产品产出后交付后端部署工程师进行代码审查、优化、联调与部署，明确工程边界与质量责任。",
];
const retiredTraining = /lora|dreambooth/i;

export function planProfileUpdate(
  profile: typeof originalProfile & { skills: string[] }
) {
  const patch: Partial<typeof resumeProfiles.$inferInsert> = {};
  const customFieldsKept: string[] = [];
  for (const key of Object.keys(profileCopy) as (keyof typeof profileCopy)[]) {
    if (profile[key] === originalProfile[key]) patch[key] = profileCopy[key];
    else if (profile[key] !== profileCopy[key]) customFieldsKept.push(key);
  }
  const skills = [
    ...new Set(
      profile.skills.map(skill =>
        retiredTraining.test(skill) ? workflowSkill : skill
      )
    ),
  ];
  if (JSON.stringify(skills) !== JSON.stringify(profile.skills))
    patch.skills = skills;
  return { patch, customFieldsKept };
}

/** Keep unrelated clauses in edited historical text; remove retired training claims. */
export function removeRetiredTraining(text: string) {
  if (!retiredTraining.test(text)) return text;
  return (
    text
      .split(/(?<=[；。])/u)
      .filter(part => !retiredTraining.test(part))
      .join("")
      .trim() || historicalWorkflow
  );
}

/** Guarded, transactional and safe to re-run without overwriting custom copy. */
export async function upgradePortfolioContent() {
  const db = getDb();
  const result = {
    profileFields: 0,
    experiences: 0,
    projectsAdded: 0,
    customFieldsKept: [] as string[],
  };
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(resumeProfiles)
      .orderBy(asc(resumeProfiles.id))
      .limit(1)
      .for("update");
    if (!profile)
      throw new Error(
        "Initialize the resume profile before updating portfolio content."
      );
    const { patch, customFieldsKept } = planProfileUpdate(profile);
    result.profileFields = Object.keys(patch).length;
    result.customFieldsKept = customFieldsKept;
    if (Object.keys(patch).length)
      await tx
        .update(resumeProfiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(resumeProfiles.id, profile.id));

    for (const experience of await tx.select().from(experiences)) {
      let summary = experience.summary;
      let achievements = experience.achievements;
      if (experience.company === "众联世纪") {
        if (summary === originalCurrentSummary)
          summary = currentExperience.summary;
        achievements = achievements.map(item => {
          const index = originalCurrentAchievements.indexOf(item);
          return index < 0 ? item : currentExperience.achievements[index];
        });
      }
      if (
        summary ===
        "从界面设计进入 AI 产品规划、Prompt 工程、模型训练与 AIGC 商业化落地，参与从产品设计到技术方案协作的完整过程。"
      ) {
        summary =
          "从界面设计进入 AI 产品规划、Prompt 工程与内容工作流，参与从产品设计到商业应用的协作过程。";
      }
      summary = removeRetiredTraining(summary);
      achievements = achievements.map(item =>
        retiredTraining.test(item) &&
        item.startsWith("搭建 ComfyUI 电商绘图工作流")
          ? historicalWorkflow
          : removeRetiredTraining(item)
      );
      if (
        summary !== experience.summary ||
        JSON.stringify(achievements) !== JSON.stringify(experience.achievements)
      ) {
        await tx
          .update(experiences)
          .set({ summary, achievements, updatedAt: new Date() })
          .where(eq(experiences.id, experience.id));
        result.experiences += 1;
      }
    }
    const existingProjects = await tx.select().from(projects);
    for (const project of recentProjects) {
      // An administrator may rename a case; its original local cover also identifies it.
      if (
        existingProjects.some(
          item =>
            item.title === project.title ||
            item.coverImage === project.coverImage ||
            item.content === project.content
        )
      )
        continue;
      await tx.insert(projects).values(project);
      result.projectsAdded += 1;
    }
  });
  return result;
}
