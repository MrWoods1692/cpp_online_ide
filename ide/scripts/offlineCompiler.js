// 离线C++解释器 - 完全在浏览器内运行，无需网络
// 支持C++的基本语法，适合教学场景

class OfflineCppInterpreter {
    constructor() {
        this.errorTranslations = {
            'error:': '错误：',
            'warning:': '警告：',
            'undefined': '未定义',
            'expected': '期望',
            'missing': '缺少',
            'declared': '声明',
            'syntax error': '语法错误',
            'expected \';\'': '期望分号',
            'expected \')\'': '期望右括号',
            'expected \'}\'': '期望右花括号'
        };
    }

    translateError(errorMessage) {
        let translated = errorMessage;
        for (const [en, zh] of Object.entries(this.errorTranslations)) {
            translated = translated.replace(new RegExp(en, 'gi'), zh);
        }
        return translated;
    }

    // 解析并执行C++代码（交互式）
    async execute(sourceCode, inputCallback = null) {
        const startTime = Date.now();
        
        try {
            // 语法检查
            const syntaxErrors = this.checkSyntax(sourceCode);
            if (syntaxErrors.length > 0) {
                return {
                    success: false,
                    errors: syntaxErrors.map(err => ({
                        ...err,
                        message: this.translateError(err.message)
                    })),
                    output: '',
                    time: Date.now() - startTime
                };
            }

            // 执行代码
            const output = [];
            const variables = {};
            const functions = {};
            let inputIndex = 0;

            // 预处理：提取函数定义
            this.extractFunctions(sourceCode, functions);

            // 查找main函数
            if (!functions['main']) {
                return {
                    success: false,
                    errors: [{
                        line: 1,
                        column: 1,
                        message: '未找到main函数'
                    }],
                    output: '',
                    time: Date.now() - startTime
                };
            }

            // 执行main函数
            try {
                await this.executeFunction('main', functions, variables, output, inputCallback);
            } catch (error) {
                return {
                    success: false,
                    errors: [{
                        line: 1,
                        column: 1,
                        message: this.translateError(error.message)
                    }],
                    output: output.join(''),
                    time: Date.now() - startTime
                };
            }

            return {
                success: true,
                output: output.join(''),
                errors: [],
                time: Date.now() - startTime,
                memory: 0 // 简化版本不计算内存
            };
        } catch (error) {
            return {
                success: false,
                errors: [{
                    line: 1,
                    column: 1,
                    message: this.translateError(error.message)
                }],
                output: '',
                time: Date.now() - startTime
            };
        }
    }

    // 语法检查
    checkSyntax(sourceCode) {
        const errors = [];
        const lines = sourceCode.split('\n');

        let braceCount = 0;
        let parenCount = 0;
        let inString = false;
        let stringChar = '';

        lines.forEach((line, lineIndex) => {
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

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

                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '(') parenCount++;
                if (char === ')') parenCount--;
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

    // 提取函数定义
    extractFunctions(sourceCode, functions) {
        // 简化版本：查找 int main() { ... } 模式
        const mainMatch = sourceCode.match(/int\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}/);
        if (mainMatch) {
            functions['main'] = {
                body: mainMatch[1],
                params: []
            };
        }
    }

    // 执行函数
    async executeFunction(funcName, functions, variables, output, inputCallback) {
        const func = functions[funcName];
        if (!func) {
            throw new Error(`函数 ${funcName} 未定义`);
        }

        // 解析函数体中的语句
        const statements = this.parseStatements(func.body);

        for (const stmt of statements) {
            await this.executeStatement(stmt, variables, output, inputCallback);
        }
    }

    // 解析语句
    parseStatements(code) {
        const statements = [];
        let currentStatement = '';
        let braceCount = 0;
        let inString = false;
        let stringChar = '';

        // 将代码按行分割
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;

            // 添加到当前语句
            if (currentStatement) {
                currentStatement += '\n';
            }
            currentStatement += line;

            // 检查当前语句是否完整
            let inLineString = inString;
            let inLineStringChar = stringChar;
            let inLineBraceCount = braceCount;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

                // 处理字符串
                if ((char === '"' || char === "'") && prevChar !== '\\') {
                    inLineString = !inLineString;
                    if (inLineString) {
                        inLineStringChar = char;
                    } else {
                        inLineStringChar = '';
                    }
                }

                if (inLineString) continue;

                // 处理大括号
                if (char === '{') {
                    inLineBraceCount++;
                } else if (char === '}') {
                    inLineBraceCount--;
                }
            }

            // 更新全局状态
            inString = inLineString;
            stringChar = inLineStringChar;
            braceCount = inLineBraceCount;

            // 识别语句类型
            const lowerLine = currentStatement.toLowerCase();

            // 如果语句完整（没有未匹配的大括号），或者是简单语句
            if (braceCount === 0 || 
                lowerLine.includes('cout') && lowerLine.includes('<<') ||
                lowerLine.includes('cin') && lowerLine.includes('>>') ||
                lowerLine.includes('=') && !lowerLine.includes('==') && !lowerLine.includes('!=')) {
                
                // 识别语句类型
                if (lowerLine.includes('cout') && lowerLine.includes('<<')) {
                    statements.push({ type: 'cout', line: currentStatement });
                } else if (lowerLine.includes('cin') && lowerLine.includes('>>')) {
                    statements.push({ type: 'cin', line: currentStatement });
                } else if (lowerLine.includes('=') && !lowerLine.includes('==') && !lowerLine.includes('!=')) {
                    statements.push({ type: 'assignment', line: currentStatement });
                } else if (lowerLine.startsWith('return')) {
                    statements.push({ type: 'return', line: currentStatement });
                } else if (lowerLine.includes('if')) {
                    statements.push({ type: 'if', line: currentStatement });
                } else if (lowerLine.includes('for')) {
                    statements.push({ type: 'for', line: currentStatement });
                } else if (lowerLine.includes('while')) {
                    statements.push({ type: 'while', line: currentStatement });
                }

                // 重置当前语句
                currentStatement = '';
            }
        }

        // 添加剩余的语句
        if (currentStatement) {
            statements.push({ type: 'other', line: currentStatement });
        }

        return statements;
    }

    // 执行语句
    async executeStatement(stmt, variables, output, inputCallback) {
        switch (stmt.type) {
            case 'cout':
                this.executeCout(stmt.line, variables, output);
                break;
            case 'cin':
                await this.executeCin(stmt.line, variables, inputCallback, output);
                break;
            case 'assignment':
                this.executeAssignment(stmt.line, variables);
                break;
            case 'return':
                // return语句在这里简化处理
                break;
            case 'if':
                // if语句简化处理
                break;
            case 'for':
                // for循环简化处理
                break;
            case 'while':
                await this.executeWhile(stmt.line, [], variables, output, inputCallback);
                break;
        }
    }

    // 执行cout输出
    executeCout(line, variables, output) {
        // 解析 cout << ... << endl;
        const coutMatch = line.match(/cout\s*<<\s*(.+?)\s*;/);
        if (!coutMatch) return;

        const parts = coutMatch[1].split('<<').map(p => p.trim());
        let result = '';

        for (const part of parts) {
            if (part === 'endl') {
                result += '\n';
            } else if (part === '\\n') {
                result += '\n';
            } else if ((part.startsWith('"') && part.endsWith('"')) || 
                       (part.startsWith("'") && part.endsWith("'"))) {
                // 字符串字面量
                result += part.slice(1, -1);
            } else if (part.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                // 变量
                if (variables[part] !== undefined) {
                    result += String(variables[part]);
                } else {
                    result += '0'; // 未定义变量默认0
                }
            } else if (part.match(/^-?\d+$/)) {
                // 整数
                result += part;
            } else if (part.match(/^-?\d*\.\d+$/)) {
                // 浮点数
                result += part;
            } else {
                // 尝试作为表达式计算
                try {
                    let expr = part;
                    // 替换变量
                    for (const v in variables) {
                        const regex = new RegExp('\\b' + v + '\\b', 'g');
                        expr = expr.replace(regex, variables[v]);
                    }
                    const value = eval(expr);
                    result += String(value);
                } catch (e) {
                    // 如果计算失败，输出原始值
                    result += part;
                }
            }
        }

        output.push(result);
    }

    // 执行cin输入
    async executeCin(line, variables, inputCallback, output) {
        // 解析 cin >> var1 >> var2 >> ... 模式
        const cinMatch = line.match(/cin\s*>>\s*([\s\S]*?)\s*;/);
        if (!cinMatch) return;

        const varPart = cinMatch[1];
        const varNames = varPart.split('>>').map(v => v.trim());

        // 获取输入
        let input = '';
        if (inputCallback) {
            // 使用回调获取输入
            input = await inputCallback(output.join(''));
        } else {
            input = '0'; // 默认值
        }

        // 分割输入值
        const values = input.split(/\s+/).filter(v => v.trim() !== '');

        // 为每个变量赋值
        for (let i = 0; i < varNames.length; i++) {
            const varName = varNames[i];
            const value = values[i] || '0';

            // 尝试转换为数字
            if (value.match(/^-?\d+$/)) {
                variables[varName] = parseInt(value, 10);
            } else if (value.match(/^-?\d*\.\d+$/)) {
                variables[varName] = parseFloat(value);
            } else {
                variables[varName] = value;
            }
        }
    }

    // 执行赋值
    executeAssignment(line, variables) {
        // 简化版本：只支持基本赋值
        const match = line.match(/(\w+)\s*=\s*(.+?)\s*;/);
        if (!match) return;

        const varName = match[1];
        let value = match[2].trim();

        // 解析值
        if (value.match(/^\d+$/)) {
            variables[varName] = parseInt(value, 10);
        } else if (value.match(/^\d*\.\d+$/)) {
            variables[varName] = parseFloat(value);
        } else if (value.startsWith('"') && value.endsWith('"')) {
            variables[varName] = value.slice(1, -1);
        } else if (variables[value] !== undefined) {
            variables[varName] = variables[value];
        } else {
            // 尝试计算表达式
            try {
                // 替换变量名
                for (const v in variables) {
                    value = value.replace(new RegExp('\\b' + v + '\\b', 'g'), variables[v]);
                }
                variables[varName] = eval(value);
            } catch (e) {
                variables[varName] = 0;
            }
        }
    }

    // 执行while循环
    async executeWhile(whileLine, codeLines, variables, output, inputCallback) {
        // 查找while循环的完整结构
        let bodyStart = -1;
        let bodyEnd = -1;
        let braceCount = 0;
        let inString = false;
        let stringChar = '';

        // 找到while循环的开始位置
        for (let i = 0; i < whileLine.length; i++) {
            const char = whileLine[i];
            const prevChar = i > 0 ? whileLine[i - 1] : '';

            // 处理字符串
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                inString = !inString;
                if (inString) {
                    stringChar = char;
                } else {
                    stringChar = '';
                }
            }

            if (inString) continue;

            // 找到while循环的左大括号
            if (char === '{' && !inString) {
                bodyStart = i + 1;
                braceCount = 1;
                break;
            }
        }

        // 如果没有找到左大括号，返回
        if (bodyStart === -1) return;

        // 找到while循环的右大括号
        for (let i = bodyStart; i < whileLine.length; i++) {
            const char = whileLine[i];
            const prevChar = i > 0 ? whileLine[i - 1] : '';

            // 处理字符串
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                inString = !inString;
                if (inString) {
                    stringChar = char;
                } else {
                    stringChar = '';
                }
            }

            if (inString) continue;

            // 计算大括号数量
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    bodyEnd = i;
                    break;
                }
            }
        }

        // 如果没有找到右大括号，返回
        if (bodyEnd === -1) return;

        // 提取循环条件和循环体
        const condition = whileLine.substring(whileLine.indexOf('(') + 1, whileLine.indexOf(')')).trim();
        const body = whileLine.substring(bodyStart, bodyEnd).trim();

        // 解析循环体中的语句
        const statements = this.parseStatements(body);

        // 检测是否是 cin 循环
        const isCinLoop = condition.includes('cin >>');

        // 执行循环
        while (true) {
            if (isCinLoop) {
                // 对于 cin 循环，每次循环都会执行 cin 输入
                // 解析 cin 部分
                const cinMatch = condition.match(/cin\s*>>\s*([\s\S]*)/);
                if (cinMatch) {
                    // 提取变量名
                    const varPart = cinMatch[1];
                    const varNames = varPart.split('>>').map(v => v.trim());

                    // 获取输入
                    let input = '';
                    if (inputCallback) {
                        // 使用回调获取输入
                        input = await inputCallback(output.join(''));
                    } else {
                        input = ''; // 默认值，会导致循环结束
                    }

                    // 如果输入为空，结束循环
                    if (input.trim() === '' || input.trim() === 'EOF') {
                        break;
                    }

                    // 分割输入值
                    const values = input.split(/\s+/).filter(v => v.trim() !== '');

                    // 为每个变量赋值
                    for (let i = 0; i < varNames.length; i++) {
                        const varName = varNames[i];
                        const value = values[i] || '';

                        if (value === '') {
                            // 如果没有足够的值，结束循环
                            break;
                        }

                        // 尝试转换为数字
                        if (value.match(/^-?\d+$/)) {
                            variables[varName] = parseInt(value, 10);
                        } else if (value.match(/^-?\d*\.\d+$/)) {
                            variables[varName] = parseFloat(value);
                        } else {
                            variables[varName] = value;
                        }
                    }
                }
            } else {
                // 对于普通条件循环，计算条件
                try {
                    let condExpr = condition;
                    // 替换变量
                    for (const v in variables) {
                        const regex = new RegExp('\\b' + v + '\\b', 'g');
                        condExpr = condExpr.replace(regex, variables[v]);
                    }
                    const result = eval(condExpr);
                    if (!result) {
                        break;
                    }
                } catch (e) {
                    // 如果条件计算失败，结束循环
                    break;
                }
            }

            // 执行循环体
            for (const stmt of statements) {
                await this.executeStatement(stmt, variables, output, inputCallback);
            }
        }
    }
}

// 导出
window.OfflineCppInterpreter = OfflineCppInterpreter;
