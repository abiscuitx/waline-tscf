// 引入Node.js内置模块
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

// 引入ThinkJS框架相关模块
const Application = require('thinkjs');
const Loader = require('thinkjs/lib/loader');

// 导出服务器初始化函数
module.exports = async function(req, res) {

    // 保存原始的 res.end
    const originalEnd = res.end;
    
    // 创建一个 Promise 来处理响应
    const responsePromise = new Promise((resolve) => {
      res.end = function(data) {
        // 恢复原始的 res.end
        res.end = originalEnd;
        
        resolve({
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          body: data
        });
      };
    });

    // 初始化服务器
    think.beforeStartServer();
    think.logger.debug('【waline】开始处理请求');
    
    // 执行请求处理
    const callback = think.app.callback();
    
    // 同时等待 callback 执行完成和响应结果
    await Promise.all([
      callback(req, res),
      responsePromise
    ]);
    
    think.logger.debug('【waline】请求处理完成');
    think.app.emit('appReady');
    think.logger.debug('【waline】应用待机中');
    
    // 返回响应结果
    return await responsePromise;
};
