// 引入Node.js内置模块
const http = require('node:http');
const path = require('node:path');

// 引入ThinkJS框架相关模块
const Application = require('thinkjs');
const Loader = require('thinkjs/lib/loader');

// 创建一个单例应用实例
let app = null;
let loader = null;

// 导出服务器初始化函数
module.exports = function(configParams = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { event, context, ...config } = configParams;

      // 如果应用实例不存在，才创建新实例
      if (!app) {
        // 创建ThinkJS应用实例
        app = new Application({
          ROOT_PATH: __dirname,
          APP_PATH: path.join(__dirname, 'src'),
          VIEW_PATH: path.join(__dirname, 'view'),
          RUNTIME_PATH: '/tmp',
          proxy: false,
          env: process.env.env || 'scf'
        });
        
        // 加载应用配置
        loader = new Loader(app.options);
        loader.loadAll('worker');
        
        // 应用配置
        for (const k in config) {
          think.config(k === 'model' ? 'customModel' : k, config[k]);
        }
        think.logger.debug('【waline】应用实例已创建');
      }

      // 构造请求，响应对象
      const server = http.createServer();      
      const req = new http.IncomingMessage(server);
      Object.assign(req, {
        method: event.httpMethod,
        url: `${event.path}${event.queryString ? '?' + new URLSearchParams(event.queryString).toString() : ''}`,
        headers: event.headers || {},
        query: event.queryString || {},
        body: event.body,
        socket: {
          remoteAddress: event.headers['x-scf-remote-addr'] || ''
        }
      });
      const res = new http.ServerResponse(req);
      const originalEnd = res.end;
      let responseData = null;
      // think.logger.debug('【waline】构造请求:', JSON.stringify(req, null, 2));

      // 重写 res.end 来捕获响应
      res.end = function(data) {
        // 恢复原始的 res.end
        res.end = originalEnd;
        responseData = {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          body: data
        };
        // 响应完成时解析 Promise
        resolve(responseData);
      };
      
      // 初始化服务器
      think.beforeStartServer();
      think.logger.debug('【waline】开始初始化');
      // 执行请求处理
      const callback = think.app.callback();
      callback(req, res);
      think.logger.debug('【waline】开始处理请求');
      think.app.emit('appReady');
    } catch (err) {
      // 发生错误时拒绝 Promise
      reject(err);
    }
  });
};