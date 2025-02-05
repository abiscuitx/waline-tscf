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

// 只在配置了关系型数据库时添加支持
if (MYSQL_DB || PG_DB || POSTGRES_DATABASE || TIDB_DB) {
  extensions.push(load.model()(think.app));
}

// 只在配置了MongoDB时添加支持
if (MONGO_DB) {
  extensions.push(load.mongo()(think.app));
}

// 添加上下文扩展
extensions.push({
  context: {
    // 获取服务器URL
    get serverURL() {
      const { SERVER_URL } = process.env;
      if (SERVER_URL) {
        return SERVER_URL;
      }
      const { protocol, host } = this;
      const url = `${protocol}://${host}`;
      think.logger.debug(" 【extend】服务器URL:", url);
      return url;
    },

    // Webhook回调
    async webhook(type, data) {
      const { WEBHOOK } = process.env;
      if (!WEBHOOK) {
        think.logger.debug(" 【extend】未配置webhook地址，跳过回调");
        return;
      }

      think.logger.debug(" 【extend】发送回调请求");
      return load
        .fetch()(WEBHOOK, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ type, data }),
        })
        .then((resp) => resp.json());
    },
  },
});

// 导出扩展配置
module.exports = extensions;

think.logger.debug(" 已加载config/extend.js");
