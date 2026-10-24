import { recentCaseLayout } from "../contracts/project-content";
/** Public copy shared by the initial seed and the guarded content update. */
export const profileCopy = {
  headline: "把业务问题，做成可运行的产品。",
  introduction:
    "从需求分析、产品设计到 Agent 协作开发，连接创作工具与业务流程，推进产品验证与交付。",
  transitionStory:
    "我的工作从 UI/UX 设计出发，逐渐延伸到产品定义与工程实现。现在，我更关注一个问题如何被理解、被拆解，再变成可以实际使用的产品。\n设计判断、业务理解与 Agent 协作构成了我的工作方式。我参与需求分析、交互与视觉设计，也借助 AI 工具完成前后端实现，与工程同事一起推进代码审查、联调和部署。",
  workingStyle:
    "先理解使用场景和约束，再把目标拆成可验证的任务。通过 Agent 协作组织上下文、产出代码并校验结果；与工程同事协作完成审查、优化、联调与部署。",
};

export const currentExperience = {
  summary:
    "围绕 AI 创作工具与业务场景，连接产品定义、交互设计、Agent 协作开发和工程交付。",
  achievements: [
    "参与 VIFORM 创作工作台迭代，统一参考素材入口、创作记录、结果展示与历史任务恢复，让复杂工具的使用路径保持一致。",
    "推进 SAC 活动站的沉浸式滚动体验与活动流程设计，兼顾内容阅读、移动端使用和正式服务接入边界。",
    "承担需求梳理、产品设计与前后端代码产出；组织验证证据，与工程同事协作进行审查、联调和部署。",
  ],
};

export const workflowSkill = "AI 工作流｜多模态创作流程";

export const recentProjects = [
  {
    title: "VIFORM · AI 创作工作台",
    subtitle: "产品流程 · 交互设计 · Agent 协作开发",
    category: "AI 产品",
    description:
      "把分散的创作工具组织为一致的工作台，打通参考素材、创作记录、成果预览与历史恢复。已完成本地集成验证，持续迭代。",
    content:
      "项目背景\n面向商品视觉与多模态内容创作，已有工具的参数、参考素材和结果入口各不相同。用户需要在创作、记录和项目内容之间反复寻找上下文。\n\n我的贡献\n围绕实际创作路径梳理产品流程，设计并实现共用工作台结构；统一参考图入口与创作记录展示，让任务和结果留在当前工作区。通过 Agent 协作推进前后端实现、兼容处理与验证。\n\n关键取舍\n将工具示例与创作记录放在同一工作台；参考素材可来自上传、素材库或灵感内容。保留任务参数和原始成果，支持刷新恢复与失败重试；对文件型成果如实展示格式与下载入口。\n\n协作与边界\n在团队已有生成、任务与权限基础上完成产品交互调整及兼容整合，与工程同事协作审查和联调。现有供应商能力与团队基础设施不作为个人独立开发成果。\n\n当前阶段\n本地集成及相关流程验证完成，产品持续迭代。此处不将本地验证表述为正式部署或真实供应商效果验收。\n\n图集说明\n截图来自实际本地产品界面，展示工具入口、参考素材和创作记录的组织方式。",
    tags: ["AI 创作", "工作台设计", "任务恢复", "本地验证"],
    coverImage: "/images/viform/workspace.png",
    coverKey: null,
    gallery: ["/images/viform/workspace.png"],
    demoUrl: "https://ecom-aigc-web.laidianbanlv.cn/viform/#/portal",
    featured: true,
    published: true,
    sortOrder: 0,
  },
  {
    title: "SAC · 微光成炬",
    subtitle: "沉浸式体验 · 活动流程 · 产品实现",
    category: "产品设计",
    description:
      "以厦门城市影像串联活动叙事，将活动指南、作品展示与报名投稿流程组织为连贯体验。当前为前端审阅版。",
    content:
      "项目背景\n面向厦门软件园企业的影像征集活动，网站需要同时讲清活动价值、参与要求与操作流程，并让城市影像成为浏览体验的一部分。\n\n我的贡献\n参与活动需求梳理与页面组织，设计和实现沉浸式章节叙事、活动指南、作品展示及报名投稿路径。结合实际反馈迭代桌面与手机布局，并协作梳理业务接入条件。\n\n关键取舍\n以滚动控制影像进度，在完整阅读节点停留；为慢加载、缺帧和不同屏幕保留清晰的阅读路径。活动内容与报名、投稿入口保持可达，不用动画遮挡操作。\n\n验证方式\n检查章节正反向切换、移动端阅读、指南与表单布局；结合本地业务测试核对相关流程。保留真实的未开放与待配置状态。\n\n当前阶段\n前端审阅版可查看。正式报名、投稿、短信与生产审核服务仍需部署接入及实际业务验收；此演示不代表活动服务已经正式开放。\n\n图集说明\n截图来自实际项目审阅页面，展示城市影像叙事与活动信息布局。",
    tags: ["滚动叙事", "活动体验", "移动端", "前端审阅版"],
    coverImage: "/images/sac/home.png",
    coverKey: null,
    gallery: ["/images/sac/home.png", "/images/sac/guide.png"],
    demoUrl: "https://sac.liuzhenkang.cn/",
    featured: true,
    published: true,
    sortOrder: 0,
  },
];

for (const project of recentProjects) {
  project.content = recentCaseLayout(project.content, project.coverImage.includes("/viform/") ? "viform" : "sac");
}

export const historicalWorkflow =
  "搭建 ComfyUI 电商绘图工作流，将图像生成与实际商品素材制作连接起来，支持电商内容生产。";
