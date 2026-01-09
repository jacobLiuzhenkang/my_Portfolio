// js/utils.js

/* ========================================================================
   1. 安全文本修改 (Safe Text Setter)
   作用：防止代码想改文字时，找不到地方（ID不存在）而报错崩溃。
   ======================================================================== */
export const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text; // 只有找到元素了，才修改它的文字
    }
};

/* ========================================================================
   2. 复制邮箱逻辑 (Copy Email Logic)
   作用：调用浏览器的剪贴板功能，把邮箱复制下来。
   ======================================================================== */
export const copyEmail = (email) => {
    // Navigator Clipboard: 浏览器原生的剪贴板 API
    navigator.clipboard.writeText(email).then(() => {
        // 成功后的回调：显示提示框
        showToast();
    }).catch(err => {
        // 失败兜底：如果在某些老旧浏览器不支持，就直接弹窗告诉用户邮箱
        alert("Email: " + email);
    });
};

/* ========================================================================
   3. 显示提示框 (Show Toast)
   作用：控制那个“邮箱已复制”的小黑条弹出来，过一会自己消失。
   ======================================================================== */
export const showToast = () => {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    // 移除隐藏状态的类名，让它显示出来 (Remove hidden classes)
    toast.classList.remove('translate-y-20', 'opacity-0');

    // Timer (定时器): 3000毫秒（3秒）后，把隐藏状态加回去
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
};