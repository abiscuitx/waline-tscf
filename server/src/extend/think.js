// 引入IP地址解析库
const ip2region = require('dy-node-ip2region');
// 引入辅助工具库
const helper = require('think-helper');
// 引入用户代理解析库
const parser = require('ua-parser-js');

// 定义防止后续处理的消息
const preventMessage = 'PREVENT_NEXT_PROCESS';

// 创建IP地址查询实例
const regionSearch = ip2region.create(process.env.IP2REGION_DB);


// 操作系统版本映射表
const OS_VERSION_MAP = {
  Windows: {
    'NT 11.0': '11',
  },
};

module.exports = {
  // 抛出阻止后续处理的错误
  prevent() {
    think.logger.debug('【系统】抛出阻止后续处理的错误');
    throw new Error(preventMessage);
  },

  // 检查是否为阻止后续处理的错误
  isPrevent(err) {
    think.logger.debug('【系统】检查是否为阻止后续处理的错误');
    return think.isError(err) && err.message === preventMessage;
  },

  // 从后向前查找数组中符合条件的元素索引
  findLastIndex(arr, fn) {
    think.logger.debug('【系统】从后向前查找数组元素');
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
    think.logger.debug('【系统】开始执行Promise队列，并发数:', taskNum);
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
    think.logger.debug('【系统】解析IP地址:', ip);
    if (!ip || ip.includes(':')) return '';

    try {
      const search = helper.promisify(regionSearch.btreeSearch, regionSearch);
      const result = await search(ip);

      if (!result) {
        return '';
      }
      const { region } = result;
      const [, , province, city, isp] = region.split('|');
      const address = Array.from(
        new Set([province, city, isp].filter((v) => v)),
      );

      return address.slice(0, depth).join(' ');
    } catch (e) {
      think.logger.debug('【系统】IP地址解析失败',e);
      return '';
    }
  },

  // 解析用户代理字符串
  uaParser(uaText) {
    think.logger.debug('【系统】解析用户代理字符串');
    const ua = parser(uaText);

    // 处理特殊的操作系统版本映射
    if (OS_VERSION_MAP[ua.os.name]?.[ua.os.version]) {
      ua.os.version = OS_VERSION_MAP[ua.os.name][ua.os.version];
    }

    return ua;
  },

  // 根据值获取等级
  getLevel(val) {
    think.logger.debug('【系统】计算等级值');
    const levels = this.config('levels');
    const defaultLevel = 0;

    if (!val) {
      return defaultLevel;
    }

    const level = think.findLastIndex(levels, (l) => l <= val);

    return level === -1 ? defaultLevel : level;
  },

  // 遍历插件并执行回调
  pluginMap(type, callback) {
    think.logger.debug('【系统】遍历插件:', type);
    const plugins = think.config('plugins');
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
    think.logger.debug('【系统】获取插件中间件列表');
    const middlewares = think.pluginMap('middlewares', (middleware) => {
      if (think.isFunction(middleware)) {
        return middleware;
      }

      if (think.isArray(middleware)) {
        return middleware.filter((m) => think.isFunction(m));
      }
    });

    return middlewares.flat();
  },

  // 获取指定钩子的插件处理函数列表
  getPluginHook(hookName) {
    think.logger.debug('【系统】获取钩子处理函数:', hookName);
    return think
      .pluginMap('hooks', (hook) =>
        think.isFunction(hook[hookName]) ? hook[hookName] : undefined,
      )
      .filter((v) => v);
  },
};
