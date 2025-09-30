//懒加载
let speakeasy;
const load = {
  speakeasy: () => speakeasy || (speakeasy = require("speakeasy")),
};

// 引入基础 REST 控制器
const BaseRest = require("../rest.js");

module.exports = class extends BaseRest {
  // 获取2FA配置信息
  async getAction() {
    const { userInfo } = this.ctx.state;
    const { email } = this.get();

    think.logger.debug("【2FA】处理2FA请求, 邮箱:", email);

    // 处理未登录用户的2FA状态查询
    if (think.isEmpty(userInfo) && email) {
      think.logger.debug("【2FA】未登录用户查询2FA状态");
      const userModel = this.getModel("Users");
      const user = await userModel.select({ email }, { field: ["2fa"] });
      const is2FAEnabled = !think.isEmpty(user) && Boolean(user[0]["2fa"]);

      return this.success({ enable: is2FAEnabled });
    }

    // 生成2FA密钥名称
    const name = `waline_${userInfo.objectId}`;

    // 如果用户已有2FA密钥，返回现有配置
    if (userInfo["2fa"] && userInfo["2fa"].length == 32) {
      think.logger.debug("【2FA】返回现有2FA配置");

      return this.success({
        otpauth_url: `otpauth://totp/${name}?secret=${userInfo["2fa"]}`,
        secret: userInfo["2fa"],
      });
    }

    // 生成2FA密钥
    think.logger.debug("【2FA】生成新的2FA密钥");
    const { otpauth_url, base32: secret } = load.speakeasy().generateSecret({
      length: 20,
      name,
    });

    return this.success({ otpauth_url, secret });
  }

  // 验证并启用2FA
  async postAction() {
    const data = this.post();

    think.logger.debug("【2FA】验证2FA验证码");

    // 验证2FA验证码
    const verified = load.speakeasy().totp.verify({
      secret: data.secret,
      encoding: "base32",
      token: data.code,
      window: 2,
    });

    if (!verified) {
      think.logger.warn("【2FA】验证码验证失败");

      return this.fail(this.locale("TWO_FACTOR_AUTH_ERROR_DETAIL"));
    }

    // 更新用户2FA设置
    const userModel = this.getModel("Users");
    const { objectId } = this.ctx.state.userInfo;

    think.logger.debug("【2FA】更新用户2FA设置, 用户ID:", objectId);
    await userModel.update({ ["2fa"]: data.secret }, { objectId });

    return this.success();
  }
};

think.logger.debug(" 已加载controller/token/2fa.js");
