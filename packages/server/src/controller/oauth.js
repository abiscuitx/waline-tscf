//懒加载
let jwt;

const load = {
  jwt: () => jwt || (jwt = require("jsonwebtoken")),
};

module.exports = class extends think.Controller {
  // 构造函数：初始化用户模型实例
  constructor(ctx) {
    super(ctx);
    this.modelInstance = this.getModel("Users");
  }

  // OAuth 认证主处理方法
  async indexAction() {
    const { code, oauth_verifier, oauth_token, type, redirect } = this.get();
    const { oauthUrl } = this.config();

    think.logger.debug("【OAuth】开始处理认证请求，认证类型:", type);

    // 检查是否有认证码（Twitter 使用不同的参数）
    const hasCode =
      type === "twitter" ? oauth_token && oauth_verifier : Boolean(code);

    // 如果没有认证码，重定向到第三方认证服务
    if (!hasCode) {
      const { serverURL } = this.ctx;
      const redirectUrl = `${serverURL}/api/oauth?${new URLSearchParams({
        redirect,
        type,
      }).toString()}`;

      think.logger.debug("【OAuth】重定向到认证服务");

      return this.redirect(
        `${oauthUrl}/${type}?${new URLSearchParams({
          redirect: redirectUrl,
          state: this.ctx.state.token || "",
        }).toString()}`
      );
    }

    /**
     * 用户信息结构：
     * user = { id, name, email, avatar, url };
     */
    const params = { code, oauth_verifier, oauth_token };

    // Facebook 需要特殊处理 state 参数
    if (type === "facebook") {
      const { serverURL } = this.ctx;
      const redirectUrl = `${serverURL}/api/oauth?${new URLSearchParams({
        redirect,
        type,
      }).toString()}`;

      params.state = new URLSearchParams({
        redirect: redirectUrl,
        state: this.ctx.state.token || "",
      });
    }

    think.logger.debug("【OAuth】开始获取用户信息");

    // 从认证服务获取用户信息
    const user = await fetch(
      `${oauthUrl}/${type}?${new URLSearchParams(params).toString()}`,
      {
        method: "GET",
        headers: {
          "user-agent": "@waline",
        },
      }
    ).then((resp) => resp.json());

    // 验证用户信息是否有效
    if (!user?.id) {
      think.logger.debug("【OAuth】获取用户信息失败");

      return this.fail(user);
    }

    think.logger.debug("【OAuth】检查用户是否已存在");

    // 检查是否已有该社交账号关联的用户
    const userBySocial = await this.modelInstance.select({ [type]: user.id });

    // 如果找到已关联的用户，生成令牌并返回
    if (!think.isEmpty(userBySocial)) {
      const token = load
        .jwt()
        .sign(userBySocial[0].email, this.config("jwtKey"));

      think.logger.debug("【OAuth】用户已存在，生成新的登录令牌");
      if (redirect) {
        return this.redirect(
          redirect + (redirect.includes("?") ? "&" : "?") + "token=" + token
        );
      }

      return this.success();
    }

    // 为没有邮箱的用户生成临时邮箱
    if (!user.email) {
      user.email = `${user.id}@mail.${type}`;
    }

    // 获取当前登录用户信息
    const current = this.ctx.state.userInfo;

    // 处理已登录用户的社交账号绑定
    if (!think.isEmpty(current)) {
      think.logger.debug("【OAuth】为当前用户绑定社交账号");
      const updateData = { [type]: user.id };

      // 如果用户没有头像，使用社交账号的头像
      if (!current.avatar && user.avatar) {
        updateData.avatar = user.avatar;
      }

      await this.modelInstance.update(updateData, {
        objectId: current.objectId,
      });

      return this.redirect("/ui/profile");
    }

    think.logger.debug("【OAuth】检查邮箱是否已被使用");

    // 检查是否存在使用相同邮箱的用户
    const userByEmail = await this.modelInstance.select({ email: user.email });

    if (think.isEmpty(userByEmail)) {
      // 创建新用户
      think.logger.debug("【OAuth】创建新用户");
      const count = await this.modelInstance.count();
      const data = {
        display_name: user.name,
        email: user.email,
        url: user.url,
        avatar: user.avatar,
        [type]: user.id,
        password: this.hashPassword(Math.random()),
        type: think.isEmpty(count) ? "administrator" : "guest", // 第一个用户设为管理员
      };

      await this.modelInstance.add(data);
    } else {
      // 更新现有用户的社交账号信息
      think.logger.debug("【OAuth】更新现有用户信息");
      const updateData = { [type]: user.id };

      // 如果用户没有头像，使用社交账号的头像
      if (!userByEmail.avatar && user.avatar) {
        updateData.avatar = user.avatar;
      }
      await this.modelInstance.update(updateData, { email: user.email });
    }

    // 生成登录令牌
    const token = load.jwt().sign(user.email, this.config("jwtKey"));

    think.logger.debug("【OAuth】认证完成，生成登录令牌");

    // 如果有重定向地址，附加令牌后重定向
    if (redirect) {
      return this.redirect(
        redirect + (redirect.includes("?") ? "&" : "?") + "token=" + token
      );
    }

    return this.success();
  }
};

think.logger.debug(" 已加载/controller/oauth.js");
