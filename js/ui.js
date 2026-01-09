// js/ui.js
import { setText } from './utils.js';

/* ========================================================================
   1. 移动端菜单逻辑
   ======================================================================== */
let isMenuOpen = false;

export function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileOverlay = document.getElementById('mobile-overlay');
    
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
        // 打开：移除偏移，显示遮罩
        mobileMenu.classList.remove('translate-x-full');
        mobileOverlay.classList.remove('opacity-0', 'invisible');
        // 锁住背景滚动
        document.body.style.overflow = 'hidden';
    } else {
        // 关闭：恢复偏移，隐藏遮罩
        mobileMenu.classList.add('translate-x-full');
        mobileOverlay.classList.add('opacity-0', 'invisible');
        document.body.style.overflow = '';
    }
}

/* ========================================================================
   2. 平滑滚动逻辑
   ======================================================================== */
export function scrollToSection(id) {
    if (isMenuOpen) toggleMobileMenu();
    const element = document.getElementById(id);
    if (element) {
        // 增加偏移量，防止标题被固定导航栏遮挡
        const yOffset = -80; 
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
}

/* ========================================================================
   3. 核心：渲染作品卡片 (响应式模板优化)
   ======================================================================== */
export function renderProjects(projects, filter = 'all') {
    const grid = document.getElementById('projects-grid');
    const wrapper = document.getElementById('projects-wrapper');
    const overlay = document.getElementById('projects-overlay');

    if (!grid) return;

    grid.innerHTML = ''; 
    // 基础 Grid 配置：移动端单列，PC端多列
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0 hover-group bg-transparent";

    const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);

    filtered.forEach(p => {
        // 通用背景逻辑
        const bgContent = p.coverImage
            ? `<img src="${p.coverImage}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${p.title}" loading="lazy"> <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500"></div>`
            : `<div class="absolute inset-0 bg-gradient-to-br ${p.color} transition-transform duration-700 group-hover:scale-105"></div> <div class="absolute inset-0 bg-noise opacity-20"></div>`;

        const card = document.createElement('div');

        // --- 情况 A：精选大卡片 (Featured) ---
        // 移动端：flex-col (垂直堆叠); 桌面端：grid-cols-12 (左右布局)
        if (p.featured && filter === 'all') {
            card.className = 'project-card col-span-1 md:col-span-2 lg:col-span-3 group cursor-pointer animate-fade-in-up';
            card.onclick = () => openModal(p);
            
            card.innerHTML = `
                <div class="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#111] md:bg-white/5 backdrop-blur-2xl shadow-2xl hover:border-white/20 transition-colors">
                    <div class="flex flex-col lg:grid lg:grid-cols-12 gap-0">
                        <div class="h-[240px] md:h-[400px] lg:h-[600px] lg:col-span-7 relative overflow-hidden flex items-center justify-center bg-[#050505]">
                            ${bgContent}
                            ${!p.coverImage ? `<div class="hidden lg:block w-[220px] h-[460px] bg-black rounded-[40px] border-[8px] border-black shadow-2xl transform translate-y-12 group-hover:translate-y-8 group-hover:-rotate-2 transition-all duration-700 ease-out z-10 relative"><div class="w-full h-full bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-white/10 flex flex-col items-center justify-center"><div class="text-4xl">✨</div><div class="mt-4 text-xs text-white/50">Preview</div></div></div>` : ''}
                            <div class="absolute top-4 left-4 md:top-6 md:left-6 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] md:text-xs font-bold border border-white/20 z-20 shadow-lg">FEATURED</div>
                        </div>
                        
                        <div class="lg:col-span-5 p-6 md:p-14 flex flex-col justify-center bg-[#111] lg:bg-transparent border-t lg:border-t-0 lg:border-l border-white/5 relative z-10">
                            <div class="flex flex-wrap gap-2 mb-4 md:mb-6">${p.tags.map(t => `<span class="px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs font-bold uppercase bg-white/5 text-white/70 rounded md:rounded-md border border-white/5">${t}</span>`).join('')}</div>
                            <h3 class="text-2xl md:text-4xl font-bold mb-2 md:mb-3 leading-tight">${p.title}</h3>
                            <p class="text-base md:text-xl text-white/50 mb-6 font-light">${p.subtitle}</p>
                            <p class="text-white/60 mb-8 leading-relaxed text-sm hidden md:block">${p.description}</p>
                            <button class="self-start px-5 py-2.5 md:px-6 md:py-3 rounded-full bg-white text-black font-bold text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                                <span>View Case Study</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
        } 
        // --- 情况 B：普通卡片 (Standard) ---
        else {
            card.className = 'project-card group relative h-[320px] md:h-[380px] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden cursor-pointer border border-white/10 bg-[#111] animate-fade-in-up';
            card.onclick = () => openModal(p);
            
            card.innerHTML = `
                <div class="absolute inset-0 overflow-hidden bg-[#111] transform transition-transform">${bgContent}</div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 md:opacity-60 group-hover:opacity-90 transition-opacity"></div>
                
                <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8 transform translate-y-0 md:translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                     <div class="flex gap-2 mb-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:delay-100">
                        ${p.tags.slice(0,2).map(t => `<span class="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded text-white backdrop-blur-sm">${t}</span>`).join('')}
                     </div>
                     <h3 class="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2 leading-tight">${p.title}</h3>
                     <p class="text-white/60 text-xs md:text-sm line-clamp-1">${p.subtitle}</p>
                </div>`;
        }
        grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
    updateExpandState(wrapper, overlay, filtered.length);
}

function updateExpandState(wrapper, overlay, count) {
    if (!wrapper || !overlay) return;
    wrapper.style.maxHeight = '';
    // 恢复默认折叠高度
    wrapper.classList.add('max-h-[1100px]');
    wrapper.classList.add('[mask-image:linear-gradient(to_bottom,black_70%,transparent)]');
    
    // 如果项目少，自动展开
    if (count <= 4) {
        overlay.classList.add('hidden');
        wrapper.classList.remove('max-h-[1100px]');
        wrapper.classList.remove('[mask-image:linear-gradient(to_bottom,black_70%,transparent)]');
    } else {
        overlay.classList.remove('hidden');
    }
}

export function expandProjects() {
    const wrapper = document.getElementById('projects-wrapper');
    const overlay = document.getElementById('projects-overlay');
    wrapper.classList.remove('max-h-[1100px]');
    // 设置为真实高度，实现平滑过渡
    wrapper.style.maxHeight = wrapper.scrollHeight + "px";
    wrapper.classList.remove('[mask-image:linear-gradient(to_bottom,black_70%,transparent)]');
    overlay.classList.add('hidden');
}

/* ========================================================================
   4. 详情弹窗逻辑 (Bottom Sheet 风格)
   ======================================================================== */
export function openModal(project) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const storyHeader = document.getElementById('story-header');
    const storyBody = document.getElementById('story-body');

    // 1. 构建头部内容
    let actionBtn = '';
    if (project.demoUrl) {
        actionBtn = `
            <a href="${project.demoUrl}" target="_blank" class="inline-flex items-center gap-2 px-6 py-3 mt-6 md:mt-8 rounded-full bg-white text-black font-bold text-xs md:text-sm hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] group z-50 pointer-events-auto">
                <i data-lucide="play-circle" class="w-4 h-4"></i>
                <span>试玩原型 / Play Demo</span>
            </a>`;
    }

    const headerInnerHtml = `
        <div class="text-xs md:text-sm font-bold px-3 py-1 rounded-full border border-white/20 bg-black/30 backdrop-blur mb-4 inline-block uppercase tracking-widest">${project.type}</div>
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-xl text-center px-4 leading-tight">${project.title}</h2>
        ${actionBtn}
    `;

    // 渲染头部背景
    if (project.coverImage) {
        storyHeader.innerHTML = `
            <img src="${project.coverImage}" class="absolute inset-0 w-full h-full object-cover blur-sm opacity-40">
            <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#0a0a0a]"></div>
            <div id="story-header-content" class="z-10 text-center px-4 relative flex flex-col items-center justify-center h-full w-full">${headerInnerHtml}</div>
        `;
    } else {
        storyHeader.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br ${project.color}"></div>
            <div class="absolute inset-0 bg-noise opacity-20"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]"></div>
            <div id="story-header-content" class="z-10 text-center px-4 relative flex flex-col items-center justify-center h-full w-full">${headerInnerHtml}</div>
        `;
    }

    // 2. 加载正文 - 优先显示骨架屏
    storyBody.innerHTML = `
        <div class="animate-pulse space-y-4 max-w-2xl mx-auto pt-8">
            <div class="h-4 bg-white/10 rounded w-3/4"></div>
            <div class="h-4 bg-white/10 rounded w-full"></div>
            <div class="h-4 bg-white/10 rounded w-5/6"></div>
            <div class="h-40 bg-white/5 rounded w-full mt-6"></div>
        </div>
    `;

    if (project.markdownFile) {
        fetch(project.markdownFile)
            .then(res => {
                if (!res.ok) throw new Error('File not found');
                return res.text();
            })
            .then(text => {
                if (typeof marked !== 'undefined') {
                    storyBody.innerHTML = `<div class="prose prose-invert prose-lg max-w-none animate-fade-in">${marked.parse(text)}</div>`;
                } else {
                    storyBody.innerHTML = `<div class="prose prose-invert prose-lg max-w-none animate-fade-in">${text}</div>`;
                }
            })
            .catch(err => {
                storyBody.innerHTML = `<div class="text-center py-10 text-white/40">无法加载文章内容。<br><span class="text-xs text-red-400/50">${err.message}</span></div>`;
            });
    } else {
        storyBody.innerHTML = project.detailContent || '<div class="text-center py-10 text-white/30">暂无详细内容</div>';
    }

    // 3. 打开弹窗动画
    modalOverlay.style.cssText = ''; 
    modalOverlay.classList.remove('invisible', 'pointer-events-none', 'opacity-0');
    
    // 强制重排 (Reflow)
    void modalOverlay.offsetWidth; 

    // Slide Up 动画核心
    modalContent.classList.remove('translate-y-full');
    
    document.body.style.overflow = 'hidden';
    
    if (window.lucide) window.lucide.createIcons();
}

export function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    // Slide Down 动画
    modalContent.classList.add('translate-y-full');
    
    // 延迟隐藏遮罩，等待 Panel 滑下去
    setTimeout(() => {
        modalOverlay.classList.add('opacity-0');
    }, 100);

    setTimeout(() => {
        modalOverlay.classList.add('invisible', 'pointer-events-none');
        document.body.style.overflow = '';
    }, 350);
}

/* ========================================================================
   5. 其他辅助弹窗 (文档列表 & 微信)
   ======================================================================== */
export function openDocList(documents) {
    const modal = document.getElementById('doc-list-modal');
    const container = document.getElementById('doc-list-container');
    
    if (!modal || !container) return;
    container.innerHTML = '';
    
    if(documents && documents.length > 0) {
        documents.forEach(doc => {
            const item = document.createElement('button');
            item.className = "w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-4 group border border-transparent mb-2";
            item.onclick = () => openPdfPreview(doc);
            item.innerHTML = `
                <div class="p-2.5 rounded-lg bg-black/40 text-white/70 group-hover:text-white transition-all">
                    <i data-lucide="${doc.icon || 'file'}"></i>
                </div>
                <div>
                    <div class="font-bold text-white text-sm md:text-base">${doc.name}</div>
                    <div class="text-[10px] md:text-xs text-white/40 mt-0.5">Click to Preview</div>
                </div>
                <i data-lucide="chevron-right" class="ml-auto text-white/20 group-hover:translate-x-1 transition-transform w-4 h-4"></i>
            `;
            container.appendChild(item);
        });
    } else {
        container.innerHTML = '<div class="text-white/30 text-center py-4">No documents available</div>';
    }
    
    if (window.lucide) window.lucide.createIcons();
    
    modal.classList.remove('invisible', 'pointer-events-none', 'opacity-0');
    // 弹起效果
    const panel = modal.children[0];
    panel.classList.remove('scale-95', 'translate-y-20');
}

export function closeDocList() {
    const modal = document.getElementById('doc-list-modal');
    const panel = modal.children[0];
    
    panel.classList.add('scale-95', 'translate-y-20'); // 回缩下沉
    modal.classList.add('opacity-0');
    
    setTimeout(() => {
        modal.classList.add('invisible', 'pointer-events-none');
    }, 300);
}

export function openPdfPreview(doc) {
    closeDocList();
    const modal = document.getElementById('pdf-preview-modal');
    document.getElementById('pdf-title').innerText = doc.name;
    document.getElementById('pdf-frame').src = doc.file;
    document.getElementById('pdf-download-btn').href = doc.file;
    
    modal.classList.remove('invisible', 'pointer-events-none', 'opacity-0');
    document.body.style.overflow = 'hidden';
}

export function closePdfPreview() {
    const modal = document.getElementById('pdf-preview-modal');
    const frame = document.getElementById('pdf-frame');
    
    modal.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
    
    setTimeout(() => {
        if (modal.classList.contains('opacity-0')) {
            modal.classList.add('invisible');
            if(frame) frame.src = '';
        }
    }, 300);
}

export function openWechatModal(qrImage) {
    const modal = document.getElementById('wechat-modal');
    const img = document.getElementById('wechat-qr-img');
    if (qrImage) {
        img.src = qrImage;
        modal.classList.remove('invisible', 'pointer-events-none', 'opacity-0');
        // 缩放出现
        modal.children[0].classList.remove('scale-95');
    } else {
        alert("未配置二维码图片");
    }
}

export function closeWechatModal() {
    const modal = document.getElementById('wechat-modal');
    modal.children[0].classList.add('scale-95');
    modal.classList.add('opacity-0');
    
    setTimeout(() => {
        modal.classList.add('invisible', 'pointer-events-none');
    }, 300);
}