// data.js
// 欢迎回来！这里是你的网站“内容管理系统” (CMS)。
// 只需要修改这里的内容，保存后刷新网页，内容就会更新。

/* ============================================================
   1. 个人信息 (Personal Information)
   注意：必须写成 window.personalInfo，这样 app.js 才能读取到。
   ============================================================ */
window.personalInfo = {
    name: "刘振康",
    englishName: "Liu Zhenkang",
    email: "907210385@qq.com",
    title: "UI/UX Designer",
    headline: "Interface. Identity. Interaction.", // 首页大标题 (Headline / Slogan)
    subHeadline: "以 UI/UX 为核心，融合多维视觉语言，探索商业与美学的最佳平衡点。", // 首页副标题 (Sub-headline)
    wechatQr: "./images/wechat/LK_wechat.jpg", // 微信二维码图片路径

    // 关于我 (About) 部分的介绍文案
    aboutText: "在 6 年的设计旅程中，平面设计的积淀赋予了我对色彩与构图的敏锐直觉，而近 3 年的 UI/UX 实践则教会我用逻辑构建秩序。\n这种双重背景让我明白：好的界面设计，是品牌精神的无声翻译。我不仅关注每一个交互控件的精准呈现，更在意如何在数字端完美还原品牌的独特性格。\n我是设计的执行者，也是新技术的拥抱者，致力于利用 AIGC 探索理性商业逻辑与感性视觉语言的最佳平衡。",

    // 你的技能标签 (Skills Tags)
    skills: ["Figma", "Mastergo", "Design Systems", "Prototyping", "UI/UX", "AIGC / Midjourney / Gemini / sd ", "photoshop"],

    // 文档列表 (Document List / Assets)
    // 请确保 downloads 文件夹里有这些文件，点击时会自动在网页预览 PDF
    documents: [
        {
            name: "中文简历 (Resume CN)",
            file: "./downloads/liuzhenkang's resume_cn.pdf",
            icon: "file-text" // 图标名称 (基于 Lucide 图标库)
        },
        {
            name: "作品集长图 (Portfolio)",
            file: "./downloads/liuzhenkang's portfolio-2025.pdf",
            icon: "folder-open"
        }
    ]
};

/* ============================================================
   2. 项目数据 (Project Data / Portfolio)
   注意：必须写成 window.projects，让数据暴露给全局。
   ============================================================ */
window.projects = [
    // 🟢 示例 1：UI/UX 项目 - 精选作品 (Featured)
    {
        id: 1, // 唯一标识符 (ID)，每个作品的数字必须不同
        type: 'ui', // 类别：ui 代表 UI/UX，visual 代表视觉设计
        title: '夏商到家视觉升级',
        subtitle: '移动端 · C端产品设计 · 小程序',
        tags: ['Mobile design', 'Fresh food mall', 'Visual upgrade'], // 标签 (Labels)
        coverImage: './images/seashine/seashine-project.jpg', // 封面图路径 (Cover)
        color: 'from-blue-600 to-indigo-600', // 如果没封面图，显示的渐变背景色
        featured: true, // 【重要】设为 true，这个作品就会占据一整行，变大展示 (Featured Card)
        demoUrl: '', // 如果有 MasterGo 或 Figma 演示链接，填在这里，详情页会出现“试玩”按钮
        description: '夏商到家小程序改版：重塑视觉规范与 O2O 体验，助力传统零售品牌的年轻化转型。',
        markdownFile: './posts/project1.md' // 详情页的内容来源 (Markdown 文档)
    },

    // 🟢 示例 2：普通 UI/UX 项目 (Standard Card)
    {
        id: 2,
        type: 'ui',
        title: 'MemoRing 智能戒指',
        subtitle: 'iOS / Android · 智能硬件配套',
        tags: ['App Design', 'iOS', 'AIoT'],
        coverImage: './images/memoring/memoring-project.jpg',
        color: 'from-purple-600 to-pink-500',
        featured: false, // 设为 false，则以标准网格大小显示
        demoUrl: '',
        description: '拟物化风格的录音管理工具，连接智能硬件与用户情感。',
        markdownFile: './posts/project2.md'
    },

    // 🔵 示例 3：食谱社区
    {
        id: 3,
        type: 'ui',
        title: '食谱社区 0-1 项目',
        subtitle: 'Mobile app · C端',
        tags: ['Mobile design', 'Recipe', 'Social'],
        coverImage: './images/shike/shike.jpg',
        color: 'from-orange-400 to-yellow-500',
        featured: false,
        demoUrl: '',
        description: '美食美刻：集高效食谱推荐、智能采购清单与兴趣社区于一体。',
        markdownFile: './posts/project3.md'
    },

    // 🔵 示例 4：视觉设计项目 (Visual Design)
    {
        id: 4,
        type: 'visual',
        title: '夏商 IP 形象设计',
        subtitle: '3D 角色设计 · AIGC 辅助',
        tags: ['3D Character', 'IP Design', 'Midjourney'],
        coverImage: './images/ip/001.jpg', // 暂时没图，会显示下面的渐变色
        color: 'from-emerald-500 to-teal-500',
        featured: false,
        demoUrl: '',
        description: '利用 AI 辅助生成的品牌吉祥物，应用于线下门店与线上活动。',
        markdownFile: './posts/project4.md'
    },

    // 🔵 补充：平面设计集合
    {
        id: 5,
        type: 'visual',
        title: '商业平面设计合集',
        subtitle: 'Logo 设计 · 品牌 VI · 广告创意',
        tags: ['Logo Design', 'Poster', 'Typography'],
        coverImage: './images/other/001.jpg', // 建议截取 PDF 第31页或33页作为封面
        color: 'from-gray-700 to-gray-900',
        featured: false,
        demoUrl: '',
        description: '包含国旅环球、夏商有机及蒙牛等品牌的视觉设计案例。',
        markdownFile: './posts/project5.md'
    }
];