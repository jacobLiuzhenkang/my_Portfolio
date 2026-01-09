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
        mobileMenu.classList.remove('translate-x-full');
        mobileOverlay.classList.remove('opacity-0', 'invisible');
        document.body.style.overflow = 'hidden';
    } else {
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
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

/* ========================================================================
   3. 核心：渲染作品卡片
   ======================================================================== */
export function renderProjects(projects, filter = 'all') {
    const grid = document.getElementById('projects-grid');
    const wrapper = document.getElementById('projects-wrapper');
    const overlay = document.getElementById('projects-overlay');

    if (!grid) return;

    grid.innerHTML = ''; 
    // p-8 提供防裁切缓冲区，bg-transparent 防止黑底
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 hover-group bg-transparent";

    const filtered = filter === 'all' ? projects : projects.filter(p => p.type === filter);

    filtered.forEach(p => {
        const bgContent = p.coverImage
            ? `<img src="${p.coverImage}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105" alt="${p.title}"> <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>`
            : `<div class="absolute inset-0 bg-gradient-to-br ${p.color} group-hover:scale-105"></div> <div class="absolute inset-0 bg-noise opacity-20"></div>`;

        const card = document.createElement('div');

        // --- 情况 A：大卡片 ---
        if (p.featured && filter === 'all') {
            card.className = 'project-card col-span-1 md:col-span-2 lg:col-span-3 group cursor-pointer animate-fade-in-up';
            card.onclick = () => openModal(p);
            
            card.innerHTML = `
                <div class="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl hover:border-white/20">
                    <div class="flex flex-col lg:grid lg:grid-cols-12 gap-0">
                        <div class="lg:col-span-7 h-[300px] lg:h-[600px] relative overflow-hidden flex items-center justify-center bg-[#111]">
                            ${bgContent}
                            ${!p.coverImage ? `<div class="w-[220px] h-[460px] bg-black rounded-[40px] border-[8px] border-black shadow-2xl transform translate-y-12 lg:translate-y-20 group-hover:translate-y-8 group-hover:-rotate-2 transition-all duration-700 ease-out z-10 relative"><div class="w-full h-full bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-white/10 flex flex-col items-center justify-center"><div class="text-4xl">✨</div><div class="mt-4 text-xs text-white/50">Preview</div></div></div>` : ''}
                            <div class="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-black/20 backdrop-blur text-white text-xs font-bold border border-white/20 z-20">FEATURED</div>
                        </div>
                        <div class="lg:col-span-5 p-8 md:p-14 flex flex-col justify-center bg-black/20 border-t lg:border-t-0 lg:border-l border-white/5 relative z-10">
                            <div class="flex flex-wrap gap-2 mb-6">${p.tags.map(t => `<span class="px-3 py-1 text-xs font-bold uppercase bg-white/10 text-white/80 rounded-md border border-white/10">${t}</span>`).join('')}</div>
                            <h3 class="text-3xl md:text-4xl font-bold mb-3">${p.title}</h3>
                            <p class="text-xl text-white/50 mb-6 font-light">${p.subtitle}</p>
                            <p class="text-white/70 mb-8 leading-relaxed text-sm hidden md:block">${p.description}</p>
                            <button class="self-start px-6 py-3 rounded-full bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">查看详情 <i data-lucide="arrow-right" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                </div>`;
        } 
        // --- 情况 B：普通卡片 ---
        else {
            card.className = 'project-card group relative h-[380px] rounded-[2rem] overflow-hidden cursor-pointer active:scale-95 border border-white/10 animate-fade-in-up';
            card.onclick = () => openModal(p);
            
            card.innerHTML = `
                <div class="absolute inset-0 overflow-hidden bg-[#111]">${bgContent}</div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 md:opacity-60 group-hover:opacity-90 transition-opacity"></div>
                <div class="absolute bottom-0 left-0 right-0 p-8 transform translate-y-0 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                     <div class="flex gap-2 mb-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:delay-100">${p.tags.slice(0,2).map(t => `<span class="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded text-white backdrop-blur-sm">${t}</span>`).join('')}</div>
                     <h3 class="text-2xl font-bold mb-1 flex items-center gap-2">${p.title}</h3>
                     <p class="text-white/60 text-sm">${p.subtitle}</p>
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
    wrapper.classList.add('max-h-[1100px]');
    wrapper.classList.add('[mask-image:linear-gradient(to_bottom,black_70%,transparent)]');
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
    wrapper.style.maxHeight = wrapper.scrollHeight + "px";
    wrapper.classList.remove('[mask-image:linear-gradient(to_bottom,black_70%,transparent)]');
    overlay.classList.add('hidden');
}

/* ========================================================================
   4. 详情弹窗逻辑 (已修复：解决了第二次点击无法打开的 BUG)
   ======================================================================== */
export function openModal(project) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const storyHeader = document.getElementById('story-header');
    
    // 【优化】直接查找 body 容器，Header 内容我们直接构建字符串覆盖，不再依赖获取旧的 DOM
    const storyBody = document.getElementById('story-body');

    // 1. 构建头部内容字符串
    let actionBtn = '';
    if (project.demoUrl) {
        actionBtn = `
            <a href="${project.demoUrl}" target="_blank" class="inline-flex items-center gap-2 px-6 py-3 mt-8 rounded-full bg-white text-black font-bold text-sm hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] group z-50 pointer-events-auto">
                <i data-lucide="play-circle" class="w-4 h-4"></i>
                <span>试玩原型 / Play Demo</span>
                <i data-lucide="external-link" class="w-3 h-3 opacity-50 ml-1"></i>
            </a>`;
    }

    const headerInnerHtml = `
        <div class="text-4xl md:text-6xl font-bold text-white/30 uppercase tracking-widest">${project.type}</div>
        <h2 class="text-3xl md:text-5xl font-bold text-white mt-4 drop-shadow-lg">${project.title}</h2>
        ${actionBtn}
    `;

    // 【关键修复点】在重新渲染 storyHeader 时，显式地把 id="story-header-content" 加回去
    if (project.coverImage) {
        storyHeader.innerHTML = `
            <img src="${project.coverImage}" class="absolute inset-0 w-full h-full object-cover blur-sm opacity-50">
            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]"></div>
            <div id="story-header-content" class="z-10 text-center px-4 relative flex flex-col items-center">${headerInnerHtml}</div>
        `;
    } else {
        storyHeader.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br ${project.color}"></div>
            <div class="absolute inset-0 bg-noise opacity-20"></div>
            <div id="story-header-content" class="z-10 text-center px-4 relative flex flex-col items-center">${headerInnerHtml}</div>
        `;
    }

    // 2. 加载正文内容
    storyBody.innerHTML = '<div class="flex h-40 items-center justify-center text-white/50 animate-pulse">正在加载内容... / Loading Content...</div>';

    if (project.markdownFile) {
        fetch(project.markdownFile)
            .then(res => {
                if (!res.ok) throw new Error('File not found');
                return res.text();
            })
            .then(text => {
                if (typeof marked !== 'undefined') {
                    storyBody.innerHTML = `<div class="prose prose-invert prose-lg max-w-none">${marked.parse(text)}</div>`;
                } else {
                    storyBody.innerHTML = `<div class="prose prose-invert prose-lg max-w-none">${text}</div>`;
                }
            })
            .catch(err => {
                storyBody.innerHTML = `<div class="text-center py-10 text-white/40">无法加载文章内容。<br><span class="text-xs text-red-400/50">${err.message}</span></div>`;
            });
    } else {
        storyBody.innerHTML = project.detailContent || '<div class="text-center py-10 text-white/30">暂无详细内容</div>';
    }

    // 3. 显示弹窗（重置样式以确保动画生效）
    modalOverlay.style.cssText = ''; 
    modalOverlay.classList.remove('invisible', 'pointer-events-none');
    
    // 强制重排 (Reflow)
    void modalOverlay.offsetWidth; 

    modalOverlay.classList.remove('opacity-0');
    modalContent.classList.remove('translate-y-full');
    
    document.body.style.overflow = 'hidden';
    
    if (window.lucide) window.lucide.createIcons();
}

export function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    modalOverlay.classList.add('opacity-0', 'pointer-events-none');
    modalContent.classList.add('translate-y-full');
    
    document.body.style.overflow = '';

    setTimeout(() => {
        if (modalOverlay.classList.contains('opacity-0')) {
            modalOverlay.classList.add('invisible');
        }
    }, 300);
}

/* ========================================================================
   5. 其他辅助弹窗
   ======================================================================== */
export function openDocList(documents) {
    const modal = document.getElementById('doc-list-modal');
    const container = document.getElementById('doc-list-container');
    if (!modal || !container) return;
    container.innerHTML = '';
    
    if(documents && documents.length > 0) {
        documents.forEach(doc => {
            const item = document.createElement('button');
            item.className = "w-full text-left p-4 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-4 group border border-transparent hover:border-white/5";
            item.onclick = () => openPdfPreview(doc);
            item.innerHTML = `
                <div class="p-3 rounded-lg bg-gradient-to-br from-white/10 to-transparent text-white/70 group-hover:text-white group-hover:bg-white/20 transition-all">
                    <i data-lucide="${doc.icon || 'file'}"></i>
                </div>
                <div>
                    <div class="font-bold text-white group-hover:text-purple-400 transition-colors text-sm">${doc.name}</div>
                    <div class="text-[10px] text-white/40 mt-0.5">Click to Preview</div>
                </div>
                <i data-lucide="chevron-right" class="ml-auto text-white/20 group-hover:translate-x-1 transition-transform w-4 h-4"></i>
            `;
            container.appendChild(item);
        });
    } else {
        container.innerHTML = '<div class="text-white/30 text-center py-4">No documents available</div>';
    }
    
    if (window.lucide) window.lucide.createIcons();
    
    modal.style.cssText = ''; 
    modal.classList.remove('invisible', 'pointer-events-none');
    void modal.offsetWidth; 
    modal.classList.remove('opacity-0');
    modal.children[0].classList.remove('scale-95');
}

export function closeDocList() {
    const modal = document.getElementById('doc-list-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.children[0].classList.add('scale-95');
    
    setTimeout(() => {
        if (modal.classList.contains('opacity-0')) {
            modal.classList.add('invisible');
        }
    }, 300);
}

export function openPdfPreview(doc) {
    closeDocList();
    const modal = document.getElementById('pdf-preview-modal');
    document.getElementById('pdf-title').innerText = doc.name;
    document.getElementById('pdf-frame').src = doc.file;
    document.getElementById('pdf-download-btn').href = doc.file;
    
    modal.style.cssText = '';
    modal.classList.remove('invisible', 'pointer-events-none');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
}

export function closePdfPreview() {
    const modal = document.getElementById('pdf-preview-modal');
    const frame = document.getElementById('pdf-frame');
    modal.classList.add('opacity-0', 'pointer-events-none');
    
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
        modal.style.cssText = '';
        modal.classList.remove('invisible', 'pointer-events-none');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.children[0].classList.remove('scale-95');
    } else {
        alert("未配置二维码图片");
    }
}

export function closeWechatModal() {
    const modal = document.getElementById('wechat-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.children[0].classList.add('scale-95');
    
    setTimeout(() => {
        if (modal.classList.contains('opacity-0')) {
            modal.classList.add('invisible');
        }
    }, 300);
}