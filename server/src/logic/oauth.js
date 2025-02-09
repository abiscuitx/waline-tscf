//引入base.js
const Base = require("./base.js");

module.exports = class extends Base {
  /**
   * @api {GET} /api/oauth oauth api
   * @apiGroup  OAuth
   * @apiVersion  0.0.1
   */
  // OAuth第三方认证的处理方法
  indexAction() {
    think.logger.debug("【oauth】处理第三方认证请求");
  }
};

think.logger.debug(" 已加载/logic/oauth.js");
