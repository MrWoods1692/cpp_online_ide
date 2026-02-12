/*
 * Copyright 2020 WebAssembly Community Group participants
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

self.importScripts('shared.js');

let api;
let canvas;
let ctx2d;

const apiOptions = {
  async readBuffer(filename) {
    const response = await fetch(filename);
    return response.arrayBuffer();
  },

  async compileStreaming(filename) {
    // TODO: make compileStreaming work. It needs the server to use the
    // application/wasm mimetype.
    if (false && WebAssembly.compileStreaming) {
      return WebAssembly.compileStreaming(fetch(filename));
    } else {
      const response = await fetch(filename);
      return WebAssembly.compile(await response.arrayBuffer());
    }
  },

  hostWrite(s) { self.postMessage({id : 'write', data : s}); }
};

let currentApp = null;

const onAnyMessage = async event => {
  switch (event.data.id) {
  case 'init':
    // 异步初始化API，等待初始化完成
    (async () => {
      try {
        api = new API(apiOptions);
        // 等待API初始化完成（包括加载sysroot.tar等）
        await api.ready;
        // 发送初始化完成消息回主线程
        self.postMessage({id : 'initComplete'});
      } catch (error) {
        // 发送初始化失败消息回主线程
        self.postMessage({id : 'initError', data : error.message});
      }
    })();
    break;

  case 'setShowTiming':
    api.showTiming = event.data.data;
    break;

  case 'compileToAssembly': {
    const responseId = event.data.responseId;
    let output = null;
    let transferList;
    try {
      output = await api.compileToAssembly(event.data.data);
    } finally {
      self.postMessage({id : 'runAsync', responseId, data : output},
                       transferList);
    }
    break;
  }

  case 'compileTo6502': {
    const responseId = event.data.responseId;
    let output = null;
    let transferList;
    try {
      output = await api.compileTo6502(event.data.data);
    } finally {
      self.postMessage({id : 'runAsync', responseId, data : output},
                       transferList);
    }
    break;
  }

  case 'compileLinkRun':
    const compileStartTime = Date.now();
    if (currentApp) {
      // 只在开发环境下显示日志
      try {
        if (self.location && self.location.hostname === 'localhost') {
          console.log('First, disallowing rAF from previous app.');
        }
      } catch (e) {
        // 忽略错误，在无法访问location的环境中不显示日志
      }
      // Stop running rAF on the previous app, if any.
      currentApp.allowRequestAnimationFrame = false;
    }
    
    // 只在开发环境下显示日志
    try {
      if (self.location && self.location.hostname === 'localhost') {
        console.log(`开始compileLinkRun... (${Date.now() - compileStartTime}ms)`);
        console.log(`编译代码长度: ${event.data.data.length} 字符`);
        console.log(`输入数据: ${event.data.stdin || ''}`);
      }
    } catch (e) {
      // 忽略错误，在无法访问location的环境中不显示日志
    }
    
    try {
      currentApp = await api.compileLinkRun(event.data.data, event.data.stdin || '');
      
      // 只在开发环境下显示日志
      try {
        if (self.location && self.location.hostname === 'localhost') {
          const compileEndTime = Date.now();
          console.log(`finished compileLinkRun (${compileEndTime - compileStartTime}ms). currentApp = ${currentApp}.`);
        }
      } catch (e) {
        // 忽略错误，在无法访问location的环境中不显示日志
      }
      
      // 获取程序运行时间和内存使用（如果有）
      const runTime = currentApp && currentApp.runTime ? currentApp.runTime : 0;
      const memoryUsage = currentApp && currentApp.memoryUsage ? currentApp.memoryUsage : 0;
      
      // 发送runAsync消息回主线程，通知编译完成，并传递运行时间和内存使用
      self.postMessage({id : 'runAsync', data : '', runTime : runTime, memoryUsage : memoryUsage});
    } catch (error) {
      // 只在开发环境下显示日志
      try {
        if (self.location && self.location.hostname === 'localhost') {
          const errorTime = Date.now();
          console.error(`compileLinkRun失败 (${errorTime - compileStartTime}ms):`, error);
        }
      } catch (e) {
        // 忽略错误，在无法访问location的环境中不显示日志
      }
      // 直接发送runAsync消息回主线程，包含错误信息
      self.postMessage({id : 'runAsync', data : '', runTime : 0, memoryUsage : 0, hasError : true});
    }
    break;

  case 'postCanvas':
    canvas = event.data.data;
    ctx2d = canvas.getContext('2d');
    break;
  }
};

self.onmessage = onAnyMessage;
