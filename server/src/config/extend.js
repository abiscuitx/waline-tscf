think.logger.debug('【扩展】 初始化扩展配置');

// 导入必要的模块
const Model = require('think-model');
const Mongo = require('think-mongo');
const fetch = require('node-fetch');

// 扩展配置 - 添加数据库模型和上下文扩展
module.exports = [
  // 添加关系型数据库支持
  Model(think.app),
  // 添加MongoDB支持
  Mongo(think.app),
  {
    context: {
      // 获取服务器URL
      get serverURL() {
        const { SERVER_URL } = process.env;

        if (SERVER_URL) {
          think.logger.debug('【扩展】使用环境变量URL');
          return SERVER_URL;
        } else {
            url = `${protocol}://${host}`;
            think.logger.debug('【扩展】生成标准环境URL');
        }
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
        return fetch(WEBHOOK, {
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
