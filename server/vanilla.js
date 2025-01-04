const path = require('node:path');

const Application = require('thinkjs');

// 初始化Waline服务实例
console.log('[Waline] 初始化服务实例');

// 创建应用实例
const instance = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  proxy: true, // 启用代理
  env: 'dev',
  RUNTIME_PATH: '/tmp',
});

// 启动应用
console.log('[Waline] 启动服务');
instance.run();

// 加载自定义配置
console.log('[Waline] 加载自定义配置');
let config = {};

try {
  config = require('./config.js');
  console.log('[Waline] 成功加载配置文件');
} catch (err) {
  console.log('[Waline] 未找到配置文件,使用默认配置');
}

// 应用配置
for (const k in config) {
  console.log('[Waline] 应用配置:', k);
  think.config(k, config[k]);
}

console.log('[Waline] 服务初始化完成');
