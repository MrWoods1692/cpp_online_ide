// 代码编辑器管理
class CodeEditor {
    constructor(containerId) {
        this.containerId = containerId;
        this.editor = null;
        this.currentFileId = null;
        this.saveTimer = null;
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 5000;
        
        this.setupAutoSave();
    }

    async initEditor() {
        // 防止重复初始化
        if (this.editor) {
            return Promise.resolve();
        }

        // 确保容器存在
        const container = document.getElementById(this.containerId);
        if (!container) {
            return Promise.resolve();
        }

        // 统一使用setupMonaco方法，它会处理Monaco加载
        return this.setupMonaco();
    }

    // 手动加载Monaco Editor
    loadMonacoManually() {
        return new Promise((resolve, reject) => {
            // 检查是否已经有loader.js
        if (typeof require === 'undefined') {
            reject(new Error('Monaco Editor加载器未加载'));
            return;
        }
            
            // 直接尝试加载Monaco，不等待
            require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
            
            // 尝试加载编辑器主模块
            require(['vs/editor/editor.main'], () => {
                resolve();
            }, (error) => {
                reject(error);
            });
        });
    }

    // 简化的setupMonaco方法
    setupMonaco() {
        return new Promise((resolve) => {
            // 防止重复创建编辑器实例
            if (this.editor) {
                resolve();
                return;
            }

            // 确保容器存在
        const container = document.getElementById(this.containerId);
        if (!container) {
            resolve();
            return;
        }

            // 检查Monaco是否已通过CDN加载
            if (window.monaco) {
                this.createEditorInstance(container).then(() => {
                    resolve();
                });
                return;
            }

            // 如果Monaco未加载，使用require.js加载
            if (typeof require === 'undefined') {
                // 尝试通过CDN直接加载Monaco
                this.loadMonacoViaCdn().then(() => {
                    this.createEditorInstance(container).then(() => {
                        resolve();
                    }).catch((error) => {
                        resolve();
                    });
                }).catch((error) => {
                    resolve();
                });
                return;
            }

            require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

            // 加载并创建编辑器
            require(['vs/editor/editor.main'], () => {
                this.createEditorInstance(container).then(() => {
                    resolve();
                }).catch((error) => {
                    resolve();
                });
            }, (error) => {
                resolve();
            });
        });
    }

    // 通过CDN直接加载Monaco
    loadMonacoViaCdn() {
        return new Promise((resolve, reject) => {
            if (window.monaco) {
                resolve();
                return;
            }

            // 检查是否已经添加了脚本
            const existingScript = document.getElementById('monaco-cdn-script');
            if (existingScript) {
                // 等待脚本加载完成
                existingScript.onload = () => {
                    resolve();
                };
                existingScript.onerror = () => {
                    reject(new Error('Monaco CDN加载失败'));
                };
                return;
            }

            // 创建并添加脚本标签
            const script = document.createElement('script');
            script.id = 'monaco-cdn-script';
            script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
            script.async = true;
            script.onload = () => {
                // 加载Monaco主模块
                require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
                require(['vs/editor/editor.main'], () => {
                    resolve();
                }, (error) => {
                    reject(new Error('Monaco主模块加载失败: ' + error));
                });
            };
            script.onerror = () => {
                reject(new Error('Monaco加载器脚本加载失败'));
            };
            document.head.appendChild(script);
        });
    }

    // 创建编辑器实例
    createEditorInstance(container) {
        return new Promise((resolve, reject) => {
            try {
                if (window.location.hostname === 'localhost') {
                    console.log('🎨 创建编辑器实例...');
                }
                
                // 清理容器，确保没有旧的编辑器实例
                container.innerHTML = '';
                
                // 创建新的编辑器实例
                this.editor = monaco.editor.create(container, {
                    value: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
                    language: 'cpp',
                    theme: document.body.classList.contains('theme-dark') ? 'vs-dark' : 'vs',
                    automaticLayout: true,
                    fontSize: 14,
                    lineNumbers: 'on',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    tabSize: 4,
                    insertSpaces: true,
                    detectIndentation: false,
                    renderWhitespace: 'selection',
                    glyphMargin: true,
                    folding: true,
                    renderLineHighlight: 'all',
                    acceptSuggestionOnEnter: 'on',
                    acceptSuggestionOnCommitCharacter: true,
                    snippetSuggestions: 'top',
                    wordBasedSuggestions: 'allDocuments',
                    deleteWhitespace: 'on',
                    useTabStops: true,
                    renderControlCharacters: false,
                    eol: monaco.editor.EndOfLineSequence.LF,
                    readOnly: false,
                    overviewRulerBorder: false
                });

                if (window.location.hostname === 'localhost') {
                    console.log('✅ 编辑器实例创建成功！');
                }

                // 注册C++语言特性
                this.registerCppLanguage();
                
                // 配置C++语言服务，禁用头文件检查
                monaco.languages.register({ id: 'cpp' });
                monaco.languages.setLanguageConfiguration('cpp', {
                    comments: {
                        lineComment: '//',
                        blockComment: ['/*', '*/']
                    },
                    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
                    autoClosingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"' },
                        { open: '\'', close: '\'' }
                    ],
                    surroundingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"' },
                        { open: '\'', close: '\'' }
                    ]
                });

                // 监听内容变化
                this.editor.onDidChangeModelContent(() => {
                    this.onContentChange();
                });

                // 监听选择变化（用于AI功能）
                this.editor.onDidChangeCursorSelection(() => {
                    this.onSelectionChange();
                });

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }



    registerCppLanguage() {
        // 注册C++代码补全 - 简化版本，只保留关键字和头文件补全
        monaco.languages.registerCompletionItemProvider('cpp', {
            // 降低优先级，避免覆盖Monaco默认补全
            priority: 5,
            // 提供补全建议
            provideCompletionItems: (model, position) => {
                // 获取当前行内容
                const lineContent = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                // 获取当前光标前的字符，检查是否是分号或空格
                const currentChar = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: position.column - 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });
                
                // 获取前一个单词（完整的）
                const previousWord = model.getWordUntilPosition({
                    lineNumber: position.lineNumber,
                    column: position.column - 1
                });
                
                // 如果刚刚输入了分号或者空格，不触发补全
                if (currentChar === ';' || currentChar === ' ' || currentChar === '\t') {
                    return { suggestions: [] };
                }

                // 获取单词边界 - Monaco API：返回{ startColumn, endColumn, word }
                const word = model.getWordUntilPosition(position);
                const wordText = (word.word || '').toLowerCase();
                const wordLength = wordText.length;
                
                // 补全范围 - 替换当前输入的单词
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: position.column
                };
                
                // 常用头文件名称（不带<>）
                const headerNames = [
                    'iostream', 'vector', 'string', 'algorithm', 
                    'stdio.h', 'stdlib.h', 'math.h', 'cstring',
                    'fstream', 'iomanip', 'map', 'set', 'list', 'deque'
                ];

                // 常用关键字 - 只保留基本关键字
                const keywords = [
                    { label: 'cin', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'cin' },
                    { label: 'cout', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'cout' },
                    { label: 'endl', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'endl' },
                    { label: 'std', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'std' },
                    { label: 'string', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'string' },
                    { label: 'vector', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'vector' },
                    { label: 'int', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'int' },
                    { label: 'main', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'main' },
                    { label: 'using', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'using' },
                    { label: 'namespace', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'namespace' },
                    { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return' },
                    { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if' },
                    { label: 'else', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'else' },
                    { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for' },
                    { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while' },
                    { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'class' },
                    { label: 'struct', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'struct' },
                    { label: 'void', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'void' },
                    { label: 'bool', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'bool' },
                    { label: 'float', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'float' },
                    { label: 'double', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'double' }
                ];

                const suggestions = [];
                
                // 1. 头文件补全处理
                if (lineContent.includes('#include')) {
                    // 如果已经输入了<，只补全头文件名
                    if (lineContent.includes('<')) {
                        suggestions.push(...headerNames.map(name => ({
                            label: name,
                            kind: monaco.languages.CompletionItemKind.File,
                            insertText: name,
                            range: range
                        })));
                    } else {
                        // 否则补全完整的#include语句
                        suggestions.push(...headerNames.map(name => ({
                            label: `#include <${name}>`,
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: `#include <${name}>`,
                            range: range
                        })));
                    }
                } 
                // 2. 关键字补全 - 只在输入了字符时触发，且不是在单词末尾
                else if (wordLength > 0 && !word.isWordEnd) {
                    // 过滤匹配的关键字，只显示与已输入内容严格匹配的建议
                    const matchingKeywords = keywords.filter(keyword => 
                        keyword.label.toLowerCase().startsWith(wordText) && 
                        keyword.label.length > wordText.length
                    );
                    suggestions.push(...matchingKeywords.map(keyword => ({
                        ...keyword,
                        range: range
                    })));
                }

                return { suggestions };
            },
            // 只在特定字符后触发补全
            triggerCharacters: ['#', '<', '.']
        });

        // 注册错误标记提供者
        this.setupErrorChecking();
    }

    setupErrorChecking() {
        // 实时语法检查会在编译时进行，这里先留空
        // 可以在编译后调用 updateMarkers 来显示错误
    }

    updateMarkers(errors) {
        if (!this.editor || !this.currentFileId) return;

        const model = this.editor.getModel();
        if (!model) return;

        const markers = errors.map(error => ({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: error.line || 1,
            startColumn: error.column || 1,
            endLineNumber: error.line || 1,
            endColumn: error.column || 999,
            message: error.message
        }));

        monaco.editor.setModelMarkers(model, 'cpp', markers);
    }

    onContentChange() {
        // 触发自动保存
        if (this.autoSaveEnabled && this.currentFileId) {
            this.scheduleAutoSave();
        }
    }

    onSelectionChange() {
        // 可以在这里处理选择变化，用于AI功能
    }
    
    // 清除头文件错误标记
    clearHeaderFileErrors() {
        if (!this.editor) return;
        
        const model = this.editor.getModel();
        if (!model) return;
        
        // 获取当前所有标记
        const markers = monaco.editor.getModelMarkers({ resource: model.uri }) || [];
        
        // 过滤掉头文件相关的错误标记
        const filteredMarkers = markers.filter(marker => {
            // 过滤掉包含头文件路径的错误，或者包含iostream等头文件名称的错误
            return !marker.message.includes('iostream') && 
                   !marker.message.includes('header') && 
                   !marker.message.includes('include');
        });
        
        // 更新标记
        monaco.editor.setModelMarkers(model, 'cpp', filteredMarkers);
    }

    scheduleAutoSave() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        this.saveTimer = setTimeout(() => {
            this.saveCurrentFile();
        }, this.autoSaveInterval);
    }

    async saveCurrentFile() {
        if (!this.currentFileId || !window.fileManager) return;

        const content = this.editor.getValue();
        const file = await window.fileManager.getFile(this.currentFileId);
        if (file) {
            await window.fileManager.saveFile(this.currentFileId, file.name, content, file.language);
            this.showStatus('已自动保存');
        }
    }

    async openFile(fileId) {
        if (!window.fileManager) return;

        // 保存当前文件
        if (this.currentFileId) {
            await this.saveCurrentFile();
        }

        const file = await window.fileManager.getFile(fileId);
        if (!file) return;

        this.currentFileId = fileId;
        
        if (!this.editor) {
            console.error('编辑器未初始化');
            return;
        }

        // 设置编辑器内容
        let model = this.editor.getModel();
        if (!model) {
            model = monaco.editor.createModel(file.content || '', file.language || 'cpp');
            this.editor.setModel(model);
        } else {
            model.setValue(file.content || '');
        }

        // 设置语言
        monaco.editor.setModelLanguage(model, file.language || 'cpp');

        // 清除错误标记
    monaco.editor.setModelMarkers(model, 'cpp', []);
    
    // 清除头文件错误标记的函数
    this.clearHeaderFileErrors();
    }

    async createNewFile(name = 'untitled.cpp', content = '') {
        if (!window.fileManager) return;

        const file = await window.fileManager.saveFile(null, name, content, 'cpp');
        
        // 确保编辑器已经初始化
        if (!this.editor) {
            console.warn('编辑器尚未初始化，等待初始化完成后再打开文件');
            // 保存文件ID，在编辑器初始化完成后打开
            this.pendingFileId = file.id;
            return file;
        }
        
        await this.openFile(file.id);
        return file;
    }

    getContent() {
        return this.editor ? this.editor.getValue() : '';
    }

    setContent(content) {
        if (this.editor) {
            this.editor.setValue(content);
        }
    }



    format() {
        if (this.editor) {
            this.editor.getAction('editor.action.formatDocument').run();
        }
    }

    getSelectedText() {
        if (!this.editor) return '';
        const selection = this.editor.getSelection();
        return this.editor.getModel().getValueInRange(selection);
    }

    replaceSelectedText(text) {
        if (!this.editor) return;
        const selection = this.editor.getSelection();
        this.editor.executeEdits('', [{
            range: selection,
            text: text
        }]);
    }

    insertTextAtCursor(text) {
        if (!this.editor) return;
        const selection = this.editor.getSelection();
        this.editor.executeEdits('', [{
            range: selection,
            text: text,
            forceMoveMarkers: true
        }]);
    }

    showStatus(message) {
        // 显示状态消息（可以优化为更好的UI）
        // 只在开发环境下显示日志
        if (window.location.hostname === 'localhost') {
            console.log('Status:', message);
        }
    }

    setupAutoSave() {
        // 从设置中加载自动保存配置
        const saved = localStorage.getItem('autoSaveEnabled');
        if (saved !== null) {
            this.autoSaveEnabled = saved === 'true';
        }
        
        const interval = localStorage.getItem('autoSaveInterval');
        if (interval) {
            this.autoSaveInterval = parseInt(interval) * 1000;
        }
    }

    updateTheme(isDark) {
        if (this.editor) {
            monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
        }
    }

    updateFontSize(fontSize) {
        if (this.editor) {
            this.editor.updateOptions({ fontSize: fontSize });
        }
    }
}

window.CodeEditor = CodeEditor;
