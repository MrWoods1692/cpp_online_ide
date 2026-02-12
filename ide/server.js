const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建Express应用
const app = express();

// 静态文件服务
app.use(express.static(__dirname));

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 定期清理临时文件（每小时）
setInterval(() => {
    cleanupOldTempFiles();
}, 3600000);

// 处理WebSocket连接
wss.on('connection', (ws) => {
    console.log('新的WebSocket连接');

    // 处理消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'compile-run') {
                // 输入验证
                if (!validateInput(data.code)) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: '代码包含不安全的内容'
                    }));
                    return;
                }
                handleCompileRun(ws, data.code, data.input, data.fileName);
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: '处理消息失败: ' + error.message
            }));
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log('WebSocket连接关闭');
    });

    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

// 输入验证
function validateInput(code) {
    // 检查代码长度
    if (code.length > 100000) { // 限制代码长度为100KB
        return false;
    }
    
    // 检查危险操作
    const dangerousPatterns = [
        /system\(/,          // 系统命令执行
        /exec\(/,            // 执行命令
        /fork\(/,            // 创建进程
        /popen\(/,           // 管道打开
        /fopen\(/,           // 文件打开
        /remove\(/,          // 文件删除
        /unlink\(/,          // 文件删除
        /rmdir\(/,           // 目录删除
        /mkdir\(/,           // 创建目录
        /chmod\(/,           // 修改权限
        /chown\(/,           // 修改所有者
        /socket\(/,          // 创建套接字
        /connect\(/,         // 连接网络
        /bind\(/,            // 绑定端口
        /listen\(/,          // 监听端口
        /accept\(/,          // 接受连接
        /inet_addr\(/,       // 网络地址
        /gethostbyname\(/,   // 获取主机名
        /curl|wget|fetch/    // 网络请求工具
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
            return false;
        }
    }
    
    return true;
}

// 处理编译运行请求
function handleCompileRun(ws, code, input, fileName = 'test.cpp') {
    // 创建临时文件
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { mode: 0o700 }); // 设置严格的权限
    }

    const tempFile = path.join(tempDir, `temp_${Date.now()}.cpp`);
    const inputFile = path.join(tempDir, `input_${Date.now()}.txt`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.txt`);
    const errorFile = path.join(tempDir, `error_${Date.now()}.txt`);

    try {
        // 写入代码到临时文件
        fs.writeFileSync(tempFile, code, { mode: 0o600 }); // 设置严格的权限

        // 写入输入到临时文件
        if (input) {
            fs.writeFileSync(inputFile, input, { mode: 0o600 }); // 设置严格的权限
        }

        // 编译代码
        const compileStartTime = Date.now();
        const compileProcess = spawn('clang++', ['-std=c++11', tempFile, '-o', tempFile.replace('.cpp', '')], {
            timeout: 10000, // 编译超时10秒
            maxBuffer: 1024 * 1024 // 最大输出缓冲区1MB
        });

        let compileOutput = '';
        let compileError = '';

        compileProcess.stdout.on('data', (data) => {
            compileOutput += data.toString();
        });

        compileProcess.stderr.on('data', (data) => {
            compileError += data.toString();
        });

        compileProcess.on('close', (code) => {
            const compileTime = Date.now() - compileStartTime;

            if (code !== 0) {
                // 编译失败
                // 处理错误信息，替换临时文件名和敏感信息
                let processedError = compileError || compileOutput;
                
                // 提取临时文件名
                const tempFileName = path.basename(tempFile);
                
                // 使用用户的原始文件名
                const originalFileName = fileName;
                
                // 替换临时文件名和路径
                processedError = processedError.replace(/\/Users\/[^\/]+\/Desktop\/ide\/temp\/temp_[0-9]+\.cpp/g, originalFileName);
                processedError = processedError.replace(/temp_[0-9]+\.cpp/g, originalFileName);
                
                // 移除所有路径信息
                processedError = processedError.replace(/\/Users\/[^\/]+\/Desktop\/ide\/temp\//g, '');
                processedError = processedError.replace(/\/Users\/[^\/]+\//g, '');
                processedError = processedError.replace(/\/[^\/]+\//g, '');
                
                ws.send(JSON.stringify({
                    type: 'compile-error',
                    message: processedError,
                    compileTime: compileTime
                }));

                // 清理临时文件
                cleanupTempFiles([tempFile, inputFile]);
                return;
            }

            // 编译成功，运行程序
            const runStartTime = Date.now();
            const executable = tempFile.replace('.cpp', '');
            
            // 准备运行选项
            const runOptions = {
                cwd: path.dirname(executable),
                timeout: 5000, // 5秒超时
                maxBuffer: 1024 * 1024, // 最大输出缓冲区1MB
                // 资源限制
                env: {
                    ...process.env,
                    // 可以在这里添加环境变量限制
                }
            };

            // 运行程序
            const runProcess = spawn(executable, [], runOptions);

            let runOutput = '';
            let runError = '';

            runProcess.stdout.on('data', (data) => {
                runOutput += data.toString();
                // 实时发送输出
                ws.send(JSON.stringify({
                    type: 'stdout',
                    data: data.toString()
                }));
            });

            runProcess.stderr.on('data', (data) => {
                runError += data.toString();
                // 实时发送错误
                ws.send(JSON.stringify({
                    type: 'stderr',
                    data: data.toString()
                }));
            });

            // 处理输入
            if (input) {
                const inputStream = fs.createReadStream(inputFile);
                inputStream.pipe(runProcess.stdin);
                inputStream.on('end', () => {
                    runProcess.stdin.end();
                });
            } else {
                runProcess.stdin.end();
            }

            runProcess.on('close', (code) => {
                const runTime = Date.now() - runStartTime;
                const totalTime = compileTime + runTime;

                // 发送运行结果
                ws.send(JSON.stringify({
                    type: 'run-complete',
                    success: code === 0,
                    output: runOutput,
                    error: runError,
                    exitCode: code,
                    compileTime: compileTime,
                    runTime: runTime,
                    totalTime: totalTime
                }));

                // 清理临时文件
                cleanupTempFiles([tempFile, inputFile, executable, outputFile, errorFile]);
            });

            runProcess.on('error', (error) => {
                console.error('运行程序失败:', error);
                ws.send(JSON.stringify({
                    type: 'run-error',
                    message: '运行程序失败: ' + error.message
                }));

                // 清理临时文件
                cleanupTempFiles([tempFile, inputFile, executable]);
            });
        });

        compileProcess.on('error', (error) => {
            console.error('编译失败:', error);
            ws.send(JSON.stringify({
                type: 'compile-error',
                message: '编译失败: ' + error.message
            }));

            // 清理临时文件
            cleanupTempFiles([tempFile, inputFile]);
        });
    } catch (error) {
        console.error('处理编译运行请求失败:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: '处理编译运行请求失败: ' + error.message
        }));

        // 清理临时文件
        cleanupTempFiles([tempFile, inputFile]);
    }
}

// 清理临时文件
function cleanupTempFiles(files) {
    files.forEach(file => {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        } catch (error) {
            console.error('清理临时文件失败:', error);
        }
    });
}

// 清理旧的临时文件
function cleanupOldTempFiles() {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        return;
    }

    try {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        const oneHourAgo = now - 3600000; // 1小时前

        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.mtimeMs < oneHourAgo) {
                fs.unlinkSync(filePath);
                console.log(`清理旧临时文件: ${file}`);
            }
        });
    } catch (error) {
        console.error('清理旧临时文件失败:', error);
    }
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`WebSocket服务运行在 ws://localhost:${PORT}`);
    
    // 启动时清理一次旧的临时文件
    cleanupOldTempFiles();
});
