// 引入Node.js内置模块，ThinkJS框架
const path = require('node:path');
const Application = require('thinkjs');

// 初始化Waline服务实例
console.log('[Waline] 初始化应用实例');
const instance = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  proxy: false, // 启用代理
  RUNTIME_PATH: '/tmp',
  env: 'dev'
});
instance.run();

// 加载自定义配置
let config = {
  // 这里可以添加其他配置参数
  // database: {...},
  // secureDomains: [...],
};
for (const k in config) {
  think.config(k, config[k]);
}
think.logger.debug('[Waline] 服务初始化完成');  