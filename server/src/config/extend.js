// 懒加载依赖
let Model, Mongo, fetch;

// 加载器函数
const load = {
  model: () => Model || (Model = require('think-model')),
  mongo: () => Mongo || (Mongo = require('think-mongo')),
  fetch: () => fetch || (fetch = require('node-fetch'))
};

// 扩展配置 - 添加数据库模型和上下文扩展
module.exports = [
  // 添加关系型数据库支持
  load.model()(think.app),
  // 添加MongoDB支持
  load.mongo()(think.app),
  { 
    context: {
      // 获取服务器URL
      get serverURL() {
        const { SERVER_URL } = process.env;
        if (SERVER_URL) {
          return SERVER_URL;
        }
        const { protocol, host } = this;
        const url = `${protocol}://${host}`;
        think.logger.debug('【扩展】最终服务器URL:', url);
        return url;
      },

      // Webhook回调
      async webhook(type, data) {
        const { WEBHOOK } = process.env;
        if (!WEBHOOK) {
          think.logger.debug('[Webhook] 未配置webhook地址，跳过回调');
          return;
        }

        think.logger.debug('[Webhook] 发送回调请求');
        return load.fetch()(WEBHOOK, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ type, data }),
        }).then((resp) => resp.json());
      },
    },
  
  },
];

think.logger.debug('【扩展】 已加载扩展配置');
