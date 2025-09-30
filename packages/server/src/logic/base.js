// 引入Node.js内置模块
const path = require("node:path");
const qs = require("node:querystring");

// 引入第三方依赖
const jwt = require("jsonwebtoken");
const helper = require("think-helper");

module.exports = class extends think.Logic {
  // 构造函数：初始化用户模型、资源名称和ID
  constructor(...args) {
    super(...args);
    this.modelInstance = this.getModel("Users");
    this.resource = this.getResource();
    this.id = this.getId();
    think.logger.debug("【base】初始化完成", {
      资源: this.resource,
      ID: this.id,
    });
  }

  // 请求前置处理方法
  async __before() {
    const referrer = this.ctx.req.headers["Refer"] || this.ctx.referrer(true);
    let origin = this.ctx.req.headers["origin"];

    if (origin && origin.length > 0) {
      try {
        // 检查 origin 是否是一个完整的 URL
        if (!origin.includes("://")) {
          origin = `http://${origin}`;
        }
        const parsedOrigin = new URL(origin);

        origin = parsedOrigin.hostname;
      } catch (e) {
        think.logger.debug("无效格式:", origin, e);
        origin = this.ctx.req.headers["host"] || "";
      }
    }

    let { secureDomains } = this.config();

    if (secureDomains) {
      secureDomains = think.isArray(secureDomains)
        ? secureDomains
        : [secureDomains];
      // 添加默认的安全域名列表
      secureDomains.push(
        "localhost",
        "127.0.0.1",
        "github.com",
        "api.twitter.com",
        "www.facebook.com",
        "api.weibo.com",
        "graph.qq.com"
      );

      // 转换可能的正则表达式字符串为正则表达式对象
      secureDomains = secureDomains
        .map((domain) => {
          // 如果是正则表达式字符串，创建一个 RegExp 对象
          if (
            typeof domain === "string" &&
            domain.startsWith("/") &&
            domain.endsWith("/")
          ) {
            try {
              return new RegExp(domain.slice(1, -1)); // 去掉斜杠并创建 RegExp 对象
            } catch (e) {
              console.error(
                "Invalid regex pattern in secureDomains:",
                domain,
                e
              );

              return null;
            }
          }

          return domain;
        })
        .filter(Boolean); // 过滤掉无效的正则表达式

      // 有 referrer 检查 referrer，没有则检查 origin
      const checking = referrer ? referrer : origin;
      const isSafe = secureDomains.some((domain) =>
        think.isFunction(domain.test)
          ? domain.test(checking)
          : domain === checking
      );

      if (!isSafe) {
        return this.ctx.throw(403);
      }
    }

    // 初始化用户状态
    this.ctx.state.userInfo = {};
    const { authorization } = this.ctx.req.headers;
    const { state } = this.get();

    if (!authorization && !state) {
      return;
    }

    // 获取并验证用户令牌
    const token = state || authorization.replace(/^Bearer /, "");
    let userMail = "";

    try {
      think.logger.debug("【base】用户令牌验证");
      userMail = jwt.verify(token, think.config("jwtKey"));
    } catch (e) {
      think.logger.debug("【base】令牌验证失败：", e);
    }

    if (think.isEmpty(userMail) || !think.isString(userMail)) {
      return;
    }

    // 查询用户详细信息
    think.logger.debug("【base】查询用户信息");
    const user = await this.modelInstance.select(
      { email: userMail },
      {
        field: [
          "id",
          "email",
          "url",
          "display_name",
          "type",
          "github",
          "twitter",
          "facebook",
          "google",
          "weibo",
          "qq",
          "avatar",
          "2fa",
          "label",
        ],
      }
    );

    if (think.isEmpty(user)) {
      return;
    }

    // 处理用户信息和头像
    const userInfo = user[0];

    think.logger.debug("【base】处理用户头像");

    let avatarUrl = userInfo.avatar
      ? userInfo.avatar
      : await think.service("avatar").stringify({
          mail: userInfo.email,
          nick: userInfo.display_name,
          link: userInfo.url,
        });
    const { avatarProxy } = think.config();

    // 处理头像代理
    if (avatarProxy) {
      avatarUrl = avatarProxy + "?url=" + encodeURIComponent(avatarUrl);
    }
    userInfo.avatar = avatarUrl;
    userInfo.mailMd5 = helper.md5(userInfo.email);
    this.ctx.state.userInfo = userInfo;
    this.ctx.state.token = token;
  }

  // 从文件名获取资源名称
  getResource() {
    think.logger.debug("【base】获取资源名称");
    const filename = this.__filename || __filename;
    const last = filename.lastIndexOf(path.sep);

    return filename.substr(last + 1, filename.length - last - 4);
  }

  // 从请求中获取资源ID
  getId() {
    const id = this.get("id");

    if (id && (think.isString(id) || think.isNumber(id))) {
      return id;
    }

    const last = decodeURIComponent(this.ctx.path.split("/").pop());

    if (last !== this.resource && /^([a-z0-9]+,?)*$/i.test(last)) {
      return last;
    }

    return "";
  }

  // 验证码检查方法
  async useCaptchaCheck() {
    const { RECAPTCHA_V3_SECRET, TURNSTILE_SECRET } = process.env;
    const { turnstile, recaptchaV3 } = this.post();

    // 优先使用 Turnstile 验证
    if (TURNSTILE_SECRET) {
      return this.useRecaptchaOrTurnstileCheck({
        secret: TURNSTILE_SECRET,
        token: turnstile,
        api: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        method: "POST",
      });
    }

    // 其次使用 reCAPTCHA v3 验证
    if (RECAPTCHA_V3_SECRET) {
      return this.useRecaptchaOrTurnstileCheck({
        secret: RECAPTCHA_V3_SECRET,
        token: recaptchaV3,
        api: "https://recaptcha.net/recaptcha/api/siteverify",
        method: "GET",
      });
    }
  }

  // 执行验证码验证
  async useRecaptchaOrTurnstileCheck({ secret, token, api, method }) {
    think.logger.debug("【base】执行验证码验证");
    if (!secret) {
      return;
    }

    if (!token) {
      think.logger.warn("【base】验证失败: 缺少验证码令牌");

      return this.ctx.throw(403);
    }

    // 构建验证请求参数
    const query = qs.stringify({
      secret,
      response: token,
      remoteip: this.ctx.ip,
    });

    // 发送验证请求
    const requestUrl = method === "GET" ? api + "?" + query : api;
    const options =
      method === "GET"
        ? {}
        : {
            method,
            headers: {
              "content-type":
                "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: query,
          };

    const response = await fetch(requestUrl, options).then((resp) =>
      resp.json()
    );

    // 处理验证结果
    if (!response.success) {
      think.logger.warn(
        "【base】验证失败:",
        JSON.stringify(response, null, "\t")
      );

      return this.ctx.throw(403);
    }
    think.logger.debug("【base】验证通过");
  }
};

think.logger.debug(" 已加载/logic/base.js");
