# 青少年编程IDE

一个功能完整的浏览器端C++编程IDE，专为青少年学生学习编程设计。

## 功能特性

### 核心功能
- ✅ C++代码编辑与语法高亮
- ✅ 代码自动补全和提示
- ✅ 行号显示
- ✅ 错误波浪线标记
- ✅ 实时语法检查
- ✅ 自动保存
- ✅ 撤销/重做功能
- ✅ 多文件管理（单文件编辑模式）
- ✅ 文件搜索
- ✅ 文件重命名和删除
- ✅ 代码格式化
- ✅ 右键菜单
- ✅ 全局亮暗色主题切换

### 编译运行
- ✅ 一键编译运行（WASM编译器集成）
- ✅ 终端样式输出页面
- ✅ 程序输入支持
- ✅ 运行时间/内存统计

### AI功能
- ✅ AI对话问答
- ✅ AI代码生成
- ✅ AI代码补全（右键菜单）
- ✅ AI代码解释（右键菜单）
- ✅ AI错误修复（右键菜单）
- ✅ 代码对比覆盖
- ✅ 支持Markdown和数学公式
- ✅ 代码高亮和折叠

### 设置
- ✅ 文件列表宽度调整
- ✅ AI对话区宽度调整
- ✅ 编辑器宽度调整
- ✅ 自动保存配置
- ✅ 主题颜色自定义

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Alt+N` | 新建文件 |
| `Ctrl+A` | 全选 |
| `Ctrl+C` | 复制 |
| `Ctrl+V` | 粘贴 |
| `Ctrl+Alt+K` | 新建对话 |
| `Ctrl+Alt+Y` | 确认覆盖代码 |
| `Ctrl+Alt+Z` | 撤销 |
| `Ctrl+Alt+U` | 重做 |
| `Ctrl+Alt+S` | 打开设置 |
| `F10` | 运行试题 |
| `F11` | 编译运行 |
| `Ctrl+Enter` | 发送AI消息 |
| `Tab` | 缩进 |

## 部署到Cloudflare Pages

### 方法一：通过GitHub部署（推荐）

1. 将代码推送到GitHub仓库
2. 登录Cloudflare Dashboard
3. 进入Pages -> Create a project
4. 连接到你的GitHub仓库
5. 设置构建配置：
   - **Build command**: 留空（静态站点）
   - **Build output directory**: `/` (根目录)
6. 点击Save and Deploy

### 方法二：直接上传

1. 登录Cloudflare Dashboard
2. 进入Pages -> Create a project -> Upload assets
3. 将项目文件夹中的所有文件打包成zip
4. 上传zip文件
5. 部署完成

## 本地开发

### 使用简单的HTTP服务器

```bash
# 使用Python
python3 -m http.server 8000

# 使用Node.js http-server
npx http-server -p 8000

# 使用PHP
php -S localhost:8000
```

然后在浏览器中访问 `http://localhost:8000`

## 项目结构

```
IDE/
├── index.html              # 主页面
├── terminal.html           # 终端输出页面
├── styles/
│   ├── main.css           # 主样式
│   ├── themes.css         # 主题样式
│   └── components.css     # 组件样式
├── scripts/
│   ├── main.js            # 主应用入口
│   ├── fileManager.js     # 文件管理（IndexedDB）
│   ├── editor.js          # 代码编辑器
│   ├── compiler.js        # C++编译器（WASM）
│   ├── ai.js              # AI对话功能
│   ├── settings.js        # 设置管理
│   └── keyboard.js        # 快捷键管理
├── wasm/                  # WASM编译器文件（需自行添加）
└── README.md              # 项目说明
```

## 编译器配置

### ✨ 智能双模式：在线 + 离线

项目支持**自动切换**的编译模式：

#### 1. 在线模式（有网络时）

- ✅ 使用 **Piston API**（免费在线编译服务）
- ✅ 完整C++标准库支持
- ✅ 支持所有C++语法特性
- ✅ 编译速度快

#### 2. 离线模式（无网络时）⭐ NEW

- ✅ **完全离线运行**，无需网络
- ✅ 内置C++解释器
- ✅ 支持基本C++语法（变量、IO、运算）
- ✅ 代码完全本地执行，隐私安全
- ✅ **自动检测网络并切换**

**使用方式：**
- 有网络：自动使用在线API
- 无网络：自动切换到离线模式
- **无需手动配置！**

### 📚 详细文档

- **[离线模式完整指南](OFFLINE_GUIDE.md)** - 离线功能详细说明
- **[WASM编译器指南](WASM_COMPILER_GUIDE.md)** - 真实WASM编译器集成

### 如果Piston API不可用

可以在 `scripts/compiler.js` 中切换到其他API：
```javascript
// 替换为Judge0 API
this.compileAPIUrl = 'https://judge0-ce.p.rapidapi.com/submissions';

// 或使用CodeX API
this.compileAPIUrl = 'https://api.codex.jaagrav.in/';
```

**注意：** API失败时会自动切换到离线模式，保证始终可用。

### AI API配置

项目使用 `https://api.jkyai.top` 作为AI API。如果API有变化，请修改 `scripts/ai.js` 中的 `apiUrl` 和 `loadModels()` 方法。

### 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

需要支持：
- IndexedDB
- WebAssembly
- ES6+
- Fetch API

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
