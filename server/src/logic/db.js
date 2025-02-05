const Base = require("./base.js");

module.exports = class extends Base {
  // 前置处理方法：验证管理员权限
  async __before(...args) {
    think.logger.debug("【数据库】执行前置权限检查");
    await super.__before(...args);

    const { userInfo } = this.ctx.state;

    // 检查用户是否已登录
    if (think.isEmpty(userInfo)) {
      think.logger.debug("【数据库】用户未登录，拒绝访问");
      return this.fail(401);
    }

    // 检查用户是否为管理员
    if (userInfo.type !== "administrator") {
      think.logger.debug("【数据库】用户非管理员，拒绝访问");
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
    think.logger.debug("【数据库】处理数据导出请求");
  }

  /**
   * @api {POST} /api/db import site data
   * @apiGroup Site
   * @apiVersion  0.0.1
   *
   * @apiParam  {String}  lang  language
   */
  async postAction() {
    think.logger.debug("【数据库】处理数据导入请求");
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
    think.logger.debug("【数据库】处理数据更新请求");
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
    think.logger.debug("【数据库】处理数据清空请求");
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
