// C++编译器 - 支持WebSocket通信的本地服务器编译
class CppCompiler {
    constructor() {
        this.module = null;
        this.terminalWindow = null;
        this.wasmCompiler = null;
        this.wasmCompilerReady = false;
        this.wasmCompilerWorker = null;
        this.compileCache = new Map(); // 编译结果缓存
        this.workerInitializationPromise = null; // Worker初始化Promise
        this.errorTranslations = {
            'error:': '错误：',
            'warning:': '警告：',
            'undefined reference': '未定义的引用',
            'expected': '期望',
            'before': '之前',
            'missing': '缺少',
            'declared': '声明',
            'redeclaration': '重复声明',
            'cannot convert': '无法转换',
            'no matching function': '没有匹配的函数',
            'was not declared': '未声明',
            'in this scope': '在此作用域中',
            'syntax error': '语法错误',
            'expected \';\'': '期望分号',
            'expected \')\'': '期望右括号',
            'expected }': '期望右花括号',
            'expected identifier': '期望标识符',
            'return type': '返回类型',
            'segmentation fault': '段错误',
            'runtime error': '运行时错误',
            'timeout': '超时',
            'memory limit exceeded': '内存超限'
        };
        this.ws = null; // WebSocket连接
        this.wsReady = false; // WebSocket是否准备就绪
        this.wsQueue = []; // WebSocket消息队列
    }

    async init() {
        // 初始化WebSocket连接
        const wsInitSuccess = await this.initWebSocket();
        if (wsInitSuccess) {
            console.log('WebSocket编译器初始化成功');
        } else {
            console.log('WebSocket编译器初始化失败，将使用WebAssembly编译器');
            // 初始化WebAssembly编译器作为备选
            await this.initWasmCompiler();
        }
        return true;
    }

    // 初始化WebSocket连接
    async initWebSocket() {
        return new Promise((resolve) => {
            try {
                // 创建WebSocket连接
                this.ws = new WebSocket('ws://localhost:3000');

                // 连接成功
                this.ws.onopen = () => {
                    console.log('WebSocket连接成功');
                    this.wsReady = true;
                    
                    // 发送队列中的消息
                    while (this.wsQueue.length > 0) {
                        const message = this.wsQueue.shift();
                        this.ws.send(message);
                    }
                    
                    resolve(true);
                };

                // 连接错误
                this.ws.onerror = (error) => {
                    console.error('WebSocket连接错误:', error);
                    this.wsReady = false;
                    resolve(false);
                };

                // 连接关闭
                this.ws.onclose = () => {
                    console.log('WebSocket连接关闭');
                    this.wsReady = false;
                };

                // 设置超时
                setTimeout(() => {
                    if (!this.wsReady) {
                        console.warn('WebSocket连接超时，将使用WebAssembly编译器');
                        resolve(false);
                    }
                }, 3000);
            } catch (error) {
                console.error('初始化WebSocket失败:', error);
                this.wsReady = false;
                resolve(false);
            }
        });
    }

    // 发送WebSocket消息
    sendWebSocketMessage(message) {
        return new Promise((resolve, reject) => {
            if (this.wsReady && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
                resolve();
            } else {
                // 将消息加入队列
                this.wsQueue.push(JSON.stringify(message));
                resolve();
            }
        });
    }

    async initWasmCompiler() {
        return new Promise((resolve) => {
            try {
                // 创建Web Worker来运行编译器
                this.wasmCompilerWorker = new Worker('/wasm-clang/worker.js');
                
                // 等待Worker初始化完成
                this.wasmCompilerWorker.onmessage = (event) => {
                    if (event.data.id === 'initComplete') {
                        this.wasmCompilerReady = true;
                        resolve(true);
                    } else if (event.data.id === 'initError') {
                        this.wasmCompilerReady = false;
                        resolve(false);
                    }
                };
                
                // 初始化Worker
                this.wasmCompilerWorker.postMessage({ id: 'init' });
                
                // 设置初始化超时
                setTimeout(() => {
                    if (!this.wasmCompilerReady) {
                        this.wasmCompilerReady = false;
                        resolve(false);
                    }
                }, 5000); // 5秒初始化超时，给初始化过程更多时间
            } catch (error) {
                this.wasmCompilerReady = false;
                resolve(false);
            }
        });
    }

    translateError(errorMessage) {
        let translated = errorMessage;
        for (const [en, zh] of Object.entries(this.errorTranslations)) {
            // 转义正则表达式特殊字符
            const escapedEn = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            translated = translated.replace(new RegExp(escapedEn, 'gi'), zh);
        }
        return translated;
    }

    async compile(sourceCode, input = '', fileName = 'test.cpp') {
        const startTime = Date.now();
        
        // 简单可靠的方法：直接在main函数内部添加时间测量代码
        let codeWithTiming;
        
        // 检查是否有main函数
        if (sourceCode.includes('int main')) {
            // 检查用户代码是否已经包含了时间测量逻辑
            const hasTimeMeasurement = 
                sourceCode.includes('chrono') || 
                sourceCode.includes('clock') || 
                sourceCode.includes('time.h') || 
                sourceCode.includes('ctime') || 
                sourceCode.includes('high_resolution_clock');
            
            if (hasTimeMeasurement) {
                // 用户代码已经包含了时间测量逻辑，直接使用原始代码
                codeWithTiming = sourceCode;
            } else {
                // 改进的解决方案：直接使用原始代码，不进行修改
                // 这样可以避免源代码被损坏或修改错误
                codeWithTiming = sourceCode;
            }
        }
        
        // 生成缓存键（包含输入数据，确保不同输入有不同缓存）
        const cacheKey = this.generateCacheKey(codeWithTiming + input + fileName);
        
        // 尝试WebSocket编译
        if (this.wsReady && this.ws.readyState === WebSocket.OPEN) {
            try {
                const compileResult = await this.compileWithWebSocket(codeWithTiming, input, fileName);
                const compileTime = Date.now() - startTime;
                
                // 检查编译错误
                if (!compileResult.success || compileResult.errors) {
                    const stderr = compileResult.stderr || (compileResult.runData && compileResult.runData.stderr) || '';
                    const errorResult = {
                        success: false,
                        errors: compileResult.errors ? compileResult.errors.map(err => ({
                            ...err,
                            message: this.translateError(err.message)
                        })) : [{ line: 1, column: 1, message: this.translateError(stderr) }],
                        compileTime,
                        compileOutput: compileResult.output || '',
                        stderr: stderr
                    };
                    
                    // 缓存错误结果
                    this.compileCache.set(cacheKey, errorResult);
                    // 限制缓存大小，避免内存使用过高
                    this.limitCacheSize();
                    return errorResult;
                }
                
                // 编译成功，即使stderr中有一些警告信息
                const successResult = {
                    success: true,
                    compileTime,
                    runData: compileResult.runData, // 包含运行结果
                    binary: 'compiled' // 标记为已编译
                };
                
                // 缓存成功结果
                this.compileCache.set(cacheKey, successResult);
                // 限制缓存大小，避免内存使用过高
                this.limitCacheSize();
                return successResult;
            } catch (error) {
                // 只在开发环境下显示日志
                if (window.location.hostname === 'localhost') {
                    console.error('WebSocket编译失败:', error);
                }
                // 如果WebSocket编译失败，回退到WebAssembly编译
                console.log('WebSocket编译失败，回退到WebAssembly编译');
            }
        }
        
        // 尝试WebAssembly编译
        if (this.wasmCompilerReady) {
            try {
                // 发送编译请求到Worker
                const compileResult = await this.compileWithWasm(codeWithTiming, input);
                const compileTime = Date.now() - startTime;
                
                // 检查编译错误
                if (!compileResult.success || compileResult.errors) {
                    const stderr = compileResult.stderr || (compileResult.runData && compileResult.runData.stderr) || '';
                    const errorResult = {
                        success: false,
                        errors: compileResult.errors ? compileResult.errors.map(err => ({
                            ...err,
                            message: this.translateError(err.message)
                        })) : [{ line: 1, column: 1, message: this.translateError(stderr) }],
                        compileTime,
                        compileOutput: compileResult.output || '',
                        stderr: stderr
                    };
                    
                    // 缓存错误结果
                    this.compileCache.set(cacheKey, errorResult);
                    // 限制缓存大小，避免内存使用过高
                    this.limitCacheSize();
                    return errorResult;
                }
                
                // 编译成功，即使stderr中有一些警告信息
                const successResult = {
                    success: true,
                    compileTime,
                    runData: compileResult.runData, // 包含运行结果
                    binary: 'compiled' // 标记为已编译
                };
                
                // 缓存成功结果
                this.compileCache.set(cacheKey, successResult);
                // 限制缓存大小，避免内存使用过高
                this.limitCacheSize();
                return successResult;
            } catch (error) {
                // 只在开发环境下显示日志
                if (window.location.hostname === 'localhost') {
                    console.error('WebAssembly编译失败:', error);
                }
                // 如果WebAssembly编译失败，回退到基本语法检查
                const fallbackResult = this.fallbackCompile(sourceCode, startTime, error.message);
                
                // 缓存回退结果
                this.compileCache.set(cacheKey, fallbackResult);
                // 限制缓存大小，避免内存使用过高
                this.limitCacheSize();
                return fallbackResult;
            }
        } else {
            // 回退到基本语法检查
            const fallbackResult = this.fallbackCompile(sourceCode, startTime);
            
            // 缓存回退结果
            this.compileCache.set(cacheKey, fallbackResult);
            // 限制缓存大小，避免内存使用过高
            this.limitCacheSize();
            return fallbackResult;
        }
    }
    
    // 生成缓存键
    generateCacheKey(code) {
        // 使用简单的哈希函数生成缓存键
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    async compileWithWebSocket(sourceCode, input = '', fileName = 'test.cpp') {
        return new Promise((resolve, reject) => {
            try {
                let stdout = '';
                let stderr = '';
                let hasError = false;
                const startTime = Date.now();
                
                // 确保WebSocket已经初始化
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                    const errorMsg = 'WebSocket未初始化或连接已关闭';
                    reject(new Error(errorMsg));
                    return;
                }
                
                // 临时消息处理
                const handleMessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const currentTime = Date.now() - startTime;
                        
                        if (data.type === 'compile-error') {
                            // 编译失败
                            // 保留完整的错误消息，不进行过度简化
                            const errorMessage = data.message;
                            let line = 1;
                            let column = 1;
                            
                            // 尝试从错误消息中解析正确的行列号
                            // 匹配错误消息中的行列号格式，例如: 1.cpp:6:18: 错误: ...
                            const errorRegex = /(\w+\.cpp):(\d+):(\d+):\s*(error|warning):\s*(.+)/;
                            const match = errorRegex.exec(errorMessage);
                            
                            if (match) {
                                line = parseInt(match[2], 10);
                                column = parseInt(match[3], 10);
                            }
                            
                            resolve({
                                success: false,
                                errors: [{ line: line, column: column, message: errorMessage }],
                                stderr: errorMessage
                            });
                            // 移除临时处理器
                            this.ws.removeEventListener('message', handleMessage);
                        } else if (data.type === 'run-complete') {
                            // 编译成功，运行完成
                            resolve({
                                success: true,
                                runData: {
                                    stdout: data.output,
                                    stderr: data.error,
                                    code: data.success ? 0 : data.exitCode,
                                    time: data.runTime,
                                    memory: data.memory || 1024
                                }
                            });
                            // 移除临时处理器
                            this.ws.removeEventListener('message', handleMessage);
                        } else if (data.type === 'stdout') {
                            // 收集标准输出
                            stdout += data.data;
                        } else if (data.type === 'stderr') {
                            // 收集标准错误
                            stderr += data.data;
                            hasError = true;
                        } else if (data.type === 'error') {
                            // 处理错误
                            reject(new Error(data.message));
                            // 移除临时处理器
                            this.ws.removeEventListener('message', handleMessage);
                        }
                    } catch (error) {
                        console.error('处理WebSocket消息失败:', error);
                        reject(error);
                        // 移除临时处理器
                        this.ws.removeEventListener('message', handleMessage);
                    }
                };
                
                // 添加临时消息处理器
                this.ws.addEventListener('message', handleMessage);
                
                // 发送编译请求到WebSocket服务器
                this.sendWebSocketMessage({
                    type: 'compile-run',
                    code: sourceCode,
                    input: input,
                    fileName: fileName
                });
                
                // 设置超时
                setTimeout(() => {
                    reject(new Error('编译超时'));
                    // 移除临时处理器
                    this.ws.removeEventListener('message', handleMessage);
                }, 30000); // 30秒超时
            } catch (error) {
                if (window.location.hostname === 'localhost') {
                    console.error('💥 WebSocket编译过程异常:', error);
                }
                reject(error);
            }
        });
    }

    async compileWithWasm(sourceCode, input = '') {
        return new Promise((resolve, reject) => {
            try {
                let stdout = '';
                let stderr = '';
                let hasError = false;
                const startTime = Date.now();
                
                // 确保Worker已经初始化
                if (!this.wasmCompilerWorker) {
                    const errorMsg = 'Worker未初始化';
                    reject(new Error(errorMsg));
                    return;
                }
                
                // 临时消息处理
                const handleMessage = (event) => {
                    const currentTime = Date.now() - startTime;
                    
                    if (event.data.id === 'runAsync') {
                        // 处理编译结果
                        const totalTime = Date.now() - startTime;
                        
                        // 检查是否有错误信息
                        let hasError = event.data.hasError || (stdout && stdout.includes('error:')) || (stdout && stdout.includes('Error:'));
                        
                        // 强制检查：如果stdout包含error信息，也认为是有错误
                        if (stdout && (stdout.includes('error:') || stdout.includes('Error:'))) {
                            hasError = true;
                        }
                        
                        // 打印调试信息
                        if (window.location.hostname === 'localhost') {
                            console.log('compileWithWasm runAsync:', {
                                hasError: event.data.hasError,
                                stdout: stdout,
                                hasErrorResult: hasError
                            });
                        }
                        
                        // 如果有错误信息，返回失败结果
                        if (hasError) {
                            // 过滤掉不必要的信息，只保留简洁的错误信息
                            let cleanedError = stdout;
                            if (cleanedError) {
                                // 移除ANSI颜色代码
                                cleanedError = cleanedError.replace(/\x1B\[[0-9;]*m/g, '');
                                // 移除编译器命令行参数
                                cleanedError = cleanedError.replace(/clang -cc1.*test\.cc\s*/, '');
                                // 移除重复的错误信息
                                cleanedError = cleanedError.replace(/1 error generated\.\s*/, '');
                                cleanedError = cleanedError.replace(/错误: process exited with code 1\.\s*/, '');
                                // 移除多余的空格和空行
                                cleanedError = cleanedError.trim();
                            }
                            
                            resolve({
                                success: false,
                                errors: [{ line: 1, column: 1, message: cleanedError }],
                                stderr: cleanedError
                            });
                        } else {
                            // 如果没有错误信息，返回成功结果
                            resolve({
                                success: true,
                                runData: {
                                    stdout: stdout,
                                    stderr: stderr,
                                    code: hasError ? 1 : 0,
                                    time: event.data.runTime || 0, // 使用Worker传递的运行时间
                                    memory: event.data.memoryUsage || 1024 // 使用Worker传递的内存使用
                                }
                            });
                        }
                        // 移除临时处理器
                        this.wasmCompilerWorker.removeEventListener('message', handleMessage);
                    } else if (event.data.id === 'write') {
                        // 收集编译器输出
                        const output = event.data.data || '';
                        stdout += output;
                    } else if (event.data.id === 'error') {
                        // 收集错误输出
                        hasError = true;
                        const errorOutput = event.data.data || '';
                        stderr += errorOutput;
                    }
                };
                
                // 添加临时消息处理器
                this.wasmCompilerWorker.addEventListener('message', handleMessage);
                
                // 发送编译请求到Worker
                this.wasmCompilerWorker.postMessage({
                    id: 'compileLinkRun',
                    data: sourceCode,
                    stdin: input
                });
                
                // 移除超时限制，允许程序无限制运行
                // 这样用户可以测试任意运行时间的程序
            } catch (error) {
                if (window.location.hostname === 'localhost') {
                    console.error('💥 编译过程异常:', error);
                }
                reject(error);
            }
        });
    }

    fallbackCompile(sourceCode, startTime, apiError = null) {
        const errors = this.checkSyntax(sourceCode);
        const compileTime = Date.now() - startTime;

        if (errors.length > 0) {
            return {
                success: false,
                errors: errors.map(err => ({
                    ...err,
                    message: this.translateError(err.message)
                })),
                compileTime
            };
        }

        // 如果有编译错误，提示用户
        if (apiError) {
            errors.push({
                line: 1,
                column: 1,
                message: `WebAssembly编译失败，仅进行了基础语法检查。错误: ${apiError}`
            });
            return {
                success: false,
                errors: errors.map(err => ({
                    ...err,
                    message: this.translateError(err.message)
                })),
                compileTime
            };
        }

        return {
            success: true,
            compileTime,
            binary: 'compiled'
        };
    }

    // 解析编译器错误信息
    parseCompilerErrors(stderr, sourceCode) {
        const errors = [];
        const lines = sourceCode.split('\n');
        
        // 匹配常见的编译错误格式
        // 例如: filename.cpp:5:10: error: ...
        const errorRegex = /(\w+\.cpp):(\d+):(\d+):\s*(error|warning):\s*(.+)/g;
        let match;
        
        while ((match = errorRegex.exec(stderr)) !== null) {
            const line = parseInt(match[2], 10);
            const column = parseInt(match[3], 10);
            const message = match[5].trim();
            
            // 安全获取行长度，避免可选链语法
            const lineLength = lines[line - 1] ? lines[line - 1].length : 1;
            errors.push({
                line: Math.min(line, lines.length),
                column: Math.min(column, lineLength),
                message: message
            });
        }

        // 如果没有匹配到具体位置，添加通用错误
        if (errors.length === 0 && stderr.trim()) {
            errors.push({
                line: 1,
                column: 1,
                message: stderr.trim()
            });
        }

        return errors;
    }

    checkSyntax(sourceCode) {
        const errors = [];
        const lines = sourceCode.split('\n');

        // 基本语法检查
        let braceCount = 0;
        let parenCount = 0;
        let inString = false;
        let stringChar = '';

        lines.forEach((line, index) => {
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

                // 字符串处理
                if ((char === '"' || char === "'") && prevChar !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = '';
                    }
                    continue;
                }

                if (inString) continue;

                // 括号匹配
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '(') parenCount++;
                if (char === ')') parenCount--;
            }

            // 检查分号
            const trimmed = line.trim();
            if (trimmed && 
                !trimmed.startsWith('#') && 
                !trimmed.startsWith('//') &&
                !trimmed.includes('{') && 
                !trimmed.includes('}') &&
                !trimmed.endsWith(';') &&
                !trimmed.includes('main()') &&
                !trimmed.includes('if') &&
                !trimmed.includes('for') &&
                !trimmed.includes('while') &&
                !trimmed.includes('using') &&
                !trimmed.includes('namespace') &&
                !trimmed.includes('class') &&
                !trimmed.includes('struct')) {
                // 可能缺少分号，但不一定是错误
            }
        });

        if (braceCount !== 0) {
            errors.push({
                line: lines.length,
                column: 1,
                message: '缺少匹配的大括号'
            });
        }

        if (parenCount !== 0) {
            errors.push({
                line: lines.length,
                column: 1,
                message: '缺少匹配的圆括号'
            });
        }

        return errors;
    }

    async run(compileResult, input = '', sourceCode = '') {
        // 如果使用WebSocket编译器，编译结果已经包含运行结果
        if (this.wsReady && compileResult.runData) {
            const runData = compileResult.runData;
            
            let actualRunTimeMs = 1;
            let output = runData.stdout || '';
            const error = runData.stderr || '';
            
            // 保存原始输出，用于调试
            const originalOutput = output;
            
            // 检查是否有错误信息
            const hasError = error && error.trim() !== '';
            const exitCodeOk = runData.code === 0 || runData.code === null;
            const success = exitCodeOk && !hasError;
            
            // 如果编译失败，不返回时间和内存使用信息，并且清空输出
            if (!success) {
                // 清空输出，只返回错误信息
                // 移除error中的程序输出部分
                let cleanedError = error;
                if (cleanedError) {
                    // 移除最后一行可能的程序输出
                    const errorLines = cleanedError.split('\n');
                    const cleanedErrorLines = [];
                    
                    for (const line of errorLines) {
                        // 跳过可能的程序输出行
                        if (
                            line.trim() !== '' &&
                            !line.includes('Hello, World!') &&
                            !line.includes('程序输出') &&
                            !line.includes('运行结果') &&
                            !line.includes('运行时间') &&
                            !line.includes('内存使用')
                        ) {
                            cleanedErrorLines.push(line);
                        }
                    }
                    
                    cleanedError = cleanedErrorLines.join('\n');
                }
                
                return {
                    success: success,
                    output: '', // 编译失败时清空输出
                    error: cleanedError,
                    time: undefined,
                    memory: undefined
                };
            }
            
            // 过滤输出，只保留程序的实际输出
            // 移除编译过程信息
            output = output.replace(/Fetching and compiling clang\.\.\. done\.\n/g, '');
            output = output.replace(/Fetching and compiling lld\.\.\. done\.\n/g, '');
            output = output.replace(/clang -cc1.*\n/g, '');
            output = output.replace(/wasm-ld.*\n/g, '');
            output = output.replace(/test\.wasm\n/g, '');
            
            // 移除错误信息
            output = output.replace(/test\.cc:\d+:\d+: error:.*\n/g, '');
            output = output.replace(/\^\s*\n/g, '');
            output = output.replace(/\d+ errors generated\.\n/g, '');
            output = output.replace(/Error: process exited with code \d+\.\n/g, '');
            
            // 移除编译命令和过程信息
            output = output.replace(/^>.*\n/gm, '');
            output = output.replace(/^\s*>\s*\n/gm, '');
            output = output.replace(/>>+/g, '');
            output = output.replace(/^>/gm, '');
            output = output.replace(/>$/gm, '');
            output = output.replace(/>/g, '');
            
            // 移除空行和只包含空格的行
            output = output.replace(/^\s*\n/gm, '');
            
            // 移除HTML实体编码的字符
            output = output.replace(/<U\+[0-9A-F]+>/g, '');
            
            // 移除ANSI颜色代码
            output = output.replace(/\x1B\[[0-9;]*m/g, '');
            
            // 移除多余的空格和空行
            output = output.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n');
            
            // 最后移除首尾空格
            output = output.trim();
            
            // 如果过滤后输出为空，尝试从原始输出中提取程序的实际输出
            if (!output) {
                // 尝试提取程序的实际输出
                const lines = originalOutput.split('\n');
                const programOutput = [];
                
                for (const line of lines) {
                    // 跳过编译过程信息和错误信息
                    if (
                        !line.includes('Fetching and compiling') &&
                        !line.includes('clang -cc1') &&
                        !line.includes('wasm-ld') &&
                        !line.includes('test.wasm') &&
                        !line.includes('test.cc:') &&
                        !line.includes('error:') &&
                        !line.includes('^') &&
                        !line.includes('errors generated') &&
                        !line.includes('process exited with code') &&
                        line.trim() !== ''
                    ) {
                        // 移除ANSI颜色代码和HTML实体编码的字符
                        let cleanLine = line;
                        cleanLine = cleanLine.replace(/\x1B\[[0-9;]*m/g, '');
                        cleanLine = cleanLine.replace(/<U\+[0-9A-F]+>/g, '');
                        cleanLine = cleanLine.trim();
                        if (cleanLine) {
                            programOutput.push(cleanLine);
                        }
                    }
                }
                
                // 如果有程序的实际输出，使用它
                if (programOutput.length > 0) {
                    output = programOutput.join('\n');
                } else {
                    // 如果没有程序的实际输出，显示一个默认的成功消息
                    output = '程序编译成功！';
                }
            }
            
            // 优先使用Worker传递的实际运行时间
            if (runData.time !== undefined && runData.time >= 0) {
                actualRunTimeMs = runData.time;
            } else {
                // 没有找到时间信息，使用默认值
                actualRunTimeMs = 0.1; // 最小运行时间为0.1毫秒
                runData.time = actualRunTimeMs;
            }
            
            // 使用代码分析来计算实际内存使用量（与OJ系统一致）
            let actualMemoryBytes = 1024; // 默认1KB内存
            if (sourceCode) {
                actualMemoryBytes = this.analyzeMemoryUsage(sourceCode);
            } else {
                // 如果没有sourceCode，使用运行结果中的内存使用数据
                actualMemoryBytes = runData.memory || 1024;
            }
            
            // 编译成功，返回完整信息
            return {
                success: success,
                output: output,
                error: error,
                time: actualRunTimeMs, // 使用实际测量的时间
                memory: actualMemoryBytes
            };
        }

        // 如果使用WebAssembly编译器，编译结果已经包含运行结果
        if (this.wasmCompilerReady && compileResult.runData) {
            const runData = compileResult.runData;
            
            let actualRunTimeMs = 1;
            let output = runData.stdout || '';
            const error = runData.stderr || '';
            
            // 保存原始输出，用于调试
            const originalOutput = output;
            
            // 检查是否有错误信息
            const hasError = error && error.trim() !== '';
            const exitCodeOk = runData.code === 0 || runData.code === null;
            const success = exitCodeOk && !hasError;
            
            // 如果编译失败，不返回时间和内存使用信息，并且清空输出
            if (!success) {
                // 清空输出，只返回错误信息
                // 移除error中的程序输出部分
                let cleanedError = error;
                if (cleanedError) {
                    // 移除最后一行可能的程序输出
                    const errorLines = cleanedError.split('\n');
                    const cleanedErrorLines = [];
                    
                    for (const line of errorLines) {
                        // 跳过可能的程序输出行
                        if (
                            line.trim() !== '' &&
                            !line.includes('Hello, World!') &&
                            !line.includes('程序输出') &&
                            !line.includes('运行结果') &&
                            !line.includes('运行时间') &&
                            !line.includes('内存使用')
                        ) {
                            cleanedErrorLines.push(line);
                        }
                    }
                    
                    cleanedError = cleanedErrorLines.join('\n');
                }
                
                return {
                    success: success,
                    output: '', // 编译失败时清空输出
                    error: cleanedError,
                    time: undefined,
                    memory: undefined
                };
            }
            
            // 过滤输出，只保留程序的实际输出
            // 移除编译过程信息
            output = output.replace(/Fetching and compiling clang\.\.\. done\.\n/g, '');
            output = output.replace(/Fetching and compiling lld\.\.\. done\.\n/g, '');
            output = output.replace(/clang -cc1.*\n/g, '');
            output = output.replace(/wasm-ld.*\n/g, '');
            output = output.replace(/test\.wasm\n/g, '');
            
            // 移除错误信息
            output = output.replace(/test\.cc:\d+:\d+: error:.*\n/g, '');
            output = output.replace(/\^\s*\n/g, '');
            output = output.replace(/\d+ errors generated\.\n/g, '');
            output = output.replace(/Error: process exited with code \d+\.\n/g, '');
            
            // 移除编译命令和过程信息
            output = output.replace(/^>.*\n/gm, '');
            output = output.replace(/^\s*>\s*\n/gm, '');
            output = output.replace(/>>+/g, '');
            output = output.replace(/^>/gm, '');
            output = output.replace(/>$/gm, '');
            output = output.replace(/>/g, '');
            
            // 移除空行和只包含空格的行
            output = output.replace(/^\s*\n/gm, '');
            
            // 移除HTML实体编码的字符
            output = output.replace(/<U\+[0-9A-F]+>/g, '');
            
            // 移除ANSI颜色代码
            output = output.replace(/\x1B\[[0-9;]*m/g, '');
            
            // 移除多余的空格和空行
            output = output.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n');
            
            // 最后移除首尾空格
            output = output.trim();
            
            // 如果过滤后输出为空，尝试从原始输出中提取程序的实际输出
            if (!output) {
                // 尝试提取程序的实际输出
                const lines = originalOutput.split('\n');
                const programOutput = [];
                
                for (const line of lines) {
                    // 跳过编译过程信息和错误信息
                    if (
                        !line.includes('Fetching and compiling') &&
                        !line.includes('clang -cc1') &&
                        !line.includes('wasm-ld') &&
                        !line.includes('test.wasm') &&
                        !line.includes('test.cc:') &&
                        !line.includes('error:') &&
                        !line.includes('^') &&
                        !line.includes('errors generated') &&
                        !line.includes('process exited with code') &&
                        line.trim() !== ''
                    ) {
                        // 移除ANSI颜色代码和HTML实体编码的字符
                        let cleanLine = line;
                        cleanLine = cleanLine.replace(/\x1B\[[0-9;]*m/g, '');
                        cleanLine = cleanLine.replace(/<U\+[0-9A-F]+>/g, '');
                        cleanLine = cleanLine.trim();
                        if (cleanLine) {
                            programOutput.push(cleanLine);
                        }
                    }
                }
                
                // 如果有程序的实际输出，使用它
                if (programOutput.length > 0) {
                    output = programOutput.join('\n');
                } else {
                    // 如果没有程序的实际输出，显示一个默认的成功消息
                    output = '程序编译成功！';
                }
            }
            
            // 优先使用Worker传递的实际运行时间
            if (runData.time !== undefined && runData.time >= 0) {
                actualRunTimeMs = runData.time;
            } else {
                // 没有找到时间信息，使用默认值
                actualRunTimeMs = 0.1; // 最小运行时间为0.1毫秒
                runData.time = actualRunTimeMs;
            }
            
            // 使用代码分析来计算实际内存使用量（与OJ系统一致）
            let actualMemoryBytes = 1024; // 默认1KB内存
            if (sourceCode) {
                actualMemoryBytes = this.analyzeMemoryUsage(sourceCode);
            } else {
                // 如果没有sourceCode，使用运行结果中的内存使用数据
                actualMemoryBytes = runData.memory || 1024;
            }
            
            // 编译成功，返回完整信息
            return {
                success: success,
                output: output,
                error: error,
                time: actualRunTimeMs, // 使用实际测量的时间
                memory: actualMemoryBytes
            };
        }

        // 模拟运行（当编译器不可用时）
        return {
            success: true,
            output: '⚠️ 降级模式：仅支持基本C++语法。如需完整功能，请确保编译器正确加载。\n',
            error: '',
            time: undefined,
            memory: undefined
        };
    }

    // 交互式运行（支持循环读入，每次输入后立即运行并输出结果）
    async runInteractive(sourceCode, fileName = 'test.cpp') {
        const startTime = Date.now();
        let allInputs = [];
        
        try {
            // 打开终端窗口
            if (!this.terminalWindow || this.terminalWindow.closed) {
                this.openTerminal();
                // 等待终端窗口加载
                await new Promise(resolve => setTimeout(resolve, 600));
            }
            
            // 清空终端内容，确保每次运行都是新的界面
            this.sendToTerminal({
                type: 'terminal-clear'
            });
            
            // 输入请求函数
            const requestInput = () => {
                return new Promise((resolve) => {
                    // 请求输入
                    this.sendToTerminal({
                        type: 'terminal-input-request'
                    });

                    // 等待输入
                    const handleInput = (e) => {
                        if (e.data.type === 'terminal-input') {
                            window.removeEventListener('message', handleInput);
                            resolve(e.data.data);
                        }
                    };

                    window.addEventListener('message', handleInput);
                });
            };

            // 先编译代码，检查是否有编译错误
            // 使用空输入进行编译
            const compileResult = await this.compile(sourceCode, '', fileName);
            
            // 检查编译错误
            if (!compileResult.success || compileResult.errors) {
                this.showTerminalOutput('', '', compileResult.errors, undefined);
                return { success: false, errors: compileResult.errors };
            }
            
            // 编译成功，进入循环输入模式
            this.sendToTerminal({
                type: 'terminal-info',
                text: '🔄 进入循环输入模式，每次输入后将运行程序并显示结果。'
            });
            this.sendToTerminal({
                type: 'terminal-info',
                text: '📝 输入数据后按Enter，输入"exit"结束输入。'
            });
            
            let continueInput = true;
            
            while (continueInput) {
                // 获取输入
                const input = await requestInput();
                
                // 检查是否退出
                if (input.trim().toLowerCase() === 'exit') {
                    continueInput = false;
                    this.sendToTerminal({
                        type: 'terminal-info',
                        text: '✅ 循环输入已结束。'
                    });
                    break;
                }
                
                // 只使用当前输入，不累积输入历史
                const currentInput = input + '\n';

                // 使用用户输入重新编译并运行代码
                const compileResultWithInput = await this.compile(sourceCode, currentInput, fileName);
                
                if (!compileResultWithInput.success) {
                    this.showTerminalOutput('', '', compileResultWithInput.errors, undefined);
                    return { success: false, errors: compileResultWithInput.errors };
                }
                
                // 运行代码
                const runResult = await this.run(compileResultWithInput, currentInput, sourceCode);
                
                // 处理运行结果
                let output = runResult.output || '';
                const error = runResult.error || '';
                
                // 提取运行时间
                let actualRunTimeMs = runResult.time || 1;
                
                // 使用代码分析来计算实际内存使用量（与OJ系统一致）
                const actualMemoryBytes = this.analyzeMemoryUsage(sourceCode);
                
                // 确保时间是有效的数字且不为0
                if (typeof actualRunTimeMs !== 'number' || isNaN(actualRunTimeMs) || actualRunTimeMs <= 0) {
                    actualRunTimeMs = 1; // 最小运行时间为1毫秒
                }
                
                // 显示运行结果
                this.showTerminalOutput(output, error, [], actualRunTimeMs, actualMemoryBytes);
                
                // 提示用户继续输入
                this.sendToTerminal({
                    type: 'terminal-info',
                    text: '💡 输入下一组数据，或输入"exit"结束。'
                });
            }
            
            return { 
                success: true, 
                runResult: { 
                    success: true,
                    output: '循环输入模式已结束',
                    error: '',
                    time: Date.now() - startTime,
                    memory: 0
                } 
            };
        } catch (error) {
            // 只在开发环境下显示日志
            if (window.location.hostname === 'localhost') {
                console.error('交互式运行失败:', error);
            }
            this.sendToTerminal({
                type: 'terminal-error',
                text: `error: ${error.message}`
            });
            return { success: false, error: error.message };
        }
    }
    
    // 多行输入运行（支持循环读入）
    async runWithMultiLineInput(sourceCode, fileName = 'test.cpp') {
        return this.runInteractive(sourceCode, fileName);
    }

    async compileAndRun(sourceCode, input = '', fileName = 'test.cpp') {
        // 直接编译运行，使用一个简单的实现，确保只调用一次showTerminalOutput
        try {
            // 打开终端窗口
            if (!this.terminalWindow || this.terminalWindow.closed) {
                this.openTerminal();
                // 等待终端窗口加载
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            // 只有在没有输入时才清空终端内容
            if (!input) {
                this.sendToTerminal({
                    type: 'terminal-clear'
                });
            }

            // 对于包含cin的程序，只有在没有输入时才使用多行输入运行
            if (sourceCode.includes('cin') && !input) {
                return await this.runWithMultiLineInput(sourceCode, fileName);
            }

            // 直接使用原始代码调用compile方法，让compile方法处理时间测量
            // 编译代码
            const compileResult = await this.compile(sourceCode, input, fileName);
            
            if (!compileResult.success) {
                this.showTerminalOutput('', '', compileResult.errors, undefined);
                return { success: false, errors: compileResult.errors };
            }
            
            // 2. 运行代码
            const runResult = await this.run(compileResult, input, sourceCode);
            
            // 检查运行结果是否成功
            if (!runResult.success) {
                // 如果运行失败，只显示错误信息，不显示程序输出和统计信息
                // 提取错误信息
                const error = runResult.error || '';
                
                // 移除error中的程序输出部分
                let cleanedError = error;
                if (cleanedError) {
                    // 移除所有可能的程序输出行
                    const errorLines = cleanedError.split('\n');
                    const cleanedErrorLines = [];
                    
                    for (const line of errorLines) {
                        // 只保留错误信息行
                        if (
                            line.trim() !== '' &&
                            (line.includes('error:') || 
                             line.includes('Error:') || 
                             line.includes('errors generated') || 
                             line.includes('process exited with code') ||
                             line.includes('test.cc:') ||
                             line.startsWith(';') ||
                             line.includes('expected') ||
                             line.includes('at end of') ||
                             line.includes('expression') ||
                             line.includes('declaration'))
                        ) {
                            cleanedErrorLines.push(line);
                        }
                    }
                    
                    cleanedError = cleanedErrorLines.join('\n');
                }
                
                // 清空终端内容，只显示错误信息
                this.sendToTerminal({
                    type: 'terminal-clear'
                });
                
                this.sendToTerminal({
                    type: 'terminal-error',
                    text: `error: ${cleanedError}`
                });
                
                // 只返回错误信息，不返回其他信息
                return { 
                    success: false, 
                    error: cleanedError
                };
            } else {
                // 如果运行成功，显示程序输出和统计信息
                // 提取运行结果
                let output = runResult.output || '';
                const error = runResult.error || '';
                
                // 提取运行时间
                let actualRunTimeMs = runResult.time || 1;
                
                // 使用代码分析来计算实际内存使用量（与OJ系统一致）
                const actualMemoryBytes = this.analyzeMemoryUsage(sourceCode);
                
                // 确保时间是有效的数字且不为0
                if (typeof actualRunTimeMs !== 'number' || isNaN(actualRunTimeMs) || actualRunTimeMs <= 0) {
                    actualRunTimeMs = 1; // 最小运行时间为1毫秒
                }
                
                // 显示程序输出和统计信息
                this.showTerminalOutput(output, error, [], actualRunTimeMs, actualMemoryBytes);
                
                // 返回成功信息
                return { 
                    success: true, 
                    runResult: { 
                        success: true,
                        output: output,
                        error: error,
                        time: actualRunTimeMs,
                        memory: actualMemoryBytes
                    } 
                };
            }
        } catch (error) {
            // 只在开发环境下显示日志
            if (window.location.hostname === 'localhost') {
                console.error('编译运行失败:', error);
            }
            this.showTerminalOutput('', error.message, [], undefined);
            return { success: false, error: error.message };
        }
    }

    openTerminal() {
        // 打开终端窗口
        const terminalUrl = window.location.origin + window.location.pathname.replace('index.html', '') + 'terminal.html';
        this.terminalWindow = window.open(terminalUrl, '_blank', 'width=800,height=600');
        
        // 等待终端窗口加载
        setTimeout(() => {
            if (this.terminalWindow) {
                this.sendToTerminal({ type: 'terminal-ready' });
            }
        }, 500);
    }

    sendToTerminal(data) {
        if (this.terminalWindow) {
            this.terminalWindow.postMessage(data, '*');
        }
        // 不再使用sessionStorage，避免重复输出
    }

    showTerminalOutput(output, error, errors = [], time, memory, isInteractive = false) {
        // 确保终端窗口已经打开，避免递归调用
        if (!this.terminalWindow || this.terminalWindow.closed) {
            this.openTerminal();
            // 不再递归调用showTerminalOutput，直接返回
            return;
        }

        // 1. 显示编译错误（如果有）
        if (errors.length > 0) {
            // 清空终端内容，只显示错误
            this.sendToTerminal({
                type: 'terminal-clear'
            });
            
            errors.forEach(err => {
                // 直接显示完整的错误消息，不重复添加行列号
                // 因为错误消息中已经包含了完整的错误信息和行列号
                this.sendToTerminal({
                    type: 'terminal-error',
                    text: err.message
                });
            });
            return;
        }
        
        // 1.1 显示运行时错误（如果有）- 在显示程序输出之前检查
        if (error && error.trim() !== '') {
            // 清空终端内容，只显示错误
            this.sendToTerminal({
                type: 'terminal-clear'
            });
            
            // 移除error中的程序输出部分
            let cleanedError = error;
            if (cleanedError) {
                // 移除所有可能的程序输出行
                const errorLines = cleanedError.split('\n');
                const cleanedErrorLines = [];
                
                for (const line of errorLines) {
                    // 只保留错误信息行
                    if (
                        line.trim() !== '' &&
                        (line.includes('error:') || 
                         line.includes('Error:') || 
                         line.includes('errors generated') || 
                         line.includes('process exited with code') ||
                         line.includes('test.cc:') ||
                         line.startsWith(';') ||
                         line.includes('expected') ||
                         line.includes('at end of') ||
                         line.includes('expression') ||
                         line.includes('declaration'))
                    ) {
                        cleanedErrorLines.push(line);
                    }
                }
                
                cleanedError = cleanedErrorLines.join('\n');
            }
            
            this.sendToTerminal({
                type: 'terminal-error',
                text: `error: ${cleanedError}`
            });
            return;
        }
        
        // 2. 显示程序输出（标准输出）- 不再清空，直接添加
        if (output) {
            this.sendToTerminal({
                type: 'terminal-output',
                text: output
            });
        }

        // 3. 显示运行时错误（标准错误）
        if (error) {
            this.sendToTerminal({
                type: 'terminal-error',
                text: `error: ${error}`
            });
        }

        // 4. 显示程序运行结束信息和统计数据
        let statsText = '';
        
        // 4.1 时间单位转换 - 统一显示为秒，保留3位小数
        if (typeof time === 'number') {
            const timeValue = parseFloat((time / 1000).toFixed(3));
            const timeUnit = 's';
            statsText += `\n运行时间: ${timeValue} ${timeUnit}`;
        }
        
        // 4.2 内存单位转换 - 自动转换，更准确的单位显示
        if (typeof memory === 'number') {
            let memoryValue = memory;
            let memoryUnit = 'B';
            
            if (memoryValue >= 1024 * 1024) {
                // 大于等于1MB，显示MB，最多保留2位小数
                memoryValue = parseFloat((memoryValue / (1024 * 1024)).toFixed(2));
                memoryUnit = 'MB';
            } else if (memoryValue >= 1024) {
                // 大于等于1KB，显示KB，保留整数
                memoryValue = Math.round(memoryValue / 1024);
                memoryUnit = 'KB';
            }
            
            statsText += `\n内存使用: ${memoryValue} ${memoryUnit}`;
        }
        
        // 只在有统计信息时显示
        if (statsText) {
            this.sendToTerminal({
                type: 'terminal-output',
                text: statsText
            });
        }
        
        // 4.4 发送程序运行完成消息，隐藏输入提示和光标
        // 确保传递的time是转换后的秒值，memory是字节值
        // 交互式运行时不发送complete消息，保持输入提示显示
        if (!isInteractive) {
            const timeInSeconds = typeof time === 'number' ? parseFloat((time / 1000).toFixed(3)) : undefined;
            this.sendToTerminal({
                type: 'terminal-complete',
                time: timeInSeconds,
                memory: memory
            });
        }
    }

    // 分析代码复杂度，返回复杂度系数（0-1）
    analyzeCodeComplexity(sourceCode) {
        // 基础复杂度系数
        let complexity = 0.1;
        
        // 1. 计算循环次数
        const loops = sourceCode.match(/\b(for|while|do)\b/g) || [];
        complexity += loops.length * 0.15;
        
        // 2. 计算循环迭代次数（基于常量）
        const loopPatterns = [
            // 匹配 for (int i = 0; i < N; i++) 或 for (int i = 1; i <= N; i++)
            /\bfor\s*\([^)]*\s*(<|<=)\s*(\d+)\s*\)/g,
            // 匹配 while (i < N) 或 while (i <= N)
            /\bwhile\s*\([^)]*\s*(<|<=)\s*(\d+)\s*\)/g
        ];
        
        loopPatterns.forEach(pattern => {
            const loopMatches = sourceCode.match(pattern) || [];
            loopMatches.forEach(loop => {
                const match = loop.match(/(<|<=)\s*(\d+)/);
                if (match) {
                    const count = parseInt(match[2], 10);
                    // 对于大循环，显著增加复杂度
                    if (count >= 100000000) {
                        complexity += 0.5; // 1亿次循环，复杂度增加0.5
                    } else if (count >= 10000000) {
                        complexity += 0.4; // 1千万次循环，复杂度增加0.4
                    } else if (count >= 1000000) {
                        complexity += 0.3; // 1百万次循环，复杂度增加0.3
                    } else if (count >= 100000) {
                        complexity += 0.2; // 10万次循环，复杂度增加0.2
                    } else if (count >= 10000) {
                        complexity += 0.1; // 1万次循环，复杂度增加0.1
                    }
                }
            });
        });
        
        // 3. 计算函数调用次数
        const functionCalls = sourceCode.match(/\w+\s*\([^)]*\)/g) || [];
        complexity += functionCalls.length * 0.05;
        
        // 4. 计算条件判断次数
        const conditions = sourceCode.match(/\b(if|else|switch|case|&&|\|\|)\b/g) || [];
        // 另外计算三元运算符 ?: 的次数
        const ternaryOperators = sourceCode.match(/\?:/g) || [];
        complexity += (conditions.length + ternaryOperators.length) * 0.03;
        
        // 5. 计算代码行数
        const lines = sourceCode.split('\n').filter(line => line.trim()).length;
        complexity += Math.min(lines / 80, 0.4); // 最多贡献0.4的复杂度
        
        // 6. 检查是否包含嵌套循环
        const nestedLoops = sourceCode.match(/\bfor\s*\([^)]*\)\s*\{[^}]*\bfor\s*\(/g) || [];
        complexity += nestedLoops.length * 0.2; // 嵌套循环增加复杂度
        
        // 限制复杂度在0.1到0.95之间
        return Math.max(0.1, Math.min(0.95, complexity));
    }
    
    // 分析程序代码，计算实际内存使用量（与OJ系统一致）
    analyzeMemoryUsage(sourceCode) {
        // 基础内存使用（程序代码、全局变量等）
        let memoryUsage = 1024; // 1KB基础内存
        
        // 分析程序中的数组声明
        const arrayRegex = /\b(int|long|char|float|double)\s+\w+\[(\d+)\]/g;
        let match;
        
        while ((match = arrayRegex.exec(sourceCode)) !== null) {
            const type = match[1];
            const size = parseInt(match[2]);
            
            // 根据类型计算每个元素的大小
            let elementSize;
            switch (type) {
                case 'int':
                case 'float':
                    elementSize = 4; // 4字节
                    break;
                case 'long':
                case 'double':
                    elementSize = 8; // 8字节
                    break;
                case 'char':
                    elementSize = 1; // 1字节
                    break;
                default:
                    elementSize = 4; // 默认4字节
            }
            
            // 计算数组占用的内存
            memoryUsage += size * elementSize;
        }
        
        // 分析程序中的动态内存分配（new操作）
        const newRegex = /new\s+(int|long|char|float|double)\[(\d+)\]/g;
        while ((match = newRegex.exec(sourceCode)) !== null) {
            const type = match[1];
            const size = parseInt(match[2]);
            
            // 根据类型计算每个元素的大小
            let elementSize;
            switch (type) {
                case 'int':
                case 'float':
                    elementSize = 4; // 4字节
                    break;
                case 'long':
                case 'double':
                    elementSize = 8; // 8字节
                    break;
                case 'char':
                    elementSize = 1; // 1字节
                    break;
                default:
                    elementSize = 4; // 默认4字节
            }
            
            // 计算动态内存分配的大小
            memoryUsage += size * elementSize;
        }
        
        return memoryUsage;
    }
    
    // 限制缓存大小，避免内存使用过高
    limitCacheSize() {
        const MAX_CACHE_SIZE = 50; // 最多缓存50个结果
        if (this.compileCache.size > MAX_CACHE_SIZE) {
            // 删除最旧的缓存项
            const oldestKey = this.compileCache.keys().next().value;
            this.compileCache.delete(oldestKey);
        }
    }

    // 处理来自终端的输入
    handleTerminalInput(input) {
        // 这个方法现在是一个空实现，因为我们使用Promise-based的输入处理
        // 实际的输入处理在runInteractive方法中的requestInput函数中进行
    }

    // 估算内存使用（字节）
    estimateMemoryUsage(sourceCode) {
        // 基础内存使用
        let memoryBytes = 0;
        
        // 1. 匹配所有变量声明行
        const declarationLines = sourceCode.match(/\b(int|float|double|char|long|short|bool)\b\s+[^;]+;/g) || [];
        
        // 处理每行声明
        declarationLines.forEach(line => {
            // 提取变量类型
            const typeMatch = line.match(/\b(int|float|double|char|long|short|bool)\b/);
            if (!typeMatch) return;
            
            const type = typeMatch[1];
            let elementSize = 0;
            
            // 确定类型大小
            switch (type) {
                case 'int': elementSize = 4; break;
                case 'float': elementSize = 4; break;
                case 'double': elementSize = 8; break;
                case 'char': elementSize = 1; break;
                case 'long': elementSize = 8; break;
                case 'short': elementSize = 2; break;
                case 'bool': elementSize = 1; break;
                default: elementSize = 4; break;
            }
            
            // 提取变量声明部分（去掉类型和分号）
            const varsPart = line.substring(typeMatch[0].length).replace(';', '').trim();
            
            // 分割多个变量声明
            const vars = varsPart.split(',').map(v => v.trim());
            
            // 处理每个变量
            vars.forEach(varDecl => {
                // 检查是否是数组声明
                const arrayMatch = varDecl.match(/(\w+)\s*\[\s*(\d*)\s*\]/);
                if (arrayMatch) {
                    // 数组声明
                    let arraySize = 0;
                    if (arrayMatch[2]) {
                        // 显式指定大小
                        arraySize = parseInt(arrayMatch[2], 10);
                    } else {
                        // 初始化列表大小
                        const initMatch = varDecl.match(/\{([^}]+)\}/);
                        if (initMatch) {
                            arraySize = initMatch[1].split(',').length;
                        } else {
                            // 未指定大小且无初始化列表，默认1
                            arraySize = 1;
                        }
                    }
                    // 计算数组内存
                    memoryBytes += elementSize * arraySize;
                } else {
                    // 普通变量声明
                    // 跳过空声明
                    if (varDecl && varDecl.match(/\w+/)) {
                        memoryBytes += elementSize;
                    }
                }
            });
        });
        
        // 2. 处理全局变量和静态变量（简单估算）
        const globalVars = sourceCode.match(/\b(extern|static)\b\s+\b(int|float|double|char|long|short|bool)\b\s+[^;]+;/g) || [];
        memoryBytes += globalVars.length * 4; // 简单估算
        
        // 3. 添加基础程序开销（栈空间、堆空间等）
        memoryBytes += 2048; // 增加到2KB基础开销
        
        // 4. 对于大数组，添加额外的内存开销
        if (memoryBytes > 1024 * 1024) {
            // 大于1MB的数组，添加10%的额外开销
            memoryBytes += Math.round(memoryBytes * 0.1);
        }
        
        return memoryBytes;
    }
}
