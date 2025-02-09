// 引入Node.js内置模块
const http = require("node:http");
const path = require("node:path");

// 引入ThinkJS框架相关模块
const Application = require("thinkjs");
const Loader = require("thinkjs/lib/loader");

// 创建一个单例应用实例
let app = null;

// 导出函数
module.exports = function (configParams = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { event, context, debugLevel, ...config } = configParams;

      // 如果应用实例不存在，创建thinkjs实例
      if (!app) {
        console.log(new Date(), " 【waline】实例冷启动");
        app = new Application({
          ROOT_PATH: __dirname,
          APP_PATH: path.join(__dirname, "src"),
          proxy: false,
          RUNTIME_PATH: "/tmp",
          env: "dev",
        });

        // 加载应用配置
        loader = new Loader(app.options);
        loader.loadAll("worker");
        for (const k in config) {
          think.config(k === "model" ? "customModel" : k, config[k]);
        }
      } else {
        console.log(new Date(), " 【waline】实例热启动");
      }

      // 构造请求，响应对象
      const server = http.createServer();
      const req = new http.IncomingMessage(server);
      const headers = {
        ...(event.headers || {}),
        ...(event.headerParameters || {}),
        "x-real-ip": event.requestContext?.sourceIp || "",
      };
      Object.assign(req, {
        method: event.httpMethod,
        url: `${event.path}${
          event.queryString
            ? "?" + new URLSearchParams(event.queryString).toString()
            : ""
        }`,
        headers,
        query: event.queryString || {},
        body: event.body || "",
        socket: {
          remoteAddress: headers["x-real-ip"] || headers["Refer"] || "",
        },
      });

      // 重写 res.end 来捕获响应
      const res = new http.ServerResponse(req);
      const originalEnd = res.end;
      let responseData = null;
      res.end = function (data) {
        res.end = originalEnd;
        responseData = {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          body: data,
        };
        resolve(responseData);
      };

      // 开始处理请求
      think.beforeStartServer();
      think.logger.debug(
        " 【waline】开始处理请求"
        // ,{
        // method: req.method,
        // url: req.url,
        // headers: req.headers,
        // query: req.query,
        // remoteAddress: req.socket.remoteAddress
        // }
      );
      const callback = think.app.callback();
      callback(req, res);
      think.app.emit("appReady");
    } catch (err) {
      reject(err);
    }
  });
};
