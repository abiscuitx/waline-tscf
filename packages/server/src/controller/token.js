//懒加载
let jwt, speakeasy, helper;

const load = {
  jwt: () => jwt || (jwt = require('jsonwebtoken')),
  speakeasy: () => speakeasy || (speakeasy = require('speakeasy')),
  helper: () => helper || (helper = require('think-helper')),
};

// 引入基础 REST 控制器
const BaseRest = require('./rest.js');

module.exports = class extends BaseRest {
  // 构造函数：初始化用户模型实例
  constructor(...args) {
    super(...args);
    this.modelInstance = this.getModel('Users');
  }

  // 获取当前用户信息的处理方法
  getAction() {
    think.logger.debug('【Token】获取当前用户信息');

    return this.success(this.ctx.state.userInfo);
  }

  // 用户登录认证的处理方法
  async postAction() {
    const { email, password, code } = this.post();

    think.logger.debug('【Token】开始处理用户登录请求:', email);

    // 根据邮箱查询用户信息
    const user = await this.modelInstance.select({ email });

    // 检查用户是否存在且不是待验证状态
    if (think.isEmpty(user) || /^verify:/i.test(user[0].type)) {
      think.logger.debug('【Token】用户不存在或处于待验证状态');

      return this.fail();
    }

    // 验证用户密码
    const checkPassword = this.checkPassword(password, user[0].password);

    if (!checkPassword) {
      think.logger.debug('【Token】密码验证失败');

      return this.fail();
    }

    // 获取用户的双因素认证密钥
    const twoFactorAuthSecret = user[0]['2fa'];

    // 如果启用了双因素认证，验证认证码
    if (twoFactorAuthSecret) {
      think.logger.debug('【Token】验证双因素认证码');
      const verified = load.speakeasy().totp.verify({
        secret: twoFactorAuthSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!verified) {
        think.logger.debug('【Token】双因素认证码验证失败');

        return this.fail();
      }
      think.logger.debug('【Token】双因素认证码验证通过');
    }

    // 处理用户头像
    think.logger.debug('【Token】处理用户头像');
    let avatarUrl = user[0].avatar
      ? user[0].avatar
      : await think.service('avatar').stringify({
          mail: user[0].email,
          nick: user[0].display_name,
          link: user[0].url,
        });

    // 获取头像代理配置
    const { avatarProxy } = think.config();

    // 如果配置了头像代理，处理头像URL（支持加密）
    if (avatarProxy) {
      // 检查是否为 QQ 头像
      const isQQAvatar = /^https?:\/\/q[0-9]\.qlogo\.cn\/g\?b=qq&nk=/i.test(
        avatarUrl,
      );

      // 只对 QQ 头像进行代理和加密
      if (!isQQAvatar) {
        think.logger.debug('【Token】非QQ头像，直接使用原始URL:', avatarUrl);
        // 不对非 QQ 头像进行代理处理，直接使用原始 URL
      } else {
        const secret = process.env.AVATAR_PROXY_KEY;

        // 如果没有配置加密密钥，使用明文模式
        if (!secret) {
          avatarUrl = avatarProxy + '?url=' + encodeURIComponent(avatarUrl);
        } else {
          try {
            const crypto = require('crypto');

            // 使用SHA-256派生密钥
            const key = crypto.createHash('sha256').update(secret).digest();

            // 生成随机IV (12字节)
            const iv = crypto.randomBytes(12);

            // AES-GCM加密
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            const encrypted = Buffer.concat([
              cipher.update(avatarUrl, 'utf8'),
              cipher.final(),
            ]);

            // 获取认证标签
            const tag = cipher.getAuthTag();

            // 组合: iv + ciphertext + tag
            const combined = Buffer.concat([iv, encrypted, tag]);

            // Base64编码
            const encoded = combined.toString('base64');

            // 返回带加密参数的URL
            avatarUrl = avatarProxy + '?e=' + encodeURIComponent(encoded);
          } catch (err) {
            think.logger.error('【Token】头像URL加密失败，回退为明文:', err);
            avatarUrl = avatarProxy + '?url=' + encodeURIComponent(avatarUrl);
          }
        }
      }
    }
    user[0].avatar = avatarUrl;

    // 生成并返回用户信息和令牌
    think.logger.debug('【Token】登录成功，生成用户令牌');

    return this.success({
      ...user[0],
      password: null, // 清除密码信息
      mailMd5: load.helper().md5(user[0].email.toLowerCase()), // 生成邮箱MD5用于头像
      token: load.jwt().sign(user[0].email, this.config('jwtKey')), // 生成JWT令牌
    });
  }

  // 登出处理方法（预留）
  deleteAction() {}
};

think.logger.debug(' 已加载/controller/token.js');
