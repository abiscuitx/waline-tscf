// 引入Node.js内置模块，ThinkJS框架
const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
  quiet: true,
});

const watcher = require('think-watcher');
const Application = require('thinkjs');

// 初始化Waline开发服务实例
console.log(new Date(), "【Waline Dev】初始化应用实例");
const instance = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  proxy: false, // 代理
  RUNTIME_PATH: '/tmp', // 运行时目录
  watcher: watcher, // 热重载
  env: 'development',
});

instance.run();

// 加载自定义配置
let config = {
  // 开发环境专用配置
  // debug: true,
  // logLevel: 'debug',
};

// 尝试加载外部配置文件（保持向后兼容）
try {
  const externalConfig = require('./config.js');

  config = { ...config, ...externalConfig };
} catch {
  // 外部配置文件不存在时使用默认配置
}

for (const k in config) {
  think.config(k, config[k]);
}
console.log(new Date(), "【Waline Dev】服务初始化完成");
