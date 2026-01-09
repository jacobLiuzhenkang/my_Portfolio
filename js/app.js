// js/app.js
import * as UI from './ui.js';
import * as Utils from './utils.js';

// --- 全局变量与数据获取 ---
// 确保 window.projects 和 window.personalInfo 在 data.js 中已定义
const getProjects = () => window.projects || [];
const getInfo = () => window.personalInfo || {};

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化个人信息 (Inject Personal Info)
    const info = getInfo();
    if (info.name) {
        // 设置网页标题
        document.title = `${info.name} | ${info.title}`;
        
        // 使用工具函数安全设置文本
        Utils.setText('hero-headline', info.headline);
        Utils.setText('hero-name', `${info.name} ${info.englishName ? `(${info.englishName})` : ''}`);
        Utils.setText('hero-sub', info.subHeadline);
        Utils.setText('footer-name', info.englishName);
        Utils.setText('about-text', info.aboutText);

        // 渲染技能标签
        const skillsContainer = document.getElementById('about-skills');
        if (skillsContainer && info.skills) {
            skillsContainer.innerHTML = '';
            info.skills.forEach(skill => {
                const span = document.createElement('span');
                // 移动端调整为更小的内边距和字号
                span.className = "px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 border border-white/5 text-xs md:text-sm text-white/70 whitespace-nowrap";
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
        if (!nav) return;
        
        // 移动端超过 20px 就开始变色，电脑端保持 50px
        const threshold = window.innerWidth < 768 ? 20 : 50;
        
        if (window.scrollY > threshold) {
            nav.classList.add('bg-black/80', 'backdrop-blur-xl', 'border-b', 'border-white/5');
        } else {
            nav.classList.remove('bg-black/80', 'backdrop-blur-xl', 'border-b', 'border-white/5');
        }
    });

    // 5. 初始化图标 (Init Icons)
    if (window.lucide) window.lucide.createIcons();

    // --- 新增：背景流体跟随效果 (增加了 Touch 支持) ---
    const blob1 = document.getElementById('blob-1');
    const blob2 = document.getElementById('blob-2');
    const blob3 = document.getElementById('blob-3');

    // 初始位置设为屏幕中心，防止一开始光斑都在左上角
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // 记录光球当前的“虚拟位置”
    let blob1X = 0, blob1Y = 0;
    let blob2X = 0, blob2Y = 0;
    let blob3X = 0, blob3Y = 0;

    // 更新目标坐标的通用函数
    const updateTarget = (x, y) => {
        mouseX = x;
        mouseY = y;
    };

    // 1. 监听鼠标移动
    window.addEventListener('mousemove', (e) => {
        updateTarget(e.clientX, e.clientY);
    });

    // 2. 监听触摸移动 (Mobile Touch Support)
    window.addEventListener('touchmove', (e) => {
        if(e.touches.length > 0) {
            // 获取第一个触点的位置
            updateTarget(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true }); // passive: true 提高滚动性能

    // 3. 动画循环
    function animateBlobs() {
        // 移动端适当减小移动幅度，避免晕眩
        const isMobile = window.innerWidth < 768;
        const speedFactor = isMobile ? 0.5 : 1; 

        // Blob 1: 跑得最慢
        blob1X += (mouseX - window.innerWidth/2 - blob1X) * 0.02 * speedFactor;
        blob1Y += (mouseY - window.innerHeight/2 - blob1Y) * 0.02 * speedFactor;

        // Blob 2: 反方向移动
        blob2X += (window.innerWidth - mouseX - window.innerWidth/2 - blob2X) * 0.04 * speedFactor;
        blob2Y += (mouseY - window.innerHeight/2 - blob2Y) * 0.04 * speedFactor;

        // Blob 3: 跑得最快
        blob3X += (mouseX - window.innerWidth/2 - blob3X) * 0.06 * speedFactor;
        blob3Y += (window.innerHeight - mouseY - window.innerHeight/2 - blob3Y) * 0.06 * speedFactor;

        // 应用坐标
        if(blob1) blob1.style.transform = `translate(${blob1X}px, ${blob1Y}px)`;
        if(blob2) blob2.style.transform = `translate(${blob2X}px, ${blob2Y}px)`;
        if(blob3) blob3.style.transform = `translate(${blob3X}px, ${blob3Y}px)`;

        requestAnimationFrame(animateBlobs); 
    }

    // 启动动画
    animateBlobs();
});

/* ========================================================================
   挂载全局函数 (Expose to Window)
   确保 HTML 中的 onclick 能调用到这些模块化函数
   ======================================================================== */

// 导航
window.toggleMobileMenu = UI.toggleMobileMenu;
window.scrollToSection = UI.scrollToSection;

// 作品交互
window.expandProjects = UI.expandProjects;
window.openModal = UI.openModal;
window.closeModal = UI.closeModal;

// 文档与简历
window.openDocList = () => UI.openDocList(getInfo().documents);
window.closeDocList = UI.closeDocList;
window.openPdfPreview = UI.openPdfPreview;
window.closePdfPreview = UI.closePdfPreview;

// 联系方式
window.openWechatModal = () => UI.openWechatModal(getInfo().wechatQr);
window.closeWechatModal = UI.closeWechatModal;
window.copyEmail = () => Utils.copyEmail(getInfo().email);