# 部署指南

## 快速开始

### 本地测试

1. **克隆或下载项目**
   ```bash
   cd IDE
   ```

2. **启动本地服务器**
   ```bash
   # 使用Python
   python3 -m http.server 8000
   
   # 或使用Node.js
   npx http-server -p 8000
   
   # 或使用PHP
   php -S localhost:8000
   ```

3. **打开浏览器访问**
   ```
   http://localhost:8000
   ```

## Cloudflare Pages 部署

### 方法一：通过GitHub部署（推荐）

1. **准备GitHub仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **连接Cloudflare Pages**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 **Pages** 部分
   - 点击 **Create a project**
   - 选择 **Connect to Git**
   - 授权并选择你的GitHub仓库

3. **配置构建设置**
   - **Project name**: 自定义项目名称
   - **Production branch**: `main` 或 `master`
   - **Build command**: 留空（静态站点无需构建）
   - **Build output directory**: `/` (根目录)
   - **Root directory**: `/` (根目录)

4. **部署**
   - 点击 **Save and Deploy**
   - 等待部署完成（通常1-2分钟）

5. **自定义域名（可选）**
   - 在项目设置中选择 **Custom domains**
   - 添加你的域名并按照提示配置DNS

### 方法二：直接上传

1. **打包项目**
   ```bash
   # 在项目根目录
   zip -r ide.zip . -x "*.git*" -x "node_modules/*"
   ```

2. **上传到Cloudflare Pages**
   - 登录 Cloudflare Dashboard
   - 进入 **Pages** -> **Create a project** -> **Upload assets**
   - 上传 `ide.zip` 文件
   - 等待部署完成

## 功能验证

部署完成后，请测试以下功能：

- [ ] 文件创建和编辑
- [ ] 文件保存到IndexedDB
- [ ] 代码语法高亮
- [ ] 撤销/重做功能
- [ ] 设置面板
- [ ] 主题切换
- [ ] AI对话功能
- [ ] 快捷键

## 注意事项

### WASM编译器

当前项目使用模拟编译器。要使用真实的WASM C++编译器：

1. 获取WASM编译器文件（如clang.wasm）
2. 将文件放入 `wasm/` 目录
3. 修改 `scripts/compiler.js` 中的 `init()` 方法加载真实WASM模块

### AI API

项目使用 `https://api.jkyai.top` 作为AI API。如果API地址或格式有变化：

1. 修改 `scripts/ai.js` 中的 `apiUrl`
2. 调整 `loadModels()` 和 `sendMessage()` 方法以匹配API格式

### 浏览器兼容性

确保目标浏览器支持：
- IndexedDB
- WebAssembly
- ES6+
- Fetch API

支持的浏览器：
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 故障排除

### 问题：Monaco Editor加载失败

**解决方案：**
- 检查网络连接
- 确认CDN可访问（可能需要代理）
- 检查浏览器控制台错误信息

### 问题：IndexedDB无法使用

**解决方案：**
- 确保使用HTTPS或localhost
- 检查浏览器是否允许IndexedDB
- 清除浏览器缓存后重试

### 问题：AI API无法访问

**解决方案：**
- 检查API地址是否正确
- 确认API是否需要认证
- 检查CORS设置

### 问题：终端窗口无法打开

**解决方案：**
- 检查浏览器弹窗拦截设置
- 确认 `terminal.html` 文件存在
- 检查文件路径是否正确

## 性能优化建议

1. **启用Cloudflare缓存**
   - 在Cloudflare设置中启用静态资源缓存

2. **CDN加速**
   - 使用Cloudflare的全球CDN网络

3. **压缩资源**
   - Cloudflare自动压缩HTML/CSS/JS

4. **代码分割（未来优化）**
   - 考虑将大型库延迟加载

## 更新部署

每次代码更新后：

1. **GitHub部署**：自动触发部署
2. **手动上传**：重新打包并上传zip文件

部署通常需要1-2分钟完成。
