// 引入base.js
const Base = require("../base.js");

module.exports = class extends Base {
  // 获取双因素认证信息的处理方法
  async getAction() {
    // 获取请求参数和用户状态
    const { email } = this.get();
    const { userInfo } = this.ctx.state;

    think.logger.debug("【2FA】检查双因素认证获取请求权限");

    // 如果用户未登录且未提供邮箱，返回未授权错误
    if (think.isEmpty(userInfo) && !email) {
      think.logger.debug("【2FA】未登录且无邮箱信息，拒绝访问");

      return this.fail(401);
    }
  }

  // 验证双因素认证码的处理方法
  async postAction() {
    // 获取当前用户信息
    const { userInfo } = this.ctx.state;

    think.logger.debug("【2FA】验证双因素认证码请求");

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.debug("【2FA】用户未登录，拒绝访问");

      return this.fail(401);
    }

    // 设置验证码的校验规则
    this.rules = {
      code: {
        required: true, // 验证码为必填项
        string: true, // 必须是字符串类型
        length: 6, // 长度必须为6位
      },
    };
  }
};

think.logger.debug(" 已加载/logic/token/2fa.js");
