//导入中间件模块
const cors = require("@koa/cors");
const routerREST = require("think-router-rest");

// 中间件配置数组
module.exports = [
  // 管理界面中间件 - 处理UI路由
  {
    handle: "dashboard",
    match: /^\/ui/,
  },

  // 元信息中间件 - 处理请求元数据
  {
    handle: "meta",
    options: {
      sendPowerBy: false, //send powerby
      sendResponseTime: false, //send response time
      logRequest: false, //log request
    },
  },

  // CORS中间件 - 处理跨域请求
  {
    handle: () => {
      think.logger.debug(" 【middleware】加载 CORS");
      // 跨域数组,默认为空
      const allowedOrigins = [];

      return cors({
        origin: (ctx) => {
          if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
            const requestOrigin = ctx.request.header.origin;

            if (allowedOrigins.includes(requestOrigin)) {
              return requestOrigin;
            }

            return false;
          }

          return "*";
        },
        allowMethods: ["GET", "POST", "PUT", "DELETE"],
        allowHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400, // 预检请求缓存时间
      });
    },
  },

  // 请求追踪中间件 - 处理请求日志和错误
  {
    handle: "trace",
    enable: true,
    options: {
      sourceMap: true,
      debug: true,
      contentType: () => "json",
      error(err, ctx) {
        if (/favicon.ico$/.test(ctx.url)) {
          return;
        }
        if (think.isPrevent(err)) {
          return false;
        }
        think.logger.error(" 【middleware】请求处理发生错误:", err);
      },
    },
  },

  // 请求体解析中间件 - 处理请求数据
  {
    handle: "payload",
    options: {
      keepExtensions: true,
      limit: "5mb",
    },
  },

  // 路由中间件 - 处理API路由
  {
    handle: "router",
    options: {
      prefix: ["/api"],
    },
  },

  // REST路由中间件 - 处理RESTful API
  { handle: routerREST },

  // 逻辑处理中间件
  "logic",

  // 插件中间件 - 处理插件功能
  {
    handle: "plugin",
  },

  // 控制器中间件
  "controller",
];

think.logger.debug(" 已加载config/middleware.js");
