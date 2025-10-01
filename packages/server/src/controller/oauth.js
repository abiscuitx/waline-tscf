// 引入 JWT 库用于生成和验证令牌
const jwt = require('jsonwebtoken');

module.exports = class extends think.Controller {
  // 构造函数：初始化用户模型实例
  constructor(ctx) {
    super(ctx);
    this.modelInstance = this.getModel('Users');
  }

  // OAuth 认证主处理方法
  async indexAction() {
    let { code, oauth_verifier, oauth_token, type, redirect } = this.get();
    const { oauthUrl } = this.config();

    think.logger.debug('【OAuth】开始处理认证请求', {
      type,
      hasCode: !!code,
      hasRedirect: !!redirect,
      redirect,
    });

    // 过滤掉无效的 redirect 参数（undefined 或字符串 "undefined"）
    if (!redirect || redirect === 'undefined') {
      redirect = undefined;
      think.logger.debug('【OAuth】redirect 参数无效，已清理');
    }

    // 检查是否有认证码（Twitter 使用不同的参数名）
    const hasCode =
      type === 'twitter' ? oauth_token && oauth_verifier : Boolean(code);

    // 如果没有认证码，说明是首次请求，需要重定向到第三方认证服务
    if (!hasCode) {
      const { serverURL } = this.ctx;

      // 构建回调 URL 参数，只添加有效的参数
      const callbackParams = { type };

      if (redirect) {
        callbackParams.redirect = redirect;
      }

      const redirectUrl = `${serverURL}/api/oauth?${new URLSearchParams(
        callbackParams,
      ).toString()}`;

      think.logger.debug('【OAuth】重定向到第三方认证服务', {
        oauthUrl,
        type,
        redirectUrl,
      });

      return this.redirect(
        `${oauthUrl}/${type}?${new URLSearchParams({
          redirect: redirectUrl,
          state: this.ctx.state.token || '',
        }).toString()}`,
      );
    }

    /**
     * 用户信息结构说明：
     * user = { id, name, email, avatar, url };
     */
    const params = { code, oauth_verifier, oauth_token };

    // Facebook 需要特殊处理 state 参数
    if (type === 'facebook') {
      const { serverURL } = this.ctx;

      // 构建回调 URL 参数，只添加有效的参数
      const callbackParams = { type };

      if (redirect) {
        callbackParams.redirect = redirect;
      }

      const redirectUrl = `${serverURL}/api/oauth?${new URLSearchParams(
        callbackParams,
      ).toString()}`;

      params.state = new URLSearchParams({
        redirect: redirectUrl,
        state: this.ctx.state.token || '',
      });
    }

    // 从 OAuth 服务获取用户信息
    think.logger.debug('【OAuth】从第三方服务获取用户信息', { type });
    const user = await fetch(
      `${oauthUrl}/${type}?${new URLSearchParams(params).toString()}`,
      {
        method: 'GET',
        headers: {
          'user-agent': '@waline',
        },
      },
    ).then((resp) => resp.json());

    // 验证用户信息是否有效
    if (!user?.id) {
      think.logger.error('【OAuth】获取用户信息失败', { user });

      return this.fail(user);
    }

    think.logger.debug('【OAuth】成功获取用户信息', {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    });

    // 步骤1：检查是否已有该社交账号关联的用户
    const userBySocial = await this.modelInstance.select({ [type]: user.id });

    // 如果找到已关联的用户，生成令牌并返回
    if (!think.isEmpty(userBySocial)) {
      const token = jwt.sign(userBySocial[0].email, this.config('jwtKey'));

      think.logger.debug('【OAuth】社交账号已关联用户', {
        userId: userBySocial[0].id || userBySocial[0]._id,
        email: userBySocial[0].email,
        hasRedirect: !!redirect,
      });

      // 如果有 redirect 参数，说明是正常登录流程
      if (redirect) {
        think.logger.debug('【OAuth】正常登录流程，生成令牌并重定向');

        return this.redirect(
          redirect + (redirect.includes('?') ? '&' : '?') + 'token=' + token,
        );
      }

      // 如果没有 redirect 参数，说明是重复绑定操作
      think.logger.warn('【OAuth】重复绑定操作，该社交账号已绑定到其他账号');

      return this.fail(type + '已绑定其他账号，请先解绑');
    }

    // 步骤2：社交账号未被关联，检查当前登录状态
    const current = this.ctx.state.userInfo;

    // 如果有当前登录用户，执行绑定操作
    if (!think.isEmpty(current)) {
      think.logger.debug('【OAuth】当前用户已登录，执行绑定操作', {
        currentUserId: current.id || current._id,
        currentEmail: current.email,
        socialType: type,
        socialId: user.id,
      });

      const updateData = { [type]: user.id };

      // 如果用户没有头像，使用社交账号的头像
      if (!current.avatar && user.avatar) {
        updateData.avatar = user.avatar;
      }

      // 如果用户没有昵称，使用社交账号的昵称
      if (!current.display_name && user.name) {
        updateData.display_name = user.name;
      }

      await this.modelInstance.update(updateData, {
        objectId: current.objectId,
      });

      think.logger.debug('【OAuth】社交账号绑定成功');

      return this.redirect('/ui/profile?success=social_account_bound');
    }

    // 步骤3：没有登录用户，跳转到注册页面
    think.logger.debug('【OAuth】未登录用户，跳转到注册页面');

    return this.redirect(`/ui/register`);

    /* 原自动创建用户逻辑（已注释）
    // 为没有邮箱的用户生成临时邮箱
    if (!user.email) {
      user.email = `${user.id}@mail.${type}`;
      think.logger.debug('【OAuth】用户无邮箱，生成临时邮箱', {
        email: user.email
      });
    }
    // 检查邮箱是否已被使用
    const userByEmail = await this.modelInstance.select({ email: user.email });

    if (think.isEmpty(userByEmail)) {
      // 创建新用户
      think.logger.debug('【OAuth】邮箱未被使用，创建新用户');

      const count = await this.modelInstance.count();
      const data = {
        display_name: user.name,
        email: user.email,
        url: user.url,
        avatar: user.avatar,
        [type]: user.id,
        password: this.hashPassword(Math.random()),
        type: think.isEmpty(count) ? 'administrator' : 'guest', // 第一个用户设为管理员
      };

      await this.modelInstance.add(data);

      think.logger.debug('【OAuth】新用户创建成功', {
        email: user.email,
        isAdmin: think.isEmpty(count)
      });
    } else {
      // 更新现有用户的社交账号信息
      think.logger.debug('【OAuth】邮箱已存在，更新用户社交账号', {
        email: user.email,
        socialType: type
      });

      const updateData = { [type]: user.id };

      // 如果用户没有头像，使用社交账号的头像
      if (!userByEmail.avatar && user.avatar) {
        updateData.avatar = user.avatar;
      }

      await this.modelInstance.update(updateData, { email: user.email });
    }

    // 生成登录令牌
    const token = jwt.sign(user.email, this.config('jwtKey'));

    think.logger.debug('【OAuth】认证完成，生成登录令牌', {
      email: user.email,
      hasRedirect: !!redirect,
      redirectUrl: redirect
    });

    // 如果有重定向地址，附加令牌后重定向
    if (redirect) {
      return this.redirect(
        redirect + (redirect.includes('?') ? '&' : '?') + 'token=' + token,
      );
    }

    // 如果没有 redirect 参数，返回 token 给客户端
    return this.success({ token });
    */
  }
};
