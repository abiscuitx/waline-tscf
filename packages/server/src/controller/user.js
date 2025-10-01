// 引入基础 REST 控制器
const BaseRest = require('./rest.js');

module.exports = class extends BaseRest {
  // 构造函数：初始化用户模型实例
  constructor(...args) {
    super(...args);
    this.modelInstance = this.getModel('Users');
  }

  // 获取用户列表或单个用户信息的处理方法
  async getAction() {
    const { page, pageSize, email } = this.get();
    const { userInfo } = this.ctx.state;

    think.logger.debug('【user】处理获取用户信息请求');

    // 非管理员用户只能获取评论数量统计的用户列表
    if (think.isEmpty(userInfo) || userInfo.type !== 'administrator') {
      think.logger.debug('【user】非管理员请求，返回统计列表');
      const users = await this.getUsersListByCount();

      return this.success(users);
    }

    // 根据邮箱查询单个用户信息
    if (email) {
      think.logger.debug('【user】查询用户信息:', email);
      const user = await this.modelInstance.select({ email });

      if (think.isEmpty(user)) {
        think.logger.debug('【user】用户不存在');

        return this.success();
      }

      return this.success(user[0]);
    }

    // 获取分页的用户列表
    think.logger.debug('【user】获取用户列表, 页码:', page);
    const count = await this.modelInstance.count({});
    const users = await this.modelInstance.select(
      {},
      {
        desc: 'createdAt',
        limit: pageSize,
        offset: Math.max((page - 1) * pageSize, 0),
      },
    );

    return this.success({
      page,
      totalPages: Math.ceil(count / pageSize),
      pageSize,
      data: users,
    });
  }

  // 用户注册的处理方法
  async postAction() {
    const data = this.post();

    think.logger.debug('【user】处理用户注册:', data.email);

    // 检查用户是否已存在
    const resp = await this.modelInstance.select({
      email: data.email,
    });

    // 如果用户已存在且类型为管理员或访客，返回错误
    if (
      !think.isEmpty(resp) &&
      ['administrator', 'guest'].includes(resp[0].type)
    ) {
      think.logger.warn('【user】注册失败: 用户已存在');

      return this.fail(this.locale('USER_EXIST'));
    }

    // 获取用户总数，用于判断是否为首个用户
    const count = await this.modelInstance.count();

    // 获取邮件服务相关配置
    const {
      SMTP_HOST,
      SMTP_SERVICE,
      SENDER_EMAIL,
      SENDER_NAME,
      SMTP_USER,
      SITE_NAME,
    } = process.env;
    const hasMailService = SMTP_HOST || SMTP_SERVICE;

    // 生成4位数验证码
    const token = Array.from({ length: 4 }, () =>
      Math.round(Math.random() * 9),
    ).join('');
    // 设置用户类型：首个用户为管理员，其他用户根据邮件服务配置决定是否需要验证
    const normalType = hasMailService
      ? `verify:${token}:${Date.now() + 1 * 60 * 60 * 1000}`
      : 'guest';

    // 处理用户数据
    data.password = this.hashPassword(data.password);
    data.type = think.isEmpty(count) ? 'administrator' : normalType;

    think.logger.debug('【user】保存用户数据', {
      类型: data.type,
      是否首个用户: think.isEmpty(count),
    });

    // 保存或更新用户数据
    if (think.isEmpty(resp)) {
      await this.modelInstance.add(data);
      think.logger.debug('【user】创建新用户');
    } else {
      await this.modelInstance.update(data, { email: data.email });
      think.logger.debug('【user】更新现有用户');
    }

    // 如果不需要验证，直接返回成功
    if (!/^verify:/i.test(data.type)) {
      return this.success();
    }

    // 发送验证邮件
    try {
      think.logger.debug('【用户系统】发送验证邮件');
      const notify = this.service('notify', this);
      const transporter = notify.getTransporter();

      if (!transporter) {
        think.logger.debug('【用户系统】未配置SMTP服务，无法发送验证邮件');

        return this.fail('邮件服务未配置，请联系管理员');
      }

      const apiUrl =
        this.ctx.serverURL +
        '/verification?' +
        new URLSearchParams({ token, email: data.email }).toString();

      await transporter.sendMail({
        from:
          SENDER_EMAIL && SENDER_NAME
            ? `"${SENDER_NAME}" <${SENDER_EMAIL}>`
            : SMTP_USER,
        to: data.email,
        subject: this.locale('[{{name | safe}}] Registration Confirm Mail', {
          name: SITE_NAME || 'Waline',
        }),
        html: this.locale(
          'Please click <a href="{{url}}">{{url}}<a/> to confirm registration, the link is valid for 1 hour. If you are not registering, please ignore this email.',
          { url: apiUrl },
        ),
      });

      think.logger.debug('【用户系统】验证邮件发送成功');
    } catch (err) {
      think.logger.debug('【用户系统】验证邮件发送失败', err);

      return this.fail(
        this.locale(
          'Registration confirm mail send failed, please {%- if isAdmin -%}check your mail configuration{%- else -%}check your email address and contact administrator{%- endif -%}.',
          { isAdmin: think.isEmpty(count) },
        ),
      );
    }

    return this.success({ verify: true });
  }

  // 更新用户信息的处理方法
  async putAction() {
    const { display_name, url, avatar, password, type, label } = this.post();
    const { objectId } = this.ctx.state.userInfo;
    const twoFactorAuth = this.post('2fa');

    think.logger.debug('【用户系统】开始处理用户信息更新');

    // 收集需要更新的字段
    const updateData = {};

    // 更新用户类型（仅管理员可操作）
    if (this.id && type) {
      updateData.type = type;
    }

    // 更新用户标签
    if (think.isString(label)) {
      updateData.label = label;
    }

    // 更新显示名称
    if (display_name) {
      updateData.display_name = display_name;
    }

    // 更新个人网址
    if (url) {
      updateData.url = url;
    }

    // 更新头像
    if (avatar) {
      updateData.avatar = avatar;
    }

    // 更新密码
    if (password) {
      updateData.password = this.hashPassword(password);
    }

    // 更新双因素认证设置
    if (think.isString(twoFactorAuth)) {
      updateData['2fa'] = twoFactorAuth;
    }

    // 更新社交账号绑定信息
    const socials = ['github', 'twitter', 'facebook', 'google', 'weibo', 'qq'];

    socials.forEach((social) => {
      const nextSocial = this.post(social);

      if (think.isString(nextSocial)) {
        updateData[social] = nextSocial;
      }
    });

    // 如果没有需要更新的数据，直接返回成功
    if (think.isEmpty(updateData)) {
      return this.success();
    }

    think.logger.debug('【用户系统】更新用户数据');
    // 执行更新操作
    await this.modelInstance.update(updateData, {
      objectId: this.id || objectId,
    });

    return this.success();
  }

  // 获取按评论数排序的用户列表
  async getUsersListByCount() {
    const { pageSize } = this.get();

    think.logger.debug('【用户系统】获取评论数统计的用户列表');

    // 获取评论模型实例
    const commentModel = this.getModel('Comment');

    // 获取有效评论的统计数据
    const counts = await commentModel.count(
      {
        status: ['NOT IN', ['waiting', 'spam']],
      },
      {
        group: ['user_id', 'mail'],
      },
    );

    // 按评论数排序并限制返回数量
    counts.sort((a, b) => b.count - a.count);
    counts.length = Math.min(pageSize, counts.length);

    // 获取用户ID列表
    const userIds = counts
      .filter(({ user_id }) => user_id)
      .map(({ user_id }) => user_id);

    let usersMap = {};

    // 获取用户详细信息
    if (userIds.length) {
      think.logger.debug('【用户系统】获取用户详细信息');
      const users = await this.modelInstance.select({
        objectId: ['IN', userIds],
      });

      for (const user of users) {
        usersMap[user.objectId] = users;
      }
    }

    // 处理用户列表数据
    const users = [];
    const { avatarProxy } = this.config();

    think.logger.debug('【用户系统】处理用户数据和头像');
    for (const count of counts) {
      const user = {
        count: count.count,
      };

      // 处理用户等级
      if (think.isArray(this.config('levels'))) {
        let level = 0;

        if (user.count) {
          const _level = think.findLastIndex(
            this.config('levels'),
            (l) => l <= user.count,
          );

          if (_level !== -1) {
            level = _level;
          }
        }
        user.level = level;
      }

      // 处理已注册用户的信息
      if (count.user_id && users[count.user_id]) {
        const {
          display_name: nick,
          url: link,
          avatar: avatarUrl,
          label,
        } = users[count.user_id];
        const avatar =
          avatarProxy && !avatarUrl.includes(avatarProxy)
            ? avatarProxy + '?url=' + encodeURIComponent(avatarUrl)
            : avatarUrl;

        Object.assign(user, { nick, link, avatar, label });
        users.push(user);
        continue;
      }

      // 处理未注册用户的信息（从评论中获取）
      const comments = await commentModel.select(
        { mail: count.mail },
        { limit: 1 },
      );

      if (think.isEmpty(comments)) {
        continue;
      }
      const comment = comments[0];

      if (think.isEmpty(comment)) {
        continue;
      }
      const { nick, link } = comment;
      const avatarUrl = await think.service('avatar').stringify(comment);
      const avatar =
        avatarProxy && !avatarUrl.includes(avatarProxy)
          ? avatarProxy + '?url=' + encodeURIComponent(avatarUrl)
          : avatarUrl;

      Object.assign(user, { nick, link, avatar });
      users.push(user);
    }

    think.logger.debug('【用户系统】用户列表处理完成');

    return users;
  }
};

think.logger.debug(' 已加载/controller/user.js');
