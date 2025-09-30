// 懒加载
let Model, Mongo, fetch;

const load = {
  model: () => Model || (Model = require("think-model")),
  mongo: () => Mongo || (Mongo = require("think-mongo")),
  fetch: () => fetch || (fetch = require("node-fetch")),
};

// 根据环境配置决定是否需要加载数据库模块
const { MONGO_DB, MYSQL_DB, PG_DB, POSTGRES_DATABASE, TIDB_DB } = process.env;

// 扩展配置数组
const extensions = [];

// 检查数据库配置
if (MYSQL_DB || PG_DB || POSTGRES_DATABASE || TIDB_DB) {
  try {
    extensions.push(load.model()(think.app));
    think.logger.debug("【extend】关系型数据库支持加载成功");
  } catch (err) {
    think.logger.error("【extend】关系型数据库支持加载失败:", err);
  }
}

if (MONGO_DB) {
  try {
    extensions.push(load.mongo()(think.app));
    think.logger.debug("【extend】MongoDB支持加载成功");
  } catch (err) {
    think.logger.error("【extend】MongoDB支持加载失败:", err);
  }
}

// 添加上下文扩展
extensions.push({
  context: {
    // 获取服务器URL
    get serverURL() {
      const { SERVER_URL } = process.env;

      if (SERVER_URL) {
        think.logger.info("【extend】使用环境变量中的服务器URL:", SERVER_URL);

        return SERVER_URL;
      }
      const { protocol, host } = this;
      const url = `${protocol}://${host}`;

      think.logger.info("【extend】使用动态生成的服务器URL:", url);

      return url;
    },

    // Webhook回调
    async webhook(type, data) {
      const { WEBHOOK } = process.env;

      if (!WEBHOOK) {
        think.logger.warn(" 【extend】未配置webhook地址，跳过回调");

        return;
      }

      think.logger.debug("【extend】开始发送webhook回调, 类型:", type);
      try {
        const response = await load.fetch()(WEBHOOK, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, data }),
        });

        think.logger.info("【extend】webhook回调发送成功");

        return response.json();
      } catch (err) {
        think.logger.error("【extend】webhook回调发送失败:", err);
        throw err;
      }
    },
  },
});

// 导出扩展配置
module.exports = extensions;

think.logger.debug(" 已加载config/extend.js");
