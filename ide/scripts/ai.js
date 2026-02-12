// AI对话管理

// 适配Claude 4.5 Hiku API
class AIChat {
    constructor() {
        this.apiUrl = 'https://yunzhiapi.cn/API/hiku-4.5/index.php';
        this.conversation = [];
        this.selectedCode = '';
        this.currentFileContent = '';
        // 仅保留Claude 4.5 Hiku，无需模型选择
    }


    // 移除模型相关方法

    async sendMessage(message, context = {}) {
        // 只用Claude 4.5 Hiku，无需模型选择
        const prompt = this.buildPrompt(message, context);
        const userMessage = {
            role: 'user',
            content: prompt
        };
        this.conversation.push(userMessage);
        this.addMessageToUI('user', message);
        const loadingId = this.addMessageToUI('assistant', '', true);
        try {
            // GET请求，参数为question
            const url = this.apiUrl + '?question=' + encodeURIComponent(prompt);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain'
                }
            });
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            const aiResponse = await response.text();
            const assistantMessage = {
                role: 'assistant',
                content: aiResponse
            };
            this.conversation.push(assistantMessage);
            this.updateMessageInUI(loadingId, 'assistant', aiResponse);
        } catch (error) {
            if (window.location.hostname === 'localhost') {
                console.error('AI请求失败:', error);
            }
            this.updateMessageInUI(loadingId, 'assistant', `错误: ${error.message}`, true);
        }
    }

    buildPrompt(message, context) {
        let prompt = message;

        // 添加上下文信息
        if (context.fileContent) {
            prompt = `当前打开的代码文件内容：\n\`\`\`cpp\n${context.fileContent}\n\`\`\`\n\n用户问题：${message}`;
        }

        if (context.selectedCode) {
            prompt = `选中的代码：\n\`\`\`cpp\n${context.selectedCode}\n\`\`\`\n\n${prompt}`;
        }

        if (context.errorMessage) {
            prompt = `编译错误信息：\n${context.errorMessage}\n\n${prompt}`;
        }

        if (context.action === 'complete') {
            prompt = `请帮我补全以下代码，只需要返回补全的部分，不要返回完整代码：\n\`\`\`cpp\n${context.selectedCode}\n\`\`\``;
        } else if (context.action === 'explain') {
            prompt = `请解释以下C++代码的功能：\n\`\`\`cpp\n${context.selectedCode}\n\`\`\``;
        } else if (context.action === 'fix') {
            prompt = `以下代码有编译错误，请帮我修复：\n\`\`\`cpp\n${context.selectedCode}\n\`\`\`\n错误信息：\n${context.errorMessage}\n请返回修复后的完整代码。`;
        }

        return prompt;
    }

    addMessageToUI(role, content, isLoading = false) {
        const chatContainer = document.getElementById('aiChat');
        const messageDiv = document.createElement('div');
        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        messageDiv.id = messageId;
        messageDiv.className = `ai-message ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        if (isLoading) {
            bubble.innerHTML = '<div class="loading"></div> 正在思考...';
        } else {
            bubble.innerHTML = this.formatMessage(content);
        }

        messageDiv.appendChild(bubble);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        return messageId;
    }

    updateMessageInUI(messageId, role, content, isError = false) {
        const messageDiv = document.getElementById(messageId);
        if (!messageDiv) return;

        const bubble = messageDiv.querySelector('.message-bubble');
        if (!bubble) return;

        if (isError) {
            bubble.innerHTML = `<div class="error">${content}</div>`;
        } else {
            bubble.innerHTML = this.formatMessage(content);
            
            // 添加操作按钮
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            // 如果消息包含代码，添加覆盖按钮
            if (content.includes('```')) {
                const overwriteBtn = document.createElement('button');
                overwriteBtn.className = 'message-action-btn';
                overwriteBtn.textContent = '覆盖代码';
                overwriteBtn.onclick = () => this.handleCodeOverwrite(content);
                actions.appendChild(overwriteBtn);
            }
            
            const regenerateBtn = document.createElement('button');
            regenerateBtn.className = 'message-action-btn';
            regenerateBtn.textContent = '重新生成';
            regenerateBtn.onclick = () => this.regenerateLastMessage();
            actions.appendChild(regenerateBtn);
            
            bubble.appendChild(actions);
        }

        const chatContainer = document.getElementById('aiChat');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    formatMessage(content) {
        // 使用marked解析markdown
        if (typeof marked !== 'undefined') {
            let html = marked.parse(content);
            
            // 渲染数学公式
            html = html.replace(/\$\$(.*?)\$\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula, { displayMode: true });
                } catch (e) {
                    return match;
                }
            });
            
            html = html.replace(/\$(.*?)\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula, { displayMode: false });
                } catch (e) {
                    return match;
                }
            });
            
            // 高亮代码
            html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                const language = lang || 'cpp';
                if (typeof Prism !== 'undefined') {
                    const highlighted = Prism.highlight(code.trim(), Prism.languages[language] || Prism.languages.cpp, language);
                    return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
                }
                return `<pre><code>${code.trim()}</code></pre>`;
            });
            
            return html;
        }
        
        // 如果没有marked，简单处理
        return content.replace(/\n/g, '<br>');
    }

    handleCodeOverwrite(content) {
        // 提取代码块
        const codeMatch = content.match(/```(?:cpp)?\n([\s\S]*?)```/);
        if (codeMatch && window.codeEditor) {
            const code = codeMatch[1].trim();
            if (confirm('确定要用AI生成的代码覆盖当前代码吗？')) {
                window.codeEditor.setContent(code);
            }
        }
    }

    async regenerateLastMessage() {
        if (this.conversation.length < 2) return;
        
        // 移除最后一条助手消息
        this.conversation.pop();
        const userMessage = this.conversation[this.conversation.length - 1];
        
        // 移除UI中的最后一条消息
        const chatContainer = document.getElementById('aiChat');
        const messages = chatContainer.querySelectorAll('.ai-message.assistant');
        if (messages.length > 0) {
            messages[messages.length - 1].remove();
        }
        
        // 重新发送
        await this.sendMessage(userMessage.content);
    }

    clearChat() {
        this.conversation = [];
        const chatContainer = document.getElementById('aiChat');
        chatContainer.innerHTML = '';
    }

    setSelectedCode(code) {
        this.selectedCode = code;
    }

    setCurrentFileContent(content) {
        this.currentFileContent = content;
    }

    async completeCode(code) {
        this.setSelectedCode(code);
        await this.sendMessage('', {
            action: 'complete',
            selectedCode: code,
            fileContent: this.currentFileContent
        });
    }

    async explainCode(code) {
        this.setSelectedCode(code);
        await this.sendMessage('', {
            action: 'explain',
            selectedCode: code,
            fileContent: this.currentFileContent
        });
    }

    async fixCode(code, errorMessage) {
        this.setSelectedCode(code);
        await this.sendMessage('', {
            action: 'fix',
            selectedCode: code,
            errorMessage: errorMessage,
            fileContent: this.currentFileContent
        });
    }
}

window.AIChat = AIChat;
