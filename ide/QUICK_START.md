# 快速开始指南

## 🚀 立即开始

### 1. 本地测试

```bash
# 进入项目目录
cd IDE

# 启动本地服务器（任选一种方式）
python3 -m http.server 8000
# 或
npx http-server -p 8000
# 或
php -S localhost:8000
```

然后在浏览器打开 `http://localhost:8000`

### 2. 测试编译器

1. 打开IDE后，你会看到默认的 `main.cpp` 文件
2. 点击右上角的 **"运行"** 按钮（或按 F11）
3. 程序会在新标签页的终端中编译运行

**注意：** 
- 首次运行需要访问在线编译API，可能需要几秒钟
- 如果遇到网络问题，编译器会自动切换到模拟模式

### 3. 使用AI功能

1. 在右侧AI对话区选择模型
2. 输入问题或选中代码后右键选择AI功能
3. 支持的功能：
   - AI补全代码
   - AI解释代码
   - AI修复错误

### 4. 文件管理

- **新建文件**: `Ctrl+Alt+N`
- **搜索文件**: 在左侧搜索框输入文件名
- **重命名/删除**: 右键点击文件
- **置顶文件**: 右键 -> 置顶

## 📋 功能清单

- [x] 代码编辑和语法高亮
- [x] 自动补全
- [x] 错误提示
- [x] 编译运行（在线API）
- [x] AI对话和代码辅助
- [x] 文件管理
- [x] 主题切换
- [x] 自动保存
- [x] 撤销/重做

## ⚙️ 配置

### 修改编译器API

编辑 `scripts/compiler.js`:

```javascript
// 使用Piston API（默认）
this.compileAPIUrl = 'https://emkc.org/api/v2/piston/execute';

// 切换到Judge0
this.compileAPIUrl = 'https://judge0-ce.p.rapidapi.com/submissions';
```

### 修改AI API

编辑 `scripts/ai.js`:

```javascript
// 默认使用 jkyai.top
this.apiUrl = 'https://api.jkyai.top/v1/chat/completions';
```

## 🐛 常见问题

**Q: 编译失败怎么办？**
A: 检查代码语法，或查看终端窗口中的错误信息

**Q: AI功能无法使用？**
A: 确认网络连接正常，API可能需要访问外网

**Q: 文件保存失败？**
A: 检查浏览器是否允许IndexedDB（通常需要HTTPS或localhost）

**Q: 终端窗口无法打开？**
A: 检查浏览器是否拦截了弹窗

## 📚 更多文档

- [完整README](README.md)
- [部署指南](DEPLOYMENT.md)
- [WASM编译器指南](WASM_COMPILER_GUIDE.md)
