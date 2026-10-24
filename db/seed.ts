import { readFile } from "node:fs/promises";
import { count } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { experiences, projects, resumeProfiles, storedFiles } from "./schema";
import { storage } from "../api/lib/storage";
import {
  currentExperience,
  historicalWorkflow,
  profileCopy,
  workflowSkill,
} from "./portfolio-content";
import { upgradePortfolioContent } from "./upgrade-portfolio";

function plain(markdown: string) {
  return markdown
    .split("\n")
    .filter(
      line => !/^\s*!\[/.test(line) && !/^\s*(---|___|\*\*\*)\s*$/.test(line)
    )
    .map(line =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/^\s*[-*+]\s+/, "• ")
        .trimEnd()
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function seed() {
  const db = getDb();
  const [existing] = await db.select({ value: count() }).from(resumeProfiles);
  if (Number(existing?.value ?? 0) > 0) {
    console.log(
      "Seed skipped: existing content and administrator edits are preserved."
    );
    process.exit(0);
  }

  let resumeFileKey: string | null = null;
  const pdfPath = "public/downloads/resume-cn.pdf";
  try {
    const bytes = await readFile(pdfPath);
    const saved = await storage.uploadFile({
      fileContent: new Uint8Array(bytes),
      fileName: "resumes/刘振康-中文简历.pdf",
      contentType: "application/pdf",
    });
    resumeFileKey = saved.key;
    await db.insert(storedFiles).values({
      key: saved.key,
      ownerId: null,
      name: "刘振康-中文简历.pdf",
      size: saved.size,
      contentType: "application/pdf",
    });
  } catch (error) {
    console.warn(
      "Resume PDF was not seeded:",
      error instanceof Error ? error.message : error
    );
  }

  await db.insert(resumeProfiles).values({
    fullName: "刘振康",
    englishName: "Liu Zhenkang",
    headline: profileCopy.headline,
    role: "AI 产品工程师",
    company: "众联世纪",
    location: "厦门",
    email: "907210385@qq.com",
    phone: null,
    introduction: profileCopy.introduction,
    transitionStory: profileCopy.transitionStory,
    workingStyle: profileCopy.workingStyle,
    education:
      "厦门大学 · 本科 · 数字媒体艺术设计\n2015—2019\n在校期间担任多个学生干部职位，参与新闻报道与活动组织，获优秀学生干部、创业创新等奖项，并学习视觉艺术与管理课程。",
    skills: [
      "Agent 协作｜多 Agent 任务拆解",
      "Agent 协作｜上下文工程",
      "Agent 协作｜工具调用与工作流集成",
      "Agent 协作｜结果校验与迭代",
      "AI 产品｜业务需求分析",
      "AI 产品｜产品定义与交互原型",
      "AI 产品｜Prompt Engineering",
      "AI 产品｜大模型与知识库流程",
      "工程实现｜Vibecoding",
      "工程实现｜前端产品实现",
      "工程实现｜后端与 API 实现",
      "工程实现｜可运行产品交付",
      "AI 工作流｜ComfyUI 商业化工作流",
      workflowSkill,
      "AI 工作流｜AIGC 电商应用",
      "AI 工作流｜FDE 业务现场协作",
    ],
    resumeFileKey,
  });

  await db.insert(experiences).values([
    {
      company: "众联世纪",
      role: "AI 产品工程师",
      period: "现任",
      ...currentExperience,
      sortOrder: 1,
      published: true,
    },
    {
      company: "厦门夏商民兴超市有限公司",
      role: "UI 设计师",
      period: "2024.08—2025.12",
      summary:
        "围绕零售数字化、Design Ops 与全渠道品牌标准化，建立可持续维护的视觉体系，并推动 AI 工作流进入团队协作。",
      achievements: [
        "主导夏商到家小程序视觉改版，在第三方 SaaS 组件不可修改的限制下重构色彩体系与组件库，统一线上线下品牌心智。",
        "独立承担全年小程序视觉维护，覆盖弹窗、Banner、Icon、营销组件与活动二级页面，并支持商品、团购等部门需求。",
        "搭建需求管理智能表格与在线协作流程，量化设计产出，优化设计组需求承接、分配与归纳效率。",
        "统筹连锁门店营销视觉规范，输出 POP、货架标签、上墙物料与灯箱等标准化模板，降低沟通与试错成本。",
        "负责夏商优选 Logo、包装与商品画册，以及夏商咖啡 IP、冰箱贴等周边开发，从 0 到 1 建设品牌视觉资产。",
        "独立组织跟进年度广告公司招标与夏商咖啡门店装修设计项目，并持续调研 AI 生图和大语言模型，将新方法引入设计流程。",
      ],
      sortOrder: 2,
      published: true,
    },
    {
      company: "厦门鼎燚购科技有限公司",
      role: "UI 设计师",
      period: "2023.02—2024.06",
      summary:
        "从界面设计进入 AI 产品规划、Prompt 工程与内容工作流，参与从产品设计到商业应用的协作过程。",
      achievements: [
        "独立负责 AI 高考志愿助手、AI 聊天工具与 AI 绘画工具的界面和交互设计，参与竞品分析、产品规划、功能设计与商业路线讨论。",
        "在 AI 高考志愿助手中主导 Prompt 工程，并与工程师规划大语言模型结合向量知识库的工作流程，同时参与运营与市场推广策略。",
        historicalWorkflow,
        "将 AI 绘画应用于电商摄影，替代部分传统模特拍摄流程，从 0 到 1 探索可盈利的新业务链条。",
        "使用 ChatGPT 辅助编写 ComfyUI 功能插件代码，扩展工具易用性；独立部署 WebUI、ComfyUI、Kohya_SS 等服务器工具。",
        "深度参与商业计划书与产品路线图规划，持续跟踪最新 AI 技术并转化为团队可用的工作方法。",
      ],
      sortOrder: 3,
      published: true,
    },
    {
      company: "MemoRing 智能指环 App",
      role: "独立 UI/UX 设计 · AIoT 智能硬件",
      period: "2024.09 · V1.0 已上线",
      summary:
        "为盛大认知科技研发的蓝牙录音指环设计配套应用，连接无屏硬件、AI 转写、多语言翻译与会议摘要，完成 V1.0 并上线 App Store。",
      achievements: [
        "梳理硬件连接、静默录音、同步处理到知识沉淀的完整用户路径，绘制全链路体验地图。",
        "针对电量与连接焦虑设计可视化硬件管理面板，以触觉反馈和软件状态映射提升无屏设备的交互确定性。",
        "以黑胶唱片与唱针反馈构建情感化播放体验，为效率工具建立差异化的视觉记忆点。",
        "面向长文本转写设计暗黑沉浸阅读系统，通过说话人色彩与中英对照层级降低阅读负荷。",
        "从 0 到 1 建立视觉体系、标准组件库与线性科技风图标集，完成 V1.0 设计落地。",
      ],
      sortOrder: 4,
      published: true,
    },
    {
      company: "智能印花",
      role: "产品经理 · 独立项目",
      period: "2024.04 · AI 产品设计",
      summary:
        "面向服装印花同质化与人工设计成本问题，探索让 B 端与 C 端用户低门槛完成图案设计的 AI 工作流。",
      achievements: [
        "负责技术路线探索与美学把控，调研 GitHub 开源代码，将 GPT-4V、Midjourney 与 DALL·E 3 规划进同一工作流。",
        "指导开发人员完成单图参考与相似图案生成功能，让普通用户能够低门槛参与印花设计。",
        "通过 Prompt 提示词工程稳定出图质量与商用表现，获得 B 端电商客户认可并实现项目初步创收。",
      ],
      sortOrder: 5,
      published: true,
    },
    {
      company: "自由职业",
      role: "平面 / UIUX 设计",
      period: "2020.03—2023.01",
      summary:
        "在商业视觉与独立产品项目中，建立从品牌表达到完整产品体验的设计能力。",
      achievements: [
        "完成日常海报、PPT 模板、服装 DIY 与商业视觉设计。",
        "持续积累品牌、排版与视觉叙事能力，为后续 UI/UX 和 AI 产品实践建立设计基础。",
      ],
      sortOrder: 6,
      published: true,
    },
  ]);

  const source = [
    {
      file: "project1.md",
      title: "夏商到家视觉升级",
      subtitle: "移动端 · C 端产品设计 · 小程序",
      category: "产品设计",
      description:
        "在第三方 SaaS 限制下重塑视觉规范与 O2O 体验，建立线上线下统一的品牌心智。",
      tags: ["Mobile Design", "SaaS", "Visual Upgrade"],
      coverImage: "/images/seashine/cover.webp",
      gallery: [1, 2, 3, 4, 5].map(n => `/images/seashine/${n}.webp`),
      demoUrl:
        "https://mastergo.com/goto/PLmm4r8s?page_id=M&layer_id=260:9229&proto=1&shared=true",
      featured: true,
    },
    {
      file: "project2.md",
      title: "MemoRing 智能指环",
      subtitle: "iOS / Android · AIoT 智能硬件配套",
      category: "AI 产品",
      description:
        "连接无屏硬件、AI 转写与知识沉淀，完成 V1.0 设计并上线 App Store。",
      tags: ["AIoT", "App Design", "Product 0—1"],
      coverImage: "/images/memoring/cover.webp",
      gallery: [1, 2, 3, 4, 5, 6].map(n => `/images/memoring/${n}.webp`),
      demoUrl:
        "https://mastergo.com/goto/PK8cJYku?page_id=M&layer_id=83:1118&proto=1&shared=true",
      featured: false,
    },
    {
      file: "project3.md",
      title: "食刻 · 食谱社区 0—1",
      subtitle: "Mobile App · C 端产品",
      category: "产品设计",
      description:
        "集食谱推荐、智能采购清单与兴趣社区于一体，从 0 到 1 构建完整体验。",
      tags: ["Mobile Design", "Recipe", "Community"],
      coverImage: "/images/shike/cover.webp",
      gallery: [1, 2, 3, 4, 5].map(n => `/images/shike/${n}.webp`),
      demoUrl: null,
      featured: false,
    },
    {
      file: "project4.md",
      title: "夏商 IP 形象设计",
      subtitle: "3D 角色设计 · AIGC 辅助",
      category: "视觉设计",
      description: "利用 AI 辅助生成品牌吉祥物，并延展到线下门店与线上活动。",
      tags: ["3D Character", "IP Design", "AIGC"],
      coverImage: "/images/ip/cover.webp",
      gallery: [1, 2, 3].map(n => `/images/ip/${n}.webp`),
      demoUrl: null,
      featured: false,
    },
    {
      file: "project5.md",
      title: "商业平面设计合集",
      subtitle: "Logo · 品牌 VI · 广告创意",
      category: "视觉设计",
      description: "包含国旅环球、夏商有机及蒙牛等品牌的商业视觉设计案例。",
      tags: ["Logo Design", "Poster", "Typography"],
      coverImage: "/images/other/cover.webp",
      gallery: [1, 2, 3, 4].map(n => `/images/other/${n}.webp`),
      demoUrl: null,
      featured: false,
    },
  ];

  for (const [index, item] of source.entries()) {
    const markdown = await readFile(`public/posts/${item.file}`, "utf8");
    const { file: _file, ...data } = item;
    await db.insert(projects).values({
      ...data,
      content: plain(markdown),
      coverKey: null,
      published: true,
      sortOrder: index + 1,
    });
  }

  console.log("Portfolio content update:", await upgradePortfolioContent());
  console.log(
    "Seeded resume, 6 experiences and 7 projects. Local PDF remains available without cloud storage."
  );
  process.exit(0);
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
