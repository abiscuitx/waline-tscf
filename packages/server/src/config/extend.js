// 懒加载
let Model, Mongo, fetch;

const load = {
  model: () => Model || (Model = require('think-model')),
  mongo: () => Mongo || (Mongo = require('think-mongo')),
  fetch: () => {
    if (fetch) return fetch;

    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.fetch === 'function'
    ) {
      fetch = globalThis.fetch.bind(globalThis);

      return fetch;
    }

    throw new Error('Missing native fetch: Node.js 18+ is required');
  },
};

// 根据环境配置决定是否需要加载数据库模块
const { MONGO_DB, MYSQL_DB, PG_DB, POSTGRES_DATABASE, TIDB_DB } = process.env;

// 扩展配置数组
const extensions = [];

// 检查数据库配置
if (MYSQL_DB || PG_DB || POSTGRES_DATABASE || TIDB_DB) {
  try {
    extensions.push(load.model()(think.app));
    think.logger.debug('【extend】关系型数据库支持加载成功');
  } catch (err) {
    think.logger.error('【extend】关系型数据库支持加载失败:', err);
  }
}

if (MONGO_DB) {
  try {
    extensions.push(load.mongo()(think.app));
    think.logger.debug('【extend】MongoDB支持加载成功');
  } catch (err) {
    think.logger.error('【extend】MongoDB支持加载失败:', err);
  }
}

// 添加上下文扩展
extensions.push({
  context: {
    // 获取服务器URL
    get serverURL() {
      const { SERVER_URL } = process.env;

      if (SERVER_URL) {
        think.logger.info('【extend】使用环境变量中的服务器URL:', SERVER_URL);

        return SERVER_URL;
      }
      const { protocol, host } = this;
      const url = `${protocol}://${host}`;

      think.logger.info('【extend】使用动态生成的服务器URL:', url);

      return url;
    },

    // Webhook回调
    async webhook(type, data) {
      const { WEBHOOK } = process.env;

      if (!WEBHOOK) {
        think.logger.warn(' 【extend】未配置webhook地址，跳过回调');

        return;
      }

      think.logger.debug('【extend】开始发送webhook回调, 类型:', type);
      try {
        const response = await load.fetch()(WEBHOOK, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type, data }),
        });

        const statusCode = response.status;

        think.logger.debug('【extend】收到webhook响应', {
          status: statusCode,
          ok: response.ok,
          statusText: response.statusText,
        });

        // 安全地读取响应
        try {
          const text = await response.text();

          think.logger.debug('【extend】响应文本', {
            textLength: text.length,
            textPreview: text.substring(0, 200),
          });

          try {
            const parsed = JSON.parse(text);

            think.logger.info('【extend】webhook回调发送成功');

            return parsed;
          } catch (parseErr) {
            think.logger.debug('【extend】JSON解析失败', {
              error: String(parseErr),
            });

            return { status: statusCode, text };
          }
        } catch (readErr) {
          think.logger.debug('【extend】响应读取失败', {
            error: String(readErr),
          });

          return { status: statusCode, text: '<<read-failed>>' };
        }
      } catch (err) {
        think.logger.error('【extend】webhook回调发送失败:', err);
        throw err;
      }
    },
  },
});

// 导出扩展配置
module.exports = extensions;

think.logger.debug(' 已加载config/extend.js');
