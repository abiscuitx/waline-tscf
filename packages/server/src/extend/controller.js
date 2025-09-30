// 声明变量
let nunjucks, PasswordHash, defaultLocales;

// 懒加载辅助函数
const load = {
  nunjucks: () => nunjucks || (nunjucks = require("nunjucks")),
  passwordHash: () =>
    PasswordHash || (PasswordHash = require("phpass").PasswordHash),
  defaultLocales: () =>
    defaultLocales || (defaultLocales = require("../locales/index.js")),
};

// 设置默认语言为英语
const defaultLang = "zh-CN";

module.exports = {
  // 处理成功响应的方法
  success(...args) {
    // think.logger.debug("【controller】发送成功响应:", args[0] ? JSON.stringify(args[0]).slice(0, 100) + "..." : "empty");
    this.ctx.success(...args);

    return think.prevent();
  },

  // 处理失败响应的方法
  fail(...args) {
    // think.logger.warn("【controller】发送失败响应:", args[0]);
    this.ctx.fail(...args);

    return think.prevent();
  },

  // 根据兼容模式返回不同格式的成功响应
  jsonOrSuccess(...args) {
    const method = this.ctx.state.deprecated ? "json" : "success";

    // think.logger.debug(`【controller】使用${method}方法返回响应`);
    return this[method](...args);
  },

  // 处理多语言消息的方法
  locale(message, variables) {
    const { lang: userLang } = this.get();
    const lang = (userLang || defaultLang).toLowerCase();

    think.logger.debug("【controller】处理多语言消息, 语言:", lang);

    const customLocales = this.config("locales");
    const locales = customLocales || load.defaultLocales();

    const localMessage =
      locales?.[lang]?.[message] ||
      load.defaultLocales()?.[lang]?.[message] ||
      load.defaultLocales()[defaultLang][message];

    if (localMessage) {
      message = localMessage;
    }

    return load.nunjucks().renderString(message, variables);
  },

  // 获取数据模型实例的方法
  getModel(modelName) {
    const { storage, customModel } = this.config();

    think.logger.debug(
      "【controller】获取数据模型:",
      modelName,
      "存储类型:",
      storage
    );

    if (typeof customModel === "function") {
      const modelInstance = customModel(modelName, this);

      if (modelInstance) {
        think.logger.debug("【controller】使用自定义数据模型");

        return modelInstance;
      }
    }

    return this.service(`storage/${storage}`, modelName);
  },

  // 密码加密方法
  hashPassword(password) {
    think.logger.debug("【controller】执行密码加密");
    const PwdHash = this.config("encryptPassword") || load.passwordHash();

    return new PwdHash().hashPassword(password);
  },

  // 密码验证方法
  checkPassword(password, storeHash) {
    think.logger.debug("【controller】验证密码");
    const PwdHash = this.config("encryptPassword") || load.passwordHash();

    return new PwdHash().checkPassword(password, storeHash);
  },

  json(...args) {
    // think.logger.debug('【控制器】json 参数:', JSON.stringify(args));

    const result = super.json(...args);

    // think.logger.debug('【控制器】json 结果:', JSON.stringify(result));
    return result;
  },
};

think.logger.debug(" 已加载/extend/controller.js");
