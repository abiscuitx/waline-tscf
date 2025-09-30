// 声明变量
let ip2region, helper, parser, regionSearch;

// 懒加载辅助函数
const load = {
  ip2region: () => ip2region || (ip2region = require("dy-node-ip2region")),
  helper: () => helper || (helper = require("think-helper")),
  parser: () => parser || (parser = require("ua-parser-js")),
  regionSearch: () =>
    regionSearch ||
    (regionSearch = load.ip2region().create(process.env.IP2REGION_DB)),
};

// 创建IP地址查询实例
regionSearch = load.ip2region().create(process.env.IP2REGION_DB);

// 定义防止后续处理的消息
const preventMessage = "PREVENT_NEXT_PROCESS";

// 操作系统版本映射表
const OS_VERSION_MAP = {
  Windows: {
    "NT 11.0": "11",
  },
};

module.exports = {
  // 抛出阻止后续处理的错误
  prevent() {
    think.logger.info("【Think】阻止后续处理");
    throw new Error(preventMessage);
  },

  // 检查是否为阻止后续处理的错误
  isPrevent(err) {
    return think.isError(err) && err.message === preventMessage;
  },

  // 从后向前查找数组中符合条件的元素索引
  findLastIndex(arr, fn) {
    // think.logger.debug('【系统】从后向前查找数组元素');
    for (let i = arr.length - 1; i >= 0; i--) {
      const ret = fn(arr[i], i, arr);

      if (!ret) {
        continue;
      }

      return i;
    }

    return -1;
  },

  // 按指定并发数执行Promise队列
  promiseAllQueue(promises, taskNum) {
    // think.logger.debug('【系统】开始执行Promise队列，并发数:', taskNum);
    return new Promise((resolve, reject) => {
      if (!promises.length) {
        return resolve();
      }

      const ret = [];
      let index = 0;
      let count = 0;

      // 执行单个任务的函数
      function runTask() {
        const idx = index;

        index += 1;
        if (index > promises.length) {
          return Promise.resolve();
        }

        return promises[idx].then((data) => {
          ret[idx] = data;
          count += 1;
          if (count === promises.length) {
            resolve(ret);
          }

          return runTask();
        }, reject);
      }

      // 启动指定数量的任务
      for (let i = 0; i < taskNum; i++) {
        runTask();
      }
    });
  },

  // IP地址转换为地理位置信息
  async ip2region(ip, { depth = 1 }) {
    if (!ip || ip.includes(":")) {
      think.logger.debug("【Think】无效的IP地址:", ip);

      return "";
    }

    try {
      think.logger.debug("【Think】开始解析IP地址:", ip);
      const search = load
        .helper()
        .promisify(load.regionSearch().btreeSearch, load.regionSearch());
      const result = await search(ip);

      if (!result) {
        think.logger.debug("【Think】IP地址解析无结果");

        return "";
      }

      const { region } = result;
      const [, , province, city, isp] = region.split("|");
      const address = Array.from(
        new Set([province, city, isp].filter((v) => v))
      );

      think.logger.debug("【Think】IP地址解析结果:", address.join(" "));

      return address.slice(0, depth).join(" ");
    } catch (err) {
      think.logger.error("【Think】IP地址解析错误:", err);

      return "";
    }
  },

  // 解析用户代理字符串
  uaParser(uaText) {
    const ua = load.parser()(uaText);

    // 处理特殊的操作系统版本映射
    if (OS_VERSION_MAP[ua.os.name]?.[ua.os.version]) {
      ua.os.version = OS_VERSION_MAP[ua.os.name][ua.os.version];
    }

    return ua;
  },

  // 根据值获取等级
  getLevel(val) {
    const levels = this.config("levels");
    const defaultLevel = 0;

    if (!val) {
      return defaultLevel;
    }

    const level = think.findLastIndex(levels, (l) => l <= val);

    think.logger.debug("【系统】计算等级值:", level);

    return level === -1 ? defaultLevel : level;
  },

  // 遍历插件并执行回调
  pluginMap(type, callback) {
    // think.logger.debug('【think】遍历插件:', type);
    const plugins = think.config("plugins");
    const fns = [];

    if (!think.isArray(plugins)) {
      return fns;
    }

    for (const plugin of plugins) {
      if (!plugin?.[type]) {
        continue;
      }

      const res = callback(plugin[type]);

      if (!res) {
        continue;
      }

      fns.push(res);
    }

    return fns;
  },

  // 获取插件中间件列表
  getPluginMiddlewares() {
    think.logger.debug("【Think】获取插件中间件");
    const middlewares = this.pluginMap("middlewares", (middleware) => {
      if (think.isFunction(middleware)) {
        return middleware;
      }
      if (think.isArray(middleware)) {
        return middleware.filter((m) => think.isFunction(m));
      }
    });

    think.logger.debug(
      "【Think】找到插件中间件数量:",
      middlewares.flat().length
    );

    return middlewares.flat();
  },

  // 获取指定钩子的插件处理函数列表
  getPluginHook(hookName) {
    think.logger.debug("【Think】获取插件钩子:", hookName);
    const hooks = this.pluginMap("hooks", (hook) =>
      think.isFunction(hook[hookName]) ? hook[hookName] : undefined
    ).filter((v) => v);

    think.logger.debug("【Think】找到钩子处理函数数量:", hooks.length);

    return hooks;
  },
};

think.logger.debug(" 已加载/extend/think.js");
