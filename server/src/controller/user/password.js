console.log(new Date(),' password.js');
const jwt = require('jsonwebtoken');
// 引入基础 REST 控制器
const BaseRest = require('../rest.js');
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
    // 检查是否配置了邮件服务
    const hasMailService = SMTP_HOST || SMTP_SERVICE;

    think.logger.debug('【密码重置】开始检查邮件服务配置状态');

    if (!hasMailService) {
      think.logger.debug('【密码重置】错误：未找到邮件服务配置，无法发送重置邮件');
      return this.fail();
    }

    const { email } = this.post();
    // 获取用户模型实例
    const userModel = this.getModel('Users');
    think.logger.debug(`【密码重置】正在查询用户邮箱信息: ${email}`);
    const user = await userModel.select({ email });

    if (think.isEmpty(user)) {
      think.logger.debug('【密码重置】错误：未找到对应用户信息');
      return this.fail();
    }

    // 获取通知服务实例
    const notify = this.service('notify', this);
    // 生成重置令牌
    const token = jwt.sign(user[0].email, this.config('jwtKey'));
    const profileUrl = `${this.ctx.serverURL}/ui/profile?token=${token}`;

    think.logger.debug('【密码重置】正在发送密码重置邮件...');
    await notify.transporter.sendMail({
      // 设置发件人信息
      from:
        SENDER_EMAIL && SENDER_NAME
          ? `"${SENDER_NAME}" <${SENDER_EMAIL}>`
          : SMTP_USER,
      to: user[0].email,
      subject: this.locale('[{{name | safe}}] Reset Password', {
        name: SITE_NAME || 'Waline',
      }),
      html: this.locale(
        'Please click <a href="{{url}}">{{url}}</a> to login and change your password as soon as possible!',
        { url: profileUrl },
      ),
    });

    think.logger.debug('【密码重置】密码重置邮件发送完成');
    return this.success();
  }
};
