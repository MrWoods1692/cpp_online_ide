// 快捷键管理
class KeyboardManager {
    constructor() {
        this.setupShortcuts();
    }

    // 快速检查是否在编辑器中（使用最可靠的方法）
    isInEditor(e) {
        // 方法1: 使用Monaco Editor的hasTextFocus()方法（最可靠）
        if (window.codeEditor && window.codeEditor.editor) {
            try {
                if (window.codeEditor.editor.hasTextFocus && window.codeEditor.editor.hasTextFocus()) {
                    return true;
                }
            } catch (err) {
                // 忽略错误，继续其他检查
            }
        }
        
        // 方法2: 检查activeElement（如果Monaco有焦点）
        const activeEl = document.activeElement;
        if (activeEl) {
            // 检查是否在编辑器容器内
            if (activeEl.closest && activeEl.closest('#editorContainer')) {
                return true;
            }
            // Monaco可能在iframe中
            if (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT') {
                const container = activeEl.closest('.monaco-editor') || 
                                 activeEl.closest('#editorContainer');
                if (container) {
                    return true;
                }
            }
        }
        
        // 方法3: 检查事件目标
        const target = e.target;
        if (target) {
            if (target.closest && (target.closest('#editorContainer') || target.closest('.monaco-editor'))) {
                return true;
            }
            // 检查DOM节点包含关系
            if (window.codeEditor && window.codeEditor.editor) {
                try {
                    const editorDom = window.codeEditor.editor.getDomNode();
                    if (editorDom && editorDom.contains(target)) {
                        return true;
                    }
                } catch (err) {
                    // 忽略错误
                }
            }
        }
        
        return false;
    }

    setupShortcuts() {
        // 使用passive监听，不阻止默认行为，让Monaco先处理
        document.addEventListener('keydown', (e) => {
            // 快速检查：如果是编辑器内的普通按键，立即返回，完全不做任何处理
            const inEditor = this.isInEditor(e);
            
            // 如果是编辑器内的按键，只处理特定的全局快捷键
            if (inEditor) {
                // 只处理这些全局快捷键，其他完全让Monaco处理
            const isGlobalShortcut = 
                (e.ctrlKey && e.altKey && (e.key === 'n' || e.key === 'k' || e.key === 'y' || e.key === 's')) ||
                (e.key === 'F11');
                
                if (!isGlobalShortcut) {
                    // 不是全局快捷键，完全放行，不做任何处理
                    // 特别针对Backspace、Delete、Enter等按键，确保Monaco能正常处理
                    // 不调用preventDefault()，不调用stopPropagation()，让事件自然传播到Monaco
                    return;
                }
                
                // 处理全局快捷键
                if (e.ctrlKey && e.altKey && e.key === 'n') {
                    e.preventDefault();
                    this.handleNewFile();
                    return;
                }
                
                if (e.ctrlKey && e.altKey && e.key === 'k') {
                    e.preventDefault();
                    this.handleNewChat();
                    return;
                }
                
                if (e.ctrlKey && e.altKey && e.key === 'y') {
                    e.preventDefault();
                    this.handleConfirmOverwrite();
                    return;
                }
                
                if (e.ctrlKey && e.altKey && e.key === 's') {
                    e.preventDefault();
                    if (window.settings) {
                        window.settings.openModal();
                    }
                    return;
                }
                
                if (e.key === 'F11') {
                    e.preventDefault();
                    this.handleRun();
                    return;
                }
                
                return;
            }

            // 不在编辑器内，处理所有快捷键
            // Ctrl+Alt+N: 新建文件
            if (e.ctrlKey && e.altKey && e.key === 'n') {
                e.preventDefault();
                this.handleNewFile();
                return;
            }

            // Ctrl+Alt+K: 新建对话
            if (e.ctrlKey && e.altKey && e.key === 'k') {
                e.preventDefault();
                this.handleNewChat();
                return;
            }

            // Ctrl+Alt+Y: 确认覆盖代码
            if (e.ctrlKey && e.altKey && e.key === 'y') {
                e.preventDefault();
                this.handleConfirmOverwrite();
                return;
            }



            // Ctrl+Alt+S: 打开设置
            if (e.ctrlKey && e.altKey && e.key === 's') {
                e.preventDefault();
                if (window.settings) {
                    window.settings.openModal();
                }
                return;
            }



            // F11: 运行
            if (e.key === 'F11') {
                e.preventDefault();
                this.handleRun();
                return;
            }

            // Ctrl+Enter: 发送AI消息（只在AI输入框内）
            if (e.ctrlKey && e.key === 'Enter') {
                const aiInput = document.getElementById('aiInput');
                if (document.activeElement === aiInput) {
                    e.preventDefault();
                    this.handleSendAI();
                    return;
                }
            }

            // Tab: 缩进（在编辑器中由Monaco处理）
            // 这里不需要特殊处理，除非需要在其他区域也支持

            // Ctrl+A: 全选（浏览器默认）
            // Ctrl+C: 复制（浏览器默认）
            // Ctrl+V: 粘贴（浏览器默认）
            // 这些由浏览器默认处理即可
        });
    }

    async handleNewFile() {
        if (window.mainApp && window.mainApp.showInputDialog) {
            const name = await window.mainApp.showInputDialog('新建文件', '请输入文件名:', 'untitled.cpp');
            if (name && window.codeEditor) {
                await window.codeEditor.createNewFile(name, '');
                // 刷新文件列表
                if (window.mainApp && window.mainApp.refreshFileList) {
                    window.mainApp.refreshFileList();
                }
            }
        }
    }

    handleNewChat() {
        if (window.aiChat) {
            window.aiChat.clearChat();
        }
    }

    handleConfirmOverwrite() {
        // 这个功能在AI消息的操作按钮中实现
        // 快捷键可以触发最近一次的覆盖操作
        const chatContainer = document.getElementById('aiChat');
        const overwriteBtn = chatContainer.querySelector('.message-action-btn');
        if (overwriteBtn && overwriteBtn.textContent === '覆盖代码') {
            overwriteBtn.click();
        }
    }



    handleRun() {
        // 编译运行
        const runBtn = document.getElementById('runBtn');
        if (runBtn) {
            runBtn.click();
        }
    }

    handleSendAI() {
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.click();
        }
    }
}

window.KeyboardManager = KeyboardManager;
