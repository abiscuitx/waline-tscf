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
      think.logger.debug(" 【password】失败：未绑定邮箱");
      return this.fail();
    }
    const { email } = this.post();
    const userModel = this.getModel("Users");
    think.logger.debug(` 【password】查询用户邮箱: ${email}`);
    const user = await userModel.select({ email });
    if (think.isEmpty(user)) {
      think.logger.debug(" 【password】失败：未找到用户");
      return this.fail();
    }

    // 发送密码重置邮件
    const notify = this.service("notify", this);
    const token = jwt.sign(user[0].email, this.config("jwtKey"));
    const profileUrl = `${this.ctx.serverURL}/ui/profile?token=${token}`;
    think.logger.debug(" 【password】发送重置邮件...");
    await notify.transporter.sendMail({
      from:
        SENDER_EMAIL && SENDER_NAME
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
    think.logger.debug(" 【password】密码重置邮件发送完成");
    return this.success();
  }
};

think.logger.debug(" 已加载/controller/user/password.js");