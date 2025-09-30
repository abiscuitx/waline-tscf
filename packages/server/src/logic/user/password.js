// 引入base.js
const Base = require("../base.js");

module.exports = class extends Base {
  // 更新密码的处理方法
  async putAction() {
    think.logger.debug("【password】设置密码更新的验证规则");

    // 设置请求参数的验证规则
    this.rules = {
      email: {
        required: true, // 邮箱为必填项
      },
    };
  }
};

think.logger.debug(" 已加载/logic/user/password.js");
