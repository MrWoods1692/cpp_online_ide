// 主应用入口
class MainApp {
    constructor() {
        this.fileManager = null;
        this.codeEditor = null;
        this.compiler = null;
        this.aiChat = null;
        this.settings = null;
        this.keyboardManager = null;
        this.contextMenuFileId = null;
        this.debounceTimers = {};
        
        this.init();
    }

    async init() {
        await this.initializeModules();
        this.exposeGlobalVariables();
        await this.setupInitialFiles();
        this.setupEventListeners();
        this.refreshFileList();
    }

    async initializeModules() {
        this.fileManager = new FileManager();
        this.settings = new Settings();
        this.compiler = new CppCompiler();
        await this.compiler.init();
        
        this.codeEditor = new CodeEditor('editorContainer');
        await this.codeEditor.initEditor();
        
        this.aiChat = new AIChat();
        this.keyboardManager = new KeyboardManager();

        // 等待文件管理器加载完成
        await this.fileManager.loadFiles();
    }

    exposeGlobalVariables() {
        // 暴露到全局
        window.fileManager = this.fileManager;
        window.codeEditor = this.codeEditor;
        window.compiler = this.compiler;
        window.aiChat = this.aiChat;
        window.settings = this.settings;
        window.mainApp = this;
    }

    async setupInitialFiles() {
        // 如果有文件，打开第一个
        const files = this.fileManager.getSortedFiles();
        if (files.length > 0) {
            await this.openFile(files[0].id);
        } else {
            // 创建默认文件
            await this.createDefaultFile();
        }
    }

    async createDefaultFile() {
        const defaultContent = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`;
        await this.codeEditor.createNewFile('main.cpp', defaultContent);
        this.refreshFileList();
        this.showNotification('已创建默认文件 main.cpp', 'success');
    }

    setupEventListeners() {
        this.setupFileSearchListener();
        this.setupEditorControlListeners();
        this.setupAIListeners();
        this.setupContextMenu();
        this.setupEditorContentListener();
        this.setupTerminalMessageListener();
        this.setupFileActionListeners();
    }

    setupFileActionListeners() {
        // 新建文件按钮
        const newFileBtn = document.getElementById('newFileBtn');
        if (newFileBtn) {
            if (window.location.hostname === 'localhost') {
                console.log('🎨 绑定新建文件按钮点击事件');
            }
            newFileBtn.addEventListener('click', () => {
                if (window.location.hostname === 'localhost') {
                    console.log('🎨 新建文件按钮被点击');
                }
                this.handleNewFile();
            });
        } else {
            if (window.location.hostname === 'localhost') {
                console.error('❌ 新建文件按钮不存在');
            }
        }

        // 导入文件按钮
        const importFileBtn = document.getElementById('importFileBtn');
        if (importFileBtn) {
            importFileBtn.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }



        // 文件输入框变化事件
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImportFile(e.target.files[0]);
                    // 重置input，允许重复选择同一个文件
                    e.target.value = '';
                }
            });
        }
    }



    async handleNewFile() {
        if (window.location.hostname === 'localhost') {
            console.log('🎨 处理新建文件请求');
        }
        
        try {
            // 使用自定义的输入对话框替代prompt()函数
            const fileName = await this.showInputDialog('新建文件', '请输入文件名:', 'untitled.cpp');
            
            if (window.location.hostname === 'localhost') {
                console.log('🎨 用户输入的文件名:', fileName);
            }
            
            if (fileName) {
                // 检查文件名是否重复
                const exists = this.fileManager.checkFileNameExists(fileName);
                if (exists) {
                    this.showNotification('文件名已存在，请使用其他名称', 'error');
                    return;
                }
                
                const defaultContent = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`;
                
                if (window.location.hostname === 'localhost') {
                    console.log('🎨 调用codeEditor.createNewFile:', fileName);
                }
                
                await this.codeEditor.createNewFile(fileName, defaultContent);
                this.refreshFileList();
                this.showNotification('文件已创建', 'success');
            } else {
                if (window.location.hostname === 'localhost') {
                    console.log('🎨 用户取消了新建文件操作');
                }
            }
        } catch (error) {
            if (window.location.hostname === 'localhost') {
                console.error('❌ 新建文件失败:', error);
            }
            this.showNotification('创建文件失败: ' + error.message, 'error');
        }
    }

    async handleImportFile(file) {
        try {
            this.showNotification('正在导入文件...', 'info');
            const importedFile = await this.fileManager.importLocalFile(file);
            this.refreshFileList();
            await this.openFile(importedFile.id);
            this.showNotification('文件导入成功', 'success');
        } catch (error) {
            this.showNotification('导入文件失败: ' + error.message, 'error');
        }
    }

    setupFileSearchListener() {
        const fileSearch = document.getElementById('fileSearch');
        if (fileSearch) {
            fileSearch.addEventListener('input', (e) => {
                this.filterFiles(e.target.value);
            });
        }
    }

    setupEditorControlListeners() {
        // 编译运行按钮
        const runBtn = document.getElementById('runBtn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.handleRun();
            });
        }

        // 格式化按钮
        const formatBtn = document.getElementById('formatBtn');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => {
                if (this.codeEditor) {
                    this.codeEditor.format();
                    this.showNotification('代码已格式化', 'success');
                }
            });
        }


    }

    setupAIListeners() {
        // AI发送按钮
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.handleSendAI();
            });
        }

        // AI清空对话按钮
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                if (this.aiChat) {
                    this.aiChat.clearChat();
                }
                this.showNotification('对话已清空', 'info');
            });
        }
    }



    setupEditorContentListener() {
        // 监听编辑器内容变化，更新AI上下文
        // 延迟设置，等待编辑器完全初始化
        setTimeout(() => {
            if (this.codeEditor && this.codeEditor.editor) {
                this.codeEditor.editor.onDidChangeModelContent(() => {
                    this.debounce('updateAIContent', () => {
                        const content = this.codeEditor.getContent();
                        if (this.aiChat) {
                            this.aiChat.setCurrentFileContent(content);
                        }
                    }, 300);
                });
            }
        }, 1000);
    }

    setupTerminalMessageListener() {
        // 监听终端窗口消息
        window.addEventListener('message', (e) => {
            if (e.data.type === 'terminal-input') {
                if (this.compiler) {
                    this.compiler.handleTerminalInput(e.data.data);
                }
            }
        });
    }

    debounce(key, func, delay) {
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }
        this.debounceTimers[key] = setTimeout(func, delay);
    }

    setupContextMenu() {
        this.contextMenu = document.getElementById('contextMenu');
        this.fileList = document.getElementById('fileList');
        
        console.log('上下文菜单初始化，contextMenu:', this.contextMenu, 'fileList:', this.fileList);

        this.setupFileListContextMenu();
        this.setupEditorContextMenu();
        this.setupContextMenuEvents();
    }

    setupFileListContextMenu() {
        // 文件列表右键
        if (this.fileList) {
            this.fileList.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const fileItem = e.target.closest('.file-item');
                if (!fileItem) return;

                const fileId = fileItem.dataset.fileId;
                if (!fileId) return;

                console.log('右键菜单打开，文件ID:', fileId);
                // 先显示菜单
                this.showContextMenu(e.pageX, e.pageY);
                // 然后设置fileId（在hideAllContextMenus()之后）
                this.contextMenuFileId = fileId;
                console.log('设置contextMenuFileId:', this.contextMenuFileId);
            });
        }
    }

    setupEditorContextMenu() {
        // 编辑器右键
        const editorContainer = document.getElementById('editorContainer');
        if (editorContainer) {
            editorContainer.addEventListener('contextmenu', (e) => {
                // 如果选中了文本，显示编辑器右键菜单
                if (this.codeEditor && this.codeEditor.getSelectedText()) {
                    e.preventDefault();
                    this.showEditorContextMenu(e.pageX, e.pageY);
                }
            });
        }
    }

    setupContextMenuEvents() {
        // 右键菜单项点击
        if (this.contextMenu) {
            this.contextMenu.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = e.target.dataset.action;
                const currentFileId = this.contextMenuFileId; // 保存当前fileId
                console.log('菜单项点击，action:', action, 'currentFileId:', currentFileId);
                if (!action) return;

                if (currentFileId) {
                    await this.handleContextMenuAction(action, currentFileId);
                } else {
                    await this.handleEditorContextMenuAction(action);
                }
                
                // 点击后隐藏菜单
                this.hideAllContextMenus();
            });
        }
    }

    showContextMenu(x, y) {
        if (!this.contextMenu) {
            console.error('上下文菜单元素不存在');
            return;
        }

        console.log('显示上下文菜单，位置:', x, y);
        // 隐藏旧菜单
        this.hideAllContextMenus();

        // 确保菜单不会超出视口
        const menuRect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 调整位置以确保菜单在视口内
        const finalX = x + menuRect.width > viewportWidth ? viewportWidth - menuRect.width - 10 : x;
        const finalY = y + menuRect.height > viewportHeight ? viewportHeight - menuRect.height - 10 : y;

        this.contextMenu.style.display = 'flex';
        this.contextMenu.style.left = finalX + 'px';
        this.contextMenu.style.top = finalY + 'px';
        this.contextMenu.style.zIndex = '10000';
        this.contextMenu.style.position = 'fixed';

        console.log('上下文菜单已显示，最终位置:', finalX, finalY);
        // 添加点击外部隐藏菜单的事件
        this.addClickOutsideListener();
    }

    showEditorContextMenu(x, y) {
        // 隐藏旧菜单
        this.hideAllContextMenus();

        // 创建编辑器特定的右键菜单
        const menu = document.createElement('div');
        menu.className = 'context-menu show';
        menu.dataset.type = 'editor-context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="ai-complete">AI补全代码</div>
            <div class="context-menu-item" data-action="ai-explain">AI解释选中代码</div>
            <div class="context-menu-item" data-action="ai-fix">AI修复报错</div>
        `;

        // 确保菜单不会超出视口
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 调整位置以确保菜单在视口内
        const finalX = x + menuRect.width > viewportWidth ? viewportWidth - menuRect.width - 10 : x;
        const finalY = y + menuRect.height > viewportHeight ? viewportHeight - menuRect.height - 10 : y;

        menu.style.left = finalX + 'px';
        menu.style.top = finalY + 'px';
        document.body.appendChild(menu);

        // 添加点击事件
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleEditorContextMenuAction(action);
            }
            this.hideAllContextMenus();
        });

        // 添加点击外部隐藏菜单的事件
        this.addClickOutsideListener();
    }

    hideAllContextMenus() {
        // 隐藏主上下文菜单
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }

        // 隐藏所有临时创建的上下文菜单
        document.querySelectorAll('[data-type="editor-context-menu"]').forEach(menu => {
            menu.remove();
        });

        this.contextMenuFileId = null;
    }

    addClickOutsideListener() {
        // 移除之前的事件监听器（如果有）
        document.removeEventListener('click', this.handleClickOutside);
        
        // 添加新的事件监听器
        this.handleClickOutside = (e) => {
            // 检查点击是否在上下文菜单内部
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                // 检查点击是否在编辑器上下文菜单内部
                const editorMenus = document.querySelectorAll('[data-type="editor-context-menu"]');
                const clickedInsideEditorMenu = Array.from(editorMenus).some(menu => menu.contains(e.target));
                
                if (!clickedInsideEditorMenu) {
                    this.hideAllContextMenus();
                    document.removeEventListener('click', this.handleClickOutside);
                }
            }
        };
        
        document.addEventListener('click', this.handleClickOutside);
    }

    async handleContextMenuAction(action, fileId) {
        try {
            console.log('开始处理上下文菜单操作，action:', action, 'fileId:', fileId);
            const file = await this.fileManager.getFile(fileId);
            console.log('获取文件结果:', file);
            if (!file) {
                this.showNotification('文件不存在', 'error');
                return;
            }

            // 先隐藏右键菜单
            this.hideAllContextMenus();

            switch (action) {
                case 'rename':
                    console.log('执行重命名操作，fileId:', fileId);
                    await this.handleRenameFile(fileId);
                    break;
                case 'delete':
                    console.log('执行删除操作，fileId:', fileId);
                    await this.handleDeleteFile(fileId);
                    break;
                case 'pin':
                    console.log('执行置顶操作，fileId:', fileId);
                    this.handlePinFile(fileId);
                    break;
                case 'ai-complete':
                case 'ai-explain':
                case 'ai-fix':
                    console.log('执行AI操作，action:', action, 'fileId:', fileId);
                    // 打开文件后再执行AI操作
                    await this.openFile(fileId);
                    await this.handleEditorContextMenuAction(action);
                    break;
            }
        } catch (error) {
            console.error('处理上下文菜单操作失败:', error);
            this.showNotification('操作失败: ' + error.message, 'error');
        }
    }

    async handleEditorContextMenuAction(action) {
        if (!this.codeEditor) return;

        const selectedText = this.codeEditor.getSelectedText();
        const content = this.codeEditor.getContent();

        if (!this.aiChat) return;

        switch (action) {
            case 'ai-complete':
                if (selectedText) {
                    await this.aiChat.completeCode(selectedText);
                } else {
                    this.showNotification('请先选中要补全的代码', 'info');
                }
                break;
            case 'ai-explain':
                if (selectedText) {
                    await this.aiChat.explainCode(selectedText);
                } else {
                    this.showNotification('请先选中要解释的代码', 'info');
                }
                break;
            case 'ai-fix':
                // 获取编译错误
                const errors = this.getCurrentErrors();
                if (selectedText) {
                    await this.aiChat.fixCode(selectedText, errors.map(e => e.message).join('\n'));
                } else {
                    await this.aiChat.fixCode(content, errors.map(e => e.message).join('\n'));
                }
                break;
        }
    }

    getCurrentErrors() {
        // 获取当前编辑器的错误标记
        if (!this.codeEditor || !this.codeEditor.editor) return [];
        
        const model = this.codeEditor.editor.getModel();
        if (!model) return [];

        const markers = monaco.editor.getModelMarkers({ resource: model.uri }) || [];
        return markers.map(m => ({
            line: m.startLineNumber,
            column: m.startColumn,
            message: m.message
        }));
    }

    async handleRenameFile(fileId) {
        const file = await this.fileManager.getFile(fileId);
        if (!file) return;

        const newName = await this.showInputDialog('重命名文件', '请输入新文件名:', file.name);
        if (newName && newName !== file.name) {
            try {
                await this.fileManager.renameFile(fileId, newName);
                this.refreshFileList();
                this.showNotification('文件已重命名', 'success');
                
                // 如果当前打开的是这个文件，更新标题
                if (this.codeEditor.currentFileId === fileId) {
                    document.getElementById('editorTitle').textContent = newName;
                }
            } catch (error) {
                this.showNotification('重命名失败: ' + error.message, 'error');
            }
        }
    }

    async handleDeleteFile(fileId) {
        try {
            const file = await this.fileManager.getFile(fileId);
            if (!file) {
                this.showNotification('文件不存在', 'error');
                return;
            }

            console.log('显示删除确认对话框，fileId:', fileId, 'fileName:', file.name);
            const confirmed = await this.showConfirmDialog('确认删除', `确定要删除文件 "${file.name}" 吗？`);
            console.log('用户确认结果:', confirmed);
            
            if (confirmed) {
                console.log('用户确认删除，执行删除操作，fileId:', fileId);
                await this.fileManager.deleteFile(fileId);
                console.log('删除操作完成，刷新文件列表');
                this.refreshFileList();
                
                // 如果删除的是当前打开的文件，关闭它
                if (this.codeEditor.currentFileId === fileId) {
                    const files = this.fileManager.getSortedFiles();
                    if (files.length > 0) {
                        await this.openFile(files[0].id);
                    } else {
                        this.codeEditor.setContent('');
                        this.codeEditor.currentFileId = null;
                        document.getElementById('editorTitle').textContent = '未打开文件';
                    }
                }
                
                this.showNotification('文件已删除', 'success');
                console.log('删除操作成功完成');
            } else {
                console.log('用户取消删除操作，fileId:', fileId);
                this.showNotification('删除操作已取消', 'info');
            }
        } catch (error) {
            console.error('删除文件失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
        }
    }

    handlePinFile(fileId) {
        this.fileManager.togglePin(fileId);
        this.refreshFileList();
        const isPinned = this.fileManager.isPinned(fileId);
        this.showNotification(isPinned ? '文件已置顶' : '已取消置顶', 'info');
    }

    filterFiles(query) {
        const files = query ? this.fileManager.searchFiles(query) : this.fileManager.getSortedFiles();
        this.renderFileList(files);
    }

    refreshFileList() {
        const files = this.fileManager.getSortedFiles();
        this.renderFileList(files);
    }

    renderFileList(files) {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();

        if (files.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<div class="empty-state-text">暂无文件</div>';
            fragment.appendChild(emptyState);
        } else {
            files.forEach(file => {
                const fileItem = this.createFileItem(file);
                fragment.appendChild(fileItem);
            });
        }

        // 清空并添加新内容（一次性DOM操作）
        fileList.innerHTML = '';
        fileList.appendChild(fragment);
    }

    createFileItem(file) {
        const isActive = this.codeEditor && this.codeEditor.currentFileId === file.id;
        const isPinned = this.fileManager.isPinned(file.id);
        const icon = file.name.endsWith('.cpp') || file.name.endsWith('.cxx') || file.name.endsWith('.cc') 
            ? 'cpp' 
            : file.name.endsWith('.h') || file.name.endsWith('.hpp') ? 'h' : 'file';
        
        const fileItem = document.createElement('div');
        fileItem.className = `file-item ${isActive ? 'active' : ''}`;
        fileItem.dataset.fileId = file.id;
        
        fileItem.innerHTML = `
            <span class="file-icon ${icon}"></span>
            <span class="file-item-name">${file.name}</span>
            ${isPinned ? '<span class="file-item-pinned">📌</span>' : ''}
        `;
        
        // 添加点击事件
        fileItem.addEventListener('click', async () => {
            await this.openFile(file.id);
        });
        
        return fileItem;
    }

    async openFile(fileId) {
        try {
            if (!this.codeEditor) {
                throw new Error('代码编辑器未初始化');
            }

            await this.codeEditor.openFile(fileId);
            
            // 更新UI
            const file = await this.fileManager.getFile(fileId);
            const editorTitle = document.getElementById('editorTitle');
            if (file && editorTitle) {
                editorTitle.textContent = file.name;
            }

            // 刷新文件列表以更新激活状态
            this.refreshFileList();

            // 更新AI上下文
            if (this.aiChat) {
                this.aiChat.setCurrentFileContent(this.codeEditor.getContent());
            }
        } catch (error) {
            // 只在开发环境下显示日志
            if (window.location.hostname === 'localhost') {

            }
            this.showNotification('打开文件失败: ' + (error.message || '未知错误'), 'error');
        }
    }

    async handleRun() {
        try {
            if (!this.codeEditor || !this.codeEditor.currentFileId) {
                this.showNotification('请先打开一个文件', 'info');
                return;
            }

            const content = this.codeEditor.getContent();
            if (!content.trim()) {
                this.showNotification('文件内容为空', 'info');
                return;
            }

            // 获取当前文件名
            const file = await this.fileManager.getFile(this.codeEditor.currentFileId);
            const fileName = file ? file.name : 'test.cpp';

            this.showNotification('正在编译...', 'info');

            // 打开终端窗口
            if (!this.compiler.terminalWindow || this.compiler.terminalWindow.closed) {
                this.compiler.openTerminal();
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            // 检查代码是否包含输入操作（cin）
            if (content.includes('cin')) {
                // 使用交互式运行，支持循环读入
                const result = await this.compiler.runInteractive(content, fileName);
                
                // 更新错误标记
                if (result.errors && result.errors.length > 0) {
                    this.codeEditor.updateMarkers(result.errors);
                    this.showNotification('编译失败，请查看错误信息', 'error');
                } else if (result.error) {
                    this.codeEditor.updateMarkers([]);
                    this.showNotification('运行失败: ' + result.error, 'error');
                } else {
                    this.codeEditor.updateMarkers([]);
                    this.showNotification('编译运行成功', 'success');
                }
            } else {
                // 直接编译并运行，不需要输入
                const result = await this.compiler.compileAndRun(content, '', fileName);
                
                // 更新错误标记
                if (result.errors && result.errors.length > 0) {
                    this.codeEditor.updateMarkers(result.errors);
                    this.showNotification('编译失败，请查看错误信息', 'error');
                } else if (result.error) {
                    this.codeEditor.updateMarkers([]);
                    this.showNotification('运行失败: ' + result.error, 'error');
                } else {
                    this.codeEditor.updateMarkers([]);
                    this.showNotification('编译运行成功', 'success');
                }
            }
        } catch (error) {
            // 只在开发环境下显示日志
            if (window.location.hostname === 'localhost') {

            }
            this.codeEditor.updateMarkers([]);
            this.showNotification('运行失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    // 等待用户输入
    promptForInput() {
        return new Promise((resolve) => {
            const handleTerminalInput = (e) => {
                if (e.data.type === 'terminal-input') {
                    window.removeEventListener('message', handleTerminalInput);
                    resolve(e.data.data);
                }
            };
            
            window.addEventListener('message', handleTerminalInput);
        });
    }

    async handleSendAI() {
        try {
            const input = document.getElementById('aiInput');
            if (!input) {
                throw new Error('AI输入框未找到');
            }

            const message = input.value.trim();
            
            if (!message) {
                this.showNotification('请输入消息', 'info');
                return;
            }

            // 获取当前文件内容和选中代码
            const fileContent = this.codeEditor && this.codeEditor.currentFileId 
                ? this.codeEditor.getContent() 
                : '';
            const selectedCode = this.codeEditor ? this.codeEditor.getSelectedText() : '';

            // 发送消息
            await this.aiChat.sendMessage(message, {
                fileContent,
                selectedCode
            });

            // 清空输入框
            input.value = '';
        } catch (error) {
            // 只在开发环境下显示日志
            if (window.location.hostname === 'localhost') {

            }
            this.showNotification('发送消息失败: ' + (error.message || '未知错误'), 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = this.createNotification(message, type);
        this.addNotificationToDOM(notification);
        this.startNotificationTimer(notification);
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">${message}</div>
            <button class="notification-close">
                <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg>
            </button>
        `;
        
        // 添加关闭按钮事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        return notification;
    }

    addNotificationToDOM(notification) {
        // 确保通知容器存在
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // 添加到容器
        notificationContainer.appendChild(notification);
        
        // 添加显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }

    startNotificationTimer(notification) {
        // 设置自动关闭定时器
        notification.timer = setTimeout(() => {
            this.removeNotification(notification);
        }, 4000);
    }

    removeNotification(notification) {
        // 清除定时器
        if (notification.timer) {
            clearTimeout(notification.timer);
        }
        
        // 添加隐藏动画
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }

    // 自定义输入对话框，替代prompt()
    showInputDialog(title, placeholder, defaultValue = '') {
        return new Promise((resolve) => {
            if (window.location.hostname === 'localhost') {
                console.log('🎨 显示输入对话框:', { title, placeholder, defaultValue });
            }
            
            const modal = document.getElementById('inputModal');
            const titleElement = document.getElementById('inputModalTitle');
            const inputField = document.getElementById('inputModalField');
            const confirmBtn = document.getElementById('inputModalConfirmBtn');
            const cancelBtn = document.getElementById('inputModalCancelBtn');
            const closeBtn = document.getElementById('closeInputModalBtn');

            if (!modal || !titleElement || !inputField || !confirmBtn || !cancelBtn) {
                if (window.location.hostname === 'localhost') {
                    console.error('❌ 输入对话框元素不存在:', {
                        modal: !!modal,
                        titleElement: !!titleElement,
                        inputField: !!inputField,
                        confirmBtn: !!confirmBtn,
                        cancelBtn: !!cancelBtn,
                        closeBtn: !!closeBtn
                    });
                }
                resolve(null);
                return;
            }

            // 设置对话框内容
            titleElement.textContent = title;
            inputField.placeholder = placeholder;
            inputField.value = defaultValue;

            // 显示对话框
            if (window.location.hostname === 'localhost') {
                console.log('🎨 显示输入对话框，设置display: flex');
            }
            modal.style.display = 'flex';
            
            // 延迟设置焦点，确保对话框完全显示
            setTimeout(() => {
                inputField.focus();
                inputField.select();
            }, 100);

            // 处理确认事件
            const handleConfirm = () => {
                const value = inputField.value.trim();
                if (window.location.hostname === 'localhost') {
                    console.log('✅ 确认输入:', value);
                }
                modal.style.display = 'none';
                resolve(value);
            };

            // 处理取消事件
            const handleCancel = () => {
                if (window.location.hostname === 'localhost') {
                    console.log('❌ 取消输入');
                }
                modal.style.display = 'none';
                resolve(null);
            };

            // 绑定事件监听器
            confirmBtn.addEventListener('click', handleConfirm, { once: true });
            cancelBtn.addEventListener('click', handleCancel, { once: true });
            if (closeBtn) {
                closeBtn.addEventListener('click', handleCancel, { once: true });
            } else {
                if (window.location.hostname === 'localhost') {
                    console.warn('⚠️  输入对话框关闭按钮不存在，跳过绑定');
                }
            }

            // 处理回车键
            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                }
            }, { once: true });

            // 处理ESC键
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            document.addEventListener('keydown', handleEscape, { once: true });

            // 处理点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            }, { once: true });
        });
    }

    // 自定义确认对话框，替代confirm()
    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleElement = document.getElementById('confirmModalTitle');
            const messageElement = document.getElementById('confirmModalMessage');
            const confirmBtn = document.getElementById('confirmModalConfirmBtn');
            const cancelBtn = document.getElementById('confirmModalCancelBtn');
            const closeBtn = document.getElementById('closeConfirmModalBtn');

            if (!modal || !titleElement || !messageElement || !confirmBtn || !cancelBtn) {
                resolve(false);
                return;
            }

            // 设置对话框内容
            titleElement.textContent = title;
            messageElement.textContent = message;

            // 显示对话框
            modal.style.display = 'flex';

            // 处理确认事件
            const handleConfirm = () => {
                modal.style.display = 'none';
                resolve(true);
            };

            // 处理取消事件
            const handleCancel = () => {
                modal.style.display = 'none';
                resolve(false);
            };

            // 绑定事件监听器
            confirmBtn.addEventListener('click', handleConfirm, { once: true });
            cancelBtn.addEventListener('click', handleCancel, { once: true });
            closeBtn.addEventListener('click', handleCancel, { once: true });

            // 处理ESC键
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            document.addEventListener('keydown', handleEscape, { once: true });

            // 处理点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            }, { once: true });
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new MainApp();
});

// 添加滑出动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
