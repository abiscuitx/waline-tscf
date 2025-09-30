//引入base.js
const Base = require("./base.js");

module.exports = class extends Base {
  // 前置处理方法：验证管理员权限
  async __before(...args) {
    think.logger.debug("【db】执行权限检查");
    await super.__before(...args);

    const { userInfo } = this.ctx.state;

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.warn("【db】拒绝访问: 用户未登录");

      return this.fail(401);
    }

    // 检查用户是否为管理员
    if (userInfo.type !== "administrator") {
      think.logger.warn("【db】拒绝访问: 用户非管理员");

      return this.fail(403);
    }
  }

  /**
   * @api {GET} /api/db export site data
   * @apiGroup Site
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  language
   */
  async getAction() {
    think.logger.debug("【db】处理数据导出");
  }

  /**
   * @api {POST} /api/db import site data
   * @apiGroup Site
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  language
   */
  async postAction() {
    think.logger.debug("【db】处理数据导入");
    this.rules = {
      table: {
        string: true,
        required: true,
        method: "GET",
      },
    };
  }

  /**
   * @api {PUT} /api/db update site table data
   * @apiGroup Site
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  language
   */
  async putAction() {
    think.logger.debug("【db】处理数据更新");
    this.rules = {
      table: {
        string: true,
        required: true,
        method: "GET",
      },
      objectId: {
        required: true,
        method: "GET",
      },
    };
  }

  /**
   * @api {DELETE} /api/db clean site data
   * @apiGroup Site
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  language
   */
  async deleteAction() {
    think.logger.debug("【db】处理数据清空");
    this.rules = {
      table: {
        string: true,
        required: true,
        method: "GET",
      },
    };
  }
};

think.logger.debug(" 已加载/logic/db.js");
