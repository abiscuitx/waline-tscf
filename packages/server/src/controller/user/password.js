//懒加载
let jwt;
const load = {
  jwt: () => jwt || (jwt = require("jsonwebtoken")),
};

// 引入基础 REST 控制器
const BaseRest = require("../rest.js");

module.exports = class extends BaseRest {

  // 处理密码重置请求的方法
  async putAction() {
    const {
      SMTP_HOST,
      SMTP_SERVICE,
      SENDER_EMAIL,
      SENDER_NAME,
      SMTP_USER,
      SITE_NAME,
    } = process.env;
    const hasMailService = SMTP_HOST || SMTP_SERVICE;

    if (!hasMailService) {
      think.logger.warn("【password】密码重置失败: 未配置邮件服务");

      return this.fail();
    }

    const { email } = this.post();
    const userModel = this.getModel("Users");

    think.logger.debug("【password】查询用户邮箱:", email);
    
    const user = await userModel.select({ email });

    if (think.isEmpty(user)) {
      think.logger.warn("【password】密码重置失败: 用户不存在");

      return this.fail();
    }

    const notify = this.service("notify", this);
    const token = load.jwt().sign(user[0].email, this.config("jwtKey"));
    const profileUrl = `${this.ctx.serverURL}/ui/profile?token=${token}`;
    
    think.logger.debug("【password】发送密码重置邮件");
    try {
      await notify.transporter.sendMail({
        from: SENDER_EMAIL && SENDER_NAME
          ? `"${SENDER_NAME}" <${SENDER_EMAIL}>`
          : SMTP_USER,
        to: user[0].email,
        subject: this.locale("[{{name | safe}}] Reset Password", {
          name: SITE_NAME || "Waline",
        }),
        html: this.locale(
          'Please click <a href="{{url}}">{{url}}</a> to login and change your password as soon as possible!',
          { url: profileUrl }
        ),
      });
      think.logger.debug("【password】密码重置邮件发送成功");

      return this.success();
    } catch (err) {
      think.logger.error("【password】密码重置邮件发送失败:", err);

      return this.fail();
    }
  }
};

think.logger.debug(" 已加载/controller/user/password.js");