// js/app.js
import * as UI from './ui.js';
import * as Utils from './utils.js';

// --- 全局变量与数据获取 ---
// 这里的 projects 和 personalInfo 来自 data.js
const getProjects = () => window.projects || [];
const getInfo = () => window.personalInfo || {};

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化个人信息 (Inject Personal Info)
    const info = getInfo();
    if (info.name) {
        document.title = `${info.name} | ${info.title}`;
        Utils.setText('hero-headline', info.headline);
        Utils.setText('hero-name', `${info.name} (${info.englishName})`);
        Utils.setText('hero-sub', info.subHeadline);
        Utils.setText('footer-name', info.englishName);
        Utils.setText('about-text', info.aboutText);

        const skillsContainer = document.getElementById('about-skills');
        if (skillsContainer && info.skills) {
            skillsContainer.innerHTML = '';
            info.skills.forEach(skill => {
                const span = document.createElement('span');
                // 恢复你原始的 Tailwind 样式类
                span.className = "px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm";
                span.innerText = skill;
                skillsContainer.appendChild(span);
            });
        }
    }

    // 2. 初始化作品列表 (Render Initial Projects)
    UI.renderProjects(getProjects());

    // 3. 绑定筛选按钮点击事件 (Filter Buttons)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 视觉切换：所有按钮变灰
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-white', 'text-black', 'shadow-lg');
                b.classList.add('text-white/60', 'hover:text-white');
            });
            // 视觉切换：当前按钮变白
            const target = e.target;
            target.classList.remove('text-white/60', 'hover:text-white');
            target.classList.add('bg-white', 'text-black', 'shadow-lg');

            // 执行筛选
            UI.renderProjects(getProjects(), target.dataset.filter);
        });
    });

    // 默认激活第一个按钮
    const firstBtn = document.querySelector('.filter-btn');
    if (firstBtn) {
        firstBtn.classList.remove('text-white/60');
        firstBtn.classList.add('bg-white', 'text-black', 'shadow-lg');
    }

    // 4. 监听滚动条，改变导航栏透明度 (Navbar Scroll Effect)
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('bg-black/70', 'backdrop-blur-xl', 'border-b', 'border-white/10');
        } else {
            nav.classList.remove('bg-black/70', 'backdrop-blur-xl', 'border-b', 'border-white/10');
        }
    });

    // 5. 初始化图标 (Init Icons)
    if (window.lucide) window.lucide.createIcons();

    // --- 新增：背景流体跟随效果 ---
    const blob1 = document.getElementById('blob-1');
    const blob2 = document.getElementById('blob-2');
    const blob3 = document.getElementById('blob-3');

    // 记录鼠标位置
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // 记录光球当前的“虚拟位置”
    let blob1X = 0, blob1Y = 0;
    let blob2X = 0, blob2Y = 0;
    let blob3X = 0, blob3Y = 0;

    // 1. 监听鼠标移动，更新目标坐标
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // 2. 动画循环 (每一帧都执行，让光球慢慢追赶鼠标)
    function animateBlobs() {
        // 核心算法：当前位置 = 当前位置 + (目标位置 - 当前位置) * 速度系数
        // 0.05 是慢速，0.1 是中速。不同的速度会产生“拉扯感”。
        
        // Blob 1: 跑得最慢 (深层背景感)
        blob1X += (mouseX - window.innerWidth/2 - blob1X) * 0.02;
        blob1Y += (mouseY - window.innerHeight/2 - blob1Y) * 0.02;

        // Blob 2: 跑得中等，而且反方向移动 (增加动感)
        blob2X += (window.innerWidth - mouseX - window.innerWidth/2 - blob2X) * 0.04;
        blob2Y += (mouseY - window.innerHeight/2 - blob2Y) * 0.04;

        // Blob 3: 跑得最快
        blob3X += (mouseX - window.innerWidth/2 - blob3X) * 0.06;
        blob3Y += (window.innerHeight - mouseY - window.innerHeight/2 - blob3Y) * 0.06;

        // 应用坐标
        if(blob1) blob1.style.transform = `translate(${blob1X}px, ${blob1Y}px)`;
        if(blob2) blob2.style.transform = `translate(${blob2X}px, ${blob2Y}px)`;
        if(blob3) blob3.style.transform = `translate(${blob3X}px, ${blob3Y}px)`;

        requestAnimationFrame(animateBlobs); // 下一帧继续
    }

    // 启动动画
    animateBlobs();
});

/* ========================================================================
   【关键步骤】挂载全局函数 (Expose to Window)
   这就是为什么之前的代码“点不动”的原因：
   HTML onclick 只能看到 window 上的函数，看不到 module 内部的函数。
   所以我们需要手动把它们挂载出去。
   ======================================================================== */

// 导航
window.toggleMobileMenu = UI.toggleMobileMenu;
window.scrollToSection = UI.scrollToSection;

// 作品交互
window.expandProjects = UI.expandProjects;
// 注意：openModal 需要参数，这里直接挂载函数引用即可
window.openModal = UI.openModal;
window.closeModal = UI.closeModal;

// 文档与简历
// 这里用了一个小技巧：点击按钮时，实时去取最新的 personalInfo 数据传进去
window.openDocList = () => UI.openDocList(getInfo().documents);
window.closeDocList = UI.closeDocList;
window.openPdfPreview = UI.openPdfPreview;
window.closePdfPreview = UI.closePdfPreview;

// 联系方式
window.openWechatModal = () => UI.openWechatModal(getInfo().wechatQr);
window.closeWechatModal = UI.closeWechatModal;
window.copyEmail = () => Utils.copyEmail(getInfo().email);