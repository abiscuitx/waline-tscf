// 引入基础 REST 控制器
const BaseRest = require("./rest.js");

module.exports = class extends BaseRest {
  // 构造函数：初始化用户模型实例
  constructor(...args) {
    super(...args);
    this.modelInstance = this.getModel("Users");
  }

  // 处理邮箱验证请求的方法
  async getAction() {
    // 获取验证令牌和邮箱参数
    const { token, email } = this.get();
    think.logger.debug("【验证系统】开始处理邮箱验证请求:", email);

    // 根据邮箱查询用户信息
    const users = await this.modelInstance.select({ email });

    // 如果用户不存在，返回错误
    if (think.isEmpty(users)) {
      think.logger.debug("【验证系统】用户不存在");
      return this.fail(this.locale("USER_NOT_EXIST"));
    }

    const user = users[0];
    // 解析用户类型中的验证信息（格式：verify:验证码:过期时间）
    const match = user.type.match(/^verify:(\d{4}):(\d+)$/i);

    // 如果用户不是待验证状态，返回错误
    if (!match) {
      think.logger.debug("【验证系统】用户已完成注册，无需验证");
      return this.fail(this.locale("USER_REGISTERED"));
    }

    // 验证令牌是否匹配且在有效期内
    if (token === match[1] && Date.now() < parseInt(match[2])) {
      think.logger.debug("【验证系统】验证成功，更新用户状态为访客");
      // 验证通过，将用户类型更新为访客
      await this.modelInstance.update({ type: "guest" }, { email });

      // 重定向到登录页面
      return this.redirect("/ui/login");
    }

    // 验证失败，返回令牌过期错误
    think.logger.debug("【验证系统】验证令牌已过期或无效");
    return this.fail(this.locale("TOKEN_EXPIRED"));
  }
};
think.logger.debug(" 已加载/controller/verification.js");
