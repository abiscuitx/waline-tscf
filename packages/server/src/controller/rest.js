const path = require("node:path");

module.exports = class extends think.Controller {
  // 标识当前类为 REST 控制器
  static get _REST() {
    return true;
  }

  // 定义请求方法的属性名
  static get _method() {
    return "method";
  }

  // 构造函数：初始化资源和ID
  constructor(ctx) {
    super(ctx);
    this.resource = this.getResource();
    this.id = this.getId();
    think.logger.debug("【rest】初始化控制器", {
      资源: this.resource,
      ID: this.id,
    });
  }

  // 前置处理方法，可被子类重写
  __before() {}

  // 从文件名中获取资源名称
  getResource() {
    const filename = this.__filename || __filename;
    const last = filename.lastIndexOf(path.sep);
    const resource = filename.substr(last + 1, filename.length - last - 4);

    // think.logger.debug('【REST】解析资源名称:', resource);
    return resource;
  }

  // 从请求中获取资源ID
  getId() {
    const id = this.get("id");

    // 检查请求参数中的ID
    if (id && (think.isString(id) || think.isNumber(id))) {
      // think.logger.debug('【REST】从请求参数获取ID:', id);
      return id;
    }

    // 从URL路径中获取ID
    const last = decodeURIComponent(this.ctx.path.split("/").pop());

    // 验证URL中的ID格式
    if (last !== this.resource && /^([a-z0-9]+,?)*$/i.test(last)) {
      // think.logger.debug('【REST】从URL路径获取ID:', last);
      return last;
    }

    // think.logger.debug('【REST】未找到有效ID');
    return "";
  }

  // 检查用户登录状态
  isLogin() {
    const { userInfo } = this.ctx.state;
    const isEmpty = think.isEmpty(userInfo);

    think.logger.debug("【rest】用户登录状态:", isEmpty ? "未登录" : "已登录");

    return isEmpty;
  }

  // 执行钩子函数链
  async hook(name, ...args) {
    think.logger.debug("【rest】执行钩子:", name);

    // 获取配置的钩子函数和插件钩子
    const fn = this.config(name);
    const plugins = think.getPluginHook(name);

    // 如果存在配置的钩子函数，添加到插件列表开头
    if (think.isFunction(fn)) {
      plugins.unshift(fn);
    }

    // 依次执行所有钩子函数
    for (const plugin of plugins) {
      if (!think.isFunction(plugin)) {
        continue;
      }

      const resp = await plugin.call(this, ...args);

      // 如果钩子返回结果，中断执行并返回
      if (resp) {
        think.logger.debug("【rest】钩子执行完成，返回结果");

        return resp;
      }
    }

    think.logger.debug("【rest】钩子执行完成");
  }

  // 默认调用方法，处理未定义的方法调用
  __call() {}
};

think.logger.debug(" 已加载/controller/rest.js");
