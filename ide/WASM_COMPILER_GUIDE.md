# WASM C++ 编译器获取指南

## 方案一：使用在线编译API（推荐 - 最简单）

对于教学场景，最简单的方式是使用在线编译API，无需下载WASM文件。

### 1. Judge0 API（免费额度）
- **网址**: https://judge0.com/
- **特点**: 支持50+编程语言，包括C++
- **免费额度**: 每月10万次请求
- **使用方式**: REST API调用

### 2. Piston API（开源免费）
- **GitHub**: https://github.com/engineer-man/piston
- **特点**: 完全开源，可以自托管
- **免费在线版**: https://emkc.org/api/v2/piston/execute
- **使用方式**: REST API调用

### 3. CodeX API（商业）
- **网址**: https://api.codex.jaagrav.in/
- **特点**: 免费，专门用于在线编译执行

## 方案二：真实的WASM编译器（浏览器内编译）

### 1. wasi-sdk + Clang.wasm
**项目链接**: 
- https://github.com/WebAssembly/wasi-sdk
- 需要自己编译Clang为WASM格式

**步骤**:
1. 安装 Emscripten SDK
2. 使用 Emscripten 将 Clang 编译为 WASM
3. 文件会很大（几十MB）

### 2. wasm-clang (binji项目)
**GitHub**: https://github.com/binji/wasm-clang
- 这是比较成熟的方案
- 提供了预编译的版本

### 3. Cheerp（商业，有开源版本）
**网址**: https://github.com/leaningtech/cheerp-compiler
- 可以将C++编译为WASM
- 有在线演示版本

## 方案三：使用WebAssembly Studio（最佳实践参考）
**网址**: https://webassembly.studio/
- 可以查看他们是如何实现的
- 开源参考实现

## 推荐实现方案

对于你的教学IDE，我**强烈推荐使用方案一（在线API）**，因为：

1. ✅ **简单快速**：无需下载几十MB的WASM文件
2. ✅ **稳定可靠**：在线服务维护良好
3. ✅ **性能好**：服务器端编译比浏览器内编译快得多
4. ✅ **适合教学**：学生可以立即看到结果
5. ✅ **节省带宽**：不需要加载大型WASM文件

我会为你实现**Piston API集成**，因为它是完全免费的且开源。

## 快速开始（使用Piston API）

我已经在 `scripts/compiler.js` 中实现了Piston API的集成，你可以：

1. 直接使用（默认已集成）
2. 如果需要修改API地址，编辑 `scripts/compiler.js` 中的 `compileAPIUrl`

## 如果需要真实的浏览器内编译（WASM）

如果你坚持要在浏览器内编译，可以：

1. 访问 https://webassembly.studio/
2. 查看他们的实现方式
3. 或者使用 Cheerp 的在线版本作为参考

## 下一步

查看更新后的 `scripts/compiler.js`，我已经添加了Piston API的完整集成。
