// 设置管理
class Settings {
    constructor() {
        this.settings = {
            theme: 'light',
            fileSidebarWidth: 200,
            aiSidebarVisible: true,
            fontSize: 14,
            autoSaveEnabled: true,
            autoSaveInterval: 5,
            lightThemeColor: '#007acc'
        };

        this.loadSettings();
        this.setupEventListeners();
        this.applySettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('ideSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            } catch (e) {
                // 只在开发环境下显示日志
                if (window.location.hostname === 'localhost') {
                    console.error('加载设置失败:', e);
                }
            }
        }
    }

    saveSettings() {
        localStorage.setItem('ideSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    updateTheme(theme) {
        this.settings.theme = theme;
        this.saveSettings();
    }

    setupEventListeners() {
        const modal = document.getElementById('settingsModal');
        const openBtn = document.getElementById('settingsBtn');
        const closeBtn = document.getElementById('closeSettingsBtn');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.openModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // 设置项监听
        const themeSelect = document.getElementById('themeModeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.updateTheme(e.target.value);
            });
        }

        const fileSidebarWidth = document.getElementById('fileSidebarWidth');
        const fileSidebarWidthValue = document.getElementById('fileSidebarWidthValue');
        if (fileSidebarWidth) {
            fileSidebarWidth.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings.fileSidebarWidth = value;
                fileSidebarWidthValue.textContent = value + 'px';
                this.applySettings();
            });
        }



        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSize) {
            fontSize.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings.fontSize = value;
                fontSizeValue.textContent = value + 'px';
                this.applySettings();
            });
        }

        const autoSaveEnabled = document.getElementById('autoSaveEnabled');
        if (autoSaveEnabled) {
            autoSaveEnabled.addEventListener('change', (e) => {
                this.settings.autoSaveEnabled = e.target.checked;
                this.saveSettings();
                if (window.codeEditor) {
                    window.codeEditor.autoSaveEnabled = this.settings.autoSaveEnabled;
                }
            });
        }

        const autoSaveInterval = document.getElementById('autoSaveInterval');
        if (autoSaveInterval) {
            autoSaveInterval.addEventListener('change', (e) => {
                this.settings.autoSaveInterval = parseInt(e.target.value);
                this.saveSettings();
                if (window.codeEditor) {
                    window.codeEditor.autoSaveInterval = this.settings.autoSaveInterval * 1000;
                }
            });
        }

        const lightThemeColor = document.getElementById('lightThemeColor');
        if (lightThemeColor) {
            lightThemeColor.addEventListener('change', (e) => {
                this.settings.lightThemeColor = e.target.value;
                this.saveSettings();
                this.applyThemeColor();
            });
        }

        const aiSidebarVisible = document.getElementById('aiSidebarVisible');
        if (aiSidebarVisible) {
            aiSidebarVisible.addEventListener('change', (e) => {
                this.settings.aiSidebarVisible = e.target.checked;
                this.applySettings();
            });
        }

        // AI侧边栏切换按钮
        const toggleAiSidebarBtn = document.getElementById('toggleAiSidebarBtn');
        if (toggleAiSidebarBtn) {
            toggleAiSidebarBtn.addEventListener('click', () => {
                this.settings.aiSidebarVisible = !this.settings.aiSidebarVisible;
                this.applySettings();
                // 更新设置面板中的复选框状态
                if (aiSidebarVisible) {
                    aiSidebarVisible.checked = this.settings.aiSidebarVisible;
                }
            });
        }
    }

    openModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        // 更新表单值
        document.getElementById('themeModeSelect').value = this.settings.theme;
        document.getElementById('fileSidebarWidth').value = this.settings.fileSidebarWidth;
        document.getElementById('fileSidebarWidthValue').textContent = this.settings.fileSidebarWidth + 'px';

        document.getElementById('fontSize').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
        document.getElementById('autoSaveEnabled').checked = this.settings.autoSaveEnabled;
        document.getElementById('autoSaveInterval').value = this.settings.autoSaveInterval;
        document.getElementById('lightThemeColor').value = this.settings.lightThemeColor;
        document.getElementById('aiSidebarVisible').checked = this.settings.aiSidebarVisible;

        modal.classList.add('show');
    }

    closeModal() {
        const modal = document.getElementById('settingsModal');
        modal?.classList.remove('show');
        this.saveSettings();
    }

    applySettings() {
        // 应用主题
        document.body.className = `theme-${this.settings.theme}`;
        
        // 应用布局宽度
        const fileSidebar = document.getElementById('fileSidebar');
        if (fileSidebar) {
            fileSidebar.style.width = this.settings.fileSidebarWidth + 'px';
        }

        const aiSidebar = document.getElementById('aiSidebar');
        if (aiSidebar) {
            if (this.settings.aiSidebarVisible) {
                aiSidebar.classList.remove('hidden');
            } else {
                aiSidebar.classList.add('hidden');
            }
        }

        // 更新编辑器主题和字体大小
        if (window.codeEditor) {
            window.codeEditor.updateTheme(this.settings.theme === 'dark');
            window.codeEditor.updateFontSize(this.settings.fontSize);
        }

        // 更新主题颜色
        this.applyThemeColor();

        // 保存自动保存设置
        localStorage.setItem('autoSaveEnabled', this.settings.autoSaveEnabled.toString());
        localStorage.setItem('autoSaveInterval', this.settings.autoSaveInterval.toString());
    }

    applyThemeColor() {
        // 直接在body元素上设置变量，这样当body元素有.theme-light类时，这些变量会生效
        document.body.style.setProperty('--primary-color', this.settings.lightThemeColor);
        // 计算hover颜色
        const hoverColor = this.adjustBrightness(this.settings.lightThemeColor, -20);
        document.body.style.setProperty('--primary-hover', hoverColor);
    }

    adjustBrightness(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + percent));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
        return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }
}

window.Settings = Settings;
